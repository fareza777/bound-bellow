import "./style.css";
import "./style-ledger.css";
import "./style-extra.css";
import { Game } from "./game/game";
import { UI } from "./game/ui";
import { initPlaygama, type LevelEvent, type PlaygamaRuntime } from "./game/playgama";
import { loadMetaFromStore, setMetaStore } from "./game/meta";

declare global {
  interface Window {
    __OHMYGAME_PLAYTEST__?: {
      snapshot: () => Record<string, unknown>;
      reset: () => void;
      setSeed: (seed: string | number) => void;
      step: (milliseconds: number) => void;
      jump: (floor: number, roomType: string) => void;
    };
  }
}

const canvas = document.getElementById("game") as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error("Game canvas is missing.");
}

const app = document.getElementById("app")!;
const syncOrientation = () => {
  app.classList.toggle("portrait", window.innerHeight > window.innerWidth);
};
syncOrientation();
window.addEventListener("resize", syncOrientation);
window.addEventListener("orientationchange", syncOrientation);

function setupBridge(runtime: PlaygamaRuntime, game: Game): void {
  game.onLevelEvent = (event, data) => {
    if (
      event === "level_started" ||
      event === "level_completed" ||
      event === "level_failed" ||
      event === "level_paused" ||
      event === "level_resumed"
    ) {
      runtime.sendLevel(event as LevelEvent, data);
    }
  };
  game.onAnalytics = (event, data) => runtime.sendAnalytics(event, data);
  game.onRunEnd = (win, trueEnding) => {
    runtime.sendAnalytics(win ? "progression_completed" : "progression_failed", {
      step_id: "run",
      step_index: game.run.floor + 1,
      win,
      true_ending: trueEnding,
      character: game.run.character,
      daily: game.run.daily,
      seconds: Math.round(game.run.time),
    });
    // Playgama interstitial at the natural end-of-run break. The SDK
    // enforces its own minimum interval and can be disabled by the host.
    window.setTimeout(() => {
      if (game.phase === "dead" || game.phase === "victory") {
        runtime.showInterstitial("run_end");
      }
    }, 2600);
  };
  let hostPausedGameplay = false;
  runtime.bindHostPause(
    () => {
      hostPausedGameplay = game.phase === "playing";
      game.audio.setHostMuted(true);
      if (hostPausedGameplay) game.pause();
      return true;
    },
    () => {
      game.audio.setHostMuted(!runtime.audioEnabled);
      if (hostPausedGameplay) {
        hostPausedGameplay = false;
        game.resume();
      }
    },
  );
  runtime.onAudioState((enabled) => game.audio.setHostMuted(!enabled));
  game.audio.setHostMuted(!runtime.audioEnabled);
}

async function boot(): Promise<void> {
  const runtime = await initPlaygama();
  if (runtime.available) {
    setMetaStore(runtime.storage);
  }
  let meta;
  try {
    meta = runtime.available
      ? await loadMetaFromStore(runtime.storage)
      : undefined;
  } catch {
    meta = undefined;
  }

  const game = new Game(canvas!, meta);
  const ui = new UI(game);
  game.attachUi(ui);
  game.boot();
  setupBridge(runtime, game);

  // Test-only deep link used by the runtime QA pass (never referenced by gameplay).
  const testParams = new URLSearchParams(location.search);
  const testRoom = testParams.get("testRoom");
  const testCharacter = testParams.get("testCharacter");
  if (testCharacter) {
    const id = ["wren", "moth", "cinder", "choir"].includes(testCharacter)
      ? (testCharacter as "wren" | "moth" | "cinder" | "choir")
      : "wren";
    game.unlockTestCharacter(id);
  }
  if (testRoom) {
    game.setSeed(testParams.get("testSeed") ?? "QA");
    const revealSecret = testRoom === "secretreveal";
    game.playtestJump(Number(testParams.get("floor") ?? 0), revealSecret ? "combat" : testRoom);
    if (revealSecret) game.testSecretReveal();
    if (testParams.has("testPower")) game.applyTestPower();
    if (testParams.has("testTrue")) game.testGrantItem("second-thread");
    const testItem = testParams.get("testItem");
    if (testItem) game.testGrantItem(testItem);
    const testTransform = testParams.get("testTransform");
    if (testTransform) game.testGrantSet(testTransform);
    const testCurse = testParams.get("testCurse");
    if (testCurse === "darkness" || testCurse === "swarm" || testCurse === "famine") {
      game.forceCurse(testCurse);
    }
  }
  if (testParams.has("clearRecord")) {
    game.clearRecord();
  }

  let lastFrame = performance.now();
  let raf = 0;
  let accumulator = 0;
  let announcedReady = false;
  const FIXED_STEP = 1 / 60;
  const MAX_CATCH_UP = 0.27;

  // Playgama performance telemetry: one aggregate sample per ~30s of
  // active, visible gameplay. Pauses, menus and hidden tabs are excluded.
  const perf = {
    start: 0,
    last: 0,
    times: [] as number[],
  };
  const resetPerf = () => {
    perf.start = 0;
    perf.last = 0;
    perf.times = [];
  };
  const percentile = (values: number[], p: number): number => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  };
  const flushPerformance = (now: number) => {
    if (perf.times.length < 10) {
      resetPerf();
      return;
    }
    const windowMs = Math.max(1, now - perf.start);
    const activeMs = windowMs;
    const frameTimes = perf.times;
    const frameCount = frameTimes.length;
    const fps = frameTimes.map((dt) => (dt > 0 ? 1000 / dt : 0));
    runtime.sendAnalytics("performance_sample", {
      target_fps: 60,
      window_ms: Math.round(windowMs),
      active_ms: Math.round(activeMs),
      frame_count: frameCount,
      fps_avg: Number((frameCount / (activeMs / 1000)).toFixed(2)),
      fps_p10: Number(percentile(fps, 0.1).toFixed(2)),
      frame_time_p50_ms: Number(percentile(frameTimes, 0.5).toFixed(2)),
      frame_time_p95_ms: Number(percentile(frameTimes, 0.95).toFixed(2)),
      frame_time_p99_ms: Number(percentile(frameTimes, 0.99).toFixed(2)),
      frame_time_max_ms: Number(Math.max(...frameTimes).toFixed(2)),
      frames_over_50ms: frameTimes.filter((dt) => dt > 50).length,
      frames_over_100ms: frameTimes.filter((dt) => dt > 100).length,
      frames_over_250ms: frameTimes.filter((dt) => dt > 250).length,
      frames_over_500ms: frameTimes.filter((dt) => dt > 500).length,
      frames_over_1000ms: frameTimes.filter((dt) => dt > 1000).length,
      game_version: "2.0.0",
    });
    resetPerf();
  };
  const samplePerformance = (now: number) => {
    if (game.phase !== "playing" || document.hidden) {
      resetPerf();
      return;
    }
    if (!perf.start) {
      perf.start = now;
      perf.last = now;
      perf.times = [];
      return;
    }
    const dt = now - perf.last;
    perf.last = now;
    if (dt <= 0) return;
    perf.times.push(dt);
    if (now - perf.start >= 30000) flushPerformance(now);
  };

  function frame(now: number): void {
    const elapsed = Math.min(MAX_CATCH_UP, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 18) {
      game.update(FIXED_STEP);
      accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (steps === 0 && elapsed > 0) game.update(elapsed);
    if (accumulator > FIXED_STEP * 4) accumulator = FIXED_STEP * 4;
    game.render();
    samplePerformance(now);
    if (!announcedReady) {
      announcedReady = true;
      runtime.sendGameReady();
      runtime.sendAnalytics("game_loaded", {
        platform: runtime.platformId,
        bridge: runtime.available,
        version: runtime.version,
      });
    }
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      game.audio.setHostMuted(true);
      if (game.phase === "playing") game.pause();
    } else {
      game.audio.setHostMuted(!runtime.audioEnabled);
    }
  });

  window.addEventListener("beforeunload", () => {
    cancelAnimationFrame(raf);
  });

  raf = requestAnimationFrame(frame);

  window.__OHMYGAME_PLAYTEST__ = {
    snapshot: () => game.snapshot(),
    reset: () => game.playtestReset(),
    setSeed: (seed) => game.setSeed(seed),
    step: (milliseconds) => game.stepSimulation(milliseconds),
    jump: (floor, roomType) => game.playtestJump(floor, roomType),
  };
}

void boot();

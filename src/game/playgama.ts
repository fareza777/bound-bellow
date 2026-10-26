import type { MetaStore } from "./meta";

/**
 * Minimal surface of the Playgama Bridge SDK used by BOUND BELOW.
 * The SDK is loaded from Playgama's CDN in index.html; in unsupported
 * environments it is absent and the game falls back to local storage.
 */
interface BridgeStorageApi {
  get(keys: string[]): Promise<unknown>;
  set(keys: string[], values: string[]): Promise<unknown>;
  delete(keys: string[]): Promise<unknown>;
}

interface BridgeAdvertisementApi {
  isInterstitialSupported?: boolean;
  interstitialState?: string;
  showInterstitial(placement?: string): void;
  on?(event: string, callback: (state: string) => void): void;
}

interface BridgePlatformApi {
  isAudioEnabled?: boolean;
  id?: string;
  sendMessage(message: string, data?: Record<string, unknown>): void;
  on?(event: string, callback: (value: unknown) => void): void;
}

interface BridgeAnalyticsApi {
  send(event: string, data?: Record<string, string | number | boolean>): void;
}

interface BridgeGlobal {
  initialize(): Promise<void>;
  storage?: BridgeStorageApi;
  advertisement?: BridgeAdvertisementApi;
  platform?: BridgePlatformApi;
  analytics?: BridgeAnalyticsApi;
  EVENT_NAME?: Record<string, string>;
  version?: string;
}

declare global {
  interface Window {
    bridge?: BridgeGlobal;
  }
}

export type LevelEvent =
  | "level_started"
  | "level_completed"
  | "level_failed"
  | "level_paused"
  | "level_resumed";

interface NormalizedStorageResult {
  [key: string]: string | null;
}

function normalizeStorageResult(result: unknown, keys: string[]): NormalizedStorageResult {
  const out: NormalizedStorageResult = {};
  if (Array.isArray(result)) {
    keys.forEach((key, index) => {
      const value = result[index];
      out[key] = typeof value === "string" ? value : null;
    });
  } else if (result && typeof result === "object") {
    keys.forEach((key) => {
      const value = (result as Record<string, unknown>)[key];
      out[key] = typeof value === "string" ? value : null;
    });
  } else {
    keys.forEach((key) => {
      out[key] = null;
    });
  }
  return out;
}

export class PlaygamaRuntime {
  readonly bridge: BridgeGlobal | null;
  readonly available: boolean;
  readonly platformId: string;
  readonly version: string;
  private pausedByHost = false;

  constructor(bridge: BridgeGlobal | null, available: boolean) {
    this.bridge = bridge;
    this.available = available;
    this.platformId = bridge?.platform?.id ?? "web";
    this.version = bridge?.version ?? "unknown";
  }

  get storage(): MetaStore {
    return {
      get: async (keys) => {
        if (!this.bridge?.storage) {
          return Object.fromEntries(keys.map((key) => [key, null]));
        }
        try {
          const result = await this.bridge.storage.get(keys);
          return normalizeStorageResult(result, keys);
        } catch {
          return Object.fromEntries(keys.map((key) => [key, null]));
        }
      },
      set: async (keys, values) => {
        if (!this.bridge?.storage) return;
        await this.bridge.storage.set(keys, values);
      },
      delete: async (keys) => {
        if (!this.bridge?.storage) return;
        await this.bridge.storage.delete(keys);
      },
    };
  }

  get audioEnabled(): boolean {
    return this.bridge?.platform?.isAudioEnabled !== false;
  }

  sendMessage(message: string, data?: Record<string, unknown>): void {
    try {
      this.bridge?.platform?.sendMessage(message, data);
    } catch {
      /* Bridge is optional outside Playgama */
    }
  }

  sendGameReady(): void {
    this.sendMessage("game_ready");
  }

  sendLevel(event: LevelEvent, data: Record<string, unknown>): void {
    this.sendMessage(event, data);
  }

  sendAnalytics(
    event: string,
    data?: Record<string, string | number | boolean>,
  ): void {
    try {
      this.bridge?.analytics?.send(event, data);
    } catch {
      /* Analytics is optional */
    }
  }

  showInterstitial(placement = "run_end"): void {
    const ads = this.bridge?.advertisement;
    if (!ads || ads.isInterstitialSupported === false) return;
    try {
      ads.showInterstitial(placement);
    } catch {
      /* Ad failures must never block play */
    }
  }

  onPause(callback: (paused: boolean) => void): void {
    const platform = this.bridge?.platform;
    if (!platform?.on) return;
    const event = this.bridge?.EVENT_NAME?.PAUSE_STATE_CHANGED ?? "pause_state_changed";
    platform.on(event, (value) => callback(Boolean(value)));
  }

  onAudioState(callback: (enabled: boolean) => void): void {
    const platform = this.bridge?.platform;
    if (!platform?.on) return;
    const event = this.bridge?.EVENT_NAME?.AUDIO_STATE_CHANGED ?? "audio_state_changed";
    platform.on(event, (value) => callback(Boolean(value)));
  }

  /** Handle pause/resume requests from the host or a full-screen ad. */
  bindHostPause(pause: () => boolean, resume: () => void): void {
    this.onPause((paused) => {
      if (paused) {
        if (!this.pausedByHost && pause()) this.pausedByHost = true;
      } else if (this.pausedByHost) {
        this.pausedByHost = false;
        resume();
      }
    });
  }
}

export async function initPlaygama(): Promise<PlaygamaRuntime> {
  const bridge = window.bridge ?? null;
  if (!bridge || typeof bridge.initialize !== "function") {
    return new PlaygamaRuntime(null, false);
  }
  try {
    await Promise.race([
      bridge.initialize(),
      new Promise<void>((_, reject) => {
        window.setTimeout(() => reject(new Error("Bridge initialization timeout")), 5000);
      }),
    ]);
    return new PlaygamaRuntime(bridge, true);
  } catch (error) {
    console.warn("Playgama Bridge initialization failed; continuing locally.", error);
    return new PlaygamaRuntime(bridge, false);
  }
}

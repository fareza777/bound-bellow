import script from "./vo-script.json";

export interface NarrationLine {
  key: string;
  speaker: string;
  text: string;
  file: string;
  est: number;
}

interface NarrationScript {
  voice: string;
  lines: NarrationLine[];
}

const NARRATION = script as NarrationScript;

export const NARRATION_LINES = NARRATION.lines;
export const NARRATION_BY_KEY = new Map(NARRATION.lines.map((line) => [line.key, line]));

export const INTRO_KEYS = ["intro-1", "intro-2", "intro-3", "intro-4", "intro-5"];

export function narration(key: string): NarrationLine | null {
  return NARRATION_BY_KEY.get(key) ?? null;
}

export function introNarration(): NarrationLine[] {
  return INTRO_KEYS.map((key) => NARRATION_BY_KEY.get(key)).filter(Boolean) as NarrationLine[];
}

function fileUrl(file: string): string {
  return `${import.meta.env.BASE_URL}audio/vo/${file}`;
}

export class Voice {
  enabled: boolean;
  private audio: HTMLAudioElement | null = null;
  private token = 0;
  private currentKey: string | null = null;
  private volume = 0.92;
  onStart?: (line: NarrationLine) => void;
  onEnd?: (line: NarrationLine) => void;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) this.audio.volume = this.volume;
  }

  get playing(): boolean {
    return Boolean(this.audio && !this.audio.paused);
  }

  get key(): string | null {
    return this.currentKey;
  }

  play(
    key: string,
    options: { onEnd?: () => void; interrupt?: boolean; onStart?: () => void } = {},
  ): NarrationLine | null {
    const line = narration(key);
    if (!line) return null;
    if (!this.enabled) {
      options.onEnd?.();
      return null;
    }
    if (this.audio && !this.audio.paused && !options.interrupt) return null;
    this.stop();
    this.currentKey = key;
    const token = ++this.token;
    const audio = new Audio(fileUrl(line.file));
    audio.preload = "auto";
    audio.volume = this.volume;
    this.audio = audio;
    const finish = () => {
      if (token !== this.token) return;
      this.currentKey = null;
      this.audio = null;
      this.onEnd?.(line);
      options.onEnd?.();
    };
    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener(
      "error",
      () => {
        if (token !== this.token) return;
        this.currentKey = null;
        this.audio = null;
        options.onEnd?.();
      },
      { once: true },
    );
    void audio
      .play()
      .then(() => {
        if (token !== this.token) return;
        this.onStart?.(line);
        options.onStart?.();
      })
      .catch(() => {
        /* autoplay can be denied; the UI keeps the caption and its own timer */
      });
    return line;
  }

  pause(): void {
    if (this.audio && !this.audio.paused) this.audio.pause();
  }

  resume(): void {
    if (this.audio && this.audio.paused && this.enabled) {
      void this.audio.play().catch(() => {
        /* resume can be denied; the game continues without narration */
      });
    }
  }

  stop(): void {
    this.token += 1;
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
      this.audio = null;
    }
    this.currentKey = null;
  }
}

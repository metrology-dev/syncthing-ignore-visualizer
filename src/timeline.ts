/**
 * Playback controller for stepping through rule evaluation.
 *
 * Positions run 0…ruleCount: position 0 is the initial "everything included"
 * state; position p means rules 0…p-1 have been applied.
 */

import { clamp, Emitter } from './utils';

export interface TimelineState {
  position: number;
  ruleCount: number;
  playing: boolean;
}

const DEFAULT_STEP_MS = 1100;

export class Timeline {
  private position = 0;
  private ruleCount = 0;
  private playing = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly changed = new Emitter<TimelineState>();
  private stepMs = DEFAULT_STEP_MS;

  onChange(listener: (state: TimelineState) => void): () => void {
    return this.changed.on(listener);
  }

  get state(): TimelineState {
    return { position: this.position, ruleCount: this.ruleCount, playing: this.playing };
  }

  /** Update the number of rules, clamping the current position. */
  setRuleCount(count: number): void {
    this.ruleCount = Math.max(0, count);
    this.position = clamp(this.position, 0, this.ruleCount);
    this.notify();
  }

  seek(position: number): void {
    this.pauseInternal();
    this.setPosition(position);
  }

  next(): void {
    this.pauseInternal();
    this.setPosition(this.position + 1);
  }

  previous(): void {
    this.pauseInternal();
    this.setPosition(this.position - 1);
  }

  reset(): void {
    this.pauseInternal();
    this.setPosition(0);
  }

  jumpToFinal(): void {
    this.pauseInternal();
    this.setPosition(this.ruleCount);
  }

  play(): void {
    if (this.playing || this.ruleCount === 0) return;
    if (this.position >= this.ruleCount) this.position = 0;
    this.playing = true;
    this.notify();
    this.scheduleTick();
  }

  pause(): void {
    this.pauseInternal();
    this.notify();
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  setSpeed(stepMs: number): void {
    this.stepMs = clamp(stepMs, 100, 10_000);
  }

  private scheduleTick(): void {
    this.timer = setTimeout(() => {
      if (!this.playing) return;
      this.position = clamp(this.position + 1, 0, this.ruleCount);
      if (this.position >= this.ruleCount) {
        this.playing = false;
      } else {
        this.scheduleTick();
      }
      this.notify();
    }, this.stepMs);
  }

  private pauseInternal(): void {
    this.playing = false;
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private setPosition(position: number): void {
    const next = clamp(position, 0, this.ruleCount);
    this.position = next;
    this.notify();
  }

  private notify(): void {
    this.changed.emit(this.state);
  }
}

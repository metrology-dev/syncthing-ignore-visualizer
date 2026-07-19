import { describe, expect, it, vi } from 'vitest';
import { Timeline } from '../src/timeline';

describe('Timeline', () => {
  it('steps forward and backward within bounds', () => {
    const t = new Timeline();
    t.setRuleCount(3);
    expect(t.state.position).toBe(0);
    t.next();
    t.next();
    expect(t.state.position).toBe(2);
    t.next();
    t.next(); // clamped at ruleCount
    expect(t.state.position).toBe(3);
    t.previous();
    expect(t.state.position).toBe(2);
    t.reset();
    expect(t.state.position).toBe(0);
    t.jumpToFinal();
    expect(t.state.position).toBe(3);
  });

  it('clamps position when the rule count shrinks', () => {
    const t = new Timeline();
    t.setRuleCount(5);
    t.seek(5);
    t.setRuleCount(2);
    expect(t.state.position).toBe(2);
  });

  it('notifies listeners on every change', () => {
    const t = new Timeline();
    const seen: number[] = [];
    t.onChange((s) => seen.push(s.position));
    t.setRuleCount(2);
    t.next();
    t.next();
    expect(seen).toEqual([0, 1, 2]);
  });

  it('plays through steps and stops at the end', () => {
    vi.useFakeTimers();
    try {
      const t = new Timeline();
      t.setRuleCount(2);
      t.setSpeed(100);
      t.play();
      expect(t.state.playing).toBe(true);
      vi.advanceTimersByTime(100);
      expect(t.state.position).toBe(1);
      vi.advanceTimersByTime(100);
      expect(t.state.position).toBe(2);
      expect(t.state.playing).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('restarts from the beginning when playing at the end', () => {
    vi.useFakeTimers();
    try {
      const t = new Timeline();
      t.setRuleCount(2);
      t.jumpToFinal();
      t.play();
      expect(t.state.position).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('pause stops the timer', () => {
    vi.useFakeTimers();
    try {
      const t = new Timeline();
      t.setRuleCount(3);
      t.setSpeed(100);
      t.play();
      vi.advanceTimersByTime(100);
      t.pause();
      vi.advanceTimersByTime(1000);
      expect(t.state.position).toBe(1);
      expect(t.state.playing).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

import { describe, expect, it } from 'vitest';
import { getSession, sessionDuration } from '../session/scenarios';
import { answer, buildContext, classify, SUGGESTED } from './assistant';
import { deriveState } from './deriveState';

const session = getSession('push-day');
const ctx = buildContext(deriveState(session, sessionDuration(session)));

describe('assistant intent', () => {
  it('routes ordinary questions to the right topic', () => {
    expect(classify('How is my month going?')).toBe('progress');
    expect(classify('What am I neglecting?')).toBe('balance');
    expect(classify('How many calories have I burned?')).toBe('energy');
    expect(classify('How hard was that last set?')).toBe('effort');
    expect(classify('Am I recovering enough?')).toBe('recovery');
    expect(classify('What do you know about me?')).toBe('health-note');
  });

  it('sends anything clinical to the boundary, even when phrased as training', () => {
    // The dangerous case is a question that looks like a training question and
    // is actually a medical one. Clinical keywords have to win the match.
    for (const q of [
      'my lower back hurts, should I still deadlift?',
      'is this shoulder pain normal?',
      'I think I tore something',
      'should I see a doctor about my knee?',
      'can I train through this injury?',
      'my chest pain got worse during the set',
    ]) {
      expect(classify(q), q).toBe('clinical');
    }
  });

  it('admits when it does not understand', () => {
    expect(classify('what is the weather in Osaka')).toBe('unknown');
  });
});

describe('assistant answers', () => {
  it('never gives clinical advice, and says why', () => {
    const a = answer('my back hurts, should I deadlift tomorrow?', ctx);
    expect(a.intent).toBe('clinical');
    expect(a.deferral).toBe('clinical');
    expect(a.text).toMatch(/clinician/i);
    // It must not answer the question it was asked.
    expect(a.text).not.toMatch(/\byes\b|\bno\b|you should|i recommend|try /i);
  });

  it('quotes only numbers it can account for', () => {
    for (const q of SUGGESTED) {
      const a = answer(q, ctx);
      expect(a.text.length, q).toBeGreaterThan(20);
      expect(a.text, q).not.toContain('NaN');
      expect(a.text, q).not.toContain('undefined');
      expect(a.evidence.length, q).toBeGreaterThan(0);
      for (const e of a.evidence) {
        expect(e.value, `${q} / ${e.label}`).not.toContain('NaN');
        expect(e.value, `${q} / ${e.label}`).not.toContain('undefined');
      }
    }
  });

  it('surfaces an untrained pattern when asked what is missing', () => {
    const a = answer('what am I neglecting?', ctx);
    expect(a.text).toMatch(/carry/);
  });

  it('names its health notes without judging them', () => {
    const a = answer('what do you know about my history?', ctx);
    expect(a.text).toMatch(/lower-back strain/);
    expect(a.deferral).toBe('clinical-adjacent');
    expect(a.text).toMatch(/not judging whether it is safe/i);
  });

  it('reports energy with its error band attached', () => {
    const a = answer('how many calories?', ctx);
    expect(a.text).toMatch(/±\s?20%/);
    expect(a.evidence.some((e) => /Keytel/.test(e.value))).toBe(true);
  });

  it('flags reps-in-reserve as modelled, not measured', () => {
    const a = answer('how hard was that set?', ctx);
    expect(a.evidence.some((e) => /modelled/.test(e.value))).toBe(true);
  });

  it('says what it cannot answer rather than inventing', () => {
    const a = answer('what should I eat tonight?', ctx);
    expect(a.intent).toBe('unknown');
    expect(a.text).toMatch(/only answer from what your sessions actually measured/i);
  });

  it('is pure — same question, same answer', () => {
    expect(JSON.stringify(answer('how is my month going?', ctx))).toEqual(
      JSON.stringify(answer('how is my month going?', ctx)),
    );
  });

  it('handles a session with no completed sets', () => {
    const empty = buildContext(deriveState(session, 0));
    const a = answer('how hard was that last set?', empty);
    expect(a.text).toMatch(/No completed sets yet/);
    expect(a.text).not.toContain('NaN');
  });
});

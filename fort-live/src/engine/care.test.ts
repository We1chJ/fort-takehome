import { describe, expect, it } from 'vitest';
import { CARE_CIRCLE } from '../data/careCircle';
import {
  changePct,
  concernScore,
  nextStep,
  readCircle,
  readMember,
  scoreBand,
  steadiness,
} from './care';

const readings = readCircle();
const byId = (id: string) => readings.find((r) => r.member.id === id)!;

describe('care circle', () => {
  it('shows a paused member rather than hiding them', () => {
    // Pausing should be an ordinary, visible act — not a disappearance the
    // person has to explain to their family.
    const priya = byId('priya');
    expect(priya.status).toBe('paused');
    expect(priya.summary).toMatch(/paused/);
    expect(readings).toHaveLength(CARE_CIRCLE.length);
  });

  it('never reads signals from someone who paused sharing', () => {
    const priya = byId('priya');
    expect(priya.moved).toHaveLength(0);
    expect(priya.member.signals).toHaveLength(0);
  });

  it('reports a steady member as steady', () => {
    const arthur = byId('arthur');
    expect(arthur.status).toBe('steady');
    expect(arthur.moved).toHaveLength(0);
    expect(nextStep(arthur)).toBeNull();
  });

  it('surfaces a real, sustained change', () => {
    const margaret = byId('margaret');
    expect(margaret.status).toBe('changed');
    expect(margaret.moved.map((s) => s.key)).toContain('sit-to-stand');
    expect(margaret.summary).toMatch(/own last month/);
  });

  it('reads direction correctly for both kinds of signal', () => {
    // A falling sit-to-stand pace and a rising resting heart rate are both
    // "moved the way that would matter" — the sign has to be normalised or one
    // of them reads backwards.
    const margaret = byId('margaret');
    const sts = margaret.member.signals.find((s) => s.key === 'sit-to-stand')!;
    expect(changePct(sts)).toBeLessThan(0);
    expect(concernScore(sts)).toBeGreaterThan(0);

    const rhr = margaret.member.signals.find((s) => s.key === 'resting-hr')!;
    expect(rhr.concernWhen).toBe('rises');
    expect(Math.abs(concernScore(rhr))).toBeLessThan(1.5);
  });

  it('recommends a conversation and explicitly disclaims diagnosis', () => {
    const step = nextStep(byId('margaret'))!;
    expect(step).toMatch(/worth a call/i);
    expect(step).toMatch(/not a diagnosis/i);
    // It must not tell anyone what is wrong or instruct urgent action.
    expect(step).not.toMatch(/\b(emergency|urgent|immediately|call 911|likely|probably|suggests)\b/i);
  });

  it('never names a cause anywhere it speaks', () => {
    // The engine can say a measurement moved; it cannot say why. Guard against
    // causal language creeping into any generated sentence — but strip the
    // disclaimers first, since "not a diagnosis" and "cannot tell you the
    // cause" are the assertion being made, not a violation of it.
    const disclaimers =
      /not a diagnosis|nothing here can tell you the cause|cannot tell you (?:why|the cause)/gi;
    const causal =
      /\b(because|caused by|due to|indicates|means that|diagnos\w*|symptom|condition|disease)\b/i;

    for (const r of readings) {
      const claims = `${r.summary} ${nextStep(r) ?? ''}`.replace(disclaimers, '');
      expect(claims, r.member.id).not.toMatch(causal);
    }
  });

  it('does not guess pronouns from a stated relation', () => {
    // The profile records "mother" / "father", not pronouns. Generated copy
    // uses names so it never misgenders anyone.
    for (const r of readings) {
      const text = `${r.summary} ${nextStep(r) ?? ''}`;
      expect(text, r.member.id).not.toMatch(/\b(she|her|hers|he|him|his)\b/i);
    }
  });

  it('scores a steady person near the top and a changed one below them', () => {
    const arthur = byId('arthur').steadiness!;
    const margaret = byId('margaret').steadiness!;
    expect(arthur).toBeGreaterThan(90);
    expect(margaret).toBeLessThan(arthur);
  });

  it('cannot drive the number near zero, however far a signal moves', () => {
    // A set of trends is never evidence that someone is at nought out of a
    // hundred. The curve has to saturate, and a catastrophic-looking input is
    // the only way to prove it does.
    const wrecked = {
      ...CARE_CIRCLE[0],
      signals: CARE_CIRCLE[0].signals.map((s) => ({ ...s, current: s.baseline - 40 * s.sd })),
    };
    const score = steadiness(wrecked)!;
    expect(score).toBeGreaterThan(40);
    expect(score).toBeLessThan(byId('margaret').steadiness!);
  });

  it('gives no score to someone who paused sharing', () => {
    expect(byId('priya').steadiness).toBeNull();
  });

  it('does not pay someone back for a signal moving the good way', () => {
    // Walking more than usual must not offset chair rises getting slower.
    const mixed = {
      ...CARE_CIRCLE[0],
      signals: CARE_CIRCLE[0].signals.map((s) =>
        s.key === 'active-minutes' ? { ...s, current: s.baseline + 10 * s.sd } : s,
      ),
    };
    const stsOnly = {
      ...CARE_CIRCLE[0],
      signals: CARE_CIRCLE[0].signals.filter((s) => s.key !== 'active-minutes'),
    };
    expect(steadiness(mixed)).toBe(steadiness(stsOnly));
  });

  it('bands the ring the way the cards read', () => {
    expect(scoreBand(byId('margaret'))).toBe('moved');
    expect(scoreBand(byId('arthur'))).toBe('steady');
    expect(scoreBand(byId('priya'))).toBeNull();
  });

  it('never paints a green ring on a card that says worth a call', () => {
    // Cutting the score at fixed thresholds would do exactly that: one signal
    // can cross 1.5σ while the score is still 89. The top band has to be
    // defined by the flag, not by the number.
    const barely = {
      ...CARE_CIRCLE[1],
      signals: CARE_CIRCLE[1].signals.map((s, i) =>
        i === 0 ? { ...s, current: s.baseline - 1.6 * s.sd } : s,
      ),
    };
    const reading = readMember(barely);
    expect(reading.status).toBe('changed');
    expect(reading.steadiness!).toBeGreaterThan(85);
    expect(scoreBand(reading)).not.toBe('steady');
  });

  it('compares each person only to themselves', () => {
    // No cross-member comparison should be possible: readings are computed
    // per member from that member's own baseline.
    const solo = readMember(CARE_CIRCLE[0]);
    expect(JSON.stringify(solo)).toEqual(JSON.stringify(byId(CARE_CIRCLE[0].id)));
  });

  it('produces no NaN', () => {
    expect(JSON.stringify(readings)).not.toContain('NaN');
    for (const r of readings) {
      for (const s of r.member.signals) {
        expect(Number.isFinite(concernScore(s))).toBe(true);
        expect(Number.isFinite(changePct(s))).toBe(true);
      }
    }
  });
});

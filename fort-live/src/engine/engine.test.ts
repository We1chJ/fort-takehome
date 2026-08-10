import { describe, expect, it } from 'vitest';
import { getSession, SESSIONS, sessionDuration } from '../session/scenarios';
import { generateSession } from '../session/generator';
import { buildBaseline, fillFor, MAX_ABS_Z, ROM_MIN_SD, zScore } from './baseline';
import { deriveState } from './deriveState';
import { computeEnergy, kcalPerMinute } from './energy';
import { accumulate, recruitmentShares } from './recruitment';
import { computeSets, estimateRir } from './setMetrics';
import { selectNewsworthy, SURPRISE_THRESHOLD } from './newsworthiness';
import type { MuscleSlug } from '../data/bodyPolygons';

const baseline = buildBaseline();

describe('setMetrics', () => {
  const events = generateSession(
    [{ exerciseId: 'bench-press', reps: 8, rirAtEnd: 0, restS: 120 }],
    { seed: 3 },
  );
  const [set] = computeSets(events);

  it('captures every rep and closes the set', () => {
    expect(set.reps).toHaveLength(8);
    expect(set.complete).toBe(true);
    expect(set.tensionSeconds).toBeGreaterThan(0);
  });

  it('measures velocity loss from the fastest rep, not the first', () => {
    const best = Math.max(...set.reps.map((r) => r.velocity));
    const last = set.reps[set.reps.length - 1].velocity;
    expect(set.velocityLoss).toBeCloseTo((best - last) / best, 10);
    expect(set.bestVelocity).toBe(best);
  });

  it('reports a set taken to failure as heavily decayed', () => {
    expect(set.velocityLoss).toBeGreaterThan(0.3);
    expect(set.estimatedRir).toBeLessThan(1.5);
  });

  it('reports a set left well short as barely decayed', () => {
    const easy = computeSets(
      generateSession(
        [{ exerciseId: 'bench-press', reps: 8, rirAtEnd: 6, restS: 90 }],
        { seed: 3 },
      ),
    )[0];
    expect(easy.velocityLoss).toBeLessThan(0.15);
    expect(easy.estimatedRir).toBeGreaterThan(3);
  });

  it('estimateRir is monotonically non-increasing in velocity loss', () => {
    let prev = Infinity;
    for (let vl = 0; vl <= 0.6; vl += 0.01) {
      const rir = estimateRir(vl);
      expect(rir).toBeLessThanOrEqual(prev + 1e-9);
      prev = rir;
    }
  });

  it('detects range of motion collapsing late in a set', () => {
    const [cut] = computeSets(
      generateSession(
        [
          {
            exerciseId: 'bench-press',
            reps: 6,
            rirAtEnd: 0,
            restS: 120,
            shortRomFromRep: 4,
          },
        ],
        { seed: 5 },
      ),
    );
    expect(cut.romDrop).toBeGreaterThan(0.1);
  });

  it('leaves a set in progress marked incomplete', () => {
    const partial = computeSets(events.filter((e) => e.type !== 'set_end'));
    expect(partial[0].complete).toBe(false);
  });
});

describe('recruitment', () => {
  it('normalises each exercise’s shares to exactly 1', () => {
    for (const id of ['bench-press', 'deadlift', 'barbell-curl', 'pull-ups']) {
      const total = Object.values(recruitmentShares(id)).reduce((a, b) => a + (b ?? 0), 0);
      expect(total).toBeCloseTo(1, 10);
    }
  });

  it('gives the prime mover more than any assistor', () => {
    const shares = recruitmentShares('bench-press');
    const chest = shares.chest ?? 0;
    const others = (Object.entries(shares) as Array<[MuscleSlug, number]>)
      .filter(([s]) => s !== 'chest')
      .map(([, v]) => v);
    expect(chest).toBeGreaterThan(Math.max(...others));
  });

  it('conserves time: attributed seconds sum to the seconds measured', () => {
    const sets = computeSets(getSession('push-day').events);
    const totals = accumulate(sets);
    const attributed = Object.values(totals.byMuscle).reduce((a, b) => a + (b ?? 0), 0);
    const measured = sets.reduce((a, s) => a + s.tensionSeconds, 0);
    expect(attributed).toBeCloseTo(measured, 6);
    expect(totals.totalTensionS).toBeCloseTo(measured, 6);
  });

  it('credits a full-range rep more than a short one', () => {
    const full = computeSets(
      generateSession([{ exerciseId: 'bench-press', reps: 6, rirAtEnd: 2, restS: 90 }], { seed: 4 }),
    )[0];
    const cut = computeSets(
      generateSession(
        [{ exerciseId: 'bench-press', reps: 6, rirAtEnd: 2, restS: 90, shortRomFromRep: 0 }],
        { seed: 4 },
      ),
    )[0];
    expect(cut.tensionSeconds).toBeLessThan(full.tensionSeconds);
  });
});

describe('energy', () => {
  it('rises with heart rate', () => {
    const s = { bodyMassKg: 78, ageYears: 29, sex: 'male' as const };
    expect(kcalPerMinute(150, s)).toBeGreaterThan(kcalPerMinute(90, s));
  });

  it('attributed kcal sum back to the session total', () => {
    const session = getSession('push-day');
    const sets = computeSets(session.events);
    const totals = accumulate(sets);
    const energy = computeEnergy(session.events, totals.byMuscle);
    const summed = Object.values(energy.byMuscle).reduce((a, b) => a + (b ?? 0), 0);
    expect(summed).toBeCloseTo(energy.kcalTotal, 6);
    expect(energy.kcalTotal).toBeGreaterThan(50);
  });

  it('attributes nothing when no work has been done', () => {
    const energy = computeEnergy([{ type: 'hr', t: 1, bpm: 120 }], {});
    expect(Object.keys(energy.byMuscle)).toHaveLength(0);
    expect(energy.kcalTotal).toBeGreaterThan(0);
  });
});

describe('baseline', () => {
  it('builds distributions from prior sessions only', () => {
    expect(baseline.velocityLossByExercise['bench-press'].n).toBeGreaterThanOrEqual(3);
    expect(baseline.typicalSessionTensionS.chest).toBeGreaterThan(0);
  });

  it('fill saturates and never exceeds 1', () => {
    const ref = baseline.referenceTensionS;
    expect(ref).toBeGreaterThan(0);
    expect(fillFor(0, baseline)).toBe(0);
    expect(fillFor(ref * 10, baseline)).toBeLessThanOrEqual(1);
    expect(fillFor(ref, baseline)).toBeGreaterThan(fillFor(ref / 4, baseline));
  });

  it('does not report absurd z-scores against a near-degenerate spread', () => {
    // A lifter who always completes full reps has almost no ROM variance, and
    // an unguarded z-score turned an ordinary 6% shortfall into 15.5 sd.
    const tight = { mean: 0.985, sd: 0.001, n: 20 };
    expect(Math.abs(zScore(0.92, tight, ROM_MIN_SD))).toBeLessThanOrEqual(MAX_ABS_Z);
    expect(Math.abs(zScore(0.92, tight, ROM_MIN_SD))).toBeLessThan(
      Math.abs(zScore(0.92, tight)),
    );
  });

  it('says nothing when there is too little history', () => {
    expect(zScore(0.5, { mean: 0.2, sd: 0.05, n: 2 })).toBe(0);
    expect(zScore(0.5, undefined)).toBe(0);
  });

  it('fill preserves the ordering of actual work — the picture cannot lie', () => {
    // The failure this guards against: normalising each region against its own
    // history made a region with a tenth of the work render nearly as bright.
    expect(fillFor(1000, baseline)).toBeGreaterThan(fillFor(100, baseline));
    expect(fillFor(100, baseline)).toBeGreaterThan(fillFor(10, baseline));
  });
});

describe('deriveState', () => {
  const session = getSession('push-day');
  const duration = sessionDuration(session);

  it('is pure — identical input gives identical output', () => {
    const a = deriveState(session, 400);
    const b = deriveState(session, 400);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it('does not mutate the session it is given', () => {
    const before = JSON.stringify(session.events);
    deriveState(session, duration);
    expect(JSON.stringify(session.events)).toEqual(before);
  });

  it('produces no NaN or Infinity anywhere in any scenario timeline', () => {
    for (const sess of SESSIONS) {
      const end = sessionDuration(sess);
      for (let t = 0; t <= end; t += 3) {
        const s = deriveState(sess, t);
        const json = JSON.stringify(s);
        expect(json, `${sess.id} @ ${t}s`).not.toContain('NaN');
        expect(json, `${sess.id} @ ${t}s`).not.toContain('Infinity');
        for (const v of Object.values(s.fill)) {
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
        expect(Number.isFinite(s.energy.kcalTotal)).toBe(true);
        expect(Number.isFinite(s.lastSetZ)).toBe(true);
        // Every rendered string must be complete — a missing lookup surfaces as
        // "undefined" in the UI long before it surfaces as an exception.
        expect(s.lastSetPhrase).not.toContain('undefined');
        for (const f of s.facts) {
          expect(f.claim).not.toContain('undefined');
          for (const e of f.evidence) expect(e.value).not.toContain('undefined');
        }
      }
    }
  });

  it('fill never decreases as the session runs', () => {
    let prev: Partial<Record<MuscleSlug, number>> = {};
    for (let t = 0; t <= duration; t += 10) {
      const { fill } = deriveState(session, t);
      for (const [slug, v] of Object.entries(prev) as Array<[MuscleSlug, number]>) {
        expect(fill[slug] ?? 0).toBeGreaterThanOrEqual(v - 1e-9);
      }
      prev = fill;
    }
  });

  it('starts idle and ends resting with every set complete', () => {
    expect(deriveState(session, 0).phase).toBe('idle');
    const end = deriveState(session, duration);
    expect(end.phase).toBe('resting');
    expect(end.sets.every((s) => s.complete)).toBe(true);
    expect(end.lastCompletedSet).not.toBeNull();
  });

  it('faces the figure backwards for a pulling session', () => {
    const pull = deriveState(
      { ...session, events: generateSession([{ exerciseId: 'barbell-row', reps: 8, rirAtEnd: 2, restS: 90 }], { seed: 9 }) },
      9999,
    );
    expect(pull.suggestedView).toBe('posterior');
  });
});

describe('newsworthiness', () => {
  it('stays silent on an unremarkable session', () => {
    const s = deriveState(getSession('ordinary'), sessionDuration(getSession('ordinary')));
    expect(s.surfaced).toHaveLength(0);
  });

  it('never lets the strip claim a departure the sheet stays silent about', () => {
    // Two surfaces, one judgement. If the strip says "harder than your usual"
    // the sheet must have something to say, and vice versa.
    const session = getSession('ordinary');
    for (let t = 0; t <= sessionDuration(session); t += 5) {
      const s = deriveState(session, t);
      if (s.lastSetPhrase.includes('than your usual')) {
        expect(Math.abs(s.lastSetZ)).toBeGreaterThanOrEqual(SURPRISE_THRESHOLD);
      }
    }
  });

  it('speaks when a set departs from the lifter’s own baseline', () => {
    const s = deriveState(getSession('push-day'), sessionDuration(getSession('push-day')));
    expect(s.surfaced.length).toBeGreaterThan(0);
  });

  it('notices a session confined to one movement pattern', () => {
    const s = deriveState(getSession('lopsided'), sessionDuration(getSession('lopsided')));
    expect(s.patternsTouched).toEqual(['push']);
    expect(s.surfaced.some((f) => f.kind === 'coverage')).toBe(true);
  });

  it('surfaces at most two facts, strongest first', () => {
    for (const session of SESSIONS) {
      const s = deriveState(session, sessionDuration(session));
      expect(s.surfaced.length).toBeLessThanOrEqual(2);
      for (let i = 1; i < s.surfaced.length; i++) {
        expect(Math.abs(s.surfaced[i - 1].surprise)).toBeGreaterThanOrEqual(
          Math.abs(s.surfaced[i].surprise),
        );
      }
    }
  });

  it('every surfaced fact carries evidence and a window', () => {
    for (const session of SESSIONS) {
      const s = deriveState(session, sessionDuration(session));
      for (const f of [...s.facts, ...selectNewsworthy(s.facts, 0)]) {
        expect(f.evidence.length).toBeGreaterThan(0);
        expect(f.window).not.toEqual('');
      }
    }
  });
});

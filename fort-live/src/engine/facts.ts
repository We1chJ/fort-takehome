import { REGION_NAMES } from '../data/muscleMap';
import { getExercise, PATTERNS, type Pattern } from '../data/patterns';
import type { MuscleSlug } from '../data/bodyPolygons';
import {
  DEPARTURE_THRESHOLD,
  ROM_MIN_SD,
  VELOCITY_LOSS_MIN_SD,
  zScore,
  type Baseline,
} from './baseline';
import type { RecruitmentTotals } from './recruitment';
import type { SetMetrics } from './setMetrics';

/**
 * Candidate facts, each carrying its own provenance.
 *
 * The rule this file exists to enforce: nothing reaches the user that was not
 * computed. Every claim below names the numbers it came from and the window it
 * was measured over, so any sentence the panel shows can be walked back to
 * arithmetic. That traceability is the whole defence against the failure mode
 * Strava shipped in 2024 — a model that produced confident prose about
 * elevation the data contradicted (narrative-layer.md §1 ②).
 */

export interface Fact {
  id: string;
  /** Plain-language claim. No numbers the ledger cannot account for. */
  claim: string;
  /** The computed values this claim rests on. */
  evidence: Array<{ label: string; value: string }>;
  /** What span of the session it was measured over. */
  window: string;
  /**
   * How far this departs from the lifter's own baseline, in SDs. Facts with
   * |surprise| below the filter's threshold are true but not worth saying.
   */
  surprise: number;
  kind: 'effort' | 'form' | 'coverage' | 'energy';
}

const fmt = (n: number, digits = 1) => n.toFixed(digits);
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Seconds as m:ss, or plain seconds under a minute. */
export function mmss(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

export function buildFacts(
  sets: SetMetrics[],
  totals: RecruitmentTotals,
  baseline: Baseline,
): Fact[] {
  const facts: Fact[] = [];
  const completed = sets.filter((s) => s.complete && s.reps.length >= 2);
  const lastSet = completed[completed.length - 1];

  if (lastSet) {
    const ex = getExercise(lastSet.exerciseId);
    const z = zScore(
      lastSet.velocityLoss,
      baseline.velocityLossByExercise[lastSet.exerciseId],
      VELOCITY_LOSS_MIN_SD,
    );
    const d = baseline.velocityLossByExercise[lastSet.exerciseId];

    facts.push({
      id: `effort-set-${lastSet.setIdx}`,
      claim:
        z >= DEPARTURE_THRESHOLD
          ? `That ${ex.name} set went deeper than your sets of it usually do.`
          : z <= -DEPARTURE_THRESHOLD
            ? `That ${ex.name} set stayed further from failure than you usually take it.`
            : `That ${ex.name} set landed where your sets of it usually land.`,
      evidence: [
        { label: 'velocity loss, this set', value: pct(lastSet.velocityLoss) },
        {
          label: 'your usual for this lift',
          value: d && d.n >= 3 ? `${pct(d.mean)} ± ${pct(d.sd)} over ${d.n} sets` : 'too few prior sets',
        },
        { label: 'fastest rep', value: `${fmt(lastSet.bestVelocity, 2)} m/s` },
        { label: 'final rep', value: `${fmt(lastSet.lastVelocity, 2)} m/s` },
        { label: 'estimated reps in reserve', value: fmt(lastSet.estimatedRir, 1) },
      ],
      window: `set ${lastSet.setIdx + 1}, ${lastSet.reps.length} reps over ${fmt(lastSet.tutS, 0)}s`,
      surprise: z,
      kind: 'effort',
    });

    if (lastSet.romDrop > 0.08) {
      const romZ = -zScore(
        lastSet.meanRomFrac,
        baseline.romByExercise[lastSet.exerciseId],
        ROM_MIN_SD,
      );
      facts.push({
        id: `form-set-${lastSet.setIdx}`,
        claim: `The last few reps of that set were shorter than the first few.`,
        evidence: [
          {
            label: 'range of motion, best rep',
            value: pct(Math.max(...lastSet.reps.map((r) => r.romFrac))),
          },
          { label: 'range of motion, final third', value: pct(lastSet.tailRomFrac) },
          { label: 'range of motion, set average', value: pct(lastSet.meanRomFrac) },
          { label: 'drop', value: pct(lastSet.romDrop) },
        ],
        window: `set ${lastSet.setIdx + 1}`,
        surprise: Math.max(romZ, lastSet.romDrop * 12),
        kind: 'form',
      });
    }
  }

  const untouched = PATTERNS.filter((p) => !totals.patternsTouched.includes(p));
  if (untouched.length > 0 && completed.length >= 3) {
    facts.push({
      id: 'coverage-patterns',
      claim: `So far this session is ${listPatterns(totals.patternsTouched)} only.`,
      evidence: [
        { label: 'patterns trained', value: totals.patternsTouched.join(', ') || 'none' },
        { label: 'patterns untouched', value: untouched.join(', ') },
        { label: 'sets completed', value: String(completed.length) },
      ],
      window: 'this session',
      // A narrow session is only notable once it is clearly a whole session.
      surprise: totals.patternsTouched.length <= 1 ? 1.4 : 0.4,
      kind: 'coverage',
    });
  }

  // Merge by display name first: the figure draws calves as one anterior region
  // and two posterior soleus regions, which would otherwise rank as three
  // separate "muscles" and let a calf raise outrank a squat.
  const merged = new Map<string, { slug: MuscleSlug; tension: number }>();
  for (const [slug, tension] of Object.entries(totals.byMuscle) as Array<
    [MuscleSlug, number]
  >) {
    const name = REGION_NAMES[slug];
    const prev = merged.get(name);
    if (prev) prev.tension += tension;
    else merged.set(name, { slug, tension });
  }
  const ranked = [...merged.values()].sort((a, b) => b.tension - a.tension);

  if (ranked.length > 0 && totals.totalTensionS > 0) {
    const { slug: topSlug, tension: topTension } = ranked[0];
    const typical = baseline.typicalSessionTensionS[topSlug] ?? 0;
    const ratio = typical > 0 ? topTension / typical : 1;
    facts.push({
      id: 'load-top-muscle',
      claim:
        ratio >= 1.35
          ? `Your ${REGION_NAMES[topSlug]} have spent longer under tension than a usual session gives them.`
          : `Most of the time under tension so far has gone to your ${REGION_NAMES[topSlug]}.`,
      evidence: [
        { label: 'attributed time under tension', value: mmss(topTension) },
        { label: 'share of session', value: pct(topTension / totals.totalTensionS) },
        {
          label: 'a usual session for this region',
          value: typical > 0 ? mmss(typical) : 'not in your recent history',
        },
      ],
      window: 'session to date',
      surprise: ratio >= 1.35 ? 1.2 : 0.3,
      kind: 'energy',
    });
  }

  return facts;
}

function listPatterns(ps: Pattern[]): string {
  if (ps.length === 0) return 'nothing';
  if (ps.length === 1) return ps[0];
  return `${ps.slice(0, -1).join(', ')} and ${ps[ps.length - 1]}`;
}

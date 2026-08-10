import { PROFILE, type HealthProfile } from '../data/profile';
import { PATTERNS } from '../data/patterns';
import type { DerivedState } from './deriveState';
import { mmss } from './facts';
import { buildMonthlyReport, type MonthlyReport } from './monthly';

/**
 * The assistant.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT THIS IS, PLAINLY: there is no language model behind it. Every answer
 * below is assembled from numbers this engine already computed, by the same
 * rule the rest of the app follows — nothing reaches the user that was not
 * measured.
 *
 * That is not a placeholder for a "real" version. It is the architecture. A
 * language model slots in at exactly one point: `renderAnswer` would hand an
 * `Answer` object — its claim and its evidence rows, and nothing else — to a
 * model whose only job is to phrase it. The model would never see raw data,
 * never do arithmetic, and never choose a fact. That constraint is what makes
 * it safe to add, and it is why the boundary is drawn here rather than later.
 *
 * The failure being designed against is documented: Strava's Athlete
 * Intelligence told a user their four-mile run had "elevation changes
 * throughout the splits" on a route with 72 feet of gain, because a model was
 * handed numbers and asked to narrate them (narrative-layer.md §1 ②). An
 * assistant that cannot compute cannot make that mistake.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface Answer {
  intent: Intent;
  /** The claim. Plain language, no number the evidence cannot account for. */
  text: string;
  /** Every figure quoted above, with its provenance. */
  evidence: Array<{ label: string; value: string }>;
  /** Set when the question is outside what training data can answer. */
  deferral?: string;
}

export type Intent =
  | 'progress'
  | 'balance'
  | 'energy'
  | 'effort'
  | 'recovery'
  | 'health-note'
  | 'clinical'
  | 'capabilities'
  | 'unknown';

/**
 * The one thing this system refuses to do.
 *
 * A question about pain, injury, medication or diagnosis has a correct answer,
 * and that answer depends on an examination this app has not performed. The
 * assistant knows the person logged a lower-back strain; it does not know
 * whether their back hurts today, and no amount of accelerometer data will
 * tell it. Saying something confident here is the highest-cost mistake the
 * product can make, so it is the one place the assistant stops and says so.
 */
export const CLINICAL_BOUNDARY =
  'I can only speak to what your sessions measured. Anything about pain, injury or a diagnosis needs a clinician who can actually examine you — I would be guessing, and guessing confidently is the worst thing I could do here.';

const KEYWORDS: Array<[Intent, RegExp]> = [
  // Clinical first: it must win even when the sentence also mentions training.
  // Stems, not exact words. `calorie` with a trailing \b never matches
  // "calories", and `tear` never matches "tore" — both slipped through until a
  // test asked. Every entry here is written to catch inflections.
  [
    'clinical',
    /\b(pain\w*|hurts?|hurting|injur\w*|ache\w*|aching|sore\w*|doctor|physio\w*|diagnos\w*|medication\w*|meds|surgery|tear|tore|torn|strain\w*|sprain\w*|pulled|tweak\w*|flare|numb\w*|dizz\w*|swell\w*|should i (?:see|stop))\b/i,
  ],
  ['balance', /\b(balanc\w*|neglect\w*|missing|weak\w*|under|imbalance|ignor\w*|forgot\w*|skip\w*|what should i (?:train|do)|next session)\b/i],
  ['energy', /\b(calor\w*|kcal|energy|burn\w*|fuel\w*)\b/i],
  ['effort', /\b(hard\w*|effort\w*|intens\w*|failure|rir|velocit\w*|push\w* myself|deep\w*|heav\w*)\b/i],
  ['recovery', /\b(recover\w*|rest|rested|resting|rest days?|tired|fatigue\w*|overtrain\w*|deload\w*|sleep\w*)\b/i],
  ['health-note', /\b(back|shoulder|history|condition|note|profile|know about me)\b/i],
  ['progress', /\b(progress|how am i|doing|going|improv\w*|better|month|summary|overall)\b/i],
  ['capabilities', /\b(what can you|help|who are you|what do you know|abilities)\b/i],
];

export function classify(question: string): Intent {
  for (const [intent, re] of KEYWORDS) {
    if (re.test(question)) return intent;
  }
  return 'unknown';
}

export interface AssistantContext {
  state: DerivedState;
  report: MonthlyReport;
  profile: HealthProfile;
}

export function buildContext(state: DerivedState): AssistantContext {
  return { state, report: buildMonthlyReport(), profile: PROFILE };
}

export function answer(question: string, ctx: AssistantContext): Answer {
  const intent = classify(question);
  const { report, profile, state } = ctx;

  switch (intent) {
    case 'clinical':
      return {
        intent,
        text: CLINICAL_BOUNDARY,
        evidence: [
          {
            label: 'what I do have',
            value: `${report.sessions} sessions over ${report.windowDays} days`,
          },
          {
            label: 'what I do not have',
            value: 'any examination, symptom report, or clinical record',
          },
        ],
        deferral: 'clinical',
      };

    case 'balance': {
      const untouched = report.untouchedPatterns;
      const weakest = report.byPattern.filter((p) => p.value > 0).slice(-1)[0];
      return {
        intent,
        text: untouched.length
          ? `You have not trained ${list(untouched)} at all this month. ${cap(weakest.label)} is your lightest of the ones you did train, at ${pct(weakest.share)} of your time under tension.`
          : `All seven patterns show up this month. ${cap(weakest.label)} is the lightest, at ${pct(weakest.share)} of your time under tension.`,
        evidence: [
          { label: 'untrained patterns', value: untouched.join(', ') || 'none' },
          ...report.byPattern.slice(0, 3).map((p) => ({
            label: p.label,
            value: `${mmss(p.value)} · ${pct(p.share)}`,
          })),
          { label: 'measured over', value: `${report.windowDays} days` },
        ],
      };
    }

    case 'energy':
      return {
        intent,
        text: `You have burned about ${Math.round(report.totalKcal)} kcal training this month — roughly ${Math.round(report.kcalPerDay)} a day averaged across rest days, or ${Math.round(report.kcalPerSession)} in a typical session. That figure comes from heart rate and carries about ±20%.`,
        evidence: [
          { label: 'month total', value: `${Math.round(report.totalKcal)} kcal ± 20%` },
          { label: 'per day, rest days included', value: `${Math.round(report.kcalPerDay)} kcal` },
          { label: 'per session', value: `${Math.round(report.kcalPerSession)} kcal` },
          { label: 'method', value: 'Keytel et al. (2005), from heart rate' },
        ],
      };

    case 'effort': {
      const last = state.lastCompletedSet;
      if (!last) {
        return {
          intent,
          text: `No completed sets yet in this session. Across the month you have logged ${report.totalSets} sets over ${(report.totalMinutes / 60).toFixed(1)} hours.`,
          evidence: [
            { label: 'sets this month', value: String(report.totalSets) },
            { label: 'training time', value: `${(report.totalMinutes / 60).toFixed(1)} hours` },
          ],
        };
      }
      return {
        intent,
        text: `Your last set lost ${pct(last.velocityLoss)} of its speed from the fastest rep to the final one, which puts it ${state.lastSetPhrase}. Estimated reps left in reserve: about ${last.estimatedRir.toFixed(0)}.`,
        evidence: [
          { label: 'velocity loss', value: pct(last.velocityLoss) },
          { label: 'fastest rep', value: `${last.bestVelocity.toFixed(2)} m/s` },
          { label: 'final rep', value: `${last.lastVelocity.toFixed(2)} m/s` },
          { label: 'estimated reps in reserve', value: last.estimatedRir.toFixed(1) },
          { label: 'note', value: 'reps in reserve is modelled from velocity, not measured' },
        ],
      };
    }

    case 'recovery': {
      const gaps = restDayGaps(report.days.map((d) => d.daysAgo));
      return {
        intent,
        text: `You trained ${report.sessions} times in ${report.windowDays} days, with your longest gap at ${gaps.longest} days. I can describe that pattern, but whether it is enough recovery for you depends on sleep and stress I am not measuring here.`,
        evidence: [
          { label: 'sessions', value: `${report.sessions} in ${report.windowDays} days` },
          { label: 'longest gap between sessions', value: `${gaps.longest} days` },
          { label: 'typical gap', value: `${gaps.median} days` },
          { label: 'not measured', value: 'sleep, HRV, stress, nutrition' },
        ],
      };
    }

    case 'health-note': {
      if (profile.notes.length === 0) {
        return {
          intent,
          text: 'You have not logged any health history, so I am working from training data alone.',
          evidence: [{ label: 'notes on file', value: 'none' }],
        };
      }
      const lines = profile.notes.map((n) => {
        const pattern = report.byPattern.find((p) => n.watch.includes(p.key));
        return pattern
          ? `${n.label} — your ${pattern.key} volume this month is ${mmss(pattern.value)}, ${pct(pattern.share)} of your total`
          : n.label;
      });
      return {
        intent,
        text: `Here is what you have told me, and the numbers each one makes worth watching. ${lines.join('. ')}. I am flagging the volume, not judging whether it is safe for you.`,
        evidence: [
          ...profile.notes.map((n) => ({
            label: n.label,
            value: `logged ${Math.round(n.loggedDaysAgo / 30)} months ago · watching ${n.watch.join(', ')}`,
          })),
        ],
        deferral: 'clinical-adjacent',
      };
    }

    case 'progress': {
      const top = report.byMuscle[0];
      return {
        intent,
        text: `Over the last ${report.windowDays} days: ${report.sessions} sessions, ${report.totalSets} sets, ${(report.totalMinutes / 60).toFixed(1)} hours. Most of your time under tension went to ${top.label}, at ${pct(top.share)}. I am describing what happened rather than scoring it — there is no target here to be behind on.`,
        evidence: [
          { label: 'sessions', value: String(report.sessions) },
          { label: 'sets', value: String(report.totalSets) },
          { label: 'training time', value: `${(report.totalMinutes / 60).toFixed(1)} hours` },
          { label: 'most-loaded region', value: `${top.label} · ${pct(top.share)}` },
        ],
      };
    }

    case 'capabilities':
    case 'unknown':
    default:
      return {
        intent: intent === 'capabilities' ? 'capabilities' : 'unknown',
        text: `I can only answer from what your sessions actually measured — how much you trained, how hard your sets went, which patterns you have covered, and roughly how much energy that cost. I have your ${profile.notes.length} logged health ${profile.notes.length === 1 ? 'note' : 'notes'} for context. Anything outside that I would be inventing.`,
        evidence: [
          { label: 'window', value: `${report.windowDays} days, ${report.sessions} sessions` },
          { label: 'health notes on file', value: String(profile.notes.length) },
          {
            label: 'cannot answer',
            value: 'anything clinical, or anything not in the sensor stream',
          },
        ],
      };
  }
}

/** Questions offered up front, so the surface is not a blank box. */
export const SUGGESTED = [
  'How is my month going?',
  'What am I neglecting?',
  'How hard was that last set?',
  'How many calories have I burned?',
  'Am I recovering enough?',
  'What do you know about me?',
] as const;

function restDayGaps(daysAgoSorted: number[]) {
  const sorted = [...daysAgoSorted].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
  if (gaps.length === 0) return { longest: 0, median: 0 };
  const ordered = [...gaps].sort((a, b) => a - b);
  return {
    longest: Math.max(...gaps),
    median: ordered[Math.floor(ordered.length / 2)],
  };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function list(items: readonly string[]): string {
  if (items.length === 0) return 'nothing';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Guards against a pattern being renamed out from under the keyword matcher. */
export const KNOWN_PATTERNS = PATTERNS;

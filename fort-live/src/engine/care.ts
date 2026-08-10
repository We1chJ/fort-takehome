import { CARE_CIRCLE, type CareMember, type CareSignal } from '../data/careCircle';
import { MAX_ABS_Z } from './baseline';

/**
 * Reading a shared signal.
 *
 * The whole engine is the same one the training panel uses, pointed at someone
 * else's data with their permission: compare a person to their own recent
 * history, say what changed, and stop. Nothing here knows what a "normal"
 * resting heart rate is, because that question needs a doctor and a history
 * this app does not have.
 *
 * The hard line, and the reason it is enforced in code rather than in copy:
 * this module can conclude that something CHANGED. It can never conclude what
 * the change MEANS. Slower chair rises are slower chair rises — they are not
 * a diagnosis, and the difference between those two sentences is the whole
 * difference between a product that helps a family and one that frightens it.
 */

/** How far a signal has moved from that person's own baseline, in SDs. */
export function departure(s: CareSignal): number {
  if (s.sd <= 1e-6) return 0;
  const z = (s.current - s.baseline) / s.sd;
  return Math.max(-MAX_ABS_Z, Math.min(MAX_ABS_Z, z));
}

/** Signed so positive always means "moved the way that would matter". */
export function concernScore(s: CareSignal): number {
  const z = departure(s);
  return s.concernWhen === 'falls' ? -z : z;
}

/** Percentage change from their own baseline. */
export function changePct(s: CareSignal): number {
  if (s.baseline === 0) return 0;
  return (s.current - s.baseline) / Math.abs(s.baseline);
}

export const NOTABLE = 1.5;

/**
 * The one number on a collapsed row.
 *
 * It is deliberately NOT a health score, and it is not named one anywhere the
 * user can see it. Nothing on a wrist can score a person's health, and a number
 * that claimed to would be the exact failure this whole app is built against —
 * a plausible figure with nothing underneath it.
 *
 * What it can honestly say is how far someone is sitting from their own usual
 * range right now. 100 means everything they share is where it normally is. It
 * falls as signals depart in the direction that would matter, and it falls
 * fastest on the first departure: one standard deviation costs about eight
 * points, and the curve saturates so that no combination of trends can drive it
 * anywhere near zero. That shape is the point. A set of trends is never
 * evidence that someone is at nought out of a hundred, so the number must not
 * be able to say it.
 */
export const STEADINESS_HALF = 12;

export function steadiness(member: CareMember): number | null {
  if (member.sharing === 'paused' || member.signals.length === 0) return null;

  // Only adverse movement counts. Someone walking more than usual has not
  // earned points back on a scale that exists to notice decline.
  const adverse = member.signals
    .map(concernScore)
    .filter((z) => z > 0)
    .sort((a, b) => b - a);
  if (adverse.length === 0) return 100;

  // The strongest departure at full weight, the rest at half: several signals
  // moving together matter, but they are not independent observations.
  const penalty = adverse[0] + 0.5 * adverse.slice(1).reduce((a, b) => a + b, 0);
  return Math.round((100 * STEADINESS_HALF) / (STEADINESS_HALF + penalty));
}

export type MemberStatus = 'paused' | 'steady' | 'changed';

export interface MemberReading {
  member: CareMember;
  status: MemberStatus;
  /** Signals that moved in the direction that would matter, strongest first. */
  moved: CareSignal[];
  /** One descriptive sentence. Never a cause, never a diagnosis. */
  summary: string;
  /** Distance from their own usual range, 0–100. Null when sharing is paused. */
  steadiness: number | null;
}

export function readMember(member: CareMember): MemberReading {
  if (member.sharing === 'paused' || member.signals.length === 0) {
    return {
      member,
      status: 'paused',
      moved: [],
      summary: `${member.name} has sharing paused. You will see nothing until they turn it back on.`,
      steadiness: null,
    };
  }

  const moved = member.signals
    .filter((s) => concernScore(s) >= NOTABLE)
    .sort((a, b) => concernScore(b) - concernScore(a));

  if (moved.length === 0) {
    return {
      member,
      status: 'steady',
      summary: `Everything ${member.name} shares is where it usually sits.`,
      moved: [],
      steadiness: steadiness(member),
    };
  }

  const phrases = moved.map(
    (s) => `${s.label} ${s.concernWhen === 'falls' ? 'down' : 'up'} ${pct(Math.abs(changePct(s)))}`,
  );

  // Two signals moving together is worth a different sentence from one moving
  // alone — not because it is more serious, but because it is less likely to
  // be noise, and that is a claim about the data rather than about her health.
  const together =
    moved.length > 1
      ? ` Two things moved together, which makes it less likely to be noise.`
      : '';

  return {
    member,
    status: 'changed',
    moved,
    summary: `Compared with ${member.name}'s own last month: ${list(phrases)}.${together}`,
    steadiness: steadiness(member),
  };
}

export function readCircle(circle: CareMember[] = CARE_CIRCLE): MemberReading[] {
  return circle.map(readMember);
}

export type ScoreBand = 'steady' | 'watch' | 'moved';

/** Below this, a card that is already flagged shows the low step rather than the middle one. */
export const BAND_LOW = 75;

/**
 * Which of the three hues the ring wears.
 *
 * The obvious implementation — cut the score at two thresholds — has a bug that
 * only shows up on the screen: a member can trip the 1.5σ flag on one signal
 * and still score 89, which would paint a green ring on a card that says
 * "worth a call". So the top step is defined by the flag, not by the number.
 * Green means nothing crossed the line. The other two split by magnitude.
 */
export function scoreBand(reading: MemberReading): ScoreBand | null {
  if (reading.status === 'paused' || reading.steadiness === null) return null;
  if (reading.status === 'steady') return 'steady';
  return reading.steadiness < BAND_LOW ? 'moved' : 'watch';
}

/**
 * What to do about it — deliberately the smallest possible step.
 *
 * The only action this product recommends is talking to the person. It does
 * not say "book an appointment", because it cannot know whether one is needed,
 * and it does not stay silent either, because a family member looking at a
 * changed trend deserves to be told what the reasonable next move is.
 */
export function nextStep(reading: MemberReading): string | null {
  if (reading.status !== 'changed') return null;
  const { name } = reading.member;
  // Named rather than pronouned throughout: the profile records a relation,
  // not pronouns, and guessing them from "mother" or "father" is a guess this
  // product has no reason to make.
  return `Worth a call — ask ${name} how the last couple of weeks have felt. If it keeps going this way, worth ${name} mentioning it to a GP. This is a change in a measurement, not a diagnosis, and nothing here can tell you the cause.`;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

function list(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

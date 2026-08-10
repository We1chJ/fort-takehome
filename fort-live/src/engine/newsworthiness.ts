import { DEPARTURE_THRESHOLD } from './baseline';
import type { Fact } from './facts';

/**
 * The filter that lets the panel say nothing.
 *
 * Strava's Athlete Intelligence was mocked less for its viral howlers than for
 * banality — restating numbers the user had just read, in prose
 * (narrative-layer.md §1 ④). The fix is not better writing. It is a threshold:
 * a fact is worth surfacing only if it departs from this lifter's own baseline
 * far enough to be news to them.
 *
 * On an ordinary session nothing clears the bar and the sheet says so. That is
 * the intended behaviour, not a gap.
 */

/** The same bar the last-set strip uses, so the two surfaces cannot disagree. */
export const SURPRISE_THRESHOLD = DEPARTURE_THRESHOLD;

/** At most this many facts reach the sheet, best first. */
export const MAX_SURFACED = 2;

export function selectNewsworthy(
  facts: Fact[],
  threshold = SURPRISE_THRESHOLD,
): Fact[] {
  return facts
    .filter((f) => Math.abs(f.surprise) >= threshold)
    .sort((a, b) => Math.abs(b.surprise) - Math.abs(a.surprise))
    .slice(0, MAX_SURFACED);
}

/**
 * Renders the surfaced facts as one short passage.
 *
 * Deliberately template-based rather than model-generated. The claims are
 * already written in `facts.ts`, next to the arithmetic that justifies them —
 * handing them to a language model to rephrase would add a step that can
 * hallucinate and subtract nothing. An LLM renderer would slot in exactly here,
 * receiving only these Fact objects and no raw data, which is the constraint
 * that makes it safe. It is not needed to make the point.
 */
export function renderPassage(surfaced: Fact[]): string | null {
  if (surfaced.length === 0) return null;
  return surfaced.map((f) => f.claim).join(' ');
}

export const SILENT_MESSAGE =
  'Nothing here departs from how your sessions usually go. The numbers are below if you want them.';

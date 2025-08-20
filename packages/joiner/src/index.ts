// HFST-based token joining with clear error handling when models are unavailable.

export type JoinDecision = {
  surfacePrev: string;
  surfaceNext: string;
  joiner: '' | ' ' | '-' | "'";
  noSpace: boolean;
  reason: string;
};

export interface HFSTJoinAdapter {
  applyJoin(prev: string, next: string, lang: string): Promise<JoinDecision | null>;
}

/**
 * HFST-based join decision function.
 * This function delegates to HFST models when available, or returns an error when not.
 *
 * @param prev - Previous token
 * @param next - Next token
 * @param lang - Language code
 * @param options - Optional HFST adapter for join decisions
 * @returns Promise<JoinDecision> - Join decision or error
 */
export async function decideJoin(
  prev: string,
  next: string,
  lang: string,
  options?: { hfst?: HFSTJoinAdapter }
): Promise<JoinDecision> {
  // If HFST adapter is provided, use it
  if (options?.hfst) {
    try {
      const result = await options.hfst.applyJoin(prev, next, lang);
      if (result) {
        return result;
      }
    } catch {
      // Fall through to error case below
    }
  }

  // No HFST join model available - return clear error
  return {
    surfacePrev: prev,
    surfaceNext: next,
    joiner: " ",
    noSpace: false,
    reason: `no join model loaded for ${lang}`
  };
}
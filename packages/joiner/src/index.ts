// Basic token join rules with punctuation awareness.
export function joinTokens(prev: string, next: string): string {
  const punct = [".", ",", "!", "?", ";", ":"];
  if (punct.includes(next)) {
    return prev + next;
  }
  return `${prev} ${next}`;
}

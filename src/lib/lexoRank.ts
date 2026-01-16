/**
 * Lexicographic ranking utilities for stable ordering.
 * Generates ranks that can be infinitely inserted between existing ranks.
 */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const MID_CHAR = 'm';
const MIN_CHAR = 'a';
const MAX_CHAR = 'z';

/**
 * Get the middle character between two characters
 */
function getMidChar(a: string, b: string): string {
  const aIndex = ALPHABET.indexOf(a.toLowerCase());
  const bIndex = ALPHABET.indexOf(b.toLowerCase());
  
  if (aIndex === -1 || bIndex === -1) {
    return MID_CHAR;
  }
  
  const midIndex = Math.floor((aIndex + bIndex) / 2);
  return ALPHABET[midIndex];
}

/**
 * Generate a rank between two existing ranks.
 * If prevRank is null, generates a rank before nextRank.
 * If nextRank is null, generates a rank after prevRank.
 * If both are null, generates a middle rank.
 */
export function generateRankBetween(
  prevRank: string | null,
  nextRank: string | null
): string {
  // Both null - generate initial rank
  if (!prevRank && !nextRank) {
    return MID_CHAR;
  }

  // Only prevRank exists - append to get rank after
  if (prevRank && !nextRank) {
    return prevRank + MID_CHAR;
  }

  // Only nextRank exists - prepend to get rank before
  if (!prevRank && nextRank) {
    const firstChar = nextRank[0];
    const firstIndex = ALPHABET.indexOf(firstChar.toLowerCase());
    
    if (firstIndex > 0) {
      // Use character before first char
      return ALPHABET[Math.floor(firstIndex / 2)];
    }
    // First char is 'a', prepend 'a'
    return MIN_CHAR + MID_CHAR;
  }

  // Both exist - find rank between them
  const prev = prevRank!;
  const next = nextRank!;

  // Find common prefix length
  let commonLen = 0;
  while (commonLen < prev.length && commonLen < next.length && prev[commonLen] === next[commonLen]) {
    commonLen++;
  }

  // Get the differing characters
  const prevChar = commonLen < prev.length ? prev[commonLen] : MIN_CHAR;
  const nextChar = commonLen < next.length ? next[commonLen] : MAX_CHAR;
  
  const prevIndex = ALPHABET.indexOf(prevChar.toLowerCase());
  const nextIndex = ALPHABET.indexOf(nextChar.toLowerCase());

  // If there's room between the characters
  if (nextIndex - prevIndex > 1) {
    const midIndex = Math.floor((prevIndex + nextIndex) / 2);
    return prev.substring(0, commonLen) + ALPHABET[midIndex];
  }

  // No room - need to extend the string
  return prev + MID_CHAR;
}

/**
 * Generate initial ranks for a list of items.
 * Returns an array of ranks that are evenly distributed.
 */
export function generateInitialRanks(count: number): string[] {
  if (count === 0) return [];
  if (count === 1) return [MID_CHAR];

  const ranks: string[] = [];
  for (let i = 0; i < count; i++) {
    // Use padding to ensure even distribution
    const normalized = i / (count - 1);
    const charIndex = Math.floor(normalized * (ALPHABET.length - 1));
    ranks.push(ALPHABET[charIndex]);
  }

  // Ensure uniqueness by appending index if duplicates
  const seen = new Set<string>();
  return ranks.map((rank, index) => {
    let uniqueRank = rank;
    let suffix = 0;
    while (seen.has(uniqueRank)) {
      suffix++;
      uniqueRank = rank + ALPHABET[suffix % ALPHABET.length];
    }
    seen.add(uniqueRank);
    return uniqueRank;
  });
}

/**
 * Get the rank for inserting at the beginning of a list
 */
export function getRankForFirst(existingFirstRank: string | null): string {
  return generateRankBetween(null, existingFirstRank);
}

/**
 * Get the rank for inserting at the end of a list
 */
export function getRankForLast(existingLastRank: string | null): string {
  return generateRankBetween(existingLastRank, null);
}

/**
 * Get the rank for inserting at a specific index in a sorted list
 */
export function getRankForIndex(
  sortedRanks: string[],
  targetIndex: number
): string {
  if (sortedRanks.length === 0) {
    return MID_CHAR;
  }

  if (targetIndex <= 0) {
    return getRankForFirst(sortedRanks[0]);
  }

  if (targetIndex >= sortedRanks.length) {
    return getRankForLast(sortedRanks[sortedRanks.length - 1]);
  }

  const prevRank = sortedRanks[targetIndex - 1];
  const nextRank = sortedRanks[targetIndex];
  return generateRankBetween(prevRank, nextRank);
}

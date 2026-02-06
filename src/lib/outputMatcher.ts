/**
 * Output matching logic for Predict the Output problems.
 * Supports strict, trim-tolerant, and normalized modes.
 */

export type MatchMode = "strict" | "trim" | "normalized";

/** Trim leading/trailing whitespace from each line and the whole string */
function trimLines(s: string): string {
  return s
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

/** Normalize: collapse multiple spaces/blank lines, trim */
function normalize(s: string): string {
  return s
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}

/** Try JSON comparison if both strings parse as valid JSON */
function jsonEqual(a: string, b: string): boolean {
  try {
    const parsedA = JSON.parse(a);
    const parsedB = JSON.parse(b);
    return JSON.stringify(parsedA) === JSON.stringify(parsedB);
  } catch {
    return false;
  }
}

export function matchOutput(
  userOutput: string,
  expectedOutput: string,
  acceptedOutputs: string[],
  matchMode: MatchMode,
  outputType: string
): { isCorrect: boolean; matchedAgainst: string } {
  const allExpected = [expectedOutput, ...acceptedOutputs];

  for (const expected of allExpected) {
    let isMatch = false;

    if (outputType === "json") {
      isMatch = jsonEqual(userOutput, expected);
    } else {
      switch (matchMode) {
        case "strict":
          isMatch = userOutput === expected;
          break;
        case "trim":
          isMatch = trimLines(userOutput) === trimLines(expected);
          break;
        case "normalized":
          isMatch = normalize(userOutput) === normalize(expected);
          break;
      }
    }

    if (isMatch) {
      return { isCorrect: true, matchedAgainst: expected };
    }
  }

  return { isCorrect: false, matchedAgainst: expectedOutput };
}

/** Compute line-level diff for showing mismatches */
export function getLineDiff(
  userOutput: string,
  expectedOutput: string
): { userLines: string[]; expectedLines: string[]; mismatches: number[] } {
  const userLines = userOutput.split("\n");
  const expectedLines = expectedOutput.split("\n");
  const maxLen = Math.max(userLines.length, expectedLines.length);
  const mismatches: number[] = [];

  for (let i = 0; i < maxLen; i++) {
    const uLine = (userLines[i] ?? "").trimEnd();
    const eLine = (expectedLines[i] ?? "").trimEnd();
    if (uLine !== eLine) {
      mismatches.push(i);
    }
  }

  return { userLines, expectedLines, mismatches };
}

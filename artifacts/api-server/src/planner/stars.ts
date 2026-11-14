/** Parse conservative course-row candidates only. Never infer completion from requirement mentions. */
export function parseStarsText(text: string) {
  const completed = new Set<string>();
  const inProgress = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    // STARS row: 20253 CSCI561 4.0 A Title; OCR may put spaces/hyphens inside course code.
    const match = line.match(/\b20\d{3}\s+([A-Z]{2,8})[\s-]*(\d{3}[A-Z]?)\s+(\d+(?:\.\d+)?)\s+(A[+-]?|B[+-]?|C[+-]?|D[+-]?|F|CR|P|NP|NC|RG|IP|IN|IX|MG|NS|W|UW|TR)(?=\s|$)/i);
    if (!match) continue;
    const code = `${match[1]!.toUpperCase()}-${match[2]!.toUpperCase()}`;
    const grade = match[4]!.toUpperCase();
    if (/>\s*IP|\b(?:RG|IP|IN|IX|MG|NS)\b/i.test(line)) inProgress.add(code);
    else if (/^(?:[ABC][+-]?|CR|P|TR)$/.test(grade)) completed.add(code);
  }
  for (const code of inProgress) completed.delete(code);
  return {
    detectedFormat: /STARS|COURSE WORK|IN.PROGRESS|REQUIREMENT STATUS/i.test(text) ? "STARS-style report" : "Unrecognized text; candidates require review",
    completedCandidates: [...completed].sort(),
    inProgressCandidates: [...inProgress].sort(),
    warnings: [
      "Candidate extraction only—not an official degree audit. Review every course before applying.",
      "In-progress/current registration (IP/RG), missing grades, failed courses, and requirement mentions are never automatically counted as completed.",
      "OCR can misread codes and grades. Transfer credit, repeats, exceptions, courses not applied to the degree, and minimum-grade policies require advisor review.",
      "The synthetic undergraduate catalog does not reproduce the rules of a graduate report.",
      ...(completed.size === 0 ? ["No confidently recognizable completed rows found. Paste one course row per line or enter completed courses manually."] : []),
    ],
  };
}

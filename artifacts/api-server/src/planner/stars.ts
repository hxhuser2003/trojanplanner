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
    if (/^(?:RG|IP)$/.test(grade)) {
      inProgress.add(code);
      completed.add(code);
    } else if (/^(?:[ABC][+-]?|CR|P|TR)$/.test(grade)) completed.add(code);
  }
  return {
    detectedFormat: /STARS|COURSE WORK|IN.PROGRESS|REQUIREMENT STATUS/i.test(text) ? "STARS-style report" : "Unrecognized text; candidates require review",
    completedCandidates: [...completed].sort(),
    inProgressCandidates: [...inProgress].sort(),
    warnings: [
      "Candidate extraction only—not an official degree audit. Review every course before applying.",
      "In-progress/current registration (IP/RG) are treated as completed for planning so you will not be asked to register again; missing grades, failed courses, and requirement mentions are not counted.",
      "OCR can misread codes and grades. Transfer credit, repeats, exceptions, courses not applied to the degree, and minimum-grade policies require advisor review.",
      "Illustrative graduate planning goals do not reproduce USC degree requirements.",
      ...(completed.size === 0 ? ["No confidently recognizable completed rows found. Paste one course row per line or enter completed courses manually."] : []),
    ],
  };
}

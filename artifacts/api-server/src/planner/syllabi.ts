// Assessment facts belong to the linked document, not the Spring 2027 instructor or section.
// "historical" rows come from a past-term USC syllabus PDF; "synthetic" rows are labeled mocks
// created for this demo. Every course is described by one grading-breakdown table.
type Kind = "attendance" | "participation" | "quiz" | "homework" | "project" | "midterm" | "final" | "exam" | "other";
type Item = { item: string; kind: Kind; percent: number; when?: string };
type Status = "historical" | "synthetic";
type Spec = {
  term: string; status: Status; sourceUrl: string; page: number;
  projectMode: "individual" | "group" | "mixed" | "unspecified"; cadence: string; attendance: string;
  grading: Item[];
  notes: { label: string; value: string; excerpt: string; page: number }[];
};
const g = (item: string, kind: Kind, percent: number, when?: string): Item => ({ item, kind, percent, ...(when ? { when } : {}) });

const SPECS: Record<string, Spec> = {
  "CSCI-544": {
    term: "Fall 2024", status: "historical", sourceUrl: "https://web-app.usc.edu/soc/syllabus/20243/30249.pdf", page: 4,
    projectMode: "group", cadence: "Four coding homeworks, five quizzes, and staged team project milestones.",
    attendance: "The Fall 2024 syllabus says attendance was taken at random and could affect grades; no separate percentage is listed.",
    grading: [g("Quizzes", "quiz", 10, "Five quizzes"), g("Homework", "homework", 20, "Four coding homeworks"), g("Presentations", "other", 5),
      g("Class project", "project", 40, "Proposal, update, presentation, final report"), g("Midterm", "midterm", 10), g("Final", "final", 15)],
    notes: [
      { label: "Grading table", value: "Fall 2024", excerpt: "Fall 2024 grading table: quizzes 10%, homework 20%, presentations 5%, class project 40%, midterm 10%, final 15%.", page: 4 },
      { label: "Project format", value: "Team of five", excerpt: "Fall 2024 project section describes teams and proposal, update, presentation, and final report stages.", page: 3 },
    ],
  },
  "CSCI-546": {
    term: "Spring 2027 illustrative mock", status: "synthetic", sourceUrl: "/api/planner/mock-syllabi/CSCI-546", page: 1,
    projectMode: "group", cadence: "Illustrative project milestones every two to three weeks.",
    attendance: "Illustrative expectation: attend lectures and participate in design discussions; no published USC attendance policy is represented.",
    grading: [g("Reading responses", "homework", 10, "Weekly"), g("Participation", "participation", 10, "Design discussions"),
      g("Team implementation project", "project", 60, "Proposal, prototype, fault-injection demo, final report"),
      g("Midterm exam", "midterm", 10, "Week 8, in class"), g("Final exam", "final", 10, "Finals week")],
    notes: [{ label: "Mock notice", value: "Not published by USC", excerpt: "Created for this demo; these weights have not been published by USC.", page: 1 }],
  },
  "CSCI-561": {
    term: "Spring 2023", status: "historical", sourceUrl: "https://web-app.usc.edu/soc/syllabus/20231/30071.pdf", page: 2,
    projectMode: "unspecified", cadence: "Three programming homeworks, two midterms, and a final in the Spring 2023 syllabus.",
    attendance: "No attendance grading rule extracted from the Spring 2023 syllabus.",
    grading: [g("Programming homework", "homework", 30, "Three assignments, 10% each"), g("Midterm 1", "midterm", 20), g("Midterm 2", "midterm", 20), g("Final exam", "final", 30)],
    notes: [{ label: "Grading table", value: "Spring 2023", excerpt: "Spring 2023 schedule lists two 20% midterms, a 30% final, and three 10% programming homeworks.", page: 2 }],
  },
  "CSCI-570": {
    term: "Spring 2025", status: "historical", sourceUrl: "https://web-app.usc.edu/soc/syllabus/20251/30395.pdf", page: 3,
    projectMode: "unspecified", cadence: "Six homework assignments and two exams in the Spring 2025 syllabus.",
    attendance: "No attendance grading rule extracted from the Spring 2025 syllabus.",
    // The extract names "exam 1" and "exam 2" without saying whether either is a midterm or final.
    grading: [g("Homework", "homework", 24, "Six assignments"), g("Exam 1", "exam", 36), g("Exam 2", "exam", 40)],
    notes: [{ label: "Grading table", value: "Spring 2025", excerpt: "Spring 2025 weighting gives 36% to exam 1, 40% to exam 2, and 24% to homework.", page: 3 }],
  },
  "CSCI-571": {
    term: "Spring 2025", status: "historical", sourceUrl: "https://web-app.usc.edu/soc/syllabus/20251/30378.pdf", page: 3,
    projectMode: "individual", cadence: "Three assignments, two exams, and a final project in the Spring 2025 syllabus.",
    attendance: "The Spring 2025 syllabus gives no grade credit for participation.",
    grading: [g("Assignments", "homework", 12, "Three assignments"), g("Final project", "project", 8), g("Written exam 1", "exam", 40), g("Written exam 2", "exam", 40)],
    notes: [
      { label: "Grading table", value: "Spring 2025", excerpt: "Spring 2025 grading table lists two 40% written exams, 12% assignments, and an 8% final project.", page: 3 },
      { label: "Project format", value: "Individual", excerpt: "Spring 2025 assignment policy states that assignments are worked on individually.", page: 4 },
    ],
  },
  "CSCI-572": {
    term: "Spring 2027 illustrative mock", status: "synthetic", sourceUrl: "/api/planner/mock-syllabi/CSCI-572", page: 1,
    projectMode: "individual", cadence: "Illustrative project milestones about every three weeks.",
    attendance: "Illustrative expectation: attend class and present the final demo; no published USC attendance policy is represented.",
    grading: [g("Short exercises", "quiz", 10, "Weekly, online"), g("Reading responses", "homework", 10, "Weekly"),
      g("Individual search project", "project", 50, "Indexing, ranking, evaluation, and demo milestones"), g("Midterm exam", "midterm", 30, "Week 9, in class")],
    notes: [{ label: "Mock notice", value: "Not published by USC", excerpt: "Created for this demo; these weights have not been published by USC.", page: 1 }],
  },
  "CSCI-585": {
    term: "Fall 2024", status: "historical", sourceUrl: "https://web-app.usc.edu/soc/syllabus/20243/30150.pdf", page: 1,
    projectMode: "unspecified", cadence: "Two exams and in-class participation in the Fall 2024 syllabus.",
    attendance: "Fall 2024 on-campus participation is 20%; DEN grading uses two exams at 50% each.",
    grading: [g("Participation", "participation", 20, "On campus; DEN students exempt"), g("Exam 1", "exam", 40), g("Exam 2", "exam", 40)],
    notes: [{ label: "Grading table", value: "Fall 2024, on campus", excerpt: "Fall 2024 syllabus assigns two 40% exams and 20% participation on campus; DEN students are exempt from participation.", page: 1 }],
  },
};

const sum = (items: Item[], ...kinds: Kind[]) => items.filter(i => kinds.includes(i.kind)).reduce((n, i) => n + i.percent, 0);

function build(id: string, spec: Spec) {
  const { grading } = spec;
  if (sum(grading, "attendance", "participation", "quiz", "homework", "project", "midterm", "final", "exam", "other") !== 100) throw new Error(`Grading table for ${id} does not total 100%.`);
  const examPercent = sum(grading, "midterm", "final", "exam"), projectPercent = sum(grading, "project");
  const source = spec.status === "historical" ? `${spec.term} USC syllabus` : "Mock syllabus";
  return {
    term: spec.term, status: spec.status, examPercent, projectPercent, otherPercent: 100 - examPercent - projectPercent,
    quizPercent: sum(grading, "quiz"), attendancePercent: sum(grading, "attendance", "participation"),
    grading, projectMode: spec.projectMode, cadence: spec.cadence, attendance: spec.attendance, sourceUrl: spec.sourceUrl,
    evidence: [
      ...spec.notes.map(n => ({ ...n, status: spec.status })),
      ...grading.map(i => ({ label: i.item, value: `${i.percent}%${i.when ? ` · ${i.when}` : ""}`, page: spec.page, status: spec.status,
        excerpt: `${source} grading breakdown: ${i.item}, ${i.percent}% of grade${i.when ? ` (${i.when.charAt(0).toLowerCase()}${i.when.slice(1)})` : ""}.` })),
      { label: "Attendance policy", value: sum(grading, "attendance", "participation") ? `${sum(grading, "attendance", "participation")}%` : "Not separately graded", page: spec.page, status: spec.status, excerpt: spec.attendance },
    ],
  };
}

export const syllabi = Object.fromEntries(Object.entries(SPECS).map(([id, spec]) => [id, build(id, spec)]));

// Mock pages shown at /api/planner/mock-syllabi/:id. Their grading table is the same one the planner uses.
export const mockSyllabi = {
  "CSCI-546": {
    code: "CSCI 546", title: "Distributed Systems",
    overview: "An illustrative graduate course exploring replication, consistency, fault tolerance, distributed storage, and service design.",
    outcomes: ["Explain consistency and failure models", "Build and evaluate a replicated service", "Discuss tradeoffs in distributed storage designs"],
    project: "Teams design a replicated key-value service. Proposal, prototype, fault-injection demo, and final report are suggested milestones every two to three weeks.",
    topics: ["Weeks 1–3: processes, RPC, and failure models", "Weeks 4–6: clocks, consensus, and replication", "Weeks 7–10: distributed storage and transactions", "Weeks 11–15: fault testing, security, and project presentations"],
  },
  "CSCI-572": {
    code: "CSCI 572", title: "Information Retrieval and Web Search Engines",
    overview: "An illustrative graduate course exploring crawling, indexing, ranking, retrieval evaluation, and search applications.",
    outcomes: ["Implement a small retrieval pipeline", "Compare ranking methods with evaluation metrics", "Explain crawling and indexing tradeoffs"],
    project: "Each student builds a search prototype and submits an indexing milestone, ranking comparison, evaluation memo, and final demo about every three weeks.",
    topics: ["Weeks 1–3: crawling and document processing", "Weeks 4–6: inverted indexes and query processing", "Weeks 7–10: ranking and relevance feedback", "Weeks 11–15: evaluation, web search systems, and project demos"],
  },
} as const;

export function renderMockSyllabus(id: keyof typeof mockSyllabi): string {
  const doc = mockSyllabi[id];
  const spec = SPECS[id]!;
  const list = (items: readonly string[]) => items.map(item => `<li>${item}</li>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mock syllabus · ${doc.code}</title><style>body{font:16px/1.55 system-ui,sans-serif;max-width:780px;margin:2rem auto;padding:0 1rem;color:#1e2833}header{border:2px solid #b43c3c;background:#fff0ec;padding:1rem;border-radius:12px}h1{margin:.2rem 0}section{margin:1.8rem 0}table{border-collapse:collapse;width:100%}td,th{padding:.6rem;border:1px solid #ddd;text-align:left}small{color:#555}</style></head><body><header><strong>MOCK SYLLABUS · ILLUSTRATIVE ONLY</strong><h1>${doc.code}: ${doc.title}</h1><p>Created for the TrojanPlanner demo. This is not a USC or instructor-issued syllabus. Spring 2027 grading, policies, and assignments must be checked with the instructor.</p></header><section><h2>Course overview</h2><p>${doc.overview}</p></section><section><h2>Learning outcomes</h2><ul>${list(doc.outcomes)}</ul></section><section><h2>Illustrative grading breakdown</h2><table><thead><tr><th>Assessment</th><th>Weight</th><th>When</th></tr></thead><tbody>${spec.grading.map(row => `<tr><td>${row.item}</td><td>${row.percent}%</td><td>${row.when ?? ""}</td></tr>`).join("")}</tbody></table></section><section><h2>Project and cadence</h2><p>${doc.project}</p></section><section><h2>Illustrative weekly topics</h2><ul>${list(doc.topics)}</ul></section><section><h2>Attendance</h2><p>${spec.attendance}</p></section><footer><small>All assessment weights and policies on this page are hypothetical. The course title and Spring 2027 offering come from the USC Schedule of Classes.</small></footer></body></html>`;
}

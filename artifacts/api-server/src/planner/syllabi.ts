// Assessment facts belong to the linked document, not the Spring 2027 instructor or section.
// Historical rows come from past-term USC syllabi or instructor course pages.
// Synthetic rows are labeled mocks created for this demo. Unknown weights stay null.
type Kind = "attendance" | "participation" | "quiz" | "homework" | "project" | "midterm" | "final" | "exam" | "other";
type Item = { item: string; kind: Kind; percent: number; when?: string };
type Status = "historical" | "synthetic";
type Spec = {
  term: string; status: Status; sourceUrl: string; page: number;
  projectMode: "individual" | "group" | "mixed" | "unspecified"; cadence: string; attendance: string;
  grading: Item[];
  projectUnknown?: boolean; attendanceUnknown?: boolean;
  notes: { label: string; value: string; excerpt: string; page: number; status?: Status | "unknown" }[];
};
const g = (item: string, kind: Kind, percent: number, when?: string): Item => ({ item, kind, percent, ...(when ? { when } : {}) });

const SPECS: Record<string, Spec> = {
  "CSCI-530": {
    term: "Fall 2026", status: "historical", sourceUrl: "https://ccss.usc.edu/530/", page: 1,
    projectMode: "individual", cadence: "Two or three short homeworks, required labs, a paper or project, and two exams.",
    attendance: "Seven of nine labs are required and adjust the base grade; participation may also affect the final grade.",
    projectUnknown: true, attendanceUnknown: true,
    grading: [g("Homework", "homework", 15), g("Midterm", "midterm", 25), g("Paper or project", "other", 30), g("Final exam", "final", 30)],
    notes: [
      { label: "Base assessment split", value: "55% exams · 30% paper or project · 15% homework", excerpt: "Fall 2026 course page gives 25% to midterm, 30% to final, 30% to a paper or project, and 15% to homework; lab results adjust the base grade.", page: 1 },
      { label: "Project weight", value: "Unknown", excerpt: "The 30% component may be a written paper or a project, so its project weight is not fixed.", page: 1, status: "unknown" },
    ],
  },
  "CSCI-531": {
    term: "Spring 2022", status: "historical", sourceUrl: "https://web-app.usc.edu/soc/syllabus/20221/30321.pdf", page: 1,
    projectMode: "unspecified", cadence: "Quizzes, homework, programming assignments, two exams, and a semester project.",
    attendance: "Spring 2022 syllabus assigns 10% to class participation.",
    grading: [g("Quizzes", "quiz", 15), g("Midterm", "midterm", 20), g("Final exam", "final", 20), g("Homework", "homework", 10), g("Programming assignments", "homework", 10), g("Semester project", "project", 15), g("Participation", "participation", 10)],
    notes: [{ label: "Grading table", value: "Spring 2022", excerpt: "Spring 2022 syllabus lists 15% quizzes, 20% midterm, 20% final, 10% homework, 10% programming, 15% project, and 10% participation.", page: 1 }],
  },
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
  "CSCI-545": {
    term: "Spring 2024", status: "historical", sourceUrl: "https://web-app.usc.edu/soc/syllabus/20241/30398.pdf", page: 3,
    projectMode: "group", cadence: "Four homeworks, four group robotics labs, a midterm, and a final.",
    attendance: "No attendance grading rule extracted from the Spring 2024 syllabus.",
    projectUnknown: true, attendanceUnknown: true,
    grading: [g("Midterm", "midterm", 30), g("Final exam", "final", 30), g("Group robotics labs", "other", 30), g("Homework", "homework", 10)],
    notes: [
      { label: "Grading table", value: "Spring 2024", excerpt: "Spring 2024 tentative grading gives 30% each to midterm, final, and labs, plus 10% homework.", page: 3 },
      { label: "Project weight", value: "Unknown", excerpt: "The group labs are not identified as a separately weighted project.", page: 3, status: "unknown" },
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
  "CSCI-551": {
    term: "Fall 2025", status: "historical", sourceUrl: "https://ant.isi.edu/~johnh/TEACHING/CS651/FA2025/csci551_csci651_fa2025_syllabus_251110.pdf", page: 3,
    projectMode: "unspecified", cadence: "Midterms, a final, homework, and a networking project.",
    attendance: "Fall 2025 syllabus assigns 5% to class participation.",
    grading: [g("Midterms", "midterm", 25), g("Final exam", "final", 30), g("Projects", "project", 30), g("Homework", "homework", 10), g("Participation", "participation", 5)],
    notes: [{ label: "Grading table", value: "Fall 2025", excerpt: "Fall 2025 syllabus lists 25% midterms, 30% final, 30% projects, 10% homework, and 5% participation.", page: 3 }],
  },
  "CSCI-561": {
    term: "Spring 2023", status: "historical", sourceUrl: "https://web-app.usc.edu/soc/syllabus/20231/30071.pdf", page: 2,
    projectMode: "unspecified", cadence: "Three programming homeworks, two midterms, and a final in the Spring 2023 syllabus.",
    attendance: "No attendance grading rule extracted from the Spring 2023 syllabus.",
    grading: [g("Programming homework", "homework", 30, "Three assignments, 10% each"), g("Midterm 1", "midterm", 20), g("Midterm 2", "midterm", 20), g("Final exam", "final", 30)],
    notes: [{ label: "Grading table", value: "Spring 2023", excerpt: "Spring 2023 schedule lists two 20% midterms, a 30% final, and three 10% programming homeworks.", page: 2 }],
  },
  "CSCI-566": {
    term: "Fall 2026", status: "historical", sourceUrl: "https://usc-fortis.github.io/CSCI566-F26/syllabus.pdf", page: 2,
    projectMode: "mixed", cadence: "One coding assignment, a midterm, and a staged group project with individual components.",
    attendance: "Quizzes may be given when in-person attendance is low; unused quiz weight moves to the project.",
    grading: [g("Midterm", "midterm", 35), g("Group project", "project", 45), g("Conditional quizzes", "quiz", 10), g("Coding assignment", "homework", 10)],
    notes: [
      { label: "Base grading", value: "Fall 2026", excerpt: "Fall 2026 syllabus gives 35% to midterm, 45% to project, 10% to quizzes, and 10% to coding. Unused quiz weight moves to project.", page: 2 },
      { label: "Project format", value: "Group with individual components", excerpt: "Project groups have four to six students; poster defense and peer evaluation are graded individually.", page: 3 },
    ],
  },
  "CSCI-567": {
    term: "Summer 2025", status: "historical", sourceUrl: "https://web-app.usc.edu/soc/syllabus/20252/29922.pdf", page: 5,
    projectMode: "group", cadence: "Three theory assignments, three programming assignments, a midterm, and a team project.",
    attendance: "No attendance grading rule extracted from the Summer 2025 syllabus.",
    attendanceUnknown: true,
    grading: [g("Theory assignments", "homework", 24), g("Programming assignments", "homework", 24), g("Midterm", "midterm", 22), g("Team final project", "project", 30)],
    notes: [{ label: "Grading table", value: "Summer 2025", excerpt: "Summer 2025 syllabus assigns 24% each to theory and programming work, 22% to midterm, and 30% to final project.", page: 5 }],
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
  "CSCI-580": {
    term: "Spring 2021", status: "historical", sourceUrl: "https://web-app.usc.edu/soc/syllabus/20211/30390.pdf", page: 1,
    projectMode: "unspecified", cadence: "The linked course overview discusses coding homework and a project but does not give grading weights.",
    attendance: "Attendance policy is not specified in the linked overview.",
    grading: [],
    notes: [{ label: "Assessment weights", value: "Not specified", excerpt: "The Spring 2021 USC syllabus overview mentions coding homework and a project without a grading table.", page: 1, status: "unknown" }],
  },
  "CSCI-585": {
    term: "Fall 2024", status: "historical", sourceUrl: "https://web-app.usc.edu/soc/syllabus/20243/30150.pdf", page: 1,
    projectMode: "unspecified", cadence: "Two exams and in-class participation in the Fall 2024 syllabus.",
    attendance: "Fall 2024 on-campus participation is 20%; DEN grading uses two exams at 50% each.",
    grading: [g("Participation", "participation", 20, "On campus; DEN students exempt"), g("Exam 1", "exam", 40), g("Exam 2", "exam", 40)],
    notes: [{ label: "Grading table", value: "Fall 2024, on campus", excerpt: "Fall 2024 syllabus assigns two 40% exams and 20% participation on campus; DEN students are exempt from participation.", page: 1 }],
  },
  "CSCI-587": {
    term: "Spring 2026", status: "historical", sourceUrl: "https://infolab.usc.edu/teaching/csci587/S26/", page: 1,
    projectMode: "unspecified", cadence: "Three homeworks, two midterms, and participation are listed on the Spring 2026 course page.",
    attendance: "Spring 2026 course page assigns 10% to participation.",
    projectUnknown: true,
    grading: [g("Midterm 1", "midterm", 30), g("Midterm 2", "midterm", 30), g("Homeworks", "homework", 30), g("Participation", "participation", 10)],
    notes: [
      { label: "Listed grading", value: "60% exams · 30% homework · 10% participation", excerpt: "Spring 2026 course page lists these weights and also mentions a project without specifying its weight.", page: 1 },
      { label: "Project weight", value: "Unknown", excerpt: "The project is mentioned outside the published grading table, so no project percentage is assigned.", page: 1, status: "unknown" },
    ],
  },
};

const sum = (items: Item[], ...kinds: Kind[]) => items.filter(i => kinds.includes(i.kind)).reduce((n, i) => n + i.percent, 0);

function build(id: string, spec: Spec) {
  const { grading } = spec;
  if (grading.length > 0 && sum(grading, "attendance", "participation", "quiz", "homework", "project", "midterm", "final", "exam", "other") !== 100) throw new Error(`Grading table for ${id} does not total 100%.`);
  const examPercent = grading.length ? sum(grading, "midterm", "final", "exam") : null;
  const projectPercent = grading.length && !spec.projectUnknown ? sum(grading, "project") : null;
  const source = spec.status === "historical" ? `${spec.term} USC syllabus source` : "Mock syllabus";
  return {
    term: spec.term, status: spec.status, examPercent, projectPercent,
    otherPercent: examPercent == null || projectPercent == null ? null : 100 - examPercent - projectPercent,
    quizPercent: grading.length ? sum(grading, "quiz") : null,
    attendancePercent: grading.length && !spec.attendanceUnknown ? sum(grading, "attendance", "participation") : null,
    grading, projectMode: spec.projectMode, cadence: spec.cadence, attendance: spec.attendance, sourceUrl: spec.sourceUrl,
    evidence: [
      ...spec.notes.map(n => ({ ...n, status: n.status ?? spec.status })),
      ...grading.map(i => ({ label: i.item, value: `${i.percent}%${i.when ? ` · ${i.when}` : ""}`, page: spec.page, status: spec.status,
        excerpt: `${source} grading breakdown: ${i.item}, ${i.percent}% of grade${i.when ? ` (${i.when.charAt(0).toLowerCase()}${i.when.slice(1)})` : ""}.` })),
      { label: "Attendance policy", value: !grading.length || spec.attendanceUnknown ? "Not specified" : sum(grading, "attendance", "participation") ? `${sum(grading, "attendance", "participation")}%` : "Not separately graded", page: spec.page, status: !grading.length || spec.attendanceUnknown ? "unknown" as const : spec.status, excerpt: spec.attendance },
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

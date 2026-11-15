// Assessment facts belong to the linked historical document, not the Spring 2027
// instructor or section. Mock documents are separate, visibly illustrative pages.
export const mockSyllabi = {
  "CSCI-546": {
    code: "CSCI 546", title: "Distributed Systems",
    overview: "An illustrative graduate course exploring replication, consistency, fault tolerance, distributed storage, and service design.",
    outcomes: ["Explain consistency and failure models", "Build and evaluate a replicated service", "Discuss tradeoffs in distributed storage designs"],
    grading: [
      { label: "Midterm and final exams", percent: 20 },
      { label: "Team implementation project", percent: 60 },
      { label: "Reading responses and participation", percent: 20 },
    ],
    project: "Teams design a replicated key-value service. Proposal, prototype, fault-injection demo, and final report are suggested milestones every two to three weeks.",
    attendance: "Illustrative expectation: attend lectures and participate in design discussions; no published USC attendance policy is represented.",
    topics: ["Weeks 1–3: processes, RPC, and failure models", "Weeks 4–6: clocks, consensus, and replication", "Weeks 7–10: distributed storage and transactions", "Weeks 11–15: fault testing, security, and project presentations"],
  },
  "CSCI-572": {
    code: "CSCI 572", title: "Information Retrieval and Web Search Engines",
    overview: "An illustrative graduate course exploring crawling, indexing, ranking, retrieval evaluation, and search applications.",
    outcomes: ["Implement a small retrieval pipeline", "Compare ranking methods with evaluation metrics", "Explain crawling and indexing tradeoffs"],
    grading: [
      { label: "Midterm and final exams", percent: 30 },
      { label: "Individual search project", percent: 50 },
      { label: "Short exercises and reading responses", percent: 20 },
    ],
    project: "Each student builds a search prototype and submits an indexing milestone, ranking comparison, evaluation memo, and final demo about every three weeks.",
    attendance: "Illustrative expectation: attend class and present the final demo; no published USC attendance policy is represented.",
    topics: ["Weeks 1–3: crawling and document processing", "Weeks 4–6: inverted indexes and query processing", "Weeks 7–10: ranking and relevance feedback", "Weeks 11–15: evaluation, web search systems, and project demos"],
  },
} as const;

type Syllabus = {
  term: string; status: "historical" | "synthetic";
  examPercent: number | null; projectPercent: number | null; otherPercent: number | null;
  projectMode: "individual" | "group" | "unspecified";
  cadence: string; attendance: string; sourceUrl: string;
  evidence: { label: string; value: string; excerpt: string; page: number; status: "historical" | "synthetic" | "unknown" }[];
};

export const syllabi: Record<string, Syllabus> = {
  "CSCI-530": {
    term: "Fall 2026", status: "historical", examPercent: 55, projectPercent: null, otherPercent: 15,
    projectMode: "unspecified", cadence: "Two or three short homeworks, required labs, a paper or project, and two exams.",
    attendance: "Fall 2026 course page requires seven of nine labs; lab results adjust the base grade separately.",
    sourceUrl: "https://ccss.usc.edu/530/",
    evidence: [
      { label: "Base assessment split", value: "55% exams · 30% paper or project · 15% homework; project weight unknown", excerpt: "Fall 2026 course page lists a 25% midterm, 30% final, 30% paper or project, and 15% homework; labs can adjust the base grade.", page: 1, status: "historical" },
    ],
  },
  "CSCI-531": {
    term: "Spring 2022", status: "historical", examPercent: 40, projectPercent: 15, otherPercent: 45,
    projectMode: "unspecified", cadence: "Quizzes, homework, programming assignments, two exams, and a semester project.",
    attendance: "Spring 2022 syllabus assigns 10% to class participation.",
    sourceUrl: "https://web-app.usc.edu/soc/syllabus/20221/30321.pdf",
    evidence: [
      { label: "Assessment split", value: "40% exams · 15% project · 45% other", excerpt: "Spring 2022 grading table lists 20% midterm, 20% final, 15% project, 15% quizzes, 20% assignments, and 10% participation.", page: 1, status: "historical" },
    ],
  },
  "CSCI-544": {
    term: "Fall 2024", status: "historical", examPercent: 25, projectPercent: 40, otherPercent: 35,
    projectMode: "group", cadence: "Four coding homeworks, five quizzes, and staged team project milestones.",
    attendance: "The Fall 2024 syllabus says attendance was taken at random and could affect grades.",
    sourceUrl: "https://web-app.usc.edu/soc/syllabus/20243/30249.pdf",
    evidence: [
      { label: "Assessment split", value: "25% exams · 40% project · 35% other", excerpt: "Fall 2024 grading table: quizzes 10%, homework 20%, presentations 5%, class project 40%, midterm 10%, final 15%.", page: 4, status: "historical" },
      { label: "Project format", value: "Team of five", excerpt: "Fall 2024 project section describes teams and proposal, update, presentation, and final report stages.", page: 3, status: "historical" },
    ],
  },
  "CSCI-545": {
    term: "Spring 2024", status: "historical", examPercent: 60, projectPercent: null, otherPercent: 40,
    projectMode: "group", cadence: "Four homeworks, four hands-on robotics labs, a midterm, and a final.",
    attendance: "No attendance grading rule extracted from the Spring 2024 syllabus.",
    sourceUrl: "https://web-app.usc.edu/soc/syllabus/20241/30398.pdf",
    evidence: [
      { label: "Assessment split", value: "60% exams · 30% group labs · 10% homework; project weight unknown", excerpt: "Spring 2024 tentative grading assigns 30% each to midterm, final, and labs, plus 10% homework. Labs are shown as other work rather than an identified project.", page: 3, status: "historical" },
      { label: "Lab format", value: "Group", excerpt: "Spring 2024 syllabus says students stay in the same group for all robotics labs.", page: 3, status: "historical" },
    ],
  },
  "CSCI-546": {
    term: "Spring 2027 illustrative mock", status: "synthetic", examPercent: 20, projectPercent: 60, otherPercent: 20,
    projectMode: "group", cadence: "Illustrative project milestones every two to three weeks.",
    attendance: mockSyllabi["CSCI-546"].attendance,
    sourceUrl: "/api/planner/mock-syllabi/CSCI-546",
    evidence: [
      { label: "Assessment split", value: "20% exams · 60% project · 20% other", excerpt: "Created for this demo; these weights have not been published by USC.", page: 1, status: "synthetic" },
      { label: "Project format", value: "Team implementation", excerpt: "Illustrative replicated-service project with several milestones.", page: 1, status: "synthetic" },
    ],
  },
  "CSCI-551": {
    term: "Fall 2025", status: "historical", examPercent: 55, projectPercent: 30, otherPercent: 15,
    projectMode: "unspecified", cadence: "Two short midterms, a final, homework, and a substantial networking project.",
    attendance: "Fall 2025 syllabus assigns 5% to class participation.",
    sourceUrl: "https://ant.isi.edu/~johnh/TEACHING/CS651/FA2025/csci551_csci651_fa2025_syllabus_251110.pdf",
    evidence: [
      { label: "Assessment split", value: "55% exams · 30% projects · 15% homework and participation", excerpt: "Fall 2025 grading table lists 25% midterms, 30% final, 30% projects, 10% homework, and 5% participation.", page: 3, status: "historical" },
    ],
  },
  "CSCI-561": {
    term: "Spring 2023", status: "historical", examPercent: 70, projectPercent: 0, otherPercent: 30,
    projectMode: "unspecified", cadence: "Three programming homeworks, two midterms, and a final in the Spring 2023 syllabus.",
    attendance: "No attendance grading rule extracted from the Spring 2023 syllabus.",
    sourceUrl: "https://web-app.usc.edu/soc/syllabus/20231/30071.pdf",
    evidence: [
      { label: "Assessment split", value: "70% exams · 0% projects · 30% homework", excerpt: "Spring 2023 schedule lists two 20% midterms, a 30% final, and three 10% programming homeworks.", page: 2, status: "historical" },
    ],
  },
  "CSCI-566": {
    term: "Fall 2026", status: "historical", examPercent: 35, projectPercent: 45, otherPercent: 20,
    projectMode: "group", cadence: "One coding assignment, a midterm, and a staged team project.",
    attendance: "Fall 2026 quizzes may be given when in-person attendance is low; unused quiz weight moves to the project.",
    sourceUrl: "https://usc-fortis.github.io/CSCI566-F26/syllabus.pdf",
    evidence: [
      { label: "Base assessment split", value: "35% midterm · 45% project · 20% quizzes and assignment", excerpt: "Fall 2026 syllabus gives 35 points to midterm, 45 to project, 10 to quizzes, and 10 to coding; unadministered quiz weight moves to project.", page: 2, status: "historical" },
      { label: "Project format", value: "Group with individual components", excerpt: "Fall 2026 project uses groups of four to six and individually grades poster defense and peer evaluation.", page: 3, status: "historical" },
    ],
  },
  "CSCI-567": {
    term: "Summer 2025", status: "historical", examPercent: 22, projectPercent: 30, otherPercent: 48,
    projectMode: "group", cadence: "Three theory assignments, three programming assignments, a midterm, and a team project.",
    attendance: "No attendance grading rule extracted from the Summer 2025 syllabus.",
    sourceUrl: "https://web-app.usc.edu/soc/syllabus/20252/29922.pdf",
    evidence: [
      { label: "Assessment split", value: "22% exam · 30% project · 48% assignments", excerpt: "Summer 2025 grading table assigns 24% each to theory and programming assignments, 22% midterm, and 30% final project.", page: 5, status: "historical" },
      { label: "Project format", value: "Team of up to three", excerpt: "Summer 2025 syllabus describes a team research project with proposal, presentation, and report.", page: 3, status: "historical" },
    ],
  },
  "CSCI-570": {
    term: "Spring 2025", status: "historical", examPercent: 76, projectPercent: 0, otherPercent: 24,
    projectMode: "unspecified", cadence: "Six homework assignments and two exams in the Spring 2025 syllabus.",
    attendance: "No attendance grading rule extracted from the Spring 2025 syllabus.",
    sourceUrl: "https://web-app.usc.edu/soc/syllabus/20251/30395.pdf",
    evidence: [
      { label: "Assessment split", value: "76% exams · 0% projects · 24% homework", excerpt: "Spring 2025 weighting gives 36% to exam 1, 40% to exam 2, and 24% to homework.", page: 3, status: "historical" },
    ],
  },
  "CSCI-571": {
    term: "Spring 2025", status: "historical", examPercent: 80, projectPercent: 8, otherPercent: 12,
    projectMode: "individual", cadence: "Three assignments, two exams, and a final project in the Spring 2025 syllabus.",
    attendance: "The Spring 2025 syllabus gives no grade credit for participation.",
    sourceUrl: "https://web-app.usc.edu/soc/syllabus/20251/30378.pdf",
    evidence: [
      { label: "Assessment split", value: "80% exams · 8% project · 12% assignments", excerpt: "Spring 2025 grading table lists two 40% written exams, 12% assignments, and an 8% final project.", page: 3, status: "historical" },
      { label: "Project format", value: "Individual", excerpt: "Spring 2025 assignment policy states that assignments are worked on individually.", page: 4, status: "historical" },
    ],
  },
  "CSCI-572": {
    term: "Spring 2027 illustrative mock", status: "synthetic", examPercent: 30, projectPercent: 50, otherPercent: 20,
    projectMode: "individual", cadence: "Illustrative project milestones about every three weeks.",
    attendance: mockSyllabi["CSCI-572"].attendance,
    sourceUrl: "/api/planner/mock-syllabi/CSCI-572",
    evidence: [
      { label: "Assessment split", value: "30% exams · 50% project · 20% other", excerpt: "Created for this demo; these weights have not been published by USC.", page: 1, status: "synthetic" },
      { label: "Project format", value: "Individual search prototype", excerpt: "Illustrative project with indexing, ranking, evaluation, and demo milestones.", page: 1, status: "synthetic" },
    ],
  },
  "CSCI-580": {
    term: "Spring 2021", status: "historical", examPercent: null, projectPercent: null, otherPercent: null,
    projectMode: "unspecified", cadence: "The linked historical overview discusses coding homework and a course project, but does not publish grading weights.",
    attendance: "Attendance policy not specified in the linked overview.",
    sourceUrl: "https://web-app.usc.edu/soc/syllabus/20211/30390.pdf",
    evidence: [
      { label: "Assessment weights", value: "Not specified", excerpt: "The USC-hosted Spring 2021 syllabus overview describes coding homework and a project without a grading table; weights remain unknown.", page: 1, status: "unknown" },
    ],
  },
  "CSCI-585": {
    term: "Fall 2024", status: "historical", examPercent: 80, projectPercent: 0, otherPercent: 20,
    projectMode: "unspecified", cadence: "Two exams and in-class participation in the Fall 2024 syllabus.",
    attendance: "Fall 2024 on-campus participation is 20%; DEN grading uses two exams at 50% each.",
    sourceUrl: "https://web-app.usc.edu/soc/syllabus/20243/30150.pdf",
    evidence: [
      { label: "Assessment split", value: "On-campus: 80% exams · 20% participation", excerpt: "Fall 2024 syllabus assigns two 40% exams and 20% participation on campus; DEN students are exempt from participation.", page: 1, status: "historical" },
    ],
  },
  "CSCI-587": {
    term: "Spring 2026", status: "historical", examPercent: 60, projectPercent: null, otherPercent: 40,
    projectMode: "unspecified", cadence: "Three homeworks, two midterms, and participation in the Spring 2026 course page.",
    attendance: "Spring 2026 course page assigns 10% to participation.",
    sourceUrl: "https://infolab.usc.edu/teaching/csci587/S26/",
    evidence: [
      { label: "Listed grading split", value: "60% exams · 40% homework and participation; project weight unclear", excerpt: "Spring 2026 course page lists two 30% midterms, 30% homework, and 10% participation; the page also mentions a project without listing its weight.", page: 1, status: "historical" },
    ],
  },
};

export function renderMockSyllabus(id: keyof typeof mockSyllabi): string {
  const doc = mockSyllabi[id];
  const list = (items: readonly string[]) => items.map(item => `<li>${item}</li>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mock syllabus · ${doc.code}</title><style>body{font:16px/1.55 system-ui,sans-serif;max-width:780px;margin:2rem auto;padding:0 1rem;color:#1e2833}header{border:2px solid #b43c3c;background:#fff0ec;padding:1rem;border-radius:12px}h1{margin:.2rem 0}section{margin:1.8rem 0}table{border-collapse:collapse;width:100%}td,th{padding:.6rem;border:1px solid #ddd;text-align:left}small{color:#555}</style></head><body><header><strong>MOCK SYLLABUS · ILLUSTRATIVE ONLY</strong><h1>${doc.code}: ${doc.title}</h1><p>Created for the TrojanPlanner demo. This is not a USC or instructor-issued syllabus. Spring 2027 grading, policies, and assignments must be checked with the instructor.</p></header><section><h2>Course overview</h2><p>${doc.overview}</p></section><section><h2>Learning outcomes</h2><ul>${list(doc.outcomes)}</ul></section><section><h2>Illustrative grading</h2><table><thead><tr><th>Assessment</th><th>Weight</th></tr></thead><tbody>${doc.grading.map(row => `<tr><td>${row.label}</td><td>${row.percent}%</td></tr>`).join("")}</tbody></table></section><section><h2>Project and cadence</h2><p>${doc.project}</p></section><section><h2>Illustrative weekly topics</h2><ul>${list(doc.topics)}</ul></section><section><h2>Attendance</h2><p>${doc.attendance}</p></section><footer><small>All assessment weights and policies on this page are hypothetical. The course title and Spring 2027 offering come from the USC Schedule of Classes.</small></footer></body></html>`;
}

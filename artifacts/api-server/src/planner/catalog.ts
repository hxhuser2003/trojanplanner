import { GetCatalogResponse as CatalogSchema } from "@workspace/api-zod";
import type { z } from "zod";

const meeting = (day: number, start: number, end: number, kind = "Lecture") => ({
  day, start, end, kind, location: "Demo classroom",
});
const section = (id: string, instructor: string, meetings: ReturnType<typeof meeting>[]) => ({
  id, instructor, meetings, eligibility: "Seat availability and enrollment restrictions not verified",
});
type Kind = "attendance" | "participation" | "quiz" | "homework" | "project" | "midterm" | "final";
type Item = { item: string; kind: Kind; percent: number; when?: string };
const g = (item: string, kind: Kind, percent: number, when?: string): Item => ({ item, kind, percent, ...(when ? { when } : {}) });
// Synthetic grading breakdowns, laid out like a typical USC syllabus "Grading Breakdown" table.
const GRADING: Record<string, Item[]> = {
  "CSCI-270": [g("Homework", "homework", 10, "Weekly"), g("Quizzes", "quiz", 10, "Weekly, in discussion"), g("Programming project", "project", 10),
    g("Midterm exam", "midterm", 30, "Week 7, in class"), g("Final exam", "final", 40, "Finals week")],
  "CSCI-271": [g("Attendance", "attendance", 5, "Taken every lecture"), g("Homework", "homework", 10, "Weekly"),
    g("Project milestones", "project", 60, "Weeks 5, 10, 15"), g("Final exam", "final", 25, "Finals week")],
  "CSCI-201": [g("Attendance", "attendance", 10, "Taken every lecture"), g("Lab exercises", "homework", 5, "Weekly"),
    g("Group project", "project", 65, "Checkpoints in weeks 6, 11, 15"), g("Midterm exam", "midterm", 20, "Week 8, in class")],
  "CSCI-202": [g("Quizzes", "quiz", 10, "Weekly, online"), g("Homework", "homework", 10, "Weekly"),
    g("Programming projects", "project", 50, "Four projects"), g("Final exam", "final", 30, "Finals week")],
  "CSCI-310": [g("Attendance", "attendance", 10, "Taken every lecture"), g("Homework", "homework", 5),
    g("Project milestones", "project", 70, "Four milestones"), g("Midterm exam", "midterm", 15, "Week 8, in class")],
  "CSCI-360": [g("Quizzes", "quiz", 10, "Biweekly, in class"), g("Homework", "homework", 5),
    g("Programming projects", "project", 40, "Three projects"), g("Midterm exam", "midterm", 20, "Week 9, in class"), g("Final exam", "final", 25, "Finals week")],
  "CSCI-350": [g("Quizzes", "quiz", 10, "Weekly, in class"), g("Projects", "project", 35, "Three projects"),
    g("Midterm exam", "midterm", 25, "Week 8, in class"), g("Final exam", "final", 30, "Finals week")],
  "WRIT-340": [g("Attendance", "attendance", 15, "Taken every class"), g("Participation", "participation", 15, "Workshops and peer review"),
    g("Essays", "project", 70, "Four drafts with revisions")],
};
const sum = (items: Item[], ...kinds: Kind[]) => items.filter(i => kinds.includes(i.kind)).reduce((n, i) => n + i.percent, 0);
const syllabus = (id: string, exams: number | null, projects: number | null, mode: string, cadence = "Weekly assignments") => {
  const grading = exams === null ? [] : GRADING[id] ?? [];
  // The headline weights below must agree with the grading table, so a typo fails at startup.
  if (exams !== null && (sum(grading, ...(["attendance", "participation", "quiz", "homework", "project", "midterm", "final"] as Kind[])) !== 100
    || sum(grading, "midterm", "final") !== exams || sum(grading, "project") !== projects)) throw new Error(`Grading table for ${id} does not match its weights.`);
  const attendance = sum(grading, "attendance");
  return {
  term: "Spring 2027 (synthetic)", status: exams === null ? "unknown" : "synthetic",
  examPercent: exams, projectPercent: projects,
  otherPercent: exams === null || projects === null ? null : 100 - exams - projects,
  quizPercent: exams === null ? null : sum(grading, "quiz"), attendancePercent: exams === null ? null : attendance,
  grading,
  projectMode: mode, cadence,
  attendance: exams === null ? "Not specified" : attendance ? `Attendance is graded (${attendance}% of the final grade).` : "Attendance is not separately graded.",
  sourceUrl: `/api/planner/sources/${id}`,
  evidence: exams === null ? [] : [
    { label: "Exam weighting", value: `${exams}%`, page: 1, status: "synthetic", excerpt: `Exams contribute ${exams}% of the final course grade.` },
    { label: "Project weighting", value: `${projects}%`, page: 1, status: "synthetic", excerpt: `Projects contribute ${projects}% of the final course grade.` },
    { label: "Project format", value: mode, page: 1, status: "synthetic", excerpt: `Projects are completed in ${mode === "group" ? "groups of three" : mode === "individual" ? "individual submissions" : "a mixture of individual and group submissions"}.` },
    { label: "Assignment cadence", value: cadence, page: 1, status: "synthetic", excerpt: `${cadence}.` },
    ...grading.map(i => ({ label: i.item, value: `${i.percent}%${i.when ? ` · ${i.when}` : ""}`, page: 2, status: "synthetic",
      excerpt: `Grading breakdown: ${i.item}, ${i.percent}% of grade${i.when ? ` (${i.when.charAt(0).toLowerCase()}${i.when.slice(1)})` : ""}.` })),
    ...(["midterm", "final", "quiz", "attendance"] as Kind[]).filter(k => !grading.some(i => i.kind === k)).map(k => ({
      label: { midterm: "No midterm", final: "No final exam", quiz: "No quizzes", attendance: "Attendance not graded" }[k as "midterm"], value: "0%", page: 2, status: "synthetic",
      excerpt: `The grading breakdown lists no ${{ midterm: "midterm exam", final: "final exam", quiz: "quizzes", attendance: "graded attendance" }[k as "midterm"]}.` })),
  ],
  };
};
// What each synthetic course covers, so topic questions ("anything on machine learning?") have something to match.
const TOPICS: Record<string, string> = {
  "CSCI-270": "Algorithm design and analysis: greedy algorithms, divide and conquer, dynamic programming, graph algorithms, network flow, and NP-completeness.",
  "CSCI-271": "Applying algorithms to practical problems: graph search, optimization, approximation and randomized algorithms, with implementation milestones.",
  "CSCI-201": "Object-oriented design in Java, multithreading and concurrency, networking, databases, and team software development.",
  "CSCI-202": "Systems programming in C and C++: memory management, processes, files, sockets, debugging, and performance tools.",
  "CSCI-310": "Software lifecycle, requirements, design patterns, testing, agile teamwork, and a semester-long team project.",
  "CSCI-360": "Search, game playing, logic, probabilistic reasoning and Bayesian networks, plus an introduction to machine learning (supervised learning, neural networks) and reinforcement learning.",
  "CSCI-350": "Processes and threads, synchronization, CPU scheduling, virtual memory, file systems, and kernel programming projects.",
  "CSCI-380": "Generative art, interactive media, procedural graphics, and creative coding.",
  "WRIT-340": "Advanced writing for engineers: technical documents, proposals, audience analysis, and revision.",
};
const course = (id: string, title: string, requirement: string, prerequisites: string[], sections: ReturnType<typeof section>[], exams: number | null, projects: number | null, mode: string, color: string, cadence?: string) => ({
  id, code: id.replace("-", " "), title, units: 4, requirement, prerequisites, sections,
  syllabus: syllabus(id, exams, projects, mode, cadence),
  color: ({ amber: "#9B641C", blue: "#315A8C", purple: "#75528D", green: "#3C755F", rose: "#A34D63", teal: "#2F7478", orange: "#B0683E" } as Record<string, string>)[color] ?? "#315A8C",
  description: `${TOPICS[id] ?? `Synthetic ${title.toLowerCase()} offering.`} (Synthetic demo description, not official USC course information.)`,
  sourceUrl: `/api/planner/sources/${id}`,
});
export const catalog: z.infer<typeof CatalogSchema> = CatalogSchema.parse({
  term: "Spring 2027", major: "Computer Science · synthetic undergraduate demo",
  catalogYear: "2026–2027 (illustrative rules)", sourceDate: "2026-11-14",
  notice: "All offerings, instructors, degree rules, times, and syllabus excerpts are synthetic fixtures—not official USC information. Your STARS report is never included in demo data.",
  completedOptions: ["CSCI-103", "CSCI-170", "CSCI-104", "CSCI-201", "CSCI-270", "MATH-125", "MATH-126", "WRIT-150"],
  courses: [
    course("CSCI-270", "Introduction to Algorithms", "algorithms", ["CSCI-170"],
      [section("270-01", "Alex Morgan (demo)", [meeting(0, 660, 740), meeting(2, 660, 740), meeting(4, 660, 710, "Discussion")])],
      70, 10, "individual", "amber"),
    course("CSCI-271", "Applied Algorithm Design", "algorithms", ["CSCI-170"],
      [section("271-01", "Jordan Lee (demo)", [meeting(1, 600, 680), meeting(3, 600, 680)]),
       section("271-02", "Jordan Lee (demo)", [meeting(0, 780, 860), meeting(2, 780, 860)])],
      25, 60, "individual", "amber", "Three milestone submissions"),
    course("CSCI-201", "Principles of Software Development", "systems", ["CSCI-103"],
      [section("201-01", "Sam Rivera (demo)", [meeting(0, 570, 650), meeting(2, 570, 650), meeting(1, 690, 740, "Lab")]),
       section("201-02", "Sam Rivera (demo)", [meeting(1, 720, 800), meeting(3, 720, 800), meeting(2, 900, 950, "Lab")])],
      20, 65, "group", "blue"),
    course("CSCI-202", "Systems Programming Studio", "systems", ["CSCI-103"],
      [section("202-01", "Casey Park (demo)", [meeting(0, 900, 980), meeting(2, 900, 980)]),
       section("202-02", "Casey Park (demo)", [meeting(1, 540, 620), meeting(3, 540, 620)])],
      30, 50, "individual", "blue"),
    course("CSCI-310", "Software Engineering", "elective", ["CSCI-103"],
      [section("310-01", "Taylor Chen (demo)", [meeting(0, 780, 860), meeting(2, 780, 860)]),
       section("310-02", "Taylor Chen (demo)", [meeting(1, 840, 920), meeting(3, 840, 920)])],
      15, 70, "group", "purple", "Four milestone submissions"),
    course("CSCI-360", "Introduction to Artificial Intelligence", "elective", ["CSCI-170"],
      [section("360-01", "Avery Brooks (demo)", [meeting(0, 1020, 1100), meeting(2, 1020, 1100)]),
       section("360-02", "Avery Brooks (demo)", [meeting(1, 660, 710), meeting(3, 660, 710), meeting(4, 780, 830, "Discussion")])],
      45, 40, "individual", "green"),
    course("CSCI-350", "Introduction to Operating Systems", "elective", ["CSCI-201"],
      [section("350-01", "Quinn Davis (demo)", [meeting(0, 600, 680), meeting(2, 600, 680)])],
      55, 35, "mixed", "rose"),
    course("CSCI-380", "Creative Computing", "elective", ["CSCI-103"],
      [section("380-01", "Riley Kim (demo)", [meeting(1, 780, 830), meeting(3, 780, 830)])],
      null, null, "unspecified", "teal"),
    course("WRIT-340", "Advanced Writing", "writing", ["WRIT-150"],
      [section("340-01", "Jamie Ellis (demo)", [meeting(0, 840, 890), meeting(2, 840, 890)]),
       section("340-02", "Jamie Ellis (demo)", [meeting(1, 1020, 1070), meeting(3, 1020, 1070)])],
      0, 70, "individual", "orange", "Four milestone submissions"),
  ],
  requirements: [
    { id: "algorithms", title: "Algorithms", description: "Choose one course from this illustrative requirement group.", needed: 1, courseIds: ["CSCI-270", "CSCI-271"] },
    { id: "systems", title: "Software & systems", description: "Choose one course from this illustrative requirement group.", needed: 1, courseIds: ["CSCI-201", "CSCI-202"] },
    { id: "elective", title: "Technical elective", description: "Choose one eligible elective.", needed: 1, courseIds: ["CSCI-310", "CSCI-360", "CSCI-350", "CSCI-380"] },
    { id: "writing", title: "Advanced writing", description: "Optional illustrative writing requirement.", needed: 1, courseIds: ["WRIT-340"] },
  ],
  defaultInput: {
    completedCourses: ["CSCI-103", "CSCI-170", "MATH-125", "WRIT-150"],
    requirementIds: ["algorithms", "systems", "elective"], minUnits: 12, maxUnits: 16,
    constraints: [
      { id: "no-friday", label: "Keep Fridays free", kind: "no_day", hard: true, enabled: true, value: "", days: [4], start: 0, end: 0 },
      { id: "work-hours", label: "Work Tue/Thu · 2–6 PM", kind: "blocked", hard: true, enabled: true, value: "", days: [1, 3], start: 840, end: 1080 },
      { id: "later-mornings", label: "Prefer starts after 10 AM", kind: "earliest", hard: false, enabled: true, value: "", days: [], start: 600, end: 0 },
      { id: "projects", label: "Prefer project-based assessment", kind: "prefer_projects", hard: false, enabled: true, value: "", days: [], start: 0, end: 0 },
    ],
  },
});

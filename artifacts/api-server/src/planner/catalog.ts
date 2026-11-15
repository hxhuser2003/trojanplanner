import { GetCatalogResponse as CatalogSchema } from "@workspace/api-zod";
import type { z } from "zod";

const meeting = (day: number, start: number, end: number, kind = "Lecture") => ({
  day, start, end, kind, location: "Demo classroom",
});
const section = (id: string, instructor: string, meetings: ReturnType<typeof meeting>[]) => ({
  id, instructor, meetings, eligibility: "Seat availability and enrollment restrictions not verified",
});
// Synthetic quiz and graded-attendance weights, carved out of each course's "other" share.
const SMALL_ITEMS: Record<string, { quizzes: number; attendance: number }> = {
  "CSCI-270": { quizzes: 10, attendance: 0 }, "CSCI-271": { quizzes: 0, attendance: 5 },
  "CSCI-201": { quizzes: 0, attendance: 10 }, "CSCI-202": { quizzes: 10, attendance: 0 },
  "CSCI-310": { quizzes: 0, attendance: 10 }, "CSCI-360": { quizzes: 10, attendance: 0 },
  "CSCI-350": { quizzes: 10, attendance: 0 }, "WRIT-340": { quizzes: 0, attendance: 15 },
};
const syllabus = (id: string, exams: number | null, projects: number | null, mode: string, cadence = "Weekly assignments") => {
  const small = exams === null ? null : SMALL_ITEMS[id] ?? { quizzes: 0, attendance: 0 };
  return {
  term: "Spring 2027 (synthetic)", status: exams === null ? "unknown" : "synthetic",
  examPercent: exams, projectPercent: projects,
  otherPercent: exams === null || projects === null ? null : 100 - exams - projects,
  quizPercent: small?.quizzes ?? null, attendancePercent: small?.attendance ?? null,
  projectMode: mode, cadence,
  attendance: !small ? "Not specified" : small.attendance ? `Attendance is graded (${small.attendance}% of the final grade).` : "Attendance is not separately graded.",
  sourceUrl: `/api/planner/sources/${id}`,
  evidence: exams === null ? [] : [
    { label: "Exam weighting", value: `${exams}%`, page: 1, status: "synthetic", excerpt: `Exams contribute ${exams}% of the final course grade.` },
    { label: "Project weighting", value: `${projects}%`, page: 1, status: "synthetic", excerpt: `Projects contribute ${projects}% of the final course grade.` },
    { label: "Project format", value: mode, page: 1, status: "synthetic", excerpt: `Projects are completed in ${mode === "group" ? "groups of three" : mode === "individual" ? "individual submissions" : "a mixture of individual and group submissions"}.` },
    { label: "Assignment cadence", value: cadence, page: 1, status: "synthetic", excerpt: `${cadence}.` },
    { label: "Quizzes", value: `${small!.quizzes}%`, page: 2, status: "synthetic", excerpt: small!.quizzes ? `Short in-class quizzes contribute ${small!.quizzes}% of the final grade.` : "There are no graded quizzes." },
    { label: "Attendance", value: `${small!.attendance}%`, page: 2, status: "synthetic", excerpt: small!.attendance ? `Attendance is taken each session and counts for ${small!.attendance}% of the final grade.` : "Attendance is not graded." },
  ],
  };
};
const course = (id: string, title: string, requirement: string, prerequisites: string[], sections: ReturnType<typeof section>[], exams: number | null, projects: number | null, mode: string, color: string, cadence?: string) => ({
  id, code: id.replace("-", " "), title, units: 4, requirement, prerequisites, sections,
  syllabus: syllabus(id, exams, projects, mode, cadence),
  color: ({ amber: "#9B641C", blue: "#315A8C", purple: "#75528D", green: "#3C755F", rose: "#A34D63", teal: "#2F7478", orange: "#B0683E" } as Record<string, string>)[color] ?? "#315A8C",
  description: `Synthetic ${title.toLowerCase()} offering for demonstrating planning and assessment trade-offs. Not official USC course information.`,
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

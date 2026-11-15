import { GetCatalogResponse as CatalogSchema } from "@workspace/api-zod";
import snapshot from "./usc-spring-2027.json";

// USC lists the weekly midterm/final slot as a "Quiz" section; students know it as the exam time.
const examSlot = <M extends { kind: string }>(m: M): M => (m.kind === "Quiz" ? { ...m, kind: "Exam" } : m);
import { syllabi } from "./syllabi";

const color: Record<string, string> = {
  algorithms: "#9B641C", web: "#315A8C", systems: "#75528D",
  ai: "#3C755F", data: "#2F7478", security: "#A14E4E",
  robotics: "#6A6C35", graphics: "#8C5791",
};
const category: Record<string, string> = {
  "CSCI-530": "security", "CSCI-531": "security", "CSCI-544": "ai",
  "CSCI-545": "robotics", "CSCI-546": "systems", "CSCI-551": "systems",
  "CSCI-561": "ai", "CSCI-566": "ai", "CSCI-567": "ai",
  "CSCI-570": "algorithms", "CSCI-571": "web", "CSCI-572": "web",
  "CSCI-580": "graphics", "CSCI-585": "data", "CSCI-587": "data",
};

// The snapshot contains USC offering facts only. Student progress and the planning
// buckets below are illustrative; they are not USC degree requirements.
export const catalog = CatalogSchema.parse({
  term: snapshot.term,
  major: "Graduate Computer Science · selected USC offerings",
  catalogYear: "Spring 2027 snapshot; example goals",
  sourceDate: snapshot.retrievedAt,
  notice: `These 15 graduate CSCI offerings and published sections are cached from USC's Spring 2027 Schedule of Classes (${snapshot.retrievedAt}). Planning goals are illustrative. The example defaults to two four-unit courses in line with USC's MS guide; confirm your own registration limit. Syllabi are dated historical USC sources or labeled mock documents, not Spring 2027 grading policies. Confirm TBA times and eligibility with USC.`,
  completedOptions: ["CSCI-350", "CSCI-353", "CSCI-402", "EE-450", "CSCI-530", "CSCI-531", "CSCI-544", "CSCI-545", "CSCI-546", "CSCI-551", "CSCI-561", "CSCI-566", "CSCI-567", "CSCI-570", "CSCI-571", "CSCI-572", "CSCI-580", "CSCI-585", "CSCI-587"],
  courses: snapshot.courses.map((course) => {
    const requirement = category[course.id];
    if (!requirement) throw new Error(`Uncategorized USC course ${course.id}`);
    const syllabus = syllabi[course.id];
    if (!syllabus) throw new Error(`Missing syllabus for ${course.id}`);
    return {
      id: course.id, code: course.code, title: course.title, units: course.units,
      requirement, description: course.description, prerequisiteGroups: course.prerequisiteGroups,
      sections: course.sections.map((section) => ({
        id: section.id, componentIds: section.componentIds, instructor: section.instructor,
        meetings: section.meetings.map(examSlot), unknownScheduleComponents: section.unknownScheduleComponents.map((u) => u.replace(/^Quiz\b/, "Exam")),
        eligibility: section.eligibility, syllabusUrl: section.syllabusUrl,
      })),
      syllabus,
      color: color[requirement], sourceUrl: course.sourceUrl,
    };
  }),
  requirements: [
    { id: "algorithms", title: "Algorithms goal", description: "Illustrative graduate plan: include CSCI 570. This is not a degree audit rule.", needed: 1, courseIds: ["CSCI-570"] },
    { id: "ai", title: "AI or NLP goal", description: "Illustrative goal: choose CSCI 544, 561, 566, or 567.", needed: 1, courseIds: ["CSCI-544", "CSCI-561", "CSCI-566", "CSCI-567"] },
    { id: "web", title: "Web or search goal", description: "Illustrative goal: choose CSCI 571 or CSCI 572.", needed: 1, courseIds: ["CSCI-571", "CSCI-572"] },
    { id: "systems", title: "Systems or networking goal", description: "Optional illustrative goal: choose CSCI 546 or CSCI 551.", needed: 1, courseIds: ["CSCI-546", "CSCI-551"] },
    { id: "data", title: "Data systems goal", description: "Optional illustrative goal: choose CSCI 585 or CSCI 587.", needed: 1, courseIds: ["CSCI-585", "CSCI-587"] },
    { id: "security", title: "Security goal", description: "Optional illustrative goal: choose CSCI 530 or CSCI 531.", needed: 1, courseIds: ["CSCI-530", "CSCI-531"] },
    { id: "robotics", title: "Robotics goal", description: "Optional illustrative goal: include CSCI 545.", needed: 1, courseIds: ["CSCI-545"] },
    { id: "graphics", title: "Graphics goal", description: "Optional illustrative goal: include CSCI 580.", needed: 1, courseIds: ["CSCI-580"] },
  ],
  defaultInput: {
    completedCourses: [],
    requirementIds: ["algorithms", "web"], minUnits: 8, maxUnits: 8,
    constraints: [
      { id: "no-friday", label: "Prefer Fridays free", kind: "no_day", hard: false, enabled: true, value: "", days: [4], start: 0, end: 0 },
      { id: "work-hours", label: "Work Tue/Thu · 9 AM–1 PM", kind: "blocked", hard: true, enabled: true, value: "", days: [1, 3], start: 540, end: 780 },
      { id: "later-mornings", label: "Prefer starts after 10 AM", kind: "earliest", hard: false, enabled: true, value: "", days: [], start: 600, end: 0 },
    ],
  },
});

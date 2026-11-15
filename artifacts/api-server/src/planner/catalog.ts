import { GetCatalogResponse as CatalogSchema } from "@workspace/api-zod";
import snapshot from "./usc-spring-2027.json";
import { syllabi } from "./syllabi";

const color: Record<string, string> = {
  algorithms: "#9B641C", web: "#315A8C", systems: "#75528D",
  ai: "#3C755F", data: "#2F7478",
};
const category: Record<string, string> = {
  "CSCI-544": "ai", "CSCI-546": "systems", "CSCI-561": "ai",
  "CSCI-570": "algorithms", "CSCI-571": "web", "CSCI-572": "web",
  "CSCI-585": "data",
};

// The snapshot contains USC offering facts only. Student progress and the planning
// buckets below are illustrative; they are not USC degree requirements.
export const catalog = CatalogSchema.parse({
  term: snapshot.term,
  major: "Graduate Computer Science · selected USC offerings",
  catalogYear: "Spring 2027 snapshot; example goals",
  sourceDate: snapshot.retrievedAt,
  notice: `These seven graduate CSCI offerings and published sections are cached from USC's Spring 2027 Schedule of Classes (${snapshot.retrievedAt}). Planning goals are illustrative. Syllabus details come from clearly dated historical USC PDFs or labeled mock documents; none establishes the Spring 2027 grading policy. Confirm TBA times and registration eligibility with USC.`,
  completedOptions: ["CSCI-530", "CSCI-544", "CSCI-546", "CSCI-561", "CSCI-567", "CSCI-570", "CSCI-571", "CSCI-572", "CSCI-585"],
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
        meetings: section.meetings, unknownScheduleComponents: section.unknownScheduleComponents,
        eligibility: section.eligibility, syllabusUrl: section.syllabusUrl,
      })),
      syllabus,
      color: color[requirement], sourceUrl: course.sourceUrl,
    };
  }),
  requirements: [
    { id: "algorithms", title: "Algorithms goal", description: "Illustrative graduate plan: include CSCI 570. This is not a degree audit rule.", needed: 1, courseIds: ["CSCI-570"] },
    { id: "ai", title: "AI or NLP goal", description: "Illustrative goal: choose CSCI 544 or CSCI 561.", needed: 1, courseIds: ["CSCI-544", "CSCI-561"] },
    { id: "web", title: "Web or search goal", description: "Illustrative goal: choose CSCI 571 or CSCI 572.", needed: 1, courseIds: ["CSCI-571", "CSCI-572"] },
    { id: "systems", title: "Distributed systems goal", description: "Optional illustrative goal: include CSCI 546.", needed: 1, courseIds: ["CSCI-546"] },
    { id: "data", title: "Database goal", description: "Optional illustrative goal: include CSCI 585.", needed: 1, courseIds: ["CSCI-585"] },
  ],
  defaultInput: {
    completedCourses: [],
    requirementIds: ["algorithms", "ai", "web"], minUnits: 12, maxUnits: 12,
    constraints: [
      { id: "no-friday", label: "Prefer Fridays free", kind: "no_day", hard: false, enabled: true, value: "", days: [4], start: 0, end: 0 },
      { id: "work-hours", label: "Work Tue/Thu · 9 AM–1 PM", kind: "blocked", hard: true, enabled: true, value: "", days: [1, 3], start: 540, end: 780 },
      { id: "later-mornings", label: "Prefer starts after 10 AM", kind: "earliest", hard: false, enabled: true, value: "", days: [], start: 600, end: 0 },
    ],
  },
});

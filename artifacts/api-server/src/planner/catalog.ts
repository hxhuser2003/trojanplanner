import { GetCatalogResponse as CatalogSchema } from "@workspace/api-zod";
import snapshot from "./usc-spring-2027.json";

const color: Record<string, string> = {
  algorithms: "#9B641C", software: "#315A8C", systems: "#75528D",
  ai: "#3C755F", foundation: "#2F7478",
};
const category: Record<string, string> = {
  "CSCI-201": "foundation", "CSCI-270": "algorithms", "CSCI-310": "software",
  "CSCI-350": "systems", "CSCI-353": "systems", "CSCI-356": "foundation",
  "CSCI-360": "ai", "CSCI-445": "ai", "CSCI-455": "software",
};

// The snapshot contains USC offering facts only. Student progress and the planning
// buckets below are illustrative; they are not USC degree requirements.
export const catalog = CatalogSchema.parse({
  term: snapshot.term,
  major: "Computer Science · selected USC offerings",
  catalogYear: "Spring 2027 snapshot; planning goals are illustrative",
  sourceDate: snapshot.retrievedAt,
  notice: `Course names, sections, instructors, and published meeting times are cached from the USC Schedule of Classes (${snapshot.retrievedAt}). The student profile and planning goals are illustrative. TBA times, enrollment eligibility, and syllabi require verification in USC's official systems.`,
  completedOptions: ["CSCI-104", "CSCI-114", "CSCI-170", "CSCI-201", "CSCI-270", "CSCI-356", "EE-250", "EE-354", "EE-355"],
  courses: snapshot.courses.map((course) => {
    const requirement = category[course.id];
    if (!requirement) throw new Error(`Uncategorized USC course ${course.id}`);
    return {
      id: course.id, code: course.code, title: course.title, units: course.units,
      requirement, description: course.description, prerequisiteGroups: course.prerequisiteGroups,
      sections: course.sections.map((section) => ({
        id: section.id, componentIds: section.componentIds, instructor: section.instructor,
        meetings: section.meetings, unknownScheduleComponents: section.unknownScheduleComponents,
        eligibility: section.eligibility,
      })),
      syllabus: {
        term: snapshot.term, status: "unknown", examPercent: null, projectPercent: null,
        otherPercent: null, projectMode: "unspecified", cadence: "", attendance: "",
        sourceUrl: course.sections[0]?.syllabusUrl || course.sourceUrl, evidence: [],
      },
      color: color[requirement], sourceUrl: course.sourceUrl,
    };
  }),
  requirements: [
    { id: "algorithms", title: "Algorithms goal", description: "Illustrative goal: include CSCI 270. This is not a degree audit rule.", needed: 1, courseIds: ["CSCI-270"] },
    { id: "software", title: "Software goal", description: "Illustrative goal: choose CSCI 310 or CSCI 455.", needed: 1, courseIds: ["CSCI-310", "CSCI-455"] },
    { id: "ai", title: "AI or robotics goal", description: "Illustrative goal: choose CSCI 360 or CSCI 445.", needed: 1, courseIds: ["CSCI-360", "CSCI-445"] },
    { id: "systems", title: "Systems goal", description: "Optional illustrative goal: choose CSCI 350 or CSCI 353.", needed: 1, courseIds: ["CSCI-350", "CSCI-353"] },
    { id: "foundation", title: "Foundation goal", description: "Optional illustrative goal: choose CSCI 201 or CSCI 356.", needed: 1, courseIds: ["CSCI-201", "CSCI-356"] },
  ],
  defaultInput: {
    completedCourses: ["CSCI-104", "CSCI-170", "CSCI-201", "CSCI-356"],
    requirementIds: ["algorithms", "software", "ai"], minUnits: 12, maxUnits: 16,
    constraints: [
      { id: "no-friday", label: "Keep Fridays free", kind: "no_day", hard: true, enabled: true, value: "", days: [4], start: 0, end: 0 },
      { id: "work-hours", label: "Work Tue/Thu · 2–6 PM", kind: "blocked", hard: true, enabled: true, value: "", days: [1, 3], start: 840, end: 1080 },
      { id: "later-mornings", label: "Prefer starts after 10 AM", kind: "earliest", hard: false, enabled: true, value: "", days: [], start: 600, end: 0 },
    ],
  },
});

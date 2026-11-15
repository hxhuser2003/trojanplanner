import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { SolvePlannerBody, SolvePlannerResponse } from "@workspace/api-zod";
import type { z } from "zod";
import { catalog } from "./catalog";
import { classMinutes, goalsFit } from "./explain";
import { unmetPrerequisiteGroups } from "./prerequisites";

export type PlannerInput = z.infer<typeof SolvePlannerBody>;
export type Constraint = PlannerInput["constraints"][number];
export type Course = typeof catalog.courses[number];
export type Section = Course["sections"][number];
type RawSolution = { selected: [Course, Section][]; score: number };
type WorkerResult = {
  status: "optimal" | "feasible" | "infeasible" | "unknown" | "invalid";
  solutions: RawSolution[];
  repairs: { constraint: Constraint; input: PlannerInput; solution: RawSolution }[];
  conflicts: string[]; elapsedMs: number;
};
const unitText = (min: number, max: number) => min === max ? `${min} units` : `${min}–${max} units`;

/** A unit target that no mix of courses adds up to (every course here is 4 units, so 2 or 10 never work). */
export function unitConflicts(input: PlannerInput): string[] {
  const reasons: string[] = [];
  const open = catalog.courses.filter(c => !input.completedCourses.includes(c.id));
  const sums = open.reduce((acc, c) => new Set([...acc, ...[...acc].map(x => x + c.units)]), new Set([0]));
  if (![...sums].some(x => x >= input.minUnits && x <= input.maxUnits)) {
    const sizes = [...new Set(open.map(c => c.units))].sort((x, y) => x - y).join(" or ");
    reasons.push(`No mix of courses adds up to ${unitText(input.minUnits, input.maxUnits)}: courses here are ${sizes} units each.`);
  }
  return reasons;
}

export function validateInput(input: PlannerInput): string | null {
  if (input.minUnits > input.maxUnits) return "Minimum units cannot exceed maximum units.";
  if (new Set(input.constraints.map(c => c.id)).size !== input.constraints.length) return "Constraint IDs must be unique.";
  if (new Set(input.requirementIds).size !== input.requirementIds.length) return "Requirements must not be duplicated.";
  if (input.requirementIds.some(id => !catalog.requirements.some(r => r.id === id))) return "Unknown requirement.";
  if (input.completedCourses.some(id => !/^[A-Z]{2,8}-\d{3}[A-Z]?$/i.test(id))) return "Use course codes such as CSCI-103.";
  for (const c of input.constraints) {
    if ((c.kind === "require_course" || c.kind === "exclude_course") && !catalog.courses.some(course => course.id === c.value)) return `Unknown course in ${c.label}.`;
    if (c.kind === "lock_section" && !catalog.courses.some(course => course.sections.some(s => s.id === c.value))) return `Unknown section in ${c.label}.`;
    if ((c.kind === "blocked" || c.kind === "no_day") && c.days.length === 0) return `Select at least one weekday for ${c.label}.`;
    if (c.kind === "blocked" && c.start >= c.end) return `End time must be after start time for ${c.label}.`;
    if (c.hard && c.kind.startsWith("prefer_")) return `Assessment and campus-day preferences must be soft: ${c.label}.`;
  }
  return null;
}
export function satisfies(section: Section, constraint: Constraint) {
  return section.meetings.every(m => {
    const applies = constraint.days.length === 0 || constraint.days.includes(m.day);
    if (constraint.kind === "no_day") return !constraint.days.includes(m.day);
    if (constraint.kind === "earliest") return !applies || m.start >= constraint.start;
    if (constraint.kind === "latest") return !applies || m.end <= constraint.end;
    if (constraint.kind === "blocked") return !applies || m.end <= constraint.start || m.start >= constraint.end;
    return true;
  });
}
// Separate TypeScript validator does not trust Python's course or meeting payload.
function validateSolution(raw: RawSolution, input: PlannerInput): [Course, Section][] {
  const selected: [Course, Section][] = raw.selected.map(([c, s]) => {
    const course = catalog.courses.find(x => x.id === c.id);
    const section = course?.sections.find(x => x.id === s.id);
    if (!course || !section) throw new Error("Solver returned an unknown selection.");
    return [course, section];
  });
  if (new Set(selected.map(([c]) => c.id)).size !== selected.length) throw new Error("Duplicate course.");
  const completed = new Set(input.completedCourses);
  const units = selected.reduce((sum, [c]) => sum + c.units, 0);
  if (units < input.minUnits || units > input.maxUnits) throw new Error("Unit bounds violated.");
  const meetings = selected.flatMap(([, s]) => s.meetings);
  for (let i = 0; i < meetings.length; i++) {
    const a = meetings[i]!;
    for (const b of meetings.slice(i + 1)) {
      if (a.day === b.day && a.start < b.end && b.start < a.end) throw new Error("Meeting overlap.");
    }
  }
  for (const [c, s] of selected) {
    if (completed.has(c.id) || unmetPrerequisiteGroups(c.prerequisiteGroups, completed).length > 0) throw new Error("Completed course or prerequisite violation.");
    for (const rule of input.constraints.filter(x => x.enabled && x.hard)) {
      if (!satisfies(s, rule)) throw new Error("Hard time constraint violated.");
    }
  }
  if (goalsFit(input)) for (const id of input.requirementIds) {
    const req = catalog.requirements.find(r => r.id === id)!;
    const covered = req.courseIds.filter(c => completed.has(c) || selected.some(([x]) => x.id === c)).length;
    if (covered < req.needed) throw new Error("Requirement missing.");
  }
  for (const rule of input.constraints.filter(x => x.enabled && x.hard)) {
    if (rule.kind === "require_course" && !selected.some(([c]) => c.id === rule.value)) throw new Error("Required course missing.");
    if (rule.kind === "exclude_course" && selected.some(([c]) => c.id === rule.value)) throw new Error("Excluded course selected.");
    if (rule.kind === "lock_section" && !selected.some(([, s]) => s.id === rule.value)) throw new Error("Locked section missing.");
  }
  return selected;
}
function summarize(raw: RawSolution, input: PlannerInput, index = 0) {
  const selected = validateSolution(raw, input);
  const meetings = selected.flatMap(([, s]) => s.meetings);
  let gapMinutes = 0;
  for (let day = 0; day < 5; day++) {
    const list = meetings.filter(m => m.day === day).sort((a, b) => a.start - b.start);
    for (let i = 1; i < list.length; i++) gapMinutes += list[i]!.start - list[i - 1]!.end;
  }
  // Historical tables are displayed, but only labeled mocks contribute assessment counts.
  const known = selected.filter(([c]) => c.syllabus.grading.length > 0);
  const scored = known.filter(([c]) => c.syllabus.status === "synthetic");
  const individual = scored.filter(([c]) => c.syllabus.projectMode === "individual").length;
  const projectHeavy = scored.filter(([c]) => (c.syllabus.projectPercent ?? -1) >= 50).length;
  const examHeavy = scored.filter(([c]) => (c.syllabus.examPercent ?? -1) >= 50).length;
  const quizCourses = scored.filter(([c]) => (c.syllabus.quizPercent ?? 0) > 0).length;
  const attendanceCourses = scored.filter(([c]) => (c.syllabus.attendancePercent ?? 0) > 0).length;
  const midtermCourses = scored.filter(([c]) => c.syllabus.grading.some(i => i.kind === "midterm")).length;
  const finalCourses = scored.filter(([c]) => c.syllabus.grading.some(i => i.kind === "final")).length;
  const days = new Set(meetings.map(m => m.day)).size;
  const earliest = meetings.length ? Math.min(...meetings.map(m => m.start)) : 0;
  return {
    id: createHash("sha256").update(selected.map(([, s]) => s.id).sort().join(",")).digest("hex").slice(0, 16),
    title: index === 0 ? "Best preference fit" : `Alternative ${index}`,
    selections: selected.map(([c, s]) => ({
      courseId: c.id, sectionId: s.id,
      reason: `${catalog.requirements.find(r => r.id === c.requirement)?.title ?? "Additional course"} · ${c.units} units. Published linked meeting times checked.`,
    })),
    units: selected.reduce((sum, [c]) => sum + c.units, 0), campusDays: days,
    classHours: Math.round(classMinutes(meetings) / 60 * 100) / 100,
    gapMinutes, earliestStart: earliest, score: raw.score,
    projectHeavy, examHeavy, individual, quizCourses, attendanceCourses, midtermCourses, finalCourses,
    checks: ["No overlapping published meetings in the loaded data", "All enabled hard constraints respected for published times", "Unit target checked; goals covered as far as the units allow", "Published linked meetings and listed prerequisite groups checked against entered completions"],
    warnings: [
      ...(() => {
        const missed = catalog.requirements.filter(r => input.requirementIds.includes(r.id)
          && r.courseIds.filter(id => input.completedCourses.includes(id) || selected.some(([c]) => c.id === id)).length < r.needed);
        return missed.length ? [`${unitText(input.minUnits, input.maxUnits)} leaves room for only some of your goals; not covered this semester: ${missed.map(r => r.title).join(", ")}.`] : [];
      })(),
      ...(selected.length > 2 ? ["USC's MS student guide says traditional MS students who started in Spring 2020 or later are limited to two four-unit CSCI/DSCI courses per term. Check your individual program and registration eligibility."] : []),
      ...selected.filter(([, s]) => s.unknownScheduleComponents.length > 0).map(([c, s]) => `${c.code}: ${s.unknownScheduleComponents.map(u => u.replace(/ \d{5}\b/, "")).join(", ")}; full conflict check is not possible.`),
      ...(selected.some(([c]) => c.syllabus.status === "historical") ? ["Historical USC syllabi describe past sections and are not used to score assessment preferences; confirm Spring 2027 grading with instructors."] : []),
      ...(selected.some(([c]) => c.syllabus.status === "synthetic") ? ["Some grading tables are illustrative mocks, not published by USC."] : []),
      ...(selected.some(([c]) => c.syllabus.examPercent == null || c.syllabus.projectPercent == null || c.syllabus.otherPercent == null) ? ["Some historical assessment weights are unspecified; absence of evidence does not mean fewer exams or projects."] : [])],
    assessmentSummary: `Mock-based counts only: ${projectHeavy} project-weighted courses (projects ≥50%); ${examHeavy} exam-weighted (exams ≥50%); ${individual} individual-project courses; ${quizCourses} with graded quizzes; ${attendanceCourses} with graded attendance or participation; ${midtermCourses} with a midterm; ${finalCourses} with a final exam. Dated grading tables: ${known.length}/${selected.length}; historical USC sources are viewable separately. No difficulty estimate.`,
  };
}
let activeSolves = 0;
async function worker(input: PlannerInput): Promise<WorkerResult> {
  const local = path.resolve("src/planner/solver.py");
  const script = existsSync(local) ? local : path.resolve("artifacts/api-server/src/planner/solver.py");
  const venvPython = [path.resolve(".venv/Scripts/python.exe"), path.resolve("../../.venv/Scripts/python.exe")].find(existsSync);
  const python = process.env.PYTHON_BIN || venvPython || "python";
  return new Promise((resolve, reject) => {
    const process = spawn(python, [script], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => { process.kill("SIGKILL"); reject(new Error("SOLVER_TIMEOUT")); }, 15000);
    process.stdout.on("data", chunk => {
      stdout += chunk;
      if (stdout.length > 2_000_000) process.kill("SIGKILL");
    });
    process.stderr.on("data", chunk => { stderr += String(chunk).slice(0, 2000); });
    process.on("error", err => { clearTimeout(timeout); reject(err); });
    process.on("close", code => {
      clearTimeout(timeout);
      if (code !== 0) { reject(new Error(`Solver worker unavailable (${code}): ${stderr.slice(0, 300)}`)); return; }
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error("Invalid solver output.")); }
    });
    process.stdin.on("error", () => { /* process close/error supplies the safe response */ });
    process.stdin.end(JSON.stringify({ catalog, input }));
  });
}
type Summary = ReturnType<typeof summarize>;
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const clock = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return `${h % 12 === 0 ? 12 : h % 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h >= 12 ? "pm" : "am"}`;
};
/** Names an alternative by its single biggest advantage over the best schedule, e.g. "Only 2 class days" or "No quizzes". */
type GradeKind = Course["syllabus"]["grading"][number]["kind"];
const ASSESSMENT_LABELS: [{ has: GradeKind[]; maybe: GradeKind[] }, number, string, string][] = [
  [{ has: ["quiz"], maybe: [] }, 18, "No graded quizzes", "Fewer graded quizzes"],
  [{ has: ["attendance", "participation"], maybe: [] }, 18, "No graded attendance", "Less graded attendance"],
  [{ has: ["midterm"], maybe: ["exam"] }, 20, "No midterms", "Fewer midterms"],
  [{ has: ["final"], maybe: ["exam"] }, 20, "No final exams", "Fewer final exams"],
];
/** Courses in a plan that certainly have this kind of assessment, and ones that might (unlabeled exams, no grading table). */
function assessmentCount(plan: Summary, kinds: { has: GradeKind[]; maybe: GradeKind[] }) {
  let yes = 0, maybe = 0;
  for (const sel of plan.selections) {
    const grading = catalog.courses.find(c => c.id === sel.courseId)?.syllabus.grading ?? [];
    if (grading.some(g => kinds.has.includes(g.kind))) yes++;
    else if (!grading.length || grading.some(g => kinds.maybe.includes(g.kind))) maybe++;
  }
  return { yes, maybe };
}

function alternativeTitle(best: Summary, alt: Summary, used: Set<string>): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  // Each candidate is [rough size of the win, label]. Sizes put different units on one scale.
  const wins: [number, string][] = [];
  if (alt.campusDays < best.campusDays) wins.push([(best.campusDays - alt.campusDays) * 30, `Only ${plural(alt.campusDays, "class day")}`]);
  if (alt.earliestStart > best.earliestStart) wins.push([(alt.earliestStart - best.earliestStart) / 3, `No class before ${clock(alt.earliestStart)}`]);
  // Assessment labels are promises, so they come from every course's grading table and are only used when
  // certainly true: an unlabeled "Exam 1" might be a midterm, and a course with no table might have anything.
  for (const [kinds, weight, none, fewer] of ASSESSMENT_LABELS) {
    const a = assessmentCount(alt, kinds), b = assessmentCount(best, kinds);
    if (a.yes + a.maybe === 0) { if (b.yes + b.maybe > 0) wins.push([b.yes * weight + 5, none]); }
    else if (a.yes + a.maybe < b.yes) wins.push([(b.yes - a.yes - a.maybe) * weight, fewer]);
  }
  if (alt.gapMinutes < best.gapMinutes) wins.push([(best.gapMinutes - alt.gapMinutes) / 6, alt.gapMinutes ? "Fewer gaps between classes" : "Back-to-back classes, no gaps"]);
  if (alt.classHours < best.classHours) wins.push([(best.classHours - alt.classHours) * 8, "Less time in class"]);
  if (alt.projectHeavy > best.projectHeavy) wins.push([(alt.projectHeavy - best.projectHeavy) * 15, "More project-based"]);
  if (alt.examHeavy > best.examHeavy) wins.push([(alt.examHeavy - best.examHeavy) * 15, "More exam-based"]);
  if (alt.individual > best.individual) wins.push([(alt.individual - best.individual) * 15, "More solo projects"]);
  if (alt.units < best.units) wins.push([10, `Lighter load · ${alt.units} units`]);
  if (alt.units > best.units) wins.push([10, `More progress · ${alt.units} units`]);
  const pick = wins.sort((a, b) => b[0] - a[0]).find(([, label]) => !used.has(label));
  if (pick) return pick[1];
  // No measurable win: say what changed instead.
  const code = (id: string) => catalog.courses.find(c => c.id === id)?.code ?? id;
  const bestIds = new Set(best.selections.map(s => s.courseId));
  const added = alt.selections.filter(s => !bestIds.has(s.courseId)).map(s => code(s.courseId));
  return added.length ? `Try ${added.join(" + ")}` : "Same courses, other sections";
}

export async function solve(input: PlannerInput) {
  if (activeSolves >= 3) throw new Error("BUSY");
  activeSolves++;
  try {
    const result = await worker(input);
    const schedules = result.solutions.map((s, i) => summarize(s, input, i));
    const seen = new Set<string>();
    for (const [i, s] of schedules.entries()) {
      if (i > 0) s.title = alternativeTitle(schedules[0]!, s, seen);
      while (seen.has(s.title)) s.title = `${s.title} (${i + 1})`;
      seen.add(s.title);
    }
    const repairs = result.repairs.map((r, i) => ({
      id: `repair-${i}`, title: `Allow change: ${r.constraint.label}`,
      explanation: `Disable only “${r.constraint.label}”. All other enabled hard constraints, units, and requirements remain unchanged. This preview was re-solved and independently validated. Approve to apply. No multi-semester graduation effects are verified.`,
      removedConstraintIds: [r.constraint.id], input: r.input, preview: summarize(r.solution, r.input),
    }));
    // The solver's fallback text is vague; when units are the cause, say so in plain numbers.
    const unitReasons = result.status === "infeasible" ? unitConflicts(input) : [];
    const conflicts = unitReasons.length ? [...unitReasons, ...result.conflicts.filter(c => !c.startsWith("Your unit target, completed courses"))] : result.conflicts;
    return SolvePlannerResponse.parse({
      status: result.status, engine: "Google OR-Tools CP-SAT + independent validator",
      elapsedMs: result.elapsedMs, schedules, repairs, conflicts,
      message: result.status === "infeasible"
        ? "No schedule satisfies all confirmed constraints in the cached USC subset. This is a sufficient conflict explanation, not a guaranteed smallest conflict."
        : result.status === "unknown" ? "Search ended without establishing a solution or impossibility. Your constraints were not changed."
        : result.status === "invalid" ? "The solver rejected the model. No schedule has been accepted."
        : `${schedules.length} distinct schedule${schedules.length === 1 ? "" : "s"} validated against the loaded data. ${result.status === "optimal" ? "First result is optimal for the modeled preference score." : "A feasible result was found; optimality was not proven."}`,
    });
  } finally { activeSolves--; }
}

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { SolvePlannerBody, SolvePlannerResponse } from "@workspace/api-zod";
import type { z } from "zod";
import { catalog } from "./catalog";

export type PlannerInput = z.infer<typeof SolvePlannerBody>;
type Constraint = PlannerInput["constraints"][number];
type Course = typeof catalog.courses[number];
type Section = Course["sections"][number];
type RawSolution = { selected: [Course, Section][]; score: number };
type WorkerResult = {
  status: "optimal" | "feasible" | "infeasible" | "unknown" | "invalid";
  solutions: RawSolution[];
  repairs: { constraint: Constraint; input: PlannerInput; solution: RawSolution }[];
  conflicts: string[]; elapsedMs: number;
};
export function validateInput(input: PlannerInput): string | null {
  if (input.minUnits > input.maxUnits) return "Minimum units cannot exceed maximum units.";
  if (new Set(input.constraints.map(c => c.id)).size !== input.constraints.length) return "Constraint IDs must be unique.";
  if (new Set(input.requirementIds).size !== input.requirementIds.length) return "Requirements must not be duplicated.";
  if (input.requirementIds.some(id => !catalog.requirements.some(r => r.id === id))) return "Unknown requirement.";
  if (input.completedCourses.some(id => !/^[A-Z]{2,8}-\d{3}[A-Z]?$/i.test(id))) return "Use course codes such as CSCI-103.";
  for (const c of input.constraints) {
    if (c.kind === "require_course" && !catalog.courses.some(course => course.id === c.value)) return `Unknown course in ${c.label}.`;
    if (c.kind === "lock_section" && !catalog.courses.some(course => course.sections.some(s => s.id === c.value))) return `Unknown section in ${c.label}.`;
    if ((c.kind === "blocked" || c.kind === "no_day") && c.days.length === 0) return `Select at least one weekday for ${c.label}.`;
    if (c.kind === "blocked" && c.start >= c.end) return `End time must be after start time for ${c.label}.`;
    if (c.hard && c.kind.startsWith("prefer_")) return `Assessment and campus-day preferences must be soft: ${c.label}.`;
  }
  return null;
}
function satisfies(section: Section, constraint: Constraint) {
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
    if (completed.has(c.id) || !c.prerequisiteGroups.every(group => group.some(option => completed.has(option)))) throw new Error("Completed course or prerequisite violation.");
    for (const rule of input.constraints.filter(x => x.enabled && x.hard)) {
      if (!satisfies(s, rule)) throw new Error("Hard time constraint violated.");
    }
  }
  for (const rule of input.constraints.filter(x => x.enabled && x.hard)) {
    if (rule.kind === "require_course" && !selected.some(([c]) => c.id === rule.value)) throw new Error("Required course missing.");
    if (rule.kind === "lock_section" && !selected.some(([, s]) => s.id === rule.value)) throw new Error("Locked section missing.");
  }
  for (const id of input.requirementIds) {
    const req = catalog.requirements.find(r => r.id === id)!;
    const covered = req.courseIds.filter(c => completed.has(c) || selected.some(([x]) => x.id === c)).length;
    if (covered < req.needed) throw new Error("Requirement missing.");
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
  const mock = selected.filter(([c]) => c.syllabus.status === "synthetic");
  const individual = mock.filter(([c]) => c.syllabus.projectMode === "individual").length;
  const projectHeavy = mock.filter(([c]) => (c.syllabus.projectPercent ?? -1) >= 50).length;
  const days = new Set(meetings.map(m => m.day)).size;
  const earliest = meetings.length ? Math.min(...meetings.map(m => m.start)) : 0;
  return {
    id: createHash("sha256").update(selected.map(([, s]) => s.id).sort().join(",")).digest("hex").slice(0, 16),
    title: index === 0 ? "Best preference fit" : `${days} campus days · alternative ${index}`,
    selections: selected.map(([c, s]) => ({
      courseId: c.id, sectionId: s.id,
      reason: `${catalog.requirements.find(r => r.id === c.requirement)?.title ?? "Additional course"} · ${c.units} units. Published linked meeting times checked. ${c.syllabus.examPercent == null || c.syllabus.projectPercent == null ? `Assessment weights are partly or fully unknown in the ${c.syllabus.status === "synthetic" ? "mock" : `historical ${c.syllabus.term}`} source; verify current policy.` : `${c.syllabus.projectPercent}% projects, ${c.syllabus.examPercent}% exams (${c.syllabus.status === "synthetic" ? "illustrative mock" : `historical ${c.syllabus.term}`}; verify current policy).`}`,
    })),
    units: selected.reduce((sum, [c]) => sum + c.units, 0), campusDays: days,
    classHours: Math.round(meetings.reduce((sum, m) => sum + m.end - m.start, 0) / 6) / 10,
    gapMinutes, earliestStart: earliest, score: raw.score,
    checks: ["No overlapping published meetings in the loaded data", "All enabled hard constraints respected for published times", "Unit bounds and selected illustrative goals checked", "Published linked meetings and listed prerequisite groups checked against entered completions"],
    warnings: ["USC offerings are a cached snapshot; recheck the Schedule of Classes before registration.", "Planning goals and completed courses are illustrative, not an official degree audit. Seat availability, restrictions, and actual prerequisite clearance remain unverified.",
      ...(selected.length > 2 ? ["USC's MS student guide says traditional MS students who started in Spring 2020 or later are limited to two four-unit CSCI/DSCI courses per term. Check your individual program and registration eligibility."] : []),
      ...selected.filter(([, s]) => s.unknownScheduleComponents.length > 0).map(([c, s]) => `${c.code} §${s.id}: ${s.unknownScheduleComponents.join(", ")}; full conflict check is not possible.`),
      ...(selected.some(([c]) => c.syllabus.status === "historical") ? ["Historical USC syllabi describe past sections and are not used to score assessment preferences; confirm current grading with instructors."] : []),
      ...(mock.length > 0 ? ["Mock syllabi are hypothetical and are used only for illustrative assessment preferences."] : []),
      ...(selected.some(([c]) => c.syllabus.examPercent == null || c.syllabus.projectPercent == null || c.syllabus.otherPercent == null) ? ["Some historical assessment weights are unspecified; absence of evidence does not mean fewer exams or projects."] : [])],
    assessmentSummary: `${projectHeavy} project-weighted and ${individual} individual-project courses based on mock syllabi only. Mock coverage: ${mock.length}/${selected.length}; historical USC syllabus sources are viewable separately. No difficulty estimate.`,
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
export async function solve(input: PlannerInput) {
  if (activeSolves >= 3) throw new Error("BUSY");
  activeSolves++;
  try {
    const result = await worker(input);
    const schedules = result.solutions.map((s, i) => summarize(s, input, i));
    const repairs = result.repairs.map((r, i) => ({
      id: `repair-${i}`, title: `Allow change: ${r.constraint.label}`,
      explanation: `Disable only “${r.constraint.label}”. All other enabled hard constraints, units, and requirements remain unchanged. This preview was re-solved and independently validated. Approve to apply. No multi-semester graduation effects are verified.`,
      removedConstraintIds: [r.constraint.id], input: r.input, preview: summarize(r.solution, r.input),
    }));
    return SolvePlannerResponse.parse({
      status: result.status, engine: "Google OR-Tools CP-SAT + independent validator",
      elapsedMs: result.elapsedMs, schedules, repairs, conflicts: result.conflicts,
      message: result.status === "infeasible"
        ? "No schedule satisfies all confirmed constraints in the cached USC subset. This is a sufficient conflict explanation, not a guaranteed smallest conflict."
        : result.status === "unknown" ? "Search ended without establishing a solution or impossibility. Your constraints were not changed."
        : result.status === "invalid" ? "The solver rejected the model. No schedule has been accepted."
        : `${schedules.length} distinct schedule${schedules.length === 1 ? "" : "s"} validated against the loaded data. ${result.status === "optimal" ? "First result is optimal for the modeled preference score." : "A feasible result was found; optimality was not proven."}`,
    });
  } finally { activeSolves--; }
}

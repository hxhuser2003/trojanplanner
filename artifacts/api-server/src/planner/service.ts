import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { SolvePlannerBody, SolvePlannerResponse } from "@workspace/api-zod";
import type { z } from "zod";
import { catalog } from "./catalog";

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
    if (completed.has(c.id) || c.prerequisites.some(p => !completed.has(p))) throw new Error("Completed course or prerequisite violation.");
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
  const known = selected.filter(([c]) => c.syllabus.status === "synthetic");
  const individual = known.filter(([c]) => c.syllabus.projectMode === "individual").length;
  const projectHeavy = known.filter(([c]) => (c.syllabus.projectPercent ?? -1) >= 50).length;
  const examHeavy = known.filter(([c]) => (c.syllabus.examPercent ?? -1) >= 50).length;
  const days = new Set(meetings.map(m => m.day)).size;
  const earliest = meetings.length ? Math.min(...meetings.map(m => m.start)) : 0;
  return {
    id: createHash("sha256").update(selected.map(([, s]) => s.id).sort().join(",")).digest("hex").slice(0, 16),
    title: index === 0 ? "Best preference fit" : `Alternative ${index}`,
    selections: selected.map(([c, s]) => ({
      courseId: c.id, sectionId: s.id,
      reason: `${catalog.requirements.find(r => r.id === c.requirement)?.title ?? "Additional course"} · ${c.units} units. All linked meetings included. ${c.syllabus.status === "unknown" ? "Assessment information not specified." : `${c.syllabus.projectPercent}% projects, ${c.syllabus.examPercent}% exams (synthetic).`}`,
    })),
    units: selected.reduce((sum, [c]) => sum + c.units, 0), campusDays: days,
    classHours: Math.round(meetings.reduce((sum, m) => sum + m.end - m.start, 0) / 6) / 10,
    gapMinutes, earliestStart: earliest, score: raw.score,
    checks: ["No overlapping meetings in the loaded data", "All enabled hard constraints respected", "Unit bounds and selected illustrative requirements checked", "Linked meetings and known prerequisites checked"],
    warnings: ["Synthetic data only—not an official degree audit.", "Seat availability, restrictions, real prerequisites, and current USC degree eligibility remain unverified.",
      ...(known.length < selected.length ? ["Some syllabi are missing; absence of evidence does not mean fewer exams or projects."] : [])],
    assessmentSummary: `${projectHeavy} project-weighted courses (projects ≥50%); ${examHeavy} exam-weighted (exams ≥50%); ${individual} individual-project courses. Evidence coverage: ${known.length}/${selected.length}. No difficulty estimate.`,
  };
}
let activeSolves = 0;
async function worker(input: PlannerInput): Promise<WorkerResult> {
  const local = path.resolve("src/planner/solver.py");
  const script = existsSync(local) ? local : path.resolve("artifacts/api-server/src/planner/solver.py");
  return new Promise((resolve, reject) => {
    const process = spawn("python", [script], { stdio: ["pipe", "pipe", "pipe"] });
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
/** Names an alternative by what differs from the best schedule, e.g. "With CSCI 202 instead of CSCI 201 · Starts 1pm". */
function alternativeTitle(best: Summary, alt: Summary): string {
  const code = (id: string) => catalog.courses.find(c => c.id === id)?.code ?? id;
  const bestIds = new Set(best.selections.map(s => s.courseId));
  const altIds = new Set(alt.selections.map(s => s.courseId));
  const added = alt.selections.filter(s => !bestIds.has(s.courseId)).map(s => code(s.courseId));
  const dropped = best.selections.filter(s => !altIds.has(s.courseId)).map(s => code(s.courseId));
  const parts: string[] = [];
  if (added.length === 1 && dropped.length === 1) parts.push(`With ${added[0]} instead of ${dropped[0]}`);
  else if (added.length) parts.push(`With ${added.join(" + ")}`);
  else if (dropped.length) parts.push(`Without ${dropped.join(" + ")}`);
  else {
    // Same courses, different sections: name each course whose section changed (at most two).
    const moved = alt.selections.filter(s => best.selections.find(b => b.courseId === s.courseId)?.sectionId !== s.sectionId).flatMap(s => {
      const section = catalog.courses.find(c => c.id === s.courseId)?.sections.find(x => x.id === s.sectionId);
      return section ? [`${code(s.courseId)} on ${[...new Set(section.meetings.map(m => m.day))].sort().map(d => DAY_NAMES[d]).join("/")}`] : [];
    });
    if (moved.length) parts.push(moved.slice(0, 2).join(", "));
  }
  // Add the clearest advantage over the best option, if any.
  if (alt.campusDays < best.campusDays) parts.push(`${alt.campusDays} campus days`);
  else if (alt.earliestStart > best.earliestStart) parts.push(`Starts ${clock(alt.earliestStart)}`);
  else if (alt.gapMinutes < best.gapMinutes) parts.push("Fewer gaps");
  else if (alt.units !== best.units) parts.push(`${alt.units} units`);
  return parts.slice(0, 2).join(" · ") || alt.title;
}

export async function solve(input: PlannerInput) {
  if (activeSolves >= 3) throw new Error("BUSY");
  activeSolves++;
  try {
    const result = await worker(input);
    const schedules = result.solutions.map((s, i) => summarize(s, input, i));
    const seen = new Set<string>();
    for (const [i, s] of schedules.entries()) {
      if (i > 0) s.title = alternativeTitle(schedules[0]!, s);
      while (seen.has(s.title)) s.title = `${s.title} (${i + 1})`;
      seen.add(s.title);
    }
    const repairs = result.repairs.map((r, i) => ({
      id: `repair-${i}`, title: `Allow change: ${r.constraint.label}`,
      explanation: `Disable only “${r.constraint.label}”. All other enabled hard constraints, units, and requirements remain unchanged. This preview was re-solved and independently validated. Approve to apply. No multi-semester graduation effects are verified.`,
      removedConstraintIds: [r.constraint.id], input: r.input, preview: summarize(r.solution, r.input),
    }));
    return SolvePlannerResponse.parse({
      status: result.status, engine: "Google OR-Tools CP-SAT + independent validator",
      elapsedMs: result.elapsedMs, schedules, repairs, conflicts: result.conflicts,
      message: result.status === "infeasible"
        ? "No schedule satisfies all confirmed constraints in this synthetic dataset. This is a sufficient conflict explanation, not a guaranteed smallest conflict."
        : result.status === "unknown" ? "Search ended without establishing a solution or impossibility. Your constraints were not changed."
        : result.status === "invalid" ? "The solver rejected the model. No schedule has been accepted."
        : `${schedules.length} distinct schedule${schedules.length === 1 ? "" : "s"} validated against the loaded data. ${result.status === "optimal" ? "First result is optimal for the modeled preference score." : "A feasible result was found; optimality was not proven."}`,
    });
  } finally { activeSolves--; }
}

// Chat requests that are answered from data rather than by the model:
// degree progress, locking a section in the current plan, and switching schedule options.
// Each returns null when the message is not that kind of request.
import { catalog } from "./catalog";
import { fmt } from "./explain";
import type { Constraint, PlannerInput } from "./service";

type Ref = { courseId: string; sectionId: string };
type Option = { id: string; title: string; units: number; campusDays: number; classHours: number; earliestStart: number; gapMinutes: number };
type Reply = { kind: "answer" | "rules" | "select"; message: string; proposedConstraints?: Constraint[]; removeConstraintIds?: string[]; selectScheduleId?: string; warnings?: string[] };

const mentions = (message: string, courseId: string) => new RegExp(`\\b${courseId.replace("-", "[- ]?")}\\b`, "i").test(message);
const isDone = (input: PlannerInput, id: string) => input.completedCourses.includes(id);
const code = (id: string) => catalog.courses.find(c => c.id === id)?.code ?? id;

export function progressIntent(message: string, input: PlannerInput, selections: Ref[]): Reply | null {
  if (!/\b(still need|what.{0,20}\bneed\b|left to (take|do|complete)|remaining (requirements|courses)|requirements? (left|remaining)|degree progress|my progress|on track)\b/i.test(message)) return null;
  const planned = new Map(selections.map(s => [s.courseId, s.sectionId]));
  const lines = catalog.requirements.map(req => {
    const done = req.courseIds.filter(id => input.completedCourses.includes(id));
    const inPlan = req.courseIds.filter(id => planned.has(id));
    if (done.length >= req.needed) return `✓ ${req.title}: done (${done.map(code).join(", ")} completed)`;
    if (done.length + inPlan.length >= req.needed) return `◐ ${req.title}: in this plan (${inPlan.map(id => `${code(id)} §${planned.get(id)}`).join(", ")})`;
    const options = req.courseIds.filter(id => !input.completedCourses.includes(id)).map(code);
    const targeted = input.requirementIds.includes(req.id);
    return `✗ ${req.title}: still needed${targeted ? "" : " (not a goal this semester)"}. Options: ${options.join(", ") || "none in the loaded catalog"}`;
  });
  const units = selections.reduce((n, s) => n + (catalog.courses.find(c => c.id === s.courseId)?.units ?? 0), 0);
  return {
    kind: "answer",
    message: `Here is where you stand under the loaded ${catalog.major} rules:\n\n${lines.join("\n")}\n\nThis plan has ${units} units (your range is ${input.minUnits}–${input.maxUnits}). Change goals and completed courses on the Degree page.`,
    warnings: ["Computed from the demo catalog's illustrative rules. This is not an official degree audit."],
  };
}

export function lockIntent(message: string, current: PlannerInput, selections: Ref[]): Reply | null {
  if (!/\b(keep|lock|don'?t (move|change)|leave)\b/i.test(message)) return null;
  const targets = selections.filter(s => mentions(message, s.courseId));
  if (!targets.length) return null;
  const locked = new Set(current.constraints.filter(c => c.kind === "lock_section" && c.enabled).map(c => c.value));
  const fresh = targets.filter(t => !locked.has(t.sectionId));
  if (!fresh.length) return { kind: "answer", message: `${targets.map(t => `${code(t.courseId)} §${t.sectionId}`).join(" and ")} ${targets.length > 1 ? "are" : "is"} already locked.` };
  return {
    kind: "rules",
    message: `I can lock ${fresh.map(t => `${code(t.courseId)} §${t.sectionId}`).join(" and ")} so the solver keeps ${fresh.length > 1 ? "them" : "it"} when you change other rules.`,
    proposedConstraints: fresh.map(t => ({
      id: `lock-${t.sectionId}-${Date.now().toString(36)}`, label: `Keep ${code(t.courseId)} §${t.sectionId}`, kind: "lock_section" as const,
      hard: true, enabled: true, value: t.sectionId, days: [], start: 0, end: 0,
    })),
  };
}

export function excludeIntent(message: string, current: PlannerInput): Reply | null {
  if (!/\b(don'?t|do not|never|won'?t|wouldn'?t) (want to |wanna |like to )?(take|do|have)\b|\b(exclude|skip|drop|remove|avoid|no more|without)\b/i.test(message)) return null;
  // Questions ("why don't I have X?") and edits to existing rules go to the other handlers.
  if (/^\s*(why|what|how|does|do|is|are|which|when)\b/i.test(message) || /\brules?\b/i.test(message)) return null;
  const targets = catalog.courses.filter(c => mentions(message, c.id));
  if (!targets.length) return null;
  const fresh = targets.filter(t => !current.constraints.some(c => c.enabled && c.hard && c.kind === "exclude_course" && c.value === t.id));
  if (!fresh.length) return { kind: "answer", message: `${targets.map(t => t.code).join(" and ")} ${targets.length > 1 ? "are" : "is"} already excluded.` };
  // A "Take X" rule (or an old soft exclusion) for the same course is replaced in the same step.
  const replaced = current.constraints.filter(c => (c.kind === "require_course" || c.kind === "exclude_course") && fresh.some(t => t.id === c.value));
  // Flag goal requirements that would be left with no course to fill them.
  const out = new Set([...fresh.map(t => t.id), ...current.constraints.filter(c => c.enabled && c.hard && c.kind === "exclude_course").map(c => c.value)]);
  const stuck = catalog.requirements.filter(r => current.requirementIds.includes(r.id) && fresh.some(t => r.courseIds.includes(t.id))
    && r.courseIds.filter(id => isDone(current, id) || !out.has(id)).length < r.needed);
  return {
    kind: "rules",
    message: `I can keep ${fresh.map(t => t.code).join(" and ")} out of your plan. ${stuck.length
      ? `That leaves no course for “${stuck.map(r => r.title).join("”, “")}”, so the solver will report a conflict unless you drop that goal on the Degree page.`
      : "The solver will pick another course if one fits your other rules."}`,
    proposedConstraints: fresh.map(t => ({
      id: `excl-${t.id}-${Date.now().toString(36)}`, label: `Don't take ${t.code}`, kind: "exclude_course" as const,
      hard: true, enabled: true, value: t.id, days: [], start: 0, end: 0,
    })),
    removeConstraintIds: replaced.map(c => c.id),
  };
}

const METRICS: { pattern: RegExp; pick: (o: Option) => number; best: "min" | "max"; describe: (o: Option) => string }[] = [
  { pattern: /\b(fewe(r|st)|less|least|min(imum)?) (campus )?days\b|\bcompress/i, pick: o => o.campusDays, best: "min", describe: o => `${o.campusDays} campus days` },
  { pattern: /\b(later|latest) (start|morning)|\bstarts? later\b|\bsleep in\b|\bno early\b/i, pick: o => o.earliestStart, best: "max", describe: o => `first class at ${fmt(o.earliestStart)}` },
  { pattern: /\b(fewe(r|st)|less|least|no|smallest) gaps?\b|\bcompact\b/i, pick: o => o.gapMinutes, best: "min", describe: o => `${o.gapMinutes} min of gaps` },
  { pattern: /\b(fewe(r|st)|less|least) (class )?(hours|time in class)\b/i, pick: o => o.classHours, best: "min", describe: o => `${o.classHours.toFixed(1)} class hours` },
  { pattern: /\b(more|most) units\b/i, pick: o => o.units, best: "max", describe: o => `${o.units} units` },
  { pattern: /\b(fewe(r|st)|less|least) units\b/i, pick: o => o.units, best: "min", describe: o => `${o.units} units` },
];

export function selectIntent(message: string, options: Option[], chosenId: string | undefined): Reply | null {
  if (options.length < 2 || !/\b(show|switch|pick|choose|go with|use|which|option|one with|the one)\b/i.test(message)) return null;
  const metric = METRICS.find(m => m.pattern.test(message));
  if (!metric) return null;
  const sorted = [...options].sort((a, b) => metric.best === "min" ? metric.pick(a) - metric.pick(b) : metric.pick(b) - metric.pick(a));
  const top = sorted[0]!;
  const chosen = options.find(o => o.id === chosenId) ?? options[0]!;
  // Prefer staying put on a tie, so the student is not moved for nothing.
  if (metric.pick(chosen) === metric.pick(top)) {
    return { kind: "answer", message: `The option you're viewing ("${chosen.title}") already has the best value here: ${metric.describe(chosen)}.` };
  }
  return {
    kind: "select", selectScheduleId: top.id,
    message: `"${top.title}" has ${metric.describe(top)}, compared with ${metric.describe(chosen)} in the option you're viewing. Its other numbers: ${top.units} units, ${top.campusDays} campus days, first class ${fmt(top.earliestStart)}.`,
  };
}

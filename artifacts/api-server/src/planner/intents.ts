// Chat requests that are answered from data rather than by the model:
// degree progress, locking a section in the current plan, and switching schedule options.
// Each returns null when the message is not that kind of request.
import { catalog } from "./catalog";
import { fmt, hoursText, meetingText } from "./explain";
import type { Constraint, PlannerInput } from "./service";

type Ref = { courseId: string; sectionId: string };
type Option = { id: string; title: string; units: number; campusDays: number; classHours: number; earliestStart: number; gapMinutes: number };
type Citation = { courseId: string; label: string; excerpt: string; sourceUrl: string };
type Reply = { kind: "answer" | "rules" | "select"; message: string; proposedConstraints?: Constraint[]; removeConstraintIds?: string[]; selectScheduleId?: string; warnings?: string[]; citations?: Citation[] };

const mentions = (message: string, courseId: string) => new RegExp(`\\b${courseId.replace("-", "[- ]?")}\\b`, "i").test(message);
const isDone = (input: PlannerInput, id: string) => input.completedCourses.includes(id);
const code = (id: string) => catalog.courses.find(c => c.id === id)?.code ?? id;
// Section numbers mean little to students, so sections are named by when they meet.
const sectionText = (t: Ref) => {
  const s = catalog.courses.find(c => c.id === t.courseId)?.sections.find(x => x.id === t.sectionId);
  return s ? `${code(t.courseId)} (${meetingText(s)})` : code(t.courseId);
};
const lectureStart = (t: Ref) => {
  const s = catalog.courses.find(c => c.id === t.courseId)?.sections.find(x => x.id === t.sectionId);
  const m = s?.meetings.find(x => x.kind === "Lecture") ?? s?.meetings[0];
  return m ? ` · ${["Mon", "Tue", "Wed", "Thu", "Fri"][m.day]} ${fmt(m.start)}` : "";
};

export function progressIntent(message: string, input: PlannerInput, selections: Ref[]): Reply | null {
  if (!/\b(still need|what.{0,20}\bneed\b|left to (take|do|complete)|remaining (requirements|courses)|requirements? (left|remaining)|degree progress|my progress|on track|graduat(e|ion))\b/i.test(message)) return null;
  const planned = new Map(selections.map(s => [s.courseId, s.sectionId]));
  // Only goals the student picked, finished, or is taking now; unpicked goals are listed once at the end, not as "still needed".
  const lines: string[] = [];
  const others: string[] = [];
  for (const req of catalog.requirements) {
    const done = req.courseIds.filter(id => input.completedCourses.includes(id));
    const inPlan = req.courseIds.filter(id => planned.has(id));
    const targeted = input.requirementIds.includes(req.id);
    if (done.length >= req.needed) lines.push(`✓ ${req.title}: done (${done.map(code).join(", ")} completed)`);
    else if (done.length + inPlan.length >= req.needed) lines.push(`◐ ${req.title}: in this plan (${inPlan.map(code).join(", ")})`);
    else if (targeted) {
      const options = req.courseIds.filter(id => !input.completedCourses.includes(id)).map(code);
      lines.push(`✗ ${req.title}: not covered by this plan. Options: ${options.join(", ") || "none in the loaded catalog"}`);
    } else others.push(req.title.replace(/ goal$/, ""));
  }
  const units = selections.reduce((n, s) => n + (catalog.courses.find(c => c.id === s.courseId)?.units ?? 0), 0);
  const unitText = input.minUnits === input.maxUnits ? `your target is ${input.minUnits}` : `your range is ${input.minUnits}–${input.maxUnits}`;
  const more = others.length ? `\n\nOther optional goals you can pick on the Degree page: ${others.join(", ")}.` : "";
  return {
    kind: "answer",
    message: `TrojanPlanner tracks the planning goals you picked, not USC's official graduation requirements. Here is where you stand:\n\n${lines.join("\n") || "No goals picked yet."}${more}\n\nThis plan has ${units} units (${unitText}). Update goals and completed courses on the Degree page.`,
    warnings: ["Computed from the demo catalog's illustrative rules. This is not an official degree audit."],
  };
}

export function lockIntent(message: string, current: PlannerInput, selections: Ref[]): Reply | null {
  if (!/\b(keep|lock|don'?t (move|change)|leave)\b/i.test(message)) return null;
  const targets = selections.filter(s => mentions(message, s.courseId));
  if (!targets.length) return null;
  const locked = new Set(current.constraints.filter(c => c.kind === "lock_section" && c.enabled).map(c => c.value));
  const fresh = targets.filter(t => !locked.has(t.sectionId));
  if (!fresh.length) return { kind: "answer", message: `${targets.map(sectionText).join(" and ")} ${targets.length > 1 ? "are" : "is"} already locked.` };
  return {
    kind: "rules",
    message: `I can lock ${fresh.map(sectionText).join(" and ")} so the solver keeps ${fresh.length > 1 ? "them" : "it"} when you change other rules.`,
    proposedConstraints: fresh.map(t => ({
      id: `lock-${t.sectionId}-${Date.now().toString(36)}`, label: `Keep ${code(t.courseId)}${lectureStart(t)}`, kind: "lock_section" as const,
      hard: true, enabled: true, value: t.sectionId, days: [], start: 0, end: 0,
    })),
  };
}

type GradeKind = "midterm" | "final" | "quiz" | "attendance" | "participation" | "homework";
const TOPICS: [GradeKind, RegExp, string][] = [
  ["midterm", /\bmid-?terms?\b/i, "a midterm"], ["final", /\bfinals?( exams?)?\b/i, "a final exam"], ["quiz", /\bquiz(zes)?\b/i, "graded quizzes"],
  ["attendance", /\battendance\b/i, "graded attendance"], ["participation", /\bparticipation\b/i, "graded participation"], ["homework", /\bhomeworks?\b/i, "graded homework"],
];

/** "Which of my classes have a midterm?", "When is the CSCI 561 final?", "How is CSCI 570 graded?" — answered from grading tables. */
export function gradingIntent(message: string, selections: Ref[]): Reply | null {
  // Only questions; "I don't want midterms" is a preference and goes to the rule handlers.
  if (/\b(want|avoid|prefer|hate|rather|don'?t like|no more)\b/i.test(message)) return null;
  if (!/\?\s*$/.test(message) && !/^\s*(which|what|when|does|do|is|are|how|list|show|any)\b/i.test(message)) return null;
  const topics = TOPICS.filter(([, re]) => re.test(message));
  const breakdown = /\b(grad(ed|ing)|grade breakdown|breakdown|weights?|weighted)\b/i.test(message);
  if (!topics.length && !breakdown) return null;
  const named = catalog.courses.filter(c => mentions(message, c.id));
  const courses = named.length ? named : selections.map(s => catalog.courses.find(c => c.id === s.courseId)).filter((c): c is NonNullable<typeof c> => !!c);
  if (!courses.length) return null;
  const scope = named.length ? "" : "in this plan";
  const cite = (c: (typeof courses)[number], label: string) => {
    const e = c.syllabus.evidence.find(x => x.label === label);
    return e ? [{ courseId: c.id, label: e.label, excerpt: e.excerpt, sourceUrl: c.syllabus.sourceUrl }] : [];
  };
  const unknown = courses.filter(c => c.syllabus.status === "unknown" || c.syllabus.grading.length === 0);
  const known = courses.filter(c => c.syllabus.status !== "unknown" && c.syllabus.grading.length > 0);
  const lines: string[] = [];
  const citations: Citation[] = [];
  if (!topics.length) {
    for (const c of known) {
      lines.push(`${c.code}: ${c.syllabus.grading.map(i => `${i.item} ${i.percent}%${i.when ? ` (${i.when})` : ""}`).join(" · ")}`);
      citations.push(...c.syllabus.grading.flatMap(i => cite(c, i.item)));
    }
  }
  for (const [kind, , phrase] of topics) {
    const withIt = known.filter(c => c.syllabus.grading.some(i => i.kind === kind));
    const without = known.filter(c => !withIt.includes(c));
    const bare = phrase.replace(/^an? /, "");
    if (known.length === 1) lines.push(withIt.length ? `${known[0]!.code}'s dated breakdown lists ${phrase}:` : `${known[0]!.code}'s dated breakdown does not list ${bare}.`);
    else if (known.length) lines.push(withIt.length
      ? `${withIt.length} of the ${known.length} dated breakdowns${scope ? ` ${scope}` : ""} list ${phrase}:`
      : `None of the ${known.length} dated breakdowns${scope ? ` ${scope}` : ""} lists ${phrase}.`);
    for (const c of withIt) {
      const items = c.syllabus.grading.filter(i => i.kind === kind);
      lines.push(...items.map(i => `• ${c.code} ${i.item}: ${i.percent}% of the grade${i.when ? `, ${i.when}` : ""}`));
      citations.push(...items.flatMap(i => cite(c, i.item)));
    }
    // "Exam 1 / Exam 2" rows are not labeled midterm or final, so those courses are reported separately.
    const unlabeled = kind === "midterm" || kind === "final" ? without.filter(c => c.syllabus.grading.some(i => i.kind === "exam")) : [];
    for (const c of unlabeled) lines.push(`• ${c.code}: ${c.syllabus.grading.filter(i => i.kind === "exam").map(i => `${i.item} ${i.percent}%`).join(", ")} (not labeled midterm or final in the syllabus)`);
    const none = without.filter(c => !unlabeled.includes(c));
    if (withIt.length && none.length) lines.push(`No ${bare} listed in the dated breakdown: ${none.map(c => c.code).join(", ")}.`);
    // Flag exams that fall in the same week, the usual crunch point.
    if (kind === "midterm") {
      const byWeek = new Map<string, string[]>();
      for (const c of withIt) for (const i of c.syllabus.grading.filter(x => x.kind === "midterm")) {
        const week = i.when?.match(/Week \d+/)?.[0];
        if (week) byWeek.set(week, [...(byWeek.get(week) ?? []), c.code]);
      }
      for (const [week, codes] of byWeek) if (codes.length > 1) lines.push(`Heads-up: ${codes.join(" and ")} both have a midterm in ${week}.`);
    }
  }
  if (unknown.length) lines.push(`${unknown.map(c => c.code).join(", ")}: no grading breakdown on file, so this is unknown (not zero).`);
  return { kind: "answer", message: lines.join("\n"), citations, warnings: ["From past-term USC syllabi or labeled mocks. Check the Spring 2027 syllabus before deciding."] };
}

const AVOIDABLE: [Constraint["kind"], RegExp, string][] = [
  ["prefer_no_midterm", /\bmid-?terms?\b/i, "Avoid midterms"], ["prefer_no_final", /\bfinals?( exams?)?\b/i, "Avoid final exams"],
  ["prefer_no_quizzes", /\bquiz(zes)?\b/i, "Avoid graded quizzes"], ["prefer_no_attendance", /\battendance\b/i, "Avoid graded attendance"],
];

/** "I don't want midterms" / "avoid quizzes and attendance" (no course named) proposes soft assessment rules. */
export function avoidIntent(message: string, current: PlannerInput): Reply | null {
  if (!/\b(don'?t|do not|never|no|avoid|hate|without|rather not|skip)\b/i.test(message) || catalog.courses.some(c => mentions(message, c.id))) return null;
  const hits = AVOIDABLE.filter(([, re]) => re.test(message));
  if (!hits.length) return null;
  const fresh = hits.filter(([kind]) => !current.constraints.some(c => c.enabled && c.kind === kind));
  if (!fresh.length) return { kind: "answer", message: `You already have ${hits.map(([, , l]) => `“${l}”`).join(" and ")} in your rules.` };
  return {
    kind: "rules",
    message: `I can add ${fresh.length > 1 ? "these preferences. They are" : "this preference. It is"} soft: the solver favors courses whose syllabus shows none, but will still pick one if nothing else fits your schedule and requirements.`,
    proposedConstraints: fresh.map(([kind, , label]) => ({
      id: `${kind}-${Date.now().toString(36)}`, label, kind, hard: false, enabled: true, value: "", days: [], start: 0, end: 0,
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
      ? `That leaves no course for “${stuck.map(r => r.title).join("”, “")}”, so the solver will report a conflict.`
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
  { pattern: /\b(fewe(r|st)|less|least) (class )?(hours|time in class)\b/i, pick: o => o.classHours, best: "min", describe: o => `${hoursText(o.classHours)} in class per week` },
  { pattern: /\b(more|most) units\b/i, pick: o => o.units, best: "max", describe: o => `${o.units} units` },
  { pattern: /\b(fewe(r|st)|less|least) units\b/i, pick: o => o.units, best: "min", describe: o => `${o.units} units` },
];

export function selectIntent(message: string, options: Option[], chosenId: string | undefined): Reply | null {
  if (options.length < 2 || !/\b(show|switch|pick|choose|go with|use|which|option|one with|the one)\b/i.test(message)) return null;
  // "the second option", "option 3", or an option's own name ("No midterms").
  const ordinal = message.match(/\b(first|second|third|1st|2nd|3rd)\b|\boption\s*([1-3])\b/i);
  const index = ordinal ? (ordinal[2] ? Number(ordinal[2]) : ["first", "second", "third"].indexOf(ordinal[1]!.toLowerCase().replace(/^(1st|2nd|3rd)$/, m => ({ "1st": "first", "2nd": "second", "3rd": "third" })[m]!)) + 1) - 1 : -1;
  const named = options[index] ?? [...options].sort((a, b) => b.title.length - a.title.length).find(o => message.toLowerCase().includes(o.title.toLowerCase()));
  if (named) {
    if (named.id === (chosenId ?? options[0]!.id)) return { kind: "answer", message: `You're already viewing "${named.title}".` };
    return { kind: "select", selectScheduleId: named.id,
      message: `Switched to "${named.title}": ${named.units} units, ${named.campusDays} campus days, first class ${fmt(named.earliestStart)}.` };
  }
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

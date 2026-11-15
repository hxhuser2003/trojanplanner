// Deterministic explanations. Every sentence is computed from the loaded catalog,
// the student's confirmed rules, and the submitted selections. Nothing is inferred.
import { catalog } from "./catalog";
import { satisfies, type Constraint, type Course, type PlannerInput, type Section } from "./service";

type Ref = { courseId: string; sectionId: string };
type Picked = [Course, Section];

const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const TIME_KINDS = new Set(["no_day", "earliest", "latest", "blocked"]);

export function fmt(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}${h >= 12 ? "pm" : "am"}`;
}
const list = (xs: string[]) => xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function resolveRefs(refs: Ref[]): Picked[] {
  return refs.map(r => {
    const course = catalog.courses.find(c => c.id === r.courseId);
    const section = course?.sections.find(s => s.id === r.sectionId);
    if (!course || !section) throw new Error("UNKNOWN_SELECTION");
    return [course, section] as Picked;
  });
}

export function meetingText(section: Section) {
  const groups = new Map<string, number[]>();
  for (const m of section.meetings) {
    const key = `${fmt(m.start)}–${fmt(m.end)}${m.kind === "Lecture" ? "" : ` (${m.kind})`}`;
    groups.set(key, [...(groups.get(key) ?? []), m.day]);
  }
  return [...groups].map(([time, days]) => `${days.sort().map(d => DAY[d]).join("/")} ${time}`).join("; ");
}

const enabled = (input: PlannerInput) => input.constraints.filter(c => c.enabled);
const hardTime = (input: PlannerInput) => enabled(input).filter(c => c.hard && TIME_KINDS.has(c.kind));
const softTime = (input: PlannerInput) => enabled(input).filter(c => !c.hard && TIME_KINDS.has(c.kind));
const breaks = (section: Section, rules: Constraint[]) => rules.filter(r => !satisfies(section, r)).map(r => r.label);

function overlapDay(a: Section, b: Section): string | null {
  for (const x of a.meetings) for (const y of b.meetings) {
    if (x.day === y.day && x.start < y.end && y.start < x.end) return DAY[x.day]!;
  }
  return null;
}
const daysOf = (sections: Section[]) => new Set(sections.flatMap(s => s.meetings.map(m => m.day)));

function lockedSection(course: Course, input: PlannerInput): string | null {
  const lock = enabled(input).find(c => c.hard && c.kind === "lock_section" && course.sections.some(s => s.id === c.value));
  return lock?.value ?? null;
}

/** Why a section cannot be used at all, independent of the other courses in the plan. */
function sectionBlockers(course: Course, section: Section, input: PlannerInput): string[] {
  const reasons = breaks(section, hardTime(input)).map(l => `breaks “${l}”`);
  const lock = lockedSection(course, input);
  if (lock && lock !== section.id) reasons.push(`you locked §${lock}`);
  return reasons;
}
function courseBlocker(course: Course, input: PlannerInput): string | null {
  if (input.completedCourses.includes(course.id)) return `${course.code} is already in your completed courses`;
  const excluded = enabled(input).find(c => c.hard && c.kind === "exclude_course" && c.value === course.id);
  if (excluded) return `your rule “${excluded.label}” excludes ${course.code}`;
  const missing = course.prerequisites.filter(p => !input.completedCourses.includes(p));
  if (missing.length) return `${course.code} needs ${list(missing)} first`;
  return null;
}

function assessmentFacts(course: Course, input: PlannerInput): string[] {
  const prefs = enabled(input).filter(c => c.kind === "prefer_projects" || c.kind === "prefer_exams" || c.kind === "prefer_individual" || c.kind === "prefer_less_frequent" || c.kind === "prefer_no_quizzes" || c.kind === "prefer_no_attendance");
  if (!prefs.length) return [];
  const s = course.syllabus;
  if (s.status !== "synthetic") return [`No syllabus evidence for ${course.code}, so ${list(prefs.map(p => `“${p.label}”`))} could not be credited. Unknown is not zero.`];
  const out: string[] = [];
  for (const p of prefs) {
    if (p.kind === "prefer_projects") out.push(`${course.code} weights projects ${s.projectPercent}% and exams ${s.examPercent}% (synthetic syllabus)${(s.projectPercent ?? 0) >= 50 ? ", which matches “" + p.label + "”" : ""}.`);
    if (p.kind === "prefer_exams") out.push(`${course.code} weights exams ${s.examPercent}% and projects ${s.projectPercent}% (synthetic syllabus)${(s.examPercent ?? 0) >= 50 ? ", which matches “" + p.label + "”" : ""}.`);
    if (p.kind === "prefer_individual") out.push(`${course.code} projects are ${s.projectMode}${s.projectMode === "individual" ? ", which matches “" + p.label + "”" : ""}.`);
    if (p.kind === "prefer_no_quizzes") out.push(s.quizPercent ? `${course.code} has graded quizzes (${s.quizPercent}% of the grade), which works against “${p.label}”.` : `${course.code} has no graded quizzes, which matches “${p.label}”.`);
    if (p.kind === "prefer_no_attendance") out.push(s.attendancePercent ? `${course.code} grades attendance (${s.attendancePercent}% of the grade), which works against “${p.label}”.` : `${course.code} does not grade attendance, which matches “${p.label}”.`);
    if (p.kind === "prefer_less_frequent") out.push(`${course.code} cadence: ${s.cadence.toLowerCase()}${s.cadence.toLowerCase().includes("milestone") ? ", which matches “" + p.label + "”" : ""}.`);
  }
  return out;
}

export function explainSection(input: PlannerInput, refs: Ref[], courseId: string): string[] {
  const picked = resolveRefs(refs);
  const entry = picked.find(([c]) => c.id === courseId);
  if (!entry) throw new Error("UNKNOWN_SELECTION");
  const [course, section] = entry;
  const others = picked.filter(([c]) => c.id !== course.id).map(([, s]) => s);
  const othersByCourse = picked.filter(([c]) => c.id !== course.id);
  const facts: string[] = [];

  const req = catalog.requirements.find(r => r.id === course.requirement);
  const required = enabled(input).find(c => c.kind === "require_course" && c.value === course.id);
  if (req && input.requirementIds.includes(req.id)) facts.push(`${course.code} covers your “${req.title}” requirement (${course.units} units).`);
  else if (required) facts.push(`${course.code} is in the plan because of your rule “${required.label}”.`);
  else facts.push(`${course.code} adds ${course.units} units toward your ${input.minUnits}–${input.maxUnits} unit range.`);
  const unwanted = enabled(input).find(c => !c.hard && c.kind === "exclude_course" && c.value === course.id);
  if (unwanted) facts.push(`You asked to avoid ${course.code} (“${unwanted.label}”), but no plan without it met your other rules and requirements.`);
  if (lockedSection(course, input) === section.id) facts.push(`You locked §${section.id}, so the solver had to keep it.`);
  // Selections come from the client, so overlap and prerequisite claims are re-checked here.
  const clashes = othersByCourse.flatMap(([oc, os]) => { const d = overlapDay(section, os); return d ? [`${oc.code} on ${d}`] : []; });
  facts.push(clashes.length
    ? `§${section.id} meets ${meetingText(section)} and overlaps ${list(clashes)}.`
    : `§${section.id} meets ${meetingText(section)}, with no overlap against the other ${plural(others.length, "course")} in this plan.`);
  const missing = course.prerequisites.filter(p => !input.completedCourses.includes(p));
  if (missing.length) facts.push(`Prerequisite${missing.length > 1 ? "s" : ""} ${list(missing)} ${missing.length > 1 ? "are" : "is"} not in your completed courses.`);
  else if (course.prerequisites.length) facts.push(`Prerequisite${course.prerequisites.length > 1 ? "s" : ""} ${list(course.prerequisites)} ${course.prerequisites.length > 1 ? "are" : "is"} in your completed courses.`);

  for (const rule of softTime(input)) {
    facts.push(satisfies(section, rule)
      ? `Fits your preference “${rule.label}”.`
      : `Breaks your soft preference “${rule.label}”; the solver accepted this to satisfy the hard rules and the rest of the plan.`);
  }
  facts.push(...assessmentFacts(course, input));

  const chosenSoft = breaks(section, softTime(input)).length;
  const chosenDays = daysOf([...others, section]).size;
  for (const alt of course.sections.filter(s => s.id !== section.id)) {
    const reasons = sectionBlockers(course, alt, input);
    for (const [oc, os] of othersByCourse) {
      const d = overlapDay(alt, os);
      if (d) reasons.push(`overlaps ${oc.code} on ${d}`);
    }
    if (reasons.length) { facts.push(`§${alt.id} (${meetingText(alt)}) was ruled out: ${reasons.join("; ")}.`); continue; }
    const diffs: string[] = [];
    const altSoft = breaks(alt, softTime(input));
    if (altSoft.length > chosenSoft) diffs.push(`it breaks ${list(altSoft.map(l => `“${l}”`))}`);
    const altDays = daysOf([...others, alt]).size;
    if (altDays > chosenDays) diffs.push(`it needs ${altDays} campus days instead of ${chosenDays}`);
    facts.push(diffs.length
      ? `§${alt.id} (${meetingText(alt)}) also fits your hard rules, but ${list(diffs)}.`
      : `§${alt.id} (${meetingText(alt)}) also fits your hard rules and scores about the same; it is a valid swap.`);
  }

  if (req && input.requirementIds.includes(req.id)) {
    for (const otherId of req.courseIds.filter(id => id !== course.id && !picked.some(([c]) => c.id === id))) {
      const oc = catalog.courses.find(c => c.id === otherId);
      if (!oc) continue;
      const blocker = courseBlocker(oc, input);
      if (blocker) { facts.push(`${blocker}.`); continue; }
      const usable = oc.sections.filter(s => !sectionBlockers(oc, s, input).length && !others.some(o => overlapDay(s, o)));
      if (!usable.length) {
        const why = oc.sections.map(s => {
          const r = sectionBlockers(oc, s, input);
          const clash = othersByCourse.find(([, os]) => overlapDay(s, os));
          if (clash) r.push(`overlaps ${clash[0].code}`);
          return `§${s.id} ${r.join(", ")}`;
        });
        facts.push(`${oc.code} could also cover “${req.title}”, but no section fits: ${why.join("; ")}.`);
      } else {
        const hint = enabled(input).some(c => c.kind === "prefer_projects") && oc.syllabus.status === "synthetic" && course.syllabus.status === "synthetic"
          ? ` (projects ${oc.syllabus.projectPercent}% vs ${course.syllabus.projectPercent}% for ${course.code})` : "";
        facts.push(`${oc.code} could also cover “${req.title}”${hint}; the best-scoring plan under your preferences uses ${course.code}.`);
      }
    }
  }
  return facts;
}

type Metrics = { units: number; days: number[]; hours: number; earliest: number; gaps: number; softBroken: string[]; projectHeavy: number; examHeavy: number };
function metrics(picked: Picked[], input: PlannerInput): Metrics {
  const meetings = picked.flatMap(([, s]) => s.meetings);
  let gaps = 0;
  for (let d = 0; d < 5; d++) {
    const day = meetings.filter(m => m.day === d).sort((a, b) => a.start - b.start);
    for (let i = 1; i < day.length; i++) gaps += Math.max(0, day[i]!.start - day[i - 1]!.end);
  }
  const softBroken = [...new Set(picked.flatMap(([, s]) => breaks(s, softTime(input))))];
  return {
    units: picked.reduce((n, [c]) => n + c.units, 0),
    days: [...daysOf(picked.map(([, s]) => s))].sort(),
    hours: Math.round(meetings.reduce((n, m) => n + m.end - m.start, 0) / 6) / 10,
    earliest: meetings.length ? Math.min(...meetings.map(m => m.start)) : 0,
    gaps, softBroken,
    projectHeavy: picked.filter(([c]) => c.syllabus.status === "synthetic" && (c.syllabus.projectPercent ?? 0) >= 50).length,
    examHeavy: picked.filter(([c]) => c.syllabus.status === "synthetic" && (c.syllabus.examPercent ?? 0) >= 50).length,
  };
}

export function explainCompare(input: PlannerInput, refsA: Ref[], refsB: Ref[]): string[] {
  const a = resolveRefs(refsA), b = resolveRefs(refsB);
  const facts: string[] = [];
  const secA = new Map(a.map(([c, s]) => [c.id, s])), secB = new Map(b.map(([c, s]) => [c.id, s]));
  const code = (id: string) => catalog.courses.find(c => c.id === id)?.code ?? id;
  const onlyA = a.filter(([c]) => !secB.has(c.id)).map(([c]) => c.code);
  const onlyB = b.filter(([c]) => !secA.has(c.id)).map(([c]) => c.code);
  if (onlyA.length || onlyB.length) facts.push(`This option takes ${list(onlyA) || "no different course"}; the other takes ${list(onlyB) || "no different course"} instead.`);
  for (const [id, s] of secA) {
    const t = secB.get(id);
    if (t && t.id !== s.id) facts.push(`${code(id)}: this option uses §${s.id} (${meetingText(s)}); the other uses §${t.id} (${meetingText(t)}).`);
  }
  const ma = metrics(a, input), mb = metrics(b, input);
  const cmp = (label: string, x: string, y: string) => { if (x !== y) facts.push(`${label}: ${x} here vs ${y} in the other option.`); };
  cmp("Units", String(ma.units), String(mb.units));
  cmp("Campus days", `${ma.days.length} (${ma.days.map(d => DAY[d]).join("/")})`, `${mb.days.length} (${mb.days.map(d => DAY[d]).join("/")})`);
  cmp("Class hours per week", ma.hours.toFixed(1), mb.hours.toFixed(1));
  cmp("First class", fmt(ma.earliest), fmt(mb.earliest));
  cmp("Time between classes", `${ma.gaps} min`, `${mb.gaps} min`);
  cmp("Project-weighted courses", String(ma.projectHeavy), String(mb.projectHeavy));
  cmp("Exam-weighted courses", String(ma.examHeavy), String(mb.examHeavy));
  const broken = (m: Metrics) => m.softBroken.length ? `breaks ${list(m.softBroken.map(l => `“${l}”`))}` : "keeps every soft preference";
  if (ma.softBroken.join() !== mb.softBroken.join()) facts.push(`This option ${broken(ma)}; the other ${broken(mb)}.`);
  if (!facts.length) facts.push("Both options have the same courses, meeting times, and preference results.");
  return facts;
}

export function explainConflict(input: PlannerInput): string[] {
  const facts: string[] = [];
  const usableCourses: Course[] = [];
  const groups: { title: string; options: Picked[] }[] = [];
  const check = (course: Course) => {
    const blocker = courseBlocker(course, input);
    if (blocker) return { ok: false, why: blocker };
    const per = course.sections.map(s => ({ s, r: sectionBlockers(course, s, input) }));
    if (per.every(x => x.r.length)) return { ok: false, why: `every ${course.code} section is blocked (${per.map(x => `§${x.s.id} ${x.r.join(", ")}`).join("; ")})` };
    usableCourses.push(course);
    return { ok: true, why: "" };
  };
  for (const id of input.requirementIds) {
    const req = catalog.requirements.find(r => r.id === id);
    if (!req) continue;
    const results = req.courseIds.map(cid => catalog.courses.find(c => c.id === cid)).filter((c): c is Course => !!c).map(c => check(c));
    const done = req.courseIds.filter(c => input.completedCourses.includes(c)).length;
    const usable = results.filter(r => r.ok).length;
    if (done + usable < req.needed) facts.push(`“${req.title}” cannot be met: ${results.map(r => r.why).filter(Boolean).join("; ")}.`);
    else if (!done) groups.push({ title: req.title, options: usableCourses.filter(c => req.courseIds.includes(c.id))
      .flatMap(c => c.sections.filter(s => !sectionBlockers(c, s, input).length).map(s => [c, s] as Picked)) });
  }
  // Exact pairwise check: every remaining option of one group overlaps every remaining option of another.
  for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
    const a = groups[i]!, b = groups[j]!;
    if (!a.options.length || !b.options.length) continue;
    if (a.options.every(([, x]) => b.options.every(([, y]) => overlapDay(x, y)))) {
      const name = (o: Picked[]) => list(o.map(([c, s]) => `${c.code} §${s.id} (${meetingText(s)})`));
      facts.push(`Every remaining “${a.title}” option (${name(a.options)}) overlaps every remaining “${b.title}” option (${name(b.options)}).`);
    }
  }
  for (const rule of enabled(input).filter(c => c.hard && c.kind === "require_course")) {
    const course = catalog.courses.find(c => c.id === rule.value);
    if (!course) continue;
    const r = check(course);
    if (!r.ok) facts.push(`Your rule “${rule.label}” cannot be met: ${r.why}.`);
  }
  const reachable = [...new Set(usableCourses)].reduce((n, c) => n + c.units, 0);
  if (reachable < input.minUnits) facts.push(`Only ${reachable} units have a usable section under your hard rules, below your ${input.minUnits}-unit minimum.`);
  for (const rule of hardTime(input)) {
    const hit = catalog.courses.flatMap(c => c.sections.filter(s => !satisfies(s, rule)).map(s => `${c.code} §${s.id}`));
    if (hit.length) facts.push(`“${rule.label}” rules out ${plural(hit.length, "section")}: ${list(hit)}.`);
  }
  if (!facts.some(f => f.includes("cannot be met") || f.startsWith("Only") || f.startsWith("Every remaining"))) {
    facts.unshift("Each requirement still has a usable section on its own, so the clash comes from combining them: the remaining sections overlap in time or exceed the unit range.");
  }
  return facts;
}

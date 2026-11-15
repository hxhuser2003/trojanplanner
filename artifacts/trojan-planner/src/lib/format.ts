import type { Catalog, Constraint, ConstraintKind, Course, Schedule, Section } from '@workspace/api-client-react';

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function fmtTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')}${ap}`;
}

/** 8.17 hours → "8h 10m". Quiz slots are not counted in class time (see the API). */
export function fmtHours(h: number): string {
  const m = Math.round(h * 60);
  return `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`;
}

export function toHHMM(min: number): string {
  const c = Math.min(Math.max(min, 0), 1439);
  return `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`;
}

export function fromHHMM(v: string): number {
  const [h, m] = v.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export const KIND_META: Record<ConstraintKind, { label: string; hint: string; uses: ('days' | 'time' | 'start' | 'end' | 'course' | 'section')[] }> = {
  no_day: { label: 'Keep days free', hint: 'No classes on the chosen days', uses: ['days'] },
  earliest: { label: 'Earliest start', hint: 'Nothing before this time', uses: ['start'] },
  latest: { label: 'Latest end', hint: 'Nothing after this time', uses: ['end'] },
  blocked: { label: 'Time block', hint: 'Work, practice, commute, life', uses: ['days', 'time'] },
  require_course: { label: 'Require course', hint: 'This course must be in the plan', uses: ['course'] },
  exclude_course: { label: 'Exclude course', hint: 'Keep this course out of the plan', uses: ['course'] },
  lock_section: { label: 'Lock section', hint: 'Keep this exact section', uses: ['section'] },
  prefer_projects: { label: 'Prefer project-weighted', hint: 'Favor syllabi with project weight at or above 50%', uses: [] },
  prefer_exams: { label: 'Prefer exam-weighted', hint: 'Favor syllabi with exam weight at or above 50%', uses: [] },
  prefer_individual: { label: 'Prefer individual work', hint: 'Favor individually graded projects', uses: [] },
  prefer_fewer_days: { label: 'Fewer campus days', hint: 'Compress the week', uses: [] },
  prefer_less_frequent: { label: 'Less frequent meetings', hint: 'Favor 2x/week over 3x/week', uses: [] },
  prefer_no_quizzes: { label: 'Avoid graded quizzes', hint: 'Favor courses without graded quizzes', uses: [] },
  prefer_no_attendance: { label: 'Avoid graded attendance', hint: 'Favor courses that do not grade attendance', uses: [] },
  prefer_no_midterm: { label: 'Avoid midterms', hint: 'Favor courses without a midterm exam', uses: [] },
  prefer_no_final: { label: 'Avoid final exams', hint: 'Favor courses without a final exam', uses: [] },
};

export function describeConstraint(c: Constraint, catalog?: Catalog): string {
  const days = c.days.map((d) => DAYS[d]).join(', ');
  switch (c.kind) {
    case 'no_day': return days ? `Free on ${days}` : 'No days chosen';
    case 'earliest': return `Start at or after ${fmtTime(c.start)}`;
    case 'latest': return `Finish by ${fmtTime(c.end)}`;
    case 'blocked': return `${days || 'No days'} · ${fmtTime(c.start)}–${fmtTime(c.end)}`;
    case 'require_course': case 'exclude_course': return courseCode(catalog, c.value) ?? c.value;
    case 'lock_section': {
      const f = findSection(catalog, c.value);
      return f ? `${f.course.code} · ${sectionWhen(f.section)}` : c.value;
    }
    default: return KIND_META[c.kind]?.hint ?? '';
  }
}

const shortTime = (min: number) => fmtTime(min).replace(':00', '');
const DAY_OR_TIME = /\s(?:(?:Mon|Tue|Wed|Thu|Fri)(?:day|days|s)?\b|\d{1,2}(?::\d{2})?\s?(?:am|pm)\b)/i;

/** The label a rule would get from its fields, so editing days or times keeps the name accurate.
 *  For time blocks, the name in front ("Work", "Gym") is kept from the previous label. */
export function autoLabel(c: Constraint, catalog: Catalog | undefined, previous: string): string {
  const days = [...c.days].sort().map((d) => DAYS[d]).join('/');
  switch (c.kind) {
    case 'no_day': return `${c.hard ? 'Keep' : 'Prefer'} ${days || 'days'} free`;
    case 'earliest': return c.hard ? `No classes before ${shortTime(c.start)}` : `Prefer starts after ${shortTime(c.start)}`;
    case 'latest': return c.hard ? `Done by ${shortTime(c.end)}` : `Prefer done by ${shortTime(c.end)}`;
    case 'blocked': {
      const name = previous.split(DAY_OR_TIME)[0]!.replace(/[\s·,–-]+$/, '').trim();
      return `${name && name !== KIND_META.blocked.label ? name : 'Busy'} ${days || 'no days'} · ${shortTime(c.start)}–${shortTime(c.end)}`;
    }
    case 'require_course': return c.value ? `Take ${courseCode(catalog, c.value) ?? c.value}` : KIND_META[c.kind].label;
    case 'exclude_course': return c.value ? `Don't take ${courseCode(catalog, c.value) ?? c.value}` : KIND_META[c.kind].label;
    case 'lock_section': {
      const f = findSection(catalog, c.value);
      return f ? `Keep ${f.course.code} · ${sectionWhen(f.section)}` : KIND_META[c.kind].label;
    }
    default: return KIND_META[c.kind].label;
  }
}

export interface SectionPart { id: string; kind: string; times: string[]; tba: boolean }

/** Splits a registration combination ("30071+30070+30034") into its USC section numbers, each with
 *  its type and meeting times. Parts are listed lecture first, in the same order as their meetings;
 *  a part without listed times is named in unknownScheduleComponents ("Quiz 30034 time TBA"). */
export function sectionParts(section: Section): SectionPart[] {
  const kinds = [...new Set(section.meetings.map((m) => m.kind))];
  const used = new Set<string>();
  return section.componentIds.map((id) => {
    const note = section.unknownScheduleComponents.find((u) => u.split(' ').includes(id));
    const kind = note?.split(' ')[0] ?? kinds.find((k) => !used.has(k)) ?? 'Section';
    used.add(kind);
    const meetings = section.meetings.filter((m) => m.kind === kind);
    // Same time on several days reads as "Tue/Thu 2:00pm–3:50pm".
    const byTime = new Map<string, number[]>();
    meetings.forEach((m) => {
      const t = `${fmtTime(m.start)}–${fmtTime(m.end)}`;
      byTime.set(t, [...(byTime.get(t) ?? []), m.day]);
    });
    const times = [...byTime].map(([t, days]) => `${days.sort().map((d) => DAYS[d]).join('/')} ${t}`);
    return { id, kind, times, tba: !meetings.length };
  });
}

/** A short, readable name for a section: when its lecture starts ("Tue/Thu 2:00pm"). */
export function sectionWhen(section: Section): string {
  return sectionParts(section)[0]?.times[0]?.split('–')[0] ?? 'time TBA';
}

export function courseCode(catalog: Catalog | undefined, id: string): string | undefined {
  return catalog?.courses.find((c) => c.id === id || c.code === id)?.code;
}

export function findSection(catalog: Catalog | undefined, sectionId: string): { course: Course; section: Section } | undefined {
  if (!catalog) return undefined;
  const sid = sectionId.includes(':') ? sectionId.split(':')[1] : sectionId;
  for (const course of catalog.courses) {
    const section = course.sections.find((s) => s.id === sid);
    if (section) return { course, section };
  }
  return undefined;
}

export function newConstraint(kind: ConstraintKind, hard = true): Constraint {
  return {
    id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    label: KIND_META[kind].label,
    kind,
    hard,
    enabled: true,
    value: '',
    days: [],
    start: kind === 'blocked' ? 720 : kind === 'earliest' ? 540 : 0,
    end: kind === 'blocked' ? 780 : kind === 'latest' ? 1080 : 0,
  };
}

export function errMessage(e: unknown): string {
  // Drop the transport prefix ("HTTP 503 Service Unavailable: ") so users see only the server's message.
  const msg = e instanceof Error ? e.message : String(e);
  return msg.replace(/^HTTP \d{3}[^:]*: /, '');
}

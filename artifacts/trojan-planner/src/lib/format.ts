import type { Catalog, Constraint, ConstraintKind, Course, Section } from '@workspace/api-client-react';

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function fmtTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')}${ap}`;
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
  lock_section: { label: 'Lock section', hint: 'Keep this exact section', uses: ['section'] },
  prefer_projects: { label: 'Prefer project-weighted', hint: 'Favor syllabi with project weight at or above 50%', uses: [] },
  prefer_individual: { label: 'Prefer individual work', hint: 'Favor individually graded projects', uses: [] },
  prefer_fewer_days: { label: 'Fewer campus days', hint: 'Compress the week', uses: [] },
  prefer_less_frequent: { label: 'Less frequent meetings', hint: 'Favor 2x/week over 3x/week', uses: [] },
};

export function describeConstraint(c: Constraint, catalog?: Catalog): string {
  const days = c.days.map((d) => DAYS[d]).join(', ');
  switch (c.kind) {
    case 'no_day': return days ? `Free on ${days}` : 'No days chosen';
    case 'earliest': return `Start at or after ${fmtTime(c.start)}`;
    case 'latest': return `Finish by ${fmtTime(c.end)}`;
    case 'blocked': return `${days || 'No days'} · ${fmtTime(c.start)}–${fmtTime(c.end)}`;
    case 'require_course': return courseCode(catalog, c.value) ?? c.value;
    case 'lock_section': {
      const f = findSection(catalog, c.value);
      return f ? `${f.course.code} §${f.section.id}` : c.value;
    }
    default: return KIND_META[c.kind]?.hint ?? '';
  }
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
  if (e instanceof Error) return e.message;
  return String(e);
}

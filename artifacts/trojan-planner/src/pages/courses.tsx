import { useMemo, useState, type ReactNode } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Search, ExternalLink, Plus, FileText, Check, Ban, CalendarDays, Repeat, Users, UserCheck } from 'lucide-react';
import type { Catalog, Course, Constraint } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CatalogGate } from '@/components/gate';
import { PageHeader } from '@/components/shell';
import { SectionDelivery } from '@/components/section-delivery';
import { usePlanner } from '@/lib/planner-store';
import { sectionParts } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function CoursesPage() {
  return <CatalogGate>{(c) => <Courses catalog={c} />}</CatalogGate>;
}

function Courses({ catalog }: { catalog: Catalog }) {
  const search = useSearch();
  const initial = new URLSearchParams(search).get('c');
  const [q, setQ] = useState('');
  const [department, setDepartment] = useState('all');
  const [selId, setSelId] = useState<string | null>(initial ?? catalog.courses[0]?.id ?? null);
  const departments = useMemo(
    () => [...new Set(catalog.courses.map((course) => course.code.trim().split(/\s+/)[0]).filter((code): code is string => Boolean(code)))].sort(),
    [catalog.courses],
  );
  const list = useMemo(() => {
    const t = q.toLowerCase();
    return catalog.courses.filter((c) => (department === 'all' || c.code.trim().split(/\s+/)[0] === department) && (!t || `${c.code} ${c.title} ${c.description} ${c.sections.map((s) => s.instructor).join(' ')}`.toLowerCase().includes(t)));
  }, [catalog.courses, q, department]);
  const sel = catalog.courses.find((c) => c.id === selId);

  return (
    <div className="mx-auto max-w-[1440px] px-4 md:px-6 py-6">
      <PageHeader eyebrow={`${catalog.major} · catalog ${catalog.catalogYear}`} title="Courses, with receipts." />
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="space-y-3">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, title, instructor" className="pl-9 bg-card" aria-label="Search courses" data-testid="input-search-courses" />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by department">
            {[{ id: 'all', title: 'All' }, ...departments.map((code) => ({ id: code, title: code }))].map((filter) => (
              <button key={filter.id} onClick={() => setDepartment(filter.id)} aria-pressed={department === filter.id} data-testid={`filter-department-${filter.id}`}
                className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors', department === filter.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:border-primary/50')}>{filter.title}</button>
            ))}
          </div>
          <ul className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {list.map((c) => (
              <li key={c.id}>
                <button onClick={() => setSelId(c.id)} data-testid={`card-course-${c.id}`}
                  className={cn('w-full text-left rounded-lg border p-3 transition-all flex gap-3', selId === c.id ? 'bg-card border-primary shadow-sm' : 'bg-card/60 hover:bg-card')}>
                  <span className="w-1 rounded-full self-stretch" style={{ background: c.color }} />
                  <span className="min-w-0">
                    <span className="font-mono text-xs font-semibold">{c.code} · {c.units}u</span>
                    <span className="block text-sm font-medium truncate">{c.title}</span>
                    <span className="block text-[11px] text-muted-foreground">{c.sections.length} registration combination{c.sections.length === 1 ? '' : 's'} · {projectLabel(c)}</span>
                  </span>
                </button>
              </li>
            ))}
            {!list.length && <li className="text-sm text-muted-foreground italic p-6 text-center border rounded-lg border-dashed">No courses match "{q}".</li>}
          </ul>
        </div>
        {sel ? <CourseDetail key={sel.id} course={sel} catalog={catalog} /> : <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Pick a course to see its evidence.</div>}
      </div>
    </div>
  );
}

function projectLabel(c: Course) {
  const p = c.syllabus.projectPercent;
  if (p == null) return 'project weight unknown';
  return `${p}% projects · ${c.syllabus.status === 'synthetic' ? 'mock' : 'historical'}`;
}

const TEAM: Record<string, string> = {
  individual: 'Solo work', group: 'Team projects', mixed: 'Mix of solo and team work', unspecified: 'Not stated in the syllabus',
};

/** What a student wants to know before picking a course, from the syllabus: dates, workload, teamwork, attendance, and where it came from. */
function AtAGlance({ course }: { course: Course }) {
  const s = course.syllabus;
  // `when` sometimes holds a description ("Five quizzes"); only real timing ("Week 8", "Finals week") counts as a date.
  const dated = s.grading.filter((g) => g.when && /\b(weeks?|finals|exam (week|period))\b|\b(jan|feb|mar|apr|may|aug|sep|oct|nov|dec)[a-z]*\.? \d/i.test(g.when) && !/^weekly$/i.test(g.when));
  const team = s.evidence.find((e) => e.label === 'Project format')?.value;
  const page = s.evidence.find((e) => e.label === 'Grading table')?.page;
  const rows: { icon: typeof CalendarDays; label: string; body: ReactNode }[] = [
    { icon: CalendarDays, label: 'Key dates', body: dated.length
      ? <ul className="space-y-0.5">{dated.map((g) => <li key={g.item}><span className="font-medium">{g.item}</span> <span className="text-muted-foreground">· {g.when}</span></li>)}</ul>
      : <span className="text-muted-foreground">No dates listed in the syllabus.</span> },
    { icon: Repeat, label: 'Workload', body: s.cadence || <span className="text-muted-foreground">Not stated.</span> },
    { icon: Users, label: 'Solo or team', body: team && s.projectMode !== 'individual' ? `${TEAM[s.projectMode] ?? s.projectMode} (${team.toLowerCase()})` : TEAM[s.projectMode] ?? s.projectMode },
    { icon: UserCheck, label: 'Attendance', body: s.attendance || <span className="text-muted-foreground">Not stated.</span> },
  ];
  return (
    <div data-testid="card-at-a-glance">
      <h3 className="text-base font-semibold mb-3">Course at a glance</h3>
      {s.status === 'unknown' ? <p className="text-sm italic text-muted-foreground">No syllabus on file, so these details are unknown.</p> : (
        <dl className="divide-y rounded-lg border">
          {rows.map(({ icon: Icon, label, body }) => (
            <div key={label} className="flex gap-3 p-3 text-sm">
              <Icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5">{body}</dd></div>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline" data-testid="link-syllabus-source">
          <FileText className="size-3.5" />{s.status === 'synthetic' ? 'Mock syllabus (made for this demo)' : `${s.term} USC syllabus${page ? `, p. ${page}` : ''}`}<ExternalLink className="size-3" />
        </a>
        <a href={course.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:underline" data-testid="link-course-source">USC course listing<ExternalLink className="size-3" /></a>
      </div>
    </div>
  );
}

const GROUP = {
  midterm: { label: 'Midterm', cls: 'bg-chart-4' },
  final: { label: 'Final', cls: 'bg-primary' },
  exams: { label: 'Other exams', cls: 'bg-primary/55' },
  projects: { label: 'Projects', cls: 'bg-accent' },
  coursework: { label: 'Homework & quizzes', cls: 'bg-chart-3' },
  attendance: { label: 'Attendance & participation', cls: 'bg-chart-5' },
  other: { label: 'Other', cls: 'bg-muted-foreground/40' },
};
function gradeGroup(kind: string): keyof typeof GROUP {
  if (kind === 'midterm' || kind === 'final') return kind;
  if (kind === 'exam') return 'exams';
  if (kind === 'project') return 'projects';
  if (kind === 'homework' || kind === 'quiz') return 'coursework';
  if (kind === 'attendance' || kind === 'participation') return 'attendance';
  return 'other';
}

function Bar({ label, v, cls }: { label: string; v: number | null | undefined; cls: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><span>{label}</span><span className="font-mono">{v == null ? 'Unknown' : `${v}%`}</span></div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        {v == null ? <div className="h-full w-full unknown-stripes" /> : <div className={cn('h-full rounded-full origin-left rise', cls)} style={{ width: `${v}%` }} />}
      </div>
    </div>
  );
}

function CourseDetail({ course, catalog }: { course: Course; catalog: Catalog }) {
  const p = usePlanner();
  const [, nav] = useLocation();
  const { toast } = useToast();
  const s = course.syllabus;
  const required = p.input?.constraints.some((c) => c.kind === 'require_course' && c.value === course.id && c.enabled);
  const excluded = p.input?.constraints.some((c) => c.kind === 'exclude_course' && c.value === course.id && c.enabled);
  const req = catalog.requirements.find((r) => r.id === course.requirement);

  // Requiring and excluding the same course would contradict, so each replaces the other.
  const setCourseRule = (kind: 'require_course' | 'exclude_course') => {
    const input = p.input ?? catalog.defaultInput;
    const rest = input.constraints.filter((x) => !((x.kind === 'require_course' || x.kind === 'exclude_course') && x.value === course.id));
    if (rest.length >= 20) { toast({ title: 'Rule limit reached', variant: 'destructive' }); return; }
    const c: Constraint = kind === 'require_course'
      ? { id: `req-${course.id}`, label: `Take ${course.code}`, kind, hard: true, enabled: true, value: course.id, days: [], start: 0, end: 0 }
      : { id: `excl-${course.id}`, label: `Don't take ${course.code}`, kind, hard: true, enabled: true, value: course.id, days: [], start: 0, end: 0 };
    const next = { ...input, constraints: [...rest, c] };
    p.setInput(next);
    void p.solve(next);
    toast({ title: kind === 'require_course' ? `${course.code} is now required` : `${course.code} is now excluded`, description: 'Re-solving your week…' });
    nav('/');
  };

  return (
    <article className="rounded-xl border bg-card p-5 md:p-7 rise" data-testid="panel-course-detail">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm font-semibold" style={{ color: course.color }}>{course.code} · {course.units} units · {req?.title ?? course.requirement}</p>
          <h2 className="text-2xl font-semibold tracking-tight mt-1">{course.title}</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{course.description}</p>
          {course.prerequisiteGroups.length > 0 && <p className="text-xs mt-2"><span className="font-semibold">Published prerequisites:</span> {course.prerequisiteGroups.map((group) => `(${group.join(' or ')})`).join(' and ')}</p>}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button onClick={() => setCourseRule('require_course')} disabled={required} data-testid="button-add-required">
            {required ? <><Check className="size-4" />Required</> : <><Plus className="size-4" />Add as required</>}
          </Button>
          <Button variant="outline" onClick={() => setCourseRule('exclude_course')} disabled={excluded} data-testid="button-exclude">
            <Ban className="size-4" />{excluded ? 'Excluded' : "Don't take this"}
          </Button>
        </div>
      </div>

      <h3 className="text-base font-semibold mt-6 mb-2">Registration combinations</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider"><tr><th className="p-2.5">Section</th><th className="p-2.5">Meets</th><th className="p-2.5">Instructor</th></tr></thead>
          <tbody>
            {course.sections.map((sec) => (
              <tr key={sec.id} className="border-t" data-testid={`row-section-${sec.id}`}>
                <td className="p-2.5 align-top"><div className="flex flex-col items-start gap-1"><SectionDelivery section={sec} /><span className="font-mono text-xs text-muted-foreground">{sec.componentIds.join(' + ')}</span></div></td>
                <td className="p-2.5 text-xs">
                  {sectionParts(sec).map((part) => (
                    <div key={part.id} className="flex gap-2"><span className="w-20 shrink-0 text-muted-foreground">{part.kind}</span>
                      <span className={cn('whitespace-nowrap', part.tba && 'font-medium text-amber-700')}>{part.tba ? 'Time TBA' : part.times.join(', ')}</span></div>
                  ))}
                </td>
                <td className="p-2.5">{sec.instructor}
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(`"${sec.instructor}" site:usc.edu`)}`} target="_blank" rel="noreferrer" className="block text-[11px] text-primary hover:underline" data-testid={`link-instructor-${sec.id}`}>Search usc.edu</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 grid md:grid-cols-[1fr_1.4fr] gap-6">
        <div>
          <h3 className="text-base font-semibold mb-1">Grading</h3>
          <p className="text-xs text-muted-foreground mb-3">{s.status === 'synthetic' ? 'Mock syllabus made for this demo.' : s.status === 'historical' ? `From the ${s.term} USC syllabus.` : 'No syllabus on file.'}</p>
          {s.grading.length > 0 ? (
            <div data-testid="table-grading">
              <div className="flex h-2.5 rounded-full overflow-hidden bg-muted gap-px" aria-hidden>
                {s.grading.map((g) => <div key={g.item} className={cn('h-full origin-left rise', GROUP[gradeGroup(g.kind)].cls)} style={{ width: `${g.percent}%` }} title={`${g.item} ${g.percent}%`} />)}
              </div>
              <ul className="mt-3 divide-y">
                {s.grading.map((g) => (
                  <li key={g.item} className="flex items-start gap-2.5 py-2 text-sm">
                    <span className={cn('mt-1.5 size-2 rounded-full shrink-0', GROUP[gradeGroup(g.kind)].cls)} />
                    <div className="flex-1 min-w-0">
                      <p>{g.item}</p>
                      {g.when && <p className="text-xs text-muted-foreground">{g.when}</p>}
                    </div>
                    <span className="font-mono tabular-nums text-sm">{g.percent}%</span>
                  </li>
                ))}
              </ul>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {(Object.keys(GROUP) as (keyof typeof GROUP)[]).filter((k) => s.grading.some((g) => gradeGroup(g.kind) === k)).map((k) => (
                  <span key={k} className="inline-flex items-center gap-1"><span className={cn('size-1.5 rounded-full', GROUP[k].cls)} />{GROUP[k].label}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Bar label="Exams" v={s.examPercent} cls="bg-primary" />
              <Bar label="Projects" v={s.projectPercent} cls="bg-accent" />
              <Bar label="Other" v={s.otherPercent} cls="bg-chart-3" />
            </div>
          )}
        </div>
        <AtAGlance course={course} />
      </div>
    </article>
  );
}

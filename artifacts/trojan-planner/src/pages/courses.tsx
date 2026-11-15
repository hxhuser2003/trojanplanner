import { useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Search, ExternalLink, Plus, FileText, Check, Ban } from 'lucide-react';
import type { Catalog, Course, Constraint } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CatalogGate } from '@/components/gate';
import { PageHeader } from '@/components/shell';
import { usePlanner } from '@/lib/planner-store';
import { DAYS, fmtTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function CoursesPage() {
  return <CatalogGate>{(c) => <Courses catalog={c} />}</CatalogGate>;
}

function Courses({ catalog }: { catalog: Catalog }) {
  const search = useSearch();
  const initial = new URLSearchParams(search).get('c');
  const [q, setQ] = useState('');
  const [req, setReq] = useState('all');
  const [selId, setSelId] = useState<string | null>(initial ?? catalog.courses[0]?.id ?? null);
  const list = useMemo(() => {
    const t = q.toLowerCase();
    return catalog.courses.filter((c) => (req === 'all' || c.requirement === req) && (!t || `${c.code} ${c.title} ${c.description} ${c.sections.map((s) => s.instructor).join(' ')}`.toLowerCase().includes(t)));
  }, [catalog.courses, q, req]);
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
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by requirement">
            {[{ id: 'all', title: 'All' }, ...catalog.requirements].map((r) => (
              <button key={r.id} onClick={() => setReq(r.id)} aria-pressed={req === r.id} data-testid={`filter-req-${r.id}`}
                className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors', req === r.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:border-primary/50')}>{r.title}</button>
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
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider"><tr><th className="p-2.5">Section</th><th className="p-2.5">Instructor</th><th className="p-2.5">Meetings</th><th className="p-2.5">Eligibility</th></tr></thead>
          <tbody>
            {course.sections.map((sec) => (
              <tr key={sec.id} className="border-t" data-testid={`row-section-${sec.id}`}>
                <td className="p-2.5 font-mono">{sec.componentIds.join(' + ')}</td>
                <td className="p-2.5">{sec.instructor}
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(`"${sec.instructor}" site:usc.edu`)}`} target="_blank" rel="noreferrer" className="block text-[11px] text-primary hover:underline" data-testid={`link-instructor-${sec.id}`}>Search usc.edu</a></td>
                <td className="p-2.5 text-xs">{sec.meetings.map((m, i) => <div key={i}>{DAYS[m.day]} {fmtTime(m.start)}–{fmtTime(m.end)} · {m.kind} · {m.location}</div>)}{sec.unknownScheduleComponents.map((item) => <div key={item} className="font-semibold text-amber-700">{item}</div>)}</td>
                <td className="p-2.5 text-xs text-muted-foreground">{sec.eligibility}{sec.syllabusUrl && <a href={sec.syllabusUrl} target="_blank" rel="noreferrer" className="block mt-1 text-primary hover:underline">Check Spring 2027 syllabus listing (may be unpublished)</a>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">Section combinations and instructor names come from the cached USC listing. TBA components are shown but cannot be checked for time conflicts. Confirm the combination and seats in Web Registration.</p>

      <div className="mt-6 grid md:grid-cols-[1fr_1.4fr] gap-6">
        <div>
          <h3 className="text-base font-semibold mb-1">Assessment fit</h3>
          <p className="text-xs text-muted-foreground mb-3">{s.status === 'synthetic' ? 'Mock syllabus created for this demo' : s.status === 'historical' ? `Real USC syllabus from ${s.term}` : 'No syllabus on file; unknown is not zero'}. These weights are not verified for Spring 2027.</p>
          <div className="space-y-3">
            <Bar label="Exams" v={s.examPercent} cls="bg-primary" />
            <Bar label="Projects" v={s.projectPercent} cls="bg-accent" />
            <Bar label="Other" v={s.otherPercent} cls="bg-chart-3" />
          </div>
          {s.grading.length > 0 && (
            <table className="mt-4 w-full text-sm" data-testid="table-grading">
              <thead><tr className="text-xs text-muted-foreground text-left"><th className="font-normal pb-1">Grading breakdown</th><th className="font-normal pb-1 text-right">%</th></tr></thead>
              <tbody>
                {s.grading.map((g) => (
                  <tr key={g.item} className="border-t align-top">
                    <td className="py-1.5 pr-2">{g.item}{g.when && <span className="block text-xs text-muted-foreground">{g.when}</span>}</td>
                    <td className="py-1.5 text-right tabular-nums">{g.percent}</td>
                  </tr>
                ))}
                <tr className="border-t font-semibold"><td className="py-1.5">Total</td><td className="py-1.5 text-right tabular-nums">{s.grading.reduce((n, g) => n + g.percent, 0)}</td></tr>
              </tbody>
            </table>
          )}
          <div className="mt-4 rounded-lg bg-secondary/60 p-3 text-xs space-y-1">
            <p><span className="font-semibold">Label:</span> {projectLabel(course)} <span className="text-muted-foreground">(threshold: projects at or above 50%)</span></p>
            <p><span className="font-semibold">Project mode:</span> {s.projectMode}</p>
            <p><span className="font-semibold">Cadence:</span> {s.cadence || 'Unknown'}</p>
            <p><span className="font-semibold">Attendance:</span> {s.attendance || 'Unknown'}</p>
          </div>
          <div className="mt-3 flex flex-col gap-1.5 text-xs">
            <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline" data-testid="link-syllabus-source"><FileText className="size-3.5" />{s.status === 'synthetic' ? 'Open clearly labeled mock syllabus' : `Open USC ${s.term} syllabus PDF`}<ExternalLink className="size-3" /></a>
            <a href={course.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-muted-foreground hover:underline" data-testid="link-course-source">Course listing provenance<ExternalLink className="size-3" /></a>
          </div>
        </div>
        <div>
          <h3 className="text-base font-semibold mb-2">Evidence</h3>
          {s.evidence.length === 0 ? <p className="text-sm italic text-muted-foreground">No syllabus evidence on file. Treat all assessment details as unknown.</p> : (
            <ul className="space-y-2">
              {s.evidence.map((e, i) => (
                <li key={i} className="rounded-lg border p-3" data-testid={`evidence-${i}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm"><span className="font-semibold">{e.label}:</span> {e.value}</p>
                    <span className={cn('text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold shrink-0', e.status === 'unknown' ? 'border-destructive/40 text-destructive' : e.status === 'historical' ? 'border-amber-600/40 text-amber-700' : 'border-primary/30 text-primary')}>{e.status}</span>
                  </div>
                  {e.excerpt && <p className="mt-2 border-l-2 border-accent pl-3 text-xs text-muted-foreground">{e.excerpt}</p>}
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">p. {e.page}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

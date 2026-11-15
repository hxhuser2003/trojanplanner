import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { Download, Printer, HelpCircle, CalendarX } from 'lucide-react';
import type { Catalog, Schedule } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CatalogGate } from '@/components/gate';
import { PageHeader } from '@/components/shell';
import { usePlanner } from '@/lib/planner-store';
import { sectionParts } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function ChecklistPage() {
  return <CatalogGate>{(c) => <Checklist catalog={c} />}</CatalogGate>;
}

function buildItems(catalog: Catalog, sched: Schedule) {
  const rows = sched.selections.map((sel) => {
    const course = catalog.courses.find((c) => c.id === sel.courseId);
    const section = course?.sections.find((s) => s.id === sel.sectionId);
    return { sel, course, section };
  });
  const unknowns: string[] = [];
  rows.forEach(({ course, section, sel }) => {
    if (!course) { unknowns.push(`${sel.courseId}: course details unavailable`); return; }
    const s = course.syllabus;
    unknowns.push(`${course.code}: ${s.status === 'synthetic' ? 'mock syllabus is illustrative' : s.status === 'historical' ? `${s.term} syllabus is historical` : 'syllabus is unavailable'}; verify the Spring 2027 syllabus`);
    if (s.examPercent == null) unknowns.push(`${course.code}: exam weight unknown`);
    if (s.projectPercent == null) unknowns.push(`${course.code}: project weight unknown`);
    if (s.projectMode === 'unspecified') unknowns.push(`${course.code}: individual vs group work not specified`);
    if (!s.cadence) unknowns.push(`${course.code}: assignment cadence unknown`);
    s.evidence.filter((e) => e.status === 'unknown').forEach((e) => unknowns.push(`${course.code}: ${e.label} unknown`));
    if (section?.eligibility) unknowns.push(`${course.code}: ${section.eligibility}`);
    section?.unknownScheduleComponents.forEach((item) => unknowns.push(`${course.code}: ${item}; time conflicts cannot be fully checked`));
  });
  sched.warnings.forEach((w) => unknowns.push(w));
  return { rows, unknowns };
}

function Checklist({ catalog }: { catalog: Catalog }) {
  const p = usePlanner();
  const sched = p.chosen;
  if (!sched) {
    return (
      <div className="mx-auto max-w-md text-center py-16 px-4" data-testid="status-checklist-empty">
        <CalendarX className="size-10 mx-auto text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight mt-3">No plan chosen yet</h1>
        <p className="text-sm text-muted-foreground mt-2">{p.solveState === 'solving' ? 'The solver is still working on your week.' : 'Solve your week (and approve a repair if rules conflict) to build a registration checklist.'}</p>
        <Button asChild className="mt-4"><Link href="/" data-testid="link-back-planner">Go to planner</Link></Button>
      </div>
    );
  }
  const stale = p.dirty;
  const { rows, unknowns } = buildItems(catalog, sched);
  const steps = ['Confirm prerequisites are cleared in your official record', 'Check D-clearance needs with the department', 'Verify times in the official Schedule of Classes', 'Meet with your advisor before your registration window'];
  const total = rows.length + steps.length;
  const done = [...rows.map((r) => `sec:${r.sel.sectionId}`), ...steps.map((_, i) => `step:${i}`)].filter((k) => p.checklist[k]).length;

  const exportText = () => {
    const lines = [
      `TrojanPlanner registration checklist — ${catalog.term}`,
      `USC course snapshot retrieved ${catalog.sourceDate}. Illustrative planning goals; not an enrollment guarantee or degree audit.`,
      '',
      `Plan: ${sched.title} · ${sched.units} units · ${sched.campusDays} campus days`,
      '',
      'SECTIONS',
      ...rows.flatMap(({ sel, course, section }) => [
        `[${p.checklist[`sec:${sel.sectionId}`] ? 'x' : ' '}] ${course?.code ?? sel.courseId} ${course?.title ?? ''} — ${section?.instructor ?? ''}`,
        ...(section ? sectionParts(section).map((part) => `      ${part.kind.padEnd(11)} ${part.id}  ${part.tba ? 'time TBA' : part.times.join(', ')}`) : []),
      ]),
      '',
      'STEPS',
      ...steps.map((s, i) => `[${p.checklist[`step:${i}`] ? 'x' : ' '}] ${s}`),
      '',
      'UNKNOWNS TO RESOLVE',
      ...(unknowns.length ? unknowns.map((u) => `- ${u}`) : ['- none flagged']),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'trojanplanner-checklist.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const Item = ({ k, children, accent }: { k: string; children: ReactNode; accent?: string }) => (
    <label className={cn('flex gap-3 items-start rounded-lg border bg-card p-3 cursor-pointer transition-all', accent && 'border-l-4', p.checklist[k] && 'bg-secondary/50')}
      style={accent ? { borderLeftColor: accent } : undefined}>
      <Checkbox disabled={stale} checked={!!p.checklist[k]} onCheckedChange={() => p.toggleCheck(k)} className="mt-0.5" data-testid={`checkbox-${k}`} />
      <div className={cn('flex-1 min-w-0 text-sm transition-opacity', p.checklist[k] && 'opacity-60', p.checklist[k] && !accent && 'line-through decoration-primary/50')}>{children}</div>
    </label>
  );

  return (
    <div className="mx-auto max-w-[900px] px-4 md:px-6 py-6">
      <PageHeader eyebrow={`${catalog.term} · ${done}/${total} done`} title="Registration checklist">
        <div className="flex gap-2 no-print">
          <Button variant="outline" disabled={stale} onClick={() => window.print()} data-testid="button-print"><Printer className="size-4" />Print</Button>
          <Button disabled={stale} onClick={exportText} data-testid="button-export"><Download className="size-4" />Download .txt</Button>
        </div>
      </PageHeader>
      {stale && (
        <div role="alert" className="mb-4 rounded-xl border border-accent bg-accent/15 p-3 text-sm" data-testid="status-checklist-stale">Your rules changed after this plan was solved. Checking and export are paused until you <Link href="/" className="underline font-semibold">re-solve on the planner</Link>.</div>
      )}
      <div className="h-1.5 rounded-full bg-muted mb-6 overflow-hidden"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${(done / total) * 100}%` }} /></div>
      <p className="text-sm mb-4"><strong>{sched.title}</strong> · {sched.units} units · {sched.campusDays} campus days. This list does not reserve seats.</p>

      <h2 className="text-base font-semibold">Sections to register</h2>
      <p className="text-xs text-muted-foreground mt-0.5 mb-2">The numbers are USC section numbers. Register every number listed for a course together: the lecture plus its linked discussion or quiz.</p>
      <div className="space-y-2 mb-6">
        {rows.map(({ sel, course, section }) => (
          <Item key={sel.sectionId} k={`sec:${sel.sectionId}`} accent={course?.color}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className={cn(p.checklist[`sec:${sel.sectionId}`] && 'line-through decoration-primary/50')}>
                <span className="font-semibold">{course?.code ?? sel.courseId}</span> <span className="text-muted-foreground">{course?.title}</span>
              </p>
              <span className="text-xs text-muted-foreground">{course?.units} units · {section?.instructor}</span>
            </div>
            {section && (
              <ul className="mt-2 space-y-1" data-testid={`parts-${sel.courseId}`}>
                {sectionParts(section).map((part) => (
                  <li key={part.id} className="flex items-center gap-3 text-xs">
                    <span className="w-20 shrink-0 text-muted-foreground">{part.kind}</span>
                    <span className="font-mono tabular-nums rounded bg-secondary px-1.5 py-0.5">{part.id}</span>
                    <span className={cn(part.tba && 'font-medium text-amber-700')}>{part.tba ? 'Time TBA, not checked for conflicts' : part.times.join(', ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </Item>
        ))}
      </div>
      <h2 className="text-base font-semibold mb-2">Before your window</h2>
      <div className="space-y-2 mb-6">{steps.map((s, i) => <Item key={i} k={`step:${i}`}>{s}</Item>)}</div>

      <h2 className="text-base font-semibold mb-2 flex items-center gap-2"><HelpCircle className="size-5 text-primary" />Unknowns ({unknowns.length})</h2>
      <p className="text-xs text-muted-foreground mb-2">Unknown is not zero. These are gaps in the evidence, not good news.</p>
      {unknowns.length ? (
        <ul className="rounded-xl border bg-card divide-y" data-testid="list-unknowns">{unknowns.map((u, i) => <li key={i} className="px-4 py-2 text-sm">{u}</li>)}</ul>
      ) : <p className="text-sm italic text-muted-foreground">No unknowns flagged for this plan.</p>}
    </div>
  );
}

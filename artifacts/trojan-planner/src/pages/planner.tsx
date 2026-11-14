import { useMemo } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Wrench, ArrowRight, ListChecks, Info } from 'lucide-react';
import type { Catalog, Constraint, PlannerInput, Repair } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CatalogGate } from '@/components/gate';
import { WeekCalendar } from '@/components/week-calendar';
import { ConstraintEditor } from '@/components/constraint-editor';
import { Copilot } from '@/components/copilot';
import { usePlanner } from '@/lib/planner-store';
import { fmtTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function PlannerPage() {
  return <CatalogGate>{(catalog) => <Planner catalog={catalog} />}</CatalogGate>;
}

function Planner({ catalog }: { catalog: Catalog }) {
  const p = usePlanner();
  const { toast } = useToast();
  const input = p.input ?? catalog.defaultInput;
  const result = p.result;
  const locked = useMemo(() => new Set(input.constraints.filter((c) => c.kind === 'lock_section' && c.enabled).map((c) => (c.value.includes(':') ? c.value.split(':')[1] : c.value))), [input.constraints]);

  const toggleLock = (courseId: string, sectionId: string) => {
    const course = catalog.courses.find((c) => c.id === courseId);
    if (locked.has(sectionId)) {
      p.updateConstraints((cs) => cs.filter((c) => !(c.kind === 'lock_section' && (c.value === sectionId || c.value.endsWith(`:${sectionId}`)))));
      toast({ title: `Unlocked ${course?.code} §${sectionId}`, description: 'Re-solve to let the planner move it.' });
    } else {
      if (input.constraints.length >= 20) { toast({ title: 'Rule limit reached', description: 'Remove a rule before locking another section.', variant: 'destructive' }); return; }
      const c: Constraint = { id: `lock-${sectionId}`, label: `Keep ${course?.code ?? courseId} §${sectionId}`, kind: 'lock_section', hard: true, enabled: true, value: sectionId, days: [], start: 0, end: 0 };
      p.updateConstraints((cs) => [...cs.filter((x) => x.id !== c.id), c]);
      toast({ title: `Locked ${course?.code} §${sectionId}`, description: 'Saved as an explicit hard rule.' });
    }
  };

  const applyRepair = (r: Repair) => {
    p.setInput(r.input);
    void p.solve(r.input);
    toast({ title: 'Repair approved', description: r.title });
  };

  const addProposals = (added: Constraint[], resolve: boolean) => {
    const next: PlannerInput = { ...input, constraints: [...input.constraints, ...added] };
    p.setInput(next);
    toast({ title: `Added ${added.length} rule${added.length === 1 ? '' : 's'}` });
    if (resolve) void p.solve(next);
  };

  const sched = p.chosen;
  const solving = p.solveState === 'solving';
  const stale = p.dirty;
  const infeasible = result && (result.status === 'infeasible' || result.schedules.length === 0);

  return (
    <div className="mx-auto max-w-[1440px] px-4 md:px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5 rise">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-primary">{catalog.term} · weekly plan</p>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold mt-1">
            {sched ? sched.title : infeasible ? 'Some rules disagree.' : 'Your week, sorted.'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <SolveStatus />
          <Button onClick={() => p.solve()} disabled={solving} data-testid="button-solve" className={cn(p.dirty && !solving && 'ring-2 ring-accent ring-offset-2 ring-offset-background')}>
            <RefreshCw className={cn('size-4', solving && 'animate-spin')} />{solving ? 'Solving…' : p.dirty ? 'Re-solve with changes' : 'Re-solve'}
          </Button>
        </div>
      </div>

      {stale && result && !solving && (
        <div className="mb-4 rounded-xl border border-accent bg-accent/15 p-3 text-sm flex items-center gap-3" data-testid="status-stale">
          <Info className="size-4 text-primary shrink-0" /><span className="flex-1">Showing the last solved plan. Your rules have changed since, so it may no longer fit. Re-solve to update.</span>
        </div>
      )}
      {p.solveError && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 flex gap-3 items-start" role="alert" data-testid="status-solve-error">
          {p.solveState === 'timeout' ? <Clock className="size-5 text-destructive" /> : <AlertTriangle className="size-5 text-destructive" />}
          <div className="flex-1 text-sm"><p className="font-semibold">{p.solveState === 'timeout' ? 'Solver timed out' : 'Solver error'}</p><p className="text-muted-foreground">{p.solveError}</p></div>
          <Button size="sm" variant="outline" onClick={() => p.solve()} data-testid="button-retry-solve">Retry</Button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="space-y-4 min-w-0">
          {result && result.schedules.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Schedule options">
              {result.schedules.map((s, i) => (
                <button key={s.id} role="tab" aria-selected={sched?.id === s.id} onClick={() => p.chooseSchedule(s.id)} data-testid={`tab-schedule-${s.id}`}
                  className={cn('shrink-0 rounded-lg border px-3 py-2 text-left transition-all', sched?.id === s.id ? 'border-primary bg-primary/5 shadow-sm' : 'bg-card hover:border-primary/40')}>
                  <p className="text-[10px] font-mono text-muted-foreground">OPTION {String.fromCharCode(65 + i)} · score {s.score.toFixed(1)}</p>
                  <p className="text-sm font-semibold">{s.title}</p>
                </button>
              ))}
            </div>
          )}

          {sched && (
            <dl className="grid grid-cols-3 sm:grid-cols-6 gap-px rounded-xl overflow-hidden border bg-border" data-testid="stats-schedule">
              {[
                ['Units', sched.units],
                ['Campus days', sched.campusDays],
                ['Class hrs', sched.classHours.toFixed(1)],
                ['Gaps', `${Math.round(sched.gapMinutes)}m`],
                ['First class', fmtTime(sched.earliestStart)],
                ['Score', sched.score.toFixed(1)],
              ].map(([k, v]) => (
                <div key={k} className="bg-card px-3 py-2"><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt><dd className="font-display text-xl font-bold">{v}</dd></div>
              ))}
            </dl>
          )}

          {infeasible && result && <Conflicts result={result} catalog={catalog} input={input} onApprove={applyRepair} solving={solving} stale={stale} />}

          <WeekCalendar catalog={catalog} schedule={sched && !infeasible ? sched : null} constraints={input.constraints} lockedSectionIds={locked} onToggleLock={toggleLock} dim={solving} />
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Info className="size-3.5" />Click a class to lock that exact section as a hard rule. Hatched areas are your blocked time.</p>

          {sched && !infeasible && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card p-4">
                <h3 className="font-display font-semibold mb-2">Why these sections</h3>
                <ul className="space-y-2">
                  {sched.selections.map((s) => {
                    const c = catalog.courses.find((x) => x.id === s.courseId);
                    return (
                      <li key={s.sectionId} className="flex gap-2 text-sm" data-testid={`text-selection-${s.courseId}`}>
                        <span className="mt-1.5 size-2.5 rounded-full shrink-0" style={{ background: c?.color }} />
                        <span><Link href={`/courses?c=${s.courseId}`} className="font-semibold hover:underline">{c?.code ?? s.courseId} §{s.sectionId}</Link> <span className="text-muted-foreground">— {s.reason}</span></span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs border-t pt-3 text-muted-foreground"><strong className="text-foreground">Assessment mix:</strong> {sched.assessmentSummary}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-display font-semibold">Checks</h3>
                <ul className="space-y-1.5">{sched.checks.map((c, i) => <li key={i} className="flex gap-2 text-sm"><CheckCircle2 className="size-4 text-emerald-700 shrink-0 mt-0.5" />{c}</li>)}</ul>
                {sched.warnings.length > 0 && <ul className="space-y-1.5">{sched.warnings.map((w, i) => <li key={i} className="flex gap-2 text-sm"><AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />{w}</li>)}</ul>}
                <Link href="/checklist" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all" data-testid="link-to-checklist"><ListChecks className="size-4" />Build my registration checklist<ArrowRight className="size-4" /></Link>
              </div>
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-24 self-start">
          <Tabs defaultValue="copilot">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="copilot" data-testid="tab-copilot">Copilot</TabsTrigger>
              <TabsTrigger value="rules" data-testid="tab-rules">Rules & blocks <span className="ml-1.5 text-[10px] font-mono opacity-70">{input.constraints.length}</span></TabsTrigger>
            </TabsList>
            <TabsContent value="copilot" className="mt-3">
              <Copilot catalog={catalog} input={input} onApply={addProposals} />
            </TabsContent>
            <TabsContent value="rules" className="mt-3">
              <ConstraintEditor catalog={catalog} constraints={input.constraints} onChange={p.updateConstraints} />
              {p.dirty && <p className="mt-3 text-xs text-primary font-medium" data-testid="text-dirty">Rules changed. Re-solve to see the effect.</p>}
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}

function SolveStatus() {
  const { result, solveState } = usePlanner();
  const label =
    solveState === 'solving' ? 'Solving' :
    solveState === 'timeout' ? 'Timed out' :
    solveState === 'error' ? 'Error' :
    result ? result.status : 'Not solved';
  const tone = solveState === 'error' || solveState === 'timeout' || result?.status === 'infeasible' || result?.status === 'invalid' ? 'bg-destructive' : solveState === 'solving' ? 'bg-accent animate-pulse' : 'bg-emerald-600';
  return (
    <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground px-3 py-2 rounded-md border bg-card" data-testid="status-solve" aria-live="polite">
      <span className={cn('size-2 rounded-full', tone)} />
      <span className="uppercase">{label}</span>
      {result && solveState !== 'solving' && <span className="opacity-70">· {result.engine} · {result.elapsedMs}ms</span>}
    </div>
  );
}

function Conflicts({ result, catalog, input, onApprove, solving, stale }: { result: NonNullable<ReturnType<typeof usePlanner>['result']>; catalog: Catalog; input: PlannerInput; onApprove: (r: Repair) => void; solving: boolean; stale: boolean }) {
  return (
    <div className="rounded-xl border-2 border-primary/30 bg-card p-4 md:p-5 rise" data-testid="panel-conflicts">
      <div className="flex gap-3">
        <Wrench className="size-5 text-primary shrink-0 mt-1" />
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold">No plan fits every rule — here's why</h2>
          <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
          <ul className="mt-3 space-y-1">{result.conflicts.map((c, i) => <li key={i} className="text-sm flex gap-2"><span className="text-primary font-bold">·</span>{c}</li>)}</ul>
        </div>
      </div>
      {stale && <p className="mt-3 text-xs font-semibold text-destructive" data-testid="text-repairs-stale">Your rules changed since these repairs were computed. Re-solve to get current repairs.</p>}
      {result.repairs.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {result.repairs.map((r) => {
            const removed = r.removedConstraintIds.map((id) => input.constraints.find((c) => c.id === id)?.label ?? id);
            return (
              <div key={r.id} className="rounded-lg border bg-background p-4 flex flex-col" data-testid={`card-repair-${r.id}`}>
                <p className="font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-1 flex-1">{r.explanation}</p>
                {removed.length > 0 && <p className="text-xs mt-2"><span className="font-semibold">Changes:</span> {removed.join(', ')}</p>}
                <div className="mt-2 text-xs font-mono text-muted-foreground">
                  Preview: {r.preview.selections.map((s) => catalog.courses.find((c) => c.id === s.courseId)?.code ?? s.courseId).join(' + ')} · {r.preview.units}u · {r.preview.campusDays} days
                </div>
                <Button size="sm" className="mt-3" disabled={solving || stale} onClick={() => onApprove(r)} data-testid={`button-approve-repair-${r.id}`}>Approve this repair</Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No automatic repairs found. Try disabling a hard rule in Rules & blocks.</p>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">Nothing is relaxed until you approve. Approving applies exactly the shown change and re-solves.</p>
    </div>
  );
}

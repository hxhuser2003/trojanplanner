import { useMemo } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, RefreshCw, Wrench, ListChecks, Info } from 'lucide-react';
import type { Catalog, Constraint, PlannerInput, Repair } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
    <div className="mx-auto max-w-[1280px] px-4 md:px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {infeasible ? 'Some rules conflict' : `Your ${catalog.term} schedule`}
          </h1>
          <SolveStatus />
        </div>
        {p.dirty || !sched ? (
          <Button onClick={() => p.solve()} disabled={solving} data-testid="button-solve">
            <RefreshCw className={cn('size-4', solving && 'animate-spin')} />{solving ? 'Solving…' : 'Update plan'}
          </Button>
        ) : (
          <Button asChild data-testid="link-to-checklist">
            <Link href="/checklist"><ListChecks className="size-4" />Build checklist</Link>
          </Button>
        )}
      </div>

      {stale && result && !solving && (
        <div className="mb-4 rounded-lg border bg-secondary/60 px-3 py-2 text-sm flex items-center gap-2" data-testid="status-stale">
          <Info className="size-4 text-muted-foreground shrink-0" />Rules changed. Update the plan to see the effect.
        </div>
      )}
      {p.solveError && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex gap-3 items-center" role="alert" data-testid="status-solve-error">
          {p.solveState === 'timeout' ? <Clock className="size-4 text-destructive" /> : <AlertTriangle className="size-4 text-destructive" />}
          <div className="flex-1 text-sm"><span className="font-medium">{p.solveState === 'timeout' ? 'Solver timed out.' : 'Solver error.'}</span> <span className="text-muted-foreground">{p.solveError}</span></div>
          <Button size="sm" variant="outline" onClick={() => p.solve()} data-testid="button-retry-solve">Retry</Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4 min-w-0">
          {result && result.schedules.length > 1 && !infeasible && (
            <div className="inline-flex max-w-full overflow-x-auto rounded-lg bg-secondary p-1 gap-1" role="tablist" aria-label="Schedule options">
              {result.schedules.map((s) => (
                <button key={s.id} role="tab" aria-selected={sched?.id === s.id} onClick={() => p.chooseSchedule(s.id)} data-testid={`tab-schedule-${s.id}`}
                  className={cn('shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors', sched?.id === s.id ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground')}>
                  {s.title}
                </button>
              ))}
            </div>
          )}

          {sched && !infeasible && (
            <dl className="flex flex-wrap gap-x-8 gap-y-2" data-testid="stats-schedule">
              {[
                ['Units', sched.units],
                ['Campus days', sched.campusDays],
                ['Class hours', sched.classHours.toFixed(1)],
                ['First class', fmtTime(sched.earliestStart)],
              ].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-lg font-semibold tabular-nums">{v}</dd></div>
              ))}
            </dl>
          )}

          {infeasible && result && <Conflicts result={result} catalog={catalog} input={input} onApprove={applyRepair} solving={solving} stale={stale} />}

          <WeekCalendar catalog={catalog} schedule={sched && !infeasible ? sched : null} constraints={input.constraints} lockedSectionIds={locked} onToggleLock={toggleLock} dim={solving} />

          {sched && !infeasible && (
            <Collapsible className="rounded-lg border">
              <CollapsibleTrigger className="group w-full flex items-center justify-between px-4 py-3 text-sm font-medium" data-testid="button-details">
                Why these sections
                <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 space-y-4">
                <ul className="space-y-2">
                  {sched.selections.map((s) => {
                    const c = catalog.courses.find((x) => x.id === s.courseId);
                    return (
                      <li key={s.sectionId} className="flex gap-2 text-sm" data-testid={`text-selection-${s.courseId}`}>
                        <span className="mt-1.5 size-2 rounded-full shrink-0" style={{ background: c?.color }} />
                        <span><Link href={`/courses?c=${s.courseId}`} className="font-medium hover:underline">{c?.code ?? s.courseId} §{s.sectionId}</Link> <span className="text-muted-foreground">{s.reason}</span></span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-sm text-muted-foreground">{sched.assessmentSummary}</p>
                <ul className="space-y-1.5 border-t pt-3">
                  {sched.checks.map((c, i) => <li key={i} className="flex gap-2 text-sm"><CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />{c}</li>)}
                  {sched.warnings.map((w, i) => <li key={`w${i}`} className="flex gap-2 text-sm"><AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />{w}</li>)}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          )}
        </section>

        <aside className="lg:sticky lg:top-20 self-start">
          <Tabs defaultValue="copilot">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="copilot" data-testid="tab-copilot">Ask</TabsTrigger>
              <TabsTrigger value="rules" data-testid="tab-rules">Rules <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{input.constraints.length}</span></TabsTrigger>
            </TabsList>
            <TabsContent value="copilot" className="mt-3">
              <Copilot catalog={catalog} input={input} onApply={addProposals} />
            </TabsContent>
            <TabsContent value="rules" className="mt-3">
              <ConstraintEditor catalog={catalog} constraints={input.constraints} onChange={p.updateConstraints} />
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
    solveState === 'solving' ? 'Solving…' :
    solveState === 'timeout' ? 'Timed out' :
    solveState === 'error' ? 'Error' :
    result ? result.status.charAt(0).toUpperCase() + result.status.slice(1) : 'Not solved yet';
  const bad = solveState === 'error' || solveState === 'timeout' || result?.status === 'infeasible' || result?.status === 'invalid';
  return (
    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="status-solve" aria-live="polite"
      title={result ? `${result.engine} · ${result.elapsedMs} ms` : undefined}>
      <span className={cn('size-1.5 rounded-full', bad ? 'bg-destructive' : solveState === 'solving' ? 'bg-muted-foreground animate-pulse' : 'bg-emerald-500')} />
      {label}{result && solveState !== 'solving' && ` · ${result.elapsedMs} ms`}
    </p>
  );
}

function Conflicts({ result, catalog, input, onApprove, solving, stale }: { result: NonNullable<ReturnType<typeof usePlanner>['result']>; catalog: Catalog; input: PlannerInput; onApprove: (r: Repair) => void; solving: boolean; stale: boolean }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-card p-4 md:p-5 rise" data-testid="panel-conflicts">
      <div className="flex gap-3">
        <Wrench className="size-4 text-primary shrink-0 mt-1" />
        <div className="flex-1">
          <h2 className="font-semibold">No plan fits every rule</h2>
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
    </div>
  );
}

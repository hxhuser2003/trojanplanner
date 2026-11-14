import { useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { useSolvePlanner, type Catalog, type Constraint, type PlannerInput, type Schedule, type SolveResult } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CHIPS, MAX_RULES } from '@/components/quick-rules';
import { StatTable } from '@/components/compare';
import { diffSchedules, errMessage } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface WhatIf {
  description: string;
  input: PlannerInput;
  result: SolveResult;
}

/** Builds a hypothetical input from the current one. Nothing here changes the student's real rules. */
export function WhatIfPanel({ input, onResult }: { input: PlannerInput; onResult: (w: WhatIf) => void }) {
  const solve = useSolvePlanner();
  const [drop, setDrop] = useState<Set<string>>(new Set());
  const [add, setAdd] = useState<Set<string>>(new Set());
  const [maxUnits, setMaxUnits] = useState(input.maxUnits);
  const enabled = input.constraints.filter((c) => c.enabled);
  const addable = CHIPS.filter((chip) => !input.constraints.some((c) => c.enabled && chip.matches(c)));
  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, k: string) => { const n = new Set(set); if (n.has(k)) n.delete(k); else n.add(k); setter(n); };

  const changes = [
    ...enabled.filter((c) => drop.has(c.id)).map((c) => `drop “${c.label}”`),
    ...addable.filter((c) => add.has(c.key)).map((c) => `add “${c.label}”`),
    ...(maxUnits !== input.maxUnits ? [`max ${maxUnits} units`] : []),
  ];

  const run = async () => {
    const added: Constraint[] = addable.filter((c) => add.has(c.key)).map((c) => c.make());
    const kept = input.constraints.filter((c) => !drop.has(c.id));
    const replaced = new Set(addable.filter((c) => add.has(c.key) && c.replacesKind).map((c) => c.replacesKind));
    const constraints = [...kept.filter((c) => !replaced.has(c.kind)), ...added].slice(0, MAX_RULES);
    const hypo: PlannerInput = { ...input, constraints, maxUnits, minUnits: Math.min(input.minUnits, maxUnits) };
    try {
      const result = await solve.mutateAsync({ data: hypo });
      onResult({ description: changes.join(', '), input: hypo, result });
    } catch { /* shown below */ }
  };

  return (
    <div className="space-y-4" data-testid="panel-whatif">
      <p className="text-xs text-muted-foreground">Try a change without touching your plan. The solver runs it separately and you can compare before applying.</p>
      {enabled.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-medium text-muted-foreground">Drop a rule</h3>
          <div className="flex flex-wrap gap-1.5">
            {enabled.map((c) => (
              <button key={c.id} onClick={() => toggle(drop, setDrop, c.id)} aria-pressed={drop.has(c.id)} data-testid={`whatif-drop-${c.id}`}
                className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors', drop.has(c.id) ? 'bg-foreground text-background border-foreground line-through' : 'text-muted-foreground hover:text-foreground')}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {addable.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-medium text-muted-foreground">Add a rule</h3>
          <div className="flex flex-wrap gap-1.5">
            {addable.map((c) => (
              <button key={c.key} onClick={() => toggle(add, setAdd, c.key)} aria-pressed={add.has(c.key)} data-testid={`whatif-add-${c.key}`}
                className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors', add.has(c.key) ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground hover:text-foreground')}>
                + {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Label htmlFor="whatif-max" className="text-xs font-medium text-muted-foreground">Max units</Label>
        <Input id="whatif-max" type="number" min={0} max={20} value={maxUnits} className="w-20 h-8"
          onChange={(e) => setMaxUnits(Math.max(0, Math.min(20, Number(e.target.value) || 0)))} data-testid="input-whatif-max" />
      </div>
      <Button className="w-full" variant="secondary" disabled={!changes.length || solve.isPending} onClick={run} data-testid="button-whatif-run">
        <FlaskConical className="size-4" />{solve.isPending ? 'Simulating…' : 'Simulate'}
      </Button>
      {solve.isError && <p className="text-xs text-destructive" role="alert">{errMessage(solve.error)}</p>}
    </div>
  );
}

/** Current vs hypothetical, side by side, with an explicit apply step. */
export function WhatIfResult({ catalog, current, whatIf, showing, onShow, onApply, onDiscard }: {
  catalog: Catalog; current: Schedule | null; whatIf: WhatIf; showing: boolean;
  onShow: (v: boolean) => void; onApply: () => void; onDiscard: () => void;
}) {
  const next = whatIf.result.schedules[0] ?? null;
  const diff = diffSchedules(current, next);
  const code = (id: string) => catalog.courses.find((c) => c.id === id)?.code ?? id;
  return (
    <div className="rounded-lg border border-primary/40 bg-card p-4 space-y-3 rise" data-testid="panel-whatif-result">
      <div className="flex items-start gap-3">
        <FlaskConical className="size-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">What if you {whatIf.description}?</p>
          <p className="text-xs text-muted-foreground">Simulation only. Your rules have not changed.</p>
        </div>
        <button onClick={onDiscard} className="p-1 rounded hover:bg-secondary" aria-label="Discard what-if" data-testid="button-whatif-discard"><X className="size-4" /></button>
      </div>
      {next ? (
        <>
          <StatTable catalog={catalog} columns={[{ title: 'Now', schedule: current }, { title: 'What if', schedule: next }]} />
          {!diff.same && (
            <ul className="text-xs space-y-0.5 text-muted-foreground">
              {diff.added.map((x) => <li key={`a${x.courseId}`}>+ adds {code(x.courseId)} §{x.sectionId}</li>)}
              {diff.removed.map((x) => <li key={`r${x.courseId}`}>− drops {code(x.courseId)}</li>)}
              {diff.moved.map((x) => <li key={`m${x.courseId}`}>↔ {code(x.courseId)} moves §{x.from} → §{x.to}</li>)}
            </ul>
          )}
          {diff.same && <p className="text-xs text-muted-foreground">Same schedule. This change would not affect your plan.</p>}
        </>
      ) : (
        <p className="text-sm">Still no schedule fits.{whatIf.result.conflicts.length > 0 && ` Conflicting rules: ${whatIf.result.conflicts.join(', ')}.`}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {next && (
          <div className="inline-flex rounded-md bg-secondary p-0.5" role="tablist" aria-label="Calendar shows">
            {[['Now', false], ['What if', true]].map(([l, v]) => (
              <button key={String(l)} role="tab" aria-selected={showing === v} onClick={() => onShow(v as boolean)} data-testid={`tab-whatif-${v ? 'hypo' : 'now'}`}
                className={cn('px-2.5 py-1 text-xs rounded', showing === v ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground')}>{l}</button>
            ))}
          </div>
        )}
        <Button size="sm" className="ml-auto" onClick={onApply} data-testid="button-whatif-apply">Apply this change</Button>
      </div>
    </div>
  );
}

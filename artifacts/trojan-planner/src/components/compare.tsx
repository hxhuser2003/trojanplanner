import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Catalog, PlannerInput, Schedule } from '@workspace/api-client-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ExplainButton } from '@/components/explain';
import { fmtTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const refs = (s: Schedule) => s.selections.map((x) => ({ courseId: x.courseId, sectionId: x.sectionId }));

/** Side-by-side numbers for 2+ validated schedules. Cells that differ from the first column are emphasized. */
export function StatTable({ catalog, columns }: { catalog: Catalog; columns: { title: string; schedule: Schedule | null }[] }) {
  const rows: [string, (s: Schedule) => string][] = [
    ['Courses', (s) => s.selections.map((x) => `${catalog.courses.find((c) => c.id === x.courseId)?.code ?? x.courseId} §${x.sectionId}`).join(', ')],
    ['Units', (s) => String(s.units)],
    ['Campus days', (s) => String(s.campusDays)],
    ['Class hours', (s) => s.classHours.toFixed(1)],
    ['First class', (s) => fmtTime(s.earliestStart)],
    ['Gaps', (s) => `${s.gapMinutes} min`],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid="table-compare">
        <thead>
          <tr className="text-xs text-muted-foreground text-left">
            <th className="font-normal py-1.5 pr-3" />
            {columns.map((c) => <th key={c.title} className="font-medium py-1.5 px-2">{c.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, f]) => {
            const base = columns[0]?.schedule ? f(columns[0].schedule) : '';
            return (
              <tr key={label} className="border-t align-top">
                <td className="py-1.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">{label}</td>
                {columns.map((c, i) => {
                  const v = c.schedule ? f(c.schedule) : 'No plan';
                  return <td key={c.title} className={cn('py-1.5 px-2 tabular-nums', label === 'Courses' && 'text-xs', i > 0 && v !== base && 'font-semibold text-primary')}>{v}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function OptionCompare({ catalog, schedules, chosen, input }: { catalog: Catalog; schedules: Schedule[]; chosen: Schedule; input: PlannerInput }) {
  const others = schedules.filter((s) => s.id !== chosen.id);
  const [otherId, setOtherId] = useState<string | null>(null);
  const other = others.find((s) => s.id === otherId) ?? others[0];
  if (!other) return null;
  return (
    <Collapsible className="rounded-lg border">
      <CollapsibleTrigger className="group w-full flex items-center justify-between px-4 py-3 text-sm font-medium" data-testid="button-compare">
        Compare options
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        <StatTable catalog={catalog} columns={[chosen, ...others].map((s) => ({ title: s.id === chosen.id ? `${s.title} (shown)` : s.title, schedule: s }))} />
        <div className="space-y-2 border-t pt-3">
          {others.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Explain the difference with</span>
              {others.map((s) => (
                <button key={s.id} onClick={() => setOtherId(s.id)} aria-pressed={other.id === s.id}
                  className={cn('px-2 py-0.5 rounded-md border', other.id === s.id ? 'border-primary text-primary' : 'text-muted-foreground')}>{s.title}</button>
              ))}
            </div>
          )}
          <ExplainButton label={`What's the difference vs "${other.title}"?`}
            request={{ mode: 'compare', input, selections: refs(chosen), otherSelections: refs(other) }} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

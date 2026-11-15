import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Catalog, PlannerInput, Schedule } from '@workspace/api-client-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ExplainButton } from '@/components/explain';
import { SectionDelivery } from '@/components/section-delivery';
import { fmtHours, fmtTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const refs = (s: Schedule) => s.selections.map((x) => ({ courseId: x.courseId, sectionId: x.sectionId }));

/** Compact summaries for validated schedules. Values that differ from the shown plan are emphasized. */
function OptionCards({ catalog, columns }: { catalog: Catalog; columns: { title: string; schedule: Schedule }[] }) {
  const rows: [string, (s: Schedule) => string][] = [
    ['Units', (s) => String(s.units)],
    ['Class days', (s) => String(s.campusDays)],
    ['Class time / week', (s) => fmtHours(s.classHours)],
    ['First class', (s) => fmtTime(s.earliestStart)],
    ['Gaps', (s) => `${s.gapMinutes} min`],
  ];
  const courses = (s: Schedule) => s.selections.map((x) => {
    const course = catalog.courses.find((c) => c.id === x.courseId);
    return { code: course?.code ?? x.courseId, section: course?.sections.find((section) => section.id === x.sectionId), sectionId: x.sectionId };
  });
  const shown = columns[0].schedule;
  return (
    <div className="space-y-3" data-testid="compare-options">
      {columns.map(({ title, schedule }, index) => {
        const selected = courses(schedule);
        const coursesDiffer = index > 0 && selected.map((item) => `${item.code}:${item.sectionId}`).join(',') !== courses(shown).map((item) => `${item.code}:${item.sectionId}`).join(',');
        return (
          <div key={schedule.id} className="rounded-md border bg-background p-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 text-sm font-medium leading-snug">{title}</h3>
              {index === 0 && <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">Shown</span>}
            </div>
            <dl className="mt-2 divide-y text-sm">
              <div className="grid grid-cols-2 gap-3 py-1.5">
                <dt className="text-muted-foreground">Courses</dt>
                <dd className={cn('min-w-0 space-y-1 text-right text-xs', coursesDiffer && 'font-semibold text-primary')}>
                  {selected.map(({ code, section, sectionId }) => <div key={`${code}-${sectionId}`} className="flex flex-wrap items-center justify-end gap-1"><span>{code}</span>{section && <SectionDelivery section={section} />}</div>)}
                </dd>
              </div>
              {rows.map(([label, value]) => {
                const text = value(schedule);
                return (
                  <div key={label} className="grid grid-cols-2 gap-3 py-1.5">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className={cn('text-right tabular-nums', index > 0 && text !== value(shown) && 'font-semibold text-primary')}>{text}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        );
      })}
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
        <OptionCards catalog={catalog} columns={[chosen, ...others].map((s) => ({ title: s.title, schedule: s }))} />
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

import { Link } from 'wouter';
import { Lock, LockOpen } from 'lucide-react';
import type { Catalog, Constraint, PlannerInput, Schedule } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ExplainButton } from '@/components/explain';
import { DAYS, fmtTime, latestEndTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const START = 8 * 60;
const END = 22 * 60;
const PX = 0.9; // px per minute

interface Props {
  catalog: Catalog;
  schedule: Schedule | null;
  constraints: Constraint[];
  lockedSectionIds: Set<string>;
  onToggleLock: (courseId: string, sectionId: string) => void;
  dim?: boolean;
  /** When set, clicking a block opens details with an Explain action. Omit for read-only previews. */
  input?: PlannerInput;
}

export function WeekCalendar({ catalog, schedule, constraints, lockedSectionIds, onToggleLock, dim, input }: Props) {
  const hours: number[] = [];
  for (let m = START; m < END; m += 60) hours.push(m);
  const height = (END - START) * PX;
  const top = (m: number) => (Math.max(Math.min(m, END), START) - START) * PX;

  const blocks = constraints.filter((c) => c.enabled && (c.kind === 'blocked' || c.kind === 'no_day'));
  const earliest = constraints.find((c) => c.enabled && c.kind === 'earliest');
  const latest = constraints.find((c) => c.enabled && c.kind === 'latest');

  return (
    <div className={cn('rounded-lg border bg-card overflow-x-auto transition-opacity', dim && 'opacity-50')} data-testid="calendar-week">
      <div className="min-w-[640px]">
        {schedule && latestEndTime(catalog, schedule) !== null && (
          <div className="flex items-center justify-end gap-1.5 border-b px-3 py-1.5 text-xs text-muted-foreground" data-testid="calendar-latest-end">
            <span>Latest scheduled end</span><span className="font-mono font-semibold text-foreground">{fmtTime(latestEndTime(catalog, schedule)!)}</span>
          </div>
        )}
        <div className="grid grid-cols-[52px_repeat(5,1fr)] border-b sticky top-0 bg-card z-10">
          <div />
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground border-l">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-[52px_repeat(5,1fr)] relative" style={{ height }}>
          <div className="relative">
            {hours.map((h) => (
              <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground" style={{ top: top(h) }}>
                {h === START ? '' : fmtTime(h).replace(':00', '')}
              </div>
            ))}
          </div>
          {DAYS.map((_, day) => (
            <div key={day} className="relative border-l">
              {hours.map((h) => <div key={h} className="absolute inset-x-0 border-t border-border/60" style={{ top: top(h) }} />)}
              {earliest && earliest.start > START && (
                <div className="absolute inset-x-0 hatch" style={{ top: 0, height: top(earliest.start) }} title={`Before ${fmtTime(earliest.start)}`} />
              )}
              {latest && latest.end < END && (
                <div className="absolute inset-x-0 hatch" style={{ top: top(latest.end), bottom: 0 }} title={`After ${fmtTime(latest.end)}`} />
              )}
              {blocks.filter((b) => b.days.includes(day)).map((b) => (
                <div key={b.id} className={cn('absolute inset-x-0.5 rounded-md hatch border border-dashed flex items-start p-1.5', b.hard ? 'border-foreground/40' : 'border-foreground/20')}
                  style={b.kind === 'no_day' ? { top: 0, height } : { top: top(b.start), height: Math.max(top(b.end) - top(b.start), 14) }}>
                  <span className="text-[10px] text-muted-foreground leading-tight">{b.label}{b.hard ? '' : ' (soft)'}</span>
                </div>
              ))}
              {schedule?.selections.map((sel) => {
                const course = catalog.courses.find((c) => c.id === sel.courseId);
                const section = course?.sections.find((s) => s.id === sel.sectionId);
                if (!course || !section) return null;
                const locked = lockedSectionIds.has(section.id);
                return section.meetings.filter((m) => m.day === day).map((m, i) => {
                  const block = (
                    <button key={`${section.id}-${i}`} type="button"
                      onClick={input ? undefined : () => onToggleLock(course.id, section.id)}
                      data-testid={`block-${course.id}-${day}-${i}`}
                      aria-label={`${course.code} ${m.kind} ${fmtTime(m.start)} to ${fmtTime(m.end)}. ${input ? 'Show details' : locked ? 'Unlock section' : 'Lock section'}`}
                      title={input ? 'Details, explain, lock' : locked ? 'Locked. Click to unlock this section' : 'Click to lock this section'}
                      className="group absolute inset-x-1 rounded-md px-2 py-1 text-left overflow-hidden text-foreground border-l-[3px] transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rise"
                      style={{ top: top(m.start), height: Math.max(top(m.end) - top(m.start), 22), background: `color-mix(in srgb, ${course.color} 14%, transparent)`, borderLeftColor: course.color }}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold">{course.code}</span>
                        {locked ? <Lock className="size-3" /> : <LockOpen className="size-3 opacity-0 group-hover:opacity-80 transition-opacity" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-tight">{m.kind} · {fmtTime(m.start)}–{fmtTime(m.end)}</div>
                    </button>
                  );
                  if (!input || !schedule) return block;
                  return (
                    <Popover key={`${section.id}-${i}`}>
                      <PopoverTrigger asChild>{block}</PopoverTrigger>
                      <PopoverContent className="w-80 space-y-3" side="right" align="start" data-testid={`popover-${course.id}`}>
                        <div>
                          <p className="font-semibold text-sm">{course.code}</p>
                          <p className="text-xs text-muted-foreground">{course.title} · {section.instructor}</p>
                          <ul className="mt-1.5 text-xs font-mono text-muted-foreground">
                            {section.meetings.map((x, j) => <li key={j}>{DAYS[x.day]} {fmtTime(x.start)}–{fmtTime(x.end)} · {x.kind}</li>)}
                          </ul>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => onToggleLock(course.id, section.id)} data-testid={`button-lock-${section.id}`}>
                            {locked ? <><LockOpen className="size-3.5" />Unlock</> : <><Lock className="size-3.5" />Lock</>}
                          </Button>
                          <Button size="sm" variant="ghost" asChild><Link href={`/courses?c=${course.id}`}>Course details</Link></Button>
                        </div>
                        <ExplainButton label="Why this section?" variant="secondary"
                          request={{ mode: 'section', input, courseId: course.id, selections: schedule.selections.map((x) => ({ courseId: x.courseId, sectionId: x.sectionId })) }} />
                      </PopoverContent>
                    </Popover>
                  );
                });
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

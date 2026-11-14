import { Lock, LockOpen } from 'lucide-react';
import type { Catalog, Constraint, Schedule } from '@workspace/api-client-react';
import { DAYS, fmtTime } from '@/lib/format';
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
}

export function WeekCalendar({ catalog, schedule, constraints, lockedSectionIds, onToggleLock, dim }: Props) {
  const hours: number[] = [];
  for (let m = START; m < END; m += 60) hours.push(m);
  const height = (END - START) * PX;
  const top = (m: number) => (Math.max(Math.min(m, END), START) - START) * PX;

  const blocks = constraints.filter((c) => c.enabled && (c.kind === 'blocked' || c.kind === 'no_day'));
  const earliest = constraints.find((c) => c.enabled && c.kind === 'earliest');
  const latest = constraints.find((c) => c.enabled && c.kind === 'latest');

  return (
    <div className={cn('rounded-xl border bg-card overflow-x-auto transition-opacity', dim && 'opacity-50')} data-testid="calendar-week">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[52px_repeat(5,1fr)] border-b sticky top-0 bg-card z-10">
          <div />
          {DAYS.map((d) => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground border-l">{d}</div>
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
              {hours.map((h) => <div key={h} className="absolute inset-x-0 border-t border-dashed border-border/70" style={{ top: top(h) }} />)}
              {earliest && earliest.start > START && (
                <div className="absolute inset-x-0 hatch" style={{ top: 0, height: top(earliest.start) }} title={`Before ${fmtTime(earliest.start)}`} />
              )}
              {latest && latest.end < END && (
                <div className="absolute inset-x-0 hatch" style={{ top: top(latest.end), bottom: 0 }} title={`After ${fmtTime(latest.end)}`} />
              )}
              {blocks.filter((b) => b.days.includes(day)).map((b) => (
                <div key={b.id} className={cn('absolute inset-x-0.5 rounded-md hatch border border-dashed flex items-start p-1.5', b.hard ? 'border-foreground/40' : 'border-foreground/20')}
                  style={b.kind === 'no_day' ? { top: 0, height } : { top: top(b.start), height: Math.max(top(b.end) - top(b.start), 14) }}>
                  <span className="text-[10px] font-medium text-foreground/70 leading-tight">{b.label}{b.hard ? '' : ' (soft)'}</span>
                </div>
              ))}
              {schedule?.selections.map((sel) => {
                const course = catalog.courses.find((c) => c.id === sel.courseId);
                const section = course?.sections.find((s) => s.id === sel.sectionId);
                if (!course || !section) return null;
                const locked = lockedSectionIds.has(section.id);
                return section.meetings.filter((m) => m.day === day).map((m, i) => (
                  <button key={`${section.id}-${i}`} type="button"
                    onClick={() => onToggleLock(course.id, section.id)}
                    data-testid={`block-${course.id}-${day}-${i}`}
                    aria-label={`${course.code} ${m.kind} ${fmtTime(m.start)} to ${fmtTime(m.end)}. ${locked ? 'Unlock section' : 'Lock section'}`}
                    className="group absolute inset-x-1 rounded-lg px-2 py-1.5 text-left overflow-hidden shadow-sm ring-1 ring-black/10 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rise"
                    style={{ top: top(m.start), height: Math.max(top(m.end) - top(m.start), 22), background: course.color, color: '#fffaf0' }}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold tracking-wide">{course.code}</span>
                      {locked ? <Lock className="size-3" /> : <LockOpen className="size-3 opacity-0 group-hover:opacity-80 transition-opacity" />}
                    </div>
                    <div className="text-[10px] opacity-90 leading-tight">{m.kind} · {fmtTime(m.start)}</div>
                    <div className="text-[10px] opacity-75 truncate">{m.location}</div>
                  </button>
                ));
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

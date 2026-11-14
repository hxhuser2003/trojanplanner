import { useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { Constraint, ConstraintKind } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DAYS, fmtTime, fromHHMM, newConstraint, toHHMM } from '@/lib/format';
import { cn } from '@/lib/utils';

export const MAX_RULES = 20;

interface Chip {
  key: string;
  label: string;
  make: () => Constraint;
  matches: (c: Constraint) => boolean;
  // Rule kinds that only make sense once (a second "earliest" would shadow the first).
  replacesKind?: ConstraintKind;
}

const rule = (kind: ConstraintKind, label: string, hard: boolean, patch: Partial<Constraint> = {}): Constraint =>
  ({ ...newConstraint(kind, hard), label, ...patch });

export const CHIPS: Chip[] = [
  { key: 'no-fri', label: 'No Friday classes', make: () => rule('no_day', 'Keep Fridays free', true, { days: [4] }),
    matches: (c) => c.kind === 'no_day' && c.days.length === 1 && c.days[0] === 4 },
  { key: 'after-10', label: 'Nothing before 10am', make: () => rule('earliest', 'Nothing before 10 AM', true, { start: 600 }),
    matches: (c) => c.kind === 'earliest' && c.start === 600 && c.hard, replacesKind: 'earliest' },
  { key: 'by-5', label: 'Done by 5pm', make: () => rule('latest', 'Done by 5 PM', true, { end: 1020 }),
    matches: (c) => c.kind === 'latest' && c.end === 1020, replacesKind: 'latest' },
  { key: 'fewer-days', label: 'Fewer campus days', make: () => rule('prefer_fewer_days', 'Prefer fewer campus days', false),
    matches: (c) => c.kind === 'prefer_fewer_days' },
  { key: 'projects', label: 'Projects over exams', make: () => rule('prefer_projects', 'Prefer project-based assessment', false),
    matches: (c) => c.kind === 'prefer_projects' },
  { key: 'solo', label: 'Solo work', make: () => rule('prefer_individual', 'Prefer individual projects', false),
    matches: (c) => c.kind === 'prefer_individual' },
];

/** One-tap rule toggles. Turning a chip off removes the matching rule; nothing re-solves automatically. */
export function QuickRules({ constraints, onChange }: { constraints: Constraint[]; onChange: (fn: (c: Constraint[]) => Constraint[]) => void }) {
  const full = constraints.length >= MAX_RULES;
  const toggle = (chip: Chip) => {
    onChange((cs) => {
      if (cs.some((c) => c.enabled && chip.matches(c))) return cs.filter((c) => !chip.matches(c));
      const kept = chip.replacesKind ? cs.filter((c) => c.kind !== chip.replacesKind) : cs;
      return kept.length >= MAX_RULES ? cs : [...kept, chip.make()];
    });
  };
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="panel-quick-rules">
      {CHIPS.map((chip) => {
        const on = constraints.some((c) => c.enabled && chip.matches(c));
        return (
          <button key={chip.key} type="button" onClick={() => toggle(chip)} aria-pressed={on} disabled={!on && full}
            data-testid={`chip-${chip.key}`}
            className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50',
              on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30')}>
            {on && <Check className="size-3" />}{chip.label}
          </button>
        );
      })}
    </div>
  );
}

type Assess = 'projects' | 'solo' | 'both' | 'none';
interface Answers {
  hasBlock: boolean; blockDays: number[]; blockStart: number; blockEnd: number; blockLabel: string;
  freeDays: number[]; freeHard: boolean;
  assess: Assess;
}

const INITIAL: Answers = { hasBlock: false, blockDays: [], blockStart: 840, blockEnd: 1080, blockLabel: 'Work', freeDays: [], freeHard: true, assess: 'none' };

export function answersToRules(a: Answers): Constraint[] {
  const out: Constraint[] = [];
  if (a.hasBlock && a.blockDays.length && a.blockStart < a.blockEnd) {
    const days = [...a.blockDays].sort().map((d) => DAYS[d]).join('/');
    out.push(rule('blocked', `${a.blockLabel.trim() || 'Busy'} ${days} · ${fmtTime(a.blockStart)}–${fmtTime(a.blockEnd)}`, true,
      { days: [...a.blockDays].sort(), start: a.blockStart, end: a.blockEnd }));
  }
  if (a.freeDays.length) {
    const days = [...a.freeDays].sort().map((d) => DAYS[d]).join('/');
    out.push(rule('no_day', `${a.freeHard ? 'Keep' : 'Prefer'} ${days} free`, a.freeHard, { days: [...a.freeDays].sort() }));
  }
  if (a.assess === 'projects' || a.assess === 'both') out.push(rule('prefer_projects', 'Prefer project-based assessment', false));
  if (a.assess === 'solo' || a.assess === 'both') out.push(rule('prefer_individual', 'Prefer individual projects', false));
  return out;
}

function DayPicker({ value, onChange, testid }: { value: number[]; onChange: (d: number[]) => void; testid: string }) {
  return (
    <div className="flex gap-1" role="group">
      {DAYS.map((d, i) => {
        const on = value.includes(i);
        return (
          <button key={d} type="button" aria-pressed={on} data-testid={`${testid}-${i}`}
            onClick={() => onChange(on ? value.filter((x) => x !== i) : [...value, i])}
            className={cn('w-11 py-1.5 rounded-md border text-xs transition-colors', on ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-secondary')}>{d}</button>
        );
      })}
    </div>
  );
}

function Choice({ on, onClick, children, testid }: { on: boolean; onClick: () => void; children: ReactNode; testid: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} data-testid={testid}
      className={cn('w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors', on ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-secondary')}>
      {children}
    </button>
  );
}

/**
 * Three-question setup. Answers become ordinary rules the student can see and edit.
 * Applying replaces time and assessment rules; required courses and locked sections are kept.
 */
export function Onboarding({ open, onOpenChange, current, onApply }: {
  open: boolean; onOpenChange: (v: boolean) => void; current: Constraint[]; onApply: (next: Constraint[]) => void;
}) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(INITIAL);
  const set = (patch: Partial<Answers>) => setA((x) => ({ ...x, ...patch }));
  const kept = current.filter((c) => c.kind === 'require_course' || c.kind === 'lock_section');
  const rules = answersToRules(a);
  const blockInvalid = a.hasBlock && (a.blockDays.length === 0 || a.blockStart >= a.blockEnd);
  const close = (v: boolean) => { onOpenChange(v); if (!v) setStep(0); };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-onboarding">
        <DialogHeader>
          <DialogTitle>{['Any fixed weekly commitment?', 'Want a day off campus?', 'How do you like to be graded?', 'Here are your rules'][step]}</DialogTitle>
          <DialogDescription>{step < 3 ? `Question ${step + 1} of 3. You can change everything later.` : 'These replace your time and grading rules. Required courses and locked sections stay.'}</DialogDescription>
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Choice on={!a.hasBlock} onClick={() => set({ hasBlock: false })} testid="onboard-block-no">No</Choice>
              <Choice on={a.hasBlock} onClick={() => set({ hasBlock: true })} testid="onboard-block-yes">Yes (work, practice…)</Choice>
            </div>
            {a.hasBlock && (
              <div className="space-y-3 rise">
                <div className="space-y-1.5"><Label htmlFor="ob-label">What is it?</Label>
                  <Input id="ob-label" value={a.blockLabel} maxLength={40} onChange={(e) => set({ blockLabel: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Days</Label><DayPicker value={a.blockDays} onChange={(d) => set({ blockDays: d })} testid="onboard-block-day" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5"><Label htmlFor="ob-start">From</Label>
                    <Input id="ob-start" type="time" value={toHHMM(a.blockStart)} onChange={(e) => set({ blockStart: fromHHMM(e.target.value) })} /></div>
                  <div className="space-y-1.5"><Label htmlFor="ob-end">To</Label>
                    <Input id="ob-end" type="time" value={toHHMM(a.blockEnd)} onChange={(e) => set({ blockEnd: fromHHMM(e.target.value) })} /></div>
                </div>
                {blockInvalid && <p className="text-xs text-destructive">Pick at least one day and an end time after the start.</p>}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <DayPicker value={a.freeDays} onChange={(d) => set({ freeDays: d })} testid="onboard-free-day" />
            {a.freeDays.length > 0 && (
              <div className="grid grid-cols-2 gap-2 rise">
                <Choice on={a.freeHard} onClick={() => set({ freeHard: true })} testid="onboard-free-hard">Must be free</Choice>
                <Choice on={!a.freeHard} onClick={() => set({ freeHard: false })} testid="onboard-free-soft">Nice to have</Choice>
              </div>
            )}
            {a.freeDays.length === 0 && <p className="text-xs text-muted-foreground">No day selected means any weekday is fine.</p>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <Choice on={a.assess === 'projects'} onClick={() => set({ assess: 'projects' })} testid="onboard-assess-projects">More projects, fewer exams</Choice>
            <Choice on={a.assess === 'solo'} onClick={() => set({ assess: 'solo' })} testid="onboard-assess-solo">Individual work over group projects</Choice>
            <Choice on={a.assess === 'both'} onClick={() => set({ assess: 'both' })} testid="onboard-assess-both">Both</Choice>
            <Choice on={a.assess === 'none'} onClick={() => set({ assess: 'none' })} testid="onboard-assess-none">No preference</Choice>
            <p className="text-xs text-muted-foreground">Based on syllabus weights. Courses without a syllabus are never assumed to match.</p>
          </div>
        )}

        {step === 3 && (
          <ul className="space-y-1.5" data-testid="list-onboarding-rules">
            {[...rules, ...kept].map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>{c.label}</span><span className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.hard ? 'hard' : 'soft'}</span>
              </li>
            ))}
            {rules.length + kept.length === 0 && <li className="text-sm text-muted-foreground">No rules. The planner will only check requirements and units.</li>}
          </ul>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {step === 0 ? (
            <Button variant="ghost" onClick={() => close(false)} data-testid="button-onboard-skip">Keep demo rules</Button>
          ) : (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Button>
          )}
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && blockInvalid} data-testid="button-onboard-next">Next</Button>
          ) : (
            <Button onClick={() => { onApply([...rules, ...kept].slice(0, MAX_RULES)); close(false); setA(INITIAL); }} data-testid="button-onboard-apply">Build my plan</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

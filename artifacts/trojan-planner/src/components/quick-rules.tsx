import { useState, type ReactNode } from 'react';
import type { Constraint, ConstraintKind } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DAYS, fmtTime, fromHHMM, newConstraint, toHHMM } from '@/lib/format';
import { cn } from '@/lib/utils';

export const MAX_RULES = 20;

const rule = (kind: ConstraintKind, label: string, hard: boolean, patch: Partial<Constraint> = {}): Constraint =>
  ({ ...newConstraint(kind, hard), label, ...patch });

type Weighting = 'projects' | 'exams' | 'none';
interface Answers {
  hasBlock: boolean; blockDays: number[]; blockStart: number; blockEnd: number; blockLabel: string;
  freeDays: number[]; freeHard: boolean;
  weighting: Weighting; solo: boolean; noQuizzes: boolean; noAttendance: boolean;
}

const INITIAL: Answers = { hasBlock: false, blockDays: [], blockStart: 840, blockEnd: 1080, blockLabel: 'Work', freeDays: [], freeHard: true, weighting: 'none', solo: false, noQuizzes: false, noAttendance: false };

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
  if (a.weighting === 'projects') out.push(rule('prefer_projects', 'Prefer project-based assessment', false));
  if (a.weighting === 'exams') out.push(rule('prefer_exams', 'Prefer exam-based assessment', false));
  if (a.solo) out.push(rule('prefer_individual', 'Prefer individual projects', false));
  if (a.noQuizzes) out.push(rule('prefer_no_quizzes', 'Avoid graded quizzes', false));
  if (a.noAttendance) out.push(rule('prefer_no_attendance', 'Avoid graded attendance', false));
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
  const kept = current.filter((c) => c.kind === 'require_course' || c.kind === 'exclude_course' || c.kind === 'lock_section');
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
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Exams or projects?</Label>
              <div className="grid grid-cols-3 gap-2">
                <Choice on={a.weighting === 'projects'} onClick={() => set({ weighting: 'projects' })} testid="onboard-weight-projects">More projects</Choice>
                <Choice on={a.weighting === 'exams'} onClick={() => set({ weighting: 'exams' })} testid="onboard-weight-exams">More exams</Choice>
                <Choice on={a.weighting === 'none'} onClick={() => set({ weighting: 'none' })} testid="onboard-weight-none">Either</Choice>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Group projects?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Choice on={a.solo} onClick={() => set({ solo: true })} testid="onboard-solo-yes">Prefer solo work</Choice>
                <Choice on={!a.solo} onClick={() => set({ solo: false })} testid="onboard-solo-no">Groups are fine</Choice>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Graded quizzes?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Choice on={a.noQuizzes} onClick={() => set({ noQuizzes: true })} testid="onboard-quiz-avoid">Avoid quizzes</Choice>
                <Choice on={!a.noQuizzes} onClick={() => set({ noQuizzes: false })} testid="onboard-quiz-ok">Quizzes are fine</Choice>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Graded attendance?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Choice on={a.noAttendance} onClick={() => set({ noAttendance: true })} testid="onboard-attendance-avoid">Avoid it</Choice>
                <Choice on={!a.noAttendance} onClick={() => set({ noAttendance: false })} testid="onboard-attendance-ok">Fine either way</Choice>
              </div>
            </div>
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

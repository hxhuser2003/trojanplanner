import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { Catalog, Constraint, ConstraintKind } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DAYS, KIND_META, autoLabel, describeConstraint, fromHHMM, newConstraint, sectionDeliveryLabel, sectionParts, toHHMM } from '@/lib/format';
import { cn } from '@/lib/utils';

const isPreference = (k: ConstraintKind) => k.startsWith('prefer_');
const PREFERENCE_KINDS = (Object.keys(KIND_META) as ConstraintKind[]).filter(isPreference);

interface Props {
  catalog: Catalog;
  constraints: Constraint[];
  onChange: (fn: (c: Constraint[]) => Constraint[]) => void;
}

export function ConstraintEditor({ catalog, constraints, onChange }: Props) {
  const [editing, setEditing] = useState<Constraint | null>(null);
  const [isNew, setIsNew] = useState(false);
  // Until the student types their own label, the label follows the rule's fields.
  const [labelTouched, setLabelTouched] = useState(false);
  const open = (c: Constraint, fresh: boolean) => { setIsNew(fresh); setLabelTouched(false); setEditing(c); };
  const update = (patch: Partial<Constraint>) => setEditing((e) => {
    if (!e) return e;
    const next = { ...e, ...patch };
    return labelTouched ? next : { ...next, label: autoLabel(next, catalog, e.label) };
  });
  const hard = constraints.filter((c) => c.hard);
  const soft = constraints.filter((c) => !c.hard);
  // "Prefer Fri free" becomes "Keep Fri free"; a label the student wrote stays as it is.
  const toggleHard = (c: Constraint): Constraint => {
    const next = { ...c, hard: !c.hard };
    return c.label === autoLabel(c, catalog, c.label) ? { ...next, label: autoLabel(next, catalog, c.label) } : next;
  };

  const save = () => {
    if (!editing) return;
    onChange((cs) => (isNew ? [...cs, editing] : cs.map((c) => (c.id === editing.id ? editing : c))));
    setEditing(null);
  };

  const Row = (c: Constraint) => (
    <li key={c.id} className={cn('group flex items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors', !c.enabled && 'opacity-55')} data-testid={`row-constraint-${c.id}`}>
      <Switch checked={c.enabled} onCheckedChange={(v) => onChange((cs) => cs.map((x) => (x.id === c.id ? { ...x, enabled: v } : x)))}
        aria-label={`${c.enabled ? 'Disable' : 'Enable'} ${c.label}`} data-testid={`switch-constraint-${c.id}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{c.label}</p>
        <p className="text-xs text-muted-foreground truncate font-mono">{describeConstraint(c, catalog)}</p>
      </div>
      {isPreference(c.kind) ? (
        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded border cursor-default" title="Preferences are always soft: the solver favors them but never fails because of them">Soft</span>
      ) : (
        <button className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded border hover:bg-secondary transition-colors"
          onClick={() => onChange((cs) => cs.map((x) => (x.id === c.id ? toggleHard(x) : x)))}
          aria-label={`Make ${c.hard ? 'soft' : 'hard'}`} data-testid={`button-hardness-${c.id}`}>{c.hard ? 'Hard' : 'Soft'}</button>
      )}
      <button className="p-1.5 rounded hover:bg-secondary" aria-label={`Edit ${c.label}`} onClick={() => open({ ...c }, false)} data-testid={`button-edit-${c.id}`}><Pencil className="size-3.5" /></button>
      <button className="p-1.5 rounded hover:bg-destructive/10 text-destructive" aria-label={`Delete ${c.label}`} onClick={() => onChange((cs) => cs.filter((x) => x.id !== c.id))} data-testid={`button-delete-${c.id}`}><Trash2 className="size-3.5" /></button>
    </li>
  );

  const uses = editing ? KIND_META[editing.kind].uses : [];
  const sectionOptions = catalog.courses.flatMap((c) => c.sections.filter((s) => s.deliveryMode === 'on_campus').map((s) => ({ c, s })));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2">Required</h3>
        {hard.length ? <ul className="space-y-1.5">{hard.map(Row)}</ul> : <p className="text-xs text-muted-foreground italic">No hard rules. The solver can place anything anywhere.</p>}
      </div>
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2">Preferred</h3>
        {soft.length ? <ul className="space-y-1.5">{soft.map(Row)}</ul> : <p className="text-xs text-muted-foreground italic">No preferences yet. Ask the copilot or add one.</p>}
      </div>
      <Select onValueChange={(k) => open(newConstraint(k as ConstraintKind, !k.startsWith('prefer')), true)} value="">
        <SelectTrigger className="w-full border-dashed" data-testid="select-add-constraint" disabled={constraints.length >= 20}>
          <span className="flex items-center gap-2 text-sm"><Plus className="size-4" />{constraints.length >= 20 ? 'Limit of 20 reached' : 'Add a rule or time block'}</span>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(KIND_META) as ConstraintKind[]).map((k) => (
            <SelectItem key={k} value={k}>{KIND_META[k].label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle>{isNew ? 'New' : 'Edit'}: {KIND_META[editing.kind].label}</DialogTitle>
                <DialogDescription>{KIND_META[editing.kind].hint}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="c-label">Label</Label>
                  <Input id="c-label" maxLength={200} value={editing.label} onChange={(e) => { setLabelTouched(true); setEditing({ ...editing, label: e.target.value }); }} data-testid="input-constraint-label" />
                </div>
                {isPreference(editing.kind) ? (
                  <div className="space-y-1.5"><Label>Preference</Label>
                    <Select value={editing.kind} onValueChange={(k) => update({ kind: k as ConstraintKind })}>
                      <SelectTrigger data-testid="select-preference-kind"><SelectValue /></SelectTrigger>
                      <SelectContent>{PREFERENCE_KINDS.map((k) => <SelectItem key={k} value={k}>{KIND_META[k].label}</SelectItem>)}</SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Preferences are soft: the solver favors them but never fails because of them.</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div><p className="text-sm font-medium">Hard rule</p><p className="text-xs text-muted-foreground">Hard rules are never relaxed without your approval.</p></div>
                    <Switch checked={editing.hard} onCheckedChange={(v) => update({ hard: v })} data-testid="switch-constraint-hard" />
                  </div>
                )}
                {uses.includes('days') && (
                  <div className="space-y-1.5">
                    <Label>Days</Label>
                    <div className="flex gap-1.5" role="group" aria-label="Days">
                      {DAYS.map((d, i) => {
                        const on = editing.days.includes(i);
                        return (
                          <button key={d} type="button" aria-pressed={on} data-testid={`toggle-day-${i}`}
                            onClick={() => update({ days: on ? editing.days.filter((x) => x !== i) : [...editing.days, i].sort() })}
                            className={cn('flex-1 py-2 rounded-md border text-xs font-semibold transition-all active:scale-95', on ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-secondary')}>{d}</button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {(uses.includes('time') || uses.includes('start') || uses.includes('end')) && (
                  <div className="grid grid-cols-2 gap-3">
                    {(uses.includes('time') || uses.includes('start')) && (
                      <div className="space-y-1.5"><Label htmlFor="c-start">{uses.includes('start') ? 'Earliest' : 'From'}</Label>
                        <Input id="c-start" type="time" value={toHHMM(editing.start)} onChange={(e) => update({ start: fromHHMM(e.target.value) })} data-testid="input-constraint-start" /></div>
                    )}
                    {(uses.includes('time') || uses.includes('end')) && (
                      <div className="space-y-1.5"><Label htmlFor="c-end">{uses.includes('end') ? 'Latest' : 'To'}</Label>
                        <Input id="c-end" type="time" value={toHHMM(editing.end)} onChange={(e) => update({ end: fromHHMM(e.target.value) })} data-testid="input-constraint-end" /></div>
                    )}
                  </div>
                )}
                {uses.includes('course') && (
                  <div className="space-y-1.5"><Label>Course</Label>
                    <Select value={editing.value} onValueChange={(v) => update({ value: v })}>
                      <SelectTrigger data-testid="select-constraint-course"><SelectValue placeholder="Choose a course" /></SelectTrigger>
                      <SelectContent>{catalog.courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.title}</SelectItem>)}</SelectContent>
                    </Select></div>
                )}
                {uses.includes('section') && (
                  <div className="space-y-1.5"><Label>Section</Label>
                    <Select value={editing.value} onValueChange={(v) => update({ value: v })}>
                      <SelectTrigger data-testid="select-constraint-section"><SelectValue placeholder="Choose a section" /></SelectTrigger>
                      <SelectContent>{sectionOptions.map(({ c, s }) => <SelectItem key={s.id} value={s.id}>{c.code} · {sectionDeliveryLabel(s)} · {sectionParts(s).map((p) => `${p.kind} ${p.tba ? 'TBA' : p.times.join(', ')}`).join(' · ')}</SelectItem>)}</SelectContent>
                    </Select></div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={save} data-testid="button-save-constraint"
                  disabled={!editing.label.trim() || ((uses.includes('course') || uses.includes('section')) && !editing.value) || (uses.includes('days') && !editing.days.length) || (uses.includes('time') && editing.end <= editing.start)}>
                  Save rule
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

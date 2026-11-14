import { useState } from 'react';
import { Sparkles, AlertTriangle, Check, X } from 'lucide-react';
import { useParsePreferences, type Catalog, type Constraint, type PlannerInput, type PreferenceResult } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { describeConstraint, errMessage } from '@/lib/format';

const EXAMPLES = ['Keep Fridays free, I work at the library', 'Nothing before 10am please', 'I do better with projects than exams'];

interface Props {
  catalog: Catalog;
  input: PlannerInput;
  onApply: (added: Constraint[], resolve: boolean) => void;
}

export function Copilot({ catalog, input, onApply }: Props) {
  const parse = useParsePreferences();
  const [text, setText] = useState('');
  const [result, setResult] = useState<PreferenceResult | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const ask = async () => {
    setResult(null);
    try {
      const r = await parse.mutateAsync({ data: { text: text.trim(), current: input } });
      setResult(r);
      setPicked(new Set(r.proposedConstraints.map((c) => c.id)));
    } catch {
      /* surfaced via parse.error */
    }
  };

  const apply = (resolve: boolean) => {
    if (!result) return;
    const existing = new Set(input.constraints.map((c) => c.id));
    const added = result.proposedConstraints.filter((c) => picked.has(c.id)).map((c) => (c.kind.startsWith('prefer_') ? { ...c, hard: false } : c)).map((c) => (existing.has(c.id) ? { ...c, id: `${c.id}-${Date.now().toString(36)}` } : c));
    onApply(added.slice(0, Math.max(0, 20 - input.constraints.length)), resolve);
    setResult(null);
    setText('');
  };

  return (
    <div className="rounded-xl border bg-gradient-to-b from-secondary/60 to-card p-4 space-y-3" data-testid="panel-copilot">
      <div className="flex items-center gap-2">
        <span className="grid place-items-center size-7 rounded-full bg-primary text-primary-foreground"><Sparkles className="size-3.5" /></span>
        <div>
          <p className="font-display font-semibold leading-none">Tell me about your week</p>
          <p className="text-[11px] text-muted-foreground mt-1">I propose rules. You decide what gets added.</p>
        </div>
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3}
        placeholder="e.g. I have practice Tue/Thu 3-5pm and want mornings off" aria-label="Describe your preferences" data-testid="input-copilot" className="bg-card resize-none" />
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((e) => (
          <button key={e} onClick={() => setText(e)} className="text-[11px] px-2 py-1 rounded-full border bg-card hover:border-primary hover:text-primary transition-colors" data-testid="button-copilot-example">{e}</button>
        ))}
      </div>
      <Button className="w-full" onClick={ask} disabled={!text.trim() || parse.isPending} data-testid="button-copilot-ask">
        {parse.isPending ? 'Reading your note…' : 'Propose rules'}
      </Button>
      {parse.isPending && <div className="space-y-2"><div className="h-10 rounded-lg bg-muted animate-pulse" /><div className="h-10 rounded-lg bg-muted animate-pulse w-4/5" /></div>}
      {parse.isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs flex gap-2" role="alert" data-testid="status-copilot-error">
          <AlertTriangle className="size-4 text-destructive shrink-0" />
          <div className="flex-1">Copilot is unavailable: {errMessage(parse.error)}. You can still add rules by hand below.
            <button className="block mt-1 underline font-medium" onClick={ask}>Try again</button></div>
        </div>
      )}
      {result && (
        <div className="space-y-2 rise" data-testid="panel-copilot-result">
          <p className="text-sm">{result.message}</p>
          <p className="text-[10px] font-mono text-muted-foreground">via {result.provider}</p>
          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs flex gap-1.5 text-amber-800 dark:text-amber-300"><AlertTriangle className="size-3.5 shrink-0 mt-0.5" />{w}</p>
          ))}
          {result.proposedConstraints.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No rules proposed. Try rephrasing with days or times.</p>
          ) : (
            <ul className="space-y-1.5">
              {result.proposedConstraints.map((c) => (
                <li key={c.id}>
                  <label className="flex items-start gap-2.5 rounded-lg border bg-card p-2.5 cursor-pointer hover:border-primary/50 transition-colors">
                    <Checkbox checked={picked.has(c.id)} data-testid={`checkbox-proposal-${c.id}`}
                      onCheckedChange={(v) => setPicked((p) => { const n = new Set(p); if (v) n.add(c.id); else n.delete(c.id); return n; })} />
                    <span className="flex-1 min-w-0">
                      <span className="text-sm font-medium block">{c.label} <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">{c.hard ? 'hard' : 'soft'}</span></span>
                      <span className="text-xs font-mono text-muted-foreground">{describeConstraint(c, catalog)}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setResult(null)} data-testid="button-proposal-dismiss"><X className="size-3.5" />Dismiss</Button>
            <Button size="sm" variant="outline" disabled={!picked.size} onClick={() => apply(false)} data-testid="button-proposal-add">Add {picked.size}</Button>
            <Button size="sm" className="flex-1" disabled={!picked.size} onClick={() => apply(true)} data-testid="button-proposal-add-solve"><Check className="size-3.5" />Add & re-solve</Button>
          </div>
        </div>
      )}
    </div>
  );
}

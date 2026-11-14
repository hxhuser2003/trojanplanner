import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowUp, Check, FileText, X } from 'lucide-react';
import { useChatCopilot, type Catalog, type ChatResult, type ChatTurn, type Constraint, type PlannerInput, type SectionRef } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { describeConstraint, errMessage } from '@/lib/format';
import { cn } from '@/lib/utils';

const EXAMPLES = ['I work Mon/Wed 9–11am', 'Remove the Friday rule', 'Does CSCI 310 have group projects?', 'Why is CSCI 271 in my plan?'];

export interface RuleEdits {
  add: Constraint[];
  update: Constraint[];
  remove: string[];
}

type Msg =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; result: ChatResult; status: 'open' | 'applied' | 'dismissed' }
  | { id: number; role: 'error'; text: string; retry: string };

interface Props {
  catalog: Catalog;
  input: PlannerInput;
  selections: SectionRef[];
  onApply: (edits: RuleEdits, resolve: boolean) => void;
}

let seq = 0;

export function Copilot({ catalog, input, selections, onApply }: Props) {
  const chat = useChatCopilot();
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [msgs.length, chat.isPending]);

  const history = (from: Msg[]): ChatTurn[] => from.flatMap((m): ChatTurn[] =>
    m.role === 'user' ? [{ role: 'user', text: m.text }] : m.role === 'assistant' ? [{ role: 'assistant', text: m.result.message.slice(0, 2000) }] : []).slice(-8);

  // `drop` removes a failed exchange (its user turn and error) before retrying it.
  const send = async (raw: string, drop: number[] = []) => {
    const message = raw.trim();
    if (!message || chat.isPending) return;
    const base = msgs.filter((x) => !drop.includes(x.id) && x.role !== 'error');
    const past = history(base);
    setMsgs([...base, { id: ++seq, role: 'user', text: message }]);
    setText('');
    try {
      const result = await chat.mutateAsync({ data: { message, history: past, current: input, selections } });
      setMsgs((m) => [...m, { id: ++seq, role: 'assistant', result, status: 'open' }]);
    } catch (e) {
      setMsgs((m) => [...m, { id: ++seq, role: 'error', text: errMessage(e), retry: message }]);
    }
  };

  const close = (id: number, status: 'applied' | 'dismissed') =>
    setMsgs((m) => m.map((x) => (x.id === id && x.role === 'assistant' ? { ...x, status } : x)));

  return (
    <div className="space-y-3" data-testid="panel-copilot">
      {msgs.length > 0 && (
        <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1" aria-live="polite" data-testid="list-chat">
          {msgs.map((m) => m.role === 'user' ? (
            <div key={m.id} className="ml-8 rounded-lg bg-secondary px-3 py-2 text-sm whitespace-pre-wrap">{m.text}</div>
          ) : m.role === 'error' ? (
            <div key={m.id} className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs flex gap-2" role="alert" data-testid="status-copilot-error">
              <AlertTriangle className="size-4 text-destructive shrink-0" />
              <div className="flex-1">{m.text}
                <button className="block mt-1 underline font-medium" onClick={() => void send(m.retry, [m.id, m.id - 1])}>Try again</button></div>
            </div>
          ) : (
            <Reply key={m.id} catalog={catalog} input={input} result={m.result} status={m.status}
              onOption={(o) => void send(o)}
              onApply={(edits, resolve) => { onApply(edits, resolve); close(m.id, 'applied'); }}
              onDismiss={() => close(m.id, 'dismissed')} />
          ))}
          {chat.isPending && <div className="h-10 rounded-lg bg-muted animate-pulse w-4/5" />}
          <div ref={end} />
        </div>
      )}
      {msgs.length === 0 && (
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((e) => (
            <button key={e} onClick={() => void send(e)} className="text-xs px-2 py-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground transition-colors" data-testid="button-copilot-example">{e}</button>
          ))}
        </div>
      )}
      <div className="relative">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(text); } }}
          placeholder="Add or change rules, or ask about a course" aria-label="Message the copilot" data-testid="input-copilot" className="resize-none pr-11" />
        <Button size="icon" className="absolute right-2 bottom-2 size-7" onClick={() => void send(text)} disabled={!text.trim() || chat.isPending} aria-label="Send" data-testid="button-copilot-ask">
          <ArrowUp className="size-4" />
        </Button>
      </div>
      {msgs.length > 0 && (
        <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setMsgs([])} data-testid="button-chat-clear">Clear conversation</button>
      )}
    </div>
  );
}

function Reply({ catalog, input, result, status, onOption, onApply, onDismiss }: {
  catalog: Catalog; input: PlannerInput; result: ChatResult; status: 'open' | 'applied' | 'dismissed';
  onOption: (o: string) => void; onApply: (e: RuleEdits, resolve: boolean) => void; onDismiss: () => void;
}) {
  type Item = { key: string; tag: 'Add' | 'Change' | 'Remove'; title: string; detail: string };
  const items: Item[] = [
    ...result.proposedConstraints.map((c) => ({ key: `a:${c.id}`, tag: 'Add' as const, title: c.label, detail: `${describeConstraint(c, catalog)} · ${c.hard ? 'hard' : 'soft'}` })),
    ...result.updatedConstraints.map((c) => {
      const old = input.constraints.find((x) => x.id === c.id);
      return { key: `u:${c.id}`, tag: 'Change' as const, title: c.label, detail: `${old ? describeConstraint(old, catalog) : '?'} → ${describeConstraint(c, catalog)} · ${c.hard ? 'hard' : 'soft'}` };
    }),
    ...result.removeConstraintIds.map((id) => ({ key: `r:${id}`, tag: 'Remove' as const, title: input.constraints.find((x) => x.id === id)?.label ?? id, detail: 'Delete this rule' })),
  ];
  const [picked, setPicked] = useState<Set<string>>(() => new Set(items.map((i) => i.key)));
  // Rules the reply refers to may have been edited since; a stale change is not offered.
  const missing = [...result.updatedConstraints.map((c) => c.id), ...result.removeConstraintIds].filter((id) => !input.constraints.some((c) => c.id === id));
  const edits = (): RuleEdits => {
    const room = 20 - (input.constraints.length - result.removeConstraintIds.filter((id) => picked.has(`r:${id}`)).length);
    return {
      add: result.proposedConstraints.filter((c) => picked.has(`a:${c.id}`)).slice(0, Math.max(0, room)),
      update: result.updatedConstraints.filter((c) => picked.has(`u:${c.id}`)),
      remove: result.removeConstraintIds.filter((id) => picked.has(`r:${id}`)),
    };
  };

  return (
    <div className="space-y-2 rise" data-testid={`chat-reply-${result.kind}`}>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.message}</p>
      {result.warnings.map((w, i) => (
        <p key={i} className="text-xs flex gap-1.5 text-amber-800 dark:text-amber-300"><AlertTriangle className="size-3.5 shrink-0 mt-0.5" />{w}</p>
      ))}

      {result.kind === 'clarify' && (
        <div className="flex flex-wrap gap-1.5">
          {result.options.map((o) => (
            <button key={o} onClick={() => onOption(o)} className="text-xs px-2.5 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/5" data-testid="button-clarify-option">{o}</button>
          ))}
        </div>
      )}

      {result.citations.length > 0 && (
        <ul className="space-y-1.5">
          {result.citations.map((c) => (
            <li key={`${c.courseId}:${c.label}`} className="rounded-md border bg-card px-2.5 py-1.5 text-xs" data-testid="item-citation">
              <span className="font-medium">{catalog.courses.find((x) => x.id === c.courseId)?.code ?? c.courseId} · {c.label}</span>
              <span className="block text-muted-foreground">“{c.excerpt}”</span>
              <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline mt-0.5"><FileText className="size-3" />Source (synthetic)</a>
            </li>
          ))}
        </ul>
      )}

      {result.kind === 'rules' && items.length > 0 && (status === 'open' ? (
        <>
          <ul className="space-y-1.5">
            {items.map((it) => (
              <li key={it.key}>
                <label className="flex items-start gap-2.5 rounded-lg border bg-card p-2.5 cursor-pointer hover:border-primary/50 transition-colors">
                  <Checkbox checked={picked.has(it.key)} data-testid={`checkbox-proposal-${it.key}`}
                    onCheckedChange={(v) => setPicked((p) => { const n = new Set(p); if (v) n.add(it.key); else n.delete(it.key); return n; })} />
                  <span className="flex-1 min-w-0">
                    <span className="text-sm font-medium block">
                      <span className={cn('text-[10px] uppercase tracking-wider mr-1.5', it.tag === 'Remove' ? 'text-destructive' : 'text-primary')}>{it.tag}</span>{it.title}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{it.detail}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {missing.length > 0 ? (
            <p className="text-xs text-destructive">Some of these rules changed since this reply. Ask again to get a fresh proposal.</p>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onDismiss} data-testid="button-proposal-dismiss"><X className="size-3.5" />Dismiss</Button>
              <Button size="sm" variant="outline" disabled={!picked.size} onClick={() => onApply(edits(), false)} data-testid="button-proposal-add">Apply {picked.size}</Button>
              <Button size="sm" className="flex-1" disabled={!picked.size} onClick={() => onApply(edits(), true)} data-testid="button-proposal-add-solve"><Check className="size-3.5" />Apply & update</Button>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">{status === 'applied' ? 'Applied to your rules.' : 'Dismissed.'}</p>
      ))}
      {result.kind === 'rules' && items.length === 0 && <p className="text-xs text-muted-foreground italic">No rule changes proposed.</p>}
      <p className="text-[10px] text-muted-foreground">{result.provider}</p>
    </div>
  );
}

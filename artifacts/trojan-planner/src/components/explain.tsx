import { useState } from 'react';
import { AlertTriangle, ChevronDown, Lightbulb } from 'lucide-react';
import { useExplainPlanner, type ExplainInput, type ExplainResult } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { errMessage } from '@/lib/format';

export function ExplainResultView({ result }: { result: ExplainResult }) {
  return (
    <div className="space-y-2 rise" data-testid="panel-explain-result">
      <p className="text-sm leading-relaxed">{result.summary}</p>
      <Collapsible>
        <CollapsibleTrigger className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" data-testid="button-explain-facts">
          {result.facts.length} fact{result.facts.length === 1 ? '' : 's'} behind this
          <ChevronDown className="size-3 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground list-disc pl-4">
            {result.facts.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </CollapsibleContent>
      </Collapsible>
      <p className="text-[10px] text-muted-foreground">{result.provider}</p>
    </div>
  );
}

/** A button that fetches a grounded explanation for `request` and shows it in place. */
export function ExplainButton({ request, label, variant = 'outline' }: { request: ExplainInput; label: string; variant?: 'outline' | 'secondary' | 'ghost' }) {
  const m = useExplainPlanner();
  const [shownFor, setShownFor] = useState<string | null>(null);
  const key = JSON.stringify(request);
  // A changed plan or rule set makes an old explanation misleading, so hide it.
  const fresh = shownFor === key && m.data;
  const run = () => { setShownFor(key); m.mutate({ data: request }); };
  return (
    <div className="space-y-2">
      {!fresh && (
        <Button size="sm" variant={variant} onClick={run} disabled={m.isPending} data-testid={`button-explain-${request.mode}`}>
          <Lightbulb className="size-3.5" />{m.isPending ? 'Explaining…' : label}
        </Button>
      )}
      {m.isPending && <div className="h-12 rounded-md bg-muted animate-pulse" />}
      {m.isError && shownFor === key && (
        <p className="text-xs text-destructive flex gap-1.5" role="alert"><AlertTriangle className="size-3.5 shrink-0 mt-0.5" />{errMessage(m.error)}</p>
      )}
      {fresh && m.data && <ExplainResultView result={m.data} />}
    </div>
  );
}

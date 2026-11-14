import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Catalog } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { usePlanner } from '@/lib/planner-store';
import { errMessage } from '@/lib/format';

export function CatalogGate({ children }: { children: (catalog: Catalog) => ReactNode }) {
  const { catalog, catalogLoading, catalogError, refetchCatalog } = usePlanner();
  if (catalogLoading) {
    return (
      <div className="mx-auto max-w-[1440px] p-6 grid gap-4 md:grid-cols-[1fr_360px]" aria-busy="true" data-testid="status-loading">
        <div className="h-[560px] rounded-xl bg-muted animate-pulse" />
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
      </div>
    );
  }
  if (catalogError || !catalog) {
    return (
      <div className="mx-auto max-w-md p-10 text-center" role="alert" data-testid="status-catalog-error">
        <AlertTriangle className="size-8 mx-auto text-destructive" />
        <h2 className="font-display text-2xl font-bold mt-3">The catalog didn't load</h2>
        <p className="text-sm text-muted-foreground mt-2">{catalogError ? errMessage(catalogError) : 'No catalog data returned.'} Your saved plan is still in this browser.</p>
        <Button className="mt-4" onClick={refetchCatalog} data-testid="button-retry-catalog">Try again</Button>
      </div>
    );
  }
  return <>{children(catalog)}</>;
}

import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { CalendarRange, BookOpenText, GraduationCap, ListChecks, RotateCcw } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePlanner } from '@/lib/planner-store';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Planner', icon: CalendarRange },
  { href: '/courses', label: 'Courses', icon: BookOpenText },
  { href: '/degree', label: 'Degree', icon: GraduationCap },
  { href: '/checklist', label: 'Checklist', icon: ListChecks },
];

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { catalog, reset, storageError } = usePlanner();
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="bg-background/90 backdrop-blur sticky top-0 z-40 border-b">
        <div className="mx-auto max-w-[1280px] px-4 md:px-6 flex items-center gap-6 h-14">
          <Link href="/" className="flex items-center gap-2 shrink-0" data-testid="link-home">
            <span className="size-2.5 rounded-full bg-primary" aria-hidden />
            <span className="text-[15px] font-semibold tracking-tight">TrojanPlanner</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1" aria-label="Main">
            {NAV.map((n) => {
              const active = n.href === '/' ? loc === '/' : loc.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} data-testid={`link-${n.label.toLowerCase()}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn('px-3 py-1.5 rounded-md text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                    active ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground hover:text-foreground')}>
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {catalog && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="text-xs text-muted-foreground px-2 py-1 rounded-md border cursor-default" data-testid="text-synthetic-notice">
                    {catalog.term} · USC snapshot
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{catalog.notice} Nothing here reserves a seat or guarantees enrollment.</TooltipContent>
              </Tooltip>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="Reset plan" title="Reset plan" data-testid="button-reset">
                  <RotateCcw className="size-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start over?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This clears your rules, completed courses, chosen schedule and checklist from this browser.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={reset} data-testid="button-confirm-reset">Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>
      {storageError && (
        <div role="alert" className="bg-destructive/10 border-b border-destructive/40 text-destructive text-xs px-4 md:px-6 py-1.5" data-testid="status-storage-error">{storageError}</div>
      )}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur grid grid-cols-4 border-t" aria-label="Main mobile">
        {NAV.map((n) => {
          const active = n.href === '/' ? loc === '/' : loc.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined} data-testid={`link-mobile-${n.label.toLowerCase()}`}
              className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px]', active ? 'text-primary font-medium' : 'text-muted-foreground')}>
              <n.icon className="size-5" />{n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({ title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}

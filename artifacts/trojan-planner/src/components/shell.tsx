import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { CalendarRange, BookOpenText, GraduationCap, ListChecks, RotateCcw, FlaskConical } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
      <header className="bg-sidebar text-sidebar-foreground sticky top-0 z-40 shadow-[0_1px_0_hsl(var(--accent)/.6)]">
        <div className="mx-auto max-w-[1440px] px-4 md:px-6 flex items-center gap-4 h-14">
          <Link href="/" className="flex items-baseline gap-2 shrink-0" data-testid="link-home">
            <span className="font-display text-xl font-extrabold">Trojan<span className="text-sidebar-primary">Planner</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Main">
            {NAV.map((n) => {
              const active = n.href === '/' ? loc === '/' : loc.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} data-testid={`link-${n.label.toLowerCase()}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn('relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-sidebar-primary',
                    active ? 'text-sidebar-primary' : 'text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent')}>
                  <n.icon className="size-4" />{n.label}
                  {active && <span className="absolute -bottom-[11px] left-3 right-3 h-[3px] rounded-full bg-sidebar-primary" />}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {catalog && (
              <span className="hidden lg:inline text-xs font-mono text-sidebar-foreground/70" data-testid="text-term">
                {catalog.term} · {catalog.major}
              </span>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-sidebar-border hover:bg-sidebar-accent transition-colors" data-testid="button-reset">
                  <RotateCcw className="size-3.5" /> Reset
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display">Start over?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This clears your constraints, completed courses, chosen schedule and checklist from this browser, then re-solves the default plan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my plan</AlertDialogCancel>
                  <AlertDialogAction onClick={reset} data-testid="button-confirm-reset">Reset everything</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>
      <div className="bg-accent/25 border-b border-accent/50 text-[12px]">
        <div className="mx-auto max-w-[1440px] px-4 md:px-6 py-1.5 flex items-center gap-2" data-testid="text-synthetic-notice">
          <FlaskConical className="size-3.5 text-primary shrink-0" />
          <span><strong className="font-semibold">Synthetic data.</strong> {catalog?.notice ?? 'Sections, syllabi and times are sample data for planning practice.'} Nothing here reserves a seat or guarantees enrollment.</span>
        </div>
      </div>
      {storageError && (
        <div role="alert" className="bg-destructive/10 border-b border-destructive/40 text-destructive text-xs px-4 md:px-6 py-1.5" data-testid="status-storage-error">{storageError}</div>
      )}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar text-sidebar-foreground grid grid-cols-4 border-t border-sidebar-border" aria-label="Main mobile">
        {NAV.map((n) => {
          const active = n.href === '/' ? loc === '/' : loc.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined} data-testid={`link-mobile-${n.label.toLowerCase()}`}
              className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px]', active ? 'text-sidebar-primary' : 'text-sidebar-foreground/70')}>
              <n.icon className="size-5" />{n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6 rise">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-primary">{eyebrow}</p>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold mt-1">{title}</h1>
      </div>
      {children}
    </div>
  );
}

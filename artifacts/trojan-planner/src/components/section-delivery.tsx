import type { Section } from '@workspace/api-client-react';
import { sectionDeliveryLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

export function SectionDelivery({ section, className }: { section: Section; className?: string }) {
  return <span className={cn('inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-semibold leading-tight', section.deliveryMode === 'den' ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200' : 'border-border bg-secondary text-foreground', className)}>{sectionDeliveryLabel(section)}</span>;
}

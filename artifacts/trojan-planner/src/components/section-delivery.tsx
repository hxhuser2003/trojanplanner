import type { Section } from '@workspace/api-client-react';
import { sectionDeliveryLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

export function SectionDelivery({ section, className }: { section: Section; className?: string }) {
  return <span className={cn(
    'inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
    section.delivery === 'den' ? 'border-primary/30 bg-primary/10 text-primary' :
      section.delivery === 'campus' ? 'border-border bg-secondary text-secondary-foreground' :
        'border-amber-400/40 bg-amber-100 text-amber-900',
    className,
  )}>{sectionDeliveryLabel(section)}</span>;
}

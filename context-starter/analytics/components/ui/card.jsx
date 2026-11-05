import { cn } from '@/lib/utils';

export function Card({ className, ...props }) {
  return <section data-slot="card" className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)} {...props} />;
}

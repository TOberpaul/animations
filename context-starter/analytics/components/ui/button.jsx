import { cn } from '@/lib/utils';

export function Button({ className, ...props }) {
  return <button data-slot="button" type="button" className={cn('inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50', className)} {...props} />;
}

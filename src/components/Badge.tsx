import { Pill } from './StatusBadge.tsx'

/** A small neutral pill for a single fact — same visual language as StatusBadge, no color meaning. */
export function Badge({ children }: { children: string }) {
  return <Pill label={children} className="bg-paper text-ink-soft ring-ink-faint/30" />
}

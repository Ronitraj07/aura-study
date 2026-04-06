/**
 * SectionHeader.tsx
 *
 * PHASE 7 — Extracted from Checklist.tsx (was 41KB monolith)
 * ────────────────────────────────────────────────────────────
 * Collapsible section divider used for "Pending" and
 * "Completed" task groups. Renders an icon, label, count
 * badge, a coloured hairline rule, and a chevron toggle.
 *
 * Accessibility:
 *  - The button carries aria-expanded so screen readers
 *    announce the expand/collapse state.
 *  - aria-controls links the button to the list it toggles
 *    (passed in as a prop; parent must set the matching id).
 */

import { ChevronDown, ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
  collapsed: boolean;
  /** id of the controlled list element — for aria-controls */
  controlsId: string;
  onToggle: () => void;
}

export function SectionHeader({
  icon: Icon,
  label,
  count,
  color,
  collapsed,
  controlsId,
  onToggle,
}: SectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-controls={controlsId}
      className="flex items-center gap-2.5 w-full py-1 group/sec"
    >
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} aria-hidden="true" />
      <span
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color }}
      >
        {label}
      </span>
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
        style={{ background: `${color}15`, color }}
        aria-label={`${count} tasks`}
      >
        {count}
      </span>
      <div className="flex-1 h-px ml-1" style={{ background: `${color}20` }} aria-hidden="true" />
      {collapsed ? (
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" aria-hidden="true" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" aria-hidden="true" />
      )}
    </button>
  );
}

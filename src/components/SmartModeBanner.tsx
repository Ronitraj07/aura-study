// ============================================================
// SmartModeBanner — C8: Smart Mode UI widget
// Shows AI-recommended settings for Notes or Assignments
// One-click apply, animated in/out, dismissible
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Zap, Check } from 'lucide-react';
import type { SmartSuggestion, ToolType } from '@/hooks/useSmartMode';
import { cn } from '@/lib/utils';

interface SmartModeBannerProps {
  suggestion: SmartSuggestion | null;
  isAnalysing: boolean;
  dismissed: boolean;
  tool: ToolType;
  onApply: (s: SmartSuggestion) => void;
  onDismiss: () => void;
  applied: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  STEM:        'hsl(220,85%,65%)',
  Science:     'hsl(160,70%,48%)',
  Humanities:  'hsl(30,80%,58%)',
  Law:         'hsl(262,80%,65%)',
  Business:    'hsl(200,80%,55%)',
  History:     'hsl(30,70%,52%)',
  Psychology:  'hsl(340,75%,58%)',
  Language:    'hsl(160,65%,50%)',
  'Exam Prep': 'hsl(340,75%,58%)',
  General:     'hsl(262,80%,60%)',
};

function getSettingLabel(suggestion: SmartSuggestion, tool: ToolType): string {
  if (tool === 'notes' && suggestion.depth) {
    const labels = { overview: 'Overview', detailed: 'Detailed', exam: 'Exam Mode' };
    return labels[suggestion.depth];
  }
  if (tool === 'assignment' && suggestion.tone && suggestion.wordCount) {
    const toneLabels = { formal: 'Formal', academic: 'Academic', casual: 'Casual' };
    return `${toneLabels[suggestion.tone]} · ${suggestion.wordCount} words`;
  }
  return '';
}

export function SmartModeBanner({
  suggestion,
  isAnalysing,
  dismissed,
  tool,
  onApply,
  onDismiss,
  applied,
}: SmartModeBannerProps) {
  const show = !dismissed && (isAnalysing || !!suggestion);
  const color = suggestion ? (CATEGORY_COLORS[suggestion.category] ?? CATEGORY_COLORS.General) : 'hsl(262,80%,65%)';
  const settingLabel = suggestion ? getSettingLabel(suggestion, tool) : '';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="smart-banner"
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-xl border overflow-hidden"
          style={{
            background: `${color}08`,
            borderColor: `${color}28`,
          }}
        >
          {isAnalysing && !suggestion ? (
            // ── Analysing state ──
            <div className="flex items-center gap-2.5 px-4 py-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="w-3.5 h-3.5 rounded-full border-2 border-transparent shrink-0"
                style={{ borderTopColor: color, borderRightColor: `${color}60` }}
              />
              <p className="text-[11px] text-muted-foreground">
                Analysing topic for smart settings...
              </p>
            </div>
          ) : suggestion ? (
            // ── Suggestion state ──
            <div className="flex items-center gap-3 px-4 py-3">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${color}18` }}
              >
                <Zap className="w-3 h-3" style={{ color }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
                    style={{
                      color,
                      borderColor: `${color}40`,
                      background: `${color}12`,
                    }}
                  >
                    {suggestion.category}
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color }}>
                    {settingLabel}
                  </span>
                  {suggestion.confidence === 'high' && (
                    <Sparkles className="w-2.5 h-2.5" style={{ color }} />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug truncate">
                  {suggestion.reason}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {applied ? (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg"
                    style={{ color: 'hsl(160,70%,48%)', background: 'hsl(160,70%,48%,0.1)' }}
                  >
                    <Check className="w-3 h-3" />
                    Applied
                  </motion.span>
                ) : (
                  <button
                    onClick={() => onApply(suggestion)}
                    className={cn(
                      'text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all hover:scale-[1.03] active:scale-[0.97]',
                    )}
                    style={{
                      color,
                      borderColor: `${color}40`,
                      background: `${color}12`,
                    }}
                  >
                    Apply
                  </button>
                )}
                <button
                  onClick={onDismiss}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Dismiss suggestion"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

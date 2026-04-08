// ============================================================
// SubtopicsSuggester.tsx — AI-powered subtopic suggestions
// Provides intelligent subtopic suggestions based on main topic
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SubtopicsSuggesterProps {
  mainTopic: string;
  onSelectSuggestion: (subtopic: string) => void;
  existingSubtopics: string[];
  className?: string;
}

interface SubtopicSuggestion {
  subtopic: string;
  relevance: 'high' | 'medium' | 'low';
  category: 'conceptual' | 'factual' | 'procedural' | 'contextual';
}

// Fallback suggestions for common academic domains
const FALLBACK_SUGGESTIONS: Record<string, string[]> = {
  science: ["Key Concepts", "Mechanisms", "Processes", "Applications", "Examples"],
  biology: ["Structure", "Function", "Evolution", "Ecology", "Genetics"],
  chemistry: ["Reactions", "Properties", "Bonding", "Applications", "Safety"],
  physics: ["Principles", "Formulas", "Applications", "Experiments", "Theory"],
  math: ["Definitions", "Theorems", "Applications", "Proofs", "Examples"],
  history: ["Timeline", "Causes", "Effects", "Key Figures", "Context"],
  literature: ["Themes", "Characters", "Style", "Context", "Analysis"],
  default: ["Key Concepts", "Historical Context", "Applications", "Examples", "Relationships"]
};

export function SubtopicsSuggester({ 
  mainTopic, 
  onSelectSuggestion, 
  existingSubtopics, 
  className 
}: SubtopicsSuggesterProps) {
  const [suggestions, setSuggestions] = useState<SubtopicSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced topic for API calls
  const [debouncedTopic, setDebouncedTopic] = useState(mainTopic);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTopic(mainTopic);
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [mainTopic]);

  // Generate fallback suggestions based on topic content
  const getFallbackSuggestions = useMemo(() => {
    if (!debouncedTopic.trim()) return [];

    const topicLower = debouncedTopic.toLowerCase();
    let domain = 'default';

    // Simple domain detection
    if (topicLower.includes('biology') || topicLower.includes('anatomy') || topicLower.includes('genetics')) {
      domain = 'biology';
    } else if (topicLower.includes('chemistry') || topicLower.includes('chemical') || topicLower.includes('molecule')) {
      domain = 'chemistry';
    } else if (topicLower.includes('physics') || topicLower.includes('mechanics') || topicLower.includes('energy')) {
      domain = 'physics';
    } else if (topicLower.includes('math') || topicLower.includes('calculus') || topicLower.includes('algebra')) {
      domain = 'math';
    } else if (topicLower.includes('history') || topicLower.includes('war') || topicLower.includes('civilization')) {
      domain = 'history';
    } else if (topicLower.includes('literature') || topicLower.includes('novel') || topicLower.includes('poetry')) {
      domain = 'literature';
    } else if (topicLower.includes('science') || topicLower.includes('research') || topicLower.includes('experiment')) {
      domain = 'science';
    }

    return FALLBACK_SUGGESTIONS[domain].map(subtopic => ({
      subtopic,
      relevance: 'medium' as const,
      category: 'conceptual' as const
    }));
  }, [debouncedTopic]);

  // Fetch AI suggestions
  const fetchAISuggestions = async (topic: string) => {
    if (!topic.trim() || topic.length < 10) {
      setSuggestions(getFallbackSuggestions);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/subtopic-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic: topic.trim(),
          exclude: existingSubtopics
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      } else {
        // Fallback to domain-based suggestions
        setSuggestions(getFallbackSuggestions);
      }
    } catch (err) {
      console.warn('Failed to fetch AI suggestions, using fallback:', err);
      setSuggestions(getFallbackSuggestions);
      setError('Using default suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger suggestion fetch when debounced topic changes
  useEffect(() => {
    if (debouncedTopic) {
      fetchAISuggestions(debouncedTopic);
    } else {
      setSuggestions([]);
    }
  }, [debouncedTopic, existingSubtopics]);

  // Filter out already selected subtopics
  const availableSuggestions = suggestions.filter(
    s => !existingSubtopics.includes(s.subtopic)
  );

  const handleRefresh = () => {
    if (debouncedTopic) {
      fetchAISuggestions(debouncedTopic);
    }
  };

  if (!debouncedTopic.trim()) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Suggested Subtopics
          </span>
          {isLoading && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
        </div>
        
        <Button
          onClick={handleRefresh}
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 hover:bg-purple-500/10"
          disabled={isLoading}
        >
          <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
        </Button>
      </div>

      {error && (
        <p className="text-xs text-amber-400/70 italic">{error}</p>
      )}

      {availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableSuggestions.slice(0, 8).map((suggestion, index) => (
            <Badge
              key={`${suggestion.subtopic}-${index}`}
              variant="outline"
              className={cn(
                "text-xs cursor-pointer border transition-all hover:scale-105",
                suggestion.relevance === 'high' && "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20",
                suggestion.relevance === 'medium' && "border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20",
                suggestion.relevance === 'low' && "border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
              )}
              onClick={() => onSelectSuggestion(suggestion.subtopic)}
            >
              <Sparkles className="w-2.5 h-2.5 mr-1 opacity-60" />
              {suggestion.subtopic}
            </Badge>
          ))}
        </div>
      )}

      {availableSuggestions.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground/60 italic">
          No new suggestions available
        </p>
      )}
    </div>
  );
}
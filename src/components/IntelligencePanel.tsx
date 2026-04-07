// ============================================================
// IntelligencePanel.tsx — Content analysis and smart suggestions UI
// Displays reading level, gaps, completeness score, and actionable suggestions
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  BarChart3, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Lightbulb, 
  Sparkles, 
  ChevronDown, 
  ChevronRight,
  Loader2,
  Book,
  FileText,
  ListChecks
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { 
  ContentAnalysis, 
  IntelligenceSuggestion, 
  UseContentIntelligenceReturn 
} from '@/hooks/useContentIntelligence';
import { useFollowUpSystem } from '@/hooks/useFollowUpSystem';

interface IntelligencePanelProps {
  intelligence: UseContentIntelligenceReturn;
  contentType: 'ppt' | 'assignment' | 'notes';
  contentId?: string;
  onSuggestionApply?: (suggestion: IntelligenceSuggestion) => void;
  className?: string;
}

export function IntelligencePanel({ 
  intelligence, 
  contentType, 
  contentId,
  onSuggestionApply,
  className = '' 
}: IntelligencePanelProps) {
  const { toast } = useToast();
  const { createFollowUp, processFollowUp, isProcessing } = useFollowUpSystem();
  
  const [expanded, setExpanded] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  const { analysis, suggestions, isAnalyzing, error } = intelligence;

  // Helper functions
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-yellow-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-500/10';
    if (score >= 75) return 'bg-yellow-500/10';
    if (score >= 60) return 'bg-orange-500/10';
    return 'bg-red-500/10';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'very_easy': case 'easy': return 'text-green-500';
      case 'fairly_easy': case 'standard': return 'text-yellow-500';
      case 'fairly_difficult': return 'text-orange-500';
      case 'difficult': case 'very_difficult': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
      case 'medium': return <TrendingUp className="h-3.5 w-3.5 text-yellow-500" />;
      case 'low': return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      default: return <Lightbulb className="h-3.5 w-3.5 text-blue-500" />;
    }
  };

  const getContentIcon = () => {
    switch (contentType) {
      case 'ppt': return <FileText className="h-4 w-4" />;
      case 'assignment': return <Book className="h-4 w-4" />;
      case 'notes': return <ListChecks className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  // Apply suggestion via follow-up system
  const handleApplySuggestion = async (suggestion: IntelligenceSuggestion) => {
    if (!contentId || !suggestion.prompt) {
      toast({
        title: "Cannot apply suggestion",
        description: "Content ID or suggestion prompt missing",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create follow-up request
      const followUpId = await createFollowUp(
        contentType,
        contentId,
        suggestion.prompt,
        'full' // Usually apply to full content
      );

      // Process the follow-up immediately
      await processFollowUp(followUpId);

      // Mark as applied
      setAppliedSuggestions(prev => new Set([...prev, suggestion.id]));

      // Call parent handler if provided
      onSuggestionApply?.(suggestion);

      toast({
        title: "Suggestion applied",
        description: "Content has been enhanced based on the suggestion",
      });

    } catch (error) {
      console.error('Error applying suggestion:', error);
      toast({
        title: "Failed to apply suggestion",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  if (error) {
    return (
      <Card className={`border-red-200 bg-red-50/50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Analysis Error</span>
          </div>
          <p className="text-sm text-red-600/80 mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (isAnalyzing) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              Analyzing content intelligence...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <Card className={`border-primary/20 ${className}`}>
      <CardHeader 
        className="pb-2 cursor-pointer" 
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Content Intelligence
            {getContentIcon()}
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`${getScoreColor(analysis.completenessScore)} border-current`}
            >
              {analysis.completenessScore}% Complete
            </Badge>
            {expanded ? 
              <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            }
          </div>
        </CardTitle>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="space-y-4">
              
              {/* Completeness Score */}
              <div className={`p-3 rounded-lg ${getScoreBgColor(analysis.completenessScore)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Content Completeness</span>
                  <span className={`text-sm font-bold ${getScoreColor(analysis.completenessScore)}`}>
                    {analysis.completenessScore}%
                  </span>
                </div>
                <Progress 
                  value={analysis.completenessScore} 
                  className="h-2"
                />
              </div>

              {/* Reading Level */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Book className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Reading Level
                    </span>
                  </div>
                  <div className={`text-sm font-semibold ${getDifficultyColor(analysis.readingLevel.difficulty)}`}>
                    Grade {analysis.readingLevel.gradeLevel}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {analysis.readingLevel.difficulty.replace('_', ' ')}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Structure
                    </span>
                  </div>
                  <div className="text-sm font-semibold">
                    {analysis.structure.sectionsCount} sections
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {analysis.structure.hasIntroduction && <span>✓ Intro</span>}
                    {analysis.structure.hasConclusion && <span>✓ Conclusion</span>}
                    {analysis.structure.hasExamples && <span>✓ Examples</span>}
                  </div>
                </div>
              </div>

              {/* Subtopic Coverage */}
              {analysis.subtopicCoverage.requested.length > 0 && (
                <div className="p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Subtopic Coverage</span>
                    <Badge variant="outline" className={
                      analysis.subtopicCoverage.coverage >= 80 ? 'text-green-500 border-green-500' :
                      analysis.subtopicCoverage.coverage >= 60 ? 'text-yellow-500 border-yellow-500' :
                      'text-red-500 border-red-500'
                    }>
                      {analysis.subtopicCoverage.coverage}%
                    </Badge>
                  </div>
                  <Progress 
                    value={analysis.subtopicCoverage.coverage} 
                    className="h-2 mb-2"
                  />
                  <div className="flex flex-wrap gap-1">
                    {analysis.subtopicCoverage.covered.map((topic, i) => (
                      <Badge key={i} variant="secondary" className="text-xs text-green-600">
                        ✓ {topic}
                      </Badge>
                    ))}
                    {analysis.subtopicCoverage.missing.map((topic, i) => (
                      <Badge key={i} variant="secondary" className="text-xs text-red-600">
                        ✗ {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Gaps */}
              {analysis.gaps.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Detected Issues ({analysis.gaps.length})
                  </h4>
                  <div className="space-y-2">
                    {analysis.gaps.slice(0, 3).map((gap, i) => (
                      <div key={i} className="p-2 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-700">
                        <div className="flex items-center gap-2 mb-1">
                          {getPriorityIcon(gap.severity)}
                          <span className="text-sm font-medium">{gap.description}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{gap.suggestion}</p>
                      </div>
                    ))}
                    {analysis.gaps.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{analysis.gaps.length - 3} more issues detected
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Smart Suggestions */}
              {suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Smart Suggestions ({suggestions.length})
                  </h4>
                  <div className="space-y-2">
                    {suggestions.slice(0, 3).map((suggestion) => {
                      const isApplied = appliedSuggestions.has(suggestion.id);
                      return (
                        <div key={suggestion.id} className="p-3 rounded-lg bg-blue-50/50 border border-blue-200 dark:bg-blue-900/10 dark:border-blue-700">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {getPriorityIcon(suggestion.priority)}
                              <span className="text-sm font-medium">{suggestion.title}</span>
                            </div>
                            <Button
                              size="sm"
                              variant={isApplied ? "secondary" : "default"}
                              className="h-6 px-2 text-xs"
                              onClick={() => handleApplySuggestion(suggestion)}
                              disabled={isApplied || isProcessing}
                            >
                              {isApplied ? '✓ Applied' : suggestion.action}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Perfect Score Message */}
              {analysis.completenessScore >= 95 && analysis.gaps.length === 0 && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-center dark:bg-green-900/10 dark:border-green-700">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Excellent content quality!
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    Your content meets all quality standards
                  </p>
                </div>
              )}

            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
// ============================================================
// useContentIntelligence.ts — Smart content analysis and suggestions
// Analyzes generated content for gaps, reading level, completeness
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import type { GeneratedSlide } from '@/types/database';

export interface ContentGap {
  type: 'missing_section' | 'shallow_coverage' | 'missing_subtopic' | 'poor_structure';
  section?: string;
  description: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ReadingLevelAnalysis {
  gradeLevel: number;
  fleschScore: number;
  difficulty: 'very_easy' | 'easy' | 'fairly_easy' | 'standard' | 'fairly_difficult' | 'difficult' | 'very_difficult';
  recommendation?: string;
}

export interface ContentAnalysis {
  completenessScore: number; // 0-100
  gaps: ContentGap[];
  readingLevel: ReadingLevelAnalysis;
  structure: {
    hasIntroduction: boolean;
    hasConclusion: boolean;
    hasExamples: boolean;
    sectionsCount: number;
    averageSectionLength: number;
  };
  subtopicCoverage: {
    requested: string[];
    covered: string[];
    missing: string[];
    coverage: number; // 0-100
  };
}

export interface IntelligenceSuggestion {
  id: string;
  type: 'gap_fill' | 'reading_level' | 'structure' | 'subtopic' | 'enhancement';
  title: string;
  description: string;
  action: string;
  priority: 'low' | 'medium' | 'high';
  prompt?: string; // For follow-up system
}

export interface UseContentIntelligenceReturn {
  analysis: ContentAnalysis | null;
  suggestions: IntelligenceSuggestion[];
  isAnalyzing: boolean;
  error: string | null;
  
  analyzePPT: (slides: GeneratedSlide[], requestedSubtopics?: string[]) => Promise<void>;
  analyzeAssignment: (content: string, requestedSubtopics?: string[], targetLevel?: string) => Promise<void>;
  analyzeNotes: (headings: any[], bullets: any[], summary: string, requestedSubtopics?: string[]) => Promise<void>;
  clearAnalysis: () => void;
  generateSuggestions: () => void;
}

export function useContentIntelligence(): UseContentIntelligenceReturn {
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<IntelligenceSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── READING LEVEL ANALYSIS ────────────────────────────────
  
  const analyzeReadingLevel = useCallback((text: string): ReadingLevelAnalysis => {
    // Flesch Reading Ease score calculation
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((count, word) => count + countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) {
      return {
        gradeLevel: 0,
        fleschScore: 0,
        difficulty: 'standard',
      };
    }

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Flesch Reading Ease = 206.835 - 1.015 × (total words / total sentences) - 84.6 × (total syllables / total words)
    const fleschScore = Math.max(0, Math.min(100, 
      206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
    ));

    // Flesch-Kincaid Grade Level = 0.39 × (total words / total sentences) + 11.8 × (total syllables / total words) - 15.59
    const gradeLevel = Math.max(0, 
      (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59
    );

    let difficulty: ReadingLevelAnalysis['difficulty'];
    let recommendation: string | undefined;

    if (fleschScore >= 90) {
      difficulty = 'very_easy';
    } else if (fleschScore >= 80) {
      difficulty = 'easy';
    } else if (fleschScore >= 70) {
      difficulty = 'fairly_easy';
    } else if (fleschScore >= 60) {
      difficulty = 'standard';
    } else if (fleschScore >= 50) {
      difficulty = 'fairly_difficult';
    } else if (fleschScore >= 30) {
      difficulty = 'difficult';
    } else {
      difficulty = 'very_difficult';
      recommendation = 'Consider simplifying sentence structure and using more common words';
    }

    return {
      gradeLevel: Math.round(gradeLevel * 10) / 10,
      fleschScore: Math.round(fleschScore),
      difficulty,
      recommendation,
    };
  }, []);

  // ── SYLLABLE COUNTING ──────────────────────────────────────
  
  const countSyllables = (word: string): number => {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? Math.max(1, matches.length) : 1;
  };

  // ── CONTENT STRUCTURE ANALYSIS ─────────────────────────────
  
  const analyzeStructure = useCallback((content: string) => {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    
    // Look for introduction patterns
    const hasIntroduction = /\b(introduce|introduction|overview|begin|start|first)\b/i.test(content.slice(0, 200));
    
    // Look for conclusion patterns
    const hasConclusion = /\b(conclude|conclusion|summary|finally|in conclusion|to summarize)\b/i.test(content.slice(-200));
    
    // Look for examples
    const hasExamples = /\b(example|for instance|such as|including|like)\b/i.test(content);
    
    // Count sections (headings or major breaks)
    const sections = content.split(/\n\s*\n/).filter(s => s.trim().length > 0);
    const sectionsCount = sections.length;
    const averageSectionLength = sectionsCount > 0 ? words.length / sectionsCount : 0;

    return {
      hasIntroduction,
      hasConclusion,
      hasExamples,
      sectionsCount,
      averageSectionLength: Math.round(averageSectionLength),
    };
  }, []);

  // ── SUBTOPIC COVERAGE ANALYSIS ─────────────────────────────
  
  const analyzeSubtopicCoverage = useCallback((content: string, requestedSubtopics: string[] = []) => {
    if (requestedSubtopics.length === 0) {
      return {
        requested: [],
        covered: [],
        missing: [],
        coverage: 100, // No subtopics requested, so 100% coverage
      };
    }

    const contentLower = content.toLowerCase();
    const covered: string[] = [];
    const missing: string[] = [];

    requestedSubtopics.forEach(subtopic => {
      // Check if subtopic or related keywords appear in content
      const subtopicWords = subtopic.toLowerCase().split(/\s+/);
      const hasDirectMatch = contentLower.includes(subtopic.toLowerCase());
      const hasPartialMatch = subtopicWords.some(word => 
        word.length > 3 && contentLower.includes(word)
      );

      if (hasDirectMatch || hasPartialMatch) {
        covered.push(subtopic);
      } else {
        missing.push(subtopic);
      }
    });

    const coverage = requestedSubtopics.length > 0 
      ? Math.round((covered.length / requestedSubtopics.length) * 100)
      : 100;

    return {
      requested: requestedSubtopics,
      covered,
      missing,
      coverage,
    };
  }, []);

  // ── CONTENT GAPS DETECTION ─────────────────────────────────
  
  const detectGaps = useCallback((
    content: string,
    structure: any,
    subtopicCoverage: any,
    readingLevel: ReadingLevelAnalysis
  ): ContentGap[] => {
    const gaps: ContentGap[] = [];

    // Structural gaps
    if (!structure.hasIntroduction) {
      gaps.push({
        type: 'poor_structure',
        description: 'Content lacks a clear introduction',
        suggestion: 'Add an introductory section that outlines the main topics',
        severity: 'medium',
      });
    }

    if (!structure.hasConclusion) {
      gaps.push({
        type: 'poor_structure',
        description: 'Content lacks a conclusion or summary',
        suggestion: 'Add a concluding section that summarizes key points',
        severity: 'medium',
      });
    }

    if (!structure.hasExamples && content.length > 500) {
      gaps.push({
        type: 'shallow_coverage',
        description: 'Content lacks examples to illustrate concepts',
        suggestion: 'Include practical examples or case studies',
        severity: 'low',
      });
    }

    // Subtopic gaps
    if (subtopicCoverage.missing.length > 0) {
      gaps.push({
        type: 'missing_subtopic',
        description: `Missing coverage of: ${subtopicCoverage.missing.join(', ')}`,
        suggestion: 'Add sections covering the missing subtopics',
        severity: 'high',
      });
    }

    // Reading level issues
    if (readingLevel.gradeLevel > 16) {
      gaps.push({
        type: 'shallow_coverage',
        description: 'Content may be too complex for general audience',
        suggestion: 'Simplify language and sentence structure',
        severity: 'medium',
      });
    }

    // Short content detection
    if (structure.averageSectionLength < 50) {
      gaps.push({
        type: 'shallow_coverage',
        description: 'Sections appear too brief',
        suggestion: 'Expand sections with more detailed explanations',
        severity: 'medium',
      });
    }

    return gaps;
  }, []);

  // ── PPT ANALYSIS ───────────────────────────────────────────
  
  const analyzePPT = useCallback(async (slides: GeneratedSlide[], requestedSubtopics: string[] = []) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Extract text content from slides
      const allContent = slides.map(slide => {
        const content = [slide.title, ...(slide.content || [])];
        if (slide.speaker_notes) content.push(slide.speaker_notes);
        return content.join('\n');
      }).join('\n\n');

      const readingLevel = analyzeReadingLevel(allContent);
      const structure = analyzeStructure(allContent);
      const subtopicCoverage = analyzeSubtopicCoverage(allContent, requestedSubtopics);

      // PPT-specific structure analysis
      const hasIntroSlide = slides.some(s => /\b(introduction|overview|agenda)\b/i.test(s.title));
      const hasConclusionSlide = slides.some(s => /\b(conclusion|summary|recap|thank)\b/i.test(s.title));
      
      const enhancedStructure = {
        ...structure,
        hasIntroduction: hasIntroSlide,
        hasConclusion: hasConclusionSlide,
        sectionsCount: slides.length,
        averageSectionLength: Math.round(slides.reduce((acc, s) => acc + (s.content?.length || 0), 0) / slides.length),
      };

      const gaps = detectGaps(allContent, enhancedStructure, subtopicCoverage, readingLevel);

      // Calculate completeness score
      let completenessScore = 70; // Base score
      if (enhancedStructure.hasIntroduction) completenessScore += 10;
      if (enhancedStructure.hasConclusion) completenessScore += 10;
      if (enhancedStructure.hasExamples) completenessScore += 10;
      if (subtopicCoverage.coverage > 80) completenessScore += 10;
      if (gaps.length === 0) completenessScore += 10;
      completenessScore = Math.min(100, completenessScore);

      const analysis: ContentAnalysis = {
        completenessScore,
        gaps,
        readingLevel,
        structure: enhancedStructure,
        subtopicCoverage,
      };

      setAnalysis(analysis);
      generateSuggestions();
      
    } catch (err) {
      console.error('PPT analysis error:', err);
      setError('Failed to analyze presentation content');
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeReadingLevel, analyzeStructure, analyzeSubtopicCoverage, detectGaps]);

  // ── ASSIGNMENT ANALYSIS ────────────────────────────────────
  
  const analyzeAssignment = useCallback(async (
    content: string, 
    requestedSubtopics: string[] = [], 
    targetLevel: string = 'undergraduate'
  ) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const readingLevel = analyzeReadingLevel(content);
      const structure = analyzeStructure(content);
      const subtopicCoverage = analyzeSubtopicCoverage(content, requestedSubtopics);
      const gaps = detectGaps(content, structure, subtopicCoverage, readingLevel);

      // Calculate completeness score for assignments
      let completenessScore = 60; // Base score
      if (structure.hasIntroduction) completenessScore += 15;
      if (structure.hasConclusion) completenessScore += 15;
      if (structure.hasExamples) completenessScore += 10;
      if (subtopicCoverage.coverage > 90) completenessScore += 15;
      if (readingLevel.gradeLevel <= 16) completenessScore += 10;
      if (gaps.length === 0) completenessScore += 10;
      completenessScore = Math.min(100, completenessScore);

      const analysis: ContentAnalysis = {
        completenessScore,
        gaps,
        readingLevel,
        structure,
        subtopicCoverage,
      };

      setAnalysis(analysis);
      generateSuggestions();
      
    } catch (err) {
      console.error('Assignment analysis error:', err);
      setError('Failed to analyze assignment content');
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeReadingLevel, analyzeStructure, analyzeSubtopicCoverage, detectGaps]);

  // ── NOTES ANALYSIS ─────────────────────────────────────────
  
  const analyzeNotes = useCallback(async (
    headings: any[], 
    bullets: any[], 
    summary: string, 
    requestedSubtopics: string[] = []
  ) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Combine all note content
      const allContent = [
        ...headings.map(h => h.text || ''),
        ...bullets.flatMap(b => b.points || []),
        summary || ''
      ].join('\n');

      const readingLevel = analyzeReadingLevel(allContent);
      const structure = {
        hasIntroduction: summary.length > 0,
        hasConclusion: summary.length > 0,
        hasExamples: /\b(example|for instance|such as)\b/i.test(allContent),
        sectionsCount: headings.length,
        averageSectionLength: Math.round(bullets.reduce((acc, b) => acc + (b.points?.length || 0), 0) / Math.max(1, bullets.length)),
      };
      
      const subtopicCoverage = analyzeSubtopicCoverage(allContent, requestedSubtopics);
      const gaps = detectGaps(allContent, structure, subtopicCoverage, readingLevel);

      // Calculate completeness score for notes
      let completenessScore = 65; // Base score
      if (structure.sectionsCount >= 4) completenessScore += 15;
      if (structure.hasExamples) completenessScore += 10;
      if (summary.length > 100) completenessScore += 10;
      if (subtopicCoverage.coverage > 85) completenessScore += 15;
      if (gaps.length <= 1) completenessScore += 10;
      completenessScore = Math.min(100, completenessScore);

      const analysis: ContentAnalysis = {
        completenessScore,
        gaps,
        readingLevel,
        structure,
        subtopicCoverage,
      };

      setAnalysis(analysis);
      generateSuggestions();
      
    } catch (err) {
      console.error('Notes analysis error:', err);
      setError('Failed to analyze notes content');
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeReadingLevel, analyzeSubtopicCoverage, detectGaps]);

  // ── SUGGESTION GENERATION ──────────────────────────────────
  
  const generateSuggestions = useCallback(() => {
    if (!analysis) return;

    const newSuggestions: IntelligenceSuggestion[] = [];

    // Generate suggestions from gaps
    analysis.gaps.forEach((gap, index) => {
      newSuggestions.push({
        id: `gap-${index}`,
        type: gap.type === 'missing_subtopic' ? 'subtopic' : 'gap_fill',
        title: gap.description,
        description: gap.suggestion,
        action: 'Apply Fix',
        priority: gap.severity,
        prompt: gap.suggestion,
      });
    });

    // Reading level suggestions
    if (analysis.readingLevel.recommendation) {
      newSuggestions.push({
        id: 'reading-level',
        type: 'reading_level',
        title: `Content is ${analysis.readingLevel.difficulty}`,
        description: analysis.readingLevel.recommendation,
        action: 'Simplify Language',
        priority: 'medium',
        prompt: analysis.readingLevel.recommendation,
      });
    }

    // Completeness suggestions
    if (analysis.completenessScore < 80) {
      newSuggestions.push({
        id: 'completeness',
        type: 'enhancement',
        title: `Content completeness: ${analysis.completenessScore}%`,
        description: 'Content could be enhanced for better coverage',
        action: 'Enhance Content',
        priority: analysis.completenessScore < 60 ? 'high' : 'medium',
        prompt: 'Enhance this content with more detailed explanations and better structure',
      });
    }

    setSuggestions(newSuggestions);
  }, [analysis]);

  // ── UTILITY FUNCTIONS ──────────────────────────────────────
  
  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setSuggestions([]);
    setError(null);
  }, []);

  // Auto-generate suggestions when analysis updates
  useEffect(() => {
    if (analysis) {
      generateSuggestions();
    }
  }, [analysis, generateSuggestions]);

  return {
    analysis,
    suggestions,
    isAnalyzing,
    error,
    analyzePPT,
    analyzeAssignment,
    analyzeNotes,
    clearAnalysis,
    generateSuggestions,
  };
}
// ============================================================
// Smart Mode Generator Hook
// Handles AI generation for 6 content types with document context
// ============================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export type SmartModeContentType = 
  | 'notes' 
  | 'qa' 
  | 'interview_prep' 
  | 'exam_questions' 
  | 'teaching_notes' 
  | 'flashcards';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type OutputFormat = 'standard' | 'detailed' | 'concise';

export interface GenerationOptions {
  contentType: SmartModeContentType;
  title: string;
  difficulty?: DifficultyLevel;
  focusAreas?: string[];
  outputFormat?: OutputFormat;
  customInstructions?: string;
}

export interface SmartModeGeneration {
  id: string;
  uploadId: string;
  contentType: SmartModeContentType;
  title: string;
  difficultyLevel: DifficultyLevel;
  focusAreas: string[];
  outputFormat: OutputFormat;
  contentJson: any;
  status: 'generating' | 'ready' | 'error';
  errorMessage?: string;
  generationTime?: string;
  createdAt: string;
  updatedAt: string;
}

interface GenerationState {
  isGenerating: boolean;
  error: string | null;
  progress: number;
  currentStep: string;
}

export function useSmartModeGenerator(uploadId: string, documentContent: string) {
  const { user } = useAuth();
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    error: null,
    progress: 0,
    currentStep: ''
  });

  const [generations, setGenerations] = useState<SmartModeGeneration[]>([]);

  // Load existing generations
  const loadGenerations = useCallback(async () => {
    if (!user || !uploadId) return;

    try {
      const { data, error } = await supabase
        .from('smart_mode_generations')
        .select('*')
        .eq('upload_id', uploadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGenerations(data || []);
    } catch (error) {
      console.error('Failed to load generations:', error);
    }
  }, [user, uploadId]);

  // Generate content using AI routing
  const generateContent = useCallback(async (options: GenerationOptions) => {
    if (!user || !uploadId || !documentContent.trim()) {
      setState(prev => ({ ...prev, error: 'Missing required data for generation' }));
      return null;
    }

    setState({
      isGenerating: true,
      error: null,
      progress: 10,
      currentStep: 'Preparing generation...'
    });

    try {
      // Create generation record
      const { data: generation, error: insertError } = await supabase
        .from('smart_mode_generations')
        .insert({
          upload_id: uploadId,
          user_id: user.id,
          content_type: options.contentType,
          title: options.title,
          difficulty_level: options.difficulty || 'medium',
          focus_areas: options.focusAreas || [],
          output_format: options.outputFormat || 'standard',
          status: 'generating'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setState(prev => ({ ...prev, progress: 25, currentStep: 'Creating AI prompts...' }));

      // Prepare AI prompt based on content type
      const prompt = buildPrompt(options, documentContent);

      setState(prev => ({ ...prev, progress: 50, currentStep: 'Generating with AI...' }));

      // Call AI generation API with appropriate routing
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: getAIContentType(options.contentType),
          mode: options.difficulty === 'hard' ? 'exam' : 'basic',
          systemPrompt: prompt.system,
          userPrompt: prompt.user,
          options: {
            skipValidation: false // Use validation for quality
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const result = await response.json();

      setState(prev => ({ ...prev, progress: 75, currentStep: 'Processing results...' }));

      // Parse and validate the generated content
      const parsedContent = parseGeneratedContent(options.contentType, result);

      // Update the generation record with results
      const { error: updateError } = await supabase
        .from('smart_mode_generations')
        .update({
          content_json: parsedContent,
          status: 'ready',
          generation_time: new Date().toISOString()
        })
        .eq('id', generation.id);

      if (updateError) throw updateError;

      setState(prev => ({ ...prev, progress: 100, currentStep: 'Complete!' }));

      // Reload generations to show the new one
      await loadGenerations();

      setState({
        isGenerating: false,
        error: null,
        progress: 0,
        currentStep: ''
      });

      return generation.id;

    } catch (error) {
      console.error('Generation failed:', error);
      setState({
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        progress: 0,
        currentStep: ''
      });
      return null;
    }
  }, [user, uploadId, documentContent, loadGenerations]);

  // Delete a generation
  const deleteGeneration = useCallback(async (generationId: string) => {
    try {
      const { error } = await supabase
        .from('smart_mode_generations')
        .delete()
        .eq('id', generationId);

      if (error) throw error;
      
      // Remove from local state
      setGenerations(prev => prev.filter(g => g.id !== generationId));
    } catch (error) {
      console.error('Failed to delete generation:', error);
    }
  }, []);

  return {
    ...state,
    generations,
    generateContent,
    deleteGeneration,
    loadGenerations
  };
}

// Helper functions

function buildPrompt(options: GenerationOptions, documentContent: string) {
  const { contentType, difficulty, focusAreas, outputFormat, customInstructions } = options;

  const baseContext = `Based on the following document content, generate ${contentType.replace('_', ' ')}:\n\n${documentContent.substring(0, 4000)}...`;

  const difficultyInstructions = {
    easy: 'Keep the language simple and focus on basic concepts. Suitable for beginners.',
    medium: 'Use moderate complexity. Balance basic and advanced concepts.',
    hard: 'Include advanced concepts, complex analysis, and detailed explanations.'
  };

  const formatInstructions = {
    standard: 'Use a balanced approach with clear structure.',
    detailed: 'Provide comprehensive, in-depth content with examples.',
    concise: 'Keep content brief and to the point, focusing on key insights.'
  };

  let systemPrompt = `You are an AI educational content generator. Generate high-quality ${contentType.replace('_', ' ')} content based on the provided document.

Requirements:
- Difficulty Level: ${difficulty} - ${difficultyInstructions[difficulty || 'medium']}
- Output Format: ${outputFormat} - ${formatInstructions[outputFormat || 'standard']}
- Always respond with valid JSON in the specified format
- Ensure content is educational, accurate, and well-structured`;

  if (focusAreas && focusAreas.length > 0) {
    systemPrompt += `\n- Focus Areas: ${focusAreas.join(', ')}`;
  }

  if (customInstructions) {
    systemPrompt += `\n- Additional Instructions: ${customInstructions}`;
  }

  systemPrompt += getContentTypeInstructions(contentType);

  return {
    system: systemPrompt,
    user: baseContext
  };
}

function getContentTypeInstructions(contentType: SmartModeContentType): string {
  const instructions = {
    notes: '\n\nGenerate structured notes with:\n{"title": "string", "sections": [{"heading": "string", "content": "string", "keyPoints": ["string"]}], "summary": "string"}',
    
    qa: '\n\nGenerate Q&A pairs with:\n{"questions": [{"question": "string", "answer": "string", "difficulty": "easy|medium|hard", "category": "string"}], "totalQuestions": number}',
    
    interview_prep: '\n\nGenerate interview preparation with:\n{"behavioralQuestions": [{"question": "string", "sampleAnswer": "string", "tips": ["string"]}], "technicalQuestions": [{"question": "string", "keyPoints": ["string"]}], "tips": ["string"]}',
    
    exam_questions: '\n\nGenerate exam questions with:\n{"multipleChoice": [{"question": "string", "options": ["string"], "correctAnswer": number, "explanation": "string"}], "shortAnswer": [{"question": "string", "sampleAnswer": "string", "points": number}], "essay": [{"question": "string", "keyPoints": ["string"], "timeRecommended": "string"}]}',
    
    teaching_notes: '\n\nGenerate teaching notes with:\n{"lessonObjectives": ["string"], "keyTopics": [{"topic": "string", "explanation": "string", "examples": ["string"]}], "activities": [{"name": "string", "description": "string", "duration": "string"}], "assessmentIdeas": ["string"]}',
    
    flashcards: '\n\nGenerate flashcards with:\n{"cards": [{"front": "string", "back": "string", "category": "string", "difficulty": "easy|medium|hard"}], "totalCards": number, "categories": ["string"]}'
  };

  return instructions[contentType];
}

function getAIContentType(contentType: SmartModeContentType): string {
  // Map Smart Mode content types to AI routing types
  const mapping = {
    notes: 'notes',
    qa: 'research',
    interview_prep: 'research', 
    exam_questions: 'notes_exam',
    teaching_notes: 'notes',
    flashcards: 'research'
  };

  return mapping[contentType];
}

function parseGeneratedContent(contentType: SmartModeContentType, aiResponse: any) {
  try {
    // AI response should already be parsed JSON
    const content = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
    
    // Validate structure based on content type
    if (!content || typeof content !== 'object') {
      throw new Error('Invalid content structure');
    }

    // Add metadata
    return {
      ...content,
      generatedAt: new Date().toISOString(),
      contentType,
      version: '1.0'
    };
  } catch (error) {
    console.error('Failed to parse generated content:', error);
    return {
      error: 'Failed to parse generated content',
      rawResponse: aiResponse,
      generatedAt: new Date().toISOString(),
      contentType,
      version: '1.0'
    };
  }
}
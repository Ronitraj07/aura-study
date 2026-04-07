// ============================================================
// useFollowUpSystem.ts — Universal AI Follow-up System
// Enables natural language modifications across PPT, Notes, Assignment content
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type ContentType = 'ppt' | 'assignment' | 'notes';
export type FollowUpScope = 'full' | 'section' | 'specific';

export interface FollowUpRequest {
  id: string;
  contentType: ContentType;
  contentId: string;
  prompt: string;
  scope: FollowUpScope;
  targetIndices?: number[]; // For specific sections/slides/blocks
  appliedAt?: string;
  appliedToVersion?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any; // The modified content
  error?: string;
}

export interface FollowUpPreview {
  original: string;
  modified: string;
  changes: Array<{
    type: 'added' | 'removed' | 'modified';
    content: string;
    index?: number;
  }>;
}

export interface UseFollowUpSystemReturn {
  // State
  pendingFollowUps: FollowUpRequest[];
  isProcessing: boolean;
  currentRequest: FollowUpRequest | null;
  preview: FollowUpPreview | null;
  
  // Actions
  createFollowUp: (
    contentType: ContentType,
    contentId: string,
    prompt: string,
    scope?: FollowUpScope,
    targetIndices?: number[]
  ) => Promise<string>; // Returns follow-up ID
  
  processFollowUp: (followUpId: string) => Promise<void>;
  applyFollowUp: (followUpId: string) => Promise<void>;
  discardFollowUp: (followUpId: string) => void;
  generatePreview: (followUpId: string) => Promise<FollowUpPreview>;
  
  // Utilities
  clearAllFollowUps: () => void;
  getFollowUpHistory: (contentId: string) => Promise<FollowUpRequest[]>;
}

export function useFollowUpSystem(): UseFollowUpSystemReturn {
  // ── STATE ─────────────────────────────────────────────────
  
  const [pendingFollowUps, setPendingFollowUps] = useState<FollowUpRequest[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<FollowUpRequest | null>(null);
  const [preview, setPreview] = useState<FollowUpPreview | null>(null);
  
  // Refs for managing async operations
  const processingRef = useRef(false);
  const requestIdRef = useRef(0);

  // ── UTILITIES ─────────────────────────────────────────────
  
  const generateId = useCallback(() => {
    return `followup_${Date.now()}_${++requestIdRef.current}`;
  }, []);

  const buildContextPrompt = useCallback(async (
    contentType: ContentType, 
    contentId: string,
    scope: FollowUpScope,
    targetIndices?: number[]
  ): Promise<{ systemPrompt: string; userPrompt: string; currentContent: any }> => {
    // Fetch current content from Supabase
    let currentContent: any = null;
    let contextPrompt = '';
    
    try {
      if (contentType === 'ppt') {
        const { data } = await supabase
          .from('ppts')
          .select('*')
          .eq('id', contentId)
          .single();
        currentContent = data;
        
        if (scope === 'full') {
          contextPrompt = `Modifying entire presentation: "${data?.title || 'Untitled'}"\n`;
          contextPrompt += `Total slides: ${data?.slides?.length || 0}\n`;
          contextPrompt += `Current slides:\n${data?.slides?.map((slide: any, i: number) => 
            `Slide ${i + 1}: ${slide.title}\n- ${slide.content?.join('\n- ') || ''}`
          ).join('\n\n') || ''}`;
        } else if (scope === 'specific' && targetIndices) {
          contextPrompt = `Modifying specific slides in presentation: "${data?.title || 'Untitled'}"\n`;
          const targetSlides = targetIndices.map(i => data?.slides?.[i]).filter(Boolean);
          contextPrompt += `Slides to modify:\n${targetSlides.map((slide: any, i: number) => 
            `Slide ${targetIndices[i] + 1}: ${slide.title}\n- ${slide.content?.join('\n- ') || ''}`
          ).join('\n\n')}`;
          
          // Add surrounding context
          const beforeSlides = targetIndices.map(i => data?.slides?.[i - 1]).filter(Boolean);
          const afterSlides = targetIndices.map(i => data?.slides?.[i + 1]).filter(Boolean);
          
          if (beforeSlides.length > 0) {
            contextPrompt += `\n\nPrevious slides for context:\n${beforeSlides.map((slide: any) => 
              `${slide.title}: ${slide.content?.join(', ') || ''}`
            ).join('\n')}`;
          }
          
          if (afterSlides.length > 0) {
            contextPrompt += `\n\nFollowing slides for context:\n${afterSlides.map((slide: any) => 
              `${slide.title}: ${slide.content?.join(', ') || ''}`
            ).join('\n')}`;
          }
        }
        
      } else if (contentType === 'assignment') {
        const { data } = await supabase
          .from('assignments')
          .select('*')
          .eq('id', contentId)
          .single();
        currentContent = data;
        
        if (scope === 'full') {
          contextPrompt = `Modifying entire assignment: "${data?.topic || 'Untitled'}"\n`;
          contextPrompt += `Word count: ${data?.word_count || 'Not specified'}\n`;
          contextPrompt += `Tone: ${data?.tone || 'Not specified'}\n`;
          contextPrompt += `Current content:\n${data?.content || ''}`;
        }
        
      } else if (contentType === 'notes') {
        const { data } = await supabase
          .from('notes')
          .select('*')
          .eq('id', contentId)
          .single();
        currentContent = data;
        
        if (scope === 'full') {
          contextPrompt = `Modifying entire notes: "${data?.topic || 'Untitled'}"\n`;
          contextPrompt += `Depth: ${data?.depth || 'Not specified'}\n`;
          contextPrompt += `Headings: ${data?.headings?.length || 0}\n`;
          contextPrompt += `Current structure:\n${data?.headings?.map((heading: any, i: number) => {
            const bullets = data?.bullets?.find((b: any) => b.heading === heading.text);
            return `${heading.level === 1 ? '#' : heading.level === 2 ? '##' : '###'} ${heading.text}\n${
              bullets?.points?.map((point: string) => `- ${point}`).join('\n') || ''
            }`;
          }).join('\n\n') || ''}`;
        } else if (scope === 'specific' && targetIndices) {
          contextPrompt = `Modifying specific sections in notes: "${data?.topic || 'Untitled'}"\n`;
          const targetHeadings = targetIndices.map(i => data?.headings?.[i]).filter(Boolean);
          contextPrompt += `Sections to modify:\n${targetHeadings.map((heading: any, i: number) => {
            const bullets = data?.bullets?.find((b: any) => b.heading === heading.text);
            return `${heading.level === 1 ? '#' : heading.level === 2 ? '##' : '###'} ${heading.text}\n${
              bullets?.points?.map((point: string) => `- ${point}`).join('\n') || ''
            }`;
          }).join('\n\n')}`;
        }
      }
    } catch (error) {
      console.error('Error fetching content for follow-up:', error);
      throw new Error('Failed to fetch content for modification');
    }

    return {
      systemPrompt: `You are a professional content editor specializing in ${contentType.toUpperCase()} modifications. Your task is to apply the user's requested changes while maintaining the existing structure, quality, and formatting. Always preserve the original JSON structure and data types.`,
      userPrompt: `${contextPrompt}\n\nUser's modification request: "{FOLLOW_UP_PROMPT}"\n\nPlease apply the requested changes and return the complete modified content in the exact same JSON structure.`,
      currentContent
    };
  }, []);

  // ── FOLLOW-UP ACTIONS ────────────────────────────────────
  
  const createFollowUp = useCallback(async (
    contentType: ContentType,
    contentId: string,
    prompt: string,
    scope: FollowUpScope = 'full',
    targetIndices?: number[]
  ): Promise<string> => {
    const followUpId = generateId();
    
    const newRequest: FollowUpRequest = {
      id: followUpId,
      contentType,
      contentId,
      prompt,
      scope,
      targetIndices,
      status: 'pending'
    };
    
    setPendingFollowUps(prev => [...prev, newRequest]);
    
    return followUpId;
  }, [generateId]);

  const processFollowUp = useCallback(async (followUpId: string): Promise<void> => {
    if (processingRef.current) {
      throw new Error('Another follow-up is already being processed');
    }

    processingRef.current = true;
    setIsProcessing(true);
    
    try {
      // Find the follow-up request
      const request = pendingFollowUps.find(req => req.id === followUpId);
      if (!request) {
        throw new Error('Follow-up request not found');
      }

      setCurrentRequest(request);
      
      // Update status to processing
      setPendingFollowUps(prev => 
        prev.map(req => 
          req.id === followUpId 
            ? { ...req, status: 'processing' } 
            : req
        )
      );

      // Build context and prompt
      const { systemPrompt, userPrompt, currentContent } = await buildContextPrompt(
        request.contentType,
        request.contentId,
        request.scope,
        request.targetIndices
      );

      const finalUserPrompt = userPrompt.replace('{FOLLOW_UP_PROMPT}', request.prompt);

      // Call the API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: `${request.contentType}_follow_up`,
          systemPrompt,
          userPrompt: finalUserPrompt,
          temperature: 0.3, // Lower temperature for more controlled modifications
          maxTokens: 4000
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const modifiedContent = await response.json();

      // Update the request with the result
      setPendingFollowUps(prev => 
        prev.map(req => 
          req.id === followUpId 
            ? { 
                ...req, 
                status: 'completed', 
                result: modifiedContent,
                appliedAt: new Date().toISOString()
              } 
            : req
        )
      );

    } catch (error) {
      console.error('Error processing follow-up:', error);
      
      setPendingFollowUps(prev => 
        prev.map(req => 
          req.id === followUpId 
            ? { 
                ...req, 
                status: 'failed', 
                error: error instanceof Error ? error.message : 'Unknown error'
              } 
            : req
        )
      );
      
      throw error;
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
      setCurrentRequest(null);
    }
  }, [pendingFollowUps, buildContextPrompt]);

  const applyFollowUp = useCallback(async (followUpId: string): Promise<void> => {
    const request = pendingFollowUps.find(req => req.id === followUpId);
    if (!request || request.status !== 'completed' || !request.result) {
      throw new Error('Follow-up not ready to apply');
    }

    try {
      // Save current version before applying changes
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      if (request.contentType === 'ppt') {
        // Create version snapshot
        const { data: currentPpt } = await supabase
          .from('ppts')
          .select('*')
          .eq('id', request.contentId)
          .single();

        if (currentPpt) {
          const { data: versions } = await supabase
            .from('ppt_versions')
            .select('version')
            .eq('ppt_id', request.contentId)
            .order('version', { ascending: false })
            .limit(1);

          const nextVersion = (versions?.[0]?.version || 0) + 1;

          await supabase.from('ppt_versions').insert({
            ppt_id: request.contentId,
            user_id: userData.user.id,
            version: nextVersion,
            topic: currentPpt.topic,
            slides: currentPpt.slides,
          });

          // Apply the changes
          await supabase
            .from('ppts')
            .update({
              slides: request.result.slides || currentPpt.slides,
              title: request.result.title || currentPpt.title,
              updated_at: new Date().toISOString()
            })
            .eq('id', request.contentId);
        }

      } else if (request.contentType === 'assignment') {
        // Similar pattern for assignments
        const { data: currentAssignment } = await supabase
          .from('assignments')
          .select('*')
          .eq('id', request.contentId)
          .single();

        if (currentAssignment) {
          const { data: versions } = await supabase
            .from('assignment_versions')
            .select('version')
            .eq('assignment_id', request.contentId)
            .order('version', { ascending: false })
            .limit(1);

          const nextVersion = (versions?.[0]?.version || 0) + 1;

          await supabase.from('assignment_versions').insert({
            assignment_id: request.contentId,
            user_id: userData.user.id,
            version: nextVersion,
            content: currentAssignment.content,
            topic: currentAssignment.topic,
            tone: currentAssignment.tone,
          });

          // Apply the changes
          await supabase
            .from('assignments')
            .update({
              content: request.result.content || currentAssignment.content,
              content_html: request.result.content_html || currentAssignment.content_html,
              updated_at: new Date().toISOString()
            })
            .eq('id', request.contentId);
        }

      } else if (request.contentType === 'notes') {
        // Similar pattern for notes
        const { data: currentNotes } = await supabase
          .from('notes')
          .select('*')
          .eq('id', request.contentId)
          .single();

        if (currentNotes) {
          const { data: versions } = await supabase
            .from('note_versions')
            .select('version')
            .eq('note_id', request.contentId)
            .order('version', { ascending: false })
            .limit(1);

          const nextVersion = (versions?.[0]?.version || 0) + 1;

          await supabase.from('note_versions').insert({
            note_id: request.contentId,
            user_id: userData.user.id,
            version: nextVersion,
            topic: currentNotes.topic,
            headings: currentNotes.headings,
            bullets: currentNotes.bullets,
            summary: currentNotes.summary,
          });

          // Apply the changes
          await supabase
            .from('notes')
            .update({
              headings: request.result.headings || currentNotes.headings,
              bullets: request.result.bullets || currentNotes.bullets,
              summary: request.result.summary || currentNotes.summary,
              updated_at: new Date().toISOString()
            })
            .eq('id', request.contentId);
        }
      }

      // Record the follow-up in history
      await supabase.from('follow_ups').insert({
        id: request.id,
        content_type: request.contentType,
        content_id: request.contentId,
        user_id: userData.user.id,
        prompt: request.prompt,
        scope: request.scope,
        target_indices: request.targetIndices,
        applied_at: new Date().toISOString(),
        result: request.result
      });

      // Remove from pending list
      setPendingFollowUps(prev => prev.filter(req => req.id !== followUpId));
      
    } catch (error) {
      console.error('Error applying follow-up:', error);
      throw error;
    }
  }, [pendingFollowUps]);

  const discardFollowUp = useCallback((followUpId: string) => {
    setPendingFollowUps(prev => prev.filter(req => req.id !== followUpId));
    if (currentRequest?.id === followUpId) {
      setCurrentRequest(null);
    }
    if (preview) {
      setPreview(null);
    }
  }, [currentRequest, preview]);

  const generatePreview = useCallback(async (followUpId: string): Promise<FollowUpPreview> => {
    const request = pendingFollowUps.find(req => req.id === followUpId);
    if (!request || request.status !== 'completed' || !request.result) {
      throw new Error('Follow-up not ready for preview');
    }

    // Fetch original content
    const { currentContent } = await buildContextPrompt(
      request.contentType,
      request.contentId,
      request.scope,
      request.targetIndices
    );

    // Generate diff preview
    let originalText = '';
    let modifiedText = '';
    const changes: any[] = [];

    if (request.contentType === 'ppt') {
      originalText = currentContent?.slides?.map((slide: any) => 
        `${slide.title}\n${slide.content?.join('\n') || ''}`
      ).join('\n\n') || '';
      
      modifiedText = request.result?.slides?.map((slide: any) => 
        `${slide.title}\n${slide.content?.join('\n') || ''}`
      ).join('\n\n') || '';
    } else if (request.contentType === 'assignment') {
      originalText = currentContent?.content || '';
      modifiedText = request.result?.content || '';
    } else if (request.contentType === 'notes') {
      originalText = currentContent?.headings?.map((heading: any) => {
        const bullets = currentContent?.bullets?.find((b: any) => b.heading === heading.text);
        return `${heading.text}\n${bullets?.points?.join('\n') || ''}`;
      }).join('\n\n') || '';
      
      modifiedText = request.result?.headings?.map((heading: any) => {
        const bullets = request.result?.bullets?.find((b: any) => b.heading === heading.text);
        return `${heading.text}\n${bullets?.points?.join('\n') || ''}`;
      }).join('\n\n') || '';
    }

    const previewResult: FollowUpPreview = {
      original: originalText,
      modified: modifiedText,
      changes: changes
    };

    setPreview(previewResult);
    return previewResult;
  }, [pendingFollowUps, buildContextPrompt]);

  const clearAllFollowUps = useCallback(() => {
    setPendingFollowUps([]);
    setCurrentRequest(null);
    setPreview(null);
  }, []);

  const getFollowUpHistory = useCallback(async (contentId: string): Promise<FollowUpRequest[]> => {
    try {
      const { data } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('content_id', contentId)
        .order('applied_at', { ascending: false });

      return data?.map(item => ({
        id: item.id,
        contentType: item.content_type as ContentType,
        contentId: item.content_id,
        prompt: item.prompt,
        scope: item.scope as FollowUpScope,
        targetIndices: item.target_indices,
        appliedAt: item.applied_at,
        status: 'completed' as const,
        result: item.result
      })) || [];
    } catch (error) {
      console.error('Error fetching follow-up history:', error);
      return [];
    }
  }, []);

  // ── RETURN ────────────────────────────────────────────────
  
  return {
    // State
    pendingFollowUps,
    isProcessing,
    currentRequest,
    preview,
    
    // Actions
    createFollowUp,
    processFollowUp,
    applyFollowUp,
    discardFollowUp,
    generatePreview,
    
    // Utilities
    clearAllFollowUps,
    getFollowUpHistory,
  };
}
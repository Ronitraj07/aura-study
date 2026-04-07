import { useState, useCallback, useRef } from 'react';
import type { AssignmentBlock, GeneratedAssignment, AssignmentInput } from './useAssignmentGenerator';

// ── Edit State Interfaces ──────────────────────────────────────────────
export interface EditState {
  blocks: AssignmentBlock[];
  modifiedBlockIndices: Set<number>;
  modifications: Map<number, string>;
  isRegenerating: Set<number>;
  originalBlocks: AssignmentBlock[];
}

export interface EditActions {
  updateBlockText: (index: number, text: string) => void;
  deleteBlock: (index: number) => void;
  addBlock: (type: AssignmentBlock['type'], position: number) => void;
  reorderBlock: (fromIndex: number, toIndex: number) => void;
  setModificationRequest: (index: number, request: string) => void;
  regenerateBlock: (index: number, request?: string) => Promise<void>;
  regenerateMultipleBlocks: (indices: number[]) => Promise<void>;
  resetToOriginal: () => void;
  saveEdits: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
  getModificationRequest: (index: number) => string;
  isBlockRegenerating: (index: number) => boolean;
}

// ── Block Regeneration API ──────────────────────────────────────────────
async function regenerateSingleBlock(
  blockIndex: number,
  currentBlocks: AssignmentBlock[],
  originalInput: AssignmentInput,
  modificationRequest?: string
): Promise<AssignmentBlock> {
  const targetBlock = currentBlocks[blockIndex];
  
  // Build context from surrounding blocks
  const prevBlocks = currentBlocks.slice(Math.max(0, blockIndex - 2), blockIndex);
  const nextBlocks = currentBlocks.slice(blockIndex + 1, Math.min(currentBlocks.length, blockIndex + 3));
  
  const contextBefore = prevBlocks.map(b => `${b.type}: ${b.text}`).join('\n');
  const contextAfter = nextBlocks.map(b => `${b.type}: ${b.text}`).join('\n');
  
  const modificationSection = modificationRequest 
    ? `\nModification Request: ${modificationRequest}`
    : '';
  
  const prompt = `You are editing an assignment about "${originalInput.topic}". Regenerate ONLY the specified block to improve it.

Current block to regenerate:
Type: ${targetBlock.type}
Text: ${targetBlock.text}

Context before:
${contextBefore}

Context after:
${contextAfter}${modificationSection}

Instructions:
- Maintain the block type: ${targetBlock.type}
- Keep the content relevant to the surrounding context
- Match the tone: ${originalInput.tone}
- Improve clarity, flow, and quality
- Return ONLY a JSON object with the updated block

Return format:
{
  "type": "${targetBlock.type}",
  "text": "<improved text content>"
}`;

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'assignment_block',
      systemPrompt: 'You are an expert academic editor. Output ONLY valid JSON.',
      userPrompt: prompt,
      maxTokens: 800,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Block regeneration failed (HTTP ${res.status})`);
  }

  const regenerated = await res.json() as AssignmentBlock;
  
  // Ensure type consistency
  regenerated.type = targetBlock.type;
  
  return regenerated;
}

// ── Main Hook ──────────────────────────────────────────────────────────
export function useAssignmentEditor(
  originalAssignment: GeneratedAssignment,
  originalInput: AssignmentInput,
  onSave?: (updatedAssignment: GeneratedAssignment) => void
): EditState & EditActions {
  
  const originalInputRef = useRef(originalInput);
  originalInputRef.current = originalInput;
  
  const [editState, setEditState] = useState<EditState>({
    blocks: [...originalAssignment.blocks],
    modifiedBlockIndices: new Set(),
    modifications: new Map(),
    isRegenerating: new Set(),
    originalBlocks: [...originalAssignment.blocks],
  });

  const updateBlockText = useCallback((index: number, text: string) => {
    setEditState(prev => {
      const newBlocks = [...prev.blocks];
      newBlocks[index] = { ...newBlocks[index], text };
      return {
        ...prev,
        blocks: newBlocks,
        modifiedBlockIndices: new Set([...prev.modifiedBlockIndices, index]),
      };
    });
  }, []);

  const deleteBlock = useCallback((index: number) => {
    setEditState(prev => {
      const newBlocks = prev.blocks.filter((_, i) => i !== index);
      // Adjust modified indices after deletion
      const newModifiedIndices = new Set<number>();
      prev.modifiedBlockIndices.forEach(idx => {
        if (idx < index) newModifiedIndices.add(idx);
        else if (idx > index) newModifiedIndices.add(idx - 1);
      });
      
      return {
        ...prev,
        blocks: newBlocks,
        modifiedBlockIndices: newModifiedIndices,
      };
    });
  }, []);

  const addBlock = useCallback((type: AssignmentBlock['type'], position: number) => {
    setEditState(prev => {
      const newBlocks = [...prev.blocks];
      const newBlock: AssignmentBlock = {
        type,
        text: type === 'heading' ? 'New Section Heading' 
             : type === 'subheading' ? 'New Subsection'
             : type === 'conclusion' ? 'New conclusion paragraph...'
             : type === 'quote' ? 'New quote or reference...'
             : 'New paragraph content...'
      };
      
      newBlocks.splice(position, 0, newBlock);
      
      // Adjust modified indices after insertion
      const newModifiedIndices = new Set<number>();
      prev.modifiedBlockIndices.forEach(idx => {
        if (idx < position) newModifiedIndices.add(idx);
        else newModifiedIndices.add(idx + 1);
      });
      newModifiedIndices.add(position); // Mark new block as modified
      
      return {
        ...prev,
        blocks: newBlocks,
        modifiedBlockIndices: newModifiedIndices,
      };
    });
  }, []);

  const reorderBlock = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    setEditState(prev => {
      const newBlocks = [...prev.blocks];
      const movedBlock = newBlocks.splice(fromIndex, 1)[0];
      newBlocks.splice(toIndex, 0, movedBlock);
      
      return {
        ...prev,
        blocks: newBlocks,
        modifiedBlockIndices: new Set([...prev.modifiedBlockIndices, fromIndex, toIndex]),
      };
    });
  }, []);

  const setModificationRequest = useCallback((index: number, request: string) => {
    setEditState(prev => {
      const newModifications = new Map(prev.modifications);
      if (request.trim()) {
        newModifications.set(index, request);
      } else {
        newModifications.delete(index);
      }
      return { ...prev, modifications: newModifications };
    });
  }, []);

  const regenerateBlock = useCallback(async (index: number, request?: string) => {
    if (index < 0 || index >= editState.blocks.length) return;
    
    // Mark as regenerating
    setEditState(prev => ({
      ...prev,
      isRegenerating: new Set([...prev.isRegenerating, index])
    }));
    
    try {
      const regenerated = await regenerateSingleBlock(
        index, 
        editState.blocks, 
        originalInputRef.current,
        request || editState.modifications.get(index)
      );
      
      setEditState(prev => {
        const newBlocks = [...prev.blocks];
        newBlocks[index] = regenerated;
        
        // Clear modification request after successful regeneration
        const newModifications = new Map(prev.modifications);
        newModifications.delete(index);
        
        return {
          ...prev,
          blocks: newBlocks,
          modifiedBlockIndices: new Set([...prev.modifiedBlockIndices, index]),
          modifications: newModifications,
          isRegenerating: new Set([...prev.isRegenerating].filter(i => i !== index))
        };
      });
    } catch (error) {
      console.error('Block regeneration failed:', error);
      
      // Remove regenerating state on error
      setEditState(prev => ({
        ...prev,
        isRegenerating: new Set([...prev.isRegenerating].filter(i => i !== index))
      }));
      
      throw error;
    }
  }, [editState.blocks, editState.modifications]);

  const regenerateMultipleBlocks = useCallback(async (indices: number[]) => {
    const validIndices = indices.filter(i => i >= 0 && i < editState.blocks.length);
    if (validIndices.length === 0) return;
    
    // Mark all as regenerating
    setEditState(prev => ({
      ...prev,
      isRegenerating: new Set([...prev.isRegenerating, ...validIndices])
    }));
    
    try {
      // Process blocks sequentially to maintain context
      for (const index of validIndices) {
        await regenerateBlock(index);
      }
    } catch (error) {
      // Clear regenerating state on error
      setEditState(prev => ({
        ...prev,
        isRegenerating: new Set([...prev.isRegenerating].filter(i => !validIndices.includes(i)))
      }));
      throw error;
    }
  }, [editState.blocks, regenerateBlock]);

  const resetToOriginal = useCallback(() => {
    setEditState(prev => ({
      ...prev,
      blocks: [...prev.originalBlocks],
      modifiedBlockIndices: new Set(),
      modifications: new Map(),
      isRegenerating: new Set(),
    }));
  }, []);

  const saveEdits = useCallback(async () => {
    if (!hasUnsavedChanges()) return;
    
    // Generate updated raw content from blocks
    const rawContent = editState.blocks
      .map(block => block.text)
      .join('\n\n');
    
    const updatedAssignment: GeneratedAssignment = {
      ...originalAssignment,
      blocks: editState.blocks,
      rawContent,
      wordCount: rawContent.split(/\s+/).length,
    };
    
    // Call save callback if provided
    if (onSave) {
      await onSave(updatedAssignment);
    }
    
    // Reset modification tracking
    setEditState(prev => ({
      ...prev,
      modifiedBlockIndices: new Set(),
      modifications: new Map(),
      originalBlocks: [...prev.blocks], // Update baseline
    }));
  }, [editState.blocks, originalAssignment, onSave]);

  const hasUnsavedChanges = useCallback(() => {
    return editState.modifiedBlockIndices.size > 0 || 
           editState.modifications.size > 0 ||
           editState.blocks.length !== editState.originalBlocks.length;
  }, [editState]);

  const getModificationRequest = useCallback((index: number): string => {
    return editState.modifications.get(index) || '';
  }, [editState.modifications]);

  const isBlockRegenerating = useCallback((index: number): boolean => {
    return editState.isRegenerating.has(index);
  }, [editState.isRegenerating]);

  return {
    ...editState,
    updateBlockText,
    deleteBlock,
    addBlock,
    reorderBlock,
    setModificationRequest,
    regenerateBlock,
    regenerateMultipleBlocks,
    resetToOriginal,
    saveEdits,
    hasUnsavedChanges,
    getModificationRequest,
    isBlockRegenerating,
  };
}
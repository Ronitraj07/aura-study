import { useState, useCallback, useRef } from 'react';
import type { GeneratedNotes, NoteHeading, NoteBullet, NotesInput } from './useNotesGenerator';

// ── Edit State Interfaces ──────────────────────────────────────────────
export interface NotesEditState {
  headings: NoteHeading[];
  bullets: NoteBullet[];
  modifiedSectionIndices: Set<number>;
  modifiedBulletIndices: Map<string, Set<number>>; // heading text → bullet indices
  isRegeneratingSections: Set<number>;
  originalHeadings: NoteHeading[];
  originalBullets: NoteBullet[];
}

export interface NotesEditActions {
  // Heading operations
  updateHeadingText: (headingIndex: number, text: string) => void;
  updateHeadingLevel: (headingIndex: number, level: 1 | 2 | 3) => void;
  deleteSection: (headingIndex: number) => void;
  addSection: (position: number, level?: 1 | 2 | 3) => void;
  reorderSection: (fromIndex: number, toIndex: number) => void;
  
  // Bullet operations
  updateBullet: (headingIndex: number, bulletIndex: number, text: string) => void;
  addBullet: (headingIndex: number, position: number, text?: string) => void;
  deleteBullet: (headingIndex: number, bulletIndex: number) => void;
  
  // Section regeneration
  regenerateSection: (headingIndex: number, request?: string) => Promise<void>;
  expandSection: (headingIndex: number, request?: string) => Promise<void>;
  
  // State management
  resetToOriginal: () => void;
  saveEdits: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
  isSectionRegenerating: (headingIndex: number) => boolean;
  getSectionBullets: (headingIndex: number) => string[];
}

// ── Section Regeneration API ──────────────────────────────────────────
async function regenerateNotesSection(
  headingIndex: number,
  headings: NoteHeading[],
  bullets: NoteBullet[],
  originalInput: NotesInput,
  modificationRequest?: string
): Promise<string[]> {
  const targetHeading = headings[headingIndex];
  if (!targetHeading) throw new Error('Heading not found');
  
  // Build context from adjacent sections
  const prevHeading = headingIndex > 0 ? headings[headingIndex - 1] : null;
  const nextHeading = headingIndex < headings.length - 1 ? headings[headingIndex + 1] : null;
  
  const currentBullets = bullets.find(b => b.heading === targetHeading.text)?.points || [];
  
  const modificationSection = modificationRequest 
    ? `\nModification Request: ${modificationRequest}`
    : '';
  
  const prompt = `You are editing notes about "${originalInput.topic}". Regenerate the bullet points for the specified section.

Section to regenerate:
Heading: ${targetHeading.text} (Level ${targetHeading.level})
Current bullets:
${currentBullets.map(b => `• ${b}`).join('\n')}

Context:
${prevHeading ? `Previous section: ${prevHeading.text}` : ''}
${nextHeading ? `Next section: ${nextHeading.text}` : ''}${modificationSection}

Instructions:
- Generate 3-6 improved bullet points for "${targetHeading.text}"
- Keep bullets concise and scannable (max 20 words each)
- Match the depth setting: ${originalInput.depth || 'overview'}
- Maintain consistency with the overall notes structure

Return ONLY a JSON array of bullet point strings:
["<bullet 1>", "<bullet 2>", "<bullet 3>"]`;

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'notes_section',
      systemPrompt: 'You are an expert note-taker. Output ONLY valid JSON.',
      userPrompt: prompt,
      maxTokens: 800,
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Section regeneration failed (HTTP ${res.status})`);
  }

  const bulletPoints = await res.json() as string[];
  
  if (!Array.isArray(bulletPoints)) {
    throw new Error('Invalid response: expected array of bullet points');
  }
  
  return bulletPoints;
}

// ── Main Hook ──────────────────────────────────────────────────────────
export function useNotesEditor(
  originalNotes: GeneratedNotes,
  originalInput: NotesInput,
  onSave?: (updatedNotes: GeneratedNotes) => void
): NotesEditState & NotesEditActions {
  
  const originalInputRef = useRef(originalInput);
  originalInputRef.current = originalInput;
  
  const [editState, setEditState] = useState<NotesEditState>({
    headings: [...originalNotes.headings],
    bullets: originalNotes.bullets.map(b => ({ ...b, points: [...b.points] })),
    modifiedSectionIndices: new Set(),
    modifiedBulletIndices: new Map(),
    isRegeneratingSections: new Set(),
    originalHeadings: [...originalNotes.headings],
    originalBullets: originalNotes.bullets.map(b => ({ ...b, points: [...b.points] })),
  });

  // Helper function to find bullets for a heading
  const findBulletsForHeading = useCallback((headingText: string, bulletsList: NoteBullet[]) => {
    return bulletsList.find(b => b.heading === headingText)?.points || [];
  }, []);

  const updateHeadingText = useCallback((headingIndex: number, text: string) => {
    setEditState(prev => {
      const newHeadings = [...prev.headings];
      const oldText = newHeadings[headingIndex]?.text;
      
      if (!oldText || oldText === text) return prev;
      
      newHeadings[headingIndex] = { ...newHeadings[headingIndex], text };
      
      // Update corresponding bullets entry
      const newBullets = prev.bullets.map(b => 
        b.heading === oldText ? { ...b, heading: text } : b
      );
      
      return {
        ...prev,
        headings: newHeadings,
        bullets: newBullets,
        modifiedSectionIndices: new Set([...prev.modifiedSectionIndices, headingIndex]),
      };
    });
  }, []);

  const updateHeadingLevel = useCallback((headingIndex: number, level: 1 | 2 | 3) => {
    setEditState(prev => {
      const newHeadings = [...prev.headings];
      if (!newHeadings[headingIndex]) return prev;
      
      newHeadings[headingIndex] = { ...newHeadings[headingIndex], level };
      
      return {
        ...prev,
        headings: newHeadings,
        modifiedSectionIndices: new Set([...prev.modifiedSectionIndices, headingIndex]),
      };
    });
  }, []);

  const deleteSection = useCallback((headingIndex: number) => {
    setEditState(prev => {
      const newHeadings = prev.headings.filter((_, i) => i !== headingIndex);
      const headingToDelete = prev.headings[headingIndex];
      
      if (!headingToDelete) return prev;
      
      // Remove corresponding bullets
      const newBullets = prev.bullets.filter(b => b.heading !== headingToDelete.text);
      
      // Adjust modified indices
      const newModifiedIndices = new Set<number>();
      prev.modifiedSectionIndices.forEach(idx => {
        if (idx < headingIndex) newModifiedIndices.add(idx);
        else if (idx > headingIndex) newModifiedIndices.add(idx - 1);
      });
      
      return {
        ...prev,
        headings: newHeadings,
        bullets: newBullets,
        modifiedSectionIndices: newModifiedIndices,
      };
    });
  }, []);

  const addSection = useCallback((position: number, level: 1 | 2 | 3 = 2) => {
    setEditState(prev => {
      const newHeadings = [...prev.headings];
      const newHeading: NoteHeading = {
        level,
        text: `New Section ${position + 1}`
      };
      
      newHeadings.splice(position, 0, newHeading);
      
      // Add empty bullets for the new section
      const newBullets = [...prev.bullets];
      newBullets.push({
        heading: newHeading.text,
        points: ['New bullet point...']
      });
      
      // Adjust modified indices
      const newModifiedIndices = new Set<number>();
      prev.modifiedSectionIndices.forEach(idx => {
        if (idx < position) newModifiedIndices.add(idx);
        else newModifiedIndices.add(idx + 1);
      });
      newModifiedIndices.add(position);
      
      return {
        ...prev,
        headings: newHeadings,
        bullets: newBullets,
        modifiedSectionIndices: newModifiedIndices,
      };
    });
  }, []);

  const reorderSection = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    setEditState(prev => {
      const newHeadings = [...prev.headings];
      const movedHeading = newHeadings.splice(fromIndex, 1)[0];
      newHeadings.splice(toIndex, 0, movedHeading);
      
      return {
        ...prev,
        headings: newHeadings,
        modifiedSectionIndices: new Set([...prev.modifiedSectionIndices, fromIndex, toIndex]),
      };
    });
  }, []);

  const updateBullet = useCallback((headingIndex: number, bulletIndex: number, text: string) => {
    setEditState(prev => {
      const heading = prev.headings[headingIndex];
      if (!heading) return prev;
      
      const newBullets = prev.bullets.map(b => {
        if (b.heading === heading.text) {
          const newPoints = [...b.points];
          newPoints[bulletIndex] = text;
          return { ...b, points: newPoints };
        }
        return b;
      });
      
      // Track modified bullet
      const bulletIndicesForHeading = prev.modifiedBulletIndices.get(heading.text) || new Set();
      bulletIndicesForHeading.add(bulletIndex);
      const newModifiedBulletIndices = new Map(prev.modifiedBulletIndices);
      newModifiedBulletIndices.set(heading.text, bulletIndicesForHeading);
      
      return {
        ...prev,
        bullets: newBullets,
        modifiedBulletIndices: newModifiedBulletIndices,
        modifiedSectionIndices: new Set([...prev.modifiedSectionIndices, headingIndex]),
      };
    });
  }, []);

  const addBullet = useCallback((headingIndex: number, position: number, text: string = 'New bullet point...') => {
    setEditState(prev => {
      const heading = prev.headings[headingIndex];
      if (!heading) return prev;
      
      const newBullets = prev.bullets.map(b => {
        if (b.heading === heading.text) {
          const newPoints = [...b.points];
          newPoints.splice(position, 0, text);
          return { ...b, points: newPoints };
        }
        return b;
      });
      
      return {
        ...prev,
        bullets: newBullets,
        modifiedSectionIndices: new Set([...prev.modifiedSectionIndices, headingIndex]),
      };
    });
  }, []);

  const deleteBullet = useCallback((headingIndex: number, bulletIndex: number) => {
    setEditState(prev => {
      const heading = prev.headings[headingIndex];
      if (!heading) return prev;
      
      const newBullets = prev.bullets.map(b => {
        if (b.heading === heading.text) {
          const newPoints = b.points.filter((_, i) => i !== bulletIndex);
          // Don't allow completely empty sections
          return { ...b, points: newPoints.length > 0 ? newPoints : ['Add content...'] };
        }
        return b;
      });
      
      return {
        ...prev,
        bullets: newBullets,
        modifiedSectionIndices: new Set([...prev.modifiedSectionIndices, headingIndex]),
      };
    });
  }, []);

  const regenerateSection = useCallback(async (headingIndex: number, request?: string) => {
    if (headingIndex < 0 || headingIndex >= editState.headings.length) return;
    
    const heading = editState.headings[headingIndex];
    if (!heading) return;
    
    // Mark as regenerating
    setEditState(prev => ({
      ...prev,
      isRegeneratingSections: new Set([...prev.isRegeneratingSections, headingIndex])
    }));
    
    try {
      const newBulletPoints = await regenerateNotesSection(
        headingIndex,
        editState.headings,
        editState.bullets,
        originalInputRef.current,
        request
      );
      
      setEditState(prev => {
        const newBullets = prev.bullets.map(b => 
          b.heading === heading.text ? { ...b, points: newBulletPoints } : b
        );
        
        return {
          ...prev,
          bullets: newBullets,
          modifiedSectionIndices: new Set([...prev.modifiedSectionIndices, headingIndex]),
          isRegeneratingSections: new Set([...prev.isRegeneratingSections].filter(i => i !== headingIndex))
        };
      });
    } catch (error) {
      console.error('Section regeneration failed:', error);
      
      setEditState(prev => ({
        ...prev,
        isRegeneratingSections: new Set([...prev.isRegeneratingSections].filter(i => i !== headingIndex))
      }));
      
      throw error;
    }
  }, [editState.headings, editState.bullets]);

  const expandSection = useCallback(async (headingIndex: number, request?: string) => {
    // Similar to regenerateSection but adds to existing bullets
    await regenerateSection(headingIndex, request ? `Expand with: ${request}` : 'Add more detailed bullet points');
  }, [regenerateSection]);

  const resetToOriginal = useCallback(() => {
    setEditState(prev => ({
      ...prev,
      headings: [...prev.originalHeadings],
      bullets: prev.originalBullets.map(b => ({ ...b, points: [...b.points] })),
      modifiedSectionIndices: new Set(),
      modifiedBulletIndices: new Map(),
      isRegeneratingSections: new Set(),
    }));
  }, []);

  const saveEdits = useCallback(async () => {
    if (!hasUnsavedChanges()) return;
    
    const updatedNotes: GeneratedNotes = {
      ...originalNotes,
      headings: editState.headings,
      bullets: editState.bullets,
    };
    
    if (onSave) {
      await onSave(updatedNotes);
    }
    
    // Reset modification tracking
    setEditState(prev => ({
      ...prev,
      modifiedSectionIndices: new Set(),
      modifiedBulletIndices: new Map(),
      originalHeadings: [...prev.headings],
      originalBullets: prev.bullets.map(b => ({ ...b, points: [...b.points] })),
    }));
  }, [editState, originalNotes, onSave]);

  const hasUnsavedChanges = useCallback(() => {
    return editState.modifiedSectionIndices.size > 0 || 
           editState.modifiedBulletIndices.size > 0 ||
           editState.headings.length !== editState.originalHeadings.length;
  }, [editState]);

  const isSectionRegenerating = useCallback((headingIndex: number): boolean => {
    return editState.isRegeneratingSections.has(headingIndex);
  }, [editState.isRegeneratingSections]);

  const getSectionBullets = useCallback((headingIndex: number): string[] => {
    const heading = editState.headings[headingIndex];
    if (!heading) return [];
    
    return findBulletsForHeading(heading.text, editState.bullets);
  }, [editState.headings, editState.bullets, findBulletsForHeading]);

  return {
    ...editState,
    updateHeadingText,
    updateHeadingLevel,
    deleteSection,
    addSection,
    reorderSection,
    updateBullet,
    addBullet,
    deleteBullet,
    regenerateSection,
    expandSection,
    resetToOriginal,
    saveEdits,
    hasUnsavedChanges,
    isSectionRegenerating,
    getSectionBullets,
  };
}
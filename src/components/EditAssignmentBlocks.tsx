import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Edit3,
  RotateCcw,
  Save,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssignmentBlock } from '@/hooks/useAssignmentGenerator';
import type { EditActions, EditState } from '@/hooks/useAssignmentEditor';

// ── Constants ──────────────────────────────────────────────────────────
const BLOCK_STYLES = {
  heading: "text-base font-display font-bold text-foreground leading-tight",
  subheading: "text-sm font-display font-semibold text-foreground/90 leading-snug",
  paragraph: "text-sm font-medium text-foreground/80 leading-relaxed",
  quote: "text-sm font-medium text-foreground/75 italic leading-relaxed border-l-2 border-primary/40 pl-3",
  conclusion: "text-sm font-semibold text-foreground/85 leading-relaxed"
};

const BLOCK_COLORS = {
  heading: "hsl(220,85%,60%)",
  subheading: "hsl(262,80%,60%)", 
  paragraph: "hsl(0,0%,60%)",
  quote: "hsl(180,85%,55%)",
  conclusion: "hsl(30,80%,52%)"
};

const BLOCK_TYPE_LABELS = {
  heading: "Heading",
  subheading: "Subheading", 
  paragraph: "Paragraph",
  quote: "Quote",
  conclusion: "Conclusion"
};

// ── Interfaces ──────────────────────────────────────────────────────────
interface EditableAssignmentBlockProps {
  block: AssignmentBlock;
  blockIndex: number;
  isFirst: boolean;
  isLast: boolean;
  editState: EditState;
  editActions: EditActions;
  onTypeChange: (index: number, newType: AssignmentBlock['type']) => void;
}

interface AddBlockButtonProps {
  position: number;
  onAdd: (type: AssignmentBlock['type'], position: number) => void;
}

interface ModificationRequestProps {
  blockIndex: number;
  request: string;
  isRegenerating: boolean;
  onRequestChange: (request: string) => void;
  onRegenerate: () => void;
  onCancel: () => void;
}

// ── Add Block Button ──────────────────────────────────────────────────
const AddBlockButton: React.FC<AddBlockButtonProps> = ({ position, onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAdd = (type: AssignmentBlock['type']) => {
    onAdd(type, position);
    setIsOpen(false);
  };

  return (
    <div className="flex justify-center my-2">
      <div className="relative">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground border border-border rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-3 h-3" />
          Add Block
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg shadow-lg z-10 min-w-[120px]"
            >
              <div className="p-1">
                {(Object.keys(BLOCK_TYPE_LABELS) as Array<keyof typeof BLOCK_TYPE_LABELS>).map(type => (
                  <button
                    key={type}
                    onClick={() => handleAdd(type)}
                    className="w-full text-left px-2 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/60 rounded transition-all"
                  >
                    {BLOCK_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ── Modification Request Component ──────────────────────────────────────
const ModificationRequest: React.FC<ModificationRequestProps> = ({
  blockIndex,
  request,
  isRegenerating,
  onRequestChange,
  onRegenerate,
  onCancel
}) => {
  return (
    <div className="mt-2 p-2 bg-secondary/30 border border-border rounded-lg">
      <label className="block text-xs font-medium text-muted-foreground mb-2">
        <MessageSquare className="w-3 h-3 inline mr-1" />
        Modification Request
      </label>
      <textarea
        value={request}
        onChange={(e) => onRequestChange(e.target.value)}
        placeholder="e.g. Make this more concise, Add examples, Change tone to formal..."
        rows={2}
        className="w-full bg-background/50 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all resize-none"
        disabled={isRegenerating}
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={onRegenerate}
          disabled={isRegenerating || !request.trim()}
          className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-primary rounded transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <Zap className="w-3 h-3" />
              Apply Changes
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isRegenerating}
          className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded transition-all disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// ── Editable Assignment Block ──────────────────────────────────────────
const EditableAssignmentBlock: React.FC<EditableAssignmentBlockProps> = ({
  block,
  blockIndex,
  isFirst,
  isLast,
  editState,
  editActions,
  onTypeChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showModRequest, setShowModRequest] = useState(false);
  const [localText, setLocalText] = useState(block.text);

  const isModified = editState.modifiedBlockIndices.has(blockIndex);
  const isRegenerating = editActions.isBlockRegenerating(blockIndex);
  const modificationRequest = editActions.getModificationRequest(blockIndex);

  const handleSaveText = useCallback(() => {
    if (localText !== block.text) {
      editActions.updateBlockText(blockIndex, localText);
    }
    setIsEditing(false);
  }, [localText, block.text, blockIndex, editActions]);

  const handleCancelEdit = useCallback(() => {
    setLocalText(block.text);
    setIsEditing(false);
  }, [block.text]);

  const handleRegenerate = useCallback(async () => {
    try {
      await editActions.regenerateBlock(blockIndex);
      setLocalText(editState.blocks[blockIndex]?.text || block.text);
    } catch (error) {
      console.error('Regeneration failed:', error);
    }
  }, [blockIndex, editActions, editState.blocks, block.text]);

  const handleModificationRequest = useCallback(async () => {
    if (!modificationRequest.trim()) return;
    
    try {
      await editActions.regenerateBlock(blockIndex, modificationRequest);
      setShowModRequest(false);
      setLocalText(editState.blocks[blockIndex]?.text || block.text);
    } catch (error) {
      console.error('Modification request failed:', error);
    }
  }, [modificationRequest, blockIndex, editActions, editState.blocks, block.text]);

  return (
    <motion.div
      layout
      className={cn(
        "relative group border rounded-lg transition-all",
        isModified ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/20",
        isRegenerating && "opacity-60 pointer-events-none"
      )}
    >
      {/* Block Header */}
      <div className="flex items-center justify-between p-2 border-b border-border/30 bg-secondary/10">
        <div className="flex items-center gap-2">
          {/* Block type indicator */}
          <div 
            className="w-1 h-4 rounded-full"
            style={{ backgroundColor: BLOCK_COLORS[block.type] }}
          />
          
          {/* Block type selector */}
          <select
            value={block.type}
            onChange={(e) => onTypeChange(blockIndex, e.target.value as AssignmentBlock['type'])}
            className="text-xs font-semibold bg-transparent border-none text-foreground focus:outline-none"
            disabled={isRegenerating}
          >
            {(Object.keys(BLOCK_TYPE_LABELS) as Array<keyof typeof BLOCK_TYPE_LABELS>).map(type => (
              <option key={type} value={type}>
                {BLOCK_TYPE_LABELS[type]}
              </option>
            ))}
          </select>

          {isModified && (
            <span className="text-xs font-medium text-primary">Modified</span>
          )}
        </div>

        {/* Block actions */}
        <div className="flex items-center gap-1">
          {/* Move up/down */}
          {!isFirst && (
            <button
              onClick={() => editActions.reorderBlock(blockIndex, blockIndex - 1)}
              className="p-1 text-muted-foreground hover:text-foreground transition-all"
              disabled={isRegenerating}
            >
              <ChevronUp className="w-3 h-3" />
            </button>
          )}
          {!isLast && (
            <button
              onClick={() => editActions.reorderBlock(blockIndex, blockIndex + 1)}
              className="p-1 text-muted-foreground hover:text-foreground transition-all"
              disabled={isRegenerating}
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          )}

          {/* Edit button */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "p-1 transition-all",
              isEditing ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            disabled={isRegenerating}
          >
            <Edit3 className="w-3 h-3" />
          </button>

          {/* Regenerate button */}
          <button
            onClick={() => setShowModRequest(!showModRequest)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-primary border border-primary/40 rounded hover:bg-primary/10 transition-all"
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Zap className="w-3 h-3" />
            )}
            {isRegenerating ? 'Processing...' : 'Regenerate'}
          </button>

          {/* Delete button */}
          <button
            onClick={() => editActions.deleteBlock(blockIndex)}
            className="p-1 text-muted-foreground hover:text-destructive transition-all"
            disabled={isRegenerating}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Block Content */}
      <div className="p-3">
        {isEditing ? (
          <div>
            <textarea
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              rows={Math.max(2, Math.ceil(localText.length / 80))}
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
              disabled={isRegenerating}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleSaveText}
                className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-primary rounded transition-all hover:bg-primary/90"
                disabled={isRegenerating}
              >
                <Save className="w-3 h-3" />
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded transition-all"
                disabled={isRegenerating}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={BLOCK_STYLES[block.type]} onClick={() => setIsEditing(true)}>
            {block.text}
          </div>
        )}

        {/* Modification Request */}
        <AnimatePresence>
          {showModRequest && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <ModificationRequest
                blockIndex={blockIndex}
                request={modificationRequest}
                isRegenerating={isRegenerating}
                onRequestChange={(req) => editActions.setModificationRequest(blockIndex, req)}
                onRegenerate={handleModificationRequest}
                onCancel={() => {
                  setShowModRequest(false);
                  editActions.setModificationRequest(blockIndex, '');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ── Main Edit Assignment Blocks Component ──────────────────────────────
interface EditAssignmentBlocksProps {
  editState: EditState;
  editActions: EditActions;
  onReset: () => void;
  onSave: () => void;
  hasUnsavedChanges: boolean;
}

export const EditAssignmentBlocks: React.FC<EditAssignmentBlocksProps> = ({
  editState,
  editActions,
  onReset,
  onSave,
  hasUnsavedChanges
}) => {
  const handleTypeChange = useCallback((index: number, newType: AssignmentBlock['type']) => {
    editActions.updateBlockText(index, editState.blocks[index].text);
    // Note: In a full implementation, you'd also update the block type
    // For now, we're keeping the type change separate from text updates
  }, [editActions, editState.blocks]);

  return (
    <div className="space-y-3">
      {/* Edit Controls Header */}
      <div className="flex items-center justify-between p-3 bg-secondary/20 border border-border rounded-lg">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Edit Mode</span>
          {hasUnsavedChanges && (
            <span className="text-xs text-primary">Unsaved changes</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            disabled={!hasUnsavedChanges}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border rounded hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          
          <button
            onClick={onSave}
            disabled={!hasUnsavedChanges}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3 h-3" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Add block at start */}
      <AddBlockButton position={0} onAdd={editActions.addBlock} />

      {/* Editable blocks */}
      {editState.blocks.map((block, index) => (
        <div key={index}>
          <EditableAssignmentBlock
            block={block}
            blockIndex={index}
            isFirst={index === 0}
            isLast={index === editState.blocks.length - 1}
            editState={editState}
            editActions={editActions}
            onTypeChange={handleTypeChange}
          />
          
          {/* Add block after each block */}
          <AddBlockButton position={index + 1} onAdd={editActions.addBlock} />
        </div>
      ))}
    </div>
  );
};
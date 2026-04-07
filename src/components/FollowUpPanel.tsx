// ============================================================
// FollowUpPanel.tsx — Universal AI Follow-up Interface
// Provides follow-up capabilities for any content type
// ============================================================

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare, Check, X, Eye, History, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  useFollowUpSystem, 
  type ContentType, 
  type FollowUpRequest, 
  type FollowUpScope 
} from '@/hooks/useFollowUpSystem';

interface FollowUpPanelProps {
  contentType: ContentType;
  contentId: string;
  contentTitle?: string;
  className?: string;
  onContentUpdated?: () => void; // Callback when content is modified
}

interface ScopeOption {
  value: FollowUpScope;
  label: string;
  description: string;
}

const SCOPE_OPTIONS: ScopeOption[] = [
  {
    value: 'full',
    label: 'Entire Content',
    description: 'Modify the complete document/presentation'
  },
  {
    value: 'section',
    label: 'Specific Sections',
    description: 'Target particular sections or slides'
  },
  {
    value: 'specific',
    label: 'Custom Selection',
    description: 'Choose exact items to modify'
  }
];

export function FollowUpPanel({ 
  contentType, 
  contentId, 
  contentTitle,
  className = '',
  onContentUpdated 
}: FollowUpPanelProps) {
  const { toast } = useToast();
  
  // Follow-up system hook
  const {
    pendingFollowUps,
    isProcessing,
    currentRequest,
    preview,
    createFollowUp,
    processFollowUp,
    applyFollowUp,
    discardFollowUp,
    generatePreview,
    clearAllFollowUps,
    getFollowUpHistory
  } = useFollowUpSystem();

  // Local state
  const [prompt, setPrompt] = useState('');
  const [selectedScope, setSelectedScope] = useState<FollowUpScope>('full');
  const [targetIndices, setTargetIndices] = useState<number[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<FollowUpRequest[]>([]);
  const [showPreview, setShowPreview] = useState<string | null>(null);

  // Get content-specific context
  const getContentTypeLabel = useCallback(() => {
    switch (contentType) {
      case 'ppt': return 'Presentation';
      case 'assignment': return 'Assignment';
      case 'notes': return 'Notes';
      default: return 'Content';
    }
  }, [contentType]);

  const getPromptPlaceholder = useCallback(() => {
    const basePrompts = {
      ppt: [
        'Add more visual elements and charts to slide 3',
        'Make the conclusion more impactful',
        'Simplify the language for a general audience',
        'Add speaker notes to all slides'
      ],
      assignment: [
        'Expand on the methodology section',
        'Add more examples and case studies',
        'Make the writing more formal and academic',
        'Improve the transitions between paragraphs'
      ],
      notes: [
        'Add more detail to the key concepts',
        'Include practice questions at the end',
        'Create a summary section',
        'Add memory aids and mnemonics'
      ]
    };
    
    const suggestions = basePrompts[contentType] || basePrompts.assignment;
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }, [contentType]);

  // Actions
  const handleCreateFollowUp = useCallback(async () => {
    if (!prompt.trim()) {
      toast({
        title: "Enter a modification request",
        description: "Please describe what changes you'd like to make.",
        variant: "destructive"
      });
      return;
    }

    try {
      const followUpId = await createFollowUp(
        contentType,
        contentId,
        prompt.trim(),
        selectedScope,
        selectedScope === 'specific' ? targetIndices : undefined
      );

      toast({
        title: "Follow-up created",
        description: "Your modification request has been queued."
      });

      // Clear the form
      setPrompt('');
      
      // Auto-process if no other request is processing
      if (!isProcessing) {
        await handleProcessFollowUp(followUpId);
      }

    } catch (error) {
      console.error('Error creating follow-up:', error);
      toast({
        title: "Failed to create follow-up",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  }, [prompt, contentType, contentId, selectedScope, targetIndices, createFollowUp, toast, isProcessing]);

  const handleProcessFollowUp = useCallback(async (followUpId: string) => {
    try {
      await processFollowUp(followUpId);
      
      toast({
        title: "Modification ready",
        description: "Your content has been processed. Review before applying."
      });

    } catch (error) {
      console.error('Error processing follow-up:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  }, [processFollowUp, toast]);

  const handleApplyFollowUp = useCallback(async (followUpId: string) => {
    try {
      await applyFollowUp(followUpId);
      
      toast({
        title: "Changes applied",
        description: "Your content has been updated successfully."
      });

      // Notify parent component
      onContentUpdated?.();

    } catch (error) {
      console.error('Error applying follow-up:', error);
      toast({
        title: "Failed to apply changes",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  }, [applyFollowUp, toast, onContentUpdated]);

  const handleShowPreview = useCallback(async (followUpId: string) => {
    try {
      await generatePreview(followUpId);
      setShowPreview(followUpId);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: "Preview failed",
        description: "Could not generate preview",
        variant: "destructive"
      });
    }
  }, [generatePreview, toast]);

  const handleLoadHistory = useCallback(async () => {
    try {
      const historyData = await getFollowUpHistory(contentId);
      setHistory(historyData);
      setShowHistory(true);
    } catch (error) {
      console.error('Error loading history:', error);
      toast({
        title: "Failed to load history",
        description: "Could not fetch modification history",
        variant: "destructive"
      });
    }
  }, [getFollowUpHistory, contentId, toast]);

  const getStatusColor = useCallback((status: FollowUpRequest['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const getStatusIcon = useCallback((status: FollowUpRequest['status']) => {
    switch (status) {
      case 'pending': return <RefreshCw className="h-3 w-3" />;
      case 'processing': return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'completed': return <Check className="h-3 w-3" />;
      case 'failed': return <X className="h-3 w-3" />;
      default: return null;
    }
  }, []);

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Modify with AI
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadHistory}
              disabled={isProcessing}
            >
              <History className="h-4 w-4 mr-1" />
              History
            </Button>
            {pendingFollowUps.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFollowUps}
                disabled={isProcessing}
              >
                Clear All
              </Button>
            )}
          </div>
        </CardTitle>
        {contentTitle && (
          <p className="text-sm text-muted-foreground">
            Modifying: {contentTitle} ({getContentTypeLabel()})
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Create New Follow-up */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">
              What would you like to change?
            </label>
            <Textarea
              placeholder={getPromptPlaceholder()}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[80px] resize-none"
              disabled={isProcessing}
            />
          </div>

          {/* Scope Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Modification Scope</label>
            <div className="grid grid-cols-1 gap-2">
              {SCOPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedScope === option.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    value={option.value}
                    checked={selectedScope === option.value}
                    onChange={(e) => setSelectedScope(e.target.value as FollowUpScope)}
                    className="mt-1"
                    disabled={isProcessing}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Target Indices Input (for specific scope) */}
          {selectedScope === 'specific' && (
            <div>
              <label className="text-sm font-medium mb-1 block">
                Target {contentType === 'ppt' ? 'Slides' : contentType === 'notes' ? 'Sections' : 'Blocks'} 
                <span className="text-muted-foreground ml-1">(comma-separated numbers)</span>
              </label>
              <input
                type="text"
                placeholder="1, 3, 5"
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                onChange={(e) => {
                  const indices = e.target.value
                    .split(',')
                    .map(s => parseInt(s.trim()) - 1) // Convert to 0-based
                    .filter(n => !isNaN(n) && n >= 0);
                  setTargetIndices(indices);
                }}
                disabled={isProcessing}
              />
            </div>
          )}
        </div>

        {/* Pending Follow-ups */}
        {pendingFollowUps.length > 0 && (
          <div className="space-y-3">
            <Separator />
            <h4 className="text-sm font-medium">Pending Modifications</h4>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {pendingFollowUps.map((request) => (
                  <Card key={request.id} className="border-l-4 border-l-primary/20">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <Badge 
                          variant="outline"
                          className={getStatusColor(request.status)}
                        >
                          <span className="mr-1">{getStatusIcon(request.status)}</span>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                        <div className="flex gap-1">
                          {request.status === 'completed' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleShowPreview(request.id)}
                                disabled={isProcessing}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApplyFollowUp(request.id)}
                                disabled={isProcessing}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => discardFollowUp(request.id)}
                            disabled={isProcessing}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {request.prompt}
                      </p>
                      {request.error && (
                        <p className="text-xs text-red-600 mt-1">{request.error}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && preview && (
          <div className="space-y-3">
            <Separator />
            <h4 className="text-sm font-medium">Preview Changes</h4>
            <div className="max-h-[300px] overflow-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">Original</h5>
                  <div className="p-3 bg-muted/30 rounded text-xs whitespace-pre-wrap">
                    {preview.original.slice(0, 500)}
                    {preview.original.length > 500 && '...'}
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">Modified</h5>
                  <div className="p-3 bg-primary/5 rounded text-xs whitespace-pre-wrap">
                    {preview.modified.slice(0, 500)}
                    {preview.modified.length > 500 && '...'}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (showPreview) handleApplyFollowUp(showPreview);
                }}
                disabled={isProcessing}
              >
                Apply Changes
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPreview(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button 
          onClick={handleCreateFollowUp}
          disabled={!prompt.trim() || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4 mr-2" />
              Apply Modification
            </>
          )}
        </Button>
      </CardFooter>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[600px] max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Modification History
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No modifications yet
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map((item, index) => (
                    <Card key={item.id}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline">{item.scope}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {item.appliedAt && new Date(item.appliedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{item.prompt}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
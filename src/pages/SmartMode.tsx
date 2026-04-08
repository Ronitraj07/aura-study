// ============================================================
// Smart Mode - File Upload & AI Content Generation
// Upload documents and generate educational content with AI
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, Image, File, Sparkles, AlertCircle, History, X, ChevronRight } from 'lucide-react';
import { useContentState } from '@/hooks/useContentState';
import { useSmartModeGenerator, type GenerationOptions, type SmartModeGeneration } from '@/hooks/useSmartModeGenerator';
import { ContentTypeSelector, GenerationResult } from '@/components/smart-mode';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadedFile {
  file: File;
  id: string;
  status: 'uploading' | 'parsing' | 'ready' | 'error';
  progress: number;
  error?: string;
  parsedContent?: string;
  metadata?: {
    pages?: number;
    wordCount?: number;
    fileType: string;
  };
}

const SUPPORTED_TYPES = {
  'application/pdf': { icon: FileText, label: 'PDF Document', maxSize: '4MB' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, label: 'Word Document', maxSize: '4MB' },
  'text/plain': { icon: File, label: 'Text File', maxSize: '4MB' },
  'text/markdown': { icon: File, label: 'Markdown File', maxSize: '4MB' },
  'image/jpeg': { icon: Image, label: 'JPEG Image', maxSize: '4MB' },
  'image/png': { icon: Image, label: 'PNG Image', maxSize: '4MB' },
  'image/webp': { icon: Image, label: 'WebP Image', maxSize: '4MB' },
};

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB (respects Vercel's 4.5MB edge limit)

export default function SmartMode() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'generate' | 'history'>('upload');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const { hasContent, setHasContent } = useContentState('smartmode');

  // Get the selected file's parsed content
  const selectedFile = useMemo(() => 
    uploadedFiles.find(f => f.id === selectedFileId && f.status === 'ready'),
    [uploadedFiles, selectedFileId]
  );

  // Initialize the generator hook with selected file
  const generator = useSmartModeGenerator(
    selectedFile?.id || '',
    selectedFile?.parsedContent || ''
  );

  // Auto-select first ready file
  useEffect(() => {
    if (!selectedFileId) {
      const readyFile = uploadedFiles.find(f => f.status === 'ready');
      if (readyFile) {
        setSelectedFileId(readyFile.id);
      }
    }
  }, [uploadedFiles, selectedFileId]);

  // Load generations when selected file changes
  useEffect(() => {
    if (selectedFile) {
      generator.loadGenerations();
    }
  }, [selectedFile?.id]);

  const handleGenerate = async (options: GenerationOptions) => {
    const result = await generator.generateContent(options);
    if (result) {
      setActiveTab('history');
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!Object.keys(SUPPORTED_TYPES).includes(file.type)) {
      return `Unsupported file type: ${file.type}`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`;
    }

    return null;
  };

  const handleFileSelect = (files: FileList) => {
    Array.from(files).forEach((file) => {
      const error = validateFile(file);
      
      if (error) {
        // Show error toast or notification
        console.error('File validation error:', error);
        return;
      }

      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const uploadedFile: UploadedFile = {
        file,
        id: fileId,
        status: 'uploading',
        progress: 0,
        metadata: {
          fileType: file.type
        }
      };

      setUploadedFiles(prev => [...prev, uploadedFile]);
      uploadAndParseFile(uploadedFile);
    });
  };

  const uploadAndParseFile = async (uploadedFile: UploadedFile) => {
    try {
      // Update status to uploading
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, status: 'uploading', progress: 25 } : f
      ));

      // Simulate upload progress
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, status: 'parsing', progress: 50 } : f
      ));

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', uploadedFile.file);

      // Call parsing API
      const response = await fetch('/api/parse', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to parse file: ${response.statusText}`);
      }

      const result = await response.json();
      
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? {
          ...f,
          status: 'ready',
          progress: 100,
          parsedContent: result.content,
          metadata: {
            ...f.metadata,
            pages: result.metadata?.pages,
            wordCount: result.metadata?.wordCount
          }
        } : f
      ));

      setHasContent(true);

    } catch (error) {
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? {
          ...f,
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        } : f
      ));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (uploadedFiles.length === 1) {
      setHasContent(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    const typeInfo = SUPPORTED_TYPES[fileType as keyof typeof SUPPORTED_TYPES];
    const IconComponent = typeInfo?.icon || File;
    return IconComponent;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Smart Mode</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Upload any document and transform it into educational content with AI. 
          Generate notes, questions, interview prep, and more from your files.
        </p>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'generate' | 'history')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger 
            value="generate" 
            disabled={!uploadedFiles.some(f => f.status === 'ready')}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Drop files here or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Supports PDF, DOCX, TXT, MD, and images (up to 4MB)
                  </p>
                </div>
                
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button className="mt-4" type="button" onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('file-upload')?.click();
                  }}>
                    Choose Files
                  </Button>
                </label>
              </div>

              {/* Supported File Types */}
              <div className="mt-6">
                <h4 className="font-medium mb-3">Supported File Types</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {Object.entries(SUPPORTED_TYPES).map(([type, info]) => {
                    const IconComponent = info.icon;
                    return (
                      <div key={type} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        <div className="text-xs">
                          <div className="font-medium">{info.label}</div>
                          <div className="text-muted-foreground">{info.maxSize}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Uploaded Files List */}
          <AnimatePresence>
            {uploadedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Uploaded Files ({uploadedFiles.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {uploadedFiles.map((uploadedFile) => {
                      const IconComponent = getFileIcon(uploadedFile.file.type);
                      const isSelected = selectedFileId === uploadedFile.id;
                      
                      return (
                        <div 
                          key={uploadedFile.id} 
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
                          }`}
                          onClick={() => uploadedFile.status === 'ready' && setSelectedFileId(uploadedFile.id)}
                        >
                          <IconComponent className="h-8 w-8 text-muted-foreground" />
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{uploadedFile.file.name}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatFileSize(uploadedFile.file.size)}</span>
                              {uploadedFile.metadata?.pages && (
                                <span>{uploadedFile.metadata.pages} pages</span>
                              )}
                              {uploadedFile.metadata?.wordCount && (
                                <span>{uploadedFile.metadata.wordCount} words</span>
                              )}
                            </div>
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-2">
                            {uploadedFile.status === 'uploading' && (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                <span className="text-sm">Uploading...</span>
                              </div>
                            )}
                            
                            {uploadedFile.status === 'parsing' && (
                              <div className="flex items-center gap-2">
                                <div className="animate-pulse h-4 w-4 bg-primary rounded-full" />
                                <span className="text-sm">Parsing...</span>
                              </div>
                            )}
                            
                            {uploadedFile.status === 'ready' && (
                              <div className="flex items-center gap-2">
                                <div className="h-4 w-4 bg-green-500 rounded-full" />
                                <span className="text-sm text-green-600">Ready</span>
                              </div>
                            )}
                            
                            {uploadedFile.status === 'error' && (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                <span className="text-sm text-destructive">Error</span>
                              </div>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(uploadedFile.id);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Proceed to Generate Button */}
                    {uploadedFiles.some(f => f.status === 'ready') && (
                      <Button 
                        className="w-full mt-4" 
                        onClick={() => setActiveTab('generate')}
                      >
                        Proceed to Generate
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          {selectedFile ? (
            <>
              {/* Selected File Info */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{selectedFile.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedFile.metadata?.wordCount || 0} words • Ready for generation
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setActiveTab('upload')}
                    >
                      Change File
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Content Type Selector */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Generate Content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ContentTypeSelector
                    onGenerate={handleGenerate}
                    isGenerating={generator.isGenerating}
                    progress={generator.progress}
                    currentStep={generator.currentStep}
                  />
                </CardContent>
              </Card>

              {/* Error Display */}
              {generator.error && (
                <Card className="border-destructive">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      <p>{generator.error}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No file selected</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a document first to generate content
                </p>
                <Button onClick={() => setActiveTab('upload')}>
                  Go to Upload
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          {generator.generations.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {generator.generations.map((gen) => (
                  <GenerationResult
                    key={gen.id}
                    generation={gen}
                    onDelete={generator.deleteGeneration}
                    onRegenerate={(g) => {
                      setActiveTab('generate');
                      // Could pre-fill the form with previous settings
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No generations yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate some content to see it here
                </p>
                {uploadedFiles.some(f => f.status === 'ready') && (
                  <Button onClick={() => setActiveTab('generate')}>
                    Go to Generate
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
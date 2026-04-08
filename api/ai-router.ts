// ============================================================
// AI Router — Intelligent routing for optimal AI service selection
// Routes requests to the best AI service based on content type and requirements
// ============================================================

import { callGroq, groqTechnical, groqCreative, groqFast } from './groq';
import { callGemini, geminiFast, geminiPro, geminiExam, geminiResearch } from './gemini';
import { validateService } from './ai-health';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  service?: string;
  usage?: any;
  fallbackUsed?: boolean;
  validationSkipped?: boolean;
}

export type AIService = 'groq-70b' | 'groq-8b' | 'groq-fast' | 'gemini-flash' | 'gemini-pro' | 'groq-creative';

export type ContentType = 
  | 'notes' 
  | 'notes_exam' 
  | 'notes_section'
  | 'ppt_creative' 
  | 'ppt_basic'
  | 'ppt_follow_up'
  | 'assignment' 
  | 'assignment_block'
  | 'assignment_follow_up'
  | 'research' 
  | 'checklist'
  | 'timetable'
  | 'subtopic_suggestions';

// Updated Multi-AI Routing Matrix - FREE SERVICES ONLY
const AI_ROUTING: Record<ContentType, { 
  primary: AIService; 
  fallback: AIService; 
  emergencyFallback?: AIService;
  reason: string; 
}> = {
  // Notes Generation
  'notes': { 
    primary: 'groq-70b', 
    fallback: 'gemini-flash',
    emergencyFallback: 'groq-fast',
    reason: 'Technical accuracy and structured content' 
  },
  'notes_exam': { 
    primary: 'gemini-flash', 
    fallback: 'groq-70b', 
    emergencyFallback: 'groq-fast',
    reason: 'Academic reasoning and exam-focused content' 
  },
  'notes_section': { 
    primary: 'groq-70b', 
    fallback: 'gemini-flash', 
    emergencyFallback: 'groq-fast',
    reason: 'Detailed section regeneration' 
  },

  // PPT Generation - Use Groq Creative for creative content
  'ppt_creative': { 
    primary: 'groq-creative',  // Use Groq with creative settings
    fallback: 'groq-70b',  
    emergencyFallback: 'groq-fast',
    reason: 'Creative, engaging presentation content via Groq creative mode' 
  },
  'ppt_basic': { 
    primary: 'groq-70b', 
    fallback: 'gemini-flash', 
    emergencyFallback: 'groq-fast',
    reason: 'Structured, professional slides' 
  },
  'ppt_follow_up': { 
    primary: 'groq-creative',  // Creative modifications
    fallback: 'groq-70b', 
    emergencyFallback: 'groq-fast',
    reason: 'Creative modifications and improvements' 
  },

  // Assignment Generation
  'assignment': { 
    primary: 'groq-70b', 
    fallback: 'gemini-flash',
    emergencyFallback: 'groq-fast',
    reason: 'Academic tone and proper citations' 
  },
  'assignment_block': { 
    primary: 'groq-70b', 
    fallback: 'gemini-flash', 
    emergencyFallback: 'groq-fast',
    reason: 'Consistent academic writing' 
  },
  'assignment_follow_up': { 
    primary: 'groq-70b', 
    fallback: 'gemini-flash', 
    emergencyFallback: 'groq-fast',
    reason: 'Academic improvements and refinements' 
  },

  // Utility Functions
  'research': { 
    primary: 'gemini-flash', 
    fallback: 'groq-fast', 
    emergencyFallback: 'groq-70b',
    reason: 'Fast, high-context research gathering' 
  },
  'checklist': { 
    primary: 'groq-fast',  // Simple tasks
    fallback: 'gemini-flash', 
    emergencyFallback: 'groq-70b',
    reason: 'Simple, fast task enumeration' 
  },
  'timetable': { 
    primary: 'groq-fast',  // Simple scheduling
    fallback: 'gemini-flash', 
    emergencyFallback: 'groq-70b',
    reason: 'Lightweight scheduling logic' 
  },
  'subtopic_suggestions': { 
    primary: 'groq-fast', 
    fallback: 'gemini-flash', 
    emergencyFallback: 'groq-70b',
    reason: 'Quick, contextual suggestions' 
  },
};

// Service call mapping - Updated without Grok
const SERVICE_CALLS: Record<AIService, (messages: AIMessage[]) => Promise<any>> = {
  'groq-70b': groqTechnical,
  'groq-8b': groqFast,
  'groq-fast': groqFast,
  'groq-creative': groqCreative,  // Use Groq with high creativity settings
  'gemini-flash': geminiFast,
  'gemini-pro': geminiPro,
};

/**
 * Routes AI requests to the optimal service with validation and robust fallbacks
 */
export async function routeToAI(
  type: ContentType, 
  messages: AIMessage[],
  options: { 
    forceService?: AIService;
    skipValidation?: boolean;
    skipFallback?: boolean;
    timeout?: number;
  } = {}
): Promise<AIResponse> {
  
  const route = AI_ROUTING[type];
  if (!route) {
    return {
      success: false,
      error: `Unknown content type: ${type}`
    };
  }

  const primaryService = options.forceService || route.primary;
  const fallbackService = route.fallback;
  const emergencyFallback = route.emergencyFallback;

  console.log(`🎯 Routing ${type} to ${primaryService} (fallback: ${fallbackService}${emergencyFallback ? `, emergency: ${emergencyFallback}` : ''})`);

  // Helper function to try a service
  const tryService = async (serviceName: AIService, isEmergency = false): Promise<AIResponse> => {
    try {
      // Validate service availability (unless skipped)
      if (!options.skipValidation) {
        const isValid = await validateService(serviceName);
        if (!isValid) {
          console.log(`⚠️ Service validation failed for ${serviceName}`);
          return {
            success: false,
            error: `Service ${serviceName} validation failed`,
            service: serviceName,
            validationSkipped: false
          };
        }
      }

      const serviceCall = SERVICE_CALLS[serviceName];
      if (!serviceCall) {
        throw new Error(`Service ${serviceName} not implemented`);
      }

      const result = await serviceCall(messages);
      
      if (result.success) {
        return {
          success: true,
          content: result.content,
          service: isEmergency ? `${serviceName} (emergency)` : serviceName,
          usage: result.usage,
          fallbackUsed: serviceName !== primaryService,
          validationSkipped: options.skipValidation || false
        };
      }

      return {
        success: false,
        error: result.error || 'Service returned failure',
        service: serviceName
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: serviceName
      };
    }
  };

  // Try primary service
  let result = await tryService(primaryService);
  
  if (result.success) {
    console.log(`✅ Primary service ${primaryService} succeeded`);
    return result;
  }

  if (options.skipFallback) {
    return result; // Return primary failure
  }

  console.log(`⚠️ Primary ${primaryService} failed: ${result.error}`);

  // Try fallback service
  result = await tryService(fallbackService);
  
  if (result.success) {
    console.log(`✅ Fallback service ${fallbackService} succeeded`);
    return result;
  }

  console.log(`⚠️ Fallback ${fallbackService} failed: ${result.error}`);

  // Try emergency fallback if available
  if (emergencyFallback && emergencyFallback !== primaryService && emergencyFallback !== fallbackService) {
    result = await tryService(emergencyFallback, true);
    
    if (result.success) {
      console.log(`🆘 Emergency fallback ${emergencyFallback} succeeded`);
      return result;
    }

    console.log(`❌ Emergency fallback ${emergencyFallback} also failed: ${result.error}`);
  }

  // All services failed
  return {
    success: false,
    error: `All services failed for ${type}. Primary: ${primaryService}, Fallback: ${fallbackService}${emergencyFallback ? `, Emergency: ${emergencyFallback}` : ''}`,
    service: 'none',
    fallbackUsed: true
  };
}

/**
 * Get the recommended service for a content type
 */
export function getRecommendedService(type: ContentType): { primary: AIService; fallback: AIService; reason: string } {
  return AI_ROUTING[type] || { 
    primary: 'groq-70b', 
    fallback: 'gemini-flash', 
    reason: 'Default routing' 
  };
}

/**
 * List all available content types and their routing
 */
export function getRoutingMatrix(): Record<ContentType, { primary: AIService; fallback: AIService; reason: string }> {
  return AI_ROUTING;
}
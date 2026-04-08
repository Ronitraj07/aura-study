// ============================================================
// AI Services Health Check & Validation
// Tests all AI services and models for availability
// ============================================================

import { callGroq, groqTechnical, groqFast, groqCreative } from './groq.js';
import { callGemini, geminiFast, geminiPro } from './gemini.js';

export interface ServiceHealthCheck {
  service: string;
  model: string;
  available: boolean;
  responseTime?: number;
  error?: string;
  testResult?: {
    success: boolean;
    content?: string;
    length?: number;
  };
}

export interface HealthCheckReport {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'critical';
  services: ServiceHealthCheck[];
  recommendations: string[];
}

const TEST_PROMPT = {
  role: 'user' as const,
  content: 'Generate a simple JSON response with format: {"test": "success", "message": "AI service working"}. Respond only with valid JSON, no explanation.'
};

const SYSTEM_PROMPT = {
  role: 'system' as const,
  content: 'You are a test responder. Only output valid JSON as requested.'
};

async function testService(
  serviceName: string,
  modelName: string,
  serviceFunction: (messages: any[]) => Promise<any>,
  timeoutMs: number = 15000
): Promise<ServiceHealthCheck> {
  const startTime = Date.now();

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    });

    const result = await Promise.race([
      serviceFunction([SYSTEM_PROMPT, TEST_PROMPT]),
      timeoutPromise
    ]);

    const responseTime = Date.now() - startTime;

    if (!(result as any).success) {
      return {
        service: serviceName,
        model: modelName,
        available: false,
        responseTime,
        error: (result as any).error || 'Service returned failure'
      };
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse((result as any).content || '{}');
    } catch {
      return {
        service: serviceName,
        model: modelName,
        available: false,
        responseTime,
        error: 'Invalid JSON response',
        testResult: { success: false, content: (result as any).content?.substring(0, 100) }
      };
    }

    const isValidTest = parsedContent.test === 'success' || parsedContent.message;

    return {
      service: serviceName,
      model: modelName,
      available: true,
      responseTime,
      testResult: {
        success: isValidTest,
        content: (result as any).content?.substring(0, 100),
        length: (result as any).content?.length || 0
      }
    };

  } catch (error) {
    return {
      service: serviceName,
      model: modelName,
      available: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function runHealthCheck(): Promise<HealthCheckReport> {
  console.log('🔍 Starting AI services health check...');

  const services: Promise<ServiceHealthCheck>[] = [
    testService('groq', 'llama-3.3-70b-versatile', groqTechnical),
    testService('groq', 'llama-3.1-8b-instant', groqFast),
    testService('groq', 'llama-3.3-70b-versatile-creative', groqCreative),
    testService('gemini', 'gemini-2.5-flash', geminiFast),
    testService('gemini', 'gemini-2.5-pro', geminiPro),
  ];

  const results = await Promise.allSettled(services);
  const healthChecks: ServiceHealthCheck[] = results.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    const serviceNames = ['groq-70b', 'groq-8b', 'groq-creative', 'gemini-flash', 'gemini-pro'];
    return {
      service: serviceNames[index] || 'unknown',
      model: 'unknown',
      available: false,
      error: `Health check failed: ${result.reason}`
    };
  });

  const availableServices = healthChecks.filter(s => s.available);
  const healthyRatio = availableServices.length / healthChecks.length;

  let overall: 'healthy' | 'degraded' | 'critical';
  const recommendations: string[] = [];

  if (healthyRatio >= 0.8) {
    overall = 'healthy';
  } else if (healthyRatio >= 0.4) {
    overall = 'degraded';
    recommendations.push('Some AI services are unavailable. System will use fallback routing.');
  } else {
    overall = 'critical';
    recommendations.push('Critical: Most AI services are unavailable. Generation may fail.');
    recommendations.push('Check API keys and service availability.');
  }

  const groqAvailable = healthChecks.some(s => s.service === 'groq' && s.available);
  const geminiAvailable = healthChecks.some(s => s.service === 'gemini' && s.available);

  if (!groqAvailable) recommendations.push('Groq services unavailable - check GROQ_API_KEY');
  if (!geminiAvailable) recommendations.push('Gemini services unavailable - check GEMINI_API_KEY and quota limits');

  const fastAvailable = healthChecks
    .filter(s => s.model.includes('8b') || s.model.includes('flash') || s.model.includes('instant'))
    .some(s => s.available);

  if (!fastAvailable) recommendations.push('No fast models available - research and suggestions may be slow');

  return {
    timestamp: new Date().toISOString(),
    overall,
    services: healthChecks,
    recommendations
  };
}

export async function validateService(serviceName: string): Promise<boolean> {
  try {
    let testFunction: ((messages: any[]) => Promise<any>) | undefined;
    let modelName: string;

    switch (serviceName) {
      case 'groq-70b':      testFunction = groqTechnical; modelName = 'llama-3.3-70b-versatile'; break;
      case 'groq-fast':     testFunction = groqFast;      modelName = 'llama-3.1-8b-instant';   break;
      case 'groq-creative': testFunction = groqCreative;  modelName = 'llama-3.3-70b-versatile-creative'; break;
      case 'gemini-flash':  testFunction = geminiFast;    modelName = 'gemini-2.5-flash'; break;
      case 'gemini-pro':    testFunction = geminiPro;     modelName = 'gemini-2.5-pro';   break;
      default: return false;
    }

    const result = await testService(serviceName, modelName, testFunction, 10000);
    return result.available && result.testResult?.success === true;
  } catch (error) {
    console.warn(`Service validation failed for ${serviceName}:`, error);
    return false;
  }
}

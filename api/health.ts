// ============================================================
// AI Health Check API Endpoint
// Provides real-time status of all AI services and models
// ============================================================

import { VercelRequest, VercelResponse } from '@vercel/node';
import { runHealthCheck, type HealthCheckReport } from './ai-health';

export const config = { runtime: 'edge' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  process.env.VERCEL_ENV === 'production'
    ? 'https://studyai-ronitraj.vercel.app'
    : 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('🔍 Running AI services health check...');
    const healthReport = await runHealthCheck();
    
    // Log results for debugging
    console.log(`📊 Health check complete: ${healthReport.overall}`);
    console.log(`✅ Available services: ${healthReport.services.filter(s => s.available).length}/${healthReport.services.length}`);
    
    if (healthReport.recommendations.length > 0) {
      console.log('⚠️ Recommendations:', healthReport.recommendations);
    }

    return new Response(JSON.stringify(healthReport), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Health check failed:', error);
    
    const errorReport: HealthCheckReport = {
      timestamp: new Date().toISOString(),
      overall: 'critical',
      services: [],
      recommendations: [
        'Health check system failed',
        'Check server configuration and API keys',
        'Contact system administrator if issue persists'
      ]
    };

    return new Response(JSON.stringify(errorReport), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
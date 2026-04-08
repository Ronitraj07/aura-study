// ============================================================
// AI Services Health Dashboard Component
// Displays real-time status of all AI services with validation
// ============================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

interface ServiceHealthCheck {
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

interface HealthCheckReport {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'critical';
  services: ServiceHealthCheck[];
  recommendations: string[];
}

export function AIHealthDashboard() {
  const [healthReport, setHealthReport] = useState<HealthCheckReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const runHealthCheck = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/health');
      const report: HealthCheckReport = await response.json();
      setHealthReport(report);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
      // Create error report
      setHealthReport({
        timestamp: new Date().toISOString(),
        overall: 'critical',
        services: [],
        recommendations: ['Health check API failed', 'Check server connectivity']
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    runHealthCheck();
    const interval = setInterval(runHealthCheck, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'critical' | boolean) => {
    if (typeof status === 'boolean') {
      return status ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      );
    }
    
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'degraded' | 'critical' | boolean) => {
    if (typeof status === 'boolean') {
      return status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    }
    
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatResponseTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Services Health</h2>
          <p className="text-muted-foreground">
            Real-time status of all AI services and models
          </p>
        </div>
        <Button 
          onClick={runHealthCheck} 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status Card */}
      {healthReport && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(healthReport.overall)}
                System Status
              </CardTitle>
              <Badge className={getStatusColor(healthReport.overall)}>
                {healthReport.overall.toUpperCase()}
              </Badge>
            </div>
            {lastUpdate && (
              <CardDescription>
                Last updated: {lastUpdate.toLocaleString()}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {healthReport.services.filter(s => s.available).length}
                </div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {healthReport.services.filter(s => !s.available).length}
                </div>
                <div className="text-sm text-muted-foreground">Unavailable</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {healthReport.services.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Services</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Details */}
      {healthReport?.services && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {healthReport.services.map((service, index) => (
            <Card key={index} className={service.available ? '' : 'border-red-200'}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg capitalize">
                    {service.service}
                  </CardTitle>
                  {getStatusIcon(service.available)}
                </div>
                <CardDescription className="text-xs font-mono">
                  {service.model}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Response Time:</span>
                  <span className={service.responseTime && service.responseTime > 5000 ? 'text-yellow-600' : ''}>
                    {formatResponseTime(service.responseTime)}
                  </span>
                </div>
                
                {service.testResult && (
                  <div className="flex justify-between text-sm">
                    <span>Test Result:</span>
                    <Badge 
                      variant={service.testResult.success ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {service.testResult.success ? 'Pass' : 'Fail'}
                    </Badge>
                  </div>
                )}

                {service.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    {service.error}
                  </div>
                )}

                {service.testResult?.content && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">
                      View Response
                    </summary>
                    <pre className="mt-1 p-2 bg-gray-50 rounded overflow-x-auto">
                      {service.testResult.content}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {healthReport?.recommendations && healthReport.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {healthReport.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && !healthReport && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Running health check...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
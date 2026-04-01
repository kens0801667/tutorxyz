import * as Sentry from '@sentry/react';

/**
 * Sanitizes sensitive data from error objects before sending to Sentry.
 * Removes common API key patterns, tokens, and PII recursively.
 */
function sanitizeError(error: any): any {
  if (typeof error !== 'object' || error === null) return error;

  const sensitiveKeys = ['apiKey', 'api_key', 'token', 'accessToken', 'access_token', 'password', 'secret', 'client_id', 'client_secret'];
  const sanitized = { ...error };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeError(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Centralized utility for logging API errors to Sentry.
 * Adds context about the service and method where the error occurred.
 */
export function logApiError(service: string, method: string, error: any, extra?: Record<string, any>) {
  const sanitizedError = sanitizeError(error);
  
  console.error(`[${service}::${method}] API Anomaly:`, sanitizedError, extra);

  Sentry.withScope((scope) => {
    scope.setTag('service', service);
    scope.setTag('method', method);
    scope.setTag('error_type', 'api_anomaly');
    
    if (extra) {
      scope.setContext('additional_info', sanitizeError(extra));
    }

    if (error instanceof Error) {
      // For real Error objects, capture them directly
      Sentry.captureException(error);
    } else {
      // For JSON error responses, capture as message with details
      Sentry.captureMessage(`API Error in ${service}.${method}: ${typeof error === 'string' ? error : JSON.stringify(sanitizedError)}`, {
        level: 'error',
      });
    }
  });
}

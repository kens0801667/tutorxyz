import * as Sentry from '@sentry/react';

export interface LogContext {
  [key: string]: any;
}

/**
 * Logs an API error to Sentry with details about the service and method.
 * @param service The name of the service (e.g., 'Gemini', 'Calendar', 'Drive')
 * @param method The name of the function or endpoint being called
 * @param error The original error object
 * @param context Additional non-sensitive context to include
 */
export function logApiError(
  service: string,
  method: string,
  error: any,
  context?: LogContext
) {
  console.error(`[${service}::${method}] Error:`, error, context);

  Sentry.withScope((scope) => {
    scope.setTag('service', service);
    scope.setTag('method', method);
    
    // Add context as extra data, removing any potential sensitive info
    if (context) {
      const sanitizedContext = { ...context };
      // Explicitly remove common sensitive fields just in case
      delete sanitizedContext.apiKey;
      delete sanitizedContext.accessToken;
      delete sanitizedContext.token;
      
      scope.setExtra('requestContext', sanitizedContext);
    }

    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      // Capture non-error objects as messages with details
      Sentry.captureMessage(`${service} ${method} failed: ${JSON.stringify(error)}`, 'error');
    }
  });
}

import * as Sentry from '@sentry/react';
import { logApiError } from './logger';

export async function getOrCreateCalendar(accessToken: string, calendarName: string): Promise<string | null> {
  try {
    // 1. Check if calendar exists
    const listResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (listResponse.status === 401) throw new Error('UNAUTHORIZED');
    if (!listResponse.ok) return null;

    const listData = await listResponse.json();
    const existing = listData.items?.find((c: any) => c.summary === calendarName);
    
    if (existing) return existing.id;

    // 2. Create if not exists
    const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ summary: calendarName }),
    });

    if (createResponse.status === 401) throw new Error('UNAUTHORIZED');
    if (!createResponse.ok) return null;

    const newCalendar = await createResponse.json();
    return newCalendar.id;
  } catch (e) {
    if ((e as Error).message !== 'UNAUTHORIZED') {
      logApiError('Calendar', 'getOrCreateCalendar', e, { calendarName });
    }
    throw e;
  }
}

export async function addLearningRecord(accessToken: string, calendarId: string, wordCount: number, topic: string) {
  try {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 60000); // 30 mins later
    
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: `TutorXYZ 學習記錄: ${topic}`,
        description: `本次學習了 ${wordCount} 個單字。`,
        start: { dateTime: now.toISOString() },
        end: { dateTime: end.toISOString() },
      }),
    });

    if (response.status === 401) throw new Error('UNAUTHORIZED');
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to add calendar event: ${errorText}`);
    }
    
    return await response.json();
  } catch (e) {
    if ((e as Error).message !== 'UNAUTHORIZED') {
      logApiError('Calendar', 'addLearningRecord', e, { wordCount, topic });
    }
    throw e;
  }
}

import i18n from '../i18n/config';
import { logApiError } from './logger';

export async function getOrCreateCalendar(accessToken: string, calendarName: string): Promise<string> {
  try {
    // 1. List calendars
    const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (listRes.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (!listRes.ok) {
      throw new Error('Failed to list calendars');
    }
    
    const listData = await listRes.json();
    const existing = listData.items?.find((c: any) => c.summary === calendarName);
    
    if (existing) {
      return existing.id;
    }

    // 2. Create calendar
    const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ summary: calendarName })
    });
    
    if (createRes.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (!createRes.ok) {
      throw new Error('Failed to create calendar');
    }
    
    const createData = await createRes.json();
    return createData.id;
  } catch (error) {
    if ((error as Error).message !== 'UNAUTHORIZED') {
      logApiError('Calendar', 'getOrCreateCalendar', error, { calendarName });
    }
    throw error;
  }
}

export async function addTestResultToCalendar(
  accessToken: string, 
  calendarId: string, 
  topic: string,
  score: number, 
  mistakes: string[],
  totalWords: number,
  startTime: Date,
  endTime: Date
) {
  try {
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMins = Math.floor(durationMs / 60000);
    const durationSecs = Math.floor((durationMs % 60000) / 1000);
    
    let durationText = "";
    if (durationMins > 0) {
      durationText = `${durationMins} ${i18n.t('calendar.duration_min')} ${durationSecs} ${i18n.t('calendar.duration_sec')}`;
    } else {
      durationText = `${durationSecs} ${i18n.t('calendar.duration_sec')}`;
    }
    
    const description = `${i18n.t('calendar.topic_label')}: ${topic}\n${i18n.t('calendar.total_words_label')}: ${totalWords}\n${i18n.t('calendar.score_label')}: ${score}${i18n.t('calendar.score_unit')}\n${i18n.t('calendar.duration_label')}: ${durationText}\n\n${i18n.t('calendar.mistakes_label')}:\n${mistakes.length > 0 ? mistakes.join('\n') : i18n.t('calendar.no_mistakes')}`;

    const event = {
      summary: i18n.t('calendar.event_title', { topic, score }),
      description: description,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    };

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (!res.ok) {
      throw new Error('Failed to add event to calendar');
    }
  } catch (error) {
    if ((error as Error).message !== 'UNAUTHORIZED') {
      logApiError('Calendar', 'addTestResultToCalendar', error, { topic, score, mistakesCount: mistakes.length });
    }
    throw error;
  }
}

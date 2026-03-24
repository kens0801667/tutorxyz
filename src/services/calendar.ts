export async function getOrCreateCalendar(accessToken: string, calendarName: string): Promise<string> {
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
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMins = Math.floor(durationMs / 60000);
  const durationSecs = Math.floor((durationMs % 60000) / 1000);
  const durationText = durationMins > 0 ? `${durationMins} 分 ${durationSecs} 秒` : `${durationSecs} 秒`;
  
  const description = `測驗主題: ${topic}\n本次測驗單字數: ${totalWords}\n分數: ${score}分\n學習與測驗總花費時間: ${durationText}\n\n需要加強的單字:\n${mistakes.length > 0 ? mistakes.join('\n') : '全對！太棒了！'}`;

  const event = {
    summary: `單字測驗: ${topic} - 成績: ${score}分`,
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
}

import { CustomList, Word } from '../types';

const STORAGE_KEY = 'ai_vocab_custom_lists';

export function getCustomLists(): CustomList[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to parse custom lists from localStorage', error);
    return [];
  }
}

export function saveCustomList(source: 'topic' | 'image' | 'text', words: Word[], customTitle?: string, level?: string, topic?: string): CustomList {
  const lists = getCustomLists();
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const newList: CustomList = {
    id: Date.now().toString(),
    title: customTitle ? (customTitle.includes('/') || customTitle.includes(':') ? customTitle : `${customTitle} - ${dateStr}`) : dateStr,
    source,
    level,
    topic,
    words,
    createdAt: now.getTime(),
  };
  
  lists.unshift(newList); // Add to beginning
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  return newList;
}

export function updateCustomList(id: string, updates: Partial<CustomList>): CustomList | null {
  const lists = getCustomLists();
  const index = lists.findIndex(list => list.id === id);
  if (index !== -1) {
    lists[index] = { ...lists[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    return lists[index];
  }
  return null;
}

export function deleteCustomList(id: string): void {
  const lists = getCustomLists();
  const filtered = lists.filter(list => list.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Play, ChevronLeft, Save, Loader2 } from 'lucide-react';
import { CustomList, Word } from '../types';
import { getCustomLists, deleteCustomList, updateCustomList } from '../services/history';
import { fillWordDetails } from '../services/gemini';

interface Props {
  onStartTest: (words: Word[], topic: string, level: string) => void;
}

export function HistoryTab({ onStartTest }: Props) {
  const [lists, setLists] = useState<CustomList[]>([]);
  const [editingList, setEditingList] = useState<CustomList | null>(null);
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLists(getCustomLists());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('確定要刪除這個單字表嗎？')) {
      deleteCustomList(id);
      setLists(getCustomLists());
    }
  };

  const handleEdit = (list: CustomList) => {
    setEditingList(list);
    setEditText(list.words.map(w => w.word).join('\n'));
  };

  const handleSaveEdit = async () => {
    if (!editingList) return;
    
    const newWordsList = editText.split('\n').map(w => w.trim()).filter(w => w);
    if (newWordsList.length === 0) {
      alert('單字清單不能為空');
      return;
    }

    setIsSaving(true);
    try {
      // Fetch details for the new list of words
      const filledWords = await fillWordDetails(newWordsList);
      updateCustomList(editingList.id, { words: filledWords, title: editingList.title });
      setLists(getCustomLists());
      setEditingList(null);
    } catch (error) {
      console.error('Failed to save edited list:', error);
      alert('儲存失敗，請重試。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleChange = (value: string) => {
    if (editingList) {
      setEditingList({ ...editingList, title: value });
    }
  };

  if (editingList) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setEditingList(null)}
            disabled={isSaving}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
            aria-label="返回"
          >
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <input 
            type="text"
            value={editingList.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={isSaving}
            className="flex-1 text-xl font-bold bg-transparent border-b-2 border-indigo-200 focus:border-indigo-500 outline-none px-2 py-1 disabled:opacity-50"
          />
          <button 
            onClick={handleSaveEdit}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? '儲存中...' : '儲存'}
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">編輯單字清單 (一行一個單字)</label>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            disabled={isSaving}
            className="w-full h-64 text-lg p-4 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none bg-white font-mono disabled:opacity-50"
            placeholder="apple&#10;banana&#10;cat"
          />
          <p className="text-sm text-slate-500">儲存時，AI 會自動為您補齊翻譯、詞性與例句。</p>
        </div>
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>目前沒有歷史紀錄。</p>
        <p className="text-sm mt-2">使用「主題產生」、「拍照 / 上傳」或「手動輸入」產生的單字表會顯示在這裡。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {lists.map(list => (
        <div key={list.id} className="bg-white border-2 border-slate-100 rounded-2xl p-5 hover:border-indigo-100 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">{list.title}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {new Date(list.createdAt).toLocaleString()} · {list.words.length} 個單字
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleEdit(list)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                title="編輯"
                aria-label="編輯單字清單"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => handleDelete(list.id)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="刪除"
                aria-label="刪除單字清單"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          <button 
            onClick={() => onStartTest(list.words, list.title, '歷史紀錄')}
            className="w-full py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            開始測驗
          </button>
        </div>
      ))}
    </div>
  );
}

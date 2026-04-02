import { GoogleGenAI, Type, Modality, LiveServerMessage } from "@google/genai";
import { Word, TestQuestion, MultipleChoiceQuestion, FillInTheBlankQuestion, TeacherStyle } from "../types";

let userApiKey: string | null = null;
let userModel: string = "gemini-3-flash-preview"; // Default standard model
let userLiveModel: string = "gemini-2.5-flash-native-audio-preview-09-2025"; // Default live model

export function setGeminiApiKey(key: string) {
  userApiKey = key;
}

export function setGeminiModel(model: string) {
  userModel = model;
}

export function setGeminiLiveModel(model: string) {
  userLiveModel = model;
}

export function getSelectedModel() {
  return userModel;
}

export function getSelectedLiveModel() {
  return userLiveModel;
}

export async function listAvailableModels(apiKey?: string): Promise<{ standard: string[], live: string[] }> {
  const key = apiKey || userApiKey || (typeof (import.meta as any).env !== 'undefined' ? (import.meta as any).env.VITE_GEMINI_API_KEY : (globalThis as any).process?.env?.VITE_GEMINI_API_KEY);
  
  const fallbacks = {
    standard: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-lite-preview-02-05"],
    live: ["gemini-2.0-flash-exp", "gemini-2.4-flash-exp", "gemini-2.5-flash-native-audio-preview-09-2025"]
  };

  if (!key) return fallbacks;

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.list();
    
    const allModels = response.page;
    
    // Filter out embedding models
    const filteredModels = allModels.filter(m => !m.name.toLowerCase().includes('embedding'));
    
    const standard = filteredModels
      .filter(m => m.supportedActions?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''));
      
    // Live models usually support 'bidiContent' or are 2.0+ flash models with audio in name
    const live = filteredModels
      .filter(m => 
        (m.supportedActions?.includes('bidiContent')) || 
        (m.name.includes('flash') && (m.name.includes('2.0') || m.name.includes('2.4') || m.name.includes('2.5')))
      )
      .map(m => m.name.replace('models/', ''));
    
    return {
      standard: standard.length > 0 ? standard : fallbacks.standard,
      live: live.length > 0 ? live : fallbacks.live
    };
  } catch (error) {
    console.error("Failed to list models:", error);
    return fallbacks;
  }
}

function getAI() {
  const key = userApiKey || (typeof (import.meta as any).env !== 'undefined' ? (import.meta as any).env.VITE_GEMINI_API_KEY : (globalThis as any).process?.env?.VITE_GEMINI_API_KEY);
  if (!key) {
    throw new Error("Gemini API Key is missing. Please set it up first.");
  }
  return new GoogleGenAI({ apiKey: key });
}

export async function generateVocabulary(topic: string, level: string, count: number): Promise<Word[]> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: userModel,
    contents: `你是一位專業的英語老師。請根據『${level}，主題：${topic}』，產生 ${count} 個必背單字。請以 JSON 格式回覆，包含欄位：word (英文單字), pos (詞性), meaning (繁體中文解釋), exampleSentence (英文例句), exampleTranslation (例句中文翻譯)。`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            meaning: { type: Type.STRING, description: "Traditional Chinese translation" },
            pos: { type: Type.STRING },
            exampleSentence: { type: Type.STRING },
            exampleTranslation: { type: Type.STRING, description: "Traditional Chinese translation of the example sentence" }
          },
          required: ["word", "meaning", "pos", "exampleSentence", "exampleTranslation"]
        }
      }
    }
  });
  
  // Map the new fields (pos, meaning) to our internal Word interface (partOfSpeech, translation)
  const rawData = JSON.parse(response.text || "[]");
  return rawData.map((item: any) => ({
    word: item.word,
    translation: item.meaning,
    partOfSpeech: item.pos,
    exampleSentence: item.exampleSentence,
    exampleTranslation: item.exampleTranslation
  }));
}

export async function extractWordsFromImage(base64Data: string, mimeType: string, count: number): Promise<Word[]> {
  const response = await getAI().models.generateContent({
    model: userModel,
    contents: [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      },
      `請從這張圖片中擷取英文單字。請回傳一個 JSON 陣列，包含最多 ${count} 個單字。
      每個單字物件必須包含以下欄位：
      - word: 英文單字
      - meaning: 繁體中文翻譯
      - pos: 詞性 (例如 n., v., adj.)
      - exampleSentence: 一句簡單的英文例句
      - exampleTranslation: 例句的繁體中文翻譯
      
      如果圖片中沒有足夠的單字，請盡可能擷取。如果圖片中沒有任何單字，請回傳空陣列 []。`
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            meaning: { type: Type.STRING, description: "Traditional Chinese translation" },
            pos: { type: Type.STRING },
            exampleSentence: { type: Type.STRING },
            exampleTranslation: { type: Type.STRING, description: "Traditional Chinese translation of the example sentence" }
          },
          required: ["word", "meaning", "pos", "exampleSentence", "exampleTranslation"]
        }
      }
    }
  });

  const rawData = JSON.parse(response.text || "[]");
  return rawData.map((item: any) => ({
    word: item.word,
    translation: item.meaning,
    partOfSpeech: item.pos,
    exampleSentence: item.exampleSentence,
    exampleTranslation: item.exampleTranslation
  }));
}

export async function extractWordsFromText(text: string, count: number): Promise<Word[]> {
  const response = await getAI().models.generateContent({
    model: userModel,
    contents: `請從以下文字中擷取英文單字。請回傳一個 JSON 陣列，包含最多 ${count} 個單字。
      每個單字物件必須包含以下欄位：
      - word: 英文單字
      - meaning: 繁體中文翻譯
      - pos: 詞性 (例如 n., v., adj.)
      - exampleSentence: 一句簡單的英文例句
      - exampleTranslation: 例句的繁體中文翻譯
      
      如果文字中沒有提供中文翻譯，請自動補充。如果文字中沒有足夠的單字，請盡可能擷取。如果沒有任何單字，請回傳空陣列 []。
      
      文字內容：
      ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            meaning: { type: Type.STRING, description: "Traditional Chinese translation" },
            pos: { type: Type.STRING },
            exampleSentence: { type: Type.STRING },
            exampleTranslation: { type: Type.STRING, description: "Traditional Chinese translation of the example sentence" }
          },
          required: ["word", "meaning", "pos", "exampleSentence", "exampleTranslation"]
        }
      }
    }
  });

  const rawData = JSON.parse(response.text || "[]");
  return rawData.map((item: any) => ({
    word: item.word,
    translation: item.meaning,
    partOfSpeech: item.pos,
    exampleSentence: item.exampleSentence,
    exampleTranslation: item.exampleTranslation
  }));
}

export async function fillWordDetails(words: string[]): Promise<Word[]> {
  if (words.length === 0) return [];
  
  const response = await getAI().models.generateContent({
    model: userModel,
    contents: `請為以下英文單字提供繁體中文翻譯、詞性、一個簡單實用的英文例句，以及例句的繁體中文翻譯。
      請以 JSON 陣列格式回傳，每個單字物件必須包含以下欄位：
      - word: 英文單字
      - meaning: 繁體中文翻譯
      - pos: 詞性 (例如 n., v., adj.)
      - exampleSentence: 一句簡單的英文例句
      - exampleTranslation: 例句的繁體中文翻譯
      
      單字列表：
      ${words.join('\n')}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            meaning: { type: Type.STRING, description: "Traditional Chinese translation" },
            pos: { type: Type.STRING },
            exampleSentence: { type: Type.STRING },
            exampleTranslation: { type: Type.STRING, description: "Traditional Chinese translation of the example sentence" }
          },
          required: ["word", "meaning", "pos", "exampleSentence", "exampleTranslation"]
        }
      }
    }
  });

  const rawData = JSON.parse(response.text || "[]");
  return rawData.map((item: any) => ({
    word: item.word,
    translation: item.meaning,
    partOfSpeech: item.pos,
    exampleSentence: item.exampleSentence,
    exampleTranslation: item.exampleTranslation
  }));
}

export function getVoiceConfig(style: TeacherStyle) {
  switch (style) {
    case 'enthusiastic': return { voiceName: 'Kore', lang: 'en-US', pitch: 1.2, rate: 1.1 };
    case 'strict': return { voiceName: 'Fenrir', lang: 'en-GB', pitch: 0.8, rate: 0.95 };
    case 'socratic': return { voiceName: 'Charon', lang: 'en-US', pitch: 1.0, rate: 0.85 };
    case 'humorous': return { voiceName: 'Puck', lang: 'en-US', pitch: 1.1, rate: 1.05 };
    default: return { voiceName: 'Kore', lang: 'en-US', pitch: 1.0, rate: 1.0 };
  }
}

export async function generateTeacherScript(word: string, meaning: string): Promise<string> {
  const response = await getAI().models.generateContent({
    model: userModel,
    contents: `你是一位親切的英文家教。現在要教的單字是 '${word}' (${meaning})。請產生一段簡短的教學口白，必須包含：1. 唸出單字兩次、2. 唸出拼字、3. 簡單解釋、4. 造一個生活化的英文例句並附上中文翻譯。請以純文字回覆，方便語音系統朗讀。`,
  });
  return response.text || "";
}

export async function generateAudio(text: string, teacherStyle: TeacherStyle = 'enthusiastic'): Promise<string | undefined> {
  if (!text || text.trim() === '') return undefined;
  
  // Strip markdown characters that might confuse the TTS model
  const cleanText = text.replace(/[*_#`]/g, '').trim();
  
  if (!cleanText) return undefined;

  const voiceConfig = getVoiceConfig(teacherStyle);

  try {
    const response = await getAI().models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Please read the following text aloud exactly as written, do not answer it: ${cleanText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceConfig.voiceName },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error: any) {
    // Log as warning instead of error since we have a fallback mechanism
    console.warn("Gemini TTS API failed (likely quota exceeded), falling back to browser TTS.");
    return undefined;
  }
}

export async function evaluateSpeakingDialog(word: string, meaning: string, studentInput: string, history: {role: string, parts: {text: string}[]}[]): Promise<{response: string, isCorrect: boolean}> {
  const systemInstruction = `你是英文口說家教。測驗單字：${word} (中文：${meaning})。
  目標：引導學生完成「唸出單字」與「拼出字母」。
  規則：
  1. 學生可以分開或同時完成「唸出單字」與「拼字」。
  2. 若學生只唸對單字，簡短稱讚並請他拼出來。若只拼對，簡短稱讚並請他唸出來。
  3. 只有當學生在對話中「已唸對」且「已拼對」時，才在回覆最後加上 "[CORRECT]" 標記。
  4. 若答錯，給予極簡短提示（如字首發音），不直接給答案。
  5. 回覆務必極度簡短、直接，絕不說廢話。
  6. 純文字回覆，無 Markdown。`;

  const chat = getAI().chats.create({
    model: userModel,
    config: {
      systemInstruction,
    },
    history: history,
  });

  const response = await chat.sendMessage({ message: studentInput });
  const text = response.text || "";
  const isCorrect = text.includes("[CORRECT]");
  const cleanResponse = text.replace("[CORRECT]", "").trim();

  return { response: cleanResponse, isCorrect };
}

export async function startLiveSpeakingSession(
  words: {word: string, translation: string}[],
  teacherStyle: TeacherStyle,
  onAudioData: (base64: string) => void,
  onInterrupted: () => void,
  onTestFinished: (score: number, feedback: string) => void
) {
  const wordListStr = words.map(w => `${w.word} (${w.translation})`).join(', ');
  
  let stylePrompt = "";
  switch (teacherStyle) {
    case 'enthusiastic':
      stylePrompt = `【你的風格：熱情鼓勵型 (The Enthusiastic Motivator)】
特色： 高能量、語氣誇張、充滿正能量。無論學生答對或答錯，都會給予極大的情緒價值，主要目的是「建立開口說英文的自信」。
AI 提示詞重點： 「你是一位極度熱情、隨時都在誇獎學生的啦啦隊老師。請多使用『太棒了』等字眼。學生答錯時，用極度溫柔且鼓勵的語氣給予提示。」`;
      break;
    case 'strict':
      stylePrompt = `【你的風格：嚴格精準型 (The Strict Academic)】
特色： 講求效率與準確度。不講廢話，會立刻點出發音的瑕疵或拼字的錯誤，要求學生反覆練習直到完美。
AI 提示詞重點： 「你是一位嚴謹、高標準的專業學術導師。語氣平穩、專業、不苟言笑。當學生發音有微小瑕疵時，必須立刻指正。以效率與正確性為最高原則。」`;
      break;
    case 'socratic':
      stylePrompt = `【你的風格：引導啟發型 (The Socratic Guide)】
特色： 絕對不直接給答案。善用提問、字根字首、或是生活中的聯想來引導學生自己想出答案。
AI 提示詞重點： 「你是一位擅長啟發思考的智者老師。當學生不會拼字或發音時，絕對禁止直接給答案。必須給予線索引導他自己拼出來。」`;
      break;
    case 'humorous':
      stylePrompt = `【你的風格：幽默搞笑型 (The Comedian)】
特色： 語氣輕鬆、像朋友一樣，會用好笑的諧音梗或誇張的情境來解釋單字，讓學習過程充滿樂趣。
AI 提示詞重點： 「你是一位幽默、愛開玩笑的朋友型家教。用語氣輕鬆、時下流行的口吻說話。如果學生答錯，用輕鬆幽默的方式化解尷尬並給予提示。」`;
      break;
  }

  const systemInstruction = `你現在是一位專為台灣學生設計的英文口說家教「Teacher Gemini」。 我們現在要進行「即時語音單字測驗」。

${stylePrompt}

【你的任務】 逐一測試學生以下單字的「發音」與「拼寫」：
待測單字清單：[${wordListStr}]

【互動規則】（請嚴格遵守，因為我們正在進行即時語音通話）

極度簡短自然： 每次發言保持在 1 到 2 句話以內。請像真人一樣對話，絕對不要像在唸稿或給出長篇大論。

一次一件事： 一次只測驗「一個」單字。
⚠️ 絕對禁止洩漏答案： 你只能唸出單字的「中文解釋」，絕對不能唸出英文單字！由學生來回答英文發音與拼寫。
例如：「我們來測驗第一個單字，請問『蘋果』的英文怎麼說？請唸出來並拼給我聽。」（絕對不能說出 apple）

嚴格判定： 學生必須同時唸出正確的「發音」並唸出正確的「字母拼寫」（例如：apple, a-p-p-l-e）。
⚠️ 拼字嚴格限制： 不論是哪種風格，務必要求學生正確拼出每個字元（字母）才能通過該單字的測驗。如果拼字錯誤或沒有拼出每個字母，請糾正他們並要求重試。只有在發音與拼字完全正確時，才能算通過該單字的測驗。

循序漸進的提示（絕不直接給答案）：
如果學生發音錯了，請親自示範一次正確發音，請他跟著唸。
如果學生拼錯了，或是說不知道，請給予提示。例如：「字首是 a 喔！」、「它有三個音節，li-bra-ry，再試試看？」

推進： 學生完全答對（發音正確且拼字完全正確）後，根據你的風格給予回饋，然後立刻自然地進入清單上的下一個單字。

隨機應變： 如果學生問了不相關的問題，簡短回答後，溫柔地把話題拉回測驗。

測驗結束： 當清單上的單字都測驗完畢後，做一個簡短的總結與鼓勵，並呼叫 finishTest 結束測驗。

【對話開場】 請主動打招呼，介紹自己，並直接開始測驗第一個單字（記得只說中文解釋）。`;

  const sessionPromise = getAI().live.connect({
    model: userLiveModel,
    callbacks: {
      onopen: () => {
        console.log("Live session opened");
      },
      onmessage: async (message: LiveServerMessage) => {
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio) {
          onAudioData(base64Audio);
        }
        if (message.serverContent?.interrupted) {
          onInterrupted();
        }
        if (message.toolCall) {
          const call = message.toolCall.functionCalls?.[0];
          if (call && call.name === 'finishTest') {
            const args = call.args as any;
            onTestFinished(args.score || 100, args.feedback || "測驗完成！");
            
            // Send tool response
            sessionPromise.then(session => {
              session.sendToolResponse({
                functionResponses: [{
                  id: call.id,
                  name: call.name,
                  response: { result: "success" }
                }]
              });
            });
          }
        }
      },
      onclose: () => {
        console.log("Live session closed");
      },
      onerror: (error) => {
        console.error("Live session error:", error);
      }
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: getVoiceConfig(teacherStyle).voiceName } },
      },
      systemInstruction,
      tools: [{
        functionDeclarations: [{
          name: "finishTest",
          description: "當所有單字都測驗完畢，且你已經做完總結後，呼叫此函數來結束測驗並給予評分。",
          parameters: {
            type: Type.OBJECT,
            properties: {
              score: {
                type: Type.NUMBER,
                description: "學生整體表現分數 (0-100)"
              },
              feedback: {
                type: Type.STRING,
                description: "給學生的簡短總結評語"
              }
            },
            required: ["score", "feedback"]
          }
        }]
      }]
    }
  });

  return sessionPromise;
}


export async function evaluatePronunciation(audioBase64: string, mimeType: string, word: string): Promise<{score: number, feedback: string}> {
  const response = await getAI().models.generateContent({
    model: userModel,
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType,
            }
          },
          {
            text: `Evaluate the pronunciation of the English word "${word}" in the provided audio. 
            Return a JSON object with two fields: 
            "score" (number from 0 to 100), 
            "feedback" (short string in Traditional Chinese explaining what was good or what needs improvement).`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING }
        },
        required: ["score", "feedback"]
      }
    }
  });
  return JSON.parse(response.text || '{"score": 0, "feedback": "Evaluation failed."}');
}

export async function generateWrittenTest(words: Word[]): Promise<TestQuestion[]> {
  const wordList = words.map(w => w.word).join(", ");
  const halfCount = Math.ceil(words.length / 2);
  const response = await getAI().models.generateContent({
    model: userModel,
    contents: `請根據以下單字清單：[${wordList}]，產生一份測驗卷，包含 ${halfCount} 題單選題與 ${words.length - halfCount} 題填空題。
    請嚴格使用以下 JSON 格式回覆：
    {
      "multiple_choice": [
        {"word": "apple", "question": "...", "options": ["A", "B", "C", "D"], "correctAnswerIndex": 0}
      ],
      "fill_in_the_blank": [
        {"word": "apple", "question": "This is an ___ (蘋果).", "answer": "apple"}
      ]
    }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          multiple_choice: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                correctAnswerIndex: { type: Type.NUMBER }
              },
              required: ["word", "question", "options", "correctAnswerIndex"]
            }
          },
          fill_in_the_blank: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                question: { type: Type.STRING },
                answer: { type: Type.STRING }
              },
              required: ["word", "question", "answer"]
            }
          }
        },
        required: ["multiple_choice", "fill_in_the_blank"]
      }
    }
  });
  
  try {
    const data = JSON.parse(response.text || '{"multiple_choice": [], "fill_in_the_blank": []}');
    const mcQuestions: MultipleChoiceQuestion[] = (data.multiple_choice || []).map((q: any) => ({ ...q, type: 'multiple_choice' }));
    const fitbQuestions: FillInTheBlankQuestion[] = (data.fill_in_the_blank || []).map((q: any) => ({ ...q, type: 'fill_in_the_blank' }));
    
    // Combine and shuffle
    const combined = [...mcQuestions, ...fitbQuestions];
    return combined.sort(() => Math.random() - 0.5);
  } catch (e) {
    console.error("Failed to parse test questions", e);
    return [];
  }
}

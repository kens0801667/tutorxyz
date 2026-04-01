import { GoogleGenAI, Type, Modality, LiveServerMessage } from "@google/genai";
import { Word, TestQuestion, MultipleChoiceQuestion, FillInTheBlankQuestion, TeacherStyle } from "../types";
import { logApiError } from "./logger";

let userApiKey: string | null = null;

export function setGeminiApiKey(key: string) {
  userApiKey = key;
}

function getAI() {
  const key = userApiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null);
  if (!key) {
    throw new Error("Gemini API Key is missing. Please set it up first.");
  }
  return new GoogleGenAI({ apiKey: key });
}

export async function generateVocabulary(topic: string, level: string, count: number): Promise<Word[]> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash-preview",
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
    
    const rawData = JSON.parse(response.text || "[]");
    return rawData.map((item: any) => ({
      word: item.word,
      translation: item.meaning,
      partOfSpeech: item.pos,
      exampleSentence: item.exampleSentence,
      exampleTranslation: item.exampleTranslation
    }));
  } catch (e) {
    if ((e as Error).message !== 'UNAUTHORIZED') {
      logApiError('Gemini', 'generateVocabulary', e, { topic, level, count });
    }
    throw e;
  }
}

export async function extractWordsFromImage(base64Data: string, mimeType: string, count: number): Promise<Word[]> {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-1.5-flash-preview",
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
  } catch (e) {
    if ((e as Error).message !== 'UNAUTHORIZED') {
      logApiError('Gemini', 'extractWordsFromImage', e, { mimeType, count });
    }
    throw e;
  }
}

export async function extractWordsFromText(text: string, count: number): Promise<Word[]> {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-1.5-flash-preview",
      contents: `請從以下文字中擷取英文單字。請回傳一個 JSON 陣列，包含最多 ${count} 個單字。請使用繁體中文進行翻譯。
        每個單字物件必須包含以下欄位：
        - word: 英文單字
        - meaning: 繁體中文翻譯
        - pos: 詞性 (例如 n., v., adj.)
        - exampleSentence: 一句簡單的英文例句
        - exampleTranslation: 例句的繁體中文翻譯
        
        如果文字中沒有提供翻譯，請自動補充。如果文字中沒有足夠的單字，請盡可能擷取。如果沒有任何單字，請回傳空陣列 []。
        
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
  } catch (e) {
    if ((e as Error).message !== 'UNAUTHORIZED') {
      logApiError('Gemini', 'extractWordsFromText', e, { textLen: text.length, count });
    }
    throw e;
  }
}

export async function fillWordDetails(words: string[]): Promise<Word[]> {
  if (words.length === 0) return [];
  
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-1.5-flash-preview",
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
  } catch (e) {
    if ((e as Error).message !== 'UNAUTHORIZED') {
      logApiError('Gemini', 'fillWordDetails', e, { wordCount: words.length });
    }
    throw e;
  }
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
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-1.5-flash-preview",
      contents: `你是一位親切的英文家教。現在要教的單字是 '${word}' (中文解釋：${meaning})。請產生一段簡短的教學口白，必須包含：1. 唸出單字兩次、2. 唸出拼字、3. 簡單解釋、4. 造一個生活化的英文例句並附上中文翻譯。請以純文字回覆，方便語音系統朗讀。`,
    });
    return response.text || "";
  } catch (e) {
    if ((e as Error).message !== 'UNAUTHORIZED') {
      logApiError('Gemini', 'generateTeacherScript', e, { word, meaning });
    }
    throw e;
  }
}

export async function generateAudio(text: string, teacherStyle: TeacherStyle = 'enthusiastic'): Promise<string | undefined> {
  if (!text || text.trim() === '') return undefined;
  
  // Strip markdown characters that might confuse the TTS model
  const cleanText = text.replace(/[*_#`]/g, '').trim();
  
  if (!cleanText) return undefined;

  const voiceConfig = getVoiceConfig(teacherStyle);

  try {
    const response = await getAI().models.generateContent({
      model: "gemini-1.5-flash-preview-tts",
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
    if ((error as Error).message !== 'UNAUTHORIZED') {
      logApiError('Gemini', 'generateAudio', error, { textLen: cleanText.length, teacherStyle });
    }
    console.warn("Gemini TTS API failed (likely quota exceeded), falling back to browser TTS.");
    return undefined;
  }
}

export async function evaluateSpeakingDialog(word: string, meaning: string, studentInput: string, history: {role: string, parts: {text: string}[]}[]): Promise<{response: string, isCorrect: boolean}> {
  try {
    const systemInstruction = `你是英文口說家教。測驗單字：${word} (解釋：${meaning})。
    目標：引導學生完成「唸出單字」與「拼出字母」。
    規則：
    1. 學生可以分開或同時完成「唸出單字」與「拼字」。
    2. 若學生只唸對單字，簡短稱讚並請他拼出來。若只拼對，簡短稱讚並請他唸出來。
    3. 只有當學生在對話中「已唸對」且「已拼對」時，才在回覆最後加上 "[CORRECT]" 標記。
    4. 若答錯，給予極簡短提示（如字首發音），不直接給答案。
    5. 回覆務必極度簡短、直接，絕不說廢話。
    6. 純文字回覆，無 Markdown。`;

    const chat = getAI().chats.create({
      model: "gemini-1.5-flash-preview",
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
  } catch (e) {
    if ((e as Error).message !== 'UNAUTHORIZED') {
      logApiError('Gemini', 'evaluateSpeakingDialog', e, { word, meaning, studentInputLen: studentInput.length });
    }
    throw e;
  }
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
      stylePrompt = `【Your Style: The Enthusiastic Motivator】
Traits: High energy, encouraging, and full of positive vibes. Regardless of whether the student is right or wrong, provide immense emotional support to build their confidence in speaking English.
Emphasis: "Be extremely warm, always praising the student. Use encouraging phrases like 'Fantastic!', 'Great job!'. If they make a mistake, provide hints in a soft and supportive tone."`;
      break;
    case 'strict':
      stylePrompt = `【Your Style: The Strict Academic】
Traits: Focus on efficiency and accuracy. No fluff. Point out pronunciation flaws or spelling errors immediately and require the student to practice until perfect.
Emphasis: "Be a rigorous, high-standard professional academic tutor. Tone should be steady, professional, and serious. Correct even minor pronunciation flaws immediately. Prioritize efficiency and correctness."`;
      break;
    case 'socratic':
      stylePrompt = `【Your Style: The Socratic Guide】
Traits: Never give answers directly. Use questions, etymology, or life associations to guide students to discover the answers themselves.
Emphasis: "Be a wise teacher skilled in inspiring thought. When a student struggles with spelling or pronunciation, do not give the answer. Provide clues to lead them to spell it out themselves."`;
      break;
    case 'humorous':
      stylePrompt = `【Your Style: The Comedian】
Traits: Relaxed tone, like a friend. Use funny puns or exaggerated scenarios to explain words, making the learning process enjoyable.
Emphasis: "Be a humorous, joke-loving friend-type tutor. Speak with a relaxed, trendy tone. If the student makes a mistake, use humor to diffuse the awkwardness and provide hints."`;
      break;
  }

  const systemInstruction = `You are "Teacher Gemini", a professional English tutor for students who speak Traditional Chinese. 

CORE OBJECTIVE: Conduct a "Live Voice Vocabulary Test" to assess the student's English pronunciation and spelling.

LANGUAGE ROLES:
- TARGET LANGUAGE: English (The language the student is learning).
- SUPPORT LANGUAGE: Traditional Chinese (The student's native language, used for your explanations and clues).

${stylePrompt}

YOUR TASK:
1. You MUST test ALL words provided in the "Word List to be Tested" one by one.
2. For each word, you provide its definition or a clue ONLY in Traditional Chinese.
3. **STRICT RULE**: You are ABSOLUTELY PROHIBITED from saying the target English word until the student has successfully pronounced and spelled it.
4. The student must respond by saying the English word AND spelling it out (e.g., "Apple, A-P-P-L-E").

Word List to be Tested: [${wordListStr}]

INTERACTION RULES:
- **Sequential Testing**: Start with the first word, and ONLY move to the next word after the current one is completed OR after at least 3 failed attempts where you've provided enough hints.
- **NEVER Call finishTest Early**: You are strictly forbidden from calling the "finishTest" tool until EVERY SINGLE WORD in the list above has been attempted.
- **Concise & Natural**: Keep each turn to 1-2 sentences. Avoid long lectures.
- **Proactive Feedback**: You MUST respond as soon as you detect any pause in student output. 
    - If the student provided the word and the correct spelling: Praise them immediately and move to the next word.
    - If they are only halfway through or seem to have stopped: Provide the next letter as a hint or ask them to continue in Traditional Chinese.
- **Never Stay Silent**: If there is more than 1.5 seconds of silence after a student attempt, you MUST speak to keep the session alive.
- **Acknowledge Partial Success**: If they get the pronunciation right but struggle with spelling, praise the pronunciation first and then guide the spelling.

JUDGMENT CRITERIA:
- The student should provide the English pronunciation and the spelling. 
- Once the LAST word in the list is completed or attempted, you MUST call the "finishTest" tool to provide the final summary score and feedback for the entire session.

【Session Start】 Greet the student in Traditional Chinese, introduce yourself, and start by explaining the first word's meaning. Do NOT call finishTest until you have gone through all ${words.length} words.`

  try {
    const sessionPromise = getAI().live.connect({
      model: "gemini-2.0-flash-exp",
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
              onTestFinished(args.score || 100, args.feedback || "Test Finished!");
              
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
          logApiError('Gemini', 'startLiveSpeakingSession::onerror', error, { wordsCount: words.length });
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
            description: "Finish the session and provide the final score and feedback.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                score: {
                  type: Type.NUMBER,
                  description: "Final score (0-100)"
                },
                feedback: {
                  type: Type.STRING,
                  description: "Final feedback for the student"
                }
              },
              required: ["score", "feedback"]
            }
          }]
        }]
      }
    });

    return sessionPromise;
  } catch (error) {
    logApiError('Gemini', 'startLiveSpeakingSession', error, { wordsCount: words.length });
    throw error;
  }
}


export async function evaluatePronunciation(audioBase64: string, mimeType: string, word: string): Promise<{score: number, feedback: string}> {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-1.5-flash-preview",
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
  } catch (e) {
    if ((e as Error).message !== 'UNAUTHORIZED') {
      logApiError('Gemini', 'evaluatePronunciation', e, { word, mimeType });
    }
    throw e;
  }
}

export async function generateWrittenTest(words: Word[]): Promise<TestQuestion[]> {
  try {
    const wordList = words.map(w => w.word).join(", ");
    const halfCount = Math.ceil(words.length / 2);
    const response = await getAI().models.generateContent({
      model: "gemini-1.5-flash-preview",
      contents: `基於以下單字表：[${wordList}]，產生一份包含 ${halfCount} 題單選題與 ${words.length - halfCount} 題填空題的測驗。請使用繁體中文進行解析。
      請嚴格按照以下 JSON 格式回覆：
      {
        "multiple_choice": [
          {"word": "apple", "question": "...", "options": ["A", "B", "C", "D"], "correctAnswerIndex": 0}
        ],
        "fill_in_the_blank": [
          {"word": "apple", "question": "這是一顆 ___ (翻譯)。", "answer": "apple"}
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

    const rawData = JSON.parse(response.text || '{"multiple_choice": [], "fill_in_the_blank": []}');
    const questions: TestQuestion[] = [];

    rawData.multiple_choice.forEach((q: any) => {
      questions.push({
        type: 'multiple_choice',
        word: q.word,
        question: q.question,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex
      } as MultipleChoiceQuestion);
    });

    rawData.fill_in_the_blank.forEach((q: any) => {
      questions.push({
        type: 'fill_in_the_blank',
        word: q.word,
        question: q.question,
        answer: q.answer
      } as FillInTheBlankQuestion);
    });

    return questions;
  } catch (e) {
    if ((e as Error).message !== 'UNAUTHORIZED') {
      logApiError('Gemini', 'generateWrittenTest', e, { wordCount: words.length });
    }
    throw e;
  }
}

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

function getLangName(lang: string) {
  const code = lang.toLowerCase();
  if (code.startsWith('ko')) return "한국어 (Korean)";
  if (code.startsWith('ja')) return "日本語 (Japanese)";
  if (code.startsWith('zh-cn') || code.startsWith('zh-hans')) return "简体中文 (Simplified Chinese)";
  if (code.startsWith('zh')) return "繁體中文 (Traditional Chinese)";
  if (code.startsWith('es')) return "Español (Spanish)";
  if (code.startsWith('fr')) return "Français (French)";
  if (code.startsWith('de')) return "Deutsch (German)";
  return "English";
}

export async function generateVocabulary(topic: string, level: string, count: number, lang: string): Promise<Word[]> {
  try {
    const ai = getAI();
    const langName = getLangName(lang);
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash-preview",
      contents: `You are a professional English teacher. Please generate ${count} essential vocabulary words based on: level "${level}", topic "${topic}". Please respond in JSON format and set the translation and explanation to ${langName}. Include fields: word (English word), pos (part of speech), meaning (word translation), exampleSentence (English sentence), exampleTranslation (example translation).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              meaning: { type: Type.STRING },
              pos: { type: Type.STRING },
              exampleSentence: { type: Type.STRING },
              exampleTranslation: { type: Type.STRING }
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
      logApiError('Gemini', 'generateVocabulary', e, { topic, level, count, lang });
    }
    throw e;
  }
}

export async function extractWordsFromImage(base64Data: string, mimeType: string, count: number, lang: string): Promise<Word[]> {
  try {
    const langName = getLangName(lang);
    const response = await getAI().models.generateContent({
      model: "gemini-1.5-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        `Please extract English vocabulary words from this image. Return a JSON array with a maximum of ${count} words. Use ${langName} for translations and explanations. 
        Each word object must include: 
        - word: English word
        - meaning: translation in ${langName}
        - pos: part of speech (e.g., n., v., adj.)
        - exampleSentence: a simple English example sentence
        - exampleTranslation: translation of the example sentence in ${langName}
        
        If there are not enough words in the image, extract as many as possible. If no words are found, return an empty array [].`
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              meaning: { type: Type.STRING },
              pos: { type: Type.STRING },
              exampleSentence: { type: Type.STRING },
              exampleTranslation: { type: Type.STRING }
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
      logApiError('Gemini', 'extractWordsFromImage', e, { mimeType, count, lang });
    }
    throw e;
  }
}

export async function extractWordsFromText(text: string, count: number, lang: string): Promise<Word[]> {
  try {
    const langName = getLangName(lang);
    const response = await getAI().models.generateContent({
      model: "gemini-1.5-flash-preview",
      contents: `請從以下文字中擷取英文單字。請回傳一個 JSON 陣列，包含最多 ${count} 個單字。請使用 ${langName} 進行翻譯。
        每個單字物件必須包含以下欄位：
        - word: 英文單字
        - meaning: 單字翻譯
        - pos: 詞性 (例如 n., v., adj.)
        - exampleSentence: 一句簡單的英文例句
        - exampleTranslation: 例句翻譯
        
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
              meaning: { type: Type.STRING },
              pos: { type: Type.STRING },
              exampleSentence: { type: Type.STRING },
              exampleTranslation: { type: Type.STRING }
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
      logApiError('Gemini', 'extractWordsFromText', e, { textLen: text.length, count, lang });
    }
    throw e;
  }
}

export async function fillWordDetails(words: string[], lang: string): Promise<Word[]> {
  if (words.length === 0) return [];
  
  try {
    const langName = getLangName(lang);
    const response = await getAI().models.generateContent({
      model: "gemini-1.5-flash-preview",
      contents: `請為以下英文單字提供 ${langName} 翻譯、詞性、一個簡單實用的英文例句，以及例句的 ${langName} 翻譯。
        請以 JSON 陣列格式回傳，每個單字物件必須包含以下欄位：
        - word: 英文單字
        - meaning: 單字翻譯
        - pos: 詞性 (例如 n., v., adj.)
        - exampleSentence: 一句簡單的英文例句
        - exampleTranslation: 例句翻譯
        
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
              meaning: { type: Type.STRING },
              pos: { type: Type.STRING },
              exampleSentence: { type: Type.STRING },
              exampleTranslation: { type: Type.STRING }
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
      logApiError('Gemini', 'fillWordDetails', e, { wordCount: words.length, lang });
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

export async function generateTeacherScript(word: string, meaning: string, lang: string): Promise<string> {
  try {
    const langName = getLangName(lang);
    const response = await getAI().models.generateContent({
      model: "gemini-1.5-flash-preview",
      contents: `You are a friendly English tutor. The word to teach now is '${word}' (translation: ${meaning}). Please generate a short teaching script in ${langName} that includes: 1. Pronouncing the word twice, 2. Spelling out the letters, 3. A simple explanation, and 4. Creating a real-life English example sentence with its ${langName} translation. Please reply in plain text only for the TTS system to read.`,
    });
    return response.text || "";
  } catch (e) {
    if ((e as Error).message !== 'UNAUTHORIZED') {
      logApiError('Gemini', 'generateTeacherScript', e, { word, meaning, lang });
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
  lang: string,
  onAudioData: (base64: string) => void,
  onInterrupted: () => void,
  onTestFinished: (score: number, feedback: string) => void
) {
  const wordListStr = words.map(w => `${w.word} (${w.translation})`).join(', ');
  const langName = getLangName(lang);
  
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

  const systemInstruction = `You are "Teacher Gemini", a professional English tutor for students who speak ${langName}. 

CORE OBJECTIVE: Conduct a "Live Voice Vocabulary Test" to assess the student's English pronunciation and spelling.

LANGUAGE ROLES:
- TARGET LANGUAGE: English (The language the student is learning).
- SUPPORT LANGUAGE: ${langName} (The student's native language, used for your explanations and clues).

${stylePrompt}

YOUR TASK:
1. You MUST test ALL words provided in the "Word List to be Tested" one by one.
2. For each word, you provide its definition or a clue ONLY in ${langName}.
3. **STRICT RULE**: You are ABSOLUTELY PROHIBITED from saying the target English word until the student has successfully pronounced and spelled it.
4. The student must respond by saying the English word AND spelling it out (e.g., "Apple, A-P-P-L-E").

Word List to be Tested: [${wordListStr}]

INTERACTION RULES:
- **Sequential Testing**: Start with the first word, and ONLY move to the next word after the current one is completed OR after at least 3 failed attempts where you've provided enough hints.
- **NEVER Call finishTest Early**: You are strictly forbidden from calling the "finishTest" tool until EVERY SINGLE WORD in the list above has been attempted.
- **Concise & Natural**: Keep each turn to 1-2 sentences. Avoid long lectures.
- **Proactive Feedback**: You MUST respond as soon as you detect any pause in student output. 
    - If the student provided the word and the correct spelling: Praise them immediately and move to the next word.
    - If they are only halfway through or seem to have stopped: Provide the next letter as a hint or ask them to continue in ${langName}.
- **Never Stay Silent**: If there is more than 1.5 seconds of silence after a student attempt, you MUST speak to keep the session alive.
- **Acknowledge Partial Success**: If they get the pronunciation right but struggle with spelling, praise the pronunciation first and then guide the spelling.

JUDGMENT CRITERIA:
- The student should provide the English pronunciation and the spelling. 
- Once the LAST word in the list is completed or attempted, you MUST call the "finishTest" tool to provide the final summary score and feedback for the entire session.

【Session Start】 Greet the student in ${langName}, introduce yourself, and start by explaining the first word's meaning in ${langName}. Do NOT call finishTest until you have gone through all ${words.length} words.`

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


export async function evaluatePronunciation(audioBase64: string, mimeType: string, word: string, lang: string): Promise<{score: number, feedback: string}> {
  try {
    const langName = getLangName(lang);
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
              "feedback" (short string in ${langName} explaining what was good or what needs improvement).`
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
      logApiError('Gemini', 'evaluatePronunciation', e, { word, mimeType, lang });
    }
    throw e;
  }
}

export async function generateWrittenTest(words: Word[], lang: string): Promise<TestQuestion[]> {
  try {
    const wordList = words.map(w => w.word).join(", ");
    const halfCount = Math.ceil(words.length / 2);
    const langName = getLangName(lang);
    const response = await getAI().models.generateContent({
      model: "gemini-1.5-flash-preview",
      contents: `Based on the following word list: [${wordList}], generate a written test with ${halfCount} multiple-choice questions and ${words.length - halfCount} fill-in-the-blank questions. Please use ${langName} for question explanations.
      Please strictly respond in the following JSON format:
      {
        "multiple_choice": [
          {"word": "apple", "question": "...", "options": ["A", "B", "C", "D"], "correctAnswerIndex": 0}
        ],
        "fill_in_the_blank": [
          {"word": "apple", "question": "This is an ___ (explanation).", "answer": "apple"}
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
        correctAnswer: q.options[q.correctAnswerIndex]
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
      logApiError('Gemini', 'generateWrittenTest', e, { wordCount: words.length, lang });
    }
    throw e;
  }
}

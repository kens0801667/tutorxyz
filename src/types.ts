export interface Word {
  word: string;
  translation: string;
  partOfSpeech: string;
  exampleSentence: string;
  exampleTranslation: string;
}

export interface MultipleChoiceQuestion {
  type: 'multiple_choice';
  word: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface FillInTheBlankQuestion {
  type: 'fill_in_the_blank';
  word: string;
  question: string;
  answer: string;
}

export type TestQuestion = MultipleChoiceQuestion | FillInTheBlankQuestion;

export interface TestResult {
  word: string;
  speakingScore?: number;
  speakingFeedback?: string;
  writtenCorrect?: boolean;
}

export type AppMode = 'setup' | 'learning' | 'speaking' | 'written' | 'report';

export type TeacherStyle = 'enthusiastic' | 'strict' | 'socratic' | 'humorous';

export interface CustomList {
  id: string;
  title: string;
  source: 'topic' | 'image' | 'text';
  level?: string;
  topic?: string;
  words: Word[];
  createdAt: number;
}

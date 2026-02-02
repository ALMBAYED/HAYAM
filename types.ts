
export enum JourneyStep {
  LANDING = 'LANDING',
  INQUIRY = 'INQUIRY',
  NAME_INPUT = 'NAME_INPUT',
  BREATHING = 'BREATHING',
  SYNTHESIS = 'SYNTHESIS',
  MANIFESTATION = 'MANIFESTATION',
  ADMIN = 'ADMIN'
}

export type Language = 'en' | 'ar';

export interface Option {
  en: string;
  ar: string;
}

export interface Question {
  id: number;
  text: string;
  arabic: string;
  options: Option[];
  pillar: 'Roots' | 'Shadows' | 'Aspirations' | 'Convergence';
}

export interface UserResponse {
  questionId: number;
  answer: string; 
  elaboration?: string;
  timeTakenMs: number;
}

export interface ManifestationResult {
  imageUrl: string;
  description: string;
  report: string; 
  yinYangBalance: number; 
  balanceScore: {
    stability: number;
    creativity: number;
    depth: number;
  };
}

export interface SessionRecord {
  id?: string;
  timestamp: string;
  fullName: string;
  responses: UserResponse[];
  yinYangBalance: number;
  stability: number;
  creativity: number;
  depth: number;
  language: Language;
  totalDurationMs?: number;
}

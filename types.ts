
export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  audioData?: string; // Base64 audio string
  isAudioLoading?: boolean;
  imageUrl?: string; // Base64 or URL for generated/uploaded images
  isImage?: boolean; // Flag to identify image-centric messages
}

export enum Language {
  ENGLISH = 'English',
  HINDI = 'Hindi',
  MARATHI = 'Marathi'
}

export interface AudioState {
  isPlaying: boolean;
  currentMessageId: string | null;
}

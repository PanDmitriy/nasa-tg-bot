export interface Session {
  messages: Message[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Command {
  command: string;
  description: string;
}

export interface NasaPhoto {
  url: string;
  title: string;
  explanation: string;
  copyright?: string;
}

export interface ISSLocation {
  message: string;
  iss_position: {
    latitude: string;
    longitude: string;
  };
} 
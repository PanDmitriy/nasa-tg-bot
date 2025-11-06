export interface APODPhoto {
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: 'image' | 'video';
  service_version: string;
  title: string;
  url: string;
  copyright?: string;
}

export interface EarthPhoto {
  date: string;
  image?: string;
  caption?: string;
} 
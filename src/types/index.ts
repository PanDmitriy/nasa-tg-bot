export interface Session {
  messages: Message[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
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
  name: string;
  id: number;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  footprint: number;
  timestamp: number;
  daynum: number;
  solar_lat: number;
  solar_lon: number;
  units: string;
}

export interface ISSPass {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  footprint: number;
  timestamp: number;
  daynum: number;
  solar_lat: number;
  solar_lon: number;
  units: string;
}

export interface EPICImage {
  identifier: string;
  caption: string;
  image: string;
  version: string;
  date: string;
  lat: number;
  lon: number;
  dscovr_j2000_position: {
    x: number;
    y: number;
    z: number;
  };
  lunar_j2000_position: {
    x: number;
    y: number;
    z: number;
  };
  sun_j2000_position: {
    x: number;
    y: number;
    z: number;
  };
  attitude_quaternions: {
    q0: number;
    q1: number;
    q2: number;
    q3: number;
  };
}

export interface Asteroid {
  id: string;
  name: string;
  nasa_jpl_url: string;
  absolute_magnitude_h: number;
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
    meters: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
    miles: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
    feet: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: {
    close_approach_date: string;
    close_approach_date_full: string;
    epoch_date_close_approach: number;
    relative_velocity: {
      kilometers_per_second: string;
      kilometers_per_hour: string;
      miles_per_hour: string;
    };
    miss_distance: {
      astronomical: string;
      lunar: string;
      kilometers: string;
      miles: string;
    };
    orbiting_body: string;
  }[];
}

export interface AsteroidFeed {
  element_count: number;
  near_earth_objects: {
    [date: string]: Asteroid[];
  };
}

export interface UserSession {
  photoViewState?: PhotoViewState;
}

export interface PhotoViewState {
  rover: string;
  photos: any[];
  currentIndex: number;
  messageId?: number;
} 
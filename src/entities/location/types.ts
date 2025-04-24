export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface ISSLocation extends Coordinates {
  timestamp: number;
  velocity: number;
  visibility: string;
}

export interface AsteroidLocation {
  name: string;
  coordinates: Coordinates;
  distance: {
    kilometers: number;
    lunar: number;
  };
  velocity: number;
  is_potentially_hazardous: boolean;
} 
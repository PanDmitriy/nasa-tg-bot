export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
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
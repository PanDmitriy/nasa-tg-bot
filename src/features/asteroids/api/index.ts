import { NasaApi } from '../../../shared/api/nasa';

interface CloseApproachData {
  close_approach_date: string;
  relative_velocity: {
    kilometers_per_hour: string;
  };
  miss_distance: {
    kilometers: string;
  };
}

interface Asteroid {
  id: string;
  name: string;
  estimated_diameter: {
    meters: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: CloseApproachData[];
}

interface AsteroidsResponse {
  near_earth_objects: {
    [date: string]: Asteroid[];
  };
}

export class AsteroidsApi extends NasaApi {
  async getNearEarthObjects(days: number = 7): Promise<Asteroid[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const data = await this.get<AsteroidsResponse>('/neo/rest/v1/feed', {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      detailed: 'false'
    });

    return Object.values(data.near_earth_objects).flat();
  }
} 
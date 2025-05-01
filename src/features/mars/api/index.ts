import { NasaApi } from '../../../shared/api/nasa';

export interface MarsPhoto {
  id: number;
  sol: number;
  camera: {
    id: number;
    name: string;
    rover_id: number;
    full_name: string;
  };
  img_src: string;
  earth_date: string;
  rover: {
    id: number;
    name: string;
    landing_date: string;
    launch_date: string;
    status: string;
  };
}

interface MarsResponse {
  photos: MarsPhoto[];
}

export class MarsApi extends NasaApi {
  async getLatestMarsPhotos(rover: string = 'curiosity', sol?: number, camera?: string): Promise<MarsPhoto[]> {
    try {
      const params: Record<string, string | number> = {
        page: 1
      };

      if (sol !== undefined) {
        params.sol = sol;
      }

      if (camera) {
        params.camera = camera;
      }

      const data = await this.get<MarsResponse>(`/mars-photos/api/v1/rovers/${rover}/photos`, params);
      
      if (!data.photos || data.photos.length === 0) {
        throw new Error('Фотографии не найдены для указанных параметров');
      }

      return data.photos;
    } catch (error) {
      console.error('Ошибка при получении фотографий с Марса:', error);
      throw new Error('Не удалось получить фотографии с Марса. Попробуйте изменить параметры запроса.');
    }
  }
} 
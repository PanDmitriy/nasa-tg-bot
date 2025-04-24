import { NasaApi } from '../../../shared/api/nasa';

interface IssPosition {
  latitude: number;
  longitude: number;
}

interface IssResponse {
  message: string;
  timestamp: number;
  iss_position: IssPosition;
}

export class IssApi extends NasaApi {
  constructor(apiKey: string) {
    super(apiKey, 'http://api.open-notify.org');
  }

  async getIssPosition(): Promise<IssResponse> {
    return this.get<IssResponse>('/iss-now.json');
  }
} 
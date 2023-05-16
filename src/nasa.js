import axios from 'axios';
import config from 'config';

class NasaApi {
  constructor(apiKey) {
    this.apiKey = apiKey;
  };

  async getPhotoOfDay() {
    try {
      const url = `https://api.nasa.gov/planetary/apod?api_key=${this.apiKey}`;

      const response = await axios({
        method: 'get',
        url,
      });
      return response.data;
    } catch(e) {
      console.log('Error while request photo of day on nasa: ', e.message);
    }
  };
}

export const nasa = new NasaApi(config.get("NASA_API_KEY"));
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

class NasaApi {
  constructor() {
  };

  async getPhotoOfDay() {
    try {
      const url = `https://api.nasa.gov/planetary/apod?api_key=${process.env.NASA_API_KEY}`;

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

export const nasa = new NasaApi();
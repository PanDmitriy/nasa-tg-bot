import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
class NasaApi {
    constructor() {
        this.ISS_URL = 'http://api.open-notify.org/iss-now.json';
        this.NASA_API_KEY = process.env.NASA_API_KEY;
        this.APOD_URL = `https://api.nasa.gov/planetary/apod?api_key=${this.NASA_API_KEY}`;
    }
    async getPhotoOfDay() {
        try {
            if (!this.NASA_API_KEY) {
                throw new Error('NASA API key is not configured');
            }
            const response = await axios.get(this.APOD_URL);
            return response.data;
        }
        catch (error) {
            console.error('Error while requesting photo of day from NASA:', error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }
    async getISSLocation() {
        try {
            const response = await axios.get(this.ISS_URL);
            return response.data;
        }
        catch (error) {
            console.error('Error while requesting ISS location:', error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }
}
export const nasa = new NasaApi();
//# sourceMappingURL=nasa.js.map
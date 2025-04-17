import axios from "axios";
import ffmpeg from 'fluent-ffmpeg';
import installer from '@ffmpeg-installer/ffmpeg';
import { createWriteStream } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { removeFile } from "./utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

class OggConverter {
  private readonly ffmpegPath: string;

  constructor() {
    this.ffmpegPath = installer.path;
    ffmpeg.setFfmpegPath(this.ffmpegPath);
  }

  async create(url: string, filename: string): Promise<string> {
    try {
      const oggFile = resolve(__dirname, '../voices', `${filename}.ogg`);
      const response = await axios({
        method: 'get',
        url,
        responseType: 'stream',
      });

      return new Promise((resolve, reject) => {
        const stream = createWriteStream(oggFile);
        response.data.pipe(stream);
        stream.on('finish', () => resolve(oggFile));
        stream.on('error', (error: Error) => reject(error));
      });
    } catch (error) {
      console.error('Error while creating ogg:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async toMp3(input: string, filename: string): Promise<string> {
    try {
      const mp3FilePath = resolve(dirname(input), `${filename}.mp3`);

      return new Promise((resolve, reject) => {
        ffmpeg(input)
          .inputOption('-t 30')
          .output(mp3FilePath)
          .on('end', () => {
            removeFile(input);
            resolve(mp3FilePath);
          })
          .on('error', (error: Error) => reject(error))
          .run();
      });
    } catch (error) {
      console.error('Error while creating mp3:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

export const ogg = new OggConverter(); 
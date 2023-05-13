import axios from "axios";
import ffmpeg from 'fluent-ffmpeg';
import installer from '@ffmpeg-installer/ffmpeg';
import { createWriteStream } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { removeFile } from "./utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

class OggConverter {
  constructor() {
    ffmpeg.setFfmpegPath(installer.path);
  };

  async create(url, filename) {
    try {
      const oggFile = resolve(__dirname, '../voices', `${filename}.ogg`);
      const response = await axios({
        method: 'get',
        url,
        responseType: 'stream',
      })

      return new Promise((resolve) => {
        const stream = createWriteStream(oggFile);
        response.data.pipe(stream);
        stream.on('finish', () => resolve(oggFile))  
      })
    } catch(e) {
      console.log('Error while creating ogg: ', e.message);
    }
  };

  async toMp3(input, filename) {
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
        .on('error', (e) => reject(e.message))
        .run();
      });

    } catch(e) {
      console.log('Error while creating mp3: ', e.message);
    }
  };
}

export const ogg = new OggConverter();
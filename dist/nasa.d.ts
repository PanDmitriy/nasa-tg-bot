import { NasaPhoto, ISSLocation } from './types/index.js';
declare class NasaApi {
    private readonly NASA_API_KEY;
    private readonly APOD_URL;
    private readonly ISS_URL;
    constructor();
    getPhotoOfDay(): Promise<NasaPhoto>;
    getISSLocation(): Promise<ISSLocation>;
}
export declare const nasa: NasaApi;
export {};

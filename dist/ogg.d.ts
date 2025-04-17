declare class OggConverter {
    private readonly ffmpegPath;
    constructor();
    create(url: string, filename: string): Promise<string>;
    toMp3(input: string, filename: string): Promise<string>;
}
export declare const ogg: OggConverter;
export {};

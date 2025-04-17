declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    inputOption(option: string): this;
    output(path: string): this;
    on(event: string, callback: (...args: any[]) => void): this;
    run(): void;
  }

  interface FfmpegStatic {
    (input: string): FfmpegCommand;
    setFfmpegPath(path: string): void;
  }

  const ffmpeg: FfmpegStatic;
  export default ffmpeg;
} 
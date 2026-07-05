import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { logger } from '../utils/logger';

export class TranscodeService {
  private readonly uploadDirs = {
    posters: path.join(__dirname, '../../uploads/posters'),
    thumbnails: path.join(__dirname, '../../uploads/thumbnails'),
    videos: path.join(__dirname, '../../uploads/videos'),
  };

  constructor() {
    this.ensureDirsExist();
  }

  private ensureDirsExist(): void {
    Object.values(this.uploadDirs).forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Media Storage Directory created at: ${dir}`);
      }
    });
  }

  public async checkFFmpegInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      exec('ffmpeg -version', (error) => {
        if (error) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  public async transcodeToHLS(filePath: string, filename: string): Promise<string> {
    const isFFmpegAvailable = await this.checkFFmpegInstalled();
    const basename = path.parse(filename).name;
    const outputSubdir = path.join(this.uploadDirs.videos, basename);
    
    // Web relative paths for serving files
    const webPathMp4 = `/uploads/videos/${filename}`;
    const webPathHls = `/uploads/videos/${basename}/playlist.m3u8`;

    if (!isFFmpegAvailable) {
      logger.warn('FFmpeg is not detected in the system environment. Falling back to direct MP4 streaming.');
      return webPathMp4;
    }

    if (!fs.existsSync(outputSubdir)) {
      fs.mkdirSync(outputSubdir, { recursive: true });
    }

    const playlistPath = path.join(outputSubdir, 'playlist.m3u8');
    
    // Command converts to HLS chunking: 360p baseline for rapid local development runs
    const ffmpegCmd = `ffmpeg -i "${filePath}" -profile:v baseline -level 3.0 -s 640x360 -start_number 0 -hls_time 6 -hls_list_size 0 -f hls "${playlistPath}"`;

    logger.info(`Spawning HLS Transcoder process for: ${filename}`);

    return new Promise((resolve) => {
      exec(ffmpegCmd, (error) => {
        if (error) {
          logger.error(`FFmpeg Transcoding process failed: ${error.message}. Falling back to direct MP4.`);
          resolve(webPathMp4);
        } else {
          logger.info(`FFmpeg HLS Transcoding completed successfully for: ${filename}`);
          
          // Delete raw input file to conserve local workspace space
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (delErr) {
            logger.warn(`Could not delete raw upload temp file: ${(delErr as Error).message}`);
          }

          resolve(webPathHls);
        }
      });
    });
  }
}

export default TranscodeService;

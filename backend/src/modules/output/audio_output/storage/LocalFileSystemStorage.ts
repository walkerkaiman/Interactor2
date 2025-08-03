import path from 'path';
import * as fs from 'fs-extra';
import ffmpegPath from 'ffmpeg-static';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { IAudioStorage, SavedFilePayload, AudioFileMeta } from './IAudioStorage';

const execFileAsync = promisify(execFile);

export class LocalFileSystemStorage implements IAudioStorage {
  private readonly assetsDir: string;
  private uploadCount = 0;

  constructor(private readonly allowedExtensions: string[], private readonly sampleRate: number, private readonly channels: number, private readonly maxFileSize: number) {
    this.assetsDir = path.join(__dirname, '..', 'assets');
  }

  /** Ensure assets directory exists. */
  async init(): Promise<void> {
    await fs.ensureDir(this.assetsDir);
  }

  async save(buffer: Buffer, originalName: string, mimetype: string): Promise<SavedFilePayload> {
    // Validation
    if (buffer.length > this.maxFileSize) {
      throw new Error(`File exceeds max size of ${this.maxFileSize} bytes`);
    }
    await this.init();

    const timestamp = Date.now();
    const ext = path.extname(originalName).toLowerCase();

    if (!this.allowedExtensions.includes(ext)) {
      throw new Error(`Extension '${ext}' is not allowed`);
    }

    // Sanitize original filename
    const safeOriginal = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${safeOriginal}`;
    const filePath = path.join(this.assetsDir, filename);

    await fs.writeFile(filePath, buffer);

    // If MP3 uploaded, transcode to WAV for quick playback like legacy behaviour
    let finalFilename = filename;
    let finalFilePath = filePath;
    if (ext === '.mp3') {
      const wavName = filename.replace(/\.mp3$/i, '.wav');
      const wavPath = path.join(this.assetsDir, wavName);

      await execFileAsync(ffmpegPath, ['-y', '-i', filePath, '-ar', String(this.sampleRate), '-ac', String(this.channels), wavPath]);
      await fs.remove(filePath);
      finalFilename = wavName;
      finalFilePath = wavPath;
    }

    this.uploadCount++;

    const availableFiles = await this.list();

    const payload: SavedFilePayload = {
      filename: finalFilename,
      originalName,
      size: buffer.length,
      mimetype,
      filePath: path.relative(path.join(__dirname, '..'), finalFilePath).replace(/\\/g, '/'),
      timestamp,
      availableFiles
    };

    return payload;
  }

  async list(): Promise<string[]> {
    await this.init();
    const files = await fs.readdir(this.assetsDir);
    return files.filter((f) => this.allowedExtensions.includes(path.extname(f).toLowerCase()));
  }

  async listDetailed(): Promise<{ files: string[]; totalFiles: number; totalSize: number; timestamp: number }> {
    const files = await this.list();
    const sizes = await Promise.all(files.map(async (f) => (await fs.stat(path.join(this.assetsDir, f))).size));
    const totalSize = sizes.reduce((acc, s) => acc + s, 0);
    return { files, totalFiles: files.length, totalSize, timestamp: Date.now() };
  }

  async delete(filename: string): Promise<{ filename: string; deleted: boolean; remainingFiles: string[]; timestamp: number }> {
    await this.init();
    const filePath = path.join(this.assetsDir, filename);
    const ext = path.extname(filename).toLowerCase();

    if (!this.allowedExtensions.includes(ext)) {
      throw new Error(`Extension '${ext}' is not allowed`);
    }

    if (!(await fs.pathExists(filePath))) {
      throw new Error(`File '${filename}' does not exist`);
    }

    await fs.remove(filePath);
    const remainingFiles = await this.list();
    return { filename, deleted: true, remainingFiles, timestamp: Date.now() };
  }

  async metadata(filename: string): Promise<AudioFileMeta> {
    await this.init();
    const filePath = path.join(this.assetsDir, filename);

    if (!(await fs.pathExists(filePath))) {
      throw new Error(`File '${filename}' does not exist`);
    }

    const stats = await fs.stat(filePath);
    const ext = path.extname(filename).toLowerCase();

    return {
      filename,
      size: stats.size,
      format: ext.replace('.', ''),
      timestamp: Date.now()
    };
  }

  /** Only used by tests */
  public getUploadCount(): number {
    return this.uploadCount;
  }
}

export interface AudioFileMeta {
  filename: string;
  size: number;
  format: string;
  /** Optional: derived details for WAV, etc. */
  duration?: number;
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
  timestamp: number;
}

export interface SavedFilePayload {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  filePath: string;
  timestamp: number;
  /** List of all available files after save. */
  availableFiles: string[];
}

export interface IAudioStorage {
  save(buffer: Buffer, originalName: string, mimetype: string): Promise<SavedFilePayload>;
  list(): Promise<string[]>;
  listDetailed(): Promise<{ files: string[]; totalFiles: number; totalSize: number; timestamp: number }>;
  delete(filename: string): Promise<{ filename: string; deleted: boolean; remainingFiles: string[]; timestamp: number }>;
  metadata(filename: string): Promise<AudioFileMeta>;
}

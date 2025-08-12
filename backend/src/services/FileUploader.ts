import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { EventEmitter } from 'events';
import { Logger } from '../core/Logger';

export interface FileUploaderConfig {
  port: number;
  host: string;
  uploadDir: string;
  maxFileSize: number;
  moduleConfigs: Map<string, ModuleUploadConfig>;
}

export interface ModuleUploadConfig {
  allowedExtensions: string[];
  maxFileSize?: number;
  subdirectory?: string;
  customValidation?: (file: Express.Multer.File) => Promise<boolean>;
  customProcessing?: (file: Express.Multer.File, moduleType: string) => Promise<void>;
}

export interface UploadedFile {
  filename: string;
  originalName: string;
  size: number;
  timestamp: number;
  moduleType: string;
  subdirectory?: string;
}

export interface FileListResponse {
  files: string[];
  totalFiles: number;
  totalSize: number;
  moduleType?: string;
}

export class FileUploader extends EventEmitter {
  private app: express.Application;
  private server: any;
  private logger: Logger;
  private config: FileUploaderConfig;
  private uploadDir: string;
  private upload: multer.Multer;
  private fileLocks: Map<string, Promise<void>> = new Map();

  constructor(config: FileUploaderConfig, logger?: Logger) {
    super();
    this.config = config;
    this.logger = logger || Logger.getInstance();
    this.uploadDir = path.resolve(config.uploadDir);
    
    this.app = express();
    this.setupMiddleware();
    this.upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          const moduleType = req.params.moduleType;
          const moduleConfig = this.config.moduleConfigs.get(moduleType);
          const subdir = moduleConfig?.subdirectory || moduleType;
          const uploadPath = path.join(this.uploadDir, subdir);
          fs.ensureDirSync(uploadPath);
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const timestamp = Date.now();
          const ext = path.extname(file.originalname);
          const filename = `${timestamp}_${file.originalname}`;
          cb(null, filename);
        }
      }),
      limits: {
        fileSize: config.maxFileSize
      },
      fileFilter: (req, file, cb) => {
        const moduleType = req.params.moduleType;
        const moduleConfig = this.config.moduleConfigs.get(moduleType);
        
        if (!moduleConfig) {
          return cb(new Error(`Module type '${moduleType}' not configured`));
        }
        
        const ext = path.extname(file.originalname).toLowerCase();
        if (!moduleConfig.allowedExtensions.includes(ext)) {
          return cb(new Error(`File type ${ext} not allowed for module ${moduleType}. Allowed types: ${moduleConfig.allowedExtensions.join(', ')}`));
        }
        
        cb(null, true);
      }
    });
    
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS for multiple clients
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'FileUploader', timestamp: Date.now() });
    });

    // Get available modules
    this.app.get('/modules', (req, res) => {
      const modules = Array.from(this.config.moduleConfigs.keys());
      res.json({ success: true, data: { modules } });
    });

    // Get file list for all modules or specific module
    this.app.get('/files/:moduleType?', async (req, res) => {
      const moduleType = req.params.moduleType;
      
      try {
        if (moduleType) {
          // Get files for specific module
          const files = await this.getFileList(moduleType);
          res.json({ success: true, data: files });
        } else {
          // Get files for all modules
          const allFiles = await this.getAllFileList();
          res.json({ success: true, data: allFiles });
        }
      } catch (error) {
        this.logger.error('Failed to get file list:', error);
        res.status(500).json({ success: false, error: 'Failed to get file list' });
      }
    });

    // Upload file for specific module
    this.app.post('/upload/:moduleType', this.upload.single('file'), async (req, res) => {
      const moduleType = req.params.moduleType;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      try {
        // Validate module configuration
        const moduleConfig = this.config.moduleConfigs.get(moduleType);
        if (!moduleConfig) {
          return res.status(400).json({ success: false, error: `Module type '${moduleType}' not configured` });
        }

        // Create a lock for this file to prevent concurrent modifications
        const lockKey = `upload_${moduleType}_${file.filename}`;
        const uploadPromise = this.handleFileUpload(file, moduleType, moduleConfig);
        this.fileLocks.set(lockKey, uploadPromise);
        
        await uploadPromise;
        this.fileLocks.delete(lockKey);
        
        const uploadedFile: UploadedFile = {
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          timestamp: Date.now(),
          moduleType,
          subdirectory: moduleConfig.subdirectory
        };

        this.emit('fileUploaded', uploadedFile);
        this.logger.info(`File uploaded: ${file.filename} by ${moduleType}`);
        
        res.json({ success: true, data: uploadedFile });
      } catch (error) {
        this.logger.error('Upload failed:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Delete file from specific module
    this.app.delete('/files/:moduleType/:filename', async (req, res) => {
      const moduleType = req.params.moduleType;
      const filename = req.params.filename;
      
      try {
        const lockKey = `delete_${moduleType}_${filename}`;
        const deletePromise = this.deleteFile(filename, moduleType);
        this.fileLocks.set(lockKey, deletePromise);
        
        await deletePromise;
        this.fileLocks.delete(lockKey);
        
        this.emit('fileDeleted', { filename, moduleType, timestamp: Date.now() });
        this.logger.info(`File deleted: ${filename} from ${moduleType}`);
        
        res.json({ success: true, data: { filename, deleted: true } });
      } catch (error) {
        this.logger.error('Delete failed:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Get file metadata
    this.app.get('/files/:moduleType/:filename/metadata', async (req, res) => {
      const moduleType = req.params.moduleType;
      const filename = req.params.filename;
      
      try {
        const metadata = await this.getFileMetadata(filename, moduleType);
        res.json({ success: true, data: metadata });
      } catch (error) {
        this.logger.error('Failed to get metadata:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Error handling middleware
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('File upload error:', error);
      res.status(500).json({ success: false, error: error.message });
    });
  }

  private async handleFileUpload(file: Express.Multer.File, moduleType: string, moduleConfig: ModuleUploadConfig): Promise<void> {
    // Ensure upload directory exists
    const subdir = moduleConfig.subdirectory || moduleType;
    const moduleUploadDir = path.join(this.uploadDir, subdir);
    await fs.ensureDir(moduleUploadDir);
    
    // Validate file exists
    const filePath = path.join(moduleUploadDir, file.filename);
    if (!await fs.pathExists(filePath)) {
      throw new Error('Uploaded file not found');
    }

    // Run custom validation if provided
    if (moduleConfig.customValidation) {
      const isValid = await moduleConfig.customValidation(file);
      if (!isValid) {
        throw new Error('File failed custom validation');
      }
    }

    // Run custom processing if provided
    if (moduleConfig.customProcessing) {
      await moduleConfig.customProcessing(file, moduleType);
    }
    
    // Emit file list update event
    const fileList = await this.getFileList(moduleType);
    this.emit('fileListUpdated', { ...fileList, moduleType });
  }

  private async deleteFile(filename: string, moduleType: string): Promise<void> {
    const moduleConfig = this.config.moduleConfigs.get(moduleType);
    if (!moduleConfig) {
      throw new Error(`Module type '${moduleType}' not configured`);
    }

    const subdir = moduleConfig.subdirectory || moduleType;
    const moduleUploadDir = path.join(this.uploadDir, subdir);
    const filePath = path.join(moduleUploadDir, filename);
    
    if (!await fs.pathExists(filePath)) {
      throw new Error('File not found');
    }
    
    await fs.remove(filePath);
    
    // Emit file list update event
    const fileList = await this.getFileList(moduleType);
    this.emit('fileListUpdated', { ...fileList, moduleType });
  }

  private async getFileMetadata(filename: string, moduleType: string): Promise<any> {
    const moduleConfig = this.config.moduleConfigs.get(moduleType);
    if (!moduleConfig) {
      throw new Error(`Module type '${moduleType}' not configured`);
    }

    const subdir = moduleConfig.subdirectory || moduleType;
    const moduleUploadDir = path.join(this.uploadDir, subdir);
    const filePath = path.join(moduleUploadDir, filename);
    
    if (!await fs.pathExists(filePath)) {
      throw new Error('File not found');
    }
    
    const stats = await fs.stat(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    return {
      filename,
      size: stats.size,
      format: ext.replace('.', '').toUpperCase(),
      moduleType,
      timestamp: Date.now()
    };
  }

  private async getFileList(moduleType: string): Promise<FileListResponse> {
    const moduleConfig = this.config.moduleConfigs.get(moduleType);
    if (!moduleConfig) {
      throw new Error(`Module type '${moduleType}' not configured`);
    }

    const subdir = moduleConfig.subdirectory || moduleType;
    const moduleUploadDir = path.join(this.uploadDir, subdir);
    await fs.ensureDir(moduleUploadDir);
    
    const files = await fs.readdir(moduleUploadDir);
    const fileStats = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(moduleUploadDir, filename);
        const stats = await fs.stat(filePath);
        return { filename, size: stats.size };
      })
    );
    
    const totalSize = fileStats.reduce((sum, file) => sum + file.size, 0);
    
    return {
      files,
      totalFiles: files.length,
      totalSize,
      moduleType
    };
  }

  private async getAllFileList(): Promise<FileListResponse> {
    let allFiles: string[] = [];
    let totalSize = 0;
    
    for (const [moduleType] of this.config.moduleConfigs) {
      try {
        const moduleFiles = await this.getFileList(moduleType);
        allFiles = allFiles.concat(moduleFiles.files);
        totalSize += moduleFiles.totalSize;
      } catch (error) {
        this.logger.warn(`Failed to get files for module ${moduleType}:`, error);
      }
    }
    
    return {
      files: allFiles,
      totalFiles: allFiles.length,
      totalSize
    };
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          this.logger.info(`FileUploader started on http://${this.config.host}:${this.config.port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('FileUploader stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public getPort(): number {
    return this.config.port;
  }

  public getHost(): string {
    return this.config.host;
  }

  public registerModule(moduleType: string, config: ModuleUploadConfig): void {
    this.config.moduleConfigs.set(moduleType, config);
    this.logger.info(`Registered module: ${moduleType}`);
  }

  public unregisterModule(moduleType: string): void {
    this.config.moduleConfigs.delete(moduleType);
    this.logger.info(`Unregistered module: ${moduleType}`);
  }
} 
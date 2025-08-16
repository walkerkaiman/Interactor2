import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createModuleNode } from './BaseModuleNode';
import { apiService } from '../api';
import styles from './CustomNode.module.css';
import { useModuleRuntime } from '../hooks/useModuleRuntime';

interface AudioFile {
  filename: string;
  size: number;
  format: string;
  duration?: number;
}

function AudioConfig({ instance, updateConfig }: { instance: any; updateConfig: (key: string, value: any) => void }) {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(instance?.config?.selectedFile || '');
  const [volume, setVolume] = useState(instance?.config?.volume || 1.0);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAudioFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const fileList = await apiService.getAudioFiles();
      const filesWithMetadata: AudioFile[] = [];
      for (const filename of fileList.files) {
        try {
          const metadata = await apiService.getAudioFileMetadata(filename);
          filesWithMetadata.push({
            filename: metadata.filename,
            size: metadata.size,
            format: metadata.format,
            duration: metadata.duration,
          });
        } catch {
          filesWithMetadata.push({ filename, size: 0, format: 'unknown' });
        }
      }
      setFiles(filesWithMetadata);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadAudioFiles(); }, [loadAudioFiles]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);
    const progressInterval = setInterval(() => setUploadProgress(prev => Math.min(prev + 10, 90)), 100);
    try {
      const result = await apiService.uploadAudioFile(file);
      clearInterval(progressInterval);
      setUploadProgress(100);
      await loadAudioFiles();
      setSelectedFile(result.filename);
      updateConfig('selectedFile', result.filename);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setTimeout(() => { setIsUploading(false); setUploadProgress(0); }, 800);
    }
  }, [loadAudioFiles, updateConfig]);

  const handleFileDelete = useCallback(async (filename: string) => {
    await apiService.deleteAudioFile(filename);
    setFiles(prev => prev.filter(f => f.filename !== filename));
    if (selectedFile === filename) {
      setSelectedFile('');
      updateConfig('selectedFile', '');
    }
  }, [selectedFile, updateConfig]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    updateConfig('volume', newVolume);
  }, [updateConfig]);

  const handleFileSelect = useCallback((filename: string) => {
    setSelectedFile(filename);
    updateConfig('selectedFile', filename);
  }, [updateConfig]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };



  return (
    <div className={styles.audioConfig}>
      <div className={styles.uploadSection}>
        <h4>Upload Audio File</h4>
        <div className={styles.uploadZone}>
          <input ref={fileInputRef} type="file" accept=".wav,.mp3,.ogg,.m4a,.flac" onChange={handleFileUpload} disabled={isUploading} style={{ display: 'none' }} />
          <button className={styles.uploadButton} onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? `Uploading... ${uploadProgress}%` : 'Choose Audio File'}
          </button>
          {isUploading && (
            <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} /></div>
          )}
        </div>
      </div>

      <div className={styles.fileSection}>
        <h4>Select Audio File</h4>
        <div className={styles.fileSelectContainer}>
          <select value={selectedFile} onChange={(e) => handleFileSelect(e.target.value)} className={styles.fileSelect} disabled={isLoading}>
            <option value="">Select a file...</option>
            {files.map((file) => (
              <option key={file.filename} value={file.filename}>
                {file.filename} ({formatFileSize(file.size)}, {file.format})
              </option>
            ))}
          </select>
          {selectedFile && (
            <button className={styles.deleteSelectedButton} onClick={() => handleFileDelete(selectedFile)} title="Delete selected file">🗑️</button>
          )}
        </div>
        {isLoading && <div className={styles.loading}>Loading files...</div>}
      </div>

      <div className={styles.volumeSection}>
        <h4>Volume Control</h4>
        <div className={styles.volumeControl}>
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => handleVolumeChange(parseFloat(e.target.value))} className={styles.volumeSlider} />
          <span className={styles.volumeDisplay}>{Math.round(volume * 100)}%</span>
          <button className={styles.muteButton} onClick={() => handleVolumeChange(volume > 0 ? 0 : 1)}>
            {volume > 0 ? '🔊' : '🔇'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AudioActions({ instance }: { instance: any }) {
  const runtime = useModuleRuntime(instance?.id, ['isPlaying']);
  const isPlaying = !!runtime.isPlaying;

  return (
    <div className={styles.audioActions}>
      <div className={styles.playbackStatus}>
        <span className={styles.statusIndicator}>{isPlaying ? '▶️ Playing' : '⏸️ Stopped'}</span>
      </div>
    </div>
  );
}

interface AudioOutputNodeConfig {
  enablePulseAnimation: true;
  pulseAnimationDuration: 600;
  defaultConfig: { volume: number; selectedFile: string; enabled: boolean };
  instanceDataKeys: ['isPlaying', 'currentTime', 'duration', 'playCount', 'errorCount'];
  ConfigComponent?: React.ComponentType<{ instance: any; updateConfig: (key: string, value: any) => void }>;
  ActionsComponent?: React.ComponentType<{ instance: any }>;
}

const AudioOutputNodeConfig: AudioOutputNodeConfig = {
  enablePulseAnimation: true,
  pulseAnimationDuration: 600,
  defaultConfig: {
    volume: 1.0,
    selectedFile: '',
    enabled: true,
  },
  instanceDataKeys: ['isPlaying', 'currentTime', 'duration', 'playCount', 'errorCount'],
  ConfigComponent: AudioConfig,
  ActionsComponent: AudioActions,
};

const AudioOutputNode = createModuleNode(AudioOutputNodeConfig);

export default AudioOutputNode; 
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createModuleNode, BaseModuleNodeProps } from './BaseModuleNode';
import { apiService } from '../api';
import styles from './CustomNode.module.css';

interface AudioFile {
  filename: string;
  size: number;
  format: string;
  duration?: number;
}

interface AudioOutputNodeConfig {
  enablePulseAnimation: true;
  pulseAnimationDuration: 600;
  defaultConfig: {
    volume: 1.0;
    selectedFile: '';
    enabled: true;
  };
  instanceDataKeys: ['isPlaying', 'currentTime', 'duration', 'playCount', 'errorCount'];
  renderConfig: (config: any, updateConfig: (key: string, value: any) => void, instance?: any) => React.ReactNode;
  renderActions: (instance: any) => React.ReactNode;
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
  
  renderConfig: (config, updateConfig, instance) => {
    const [files, setFiles] = useState<AudioFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(config.selectedFile || '');
    const [volume, setVolume] = useState(config.volume || 1.0);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load audio files on mount
    useEffect(() => {
      if (instance?.id) {
        loadAudioFiles();
      }
    }, [instance?.id]);

    const loadAudioFiles = useCallback(async () => {
      if (!instance?.id) return;
      
      try {
        setIsLoading(true);
        const fileList = await apiService.getAudioFiles(instance.id);
        
        // Get metadata for each file
        const filesWithMetadata: AudioFile[] = [];
        for (const filename of fileList.files) {
          try {
            const metadata = await apiService.getAudioFileMetadata(instance.id, filename);
            filesWithMetadata.push({
              filename: metadata.filename,
              size: metadata.size,
              format: metadata.format,
              duration: metadata.duration,
            });
          } catch (error) {
            // If metadata fails, still include the file
            filesWithMetadata.push({
              filename,
              size: 0,
              format: 'unknown',
            });
          }
        }
        
        setFiles(filesWithMetadata);
      } catch (error) {
        console.error('Failed to load audio files:', error);
      } finally {
        setIsLoading(false);
      }
    }, [instance?.id]);

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !instance?.id) return;

      try {
        setIsUploading(true);
        setUploadProgress(0);

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 100);

        const result = await apiService.uploadAudioFile(instance.id, file);
        
        clearInterval(progressInterval);
        setUploadProgress(100);

        // Reload file list
        await loadAudioFiles();
        
        // Auto-select the uploaded file
        setSelectedFile(result.filename);
        updateConfig('selectedFile', result.filename);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 1000);

      } catch (error) {
        console.error('Upload failed:', error);
        setIsUploading(false);
        setUploadProgress(0);
      }
    }, [instance?.id, loadAudioFiles, updateConfig]);

    const handleFileDelete = useCallback(async (filename: string) => {
      if (!instance?.id) return;

      try {
        await apiService.deleteAudioFile(instance.id, filename);
        
        // Remove from local state
        setFiles(prev => prev.filter(f => f.filename !== filename));
        
        // Clear selection if deleted file was selected
        if (selectedFile === filename) {
          setSelectedFile('');
          updateConfig('selectedFile', '');
        }
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }, [instance?.id, selectedFile, updateConfig]);

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
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatDuration = (seconds?: number): string => {
      if (!seconds) return 'Unknown';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className={styles.audioConfig}>
        {/* File Upload Section */}
        <div className={styles.uploadSection}>
          <h4>Upload Audio File</h4>
          <div className={styles.uploadZone}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.ogg,.m4a,.flac"
              onChange={handleFileUpload}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
            <button
              className={styles.uploadButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? `Uploading... ${uploadProgress}%` : 'Choose Audio File'}
            </button>
            {isUploading && (
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* File Selection Section */}
        <div className={styles.fileSection}>
          <h4>Select Audio File</h4>
          <div className={styles.fileSelectContainer}>
            <select
              value={selectedFile}
              onChange={(e) => handleFileSelect(e.target.value)}
              className={styles.fileSelect}
              disabled={isLoading}
            >
              <option value="">Select a file...</option>
              {files.map((file) => (
                <option key={file.filename} value={file.filename}>
                  {file.filename} ({formatFileSize(file.size)}, {file.format})
                </option>
              ))}
            </select>
            {selectedFile && (
              <button
                className={styles.deleteSelectedButton}
                onClick={() => handleFileDelete(selectedFile)}
                title="Delete selected file"
              >
                🗑️
              </button>
            )}
          </div>
          {isLoading && <div className={styles.loading}>Loading files...</div>}
        </div>

        {/* Volume Control Section */}
        <div className={styles.volumeSection}>
          <h4>Volume Control</h4>
          <div className={styles.volumeControl}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className={styles.volumeSlider}
            />
            <span className={styles.volumeDisplay}>
              {Math.round(volume * 100)}%
            </span>
            <button
              className={styles.muteButton}
              onClick={() => handleVolumeChange(volume > 0 ? 0 : 1)}
            >
              {volume > 0 ? '🔊' : '🔇'}
            </button>
          </div>
        </div>

        {/* Waveform Section */}
        <div className={styles.waveformSection}>
          <h4>Audio Waveform</h4>
          <div className={styles.waveformContainer}>
            {selectedFile ? (
              <div className={styles.waveformPlaceholder}>
                <span>Waveform for: {selectedFile}</span>
                <small>Waveform visualization coming soon...</small>
              </div>
            ) : (
              <div className={styles.noWaveform}>
                Select an audio file to view waveform
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },

  renderActions: (instance) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Update from instance data
    useEffect(() => {
      if (instance) {
        setIsPlaying(instance.isPlaying || false);
        setCurrentTime(instance.currentTime || 0);
        setDuration(instance.duration || 0);
      }
    }, [instance]);

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className={styles.audioActions}>
        <div className={styles.playbackStatus}>
          <span className={styles.statusIndicator}>
            {isPlaying ? '▶️ Playing' : '⏸️ Stopped'}
          </span>
          {duration > 0 && (
            <span className={styles.timeDisplay}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          )}
        </div>
        {duration > 0 && (
          <div className={styles.playbackProgress}>
            <div 
              className={styles.progressBar}
              style={{ 
                width: `${(currentTime / duration) * 100}%`,
                backgroundColor: isPlaying ? '#4CAF50' : '#666'
              }}
            />
          </div>
        )}
      </div>
    );
  },
};

const AudioOutputNode = createModuleNode(AudioOutputNodeConfig);

export default AudioOutputNode; 
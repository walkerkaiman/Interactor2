import { AudioPlaybackData } from '@interactor/shared';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface IAudioPlayer {
  /**
   * Start playing the provided audio data.  Implementation may be a full
   * hardware player, a stub, or anything that fulfils the contract.
   */
  play(data: string | ArrayBuffer | AudioPlaybackData | unknown): Promise<void>;

  /** Pause if currently playing. */
  pause(): Promise<void>;

  /** Resume playback if paused. */
  resume(): Promise<void>;

  /** Stop playback and reset current time to 0. */
  stop(): Promise<void>;

  /** Current internal state. */
  getState(): PlaybackState;
}

// Module-specific type definitions
import { ModuleConfig, ModuleManifest } from './index';

// Node.js Buffer type for file handling
declare global {
  interface Buffer extends Uint8Array {
    toString(encoding?: string): string;
  }
  var Buffer: {
    new (str: string, encoding?: string): Buffer;
    new (size: number): Buffer;
    new (array: Uint8Array): Buffer;
    from(arrayBuffer: ArrayBuffer): Buffer;
    from(array: Uint8Array): Buffer;
    from(str: string, encoding?: string): Buffer;
    alloc(size: number): Buffer;
    allocUnsafe(size: number): Buffer;
  };
}

// ============================================================================
// INPUT MODULE TYPES
// ============================================================================

// OSC Input Module
/**
 * Configuration for OSC input module
 * @interface OscInputConfig
 * @extends {ModuleConfig}
 */
export interface OscInputConfig extends ModuleConfig {
  /** UDP port to listen for OSC messages (1024-65535) */
  port: number;
  /** Host address to bind to (e.g., '0.0.0.0', 'localhost') */
  host: string;
  /** OSC address pattern to match (e.g., '/trigger/*') */
  addressPattern: string;
  /** Enable/disable the OSC listener */
  enabled: boolean;
}

/**
 * Represents an OSC message received by the input module
 * @interface OscMessage
 */
export interface OscMessage {
  /** OSC address (e.g., '/trigger/button1') */
  address: string;
  /** OSC message arguments */
  args: any[];
  /** Timestamp when message was received */
  timestamp: number;
}

/**
 * Payload for OSC trigger events
 * @interface OscTriggerPayload
 */
export interface OscTriggerPayload {
  /** OSC address that triggered the event */
  address: string;
  /** OSC message arguments - kept for debugging/logging purposes */
  args: any[];
  /** Timestamp when message was received */
  timestamp: number;
  /** Total number of messages received since module start */
  messageCount: number;
}

/**
 * Payload for OSC streaming events
 * @interface OscStreamPayload
 */
export interface OscStreamPayload {
  /** OSC address that triggered the event */
  address: string;
  /** Numeric value extracted from first argument - always a number for streaming */
  value: number;
  /** OSC message arguments - kept for debugging/logging purposes */
  args: any[];
  /** Timestamp when message was received */
  timestamp: number;
}

// HTTP Input Module
/**
 * Configuration for HTTP input module
 * @interface HttpInputConfig
 * @extends {ModuleConfig}
 */
export interface HttpInputConfig extends ModuleConfig {
  /** HTTP server port to listen on (1024-65535) */
  port: number;
  /** Host address to bind to */
  host: string;
  /** HTTP endpoint to listen on (e.g., '/webhook') */
  endpoint: string;
  /** HTTP methods to accept (e.g., ['POST', 'GET']) */
  methods: string[];
  /** Enable/disable the HTTP server */
  enabled: boolean;
  /** Maximum requests per minute */
  rateLimit: number;
  /** Expected content type for requests */
  contentType: string;
}

/**
 * Represents HTTP request data received by the input module
 * @interface HttpRequestData
 */
export interface HttpRequestData {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Request URL */
  url: string;
  /** HTTP headers */
  headers: Record<string, string>;
  /** Request body */
  body: any;
  /** Query parameters */
  query: Record<string, string>;
  /** Timestamp when request was received */
  timestamp: number;
  /** Unique request identifier */
  requestId: string;
  /** Remaining rate limit requests */
  rateLimitRemaining: number;
}

/**
 * Payload for HTTP trigger events
 * @interface HttpTriggerPayload
 */
export interface HttpTriggerPayload {
  /** HTTP method */
  method: string;
  /** Request URL */
  url: string;
  /** HTTP headers */
  headers: Record<string, string>;
  /** Request body */
  body: any;
  /** Query parameters */
  query: Record<string, string>;
  /** Timestamp when request was received */
  timestamp: number;
  /** Unique request identifier */
  requestId: string;
  /** Remaining rate limit requests */
  rateLimitRemaining: number;
  /** Total number of requests received since module start */
  requestCount: number;
}

/**
 * Payload for HTTP streaming events
 * @interface HttpStreamPayload
 */
export interface HttpStreamPayload {
  /** Numeric value extracted from request - always a number for streaming */
  value: number;
  /** HTTP method */
  method: string;
  /** Request URL */
  url: string;
  /** Request data */
  data: any;
  /** Timestamp when request was received */
  timestamp: number;
  /** Remaining rate limit requests */
  rateLimitRemaining: number;
}

// Serial Input Module
/**
 * Configuration for serial input module
 * @interface SerialInputConfig
 * @extends {ModuleConfig}
 */
export interface SerialInputConfig extends ModuleConfig {
  /** Serial port name (e.g., 'COM1', '/dev/ttyUSB0') */
  port: string;
  /** Baud rate for serial communication */
  baudRate: number;
  /** Logic operator for threshold comparison */
  logicOperator: '>' | '<' | '=';
  /** Threshold value for triggering events */
  threshold: number;
  /** Enable/disable the serial listener */
  enabled: boolean;
}

/**
 * Represents serial data received by the input module
 * @interface SerialData
 */
export interface SerialData {
  /** Numeric value extracted from serial data */
  value: number;
  /** Raw serial data string */
  rawData: string;
  /** Timestamp when data was received */
  timestamp: number;
}

/**
 * Payload for serial trigger events
 * @interface SerialTriggerPayload
 */
export interface SerialTriggerPayload {
  /** Raw serial data string */
  rawData: string;
  /** Threshold value for comparison */
  threshold: number;
  /** Logic operator used for comparison */
  operator: '>' | '<' | '=';
  /** Timestamp when data was received */
  timestamp: number;
  /** Total number of data points received since module start */
  dataCount: number;
}

/**
 * Payload for serial streaming events
 * @interface SerialStreamPayload
 */
export interface SerialStreamPayload {
  /** Numeric value extracted from serial data - always a number for streaming */
  value: number;
  /** Raw serial data string */
  rawData: string;
  /** Threshold value for comparison */
  threshold: number;
  /** Logic operator used for comparison */
  operator: '>' | '<' | '=';
  /** Timestamp when data was received */
  timestamp: number;
}

// Time Input Module
/**
 * Configuration for time input module
 * @interface TimeInputConfig
 * @extends {ModuleConfig}
 */
export interface TimeInputConfig extends ModuleConfig {
  /** Operating mode */
  mode?: 'clock' | 'metronome';
  /** Target time in 12-hour format (e.g., 2:30 PM) - Clock mode only */
  targetTime?: string;
  /** Delay between pulses in milliseconds - Metronome mode only */
  millisecondDelay?: number;
  /** Enable/disable the time trigger */
  enabled?: boolean;
  /** Enable WebSocket API for external time sources */
  apiEnabled?: boolean;
  /** WebSocket endpoint for external time API */
  apiEndpoint?: string;
}

/**
 * Payload for time trigger events
 * @interface TimeTriggerPayload
 */
export interface TimeTriggerPayload {
  /** Operating mode */
  mode: 'clock' | 'metronome';
  /** Target time in HH:MM format - Clock mode only */
  targetTime?: string;
  /** Delay between pulses in milliseconds - Metronome mode only */
  millisecondDelay?: number;
  /** Current time in HH:MM format */
  currentTime: string;
  /** Timestamp when trigger occurred */
  timestamp: number;
  /** Whether this was a manual trigger */
  manual?: boolean;
}

/**
 * State information for time module
 * @interface TimeState
 */
export interface TimeState {
  /** Operating mode */
  mode: 'clock' | 'metronome';
  /** Current time in HH:MM format */
  currentTime: string;
  /** Countdown string (e.g., "2h 30m") */
  countdown: string;
  /** Target time in 12-hour format for display - Clock mode only */
  targetTime12Hour: string;
  /** Delay between pulses in milliseconds - Metronome mode only */
  millisecondDelay: number;
  /** Whether module is enabled */
  enabled: boolean;
}

// Frames Input Module
/**
 * Configuration for frames input module
 * @interface FramesInputConfig
 * @extends {ModuleConfig}
 */
export interface FramesInputConfig extends ModuleConfig {
  /** DMX universe number */
  universe: number;
  /** Enable/disable the frames listener */
  enabled: boolean;
}

/**
 * Represents frame data received by the input module
 * @interface FrameData
 */
export interface FrameData {
  /** Frame number */
  frameNumber: number;
  /** Most significant byte */
  msb: number;
  /** Least significant byte */
  lsb: number;
  /** Timestamp when frame was received */
  timestamp: number;
}

/**
 * Payload for frame trigger events
 * @interface FrameTriggerPayload
 */
export interface FrameTriggerPayload {
  /** Frame number */
  frameNumber: number;
  /** Most significant byte */
  msb: number;
  /** Least significant byte */
  lsb: number;
  /** Timestamp when frame was received */
  timestamp: number;
  /** Total number of frames received since module start */
  frameCount: number;
}

/**
 * Payload for frame streaming events
 * @interface FrameStreamPayload
 */
export interface FrameStreamPayload {
  /** Frame number */
  frameNumber: number;
  /** Most significant byte */
  msb: number;
  /** Least significant byte */
  lsb: number;
  /** Timestamp when frame was received */
  timestamp: number;
}

// ============================================================================
// OUTPUT MODULE TYPES
// ============================================================================

// OSC Output Module
/**
 * Configuration for OSC output module
 * @interface OscOutputConfig
 * @extends {ModuleConfig}
 */
export interface OscOutputConfig extends ModuleConfig {
  /** Target host address for OSC messages */
  host: string;
  /** Target UDP port for OSC messages (1024-65535) */
  port: number;
  /** Default OSC address pattern to send to */
  addressPattern: string;
  /** Enable/disable the module */
  enabled?: boolean;
}

/**
 * Represents an OSC message sent by the output module
 * @interface OscOutputMessage
 */
export interface OscOutputMessage {
  /** OSC address (e.g., '/trigger/button1') */
  address: string;
  /** OSC message arguments */
  args: any[];
  /** Timestamp when message was sent */
  timestamp: number;
}

/**
 * Payload for OSC output events
 * @interface OscOutputPayload
 */
export interface OscOutputPayload {
  /** OSC address that was sent */
  address: string;
  /** OSC message arguments */
  args: any[];
  /** Timestamp when message was sent */
  timestamp: number;
  /** Total number of messages sent since module start */
  messageCount: number;
}

/**
 * Error data for OSC output failures
 * @interface OscOutputErrorData
 */
export interface OscOutputErrorData {
  /** Target host */
  host: string;
  /** Target port */
  port: number;
  /** OSC address that failed to send */
  address: string;
  /** Error message */
  error: string;
  /** Timestamp when error occurred */
  timestamp: number;
}

// HTTP Output Module
/**
 * Configuration for HTTP output module
 * @interface HttpOutputConfig
 * @extends {ModuleConfig}
 */
export interface HttpOutputConfig extends ModuleConfig {
  /** Target URL for HTTP requests */
  url: string;
  /** HTTP method to use */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Additional HTTP headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable/disable the module */
  enabled?: boolean;
}

/**
 * Represents HTTP request data for output module
 * @interface HttpOutputRequestData
 */
export interface HttpOutputRequestData {
  /** Target URL */
  url: string;
  /** HTTP method used */
  method: string;
  /** HTTP response status code */
  status: number;
  /** HTTP response body */
  response: string;
  /** Timestamp when request was made */
  timestamp: number;
}

/**
 * Represents HTTP error data for output module
 * @interface HttpErrorData
 */
export interface HttpErrorData {
  /** Target URL */
  url: string;
  /** HTTP method used */
  method: string;
  /** Error message */
  error: string;
  /** Timestamp when error occurred */
  timestamp: number;
}

/**
 * Payload for HTTP response events
 * @interface HttpResponsePayload
 */
export interface HttpResponsePayload {
  /** Target URL */
  url: string;
  /** HTTP method used */
  method: string;
  /** HTTP response status code */
  status: number;
  /** HTTP response body */
  response: string;
  /** Timestamp when response was received */
  timestamp: number;
}

/**
 * Payload for HTTP error events
 * @interface HttpErrorPayload
 */
export interface HttpErrorPayload {
  /** Target URL */
  url: string;
  /** HTTP method used */
  method: string;
  /** Error message */
  error: string;
  /** Timestamp when error occurred */
  timestamp: number;
}

// ============================================================================
// MODULE STATE TYPES
// ============================================================================

/**
 * State information for OSC module
 * @interface OscModuleState
 */
export interface OscModuleState {
  /** Current module status */
  status: 'listening' | 'stopped' | 'error';
  /** UDP port being listened on */
  port: number;
  /** Host address bound to */
  host: string;
  /** OSC address pattern being matched */
  addressPattern: string;
  /** Last OSC message received */
  lastMessage?: OscMessage;
  /** Total number of messages received */
  messageCount: number;
  /** Current input mode (trigger/streaming) */
  mode: string;
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * State information for HTTP input module
 * @interface HttpInputModuleState
 */
export interface HttpInputModuleState {
  /** Current module status */
  status: 'listening' | 'stopped' | 'error';
  /** HTTP server port */
  port: number;
  /** Host address bound to */
  host: string;
  /** HTTP endpoint being listened on */
  endpoint: string;
  /** Current numeric value from last request */
  currentValue: number | null;
  /** Total number of requests received */
  requestCount: number;
  /** Rate limit configuration */
  rateLimit: number;
  /** Remaining rate limit requests */
  rateLimitRemaining: number;
  /** Current input mode (trigger/streaming) */
  mode: string;
  /** Timestamp of last update */
  lastUpdate: number;
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * State information for serial module
 * @interface SerialModuleState
 */
export interface SerialModuleState {
  /** Current module status */
  status: 'listening' | 'stopped' | 'error';
  /** Serial port name */
  port: string;
  /** Baud rate */
  baudRate: number;
  /** Current numeric value from last data */
  currentValue: number;
  /** Threshold value for comparison */
  threshold: number;
  /** Logic operator for comparison */
  operator: '>' | '<' | '=';
  /** Total number of data points received */
  dataCount: number;
  /** Current input mode (trigger/streaming) */
  mode: string;
  /** Timestamp of last update */
  lastUpdate: number;
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * State information for time module
 * @interface TimeModuleState
 */
export interface TimeModuleState {
  /** Current time in HH:MM format */
  currentTime: string;
  /** Countdown string */
  countdown: string;
  /** Target time in 12-hour format */
  targetTime12Hour: string;
  /** Whether module is enabled */
  enabled: boolean;
}

/**
 * State information for frames module
 * @interface FramesModuleState
 */
export interface FramesModuleState {
  /** Current module status */
  status: 'listening' | 'stopped' | 'error';
  /** DMX universe number */
  universe: number;
  /** Current frame number */
  currentFrame: number;
  /** Total number of frames received */
  frameCount: number;
  /** Current input mode (trigger/streaming) */
  mode: string;
  /** Timestamp of last update */
  lastUpdate: number;
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * State information for HTTP output module
 * @interface HttpOutputModuleState
 */
export interface HttpOutputModuleState {
  /** Target URL */
  url: string;
  /** HTTP method */
  method: string;
  /** Whether module is enabled */
  enabled: boolean;
  /** Whether module is connected/ready */
  isConnected: boolean;
  /** Last HTTP request made */
  lastRequest?: HttpOutputRequestData;
  /** Last HTTP error encountered */
  lastError?: HttpErrorData;
  /** Total number of requests made */
  requestCount: number;
  /** Total number of errors encountered */
  errorCount: number;
  /** Current module status */
  status: 'ready' | 'stopped' | 'error';
}

// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * Generic module state update
 * @interface ModuleStateUpdate
 */
export interface ModuleStateUpdate {
  /** Status string */
  status: string;
  /** Additional state properties */
  [key: string]: any;
}

/**
 * Generic trigger event
 * @interface TriggerEvent
 */
export interface TriggerEvent {
  /** Event type */
  type: 'trigger';
  /** Event payload - generic since trigger events just call functions */
  payload: any;
  /** Timestamp when event occurred */
  timestamp: number;
  /** Source module name */
  source: string;
}

/**
 * Generic stream event
 * @interface StreamEvent
 */
export interface StreamEvent {
  /** Event type */
  type: 'stream';
  /** Streamed value - always a number for streaming events */
  value: number;
  /** Timestamp when event occurred */
  timestamp: number;
  /** Source module name */
  source: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Generic error event
 * @interface ErrorEvent
 */
export interface ErrorEvent {
  /** Event type */
  type: 'error';
  /** Error message */
  error: string;
  /** Timestamp when error occurred */
  timestamp: number;
  /** Source module name */
  source: string;
  /** Additional error details */
  details?: any;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Result of configuration validation
 * @interface ConfigValidationResult
 */
export interface ConfigValidationResult {
  /** Whether configuration is valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
}

/**
 * Result of module validation
 * @interface ModuleValidationResult
 */
export interface ModuleValidationResult {
  /** Configuration validation result */
  config: ConfigValidationResult;
  /** Whether manifest is valid */
  manifest: boolean;
  /** List of required dependencies */
  dependencies: string[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Type alias for module configuration types
 * @template T - Module configuration type
 */
export type ModuleConfigType<T extends ModuleConfig> = T;

/**
 * Type alias for module state types
 * @template T - Module state type
 */
export type ModuleStateType<T> = T;

/**
 * Type alias for event payload types
 * @template T - Event payload type
 */
export type EventPayloadType<T> = T;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a ModuleConfig is an OscInputConfig
 * @param config - Module configuration to check
 * @returns True if config is OscInputConfig
 */
export function isOscConfig(config: ModuleConfig): config is OscInputConfig {
  return 'port' in config && 'host' in config && 'addressPattern' in config;
}

/**
 * Type guard to check if a ModuleConfig is an HttpInputConfig
 * @param config - Module configuration to check
 * @returns True if config is HttpInputConfig
 */
export function isHttpInputConfig(config: ModuleConfig): config is HttpInputConfig {
  return 'port' in config && 'endpoint' in config && 'methods' in config;
}

/**
 * Type guard to check if a ModuleConfig is a SerialInputConfig
 * @param config - Module configuration to check
 * @returns True if config is SerialInputConfig
 */
export function isSerialConfig(config: ModuleConfig): config is SerialInputConfig {
  return 'port' in config && 'baudRate' in config && 'logicOperator' in config;
}

/**
 * Type guard to check if a ModuleConfig is a TimeInputConfig
 * @param config - Module configuration to check
 * @returns True if config is TimeInputConfig
 */
export function isTimeConfig(config: ModuleConfig): config is TimeInputConfig {
  return 'targetTime' in config;
}

/**
 * Type guard to check if a ModuleConfig is a FramesInputConfig
 * @param config - Module configuration to check
 * @returns True if config is FramesInputConfig
 */
export function isFramesConfig(config: ModuleConfig): config is FramesInputConfig {
  return 'universe' in config;
}

/**
 * Type guard to check if a ModuleConfig is an OscOutputConfig
 * @param config - Module configuration to check
 * @returns True if config is OscOutputConfig
 */
export function isOscOutputConfig(config: ModuleConfig): config is OscOutputConfig {
  return 'host' in config && 'port' in config && 'addressPattern' in config;
}

/**
 * Type guard to check if a ModuleConfig is an HttpOutputConfig
 * @param config - Module configuration to check
 * @returns True if config is HttpOutputConfig
 */
export function isHttpOutputConfig(config: ModuleConfig): config is HttpOutputConfig {
  return 'url' in config && 'method' in config;
}

// ============================================================================
// DMX OUTPUT MODULE TYPES
// ============================================================================

/**
 * Configuration for DMX output module
 * @interface DmxOutputConfig
 * @extends {ModuleConfig}
 */
export interface DmxOutputConfig extends ModuleConfig {
  /** DMX universe number (1-512) */
  universe: number;
  /** Brightness level (0.0-1.0) */
  brightness: number;
  /** DMX protocol configuration */
  protocol: {
    /** Protocol type ('artnet', 'sACN', 'dmx512') */
    type: 'artnet' | 'sACN' | 'dmx512';
    /** Target IP address for network protocols */
    host?: string;
    /** Target port for network protocols */
    port?: number;
    /** Serial port for DMX512 */
    serialPort?: string;
    /** Baud rate for serial communication */
    baudRate?: number;
  };
  /** Enable/disable the DMX output */
  enabled: boolean;
  /** Enable/disable file upload server */
  enableFileUpload?: boolean;
  /** File upload server port */
  uploadPort?: number;
  /** File upload server host */
  uploadHost?: string;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Allowed file extensions */
  allowedExtensions?: string[];
}

/**
 * DMX frame data
 * @interface DmxFrame
 */
export interface DmxFrame {
  /** Frame number */
  frameNumber: number;
  /** DMX channel values (0-255) */
  channels: number[];
  /** Timestamp when frame was created */
  timestamp: number;
}

/**
 * DMX output data
 * @interface DmxOutputData
 */
export interface DmxOutputData {
  /** DMX universe number */
  universe: number;
  /** DMX channel values (0-255) */
  channels: number[];
  /** Brightness multiplier (0.0-1.0) */
  brightness: number;
  /** Timestamp when data was sent */
  timestamp: number;
}

/**
 * Payload for DMX output events
 * @interface DmxOutputPayload
 */
export interface DmxOutputPayload {
  /** DMX universe number */
  universe: number;
  /** DMX channel values (0-255) */
  channels: number[];
  /** Brightness multiplier (0.0-1.0) */
  brightness: number;
  /** Current frame number */
  frameNumber: number;
  /** Total number of frames in sequence */
  totalFrames: number;
  /** Timestamp when event occurred */
  timestamp: number;
  /** Total number of frames sent */
  frameCount: number;
}

/**
 * DMX error data
 * @interface DmxErrorData
 */
export interface DmxErrorData {
  /** DMX universe number */
  universe: number;
  /** Error message */
  error: string;
  /** Error context */
  context: string;
  /** Timestamp when error occurred */
  timestamp: number;
}

/**
 * DMX file upload data
 * @interface DmxFileUploadData
 */
export interface DmxFileUploadData {
  /** Original filename */
  originalName: string;
  /** File size in bytes */
  size: number;
  /** File mimetype */
  mimetype: string;
  /** File buffer */
  buffer: Buffer;
  /** Timestamp when file was uploaded */
  timestamp: number;
}

/**
 * DMX file upload payload
 * @interface DmxFileUploadPayload
 */
export interface DmxFileUploadPayload {
  /** Saved filename */
  filename: string;
  /** Original filename */
  originalName: string;
  /** File size in bytes */
  size: number;
  /** File mimetype */
  mimetype: string;
  /** File path relative to assets folder */
  filePath: string;
  /** Number of frames in the sequence */
  frameCount: number;
  /** Number of channels per frame */
  channelCount: number;
  /** Timestamp when file was uploaded */
  timestamp: number;
  /** List of all available DMX files */
  availableFiles: string[];
}

/**
 * State information for DMX output module
 * @interface DmxOutputModuleState
 */
export interface DmxOutputModuleState {
  /** Current module status */
  status: 'ready' | 'playing' | 'stopped' | 'error';
  /** DMX universe number */
  universe: number;
  /** Current brightness level */
  brightness: number;
  /** Protocol configuration */
  protocol: {
    type: string;
    host?: string;
    port?: number;
    serialPort?: string;
    baudRate?: number;
  };
  /** Whether module is enabled */
  enabled: boolean;
  /** Whether module is connected/ready */
  isConnected: boolean;
  /** Current frame number */
  currentFrame: number;
  /** Total number of frames in sequence */
  totalFrames: number;
  /** Whether sequence is playing */
  isPlaying: boolean;
  /** Total number of frames sent */
  frameCount: number;
  /** Total number of errors encountered */
  errorCount: number;
  /** Last error encountered */
  lastError?: DmxErrorData;
  /** Timestamp of last update */
  lastUpdate: number;
  /** File upload server enabled */
  fileUploadEnabled?: boolean;
  /** File upload server port */
  uploadPort?: number;
  /** Number of files uploaded */
  uploadCount?: number;
  /** Last file uploaded */
  lastUpload?: DmxFileUploadPayload;
}

/**
 * Type guard for DMX output configuration
 * @param config - Configuration object to check
 * @returns True if config is valid DmxOutputConfig
 */
export function isDmxOutputConfig(config: ModuleConfig): config is DmxOutputConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'universe' in config &&
    'brightness' in config &&
    'protocol' in config &&
    'enabled' in config &&
    typeof (config as DmxOutputConfig).universe === 'number' &&
    typeof (config as DmxOutputConfig).brightness === 'number' &&
    typeof (config as DmxOutputConfig).protocol === 'object' &&
    typeof (config as DmxOutputConfig).enabled === 'boolean'
  );
}

// ============================================================================
// AUDIO OUTPUT MODULE TYPES
// ============================================================================

/**
 * Configuration for audio output module
 * @interface AudioOutputConfig
 * @extends {ModuleConfig}
 */
export interface AudioOutputConfig extends ModuleConfig {
  /** Audio device name or ID */
  deviceId?: string;
  /** Sample rate in Hz (8000-48000) */
  sampleRate: number;
  /** Number of audio channels (1-2) */
  channels: number;
  /** Audio format ('wav', 'mp3', 'ogg') */
  format: 'wav' | 'mp3' | 'ogg';
  /** Volume level (0.0-1.0) */
  volume: number;
  /** Enable/disable the audio output */
  enabled: boolean;
  /** Audio buffer size in samples */
  bufferSize: number;
  /** Whether to loop audio playback */
  loop: boolean;
  /** Fade in duration in milliseconds */
  fadeInDuration: number;
  /** Fade out duration in milliseconds */
  fadeOutDuration: number;
  /** Enable/disable file upload server */
  enableFileUpload?: boolean;
  /** File upload server port */
  uploadPort?: number;
  /** File upload server host */
  uploadHost?: string;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Allowed audio file extensions */
  allowedExtensions?: string[];
}

/**
 * Audio playback data
 * @interface AudioPlaybackData
 */
export interface AudioPlaybackData {
  /** Audio data (buffer, file path, or URL) */
  audioData: string | Buffer | ArrayBuffer;
  /** Playback volume (0.0-1.0) */
  volume?: number;
  /** Whether to loop playback */
  loop?: boolean;
  /** Fade in duration in milliseconds */
  fadeInDuration?: number;
  /** Fade out duration in milliseconds */
  fadeOutDuration?: number;
  /** Timestamp when playback started */
  timestamp: number;
}

/**
 * Payload for audio output events
 * @interface AudioOutputPayload
 */
export interface AudioOutputPayload {
  /** Audio device ID */
  deviceId: string;
  /** Sample rate used */
  sampleRate: number;
  /** Number of channels */
  channels: number;
  /** Audio format */
  format: string;
  /** Current volume level */
  volume: number;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Timestamp when event occurred */
  timestamp: number;
  /** Total number of audio files played */
  playCount: number;
}

/**
 * Audio error data
 * @interface AudioErrorData
 */
export interface AudioErrorData {
  /** Audio device ID */
  deviceId: string;
  /** Error message */
  error: string;
  /** Error context */
  context: string;
  /** Timestamp when error occurred */
  timestamp: number;
}

/**
 * Audio error payload
 * @interface AudioErrorPayload
 */
export interface AudioErrorPayload {
  /** Audio device ID */
  deviceId: string;
  /** Error message */
  error: string;
  /** Error context */
  context: string;
  /** Timestamp when error occurred */
  timestamp: number;
}

/**
 * Audio file upload data
 * @interface AudioFileUploadData
 */
export interface AudioFileUploadData {
  /** Original filename */
  originalName: string;
  /** File size in bytes */
  size: number;
  /** File mimetype */
  mimetype: string;
  /** File buffer */
  buffer: Buffer;
  /** Timestamp when file was uploaded */
  timestamp: number;
}

/**
 * Audio file upload payload
 * @interface AudioFileUploadPayload
 */
export interface AudioFileUploadPayload {
  /** Saved filename */
  filename: string;
  /** Original filename */
  originalName: string;
  /** File size in bytes */
  size: number;
  /** File mimetype */
  mimetype: string;
  /** File path relative to assets folder */
  filePath: string;
  /** Timestamp when file was uploaded */
  timestamp: number;
  /** List of all available audio files */
  availableFiles: string[];
}

/**
 * Audio file list payload
 * @interface AudioFileListPayload
 */
export interface AudioFileListPayload {
  /** List of available audio files */
  files: string[];
  /** Total number of files */
  totalFiles: number;
  /** Total size of all files in bytes */
  totalSize: number;
  /** Timestamp when list was generated */
  timestamp: number;
}

/**
 * Audio file deletion payload
 * @interface AudioFileDeletePayload
 */
export interface AudioFileDeletePayload {
  /** Filename that was deleted */
  filename: string;
  /** Whether deletion was successful */
  deleted: boolean;
  /** Timestamp when file was deleted */
  timestamp: number;
  /** List of remaining files */
  remainingFiles: string[];
}

/**
 * Audio file metadata payload
 * @interface AudioFileMetadataPayload
 */
export interface AudioFileMetadataPayload {
  /** Filename */
  filename: string;
  /** File size in bytes */
  size: number;
  /** Audio format (WAV, MP3, etc.) */
  format: string;
  /** Audio duration in seconds (if available) */
  duration?: number;
  /** Sample rate in Hz (if available) */
  sampleRate?: number;
  /** Number of channels (if available) */
  channels?: number;
  /** Bit rate in kbps (if available) */
  bitRate?: number;
  /** Timestamp when metadata was retrieved */
  timestamp: number;
}

/**
 * State information for audio output module
 * @interface AudioOutputModuleState
 */
export interface AudioOutputModuleState {
  /** Current module status */
  status: 'ready' | 'playing' | 'stopped' | 'error';
  /** Audio device ID */
  deviceId: string;
  /** Sample rate */
  sampleRate: number;
  /** Number of channels */
  channels: number;
  /** Audio format */
  format: string;
  /** Current volume level */
  volume: number;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Whether audio is looping */
  loop: boolean;
  /** Total number of audio files played */
  playCount: number;
  /** Total number of errors encountered */
  errorCount: number;
  /** Last error encountered */
  lastError?: AudioErrorData;
  /** Timestamp of last update */
  lastUpdate: number;
  /** File upload server enabled */
  fileUploadEnabled?: boolean;
  /** File upload server port */
  uploadPort?: number;
  /** Number of files uploaded */
  uploadCount?: number;
  /** Last file uploaded */
  lastUpload?: AudioFileUploadPayload;
}

/**
 * Type guard for audio output configuration
 * @param config - Configuration object to check
 * @returns True if config is valid AudioOutputConfig
 */
export function isAudioOutputConfig(config: ModuleConfig): config is AudioOutputConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'sampleRate' in config &&
    'channels' in config &&
    'format' in config &&
    'volume' in config &&
    'enabled' in config &&
    'bufferSize' in config &&
    'loop' in config &&
    'fadeInDuration' in config &&
    'fadeOutDuration' in config &&
    typeof (config as AudioOutputConfig).sampleRate === 'number' &&
    typeof (config as AudioOutputConfig).channels === 'number' &&
    typeof (config as AudioOutputConfig).format === 'string' &&
    typeof (config as AudioOutputConfig).volume === 'number' &&
    typeof (config as AudioOutputConfig).enabled === 'boolean' &&
    typeof (config as AudioOutputConfig).bufferSize === 'number' &&
    typeof (config as AudioOutputConfig).loop === 'boolean' &&
    typeof (config as AudioOutputConfig).fadeInDuration === 'number' &&
    typeof (config as AudioOutputConfig).fadeOutDuration === 'number'
  );
} 
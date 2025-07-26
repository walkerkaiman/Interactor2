# HTTP Output Module

## Overview

The HTTP Output module sends HTTP requests to external endpoints. It can be triggered by input modules or used for manual testing. The module supports all common HTTP methods, custom headers, timeout configuration, and comprehensive error handling.

### Quick Guide for Artists

- Drag “HTTP Output” onto the canvas.
- Paste the **URL** you want to call and select the HTTP method.
- Add headers or change timeout if needed.
- Wire any event to this module – each event will send an HTTP request with the payload as JSON.

### Developer Deep Dive

Path: `backend/src/modules/output/http_output/`

| Component | Purpose |
|-----------|---------|
| Networking | Uses `fetch` (with `AbortController`) to perform requests and enforce timeouts. |
| `buildRequestOptions()` | Merges default & custom headers before every request. |
| Metrics | Tracks `requestCount`, `errorCount`, `lastStatus` and publishes via `stateUpdate`. |

Add retry logic or authentication headers by modifying `sendRequest()`.

---

## Features

- **Multiple HTTP Methods**: Support for GET, POST, PUT, and DELETE requests
- **Custom Headers**: Add authentication tokens, API keys, and custom headers
- **Timeout Control**: Configurable request timeout with automatic cancellation
- **Error Handling**: Comprehensive error logging and status reporting
- **State Management**: Track request/error counts and last request/error details
- **Manual Testing**: Built-in test functionality for connection verification
- **Enable/Disable**: Toggle module functionality without reconfiguration

## Configuration

### Parameters

- **url** (string, required): The target URL for HTTP requests
  - Must be a valid HTTP or HTTPS URL
  - Pattern: `^https?://.+`
  - UI Type: URL input field

- **method** (string, optional): HTTP method to use
  - Options: `GET`, `POST`, `PUT`, `DELETE`
  - Default: `POST`
  - UI Type: Dropdown select

- **headers** (object, optional): Additional HTTP headers to include
  - Default: `{}`
  - Content-Type is automatically set to `application/json`
  - UI Type: Key-value editor

- **timeout** (number, optional): Request timeout in milliseconds
  - Range: 1000-30000ms
  - Default: `5000`
  - UI Type: Number input

- **enabled** (boolean, optional): Enable/disable the module
  - Default: `true`
  - UI Type: Toggle switch

### Example Configuration

```json
{
  "url": "https://api.example.com/webhook",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer your-token",
    "X-Custom-Header": "value"
  },
  "timeout": 10000,
  "enabled": true
}
```

## Events

### Input Events

- **httpRequest**: Triggers an HTTP request to the configured endpoint
  - Payload: Any data to send in the request body (for non-GET requests)

### Output Events

- **httpResponse**: Emitted when an HTTP request is completed successfully
  - Payload:
    ```json
    {
      "url": "https://api.example.com/webhook",
      "method": "POST",
      "status": 200,
      "response": "Response body content",
      "timestamp": 1705333500000
    }
    ```

- **httpError**: Emitted when an HTTP request fails
  - Payload:
    ```json
    {
      "url": "https://api.example.com/webhook",
      "method": "POST",
      "error": "HTTP 404: Not Found",
      "timestamp": 1705333500000
    }
    ```

- **stateUpdate**: Emitted when module state changes
  - Payload: Current module state including connection status and statistics

## Usage Examples

### Basic Webhook

Send data to a webhook endpoint:

```json
{
  "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
  "method": "POST"
}
```

### GET Request

Make a GET request to an API:

```json
{
  "url": "https://api.weather.com/current",
  "method": "GET",
  "timeout": 5000
}
```

### Authenticated Request

Send requests with authentication:

```json
{
  "url": "https://api.example.com/data",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer your-api-token",
    "X-API-Key": "your-api-key"
  }
}
```

### Disabled Module

Configure a module but keep it disabled:

```json
{
  "url": "https://api.example.com/webhook",
  "method": "POST",
  "enabled": false
}
```

## Behavior

- **Automatic Content-Type**: Sets Content-Type to `application/json` for non-GET requests
- **Request Body**: Sends request body as JSON for POST, PUT, and DELETE methods
- **Timeout Handling**: Implements request timeout with automatic cancellation using AbortController
- **Error Recovery**: Failed requests don't prevent subsequent requests
- **State Tracking**: Maintains request/error counts and last request/error details
- **Disabled State**: When disabled, ignores all incoming events and requests
- **Manual Testing**: Provides test functionality for connection verification

## Integration

This module can be connected to:
- **Time Input module**: For scheduled API calls
- **HTTP Input module**: For webhook-to-webhook forwarding
- **OSC Input module**: For sending OSC data via HTTP
- **Serial Input module**: For sending serial data to web services
- **Frames Input module**: For sending frame data to external systems
- **Other input modules**: For event-driven HTTP requests

## Error Handling

- **Network Errors**: Logged and emitted as error events
- **Timeout Errors**: Trigger automatic request cancellation
- **HTTP Error Status**: 4xx and 5xx status codes are treated as errors
- **Invalid URLs**: Validation during initialization and configuration updates
- **Disabled Module**: Gracefully ignores requests when disabled

## State Management

The module tracks:
- **Request Count**: Total number of successful requests
- **Error Count**: Total number of failed requests
- **Last Request**: Details of the most recent successful request
- **Last Error**: Details of the most recent failed request
- **Connection Status**: Whether the module is ready to send requests
- **Enabled Status**: Whether the module is enabled or disabled

## Security Notes

- **URL Validation**: URLs are validated for proper HTTP/HTTPS format
- **Header Security**: Headers can be used for authentication and API keys
- **HTTPS Recommendation**: Use HTTPS for sensitive data transmission
- **Timeout Protection**: Timeout prevents hanging requests
- **Error Logging**: Sensitive information in error logs should be reviewed

## Testing

### Manual Trigger
Use the manual trigger feature to test HTTP requests:
- Sends a test payload with timestamp and message
- Useful for verifying endpoint connectivity
- Helps debug authentication and configuration issues

### Connection Test
Use the `testConnection()` method to verify connectivity:
- Returns boolean indicating success/failure
- Logs detailed error information on failure
- Useful for health checks and monitoring

### State Inspection
Use `getState()` to inspect module status:
- View current configuration
- Check request/error statistics
- Monitor connection status

## API Methods

### Public Methods

- `getConfig()`: Returns current configuration
- `getState()`: Returns current module state
- `reset()`: Resets request/error statistics
- `testConnection()`: Tests HTTP connectivity
- `manualTrigger()`: Sends a test request

### Event Handling

- `onTriggerEvent(event)`: Handles trigger events from input modules
- `onStreamingEvent(event)`: Handles streaming events from input modules
- `send(data)`: Sends arbitrary data via HTTP request 
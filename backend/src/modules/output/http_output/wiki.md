# HTTP Output Module

## Overview

The HTTP Output module sends HTTP requests to external endpoints. It can be triggered by input modules or used for manual testing.

## Configuration

### Parameters

- **url** (string, required): The target URL for HTTP requests
  - Must be a valid HTTP or HTTPS URL
  - Pattern: `^https?://.+`

- **method** (string, optional): HTTP method to use
  - Options: `GET`, `POST`, `PUT`, `DELETE`
  - Default: `POST`

- **headers** (object, optional): Additional HTTP headers to include
  - Default: `{}`
  - Content-Type is automatically set to `application/json`

- **timeout** (number, optional): Request timeout in milliseconds
  - Range: 1000-30000ms
  - Default: `5000`

### Example Configuration

```json
{
  "url": "https://api.example.com/webhook",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer your-token",
    "X-Custom-Header": "value"
  },
  "timeout": 10000
}
```

## Events

### Input Events

- **httpRequest**: Triggers an HTTP request to the configured endpoint
  - Payload: Any data to send in the request body (for non-GET requests)

### Output Events

- **httpRequest**: Emitted when an HTTP request is completed
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

## Behavior

- Automatically sets Content-Type to `application/json` for non-GET requests
- Sends request body as JSON for POST, PUT, and DELETE methods
- Implements request timeout with automatic cancellation
- Emits output events with response status and content
- Handles connection errors and timeouts gracefully

## Integration

This module can be connected to:
- Time Input module for scheduled API calls
- Sensor Input modules for real-time data transmission
- Other input modules for event-driven HTTP requests

## Error Handling

- Network errors are logged and emitted as error events
- Timeout errors trigger automatic request cancellation
- HTTP error status codes (4xx, 5xx) are treated as errors
- Failed requests don't prevent subsequent requests

## Security Notes

- URLs are validated for proper HTTP/HTTPS format
- Headers can be used for authentication and API keys
- Consider using HTTPS for sensitive data transmission
- Timeout prevents hanging requests

## Testing

Use the manual trigger feature to test HTTP requests:
- Sends a test payload with timestamp and message
- Useful for verifying endpoint connectivity
- Helps debug authentication and configuration issues 
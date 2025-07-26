# HTTP Input Module

## Overview

The HTTP Input module creates a webhook receiver that listens for HTTP requests and converts them into events that can trigger or stream to output modules. It automatically parses incoming request data to extract numeric values and passes only numbers to output modules, making it ideal for integrating web services, IoT devices, and external systems with your Interactor installation.

### Quick Guide for Artists

- Drag the “HTTP Input” module onto your canvas.
- Keep the defaults (Port **3000**, Endpoint `/webhook`) or change them to match the service you use (IFTTT, Zapier, etc.).
- Click the “Copy URL” button in the inspector and paste it into the external service.
- Every incoming request becomes an event you can connect to lights, sound, or video.

### Developer Deep Dive

Folder: `backend/src/modules/input/http_input/`

| Area | Description |
|------|-------------|
| Express server | Spun up in `onStart()` with configurable host/port/endpoint. |
| Rate-limiting | Implemented via `express-rate-limit` – default `rateLimit` is 60 req/min. |
| Parsing | `extractNumeric()` scans body & query for the first numeric value. |
| Events | `httpRequest` (raw), `httpTrigger` (numeric), `stateUpdate` (stats). |

Add auth middleware or custom payload parsing inside `handleRequest()`.

---

## Key Features

- **Webhook Receiver**: Creates an HTTP server to receive webhook requests
- **Numeric Data Extraction**: Automatically parses and extracts numeric values from request data
- **Rate Limiting**: Configurable rate limiting to prevent abuse (default: 60 requests/minute)
- **Multiple HTTP Methods**: Support for GET, POST, PUT, DELETE, etc.
- **Content Type Validation**: Ensures requests have the expected format
- **Error Logging**: Comprehensive error logging for debugging
- **Health Check Endpoint**: Built-in `/health` endpoint for monitoring

## Configuration

### Parameters

- **port** (number, required): HTTP server port to listen on
  - Range: 1024-65535
  - Default: 3000
  - Examples: 3000, 8080, 9000

- **host** (string, required): Host address to bind to
  - Default: "0.0.0.0" (all interfaces)
  - Examples: "0.0.0.0", "localhost", "127.0.0.1"

- **endpoint** (string, required): HTTP endpoint to listen on
  - Must start with "/"
  - Default: "/webhook"
  - Examples: "/webhook", "/trigger", "/sensor", "/mobile"

- **methods** (array, required): HTTP methods to accept
  - Default: ["POST"]
  - Options: ["GET"], ["POST"], ["GET", "POST"], ["PUT"], etc.

- **rateLimit** (number, required): Maximum requests per minute
  - Range: 1-1000
  - Default: 60
  - Examples: 30, 60, 120, 300

- **contentType** (string, optional): Expected content type for requests
  - Default: "application/json"
  - Examples: "application/json", "application/x-www-form-urlencoded", "text/plain"

- **enabled** (boolean, optional): Enable or disable the HTTP server
  - Default: `true`

### Example Configuration

```json
{
  "port": 3000,
  "host": "0.0.0.0",
  "endpoint": "/webhook",
  "methods": ["POST"],
  "rateLimit": 60,
  "contentType": "application/json",
  "enabled": true
}
```

## Events

### Output Events

- **httpRequest**: Emitted when any HTTP request is received
  - Payload:
    ```json
    {
      "method": "POST",
      "url": "/webhook",
      "headers": { "content-type": "application/json" },
      "body": { "value": 75.5, "sensor": "temperature" },
      "query": {},
      "timestamp": 1705333500000,
      "requestId": "req_1705333500000_abc123",
      "rateLimitRemaining": 59
    }
    ```

- **httpTrigger**: Emitted when HTTP request contains valid numeric data (trigger mode)
  - Payload:
    ```json
    {
      "value": 75.5,
      "method": "POST",
      "url": "/webhook",
      "headers": { "content-type": "application/json" },
      "body": { "value": 75.5, "sensor": "temperature" },
      "query": {},
      "timestamp": 1705333500000,
      "requestId": "req_1705333500000_abc123",
      "rateLimitRemaining": 59,
      "requestCount": 42
    }
    ```

- **stateUpdate**: Emitted when module state changes
  - Payload:
    ```json
    {
      "status": "listening",
      "port": 3000,
      "host": "0.0.0.0",
      "endpoint": "/webhook",
      "currentValue": 75.5,
      "requestCount": 42,
      "rateLimit": 60,
      "rateLimitRemaining": 59,
      "mode": "trigger",
      "lastUpdate": 1705333500000
    }
    ```

## Usage Examples

### Basic Webhook Trigger

Receive webhook requests and trigger audio playback:

```json
{
  "port": 3000,
  "endpoint": "/trigger",
  "methods": ["POST"],
  "rateLimit": 30,
  "contentType": "application/json"
}
```

**Test with curl:**
```bash
curl -X POST http://localhost:3000/trigger \
  -H "Content-Type: application/json" \
  -d '{"value": 100, "action": "play_sound"}'
```

### IoT Sensor Data

Receive sensor data and control lighting:

```json
{
  "port": 3000,
  "endpoint": "/sensor",
  "methods": ["POST"],
  "rateLimit": 120,
  "contentType": "application/json"
}
```

**Test with curl:**
```bash
curl -X POST http://localhost:3000/sensor \
  -H "Content-Type: application/json" \
  -d '{"temperature": 25.5, "humidity": 60, "light": 800}'
```

### Mobile App Integration

Accept requests from mobile apps:

```json
{
  "port": 3000,
  "endpoint": "/mobile",
  "methods": ["GET", "POST"],
  "rateLimit": 60,
  "contentType": "application/json"
}
```

**Test with curl:**
```bash
curl -X GET "http://localhost:3000/mobile?value=75&action=trigger"
```

## Behavior

### Trigger Mode
- Listens for HTTP requests on the configured endpoint
- Parses request data to extract numeric values
- Emits `httpTrigger` event when valid numeric data is found
- Sends 200 OK response with extracted value
- Useful for discrete webhook triggers

### Streaming Mode
- Continuously streams numeric values from HTTP requests
- Emits `httpRequest` for every received request
- Useful for real-time data feeds

### Numeric Data Extraction
The module automatically searches for numeric values in:
1. **Request Body** (JSON, form data)
2. **Query Parameters** (URL parameters)
3. **Path Parameters** (URL path segments)

**Extraction Examples:**
- `{"value": 75.5}` → extracts `75.5`
- `{"data": {"temperature": 25.5}}` → extracts `25.5`
- `{"sensors": [{"temp": 20}, {"temp": 30}]}` → extracts `20` (first found)
- `?value=100&action=trigger` → extracts `100`
- `/sensor/75.5/status` → extracts `75.5`

### Rate Limiting
- Sliding window rate limiting (1-minute window)
- Configurable requests per minute (1-1000)
- Returns 429 Too Many Requests when limit exceeded
- Tracks remaining requests in responses

### Error Handling
- **400 Bad Request**: Invalid content type or no numeric value found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server processing errors
- All errors are logged for debugging

## Integration

This module can be connected to output modules to:
- **Audio Output**: Webhook triggers sound effects
- **DMX Output**: HTTP request triggers lighting sequences
- **OSC Output**: Forward webhook data as OSC messages

### Example Integration Scenarios

#### 1. GitHub Webhook → Audio Trigger
```json
// HTTP Input Config
{
  "port": 3000,
  "endpoint": "/github",
  "methods": ["POST"],
  "rateLimit": 30
}

// Audio Output Config
{
  "audioFile": "notification.wav",
  "volume": 0.8
}
```

#### 2. IoT Sensor → DMX Lighting
```json
// HTTP Input Config
{
  "port": 3000,
  "endpoint": "/sensor",
  "methods": ["POST"],
  "rateLimit": 120
}

// DMX Output Config
{
  "protocol": "sACN",
  "universe": 1,
  "csvFile": "lighting_sequence.csv"
}
```

#### 3. Mobile App → OSC Message
```json
// HTTP Input Config
{
  "port": 3000,
  "endpoint": "/mobile",
  "methods": ["GET", "POST"],
  "rateLimit": 60
}

// OSC Output Config
{
  "ip": "192.168.1.100",
  "port": 8000,
  "address": "/mobile/trigger"
}
```

## Common Use Cases

### Webhook Integration
- GitHub repository events
- Slack slash commands
- Discord bot interactions
- Zapier webhook automation
- IFTTT applets

### IoT Device Integration
- Temperature sensors
- Motion detectors
- Light sensors
- Smart home devices
- Industrial sensors

### Mobile App Integration
- Touch triggers
- Gesture controls
- Remote control apps
- Interactive installations
- Performance art

### External System Integration
- Building management systems
- Industrial control systems
- Data visualization tools
- Monitoring dashboards
- Third-party APIs

## Technical Notes

### HTTP Server
- Uses Express.js framework
- Supports JSON and URL-encoded request bodies
- Built-in request logging
- Health check endpoint at `/health`
- 404 handler for unknown endpoints

### Performance
- Low latency request processing
- Efficient numeric parsing
- Minimal memory footprint
- Real-time event emission

### Security Considerations
- Rate limiting prevents abuse
- Content type validation
- Request size limits (1MB)
- Error logging for monitoring

### Network Configuration
- Binds to specified host and port
- Supports all network interfaces (0.0.0.0)
- Compatible with reverse proxies
- Works with load balancers

## Testing

### Manual Testing
1. Start the HTTP Input module
2. Send test requests using curl, Postman, or similar tools
3. Verify event emission in the system
4. Test rate limiting behavior
5. Verify error handling

### Example Test Commands

```bash
# Basic POST request
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"value": 100}'

# GET request with query parameters
curl "http://localhost:3000/webhook?value=75&action=trigger"

# Test rate limiting
for i in {1..70}; do
  curl -X POST http://localhost:3000/webhook \
    -H "Content-Type: application/json" \
    -d "{\"value\": $i}"
done

# Test health endpoint
curl http://localhost:3000/health
```

### Error Testing

```bash
# Invalid content type
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: text/plain" \
  -d "not json"

# No numeric value
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "hello world"}'

# Invalid endpoint
curl http://localhost:3000/invalid
```

## Troubleshooting

### Common Issues

- **Port already in use**: Change port number or stop conflicting service
- **Permission denied**: Run with appropriate permissions for low ports
- **No numeric value found**: Ensure request contains numeric data
- **Rate limit exceeded**: Increase rate limit or reduce request frequency
- **Connection refused**: Check if module is started and listening

### Debug Information
The module provides detailed logging for:
- HTTP server startup/shutdown
- Request reception and processing
- Numeric value extraction
- Rate limiting behavior
- Error conditions
- State changes

### Monitoring
- Use `/health` endpoint for health checks
- Monitor request count and rate limit status
- Check logs for error patterns
- Verify event emission to output modules 
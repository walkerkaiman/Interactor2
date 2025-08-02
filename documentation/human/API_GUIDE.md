# API Guide

This document provides a comprehensive overview of the Interactor REST API and WebSocket events.

## REST API

The REST API is the primary interface for managing the Interactor system. All endpoints are prefixed with `/api`.

### Endpoints

#### Modules

-   **`GET /api/modules`**: Get a list of all available module manifests.
-   **`GET /api/modules/instances`**: Get a list of all running module instances.
-   **`POST /api/modules/instances`**: Create a new module instance.
-   **`PUT /api/modules/instances/:id/config`**: Update the configuration of a module instance.

#### Interactions

-   **`GET /api/interactions`**: Get the current list of all interactions.
-   **`POST /api/interactions/register`**: Register a new set of interactions. This is an atomic operation that will replace the existing interactions.

#### Triggers

-   **`POST /api/trigger/:moduleId`**: Manually trigger a module.

#### Settings

-   **`GET /api/settings`**: Get the current system settings.
-   **`PUT /api/settings/:key`**: Update a specific system setting.

## WebSocket Events

The WebSocket server provides real-time updates to all connected clients.

### Event Types

-   **`state_update`**: Sent whenever the application state changes. The payload contains the complete `interactions` and `moduleInstances` arrays.
-   **`stream`**: Sent whenever a module in "stream" mode emits data. The payload contains the source module's ID and the data payload.
-   **`trigger_event`**: Sent whenever a module is triggered. The payload contains the module's ID and the trigger type.

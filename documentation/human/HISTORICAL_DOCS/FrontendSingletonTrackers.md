# Frontend Singleton Trackers - DEPRECATED

**Note:** This document is for historical reference only. The singleton trackers described here have been removed from the frontend as part of a major architectural simplification. The new architecture uses a single source of truth and unidirectional data flow, eliminating the need for these singletons. See `FRONTEND_SIMPLIFICATION_PLAN.md` for more details.

## Overview

The frontend application previously used several singleton trackers to manage global state. All trackers followed the same singleton pattern to prevent multiple instances and potential state conflicts.

## Trackers (DEPRECATED)

### 1. TriggerEventTracker (REMOVED)
### 2. EdgeRegistrationTracker (REMOVED)
### 3. ApiService (RETAINED)

The `ApiService` is the only remaining singleton, as it provides a centralized interface for all backend API communications.

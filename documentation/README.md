# Interactor Developer Documentation

## Introduction

Welcome to the developer documentation for Interactor, a modular, event-driven platform for building complex, interactive systems. This guide provides a comprehensive overview of the project's architecture, core concepts, and development practices.

## Documentation Organization

Documentation is now organized into two main categories:

### 🤖 **For AI Agents** (`documentation/ai/`)
- [**AI Agent Start Here**](ai/AI_AGENT_START_HERE.md) - Essential onboarding for AI development
- [**AI Quick Reference**](ai/AI_QUICK_REFERENCE.md) - Copy-paste templates and common patterns  
- [**AI Frontend Development Guide**](ai/AI_FRONTEND_DEVELOPMENT_GUIDE.md) - **NEW**: Strict frontend development rules and patterns
- [**Template Input Module**](ai/TEMPLATE_INPUT_MODULE.md) - Complete input module template
- [**Template Output Module**](ai/TEMPLATE_OUTPUT_MODULE.md) - Complete output module template
- [**AI-Friendly Architecture Rules**](ai/AI_FRIENDLY_ARCHITECTURE_RULES.md) - Guidelines for maintainable code

### 👨‍💻 **For Human Developers** (`documentation/human/`)
- [**Developer Onboarding**](human/DeveloperOnboarding.md) - Comprehensive system overview
- [**Module Development Guide**](human/MODULE_DEVELOPMENT.md) - Detailed module creation guide
- [**API Guide**](human/API_GUIDE.md) - REST API and WebSocket documentation
- [**Frontend Architecture**](human/FRONTEND_ARCHITECTURE.md) - Frontend design and patterns
- [**Performance Guide**](human/REACT_FLOW_PERFORMANCE_GUIDE.md) - React Flow optimization
- [**Historical Documentation**](human/HISTORICAL_DOCS/) - Previous versions and lessons learned

## Quick Start

- **AI Agents**: Start with [`ai/AI_AGENT_START_HERE.md`](ai/AI_AGENT_START_HERE.md)
- **Human Developers**: Start with [`human/DeveloperOnboarding.md`](human/DeveloperOnboarding.md)

---

## Table of Contents

## Architecture Overview

Interactor is a monorepo with a clear separation of concerns between the backend, frontend, and a shared package for common types and interfaces.

-   **`backend/`**: A Node.js application responsible for all core logic, including module management, message routing, and state persistence.
-   **`frontend/`**: A React-based single-page application that provides a visual, node-based editor for configuring and monitoring the system.
-   **`shared/`**: A TypeScript package containing all shared types, interfaces, and schemas to ensure consistency between the frontend and backend.
-   **`documentation/`**: Contains all developer documentation, including this guide.

## Core Concepts

-   **Modules**: The fundamental building blocks of Interactor. Modules can be either **inputs** (receiving data from external sources) or **outputs** (sending data to external systems).
-   **Interactions**: A collection of module instances and the routes that connect them. Interactions are created and managed in the frontend's node-based editor.
-   **Routes**: The connections between modules. A route defines how an event from a source module is delivered to a target module.
-   **Message Router**: The central event bus of the backend. It is responsible for routing all messages between modules based on the defined routes.
-   **State Manager**: A singleton service on the backend that manages and persists the entire application state, including all interactions, module configurations, and settings.

## Getting Started

1.  **Clone the repository.**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Start the development servers:**
    ```bash
    npm run dev
    ```
    This will start both the backend and frontend servers in watch mode.

## Backend Architecture

The backend is built with Node.js and TypeScript and is responsible for all the core logic of the application.

### Key Services

-   **`ModuleLoader`**: Discovers, validates, and instantiates all available modules.
-   **`MessageRouter`**: The central event bus for routing all messages between modules.
-   **`StateManager`**: Manages and persists the entire application state.
-   **`Logger`**: A multi-level logger for debugging and monitoring.

## Frontend Architecture

The frontend is a single-page application built with React and TypeScript.

### State Management

The frontend employs a simplified state management architecture with a single source of truth and a unidirectional data flow.

-   **Single Source of Truth**: The `App.tsx` component is the single container for the application's state, including all interactions, modules, and settings.
-   **Unidirectional Data Flow**: State flows down from `App.tsx` to child components, and any updates are propagated back up through callbacks. This eliminates race conditions and makes the application easier to reason about.

### Key Components

-   **`App`**: The root component that manages all application state.
-   **`NodeEditor`**: The main component for the node-based editor, built with React Flow.
-   **`Sidebar`**: Displays a list of available modules that can be dragged onto the editor.
-   **`CustomNode` and `CustomEdge`**: Custom components for rendering nodes and edges in the editor.

## Module Development

See `MODULE_DEVELOPMENT.md` for a detailed guide on how to create new modules.

## API Guide

See `API_GUIDE.md` for a detailed guide to the REST API and WebSocket events.

## Testing

The project uses Vitest for both backend and frontend testing.

-   **Run all tests:**
    ```bash
    npm run test
    ```
-   **Run backend tests:**
    ```bash
    npm run test:backend
    ```
-   **Run frontend tests:**
    ```bash
    npm run test:frontend
    ```

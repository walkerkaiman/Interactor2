# Frontend Architecture Guide

This guide provides a comprehensive overview of the Interactor frontend architecture.

## Core Principles

The frontend is built on a set of core principles that are designed to make the application simple, robust, and easy to maintain.

-   **Single Source of Truth**: The `App.tsx` component is the single container for the application's state. This eliminates the need for complex state management solutions and makes it easy to reason about the flow of data through the application.
-   **Unidirectional Data Flow**: State flows down from parent components to child components, and any updates are propagated back up through callbacks. This makes it easy to understand how changes to the state will affect the UI.
-   **Simplicity**: The frontend is built with a minimal set of dependencies and avoids complex patterns in favor of simple, easy-to-understand solutions.

## Key Components

-   **`App`**: The root component of the application. It is responsible for managing all application state and for fetching data from the backend.
-   **`NodeEditor`**: The main component for the node-based editor. It is built with React Flow and is responsible for rendering all nodes and edges.
-   **`Sidebar`**: Displays a list of available modules that can be dragged onto the editor.
-   **`BaseModuleNode`**: A higher-order component that provides a consistent structure and a rich set of features for all module nodes in the editor.
-   **`CustomEdge`**: A custom component for rendering edges in the editor.

## State Management

The frontend uses a simple state management solution based on React's built-in `useState` and `useCallback` hooks. All application state is managed in the `App` component and is passed down to child components as props. This approach is simple, performant, and easy to understand.

## Performance

The frontend is designed to be performant, even with a large number of nodes and edges.

-   **Memoization**: All components are memoized with `React.memo` to prevent unnecessary re-renders.
-   **Virtualization**: The `NodeEditor` uses React Flow's built-in virtualization to ensure that only visible nodes and edges are rendered.
-   **Batching**: All state updates are batched to minimize the number of re-renders.

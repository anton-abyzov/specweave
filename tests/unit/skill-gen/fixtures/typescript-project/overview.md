# Project Overview

## Error Handling Strategy

All services follow a consistent error handling pattern using custom `AppError` classes and React error boundaries. Each module wraps async operations in try/catch blocks that classify errors by severity (fatal, retryable, warning). Unhandled rejections are caught at the process level and forwarded to Sentry for tracking.

React components use `ErrorBoundary` wrappers at route boundaries to prevent cascading failures. The `withErrorBoundary` HOC is applied to all page-level components, providing fallback UI and automatic error reporting.

Express middleware includes a centralized error handler that normalizes all thrown errors into a standard `{ code, message, details }` response format. Rate-limiting and circuit-breaker patterns protect downstream services.

## Component Architecture

The frontend is built with React 18 using a feature-based folder structure. Each feature module exports a barrel index with its routes, components, and hooks. Shared UI primitives live in `@app/ui` and follow the compound component pattern.

State management uses Zustand for client state and TanStack Query for server state. All API calls go through a typed fetch wrapper that handles auth token refresh automatically.

# Architecture

## Product boundary

Interactive Demos Builder is a desktop-local application for composing demo flows from reusable HTML templates.

The application is not responsible for visually editing template internals in the MVP. Its responsibility is to manage projects, template selection, ordered slide composition and consistency between UI state, metadata and local filesystem state.

## Architectural principles

- Filesystem is the physical source of truth for copied HTML artifacts.
- Project metadata is the logical source of truth for order, identity and app state.
- All write operations go through a single mutation layer.
- UI never writes directly to filesystem or project metadata.
- Every destructive operation must be recoverable or clearly fail with no silent corruption.

## Layers

### Presentation layer

React app with three major work areas:

- Projects home
- Project editor
- Settings

### Application layer

Use-case oriented services:

- ProjectService
- TemplateLibraryService
- FlowMutationService
- IntegrityService
- SettingsService

### Infrastructure layer

- Tauri commands for filesystem operations
- JSON persistence
- Atomic file writer
- Path resolver

## Main modules

### Project Manager

Creates, lists, duplicates, opens and deletes projects.

### Template Library Manager

Indexes templates from the templates root, validates basic metadata and exposes category-based navigation.

### Flow Editor

Handles add, duplicate, reorder and delete slide actions for a selected project.

### Filesystem Sync Engine

Executes physical copy, rename and delete operations and reports exact results back to the application layer.

### Persistence Layer

Reads and writes settings, project index and project metadata files.

### Integrity Checker

Validates that project metadata and project folders remain synchronized.

## Write flow policy

1. Validate action request.
2. Build mutation plan.
3. Execute filesystem operation.
4. Persist metadata.
5. Refresh UI state.
6. If a step fails, rollback if possible.

## MVP non-goals

- Visual HTML editor
- Multi-user collaboration
- Cloud sync
- Rich version history
- Advanced permissions model

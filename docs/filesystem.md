# Filesystem Design

## Root structure

```txt
/InteractiveDemosBuilderData
  /templates
  /projects
  /config
  /cache
```

## Templates

Each template lives in its own folder to support metadata and optional assets.

```txt
/templates/<template-slug>/
  template.json
  <template-slug>.html
  preview.png
```

## Projects

```txt
/projects/<project-slug>/
  project.json
  /slides
  /assets
  /exports
```

## Slide naming convention

```txt
<order>-<template-slug>--<instanceKey>.html
```

Example:

```txt
001-home-dashboard--a1f4.html
002-person-record-3col--m7p9.html
```

## Rules

- `order` is a 3-digit sortable prefix.
- `template-slug` preserves human readability.
- `instanceKey` guarantees uniqueness.
- `project.json` is the canonical metadata file for the project.
- `projects-index.json` stores summary records only.

## Reorder policy

Slides are physically renamed on reorder in the MVP so the filesystem remains understandable outside the app.

## Safety policy

- Metadata writes must be atomic.
- Destructive operations require explicit confirmation.
- Integrity reconciliation runs when a project is opened.

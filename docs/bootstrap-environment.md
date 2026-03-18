# Environment Bootstrap

## Purpose

The app needs an explicit one-time bootstrap to create its local working directories and seed configuration files.

## Command

`init_app_environment`

## Responsibilities

- Resolve default data root under the current user home directory.
- Create `templates`, `projects`, `config` and `cache` folders.
- Create `config/settings.json` if missing.
- Create `config/projects-index.json` if missing.
- Return all resolved paths to the frontend.

## Default root

```txt
$HOME/InteractiveDemosBuilderData
```

## Notes

This keeps the repo clean and separates app runtime data from source code.

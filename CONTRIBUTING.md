# Contributing

## Quick start

1. Install Node.js (LTS).
2. Rebuild themes:
   - PowerShell: `node .\scripts\build-full-themes.js`

## Packaging

- Build a VSIX:
  - `cmd /c "npx @vscode/vsce package"`

## Notes

- Theme outputs live in `themes/`.
- Base reference themes are in `themes/base/` and are used by the build script.

# Contributing

## Quick start

1. Install Node.js (LTS).
2. Rebuild themes:
   - PowerShell: `node .\scripts\build-full-themes.js`

## Debugging

- Press F5 to launch the Extension Development Host. If prompted, create a launch configuration and choose VS Code Extension Development.

## Packaging

- Build a VSIX:
  - `cmd /c "npx @vscode/vsce package"`

## Notes

- Theme outputs live in `themes/`.
- Base reference themes are in `themes/base/` and are used by the build script.

# Contributing

## Quick start

1. Install Node.js (LTS).
2. Go to the VS Code package:
  - `cd packages\vscode`
3. Rebuild themes:
  - PowerShell: `node .\scripts\build-full-themes.js`

## Debugging

- Press F5 to launch the Extension Development Host. If prompted, create a launch configuration and choose VS Code Extension Development.

## Packaging

- Build a VSIX:
  - `cmd /c "npx @vscode/vsce package"`

## Notes

- Theme outputs live in `packages/vscode/themes/`.
- Base reference themes are in `packages/vscode/themes/base/` and are used by the build script.

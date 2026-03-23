# Vaporsoft Themes Monorepo

This repo hosts Vaporsoft themes for multiple platforms. Each platform lives under `packages/`.

## Packages

- `packages/vscode` - VS Code themes (Light, Dark, High Contrast, Flat variants)

## Build (VS Code)

1. `cd packages\vscode`
2. Rebuild themes: `node .\scripts\build-full-themes.js`
3. Validate coverage: `node .\scripts\validate-theme-coverage.js`
4. Package VSIX: `cmd /c "npx @vscode/vsce package"`

## Release

CI builds and attaches VSIX files to GitHub Releases on tag.

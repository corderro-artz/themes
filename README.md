# VaporSoft Themes Monorepo

This repo hosts VaporSoft themes for multiple platforms. Each platform lives under `packages/`.

## Packages

- `packages/vscode` - VS Code themes (Light, Dark, OLED)

## Build (VS Code)

1. `cd packages\vscode`
2. Rebuild themes: `node .\scripts\build-full-themes.js`
3. Package VSIX: `cmd /c "npx @vscode/vsce package"`

## Release

CI builds and attaches VSIX files to GitHub Releases on tag.

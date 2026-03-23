# Vaporsoft Themes

Vaporsoft theme set with light, dark, and high contrast variants inspired by the Vaporsoft brand palette.

## Palette

- Light: background #f4efe8, text #121318, accent #a11f31
- Dark: background #07080b, text #f2ede6, accent #a11f31
- High Contrast Dark: background #000000, text #f2ede6, accent #a11f31
- High Contrast Light: background #f4efe8, text #121318, accent #a11f31

## Variants

- Standard: classic borders and layered surfaces.
- Flat: reduced borders with flatter surfaces for a minimal look.

## Install locally

1. Open this folder in VS Code.
2. Press F5 to launch the Extension Development Host. If prompted, create a launch configuration and choose VS Code Extension Development.
3. In the new window, run Preferences: Color Theme and pick a Vaporsoft theme.

## Build

- Regenerate theme files: `node .\scripts\build-full-themes.js`
- Validate theme coverage: `node .\scripts\validate-theme-coverage.js`
- Package VSIX: `cmd /c "npx @vscode/vsce package"`

## Repo layout

- `themes/` contains the published theme JSON files.
- `themes/base/` holds base reference themes for regeneration.
- `scripts/` contains build tooling.

## Notes

- High Contrast Dark keeps top-level surfaces at or near true black.
- Author: Corderro Artz (corderro-artz)
- Trademark: Vaporsoft

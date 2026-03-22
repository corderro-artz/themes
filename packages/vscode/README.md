# VaporSoft Themes

VaporSoft theme set with light, dark, and OLED variants inspired by the VaporSoft brand palette.

## Palette

- Light: background #f4efe8, text #121318, accent #a11f31
- Dark: background #07080b, text #f2ede6, accent #a11f31
- OLED: background #000000, text #f2ede6, accent #a11f31

## Install locally

1. Open this folder in VS Code.
2. Press F5 to launch the Extension Development Host. If prompted, create a launch configuration and choose VS Code Extension Development.
3. In the new window, run Preferences: Color Theme and pick a VaporSoft theme.

## Build

- Regenerate theme files: `node .\scripts\build-full-themes.js`
- Package VSIX: `cmd /c "npx @vscode/vsce package"`

## Repo layout

- `themes/` contains the published theme JSON files.
- `themes/base/` holds base reference themes for regeneration.
- `scripts/` contains build tooling.

## Notes

- OLED keeps top-level surfaces at or near true black for high contrast.
- Author: Corderro Artz (corderro-artz)
- Trademark: VaporSoft

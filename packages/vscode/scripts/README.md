# Build Scripts

## build-full-themes.js

- Regenerates `themes/vaporsoft-*.json` with full coverage.
- Uses `themes/base/*.json` as reference sources.
- Runs theme coverage validation after generating themes.

Run:
- PowerShell: `node .\scripts\build-full-themes.js`

## validate-theme-coverage.js

- Validates that generated themes cover all base theme colors, tokens, and semantic tokens.

Run:
- PowerShell: `node .\scripts\validate-theme-coverage.js`

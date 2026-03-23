const fs = require("fs");
const path = require("path");
const { runValidation } = require("./validate-theme-coverage");

function stripJsonComments(input) {
	let inString = false;
	let stringChar = "";
	let escaped = false;
	let output = "";

	for (let i = 0; i < input.length; i += 1) {
		const char = input[i];
		const next = input[i + 1];

		if (inString) {
			output += char;
			if (!escaped && char === stringChar) {
				inString = false;
			}
			escaped = !escaped && char === "\\";
			continue;
		}

		if (char === "\"" || char === "'") {
			inString = true;
			stringChar = char;
			output += char;
			continue;
		}

		if (char === "/" && next === "/") {
			while (i < input.length && input[i] !== "\n") {
				i += 1;
			}
			output += "\n";
			continue;
		}

		if (char === "/" && next === "*") {
			i += 2;
			while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) {
				i += 1;
			}
			i += 1;
			continue;
		}

		output += char;
	}

	return output;
}

function stripTrailingCommas(input) {
	let output = input;
	let prev;
	do {
		prev = output;
		output = output.replace(/,\s*([}\]])/g, "$1");
	} while (output !== prev);
	return output;
}

function readJsonc(filePath) {
	const raw = fs.readFileSync(filePath, "utf8");
	const stripped = stripTrailingCommas(stripJsonComments(raw));
	return JSON.parse(stripped);
}

function hexToInt(hex) {
	return parseInt(hex, 16);
}

function parseHexColor(value) {
	const hex = value.slice(1).toLowerCase();
	if (hex.length === 3) {
		const r = hexToInt(hex[0] + hex[0]);
		const g = hexToInt(hex[1] + hex[1]);
		const b = hexToInt(hex[2] + hex[2]);
		return { r, g, b, a: 1, hasAlpha: false };
	}
	if (hex.length === 4) {
		const r = hexToInt(hex[0] + hex[0]);
		const g = hexToInt(hex[1] + hex[1]);
		const b = hexToInt(hex[2] + hex[2]);
		const a = hexToInt(hex[3] + hex[3]) / 255;
		return { r, g, b, a, hasAlpha: true };
	}
	if (hex.length === 6) {
		const r = hexToInt(hex.slice(0, 2));
		const g = hexToInt(hex.slice(2, 4));
		const b = hexToInt(hex.slice(4, 6));
		return { r, g, b, a: 1, hasAlpha: false };
	}
	if (hex.length === 8) {
		const r = hexToInt(hex.slice(0, 2));
		const g = hexToInt(hex.slice(2, 4));
		const b = hexToInt(hex.slice(4, 6));
		const a = hexToInt(hex.slice(6, 8)) / 255;
		return { r, g, b, a, hasAlpha: true };
	}
	return null;
}

function parseRgbColor(value) {
	const match = value
		.trim()
		.toLowerCase()
		.match(/^rgba?\(([^)]+)\)$/);
	if (!match) {
		return null;
	}
	const parts = match[1].split(",").map((part) => part.trim());
	if (parts.length < 3) {
		return null;
	}
	const r = Number(parts[0]);
	const g = Number(parts[1]);
	const b = Number(parts[2]);
	const a = parts.length >= 4 ? Number(parts[3]) : 1;
	return { r, g, b, a, hasAlpha: parts.length >= 4 };
}

function parseColor(value) {
	if (!value || typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	if (trimmed.toLowerCase() === "transparent") {
		return { r: 0, g: 0, b: 0, a: 0, hasAlpha: true };
	}
	if (trimmed.startsWith("#")) {
		return parseHexColor(trimmed);
	}
	if (trimmed.toLowerCase().startsWith("rgb")) {
		return parseRgbColor(trimmed);
	}
	return null;
}

function toHexByte(value) {
	return Math.max(0, Math.min(255, Math.round(value)))
		.toString(16)
		.padStart(2, "0");
}

function formatColor(color) {
	const r = toHexByte(color.r);
	const g = toHexByte(color.g);
	const b = toHexByte(color.b);
	if (color.hasAlpha && color.a < 1) {
		const a = toHexByte(color.a * 255);
		return `#${r}${g}${b}${a}`;
	}
	return `#${r}${g}${b}`;
}

function withAlpha(value, alpha) {
	const parsed = parseColor(value);
	if (!parsed) {
		return value;
	}
	return formatColor({
		r: parsed.r,
		g: parsed.g,
		b: parsed.b,
		a: alpha,
		hasAlpha: true,
	});
}

function needsAlpha(key) {
	const lower = key.toLowerCase();
	return (
		lower.includes("selection") ||
		lower.includes("highlight") ||
		lower.includes("hover") ||
		lower.includes("inactive") ||
		lower.includes("current") ||
		lower.includes("findmatch")
	);
}

function pickPaletteColor(key, palette) {
	const lower = key.toLowerCase();
	if (lower.includes("error") || lower.includes("invalid") || lower.includes("deleted")) {
		return palette.accent;
	}
	if (lower.includes("warning")) {
		return palette.warning;
	}
	if (lower.includes("info")) {
		return palette.info;
	}
	if (lower.includes("success") || lower.includes("added")) {
		return palette.success;
	}
	if (lower.includes("modified")) {
		return palette.info;
	}
	if (lower.includes("foreground") || lower.includes("text") || lower.includes("icon") || lower.includes("label")) {
		if (
			lower.includes("inactive") ||
			lower.includes("disabled") ||
			lower.includes("placeholder") ||
			lower.includes("description") ||
			lower.includes("secondary") ||
			lower.includes("muted")
		) {
			return palette.fgMuted;
		}
		return palette.fg;
	}
	if (lower.includes("border") || lower.includes("separator") || lower.includes("outline") || lower.includes("line")) {
		return palette.line;
	}
	if (lower.includes("badge") || lower.includes("button") || lower.includes("progress")) {
		return palette.accent;
	}
	if (lower.includes("selection") || lower.includes("highlight") || lower.includes("hover") || lower.includes("focus")) {
		return palette.accent;
	}
	if (lower.includes("input") || lower.includes("dropdown") || lower.includes("widget")) {
		return palette.panel;
	}
	if (lower.includes("editor")) {
		return palette.bg;
	}
	if (lower.includes("panel")) {
		return palette.bgAlt;
	}
	if (lower.includes("sidebar") || lower.includes("activitybar") || lower.includes("titlebar")) {
		return palette.bgAlt;
	}
	if (lower.includes("tab")) {
		return palette.bgAlt2;
	}
	if (lower.includes("statusbar")) {
		return palette.bgAlt2;
	}
	if (lower.includes("notification")) {
		return palette.bgAlt;
	}
	if (lower.includes("terminal")) {
		return palette.bg;
	}
	if (lower.includes("background")) {
		return palette.bg;
	}
	return palette.fg;
}

function mapColors(baseColors, palette) {
	const mapped = {};
	for (const [key, value] of Object.entries(baseColors)) {
		const parsed = parseColor(value);
		if (!parsed) {
			mapped[key] = value;
			continue;
		}
		const target = parseColor(pickPaletteColor(key, palette));
		if (!target) {
			mapped[key] = value;
			continue;
		}
		let alpha = parsed.hasAlpha ? parsed.a : target.a;
		let hasAlpha = parsed.hasAlpha || target.hasAlpha;
		if (!parsed.hasAlpha && !target.hasAlpha && needsAlpha(key)) {
			alpha = 0.25;
			hasAlpha = true;
		}
		mapped[key] = formatColor({
			r: target.r,
			g: target.g,
			b: target.b,
			a: alpha,
			hasAlpha,
		});
	}
	return mapped;
}

function mergeSemanticTokens(...maps) {
	const merged = {};
	for (const map of maps) {
		if (!map || typeof map !== "object") {
			continue;
		}
		Object.assign(merged, map);
	}
	return merged;
}

function buildTheme(options) {
	const {
		name,
		type,
		baseColors,
		baseTokenColors,
		baseSemanticTokens,
		overrideColors,
		overrideTokenColors,
		overrideSemanticTokens,
		palette,
	} = options;

	const mappedColors = mapColors(baseColors, palette);
	const colors = { ...mappedColors, ...overrideColors };
	const tokenColors = [...baseTokenColors, ...overrideTokenColors];
	const semanticTokenColors = mergeSemanticTokens(baseSemanticTokens, overrideSemanticTokens);

	return {
		"$schema": "vscode://schemas/color-theme",
		name,
		type,
		colors,
		tokenColors,
		semanticHighlighting: true,
		semanticTokenColors,
	};
}

function writeTheme(filePath, theme) {
	const content = JSON.stringify(theme, null, "\t") + "\n";
	fs.writeFileSync(filePath, content, "utf8");
}

const root = path.resolve(__dirname, "..");
const baseDir = path.join(root, "themes", "base");
const themeDir = path.join(root, "themes");

const lightVs = readJsonc(path.join(baseDir, "light_vs.json"));
const lightPlus = readJsonc(path.join(baseDir, "light_plus.json"));
const darkVs = readJsonc(path.join(baseDir, "dark_vs.json"));
const darkPlus = readJsonc(path.join(baseDir, "dark_plus.json"));

const palettes = {
	light: {
		bg: "#f4efe8",
		bgAlt: "#f1ece4",
		bgAlt2: "#ede7df",
		panel: "#f8f3ed",
		fg: "#121318",
		fgMuted: "#121418b8",
		line: "#1214181f",
		lineStrong: "#12141833",
		accent: "#a11f31",
		accentHover: "#b92f44",
		success: "#3d6b52",
		warning: "#6a4a25",
		info: "#3b5b6f",
	},
	dark: {
		bg: "#07080b",
		bgAlt: "#0a0b10",
		bgAlt2: "#0f1118",
		panel: "#0b0c10",
		fg: "#f2ede6",
		fgMuted: "#f2ede6c7",
		line: "#f2ede624",
		lineStrong: "#f2ede633",
		accent: "#a11f31",
		accentHover: "#ba3447",
		success: "#a6c08a",
		warning: "#e0c28c",
		info: "#7fb0c4",
	},
	highContrastDark: {
		bg: "#000000",
		bgAlt: "#000000",
		bgAlt2: "#000000",
		panel: "#000000",
		fg: "#f2ede6",
		fgMuted: "#f2ede6c7",
		line: "#f2ede64d",
		lineStrong: "#f2ede680",
		accent: "#a11f31",
		accentHover: "#ba3447",
		success: "#a6c08a",
		warning: "#e0c28c",
		info: "#7fb0c4",
	},
	highContrastLight: {
		bg: "#f4efe8",
		bgAlt: "#f1ece4",
		bgAlt2: "#ede7df",
		panel: "#f8f3ed",
		fg: "#121318",
		fgMuted: "#121418b8",
		line: "#12141833",
		lineStrong: "#12141866",
		accent: "#a11f31",
		accentHover: "#b92f44",
		success: "#3d6b52",
		warning: "#6a4a25",
		info: "#3b5b6f",
	},
};

function createFlatOverrides(baseOverrides, palette) {
	return {
		...baseOverrides,
		"activityBar.background": palette.bgAlt,
		"sideBar.background": palette.bgAlt,
		"sideBarSectionHeader.background": palette.bgAlt,
		"panel.background": palette.bgAlt2,
		"titleBar.activeBackground": palette.bgAlt,
		"titleBar.inactiveBackground": palette.bgAlt,
		"editorGroupHeader.tabsBackground": palette.bgAlt2,
		"tab.activeBackground": palette.bg,
		"tab.inactiveBackground": palette.bgAlt2,
		"statusBar.background": palette.bgAlt2,
		"editorHoverWidget.background": palette.panel,
		"editorSuggestWidget.background": palette.panel,
		"editorWidget.background": palette.panel,
		"input.background": palette.panel,
		"dropdown.background": palette.panel,
		"chat.inputBackground": palette.panel,
		"notificationCenterHeader.background": palette.bgAlt,
		"notifications.background": palette.bgAlt,
		"peekViewEditor.background": palette.bgAlt,
		"peekViewResult.background": palette.bg,
		"peekViewTitle.background": palette.bgAlt,
		"debugToolBar.background": palette.bgAlt,
		"activityBar.border": "#00000000",
		"sideBar.border": "#00000000",
		"sideBarSectionHeader.border": "#00000000",
		"editorGroup.border": "#00000000",
		"editorGroupHeader.border": "#00000000",
		"editorGroupHeader.tabsBorder": "#00000000",
		"tab.border": "#00000000",
		"panel.border": "#00000000",
		"statusBar.border": "#00000000",
		"input.border": "#00000000",
		"dropdown.border": "#00000000",
		"editorHoverWidget.border": "#00000000",
		"editorSuggestWidget.border": "#00000000",
		"editorWidget.border": "#00000000",
		"widget.border": "#00000000",
		"notifications.border": "#00000000",
		"activityBar.activeBorder": palette.accent,
		"panelTitle.activeBorder": palette.accent,
		"tab.activeBorderTop": withAlpha(palette.accent, 0.4),
		"tab.unfocusedActiveBorderTop": withAlpha(palette.accent, 0.2),
		"tab.activeBorder": "#00000000",
		"tab.unfocusedActiveBorder": "#00000000",
		"focusBorder": palette.accent,
		"editor.selectionBackground": withAlpha(palette.accent, 0.24),
		"editor.selectionHighlightBackground": withAlpha(palette.accent, 0.16),
		"editor.inactiveSelectionBackground": withAlpha(palette.accent, 0.12),
		"editor.findMatchBackground": withAlpha(palette.accent, 0.32),
		"editor.findMatchHighlightBackground": withAlpha(palette.accent, 0.18),
		"editor.wordHighlightBackground": withAlpha(palette.accent, 0.12),
		"editor.wordHighlightStrongBackground": withAlpha(palette.accent, 0.18),
		"editor.lineHighlightBackground": withAlpha(palette.fg, 0.04),
		"editorBracketMatch.background": withAlpha(palette.accent, 0.16),
		"list.activeSelectionBackground": withAlpha(palette.accent, 0.2),
		"list.inactiveSelectionBackground": withAlpha(palette.accent, 0.12),
		"list.hoverBackground": withAlpha(palette.fg, 0.05),
		"list.focusBackground": withAlpha(palette.accent, 0.22),
		"statusBarItem.hoverBackground": withAlpha(palette.accent, 0.14),
		"statusBarItem.prominentBackground": withAlpha(palette.accent, 0.12),
		"scrollbarSlider.background": withAlpha(palette.fg, 0.14),
		"scrollbarSlider.hoverBackground": withAlpha(palette.fg, 0.22),
		"scrollbarSlider.activeBackground": withAlpha(palette.fg, 0.3),
	};
}

const lightExtras = {
	"foreground": "#121318",
	"descriptionForeground": "#121418B8",
	"focusBorder": "#a11f31",
	"selection.background": "#a11f3133",
	"widget.border": "#12141833",
	"editor.background": "#f4efe8",
	"editor.foreground": "#121318",
	"editorCursor.foreground": "#a11f31",
	"editorLineNumber.foreground": "#7b746d",
	"editorLineNumber.activeForeground": "#121318",
	"editorIndentGuide.background1": "#1214181F",
	"editorIndentGuide.activeBackground1": "#12141833",
	"editor.selectionBackground": "#a11f3133",
	"editor.selectionHighlightBackground": "#a11f3126",
	"editor.inactiveSelectionBackground": "#a11f311F",
	"editor.lineHighlightBackground": "#1214180F",
	"editor.findMatchBackground": "#a11f3166",
	"editor.findMatchHighlightBackground": "#a11f3126",
	"editor.wordHighlightBackground": "#a11f311F",
	"editor.wordHighlightStrongBackground": "#a11f3126",
	"editorBracketMatch.background": "#a11f3126",
	"editorBracketMatch.border": "#a11f31",
	"editorGutter.addedBackground": "#3d6b52",
	"editorGutter.modifiedBackground": "#3b5b6f",
	"editorGutter.deletedBackground": "#a11f31",
	"editorHoverWidget.background": "#f8f3ed",
	"editorHoverWidget.border": "#12141833",
	"editorSuggestWidget.background": "#f8f3ed",
	"editorSuggestWidget.border": "#12141833",
	"editorWidget.background": "#f8f3ed",
	"editorWidget.border": "#12141833",
	"activityBar.background": "#f1ece4",
	"activityBar.activeBorder": "#a11f31",
	"activityBar.foreground": "#121318",
	"activityBar.inactiveForeground": "#121418B8",
	"activityBar.border": "#1214181F",
	"activityBarBadge.background": "#a11f31",
	"activityBarBadge.foreground": "#f4efe8",
	"sideBar.background": "#f1ece4",
	"sideBar.foreground": "#121318",
	"sideBar.border": "#a11f3133",
	"sideBarTitle.foreground": "#121318",
	"sideBarSectionHeader.background": "#f1ece4",
	"sideBarSectionHeader.border": "#1214181F",
	"sideBarSectionHeader.foreground": "#121318",
	"editorGroup.border": "#12141833",
	"editorGroupHeader.tabsBackground": "#f1ece4",
	"editorGroupHeader.tabsBorder": "#12141833",
	"editorGroup.dropBackground": "#a11f3126",
	"tab.activeBackground": "#f4efe8",
	"tab.activeForeground": "#121318",
	"tab.inactiveBackground": "#ede7df",
	"tab.inactiveForeground": "#121418B8",
	"tab.border": "#00000000",
	"tab.activeBorderTop": "#a11f31",
	"tab.unfocusedActiveBorderTop": "#a11f311F",
	"statusBar.background": "#e9e2da",
	"statusBar.foreground": "#121318",
	"statusBar.border": "#12141833",
	"statusBarItem.hoverBackground": "#a11f311F",
	"statusBarItem.remoteBackground": "#a11f31",
	"statusBarItem.remoteForeground": "#f4efe8",
	"statusBarItem.prominentBackground": "#a11f311F",
	"statusBarItem.prominentForeground": "#121318",
	"titleBar.activeBackground": "#ede7df",
	"titleBar.activeForeground": "#121318",
	"titleBar.inactiveBackground": "#f1ece4",
	"titleBar.inactiveForeground": "#121418B8",
	"panel.background": "#f8f3ed",
	"panel.border": "#12141833",
	"panelTitle.activeForeground": "#121318",
	"panelTitle.inactiveForeground": "#121418B8",
	"panelTitle.activeBorder": "#a11f31",
	"input.background": "#f8f3ed",
	"input.foreground": "#121318",
	"input.border": "#12141833",
	"input.placeholderForeground": "#5c5853",
	"dropdown.background": "#ffffff",
	"dropdown.foreground": "#121318",
	"dropdown.border": "#12141833",
	"chat.inputBackground": "#f8f3ed",
	"chat.inputForeground": "#121318",
	"chat.inputBorder": "#12141833",
	"chat.inputPlaceholderForeground": "#5c5853",
	"button.background": "#a11f31",
	"button.foreground": "#f4efe8",
	"button.hoverBackground": "#b92f44",
	"badge.background": "#a11f31",
	"badge.foreground": "#f4efe8",
	"list.activeSelectionBackground": "#a11f3133",
	"list.activeSelectionForeground": "#121318",
	"list.inactiveSelectionBackground": "#a11f311F",
	"list.hoverBackground": "#12141814",
	"list.focusBackground": "#a11f3133",
	"list.focusForeground": "#121318",
	"progressBar.background": "#a11f31",
	"scrollbarSlider.background": "#12141826",
	"scrollbarSlider.hoverBackground": "#1214183D",
	"scrollbarSlider.activeBackground": "#12141852",
	"terminal.background": "#f4efe8",
	"terminal.foreground": "#121318",
	"terminal.ansiBlack": "#121318",
	"terminal.ansiRed": "#a11f31",
	"terminal.ansiGreen": "#3d6b52",
	"terminal.ansiYellow": "#6a4a25",
	"terminal.ansiBlue": "#3b5b6f",
	"terminal.ansiMagenta": "#8a3a2e",
	"terminal.ansiCyan": "#5a7f8c",
	"terminal.ansiWhite": "#f4efe8",
	"terminal.ansiBrightBlack": "#7b746d",
	"terminal.ansiBrightRed": "#b92f44",
	"terminal.ansiBrightGreen": "#4b8768",
	"terminal.ansiBrightYellow": "#8a6a3a",
	"terminal.ansiBrightBlue": "#4b6f86",
	"terminal.ansiBrightMagenta": "#a34c3f",
	"terminal.ansiBrightCyan": "#6d94a1",
	"terminal.ansiBrightWhite": "#ffffff",
	"notificationCenterHeader.background": "#f1ece4",
	"notifications.background": "#f1ece4",
	"notifications.foreground": "#121318",
	"notifications.border": "#1214181F",
	"peekViewEditor.background": "#f1ece4",
	"peekViewResult.background": "#ede7df",
	"peekViewTitle.background": "#f1ece4",
	"debugToolBar.background": "#f1ece4",
};

const darkExtras = {
	"foreground": "#f2ede6",
	"descriptionForeground": "#f2ede6C7",
	"focusBorder": "#a11f31",
	"selection.background": "#a11f314D",
	"widget.border": "#f2ede633",
	"editor.background": "#07080b",
	"editor.foreground": "#f2ede6",
	"editorCursor.foreground": "#a11f31",
	"editorLineNumber.foreground": "#6f6a64",
	"editorLineNumber.activeForeground": "#f2ede6",
	"editorIndentGuide.background1": "#f2ede624",
	"editorIndentGuide.activeBackground1": "#f2ede633",
	"editor.selectionBackground": "#a11f314D",
	"editor.selectionHighlightBackground": "#a11f3126",
	"editor.inactiveSelectionBackground": "#a11f3126",
	"editor.lineHighlightBackground": "#f2ede60D",
	"editor.findMatchBackground": "#a11f3166",
	"editor.findMatchHighlightBackground": "#a11f3133",
	"editor.wordHighlightBackground": "#a11f3126",
	"editor.wordHighlightStrongBackground": "#a11f3133",
	"editorBracketMatch.background": "#a11f3126",
	"editorBracketMatch.border": "#a11f31",
	"editorGutter.addedBackground": "#a6c08a",
	"editorGutter.modifiedBackground": "#7fb0c4",
	"editorGutter.deletedBackground": "#a11f31",
	"editorHoverWidget.background": "#0b0c10",
	"editorHoverWidget.border": "#f2ede633",
	"editorSuggestWidget.background": "#0b0c10",
	"editorSuggestWidget.border": "#f2ede633",
	"editorWidget.background": "#0b0c10",
	"editorWidget.border": "#f2ede633",
	"activityBar.background": "#0a0b10",
	"activityBar.activeBorder": "#a11f31",
	"activityBar.foreground": "#f2ede6",
	"activityBar.inactiveForeground": "#f2ede6C7",
	"activityBar.border": "#f2ede624",
	"activityBarBadge.background": "#a11f31",
	"activityBarBadge.foreground": "#f2ede6",
	"sideBar.background": "#0a0b10",
	"sideBar.foreground": "#f2ede6",
	"sideBar.border": "#a11f3133",
	"sideBarTitle.foreground": "#f2ede6",
	"sideBarSectionHeader.background": "#0a0b10",
	"sideBarSectionHeader.border": "#f2ede624",
	"sideBarSectionHeader.foreground": "#f2ede6",
	"editorGroup.border": "#f2ede633",
	"editorGroupHeader.border": "#00000000",
	"editorGroupHeader.tabsBackground": "#0a0b10",
	"editorGroupHeader.tabsBorder": "#f2ede633",
	"editorGroup.dropBackground": "#a11f3126",
	"tab.activeBackground": "#07080b",
	"tab.activeForeground": "#f2ede6",
	"tab.inactiveBackground": "#0a0b10",
	"tab.inactiveForeground": "#f2ede6C7",
	"tab.border": "#00000000",
	"tab.activeBorderTop": "#a11f31",
	"tab.unfocusedActiveBorderTop": "#a11f311F",
	"statusBar.background": "#0f1118",
	"statusBar.foreground": "#f2ede6",
	"statusBar.border": "#f2ede633",
	"statusBarItem.hoverBackground": "#a11f3126",
	"statusBarItem.remoteBackground": "#a11f31",
	"statusBarItem.remoteForeground": "#f2ede6",
	"statusBarItem.prominentBackground": "#a11f3126",
	"statusBarItem.prominentForeground": "#f2ede6",
	"titleBar.activeBackground": "#0a0b10",
	"titleBar.activeForeground": "#f2ede6",
	"titleBar.inactiveBackground": "#07080b",
	"titleBar.inactiveForeground": "#f2ede6C7",
	"panel.background": "#0d0f15",
	"panel.border": "#f2ede633",
	"panelTitle.activeForeground": "#f2ede6",
	"panelTitle.inactiveForeground": "#f2ede6C7",
	"panelTitle.activeBorder": "#a11f31",
	"input.background": "#0f1118",
	"input.foreground": "#f2ede6",
	"input.border": "#f2ede633",
	"input.placeholderForeground": "#f2ede6C7",
	"dropdown.background": "#0f1118",
	"dropdown.foreground": "#f2ede6",
	"dropdown.border": "#f2ede633",
	"button.background": "#a11f31",
	"button.foreground": "#f2ede6",
	"button.hoverBackground": "#ba3447",
	"badge.background": "#a11f31",
	"badge.foreground": "#f2ede6",
	"list.activeSelectionBackground": "#a11f314D",
	"list.activeSelectionForeground": "#f2ede6",
	"list.inactiveSelectionBackground": "#a11f3126",
	"list.hoverBackground": "#f2ede614",
	"list.focusBackground": "#a11f314D",
	"list.focusForeground": "#f2ede6",
	"progressBar.background": "#a11f31",
	"scrollbarSlider.background": "#f2ede626",
	"scrollbarSlider.hoverBackground": "#f2ede63D",
	"scrollbarSlider.activeBackground": "#f2ede652",
	"terminal.background": "#07080b",
	"terminal.foreground": "#f2ede6",
	"terminal.ansiBlack": "#07080b",
	"terminal.ansiRed": "#a11f31",
	"terminal.ansiGreen": "#a6c08a",
	"terminal.ansiYellow": "#e0c28c",
	"terminal.ansiBlue": "#7fb0c4",
	"terminal.ansiMagenta": "#d7b18b",
	"terminal.ansiCyan": "#8fbad0",
	"terminal.ansiWhite": "#f2ede6",
	"terminal.ansiBrightBlack": "#6f6a64",
	"terminal.ansiBrightRed": "#ba3447",
	"terminal.ansiBrightGreen": "#b6d39c",
	"terminal.ansiBrightYellow": "#f0d09e",
	"terminal.ansiBrightBlue": "#9ac5da",
	"terminal.ansiBrightMagenta": "#e4c29f",
	"terminal.ansiBrightCyan": "#a4cfe2",
	"terminal.ansiBrightWhite": "#ffffff",
	"notificationCenterHeader.background": "#0a0b10",
	"notifications.background": "#0a0b10",
	"notifications.foreground": "#f2ede6",
	"notifications.border": "#f2ede624",
	"peekViewEditor.background": "#0a0b10",
	"peekViewResult.background": "#0f1118",
	"peekViewTitle.background": "#0a0b10",
	"debugToolBar.background": "#0a0b10",
};

const highContrastDarkExtras = {
	"foreground": "#f2ede6",
	"descriptionForeground": "#f2ede6C7",
	"focusBorder": "#a11f31",
	"selection.background": "#a11f314D",
	"widget.border": "#f2ede633",
	"editor.background": "#000000",
	"editor.foreground": "#f2ede6",
	"editorCursor.foreground": "#a11f31",
	"editorLineNumber.foreground": "#6f6a64",
	"editorLineNumber.activeForeground": "#f2ede6",
	"editorIndentGuide.background1": "#f2ede624",
	"editorIndentGuide.activeBackground1": "#f2ede633",
	"editor.selectionBackground": "#a11f314D",
	"editor.selectionHighlightBackground": "#a11f3126",
	"editor.inactiveSelectionBackground": "#a11f3126",
	"editor.lineHighlightBackground": "#f2ede60D",
	"editor.findMatchBackground": "#a11f3166",
	"editor.findMatchHighlightBackground": "#a11f3133",
	"editor.wordHighlightBackground": "#a11f3126",
	"editor.wordHighlightStrongBackground": "#a11f3133",
	"editorBracketMatch.background": "#a11f3126",
	"editorBracketMatch.border": "#a11f31",
	"editorGutter.addedBackground": "#a6c08a",
	"editorGutter.modifiedBackground": "#7fb0c4",
	"editorGutter.deletedBackground": "#a11f31",
	"editorHoverWidget.background": "#05060a",
	"editorHoverWidget.border": "#f2ede633",
	"editorSuggestWidget.background": "#05060a",
	"editorSuggestWidget.border": "#f2ede633",
	"editorWidget.background": "#05060a",
	"editorWidget.border": "#f2ede633",
	"activityBar.background": "#000000",
	"activityBar.activeBorder": "#a11f31",
	"activityBar.foreground": "#f2ede6",
	"activityBar.inactiveForeground": "#f2ede6C7",
	"activityBar.border": "#f2ede624",
	"activityBarBadge.background": "#a11f31",
	"activityBarBadge.foreground": "#f2ede6",
	"sideBar.background": "#000000",
	"sideBar.foreground": "#f2ede6",
	"sideBar.border": "#a11f3133",
	"sideBarTitle.foreground": "#f2ede6",
	"sideBarSectionHeader.background": "#000000",
	"sideBarSectionHeader.border": "#f2ede624",
	"sideBarSectionHeader.foreground": "#f2ede6",
	"editorGroup.border": "#f2ede633",
	"editorGroupHeader.border": "#00000000",
	"editorGroupHeader.tabsBackground": "#000000",
	"editorGroupHeader.tabsBorder": "#f2ede64d",
	"editorGroup.dropBackground": "#a11f3126",
	"tab.activeBackground": "#000000",
	"tab.activeForeground": "#f2ede6",
	"tab.inactiveBackground": "#000000",
	"tab.inactiveForeground": "#f2ede6C7",
	"tab.border": "#00000000",
	"tab.activeBorderTop": "#a11f31",
	"tab.unfocusedActiveBorderTop": "#a11f311F",
	"statusBar.background": "#000000",
	"statusBar.foreground": "#f2ede6",
	"statusBar.border": "#f2ede633",
	"statusBarItem.hoverBackground": "#a11f3126",
	"statusBarItem.remoteBackground": "#a11f31",
	"statusBarItem.remoteForeground": "#f2ede6",
	"statusBarItem.prominentBackground": "#a11f3126",
	"statusBarItem.prominentForeground": "#f2ede6",
	"titleBar.activeBackground": "#000000",
	"titleBar.activeForeground": "#f2ede6",
	"titleBar.inactiveBackground": "#000000",
	"titleBar.inactiveForeground": "#f2ede6C7",
	"panel.background": "#000000",
	"panel.border": "#f2ede633",
	"panelTitle.activeForeground": "#f2ede6",
	"panelTitle.inactiveForeground": "#f2ede6C7",
	"panelTitle.activeBorder": "#a11f31",
	"input.background": "#000000",
	"input.foreground": "#f2ede6",
	"input.border": "#f2ede633",
	"input.placeholderForeground": "#f2ede6C7",
	"dropdown.background": "#000000",
	"dropdown.foreground": "#f2ede6",
	"dropdown.border": "#f2ede633",
	"button.background": "#a11f31",
	"button.foreground": "#f2ede6",
	"button.hoverBackground": "#ba3447",
	"badge.background": "#a11f31",
	"badge.foreground": "#f2ede6",
	"list.activeSelectionBackground": "#a11f314D",
	"list.activeSelectionForeground": "#f2ede6",
	"list.inactiveSelectionBackground": "#a11f3126",
	"list.hoverBackground": "#f2ede614",
	"list.focusBackground": "#a11f314D",
	"list.focusForeground": "#f2ede6",
	"progressBar.background": "#a11f31",
	"scrollbarSlider.background": "#f2ede626",
	"scrollbarSlider.hoverBackground": "#f2ede63D",
	"scrollbarSlider.activeBackground": "#f2ede652",
	"terminal.background": "#000000",
	"terminal.foreground": "#f2ede6",
	"terminal.ansiBlack": "#000000",
	"terminal.ansiRed": "#a11f31",
	"terminal.ansiGreen": "#a6c08a",
	"terminal.ansiYellow": "#e0c28c",
	"terminal.ansiBlue": "#7fb0c4",
	"terminal.ansiMagenta": "#d7b18b",
	"terminal.ansiCyan": "#8fbad0",
	"terminal.ansiWhite": "#f2ede6",
	"terminal.ansiBrightBlack": "#6f6a64",
	"terminal.ansiBrightRed": "#ba3447",
	"terminal.ansiBrightGreen": "#b6d39c",
	"terminal.ansiBrightYellow": "#f0d09e",
	"terminal.ansiBrightBlue": "#9ac5da",
	"terminal.ansiBrightMagenta": "#e4c29f",
	"terminal.ansiBrightCyan": "#a4cfe2",
	"terminal.ansiBrightWhite": "#ffffff",
	"notificationCenterHeader.background": "#000000",
	"notifications.background": "#000000",
	"notifications.foreground": "#f2ede6",
	"notifications.border": "#f2ede624",
	"peekViewEditor.background": "#05060a",
	"peekViewResult.background": "#05060a",
	"peekViewTitle.background": "#05060a",
	"debugToolBar.background": "#05060a",
};

const lightFlatExtras = createFlatOverrides(lightExtras, palettes.light);
const darkFlatExtras = createFlatOverrides(darkExtras, palettes.dark);

const lightTokenExtras = [
	{
		"name": "Comments",
		"scope": "comment",
		"settings": {
			"foreground": "#6f6760",
		},
	},
	{
		"name": "Keywords",
		"scope": [
			"keyword",
			"keyword.control",
			"storage",
			"storage.type",
			"entity.name.operator",
		],
		"settings": {
			"foreground": "#a11f31",
		},
	},
	{
		"name": "Strings",
		"scope": ["string", "string.quoted", "string.template"],
		"settings": {
			"foreground": "#8a3a2e",
		},
	},
	{
		"name": "Numbers",
		"scope": [
			"constant.numeric",
			"constant.language.boolean",
			"constant.language",
			"constant.other",
		],
		"settings": {
			"foreground": "#3d6b52",
		},
	},
	{
		"name": "Functions",
		"scope": ["entity.name.function", "support.function"],
		"settings": {
			"foreground": "#6a4a25",
		},
	},
	{
		"name": "Types",
		"scope": ["support.type", "entity.name.type", "entity.name.class"],
		"settings": {
			"foreground": "#3b5b6f",
		},
	},
];

const darkTokenExtras = [
	{
		"name": "Comments",
		"scope": "comment",
		"settings": {
			"foreground": "#8c8680",
		},
	},
	{
		"name": "Keywords",
		"scope": [
			"keyword",
			"keyword.control",
			"storage",
			"storage.type",
			"entity.name.operator",
		],
		"settings": {
			"foreground": "#a11f31",
		},
	},
	{
		"name": "Strings",
		"scope": ["string", "string.quoted", "string.template"],
		"settings": {
			"foreground": "#d7b18b",
		},
	},
	{
		"name": "Numbers",
		"scope": [
			"constant.numeric",
			"constant.language.boolean",
			"constant.language",
			"constant.other",
		],
		"settings": {
			"foreground": "#a6c08a",
		},
	},
	{
		"name": "Functions",
		"scope": ["entity.name.function", "support.function"],
		"settings": {
			"foreground": "#e0c28c",
		},
	},
	{
		"name": "Types",
		"scope": ["support.type", "entity.name.type", "entity.name.class"],
		"settings": {
			"foreground": "#7fb0c4",
		},
	},
];

const lightSemanticExtras = {
	"comment": "#6f6760",
	"keyword": "#a11f31",
	"string": "#8a3a2e",
	"number": "#3d6b52",
	"class": "#3b5b6f",
	"function": "#6a4a25",
	"operator": "#a11f31",
};

const darkSemanticExtras = {
	"comment": "#8c8680",
	"keyword": "#a11f31",
	"string": "#d7b18b",
	"number": "#a6c08a",
	"class": "#7fb0c4",
	"function": "#e0c28c",
	"operator": "#a11f31",
};

const lightFull = buildTheme({
	name: "Vaporsoft Light",
	type: "light",
	baseColors: lightVs.colors || {},
	baseTokenColors: [...(lightVs.tokenColors || []), ...(lightPlus.tokenColors || [])],
	baseSemanticTokens: mergeSemanticTokens(lightVs.semanticTokenColors, lightPlus.semanticTokenColors),
	overrideColors: lightExtras,
	overrideTokenColors: lightTokenExtras,
	overrideSemanticTokens: lightSemanticExtras,
	palette: palettes.light,
});

const darkFull = buildTheme({
	name: "Vaporsoft Dark",
	type: "dark",
	baseColors: darkVs.colors || {},
	baseTokenColors: [...(darkVs.tokenColors || []), ...(darkPlus.tokenColors || [])],
	baseSemanticTokens: mergeSemanticTokens(darkVs.semanticTokenColors, darkPlus.semanticTokenColors),
	overrideColors: darkExtras,
	overrideTokenColors: darkTokenExtras,
	overrideSemanticTokens: darkSemanticExtras,
	palette: palettes.dark,
});

const highContrastDarkFull = buildTheme({
	name: "Vaporsoft Dark High Contrast",
	type: "dark",
	baseColors: darkVs.colors || {},
	baseTokenColors: [...(darkVs.tokenColors || []), ...(darkPlus.tokenColors || [])],
	baseSemanticTokens: mergeSemanticTokens(darkVs.semanticTokenColors, darkPlus.semanticTokenColors),
	overrideColors: highContrastDarkExtras,
	overrideTokenColors: darkTokenExtras,
	overrideSemanticTokens: darkSemanticExtras,
	palette: palettes.highContrastDark,
});

const highContrastLightFull = buildTheme({
	name: "Vaporsoft Light High Contrast",
	type: "light",
	baseColors: lightVs.colors || {},
	baseTokenColors: [...(lightVs.tokenColors || []), ...(lightPlus.tokenColors || [])],
	baseSemanticTokens: mergeSemanticTokens(lightVs.semanticTokenColors, lightPlus.semanticTokenColors),
	overrideColors: lightExtras,
	overrideTokenColors: lightTokenExtras,
	overrideSemanticTokens: lightSemanticExtras,
	palette: palettes.highContrastLight,
});

const lightFlat = buildTheme({
	name: "Vaporsoft Light Flat",
	type: "light",
	baseColors: lightVs.colors || {},
	baseTokenColors: [...(lightVs.tokenColors || []), ...(lightPlus.tokenColors || [])],
	baseSemanticTokens: mergeSemanticTokens(lightVs.semanticTokenColors, lightPlus.semanticTokenColors),
	overrideColors: lightFlatExtras,
	overrideTokenColors: lightTokenExtras,
	overrideSemanticTokens: lightSemanticExtras,
	palette: palettes.light,
});

const darkFlat = buildTheme({
	name: "Vaporsoft Dark Flat",
	type: "dark",
	baseColors: darkVs.colors || {},
	baseTokenColors: [...(darkVs.tokenColors || []), ...(darkPlus.tokenColors || [])],
	baseSemanticTokens: mergeSemanticTokens(darkVs.semanticTokenColors, darkPlus.semanticTokenColors),
	overrideColors: darkFlatExtras,
	overrideTokenColors: darkTokenExtras,
	overrideSemanticTokens: darkSemanticExtras,
	palette: palettes.dark,
});

writeTheme(path.join(themeDir, "vaporsoft-light.json"), lightFull);
writeTheme(path.join(themeDir, "vaporsoft-dark.json"), darkFull);
writeTheme(path.join(themeDir, "vaporsoft-dark-high-contrast.json"), highContrastDarkFull);
writeTheme(path.join(themeDir, "vaporsoft-light-high-contrast.json"), highContrastLightFull);
writeTheme(path.join(themeDir, "vaporsoft-light-flat.json"), lightFlat);
writeTheme(path.join(themeDir, "vaporsoft-dark-flat.json"), darkFlat);

runValidation({ baseDir, themeDir });

console.log("Themes rebuilt and validated with full coverage.");

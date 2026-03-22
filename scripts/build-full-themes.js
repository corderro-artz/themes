const fs = require("fs");
const path = require("path");

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
		line: "#f2ede61f",
		lineStrong: "#f2ede633",
		accent: "#a11f31",
		accentHover: "#ba3447",
		success: "#a6c08a",
		warning: "#e0c28c",
		info: "#7fb0c4",
	},
	oled: {
		bg: "#000000",
		bgAlt: "#020203",
		bgAlt2: "#0b0c10",
		panel: "#0a0a0a",
		fg: "#f2ede6",
		fgMuted: "#f2ede6c7",
		line: "#f2ede61f",
		lineStrong: "#f2ede633",
		accent: "#a11f31",
		accentHover: "#ba3447",
		success: "#a6c08a",
		warning: "#e0c28c",
		info: "#7fb0c4",
	},
};

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
	"sideBar.border": "#1214181F",
	"sideBarTitle.foreground": "#121318",
	"sideBarSectionHeader.background": "#f1ece4",
	"sideBarSectionHeader.border": "#1214181F",
	"sideBarSectionHeader.foreground": "#121318",
	"editorGroup.border": "#1214181F",
	"editorGroupHeader.tabsBackground": "#f1ece4",
	"editorGroupHeader.tabsBorder": "#1214181F",
	"editorGroup.dropBackground": "#a11f3126",
	"tab.activeBackground": "#f4efe8",
	"tab.activeForeground": "#121318",
	"tab.inactiveBackground": "#ede7df",
	"tab.inactiveForeground": "#121418B8",
	"tab.border": "#1214181F",
	"tab.activeBorderTop": "#a11f31",
	"tab.unfocusedActiveBorderTop": "#a11f311F",
	"statusBar.background": "#ede7df",
	"statusBar.foreground": "#121318",
	"statusBar.border": "#1214181F",
	"statusBarItem.hoverBackground": "#a11f311F",
	"statusBarItem.remoteBackground": "#a11f31",
	"statusBarItem.remoteForeground": "#f4efe8",
	"statusBarItem.prominentBackground": "#a11f311F",
	"statusBarItem.prominentForeground": "#121318",
	"titleBar.activeBackground": "#ede7df",
	"titleBar.activeForeground": "#121318",
	"titleBar.inactiveBackground": "#f1ece4",
	"titleBar.inactiveForeground": "#121418B8",
	"panel.background": "#f1ece4",
	"panel.border": "#1214181F",
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
	"editorIndentGuide.background1": "#f2ede61F",
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
	"activityBar.background": "#07080b",
	"activityBar.activeBorder": "#a11f31",
	"activityBar.foreground": "#f2ede6",
	"activityBar.inactiveForeground": "#f2ede6C7",
	"activityBar.border": "#f2ede61F",
	"activityBarBadge.background": "#a11f31",
	"activityBarBadge.foreground": "#f2ede6",
	"sideBar.background": "#0a0b10",
	"sideBar.foreground": "#f2ede6",
	"sideBar.border": "#f2ede61F",
	"sideBarTitle.foreground": "#f2ede6",
	"sideBarSectionHeader.background": "#0a0b10",
	"sideBarSectionHeader.border": "#f2ede61F",
	"sideBarSectionHeader.foreground": "#f2ede6",
	"editorGroup.border": "#f2ede61F",
	"editorGroupHeader.tabsBackground": "#0a0b10",
	"editorGroupHeader.tabsBorder": "#f2ede61F",
	"editorGroup.dropBackground": "#a11f3126",
	"tab.activeBackground": "#07080b",
	"tab.activeForeground": "#f2ede6",
	"tab.inactiveBackground": "#0a0b10",
	"tab.inactiveForeground": "#f2ede6C7",
	"tab.border": "#f2ede61F",
	"tab.activeBorderTop": "#a11f31",
	"tab.unfocusedActiveBorderTop": "#a11f311F",
	"statusBar.background": "#0a0b10",
	"statusBar.foreground": "#f2ede6",
	"statusBar.border": "#f2ede61F",
	"statusBarItem.hoverBackground": "#a11f3126",
	"statusBarItem.remoteBackground": "#a11f31",
	"statusBarItem.remoteForeground": "#f2ede6",
	"statusBarItem.prominentBackground": "#a11f3126",
	"statusBarItem.prominentForeground": "#f2ede6",
	"titleBar.activeBackground": "#0a0b10",
	"titleBar.activeForeground": "#f2ede6",
	"titleBar.inactiveBackground": "#07080b",
	"titleBar.inactiveForeground": "#f2ede6C7",
	"panel.background": "#0a0b10",
	"panel.border": "#f2ede61F",
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
	"notifications.border": "#f2ede61F",
	"peekViewEditor.background": "#0a0b10",
	"peekViewResult.background": "#0f1118",
	"peekViewTitle.background": "#0a0b10",
	"debugToolBar.background": "#0a0b10",
};

const oledExtras = {
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
	"editorIndentGuide.background1": "#f2ede61F",
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
	"editorHoverWidget.background": "#0a0a0a",
	"editorHoverWidget.border": "#f2ede633",
	"editorSuggestWidget.background": "#0a0a0a",
	"editorSuggestWidget.border": "#f2ede633",
	"editorWidget.background": "#0a0a0a",
	"editorWidget.border": "#f2ede633",
	"activityBar.background": "#000000",
	"activityBar.activeBorder": "#a11f31",
	"activityBar.foreground": "#f2ede6",
	"activityBar.inactiveForeground": "#f2ede6C7",
	"activityBar.border": "#f2ede61F",
	"activityBarBadge.background": "#a11f31",
	"activityBarBadge.foreground": "#f2ede6",
	"sideBar.background": "#020203",
	"sideBar.foreground": "#f2ede6",
	"sideBar.border": "#f2ede61F",
	"sideBarTitle.foreground": "#f2ede6",
	"sideBarSectionHeader.background": "#020203",
	"sideBarSectionHeader.border": "#f2ede61F",
	"sideBarSectionHeader.foreground": "#f2ede6",
	"editorGroup.border": "#f2ede61F",
	"editorGroupHeader.tabsBackground": "#020203",
	"editorGroupHeader.tabsBorder": "#f2ede61F",
	"editorGroup.dropBackground": "#a11f3126",
	"tab.activeBackground": "#000000",
	"tab.activeForeground": "#f2ede6",
	"tab.inactiveBackground": "#000000",
	"tab.inactiveForeground": "#f2ede6C7",
	"tab.border": "#f2ede61F",
	"tab.activeBorderTop": "#a11f31",
	"tab.unfocusedActiveBorderTop": "#a11f311F",
	"statusBar.background": "#000000",
	"statusBar.foreground": "#f2ede6",
	"statusBar.border": "#f2ede61F",
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
	"panel.border": "#f2ede61F",
	"panelTitle.activeForeground": "#f2ede6",
	"panelTitle.inactiveForeground": "#f2ede6C7",
	"panelTitle.activeBorder": "#a11f31",
	"input.background": "#0b0c10",
	"input.foreground": "#f2ede6",
	"input.border": "#f2ede633",
	"input.placeholderForeground": "#f2ede6C7",
	"dropdown.background": "#0b0c10",
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
	"notifications.border": "#f2ede61F",
	"peekViewEditor.background": "#000000",
	"peekViewResult.background": "#0b0c10",
	"peekViewTitle.background": "#000000",
	"debugToolBar.background": "#000000",
};

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
	name: "VaporSoft Light",
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
	name: "VaporSoft Dark",
	type: "dark",
	baseColors: darkVs.colors || {},
	baseTokenColors: [...(darkVs.tokenColors || []), ...(darkPlus.tokenColors || [])],
	baseSemanticTokens: mergeSemanticTokens(darkVs.semanticTokenColors, darkPlus.semanticTokenColors),
	overrideColors: darkExtras,
	overrideTokenColors: darkTokenExtras,
	overrideSemanticTokens: darkSemanticExtras,
	palette: palettes.dark,
});

const oledFull = buildTheme({
	name: "VaporSoft OLED",
	type: "dark",
	baseColors: darkVs.colors || {},
	baseTokenColors: [...(darkVs.tokenColors || []), ...(darkPlus.tokenColors || [])],
	baseSemanticTokens: mergeSemanticTokens(darkVs.semanticTokenColors, darkPlus.semanticTokenColors),
	overrideColors: oledExtras,
	overrideTokenColors: darkTokenExtras,
	overrideSemanticTokens: darkSemanticExtras,
	palette: palettes.oled,
});

writeTheme(path.join(themeDir, "vaporsoft-light.json"), lightFull);
writeTheme(path.join(themeDir, "vaporsoft-dark.json"), darkFull);
writeTheme(path.join(themeDir, "vaporsoft-oled.json"), oledFull);

console.log("Themes rebuilt with full coverage.");

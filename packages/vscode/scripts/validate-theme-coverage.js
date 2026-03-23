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

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function stableStringify(value) {
	if (value === null || typeof value !== "object") {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map(stableStringify).join(",")}]`;
	}
	const keys = Object.keys(value).sort();
	const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
	return `{${entries.join(",")}}`;
}

function ensure(condition, message, errors) {
	if (!condition) {
		errors.push(message);
	}
}

function validateTheme({ label, theme, baseColors, baseTokenColors, baseSemanticTokens, errors }) {
	const colors = theme.colors || {};
	const colorKeys = Object.keys(baseColors || {});
	const missingColors = colorKeys.filter((key) => !(key in colors));
	const emptyColors = colorKeys.filter((key) => typeof colors[key] !== "string" || colors[key].trim() === "");

	ensure(colorKeys.length > 0, `${label}: base theme has no color keys`, errors);
	ensure(!missingColors.length, `${label}: missing ${missingColors.length} color keys`, errors);
	ensure(!emptyColors.length, `${label}: ${emptyColors.length} color keys are empty`, errors);

	const baseTokens = baseTokenColors || [];
	const themeTokens = Array.isArray(theme.tokenColors) ? theme.tokenColors : [];
	ensure(Array.isArray(theme.tokenColors), `${label}: tokenColors is missing or not an array`, errors);
	ensure(themeTokens.length >= baseTokens.length, `${label}: tokenColors length ${themeTokens.length} < ${baseTokens.length}`, errors);

	if (baseTokens.length && themeTokens.length) {
		const themeTokenSet = new Set(themeTokens.map(stableStringify));
		let missingTokenCount = 0;
		for (const token of baseTokens) {
			if (!themeTokenSet.has(stableStringify(token))) {
				missingTokenCount += 1;
			}
		}
		ensure(!missingTokenCount, `${label}: missing ${missingTokenCount} base token entries`, errors);
	}

	const baseSemantic = baseSemanticTokens || {};
	const themeSemantic = theme.semanticTokenColors || {};
	const baseSemanticKeys = Object.keys(baseSemantic);
	const missingSemantic = baseSemanticKeys.filter((key) => !(key in themeSemantic));
	ensure(theme.semanticHighlighting === true, `${label}: semanticHighlighting is not enabled`, errors);
	ensure(!missingSemantic.length, `${label}: missing ${missingSemantic.length} semantic token keys`, errors);
}

function runValidation(options = {}) {
	const root = path.resolve(__dirname, "..");
	const baseDir = options.baseDir || path.join(root, "themes", "base");
	const themeDir = options.themeDir || path.join(root, "themes");

	const lightVsPath = path.join(baseDir, "light_vs.json");
	const lightPlusPath = path.join(baseDir, "light_plus.json");
	const darkVsPath = path.join(baseDir, "dark_vs.json");
	const darkPlusPath = path.join(baseDir, "dark_plus.json");

	const lightVs = readJsonc(lightVsPath);
	const lightPlus = readJsonc(lightPlusPath);
	const darkVs = readJsonc(darkVsPath);
	const darkPlus = readJsonc(darkPlusPath);

	const lightTheme = readJson(path.join(themeDir, "vaporsoft-light.json"));
	const darkTheme = readJson(path.join(themeDir, "vaporsoft-dark.json"));
	const highContrastDarkTheme = readJson(path.join(themeDir, "vaporsoft-dark-high-contrast.json"));
	const highContrastLightTheme = readJson(path.join(themeDir, "vaporsoft-light-high-contrast.json"));
	const lightFlatTheme = readJson(path.join(themeDir, "vaporsoft-light-flat.json"));
	const darkFlatTheme = readJson(path.join(themeDir, "vaporsoft-dark-flat.json"));

	const errors = [];

	validateTheme({
		label: "Light",
		theme: lightTheme,
		baseColors: lightVs.colors || {},
		baseTokenColors: [...(lightVs.tokenColors || []), ...(lightPlus.tokenColors || [])],
		baseSemanticTokens: {
			...(lightVs.semanticTokenColors || {}),
			...(lightPlus.semanticTokenColors || {}),
		},
		errors,
	});

	validateTheme({
		label: "Dark",
		theme: darkTheme,
		baseColors: darkVs.colors || {},
		baseTokenColors: [...(darkVs.tokenColors || []), ...(darkPlus.tokenColors || [])],
		baseSemanticTokens: {
			...(darkVs.semanticTokenColors || {}),
			...(darkPlus.semanticTokenColors || {}),
		},
		errors,
	});

	validateTheme({
		label: "High Contrast Dark",
		theme: highContrastDarkTheme,
		baseColors: darkVs.colors || {},
		baseTokenColors: [...(darkVs.tokenColors || []), ...(darkPlus.tokenColors || [])],
		baseSemanticTokens: {
			...(darkVs.semanticTokenColors || {}),
			...(darkPlus.semanticTokenColors || {}),
		},
		errors,
	});

	validateTheme({
		label: "High Contrast Light",
		theme: highContrastLightTheme,
		baseColors: lightVs.colors || {},
		baseTokenColors: [...(lightVs.tokenColors || []), ...(lightPlus.tokenColors || [])],
		baseSemanticTokens: {
			...(lightVs.semanticTokenColors || {}),
			...(lightPlus.semanticTokenColors || {}),
		},
		errors,
	});

	validateTheme({
		label: "Light Flat",
		theme: lightFlatTheme,
		baseColors: lightVs.colors || {},
		baseTokenColors: [...(lightVs.tokenColors || []), ...(lightPlus.tokenColors || [])],
		baseSemanticTokens: {
			...(lightVs.semanticTokenColors || {}),
			...(lightPlus.semanticTokenColors || {}),
		},
		errors,
	});

	validateTheme({
		label: "Dark Flat",
		theme: darkFlatTheme,
		baseColors: darkVs.colors || {},
		baseTokenColors: [...(darkVs.tokenColors || []), ...(darkPlus.tokenColors || [])],
		baseSemanticTokens: {
			...(darkVs.semanticTokenColors || {}),
			...(darkPlus.semanticTokenColors || {}),
		},
		errors,
	});


	if (errors.length) {
		console.error("Theme coverage validation failed:");
		for (const error of errors) {
			console.error(`- ${error}`);
		}
		process.exit(1);
	}

	console.log("Theme coverage validation passed.");
}

if (require.main === module) {
	runValidation();
}

module.exports = { runValidation };

import { parseArgs } from "node:util";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
//#region src/exit-codes.ts
const EXIT = {
	SUCCESS: 0,
	GENERIC_FAILURE: 1,
	CONFIGURATION_ERROR: 10,
	MISSING_INPUTS: 30,
	TAG_MISMATCH: 40,
	TRANSFORM_FAILURE: 50
};
//#endregion
//#region src/capabilities.ts
function buildCapabilitiesReport() {
	return {
		schemaVersion: 1,
		name: "prepare-dist",
		version: readSelfVersion(),
		features: [
			"transform",
			"copy-metadata",
			"verify-tag",
			"json-output",
			"plugins"
		],
		flags: [
			{
				name: "--path",
				type: "string"
			},
			{
				name: "--dist",
				type: "string"
			},
			{
				name: "--tag",
				type: "string"
			},
			{
				name: "--json",
				type: "boolean"
			},
			{
				name: "--capabilities",
				type: "boolean"
			},
			{
				name: "--help",
				type: "boolean"
			}
		],
		jsonSchemas: [{
			flag: "--json",
			schema: "PrepareDistReport",
			version: 1
		}, {
			flag: "--capabilities --json",
			schema: "CapabilitiesReport",
			version: 1
		}],
		exitCodes: [
			{
				code: EXIT.SUCCESS,
				name: "SUCCESS"
			},
			{
				code: EXIT.GENERIC_FAILURE,
				name: "GENERIC_FAILURE"
			},
			{
				code: EXIT.CONFIGURATION_ERROR,
				name: "CONFIGURATION_ERROR"
			},
			{
				code: EXIT.MISSING_INPUTS,
				name: "MISSING_INPUTS"
			},
			{
				code: EXIT.TAG_MISMATCH,
				name: "TAG_MISMATCH"
			},
			{
				code: EXIT.TRANSFORM_FAILURE,
				name: "TRANSFORM_FAILURE"
			}
		]
	};
}
function parsePackageVersion(content) {
	try {
		const parsed = JSON.parse(content);
		if (typeof parsed === "object" && parsed !== null && "version" in parsed && typeof parsed.version === "string") return parsed.version;
	} catch {}
	return "0.0.0";
}
function readSelfVersion() {
	return parsePackageVersion(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf-8"));
}
//#endregion
//#region src/strip-dist-prefix.ts
function stripDistPrefix(text, distName) {
	return text.replaceAll(`./${distName}/`, "./").replaceAll(`"${distName}/`, "\"");
}
function stripDistPrefixWithCount(text, distName) {
	const dotPattern = `./${distName}/`;
	const quotePattern = `"${distName}/`;
	const dotCount = countOccurrences(text, dotPattern);
	const quoteCount = countOccurrences(text, quotePattern);
	return {
		text: text.replaceAll(dotPattern, "./").replaceAll(quotePattern, "\""),
		replacedCount: dotCount + quoteCount
	};
}
function countOccurrences(haystack, needle) {
	let count = 0;
	let position = 0;
	while ((position = haystack.indexOf(needle, position)) !== -1) {
		count++;
		position += needle.length;
	}
	return count;
}
//#endregion
//#region src/transform-package.ts
const REMOVABLE_FIELDS = [
	"scripts",
	"devDependencies",
	"files"
];
function transformPackage({ packageDir, distDir, distName }) {
	const raw = readFileSync(resolve(packageDir, "package.json"), "utf-8");
	const sourcePackageJsonHash = sha256(raw);
	const { text: stripped, replacedCount } = stripDistPrefixWithCount(raw, distName);
	const pkg = JSON.parse(stripped);
	const strippedFields = [];
	for (const field of REMOVABLE_FIELDS) if (field in pkg) {
		strippedFields.push(field);
		delete pkg[field];
	}
	const output = JSON.stringify(pkg, null, 2) + "\n";
	writeFileSync(resolve(distDir, "package.json"), output);
	return {
		strippedFields,
		distPrefixStripped: replacedCount,
		sourcePackageJsonHash,
		outputPackageJsonHash: sha256(output),
		outputSizeBytes: Buffer.byteLength(output, "utf-8")
	};
}
function sha256(content) {
	return createHash("sha256").update(content).digest("hex");
}
//#endregion
//#region src/copy-metadata.ts
const METADATA_FILES = [
	"README.md",
	"LICENSE",
	"CHANGELOG.md",
	"SECURITY.md",
	"NOTICE"
];
function copyMetadata(packageDir, distDir) {
	const copied = [];
	for (const file of METADATA_FILES) {
		const source = resolve(packageDir, file);
		if (existsSync(source)) {
			copyFileSync(source, resolve(distDir, file));
			copied.push(file);
		}
	}
	return copied;
}
//#endregion
//#region src/plugins/nx-config.ts
const NX_CONFIG_FILES = ["executors.json", "generators.json"];
const NX_ENTRY_KEYS = ["executors", "generators"];
const SRC_PREFIX_PATTERN = /^\.\/src\//;
function transformSchemaEntry(entry, packageDir, distDir) {
	if (!entry.schema) return;
	const sourceFile = resolve(packageDir, entry.schema);
	if (!existsSync(sourceFile)) {
		console.log(`::warning::Schema file "${entry.schema}" not found, skipping`);
		return;
	}
	const strippedPath = entry.schema.replace(SRC_PREFIX_PATTERN, "./");
	const destFile = resolve(distDir, strippedPath);
	mkdirSync(dirname(destFile), { recursive: true });
	copyFileSync(sourceFile, destFile);
	entry.schema = strippedPath;
}
function transformNxConfigs({ packageDir, distDir, distName }) {
	for (const configName of NX_CONFIG_FILES) {
		const configPath = resolve(packageDir, configName);
		if (!existsSync(configPath)) continue;
		const raw = readFileSync(configPath, "utf-8");
		const config = JSON.parse(stripDistPrefix(raw, distName));
		for (const key of NX_ENTRY_KEYS) {
			const entries = config[key];
			if (!entries) continue;
			for (const entry of Object.values(entries)) transformSchemaEntry(entry, packageDir, distDir);
		}
		writeFileSync(resolve(distDir, configName), JSON.stringify(config, null, 2) + "\n");
	}
}
function nxConfigPlugin() {
	return {
		name: "nx-config",
		execute: transformNxConfigs
	};
}
//#endregion
//#region src/plugins/custom-elements-manifest.ts
function transformCustomElementsManifest({ packageDir, distDir, distName }) {
	const source = resolve(packageDir, "custom-elements.json");
	if (!existsSync(source)) return;
	const stripped = stripDistPrefix(readFileSync(source, "utf-8"), distName);
	writeFileSync(resolve(distDir, "custom-elements.json"), stripped);
}
function customElementsManifestPlugin() {
	return {
		name: "custom-elements-manifest",
		execute: transformCustomElementsManifest
	};
}
//#endregion
//#region src/prepare-dist.ts
const BUILT_IN_PLUGINS = [nxConfigPlugin(), customElementsManifestPlugin()];
function prepareDist({ path = ".", dist = "dist", plugins = [] } = {}) {
	const start = Date.now();
	const packageDir = resolve(path);
	const distDir = resolve(packageDir, dist);
	if (!existsSync(distDir)) throw new Error(`Dist directory does not exist: ${distDir}`);
	const sourcePackageJson = resolve(packageDir, "package.json");
	if (!existsSync(sourcePackageJson)) throw new Error(`No package.json found in: ${packageDir}`);
	const sourcePackageJsonRaw = readFileSync(sourcePackageJson, "utf-8");
	const sourcePackageJsonHash = createHash("sha256").update(sourcePackageJsonRaw).digest("hex");
	const transformResult = transformPackage({
		packageDir,
		distDir,
		distName: dist
	});
	const metadataCopied = copyMetadata(process.cwd(), distDir);
	const pluginsApplied = [];
	for (const plugin of [...BUILT_IN_PLUGINS, ...plugins]) {
		plugin.execute({
			packageDir,
			distDir,
			distName: dist
		});
		pluginsApplied.push(plugin.name);
	}
	return {
		schemaVersion: 1,
		source: {
			path: packageDir,
			packageJsonHash: sourcePackageJsonHash
		},
		output: {
			distPath: distDir,
			packageJsonHash: transformResult.outputPackageJsonHash,
			sizeBytes: transformResult.outputSizeBytes
		},
		transforms: {
			strippedFields: transformResult.strippedFields,
			distPrefixStripped: transformResult.distPrefixStripped,
			metadataCopied,
			pluginsApplied
		},
		versionVerification: null,
		durationMs: Date.now() - start
	};
}
//#endregion
//#region src/verify-tag.ts
var VerifyTagError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "VerifyTagError";
	}
};
function verifyTag({ distDir, tag }) {
	const version = tag.replace(/^.*v(?=\d)/, "");
	if (!/^\d+\.\d+\.\d+/.test(version)) throw new VerifyTagError(`Could not extract a valid version from tag "${tag}"`);
	const pkg = JSON.parse(readFileSync(resolve(distDir, "package.json"), "utf-8"));
	return {
		tag,
		version,
		packageVersion: pkg.version,
		matches: pkg.version === version
	};
}
//#endregion
//#region src/cli.ts
function errorMessage(error) {
	return error instanceof Error ? error.message : String(error);
}
var CliError = class extends Error {
	exitCode;
	constructor(message, exitCode) {
		super(message);
		this.name = "CliError";
		this.exitCode = exitCode;
	}
};
function parseCliArgs(argv) {
	const { values } = parseArgs({
		args: [...argv],
		options: {
			path: { type: "string" },
			dist: { type: "string" },
			tag: { type: "string" },
			json: {
				type: "boolean",
				default: false
			},
			capabilities: {
				type: "boolean",
				default: false
			},
			help: {
				type: "boolean",
				default: false
			}
		},
		allowPositionals: false,
		strict: true
	});
	return {
		helpRequested: Boolean(values.help),
		options: {
			path: values.path,
			dist: values.dist,
			tag: values.tag,
			json: Boolean(values.json),
			capabilities: Boolean(values.capabilities)
		}
	};
}
function printUsage(logger = console) {
	logger.log(`prepare-dist — Prepare a dist directory for npm publishing

Usage:
  prepare-dist [--path <dir>] [--dist <name>] [--tag <tag>] [--json]
  prepare-dist --capabilities [--json]
  prepare-dist --help

Options:
  --path <dir>      package directory (default: ".")
  --dist <name>     dist subdirectory (default: "dist")
  --tag <tag>       git tag to verify against package.json#version
  --json            emit a machine-readable PrepareDistReport
  --capabilities    emit a CapabilitiesReport describing the CLI surface
  --help            show this help

When invoked from a GitHub Action, INPUT_PATH / INPUT_DIST / INPUT_TAG
environment variables are translated into the corresponding flags by
the action entry shim.`);
}
async function runCli(argv, logger = console) {
	let parsed;
	try {
		parsed = parseCliArgs(argv);
	} catch (error) {
		const message = errorMessage(error);
		logger.error(`Error: ${message}`);
		logger.error("Run with --help for usage");
		return EXIT.CONFIGURATION_ERROR;
	}
	const { options, helpRequested } = parsed;
	if (helpRequested) {
		printUsage(logger);
		return EXIT.SUCCESS;
	}
	if (options.capabilities) {
		const report = buildCapabilitiesReport();
		logger.log(JSON.stringify(report, null, 2));
		return EXIT.SUCCESS;
	}
	let report;
	try {
		report = prepareDist({
			path: options.path,
			dist: options.dist
		});
	} catch (error) {
		const message = errorMessage(error);
		if (message.includes("Dist directory does not exist") || message.includes("No package.json found")) {
			logger.error(`Error: ${message}`);
			return EXIT.MISSING_INPUTS;
		}
		logger.error(`Error: ${message}`);
		return EXIT.TRANSFORM_FAILURE;
	}
	if (typeof options.tag === "string" && options.tag !== "") try {
		const verification = verifyTag({
			distDir: report.output.distPath,
			tag: options.tag
		});
		report = {
			...report,
			versionVerification: verification
		};
		if (!verification.matches) {
			if (options.json) logger.log(JSON.stringify(report, null, 2));
			else logger.error(`Error: tag version "${verification.version}" (from "${verification.tag}") does not match package.json version "${verification.packageVersion}"`);
			return EXIT.TAG_MISMATCH;
		}
	} catch (error) {
		const message = errorMessage(error);
		logger.error(`Error: ${message}`);
		return EXIT.TAG_MISMATCH;
	}
	if (options.json) logger.log(JSON.stringify(report, null, 2));
	else logger.log(formatPrepareDistReportHuman(report));
	return EXIT.SUCCESS;
}
function formatPrepareDistReportHuman(report) {
	const lines = [];
	lines.push(`prepare-dist — ${report.output.distPath}`);
	lines.push("");
	lines.push(`  source       ${report.source.path} (sha256:${report.source.packageJsonHash.slice(0, 12)}…)`);
	lines.push(`  output       ${report.output.sizeBytes} bytes (sha256:${report.output.packageJsonHash.slice(0, 12)}…)`);
	lines.push(`  stripped     ${report.transforms.strippedFields.join(", ") || "(none)"}`);
	lines.push(`  prefix-fixed ${report.transforms.distPrefixStripped} reference(s)`);
	lines.push(`  metadata     ${report.transforms.metadataCopied.join(", ") || "(none)"}`);
	lines.push(`  plugins      ${report.transforms.pluginsApplied.join(", ") || "(none)"}`);
	if (report.versionVerification !== null) {
		const v = report.versionVerification;
		lines.push(`  tag-check    ${v.matches ? "✓" : "✗"} tag=${v.tag} pkg=${v.packageVersion}`);
	}
	lines.push(`  duration     ${report.durationMs}ms`);
	return lines.join("\n");
}
//#endregion
export { printUsage as a, stripDistPrefix as c, parseCliArgs as i, buildCapabilitiesReport as l, errorMessage as n, runCli as o, formatPrepareDistReportHuman as r, prepareDist as s, CliError as t, EXIT as u };

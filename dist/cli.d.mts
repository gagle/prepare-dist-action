//#region src/interfaces/cli.interface.d.ts
interface CliOptions {
  readonly path?: string;
  readonly dist?: string;
  readonly tag?: string;
  readonly json?: boolean;
  readonly capabilities?: boolean;
}
interface VerifyTagReport {
  readonly tag: string;
  readonly version: string;
  readonly packageVersion: string;
  readonly matches: boolean;
}
interface TransformPackageReport {
  readonly strippedFields: ReadonlyArray<string>;
  readonly distPrefixStripped: number;
  readonly sourcePackageJsonHash: string;
  readonly outputPackageJsonHash: string;
  readonly outputSizeBytes: number;
}
interface PrepareDistReport {
  readonly schemaVersion: 1;
  readonly source: {
    readonly path: string;
    readonly packageJsonHash: string;
  };
  readonly output: {
    readonly distPath: string;
    readonly packageJsonHash: string;
    readonly sizeBytes: number;
  };
  readonly transforms: {
    readonly strippedFields: ReadonlyArray<string>;
    readonly distPrefixStripped: number;
    readonly metadataCopied: ReadonlyArray<string>;
    readonly pluginsApplied: ReadonlyArray<string>;
  };
  readonly versionVerification: VerifyTagReport | null;
  readonly durationMs: number;
}
interface CapabilitiesFlag {
  readonly name: string;
  readonly type: "boolean" | "string";
}
interface CapabilitiesJsonSchema {
  readonly flag: string;
  readonly schema: string;
  readonly version: number;
}
interface CapabilitiesExitCode {
  readonly code: number;
  readonly name: string;
}
interface CapabilitiesReport {
  readonly schemaVersion: 1;
  readonly name: "prepare-dist";
  readonly version: string;
  readonly features: ReadonlyArray<string>;
  readonly flags: ReadonlyArray<CapabilitiesFlag>;
  readonly jsonSchemas: ReadonlyArray<CapabilitiesJsonSchema>;
  readonly exitCodes: ReadonlyArray<CapabilitiesExitCode>;
}
interface Logger {
  readonly log: (message: string) => void;
}
interface RuntimeLogger extends Logger {
  readonly error: (message: string) => void;
}
//#endregion
//#region src/cli.d.ts
declare function errorMessage(error: unknown): string;
declare class CliError extends Error {
  readonly exitCode: number;
  constructor(message: string, exitCode: number);
}
interface ParseCliArgsResult {
  readonly options: CliOptions;
  readonly helpRequested: boolean;
}
declare function parseCliArgs(argv: ReadonlyArray<string>): ParseCliArgsResult;
declare function printUsage(logger?: {
  log: (m: string) => void;
}): void;
declare function runCli(argv: ReadonlyArray<string>, logger?: RuntimeLogger): Promise<number>;
declare function formatPrepareDistReportHuman(report: PrepareDistReport): string;
//#endregion
export { VerifyTagReport as _, parseCliArgs as a, CapabilitiesExitCode as c, CapabilitiesReport as d, CliOptions as f, TransformPackageReport as g, RuntimeLogger as h, formatPrepareDistReportHuman as i, CapabilitiesFlag as l, PrepareDistReport as m, ParseCliArgsResult as n, printUsage as o, Logger as p, errorMessage as r, runCli as s, CliError as t, CapabilitiesJsonSchema as u };
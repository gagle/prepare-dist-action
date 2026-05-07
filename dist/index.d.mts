import { _ as VerifyTagReport, a as parseCliArgs, c as CapabilitiesExitCode, d as CapabilitiesReport, f as CliOptions, g as TransformPackageReport, h as RuntimeLogger, i as formatPrepareDistReportHuman, l as CapabilitiesFlag, m as PrepareDistReport, p as Logger, s as runCli, t as CliError, u as CapabilitiesJsonSchema } from "./cli.mjs";

//#region src/types.d.ts
interface PrepareDistContext {
  readonly packageDir: string;
  readonly distDir: string;
  readonly distName: string;
}
interface PrepareDistPlugin {
  readonly name: string;
  execute(context: PrepareDistContext): void;
}
//#endregion
//#region src/prepare-dist.d.ts
interface PrepareDistOptions {
  readonly path?: string;
  readonly dist?: string;
  readonly plugins?: ReadonlyArray<PrepareDistPlugin>;
}
declare function prepareDist({
  path,
  dist,
  plugins
}?: PrepareDistOptions): PrepareDistReport;
//#endregion
//#region src/strip-dist-prefix.d.ts
declare function stripDistPrefix(text: string, distName: string): string;
//#endregion
//#region src/capabilities.d.ts
declare function buildCapabilitiesReport(): CapabilitiesReport;
//#endregion
//#region src/exit-codes.d.ts
declare const EXIT: {
  readonly SUCCESS: 0;
  readonly GENERIC_FAILURE: 1;
  readonly CONFIGURATION_ERROR: 10;
  readonly MISSING_INPUTS: 30;
  readonly TAG_MISMATCH: 40;
  readonly TRANSFORM_FAILURE: 50;
};
type ExitCode = (typeof EXIT)[keyof typeof EXIT];
//#endregion
export { type CapabilitiesExitCode, type CapabilitiesFlag, type CapabilitiesJsonSchema, type CapabilitiesReport, CliError, type CliOptions, EXIT, type ExitCode, type Logger, type PrepareDistContext, type PrepareDistOptions, type PrepareDistPlugin, type PrepareDistReport, type RuntimeLogger, type TransformPackageReport, type VerifyTagReport, buildCapabilitiesReport, formatPrepareDistReportHuman, parseCliArgs, prepareDist, runCli, stripDistPrefix };
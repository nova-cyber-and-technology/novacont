import { BaseError, ContractFunctionRevertedError } from "viem";

/**
 * Base class for all NovaCont SDK errors.
 */
export class NovaContError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "NovaContError";
  }
}

export class UnsupportedChainError extends NovaContError {
  constructor(chainId: number) {
    super(`Chain ${chainId} is not a supported NovaCont deployment. See SUPPORTED_CHAIN_IDS in constants.ts.`);
    this.name = "UnsupportedChainError";
  }
}

/**
 * Both contracts use `require(condition, "string")` exclusively, no custom Solidity `error` types,
 * so decoding just means extracting that revert reason string, viem already does the hard part
 * (ABI-aware error matching); this wraps its output in a typed error with the raw reason attached.
 */
export class ContractRevertError extends NovaContError {
  constructor(public readonly reason: string, cause?: unknown) {
    super(`NovaCont/NovaJury reverted: ${reason}`, cause);
    this.name = "ContractRevertError";
  }
}

/**
 * Rather than one subclass per require() string (there are 60+ across both contracts, and a
 * 1:1 mapping would be pure boilerplate with little DX benefit), these group reverts by the kind
 * of problem they represent, so a consumer can catch `NotAuthorizedError` once instead of a dozen
 * near-identical permission strings. Anything that doesn't match a known pattern still surfaces
 * as a plain ContractRevertError with the real reason attached, nothing is swallowed silently.
 */
export class NotAuthorizedError extends ContractRevertError {}
export class InvalidStateError extends ContractRevertError {}
export class DeadlineError extends ContractRevertError {}
export class AlreadyProcessedError extends ContractRevertError {}
export class ValidationError extends ContractRevertError {}

const NOT_AUTHORIZED_PATTERNS = [
  "Only provider",
  "Only client",
  "Only parties",
  "Only NovaJury",
  "Only owner",
  "Not authorized resolver",
  "Not the counter party",
  "Cannot cancel",
  "Client cannot be provider",
  "Not assigned to this case",
  "Juror not in this case",
];

const DEADLINE_PATTERNS = [
  "deadline passed",
  "Review period active",
  "window expired",
  "Window still active",
  "Voting closed",
  "Voting already closed",
  "Voting still open",
  "Cooldown not finished",
  "Replacement window not open",
];

const ALREADY_PROCESSED_PATTERNS = [
  "Already resolved",
  "Already disputed",
  "Already paid",
  "Already voted",
  "Already a juror",
  "Already requested",
  "Already executed",
  "Counter already paid",
  "Nothing to withdraw",
];

const INVALID_STATE_PATTERNS = [
  "Not in Created state",
  "Not in delivered state",
  "Work must be Accepted first",
  "Not in disputed state",
  "Not disputed",
  "Case not active",
  "Not awaiting fee",
  "Jury system not active",
  "Jury system active",
];

function matches(reason: string, patterns: string[]): boolean {
  return patterns.some((p) => reason.includes(p));
}

function classify(reason: string, cause: unknown): ContractRevertError {
  if (matches(reason, NOT_AUTHORIZED_PATTERNS)) return new NotAuthorizedError(reason, cause);
  if (matches(reason, DEADLINE_PATTERNS)) return new DeadlineError(reason, cause);
  if (matches(reason, ALREADY_PROCESSED_PATTERNS)) return new AlreadyProcessedError(reason, cause);
  if (matches(reason, INVALID_STATE_PATTERNS)) return new InvalidStateError(reason, cause);
  return new ContractRevertError(reason, cause);
}

/**
 * Walks a caught error from a viem contract write/simulate call and returns a typed
 * NovaContError with the real on-chain revert reason attached, falls back to a generic
 * NovaContError (not a silent swallow) if the shape doesn't match what viem produces for
 * a reverted call, e.g. a network error instead of a revert.
 */
export function decodeContractError(err: unknown): NovaContError {
  if (err instanceof BaseError) {
    const revertError = err.walk((e) => e instanceof ContractFunctionRevertedError) as
      | ContractFunctionRevertedError
      | undefined;
    if (revertError) {
      const reason =
        revertError.reason ??
        revertError.shortMessage ??
        revertError.data?.errorName ??
        "Unknown revert reason";
      return classify(reason, err);
    }
    return new NovaContError(err.shortMessage ?? err.message, err);
  }
  if (err instanceof Error) {
    return new NovaContError(err.message, err);
  }
  return new NovaContError("Unrecognized error, see `cause` for the raw value.", err);
}

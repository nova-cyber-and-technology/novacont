import { base, baseSepolia, sepolia } from "viem/chains";

/**
 * Verified contract addresses across supported networks.
 * Ethereum Sepolia: 0x98B577d22710DaEA8c657dc415a591e6CD36B14a
 */
export const NOVACONT_ADDRESSES = {
  [base.id]: "0x0000000000000000000000000000000000000000" as const,
  [baseSepolia.id]: "0x0000000000000000000000000000000000000000" as const,
  [sepolia.id]: "0x98B577d22710DaEA8c657dc415a591e6CD36B14a" as const,
};

export const NOVAJURY_ADDRESSES = {
  [base.id]: "0x0000000000000000000000000000000000000000" as const,
  [baseSepolia.id]: "0x0000000000000000000000000000000000000000" as const,
  [sepolia.id]: "0x0000000000000000000000000000000000000000" as const,
};

/** Native ETH is represented internally as address(0), confirmed directly in NovaCont.sol. */
export const NATIVE_ETH_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/**
 * Default platform fee at deploy time is 3%, per `platformFeePercentage = 3` in NovaCont.sol.
 * This is a MUTABLE state variable (owner can change it up to 10% via setPlatformFee), not a
 * constant, always read it live via NovaContClient.getPlatformFeePercentage() for anything that
 * matters, this export is a documented default for quick estimates only, not a source of truth.
 */
export const DEFAULT_PLATFORM_FEE_PERCENT = 3;
export const MAX_PLATFORM_FEE_PERCENT = 10; // enforced on-chain in setPlatformFee()

/** `USD_THRESHOLD = 200e8` in NovaCont.sol, 8-decimal USD. Agreements priced below this require the 1.25x deposit. */
export const ADAPTIVE_COLLATERAL_THRESHOLD_USD8 = 200_00000000n;

/** `(agreedPrice * 125) / 100` in NovaCont.sol, i.e. a 1.25x multiplier. */
export const ADAPTIVE_COLLATERAL_MULTIPLIER_BPS = 12_500;

/** `STALE_PRICE_DELAY = 24 hours` in NovaCont.sol. Enforced on-chain inside getLatestTokenUSDPrice, not re-checked client-side. */
export const ORACLE_STALENESS_SECONDS = 24 * 60 * 60;

/** `DISPUTE_FEE_USD = 22e6` in NovaCont.sol, i.e. $0.22 at 8 decimals. Only charged in legacy (non-jury) dispute mode. */
export const LEGACY_DISPUTE_FEE_USD8 = 22_000_000n;

/** `JURY_STAKE_USD = 500e8` in NovaCont.sol / `JUROR_MIN_STAKE_USDT = 500 * 10**6` in NovaJury.sol. Minimum stake to become a juror, in USDT (6 decimals). */
export const JUROR_MIN_STAKE_USDT = 500_000000n;

/** Jury-mode dispute fee bounds from NovaJury.computeDisputeFeePerParty: 5% of value, min 1 USDT, max 25 USDT. */
export const JURY_DISPUTE_FEE_PERCENT = 5;
export const JURY_DISPUTE_FEE_MIN_USDT = 1_000000n;
export const JURY_DISPUTE_FEE_MAX_USDT = 25_000000n;

/** Fallback ETH/USD price NovaJury uses if the oracle call to NovaCont fails or returns 0. Hardcoded in NovaJury.sol. */
export const JURY_FALLBACK_ETH_PRICE_USD8 = 3400_00000000n;

/** Timing constants from NovaJury.sol, all as seconds. */
export const VOTE_WINDOW_SECONDS = 48 * 60 * 60;
export const REPLACEMENT_WINDOW_SECONDS = 24 * 60 * 60;
export const REPLACEMENT_EXTENSION_SECONDS = 24 * 60 * 60;
export const FEE_RESPONSE_WINDOW_SECONDS = 3 * 24 * 60 * 60;
export const UNSTAKE_COOLDOWN_SECONDS = 7 * 24 * 60 * 60;

/** Juror pool mechanics from NovaJury.sol. */
export const MAX_JUROR_WARNINGS = 3;
export const JURORS_PER_CASE = 3;
export const JUROR_SLASH_PERCENT = 5;
export const JUROR_REWARD_BPS = 70; // 70% of the fee pool goes to voting jurors, 30% to the protocol treasury
export const MAX_JUROR_ACTIVE_CASES = 5;

/** Review window after delivery before the provider can claim a timeout payout: `7 days` in NovaCont.sol's claimTimeout. */
export const DELIVERY_REVIEW_WINDOW_SECONDS = 7 * 24 * 60 * 60;

export const SUPPORTED_CHAIN_IDS = [base.id, baseSepolia.id, sepolia.id] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

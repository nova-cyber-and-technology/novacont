import type { Address, Hash } from "viem";

/** Matches `enum ContractState` in NovaCont.sol exactly, including order (order determines the uint8 value on-chain). */
export enum ContractState {
  Created = 0,
  Accepted = 1,
  Delivered = 2,
  Disputed = 3,
  Completed = 4,
  Resolved = 5,
  Cancelled = 6,
}

/** Matches `enum VoteOption` in NovaJury.sol. */
export enum VoteOption {
  Unvoted = 0,
  ClientWins = 1,
  SplitEqual = 2,
  ProviderWins = 3,
}

/** Matches `enum CaseStatus` in NovaJury.sol. */
export enum CaseStatus {
  AwaitingCounterFee = 0,
  Active = 1,
  DefaultWin = 2,
  Resolved = 3,
}

/**
 * Combines the two on-chain getters (getContractCore + getContractDetails), the real contract
 * splits these across two functions to avoid a stack-too-deep compile error, this SDK re-joins
 * them into one object so consumers don't have to think about that implementation detail.
 */
export interface EscrowContract {
  id: bigint;
  client: Address;
  provider: Address;
  paymentToken: Address; // address(0) means native ETH
  agreedPrice: bigint;
  totalLocked: bigint;
  metadataURI: string;
  metadataHash: `0x${string}`;
  acceptDeadline: bigint;
  deliveryDurationDays: bigint;
  deliveryDeadline: bigint;
  deliveryTime: bigint;
  acceptTime: bigint;
  state: ContractState;
  isExtraDeposit: boolean; // true when the 1.25x adaptive collateral applied at creation
  evidenceURI: string;
}

/** Matches the `contractDisputeDetails` public mapping's auto-generated getter tuple. */
export interface DisputeDetails {
  initiator: Address;
  feePaid: boolean;
  counterFeePaid: boolean;
  resolved: boolean;
  resolutionTimestamp: bigint;
  resolverAddress: Address;
  disputeReasonURI: string;
  resolutionReasonURI: string;
  linkedCaseId: bigint;
  categoryId: number;
}

export interface CreateContractParams {
  provider: Address;
  paymentToken: Address; // NATIVE_ETH_ADDRESS for ETH
  metadataURI: string;
  metadataHash: `0x${string}`;
  acceptDays: bigint; // must be 1-30 per the contract's own validation
  deliveryDays: bigint; // must be 1-365
  agreedPrice: bigint; // in the payment token's smallest unit
  /** Only used for ERC-20 payments (e.g. USDT), must equal the required deposit exactly, leave 0n for ETH. */
  erc20DepositAmount: bigint;
}

export interface TxResult {
  hash: Hash;
}

/** Matches the `jurors` public mapping getter in NovaJury.sol. */
export interface Juror {
  stake: bigint;
  warnings: number;
  active: boolean;
  unstakeRequested: boolean;
  unstakeAt: bigint;
  activeCases: bigint;
  categoryMask: number;
}

export interface CaseVotes {
  client: bigint;
  provider: bigint;
  split: bigint;
  total: bigint;
  finalBps: bigint;
}

export interface CaseStatusInfo {
  status: CaseStatus;
  verdictExecuted: boolean;
  voteDeadline: bigint;
}

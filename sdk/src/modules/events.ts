import { type Address, type PublicClient, type Log } from "viem";
import { novaContAbi } from "../abi/NovaCont.abi.js";

export type UnwatchFn = () => void;

/**
 * The real contract has no single generic "state changed" event, each lifecycle transition emits
 * its own specific event (confirmed against the actual NovaCont.sol event list). These helpers
 * wrap the ones you'll want most often; add more following the same pattern for the rest
 * (ContractRejected, ContractCancelled, DisputeSettled, etc), they all follow this shape.
 */

/** Fires when a client creates and funds a new agreement. Useful for reading back the new contractId without polling contractCount(). */
export function watchContractCreated(
  publicClient: PublicClient,
  contractAddress: Address,
  args: { client?: Address; provider?: Address },
  onLog: (log: Log) => void
): UnwatchFn {
  return publicClient.watchContractEvent({
    address: contractAddress,
    abi: novaContAbi,
    eventName: "ContractCreated",
    args,
    onLogs: (logs) => logs.forEach(onLog),
  });
}

/** Fires when the provider accepts a specific agreement. */
export function watchContractAccepted(
  publicClient: PublicClient,
  contractAddress: Address,
  contractId: bigint,
  onLog: (log: Log) => void
): UnwatchFn {
  return publicClient.watchContractEvent({
    address: contractAddress,
    abi: novaContAbi,
    eventName: "ContractAccepted",
    args: { contractId },
    onLogs: (logs) => logs.forEach(onLog),
  });
}

/** Fires when the provider submits work for a specific agreement. */
export function watchWorkDelivered(
  publicClient: PublicClient,
  contractAddress: Address,
  contractId: bigint,
  onLog: (log: Log) => void
): UnwatchFn {
  return publicClient.watchContractEvent({
    address: contractAddress,
    abi: novaContAbi,
    eventName: "WorkDelivered",
    args: { contractId },
    onLogs: (logs) => logs.forEach(onLog),
  });
}

/** Fires when a dispute is opened on a specific agreement. */
export function watchDisputeOpened(
  publicClient: PublicClient,
  contractAddress: Address,
  contractId: bigint,
  onLog: (log: Log) => void
): UnwatchFn {
  return publicClient.watchContractEvent({
    address: contractAddress,
    abi: novaContAbi,
    eventName: "DisputeOpened",
    args: { contractId },
    onLogs: (logs) => logs.forEach(onLog),
  });
}

import { type Address, type PublicClient, type WalletClient, type Hash, getContract } from "viem";
import { novaContAbi } from "./abi/NovaCont.abi.js";
import {
  NOVACONT_ADDRESSES,
  NATIVE_ETH_ADDRESS,
  ADAPTIVE_COLLATERAL_THRESHOLD_USD8,
  ADAPTIVE_COLLATERAL_MULTIPLIER_BPS,
  SUPPORTED_CHAIN_IDS,
  type SupportedChainId,
} from "./constants.js";
import type { EscrowContract, DisputeDetails, ContractState, CreateContractParams } from "./types.js";
import { UnsupportedChainError, decodeContractError } from "./errors.js";

export interface NovaContClientConfig {
  publicClient: PublicClient;
  walletClient?: WalletClient;
  contractAddressOverride?: Address;
}

type ConnectedWallet = WalletClient & { account: NonNullable<WalletClient["account"]> };

/**
 * Primary entry point for the NovaCont SDK. Every method here matches a real function in the
 * reviewed NovaCont.sol source, function name, parameter order, and return shape, no placeholders.
 */
export class NovaContClient {
  private readonly publicClient: PublicClient;
  private readonly walletClient?: WalletClient;
  private readonly address: Address;

  constructor(config: NovaContClientConfig) {
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;

    const chainId = config.publicClient.chain?.id;
    if (!chainId || !SUPPORTED_CHAIN_IDS.includes(chainId as SupportedChainId)) {
      throw new UnsupportedChainError(chainId ?? -1);
    }

    this.address = config.contractAddressOverride ?? NOVACONT_ADDRESSES[chainId as SupportedChainId];
  }

  private requireWallet(): ConnectedWallet {
    if (!this.walletClient) {
      throw new Error(
        "This NovaContClient was constructed without a walletClient, it can only read state. Pass a walletClient to enable writes."
      );
    }
    if (!this.walletClient.account) {
      throw new Error(
        "The walletClient passed to NovaContClient has no account attached, construct it with an account (e.g. via privateKeyToAccount)."
      );
    }
    return this.walletClient as ConnectedWallet;
  }

  private get read() {
    return getContract({ address: this.address, abi: novaContAbi, client: this.publicClient }).read;
  }

  private write(wallet: ConnectedWallet) {
    return getContract({ address: this.address, abi: novaContAbi, client: wallet }).write;
  }

  private async send(fn: (wallet: ConnectedWallet) => Promise<Hash>): Promise<Hash> {
    const wallet = this.requireWallet();
    try {
      return await fn(wallet);
    } catch (err) {
      throw decodeContractError(err);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------------------------

  /**
   * Fetches an agreement's full state. Combines getContractCore() + getContractDetails() (the
   * real contract splits these across two functions to avoid a stack-too-deep compile error),
   * this method re-joins them so callers deal with one object, not the contract's internal split.
   */
  async getAgreement(contractId: bigint): Promise<EscrowContract> {
    const [core, details] = await Promise.all([
      this.read.getContractCore([contractId]),
      this.read.getContractDetails([contractId]),
    ]);

    return {
      id: core[0],
      client: core[1],
      provider: core[2],
      paymentToken: core[3],
      agreedPrice: core[4],
      totalLocked: core[5],
      metadataURI: core[6],
      metadataHash: core[7],
      acceptDeadline: details[0],
      deliveryDurationDays: details[1],
      deliveryDeadline: details[2],
      deliveryTime: details[3],
      acceptTime: details[4],
      state: details[5] as ContractState,
      isExtraDeposit: details[6],
      evidenceURI: details[7],
    };
  }

  /** Raw dispute bookkeeping for an agreement (initiator, fee payment status, linked jury case, etc). */
  async getDisputeDetails(contractId: bigint): Promise<DisputeDetails> {
    const d = await this.read.contractDisputeDetails([contractId]);
    return {
      initiator: d[0],
      feePaid: d[1],
      counterFeePaid: d[2],
      resolved: d[3],
      resolutionTimestamp: d[4],
      resolverAddress: d[5],
      disputeReasonURI: d[6],
      resolutionReasonURI: d[7],
      linkedCaseId: d[8],
      categoryId: d[9],
    };
  }

  /** Total number of agreements created so far, also the ID of the most recently created one. */
  async getContractCount(): Promise<bigint> {
    return this.read.contractCount();
  }

  /**
   * Live oracle price for a token in USD, 8 decimals. Returns 0 if no price feed is registered
   * (which is exactly the signal the contract itself uses to force the 1.25x adaptive deposit).
   * Staleness (> 24h) is enforced on-chain and will revert the call itself, there's no
   * out-of-band way to inspect staleness client-side without reading the raw Chainlink feed.
   */
  async getLatestTokenUSDPrice(token: Address): Promise<bigint> {
    return this.read.getLatestTokenUSDPrice([token]);
  }

  /** Flat legacy dispute fee, in wei, only relevant while the jury system is inactive. */
  async getLegacyDisputeFee(): Promise<bigint> {
    return this.read.getLegacyDisputeFee();
  }

  /** Current platform fee percentage (0-10). Mutable via setPlatformFee, always read live rather than assuming the 3% default. */
  async getPlatformFeePercentage(): Promise<bigint> {
    return this.read.platformFeePercentage();
  }

  async isTokenSupported(token: Address): Promise<boolean> {
    return this.read.supportedTokens([token]);
  }

  async getPendingWithdrawal(token: Address, payee: Address): Promise<bigint> {
    return this.read.pendingWithdrawals([token, payee]);
  }

  async isJurySystemActive(): Promise<boolean> {
    return this.read.isJurySystemActive();
  }

  /**
   * Estimates the deposit a client would need to lock for a given agreedPrice in the payment
   * token's own smallest unit (this mirrors createContract's on-chain math exactly: whether the
   * 1.25x adaptive collateral applies is based on the token's live USD value vs. the $200
   * threshold, not on agreedPrice directly). The contract's own calculation at transaction time
   * is authoritative, treat this as a pre-flight estimate for UI display, not a guarantee, the
   * oracle price can move between this call and the transaction landing on-chain.
   */
  async estimateRequiredDeposit(paymentToken: Address, agreedPrice: bigint): Promise<{
    requiredDeposit: bigint;
    isAdaptiveCollateral: boolean;
  }> {
    const priceUsd8 = await this.getLatestTokenUSDPrice(paymentToken);
    const tokenDecimals = paymentToken === NATIVE_ETH_ADDRESS ? 18 : await this.getErc20Decimals(paymentToken);

    let isAdaptive: boolean;
    if (priceUsd8 > 0n) {
      const valueUsd8 = (agreedPrice * priceUsd8) / 10n ** BigInt(tokenDecimals);
      isAdaptive = valueUsd8 < ADAPTIVE_COLLATERAL_THRESHOLD_USD8;
    } else {
      // No oracle for this token: contract falls back to always requiring the extra deposit.
      isAdaptive = true;
    }

    const requiredDeposit = isAdaptive
      ? (agreedPrice * BigInt(ADAPTIVE_COLLATERAL_MULTIPLIER_BPS)) / 10_000n
      : agreedPrice;

    return { requiredDeposit, isAdaptiveCollateral: isAdaptive };
  }

  private async getErc20Decimals(token: Address): Promise<number> {
    // TODO(VERIFY): wire this to a real ERC20 decimals() read (viem's erc20Abi) once you're
    // integrating a specific token beyond ETH, left unimplemented here rather than guessing 18
    // or 6 and being silently wrong for some future token.
    throw new Error(
      `getErc20Decimals(${token}) not implemented, decimals vary per token, read it explicitly via the token's own decimals() function before calling estimateRequiredDeposit for an ERC-20.`
    );
  }

  /**
   * Convenience helper: converts a USD amount into the token's smallest unit using the live
   * oracle price, since `createContract`'s `agreedPrice` parameter is denominated in the payment
   * token itself (wei for ETH), not USD, the contract never does this conversion for you.
   * This is a UI-quoting convenience only; the oracle price can move before your transaction
   * lands, so treat the result as an estimate, not a guaranteed final deposit amount.
   */
  async quoteTokenAmountForUsd(token: Address, usdAmount: number, tokenDecimals: number): Promise<bigint> {
    const priceUsd8 = await this.getLatestTokenUSDPrice(token);
    if (priceUsd8 === 0n) {
      throw new Error(
        `No oracle price registered for token ${token}, can't convert a USD amount, you'll need to collect the amount directly in the token's own units instead.`
      );
    }
    // usdAmount (float) * 1e8 (match oracle's 8-decimal precision) / priceUsd8, then scale to tokenDecimals.
    const usdAmount8 = BigInt(Math.round(usdAmount * 1e8));
    return (usdAmount8 * 10n ** BigInt(tokenDecimals)) / priceUsd8;
  }

  // ---------------------------------------------------------------------------------------------
  // Writes — Escrow Lifecycle
  // ---------------------------------------------------------------------------------------------

  /**
   * Client-side: create and fund a new agreement. No return value on-chain, read the new ID via
   * getContractCount() right after (or watch for the ContractCreated event, safer under concurrency).
   * `valueWei` must equal the required deposit exactly for ETH payments (the contract reverts
   * with "Incorrect ETH deposit" otherwise), use estimateRequiredDeposit() to compute it first.
   */
  async createContract(params: CreateContractParams, valueWei: bigint): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).createContract(
        [
          params.provider,
          params.paymentToken,
          params.metadataURI,
          params.metadataHash,
          params.acceptDays,
          params.deliveryDays,
          params.agreedPrice,
          params.erc20DepositAmount,
        ],
        { value: valueWei, account: wallet.account, chain: wallet.chain }
      )
    );
  }

  /** Provider-side: accept a funded agreement, starts the delivery countdown. */
  async acceptContract(contractId: bigint): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).acceptContract([contractId], { account: wallet.account, chain: wallet.chain })
    );
  }

  /** Provider-side: reject a funded agreement, client gets a full and immediate refund credit. */
  async rejectContract(contractId: bigint): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).rejectContract([contractId], { account: wallet.account, chain: wallet.chain })
    );
  }

  /** Provider-side: submit completed work with an evidence URI, starts the client's 7-day review window. */
  async deliverWork(contractId: bigint, evidenceURI: string): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).deliverWork([contractId, evidenceURI], { account: wallet.account, chain: wallet.chain })
    );
  }

  /** Client-side: approve delivered work, releases payment (minus the platform fee) to the provider. */
  async approveWork(contractId: bigint): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).approveWork([contractId], { account: wallet.account, chain: wallet.chain })
    );
  }

  /** Provider-side: claim automatic payment once 7 days have passed since delivery with no client response. */
  async claimTimeout(contractId: bigint): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).claimTimeout([contractId], { account: wallet.account, chain: wallet.chain })
    );
  }

  /**
   * Cancel an agreement. Refund rules depend on state (see the contract's cancelContract):
   * full refund before acceptance or once the delivery deadline has passed; if more than half
   * the delivery window has elapsed after acceptance, the provider is entitled to 50% of the
   * agreed price and the client gets the rest.
   */
  async cancelContract(contractId: bigint): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).cancelContract([contractId], { account: wallet.account, chain: wallet.chain })
    );
  }

  /**
   * Withdraw your accumulated pull-payment balance for a given token. NovaCont credits
   * `pendingWithdrawals` instead of pushing funds directly (this is the contract's core
   * reentrancy defense), nothing is paid out automatically, you must call this yourself after
   * a completion, cancellation, or dispute resolution credits your balance. Check
   * getPendingWithdrawal() first if you want to confirm there's something to withdraw.
   */
  async withdraw(token: Address): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).withdraw([token], { account: wallet.account, chain: wallet.chain })
    );
  }

  // ---------------------------------------------------------------------------------------------
  // Writes — Disputes
  // ---------------------------------------------------------------------------------------------

  /**
   * Open a dispute. Behavior depends on whether the jury system is active (call
   * isJurySystemActive() first):
   *   - Jury mode: pays via USDT, you must approve() the NovaCont contract to spend your share
   *     (from NovaJuryClient.computeDisputeFeePerParty()) before calling this, `valueWei` is unused.
   *   - Legacy mode: pays in ETH via `valueWei`, quote it with getLegacyDisputeFee() first (the
   *     contract allows up to 1% slippage on this figure for oracle timing drift).
   */
  async disputeWork(contractId: bigint, categoryId: number, reasonURI: string, valueWei = 0n): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).disputeWork([contractId, categoryId, reasonURI], {
        value: valueWei,
        account: wallet.account,
        chain: wallet.chain,
      })
    );
  }

  /**
   * Admin-side: settle a dispute manually. Restricted on-chain to the resolver or owner, and only
   * while the jury system is inactive, calling this without that authority reverts with
   * "Not authorized resolver" or "Jury system active: use jury flow". `clientRefund +
   * grossProviderPayment` must equal the agreement's totalLocked exactly, the contract enforces
   * this as an invariant.
   */
  async settleDispute(
    contractId: bigint,
    clientRefund: bigint,
    grossProviderPayment: bigint,
    resolutionURI: string
  ): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).settleDispute([contractId, clientRefund, grossProviderPayment, resolutionURI], {
        account: wallet.account,
        chain: wallet.chain,
      })
    );
  }

  // ---------------------------------------------------------------------------------------------
  // Writes — Admin (owner-only on-chain; included for completeness and local/fork testing)
  // ---------------------------------------------------------------------------------------------

  async pause(): Promise<Hash> {
    return this.send((wallet) => this.write(wallet).pause({ account: wallet.account, chain: wallet.chain }));
  }

  async unpause(): Promise<Hash> {
    return this.send((wallet) => this.write(wallet).unpause({ account: wallet.account, chain: wallet.chain }));
  }

  async setPlatformFee(newFeePercentage: bigint): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).setPlatformFee([newFeePercentage], { account: wallet.account, chain: wallet.chain })
    );
  }

  async setJuryContract(juryContract: Address): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).setJuryContract([juryContract], { account: wallet.account, chain: wallet.chain })
    );
  }

  async activateJurySystem(): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).activateJurySystem({ account: wallet.account, chain: wallet.chain })
    );
  }

  async deactivateJurySystem(): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).deactivateJurySystem({ account: wallet.account, chain: wallet.chain })
    );
  }

  async setResolver(resolver: Address): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).setResolver([resolver], { account: wallet.account, chain: wallet.chain })
    );
  }

  async addSupportedToken(token: Address, priceFeed: Address): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).addSupportedToken([token, priceFeed], { account: wallet.account, chain: wallet.chain })
    );
  }

  async removeSupportedToken(token: Address): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).removeSupportedToken([token], { account: wallet.account, chain: wallet.chain })
    );
  }

  async setPriceFeed(token: Address, priceFeed: Address): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).setPriceFeed([token, priceFeed], { account: wallet.account, chain: wallet.chain })
    );
  }
}

import { type Address, type PublicClient, type WalletClient, type Hash, getContract } from "viem";
import { novaJuryAbi } from "./abi/NovaJury.abi.js";
import { NOVAJURY_ADDRESSES, SUPPORTED_CHAIN_IDS, type SupportedChainId } from "./constants.js";
import { UnsupportedChainError, decodeContractError } from "./errors.js";
import { CaseStatus, VoteOption, type Juror, type CaseVotes, type CaseStatusInfo } from "./types.js";

export interface NovaJuryClientConfig {
  publicClient: PublicClient;
  walletClient?: WalletClient;
  contractAddressOverride?: Address;
}

type ConnectedWallet = WalletClient & { account: NonNullable<WalletClient["account"]> };

/**
 * Wraps the NovaJury contract, every method matches the reviewed NovaJury.sol source exactly.
 * Per the NovaCont docs, the jury system is deployed but not yet handling live disputes on
 * mainnet (administered mode is currently in effect), this client lets you build and test
 * against the real interface ahead of that activation.
 */
export class NovaJuryClient {
  private readonly publicClient: PublicClient;
  private readonly walletClient?: WalletClient;
  private readonly address: Address;

  constructor(config: NovaJuryClientConfig) {
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;

    const chainId = config.publicClient.chain?.id;
    if (!chainId || !SUPPORTED_CHAIN_IDS.includes(chainId as SupportedChainId)) {
      throw new UnsupportedChainError(chainId ?? -1);
    }

    this.address = config.contractAddressOverride ?? NOVAJURY_ADDRESSES[chainId as SupportedChainId];
  }

  private requireWallet(): ConnectedWallet {
    if (!this.walletClient) {
      throw new Error("This NovaJuryClient was constructed without a walletClient, reads only.");
    }
    if (!this.walletClient.account) {
      throw new Error("The walletClient passed to NovaJuryClient has no account attached.");
    }
    return this.walletClient as ConnectedWallet;
  }

  private get read() {
    return getContract({ address: this.address, abi: novaJuryAbi, client: this.publicClient }).read;
  }

  private write(wallet: ConnectedWallet) {
    return getContract({ address: this.address, abi: novaJuryAbi, client: wallet }).write;
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

  /** Per-party USDT fee to open or counter a dispute: 5% of the agreement's USD value, min 1 USDT, max 25 USDT. */
  async computeDisputeFeePerParty(agreedPriceWei: bigint): Promise<bigint> {
    return this.read.computeDisputeFeePerParty([agreedPriceWei]);
  }

  async jurorPoolSize(): Promise<bigint> {
    return this.read.jurorPoolSize();
  }

  async getJurorInfo(juror: Address): Promise<Juror> {
    const j = await this.read.jurors([juror]);
    return {
      stake: j[0],
      warnings: j[1],
      active: j[2],
      unstakeRequested: j[3],
      unstakeAt: j[4],
      activeCases: j[5],
      categoryMask: j[6],
    };
  }

  async getCaseJurors(caseId: bigint): Promise<readonly [Address, Address, Address]> {
    return this.read.getCaseJurors([caseId]);
  }

  async getCaseVotes(caseId: bigint): Promise<CaseVotes> {
    const v = await this.read.getCaseVotes([caseId]);
    return { client: v[0], provider: v[1], split: v[2], total: v[3], finalBps: v[4] };
  }

  async getCaseStatus(caseId: bigint): Promise<CaseStatusInfo> {
    const s = await this.read.getCaseStatus([caseId]);
    return { status: s[0] as CaseStatus, verdictExecuted: s[1], voteDeadline: s[2] };
  }

  async getJurorVote(caseId: bigint, juror: Address): Promise<VoteOption> {
    return (await this.read.getJurorVote([caseId, juror])) as VoteOption;
  }

  async isJurorAssigned(caseId: bigint, juror: Address): Promise<boolean> {
    return this.read.isJurorAssigned([caseId, juror]);
  }

  async getPendingWithdrawal(address: Address): Promise<bigint> {
    return this.read.pendingWithdrawals([address]);
  }

  async getCaseCount(): Promise<bigint> {
    return this.read.caseCount();
  }

  // ---------------------------------------------------------------------------------------------
  // Writes — Juror Lifecycle
  // ---------------------------------------------------------------------------------------------

  /**
   * Stake USDT to register as a juror. Requires a prior ERC-20 approval for at least `amount`
   * USDT to this contract. Minimum is JUROR_MIN_STAKE_USDT (500 USDT), enforced on-chain,
   * read it from constants.ts rather than hardcoding 500 in your own UI.
   * `categoryMask` is a bitmask of the dispute categories this juror is willing to hear.
   */
  async joinJury(categoryMask: number, amount: bigint): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).joinJury([categoryMask, amount], { account: wallet.account, chain: wallet.chain })
    );
  }

  /** Begin the 7-day unstake cooldown. Reverts if you still have active cases assigned. */
  async requestUnstake(): Promise<Hash> {
    return this.send((wallet) => this.write(wallet).requestUnstake({ account: wallet.account, chain: wallet.chain }));
  }

  /** Owner-only: release a juror's stake once their unstake cooldown has elapsed. */
  async approveUnstake(juror: Address): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).approveUnstake([juror], { account: wallet.account, chain: wallet.chain })
    );
  }

  /** Withdraw your accumulated pull-payment USDT balance (juror rewards, released stake, etc). */
  async withdraw(): Promise<Hash> {
    return this.send((wallet) => this.write(wallet).withdraw({ account: wallet.account, chain: wallet.chain }));
  }

  // ---------------------------------------------------------------------------------------------
  // Writes — Dispute Case Lifecycle
  // ---------------------------------------------------------------------------------------------

  /**
   * Counter-party pays their share of the dispute fee to move a case from AwaitingCounterFee to
   * Active. Requires a prior USDT approval to this contract for the amount from
   * computeDisputeFeePerParty(). `caseId` is NovaJury's own case ID (see
   * NovaContClient.getDisputeDetails().linkedCaseId), not the NovaCont contractId.
   */
  async payCounterFee(caseId: bigint, reasonURI: string): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).payCounterFee([caseId, reasonURI], { account: wallet.account, chain: wallet.chain })
    );
  }

  /**
   * If the counter-party doesn't pay their fee within FEE_RESPONSE_WINDOW (3 days), anyone can
   * call this to trigger a default win for the initiator and refund the fee pool to them.
   */
  async triggerFeeDefault(caseId: bigint): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).triggerFeeDefault([caseId], { account: wallet.account, chain: wallet.chain })
    );
  }

  /** Cast a vote as an assigned juror on an active case. */
  async castVote(caseId: bigint, vote: VoteOption): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).castVote([caseId, vote], { account: wallet.account, chain: wallet.chain })
    );
  }

  /**
   * If an assigned juror hasn't voted after REPLACEMENT_WINDOW (24h) into an active case, anyone
   * can call this to slash them and assign a replacement, extending the vote deadline if needed.
   */
  async replaceInactiveJuror(caseId: bigint, slashedJuror: Address): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).replaceInactiveJuror([caseId, slashedJuror], {
        account: wallet.account,
        chain: wallet.chain,
      })
    );
  }

  /**
   * After the vote deadline passes without reaching a 2-of-3 majority, anyone can call this to
   * force resolution (a tie resolves to a 50/50 split, the contract never auto-favors either side).
   */
  async executeResolution(caseId: bigint): Promise<Hash> {
    return this.send((wallet) =>
      this.write(wallet).executeResolution([caseId], { account: wallet.account, chain: wallet.chain })
    );
  }
}

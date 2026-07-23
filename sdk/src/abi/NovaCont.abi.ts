/**
 * Hand-transcribed directly from the real NovaCont.sol source (read function-by-function).
 * Not a placeholder, every entry below matches an actual function/event in the contract as of
 * the version reviewed. If the contract changes, re-diff against the .sol file before trusting
 * this blindly, but this is not a guess anymore.
 */
export const novaContAbi = [
  // --- Core Workflow ---
  {
    type: "function",
    name: "createContract",
    stateMutability: "payable",
    inputs: [
      { name: "_provider", type: "address" },
      { name: "_paymentToken", type: "address" },
      { name: "_metadataURI", type: "string" },
      { name: "_metadataHash", type: "bytes32" },
      { name: "_acceptDays", type: "uint256" },
      { name: "_deliveryDays", type: "uint256" },
      { name: "_agreedPrice", type: "uint256" },
      { name: "_erc20DepositAmount", type: "uint256" },
    ],
    outputs: [], // No return value. Read the new ID via contractCount() or the ContractCreated event.
  },
  {
    type: "function",
    name: "acceptContract",
    stateMutability: "nonpayable",
    inputs: [{ name: "_contractId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "rejectContract",
    stateMutability: "nonpayable",
    inputs: [{ name: "_contractId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "deliverWork",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_contractId", type: "uint256" },
      { name: "_evidenceURI", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approveWork",
    stateMutability: "nonpayable",
    inputs: [{ name: "_contractId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimTimeout",
    stateMutability: "nonpayable",
    inputs: [{ name: "_contractId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelContract",
    stateMutability: "nonpayable",
    inputs: [{ name: "_contractId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "_token", type: "address" }],
    outputs: [],
  },

  // --- Disputes ---
  {
    type: "function",
    name: "disputeWork",
    stateMutability: "payable", // ETH only sent in legacy (non-jury) mode; jury mode pays via USDT approve + transferFrom
    inputs: [
      { name: "_contractId", type: "uint256" },
      { name: "_categoryId", type: "uint8" },
      { name: "_reasonURI", type: "string" },
    ],
    outputs: [],
  },
  {
    // Restricted to the registered NovaJury contract address (onlyJuryContract). Not callable by
    // a regular EOA/SDK consumer, included for completeness and for testing against a local fork.
    type: "function",
    name: "onCounterFeePaid",
    stateMutability: "nonpayable",
    inputs: [{ name: "_contractId", type: "uint256" }],
    outputs: [],
  },
  {
    // Restricted to the registered NovaJury contract address (onlyJuryContract), same caveat as above.
    type: "function",
    name: "settleDisputeByJury",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_contractId", type: "uint256" },
      { name: "_caseId", type: "uint256" },
      { name: "_providerBps", type: "uint256" },
    ],
    outputs: [],
  },
  {
    // Restricted to the resolver or owner (onlyResolverOrOwner), and only while the jury system is inactive.
    type: "function",
    name: "settleDispute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_contractId", type: "uint256" },
      { name: "_clientRefund", type: "uint256" },
      { name: "_grossProviderPayment", type: "uint256" },
      { name: "_resolutionURI", type: "string" },
    ],
    outputs: [],
  },

  // --- Reads ---
  {
    type: "function",
    name: "getContractCore",
    stateMutability: "view",
    inputs: [{ name: "_contractId", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "client", type: "address" },
      { name: "provider", type: "address" },
      { name: "paymentToken", type: "address" },
      { name: "agreedPrice", type: "uint256" },
      { name: "totalLocked", type: "uint256" },
      { name: "metadataURI", type: "string" },
      { name: "metadataHash", type: "bytes32" },
    ],
  },
  {
    type: "function",
    name: "getContractDetails",
    stateMutability: "view",
    inputs: [{ name: "_contractId", type: "uint256" }],
    outputs: [
      { name: "acceptDeadline", type: "uint256" },
      { name: "deliveryDurationDays", type: "uint256" },
      { name: "deliveryDeadline", type: "uint256" },
      { name: "deliveryTime", type: "uint256" },
      { name: "acceptTime", type: "uint256" },
      { name: "state", type: "uint8" },
      { name: "isExtraDeposit", type: "bool" },
      { name: "evidenceURI", type: "string" },
    ],
  },
  {
    type: "function",
    name: "getLatestTokenUSDPrice",
    stateMutability: "view",
    inputs: [{ name: "_token", type: "address" }],
    outputs: [{ name: "", type: "uint256" }], // Single value, 8 decimals. Staleness is enforced on-chain, not returned.
  },
  {
    type: "function",
    name: "getLegacyDisputeFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "contractCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "supportedTokens",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "tokenPriceFeeds",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "pendingWithdrawals",
    stateMutability: "view",
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "contractDisputeDetails",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "initiator", type: "address" },
      { name: "feePaid", type: "bool" },
      { name: "counterFeePaid", type: "bool" },
      { name: "resolved", type: "bool" },
      { name: "resolutionTimestamp", type: "uint256" },
      { name: "resolverAddress", type: "address" },
      { name: "disputeReasonURI", type: "string" },
      { name: "resolutionReasonURI", type: "string" },
      { name: "linkedCaseId", type: "uint256" },
      { name: "categoryId", type: "uint8" },
    ],
  },
  { type: "function", name: "platformFeePercentage", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "resolver", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "juryContract", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "isJurySystemActive", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "usdtToken", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },

  // --- Admin ---
  { type: "function", name: "pause", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "unpause", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    type: "function",
    name: "setPlatformFee",
    stateMutability: "nonpayable",
    inputs: [{ name: "_newFeePercentage", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setJuryContract",
    stateMutability: "nonpayable",
    inputs: [{ name: "_juryContract", type: "address" }],
    outputs: [],
  },
  { type: "function", name: "activateJurySystem", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "deactivateJurySystem", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    type: "function",
    name: "setResolver",
    stateMutability: "nonpayable",
    inputs: [{ name: "_resolver", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "addSupportedToken",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_token", type: "address" },
      { name: "_feed", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "removeSupportedToken",
    stateMutability: "nonpayable",
    inputs: [{ name: "_token", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setPriceFeed",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_token", type: "address" },
      { name: "_priceFeed", type: "address" },
    ],
    outputs: [],
  },

  // --- Events ---
  { type: "event", name: "TokenSupported", inputs: [{ name: "token", type: "address", indexed: true }, { name: "priceFeed", type: "address", indexed: true }] },
  { type: "event", name: "TokenRemoved", inputs: [{ name: "token", type: "address", indexed: true }] },
  {
    type: "event",
    name: "ContractCreated",
    inputs: [
      { name: "contractId", type: "uint256", indexed: true },
      { name: "client", type: "address", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "paymentToken", type: "address", indexed: false },
      { name: "agreedPrice", type: "uint256", indexed: false },
      { name: "totalLocked", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ContractAccepted",
    inputs: [
      { name: "contractId", type: "uint256", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "deliveryDeadline", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ContractRejected",
    inputs: [
      { name: "contractId", type: "uint256", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "refundAmount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "WorkDelivered",
    inputs: [
      { name: "contractId", type: "uint256", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "deliveryTime", type: "uint256", indexed: false },
      { name: "evidenceURI", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ContractCompleted",
    inputs: [
      { name: "contractId", type: "uint256", indexed: true },
      { name: "client", type: "address", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "feeTaken", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DisputeOpened",
    inputs: [
      { name: "contractId", type: "uint256", indexed: true },
      { name: "opener", type: "address", indexed: true },
      { name: "reasonURI", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DisputeSettled",
    inputs: [
      { name: "contractId", type: "uint256", indexed: true },
      { name: "clientRefund", type: "uint256", indexed: false },
      { name: "grossProviderPayment", type: "uint256", indexed: false },
      { name: "resolutionURI", type: "string", indexed: false },
      { name: "feeTaken", type: "uint256", indexed: false },
      { name: "netProviderPayment", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ContractCancelled",
    inputs: [
      { name: "contractId", type: "uint256", indexed: true },
      { name: "canceller", type: "address", indexed: true },
      { name: "clientRefund", type: "uint256", indexed: false },
      { name: "providerPenaltyPayment", type: "uint256", indexed: false },
    ],
  },
  { type: "event", name: "TimeoutClaimed", inputs: [{ name: "contractId", type: "uint256", indexed: true }] },
  {
    type: "event",
    name: "FundsWithdrawn",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "payee", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PlatformFeeUpdated",
    inputs: [
      { name: "oldFee", type: "uint256", indexed: false },
      { name: "newFee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PriceFeedUpdated",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "oldFeed", type: "address", indexed: true },
      { name: "newFeed", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "ResolverChanged",
    inputs: [
      { name: "oldResolver", type: "address", indexed: true },
      { name: "newResolver", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "DisputeFeePaidUSDT",
    inputs: [
      { name: "contractId", type: "uint256", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "amountUSDT", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DisputeResolved",
    inputs: [
      { name: "contractId", type: "uint256", indexed: true },
      { name: "resolver", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
      { name: "resolutionURI", type: "string", indexed: false },
    ],
  },
  { type: "event", name: "JurySystemActivated", inputs: [{ name: "juryContract", type: "address", indexed: true }] },
  { type: "event", name: "JurySystemDeactivated", inputs: [] },
] as const;

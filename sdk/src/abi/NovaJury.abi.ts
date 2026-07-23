/**
 * Hand-transcribed directly from the real NovaJury.sol source. Not a placeholder.
 */
export const novaJuryAbi = [
  // --- Juror Management ---
  {
    type: "function",
    name: "joinJury",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_categoryMask", type: "uint16" },
      { name: "_amount", type: "uint256" },
    ],
    outputs: [],
  },
  { type: "function", name: "requestUnstake", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    // onlyOwner
    type: "function",
    name: "approveUnstake",
    stateMutability: "nonpayable",
    inputs: [{ name: "_juror", type: "address" }],
    outputs: [],
  },

  // --- Case Lifecycle ---
  {
    // onlyNovaCont, not callable directly by a regular SDK consumer
    type: "function",
    name: "createCase",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_contractId", type: "uint256" },
      { name: "_client", type: "address" },
      { name: "_provider", type: "address" },
      { name: "_initiator", type: "address" },
      { name: "_feeUSDT", type: "uint256" },
      { name: "_evidenceURI", type: "string" },
      { name: "_reasonURI", type: "string" },
      { name: "_categoryId", type: "uint8" },
    ],
    outputs: [{ name: "caseId", type: "uint256" }],
  },
  {
    type: "function",
    name: "payCounterFee",
    stateMutability: "nonpayable", // pulls USDT via safeTransferFrom, requires an ERC20 approval first, not msg.value
    inputs: [
      { name: "_caseId", type: "uint256" },
      { name: "_reasonURI", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "triggerFeeDefault",
    stateMutability: "nonpayable",
    inputs: [{ name: "_caseId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "replaceInactiveJuror",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_caseId", type: "uint256" },
      { name: "_slashedJuror", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "castVote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_caseId", type: "uint256" },
      { name: "_vote", type: "uint8" }, // VoteOption enum: 0=Unvoted, 1=ClientWins, 2=SplitEqual, 3=ProviderWins
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "executeResolution",
    stateMutability: "nonpayable",
    inputs: [{ name: "_caseId", type: "uint256" }],
    outputs: [],
  },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    type: "function",
    name: "computeDisputeFeePerParty",
    stateMutability: "view",
    inputs: [{ name: "agreedPriceWei", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },

  // --- View Helpers ---
  { type: "function", name: "jurorPoolSize", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  {
    type: "function",
    name: "getCaseJurors",
    stateMutability: "view",
    inputs: [{ name: "_caseId", type: "uint256" }],
    outputs: [{ name: "", type: "address[3]" }],
  },
  {
    type: "function",
    name: "getCaseVotes",
    stateMutability: "view",
    inputs: [{ name: "_caseId", type: "uint256" }],
    outputs: [
      { name: "client", type: "uint256" },
      { name: "provider", type: "uint256" },
      { name: "split", type: "uint256" },
      { name: "total", type: "uint256" },
      { name: "finalBps", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getCaseStatus",
    stateMutability: "view",
    inputs: [{ name: "_caseId", type: "uint256" }],
    outputs: [
      { name: "", type: "uint8" }, // CaseStatus enum: 0=AwaitingCounterFee, 1=Active, 2=DefaultWin, 3=Resolved
      { name: "", type: "bool" }, // verdictExecuted
      { name: "", type: "uint256" }, // voteDeadline
    ],
  },
  {
    type: "function",
    name: "getJurorVote",
    stateMutability: "view",
    inputs: [
      { name: "_caseId", type: "uint256" },
      { name: "_juror", type: "address" },
    ],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "isJurorAssigned",
    stateMutability: "view",
    inputs: [
      { name: "_caseId", type: "uint256" },
      { name: "_juror", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "jurors",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "stake", type: "uint256" },
      { name: "warnings", type: "uint8" },
      { name: "active", type: "bool" },
      { name: "unstakeRequested", type: "bool" },
      { name: "unstakeAt", type: "uint256" },
      { name: "activeCases", type: "uint256" },
      { name: "categoryMask", type: "uint16" },
    ],
  },
  { type: "function", name: "pendingWithdrawals", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "novaContAddress", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "usdt", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "caseCount", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },

  // --- Admin ---
  { type: "function", name: "pause", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "unpause", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    type: "function",
    name: "setNovaContAddress",
    stateMutability: "nonpayable",
    inputs: [{ name: "_addr", type: "address" }],
    outputs: [],
  },

  // --- Events ---
  { type: "event", name: "JurorJoined", inputs: [{ name: "juror", type: "address", indexed: true }, { name: "stake", type: "uint256", indexed: false }] },
  { type: "event", name: "JurorSlashed", inputs: [{ name: "juror", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "JurorWarned", inputs: [{ name: "juror", type: "address", indexed: true }, { name: "newWarningCount", type: "uint8", indexed: false }] },
  { type: "event", name: "JurorEjected", inputs: [{ name: "juror", type: "address", indexed: true }, { name: "reason", type: "string", indexed: false }] },
  { type: "event", name: "JurorUnstakeRequested", inputs: [{ name: "juror", type: "address", indexed: true }, { name: "unlockAt", type: "uint256", indexed: false }] },
  { type: "event", name: "JurorUnstakeApproved", inputs: [{ name: "juror", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "CaseCreated", inputs: [{ name: "caseId", type: "uint256", indexed: true }, { name: "contractId", type: "uint256", indexed: true }] },
  { type: "event", name: "CounterFeePaid", inputs: [{ name: "caseId", type: "uint256", indexed: true }] },
  { type: "event", name: "CounterFeeDefaulted", inputs: [{ name: "caseId", type: "uint256", indexed: true }, { name: "winner", type: "address", indexed: false }] },
  { type: "event", name: "JurorsAssigned", inputs: [{ name: "caseId", type: "uint256", indexed: true }, { name: "assigned", type: "address[3]", indexed: false }] },
  { type: "event", name: "VoteCast", inputs: [{ name: "caseId", type: "uint256", indexed: true }, { name: "juror", type: "address", indexed: true }, { name: "vote", type: "uint8", indexed: false }] },
  {
    type: "event",
    name: "JurorReplaced",
    inputs: [
      { name: "caseId", type: "uint256", indexed: true },
      { name: "slashedJuror", type: "address", indexed: true },
      { name: "newJuror", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "CaseResolved",
    inputs: [
      { name: "caseId", type: "uint256", indexed: true },
      { name: "providerBps", type: "uint256", indexed: false },
      { name: "wasTie", type: "bool", indexed: false },
      { name: "voterCount", type: "uint256", indexed: false },
    ],
  },
  { type: "event", name: "JurorRewarded", inputs: [{ name: "juror", type: "address", indexed: true }, { name: "amountUSDT", type: "uint256", indexed: false }] },
  { type: "event", name: "NoShowSlashed", inputs: [{ name: "caseId", type: "uint256", indexed: true }, { name: "juror", type: "address", indexed: true }] },
  { type: "event", name: "JurorBelowMinimumEjected", inputs: [{ name: "juror", type: "address", indexed: true }] },
] as const;

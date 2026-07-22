// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Minimal interface to call NovaJury.createCase() — returns caseId
interface INovaJury {
    function createCase(
        uint256 contractId,
        address client,
        address provider,
        address initiator,
        uint256 agreedPrice,
        string calldata evidenceURI,
        string calldata reasonURI,
        uint8 categoryId
    ) external payable returns (uint256 caseId);
    function computeDisputeFeePerParty(uint256 agreedPriceWei) external view returns (uint256);
}

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title NovaCont - Secure Escrow with Provider Acceptance
 * @dev Dynamic 2x/1x deposit based on USD value. Includes mediator settlement and multi-step workflow.
 */
contract NovaCont is ReentrancyGuard, Ownable2Step, Pausable {
    // ---- Jury System (Passive by default) ----
    address public resolver;
    address public juryContract;          // NovaJury contract address
    bool    public isJurySystemActive;    // Owner toggles this to activate decentralized jury
    // Constant stake amount for jury registration (assumes $500 USD).
    uint256 public constant JURY_STAKE_USD = 500e8; // $500 with 8 decimals
    // Legacy fee: $0.22 USD paid to admin when jury is inactive
    uint256 public constant DISPUTE_FEE_USD = 22e6; // $0.22 with 8 decimals (22 cents)
    // Legacy getter — computes $0.22 worth of ETH using Chainlink at call time
    function getLegacyDisputeFee() public view returns (uint256) {
        uint256 ethPrice = getLatestTokenUSDPrice(address(0)); // 8 decimals
        require(ethPrice > 0, "Invalid price");
        // $0.22 in wei: (0.22e8 * 1e18) / ethPrice
        return (uint256(DISPUTE_FEE_USD) * 1e18) / ethPrice;
    }
    struct JuryMember {
        address member;
        uint256 stake;
        string[] expertiseCategories;
    }
    mapping(address => JuryMember) public juryMembers;
    event JuryMemberRegistered(address indexed member, uint256 stake, string[] expertiseCategories);
    event JuryMemberWithdrawn(address indexed member, uint256 amount);
    event JurySystemActivated(address indexed juryContract);
    event JurySystemDeactivated();

    
    uint256 public platformFeePercentage = 3; // 3% fee
    // Tracks ETH collected as legacy dispute fees — separate from escrow funds
    uint256 public collectedLegacyDisputeFees;
    uint256 public constant USD_THRESHOLD = 200e8; // $200 with 8 decimals
    
    // ─── Multi-Token Registration ───
    mapping(address => address) public tokenPriceFeeds; // token => priceFeed (address(0) = ETH priceFeed)
    mapping(address => bool) public supportedTokens;
    // We treat address(0) as Native ETH
    
    // USDT specific variables for Jury
    IERC20 public usdtToken;
    uint256 constant USDT_DECIMALS = 6;
    
    // Chainlink ETH/USD Price Feed (Default fallback)
    AggregatorV3Interface internal nativePriceFeed;
    uint256 public constant STALE_PRICE_DELAY = 24 hours;

    enum ContractState { Created, Accepted, Delivered, Disputed, Completed, Resolved, Cancelled }

    struct EscrowContract {
        uint256 id;
        address client;
        address provider;
        address paymentToken;      // address(0) means ETH Native
        uint256 agreedPrice;
        uint256 totalLocked;
        string metadataURI;
        bytes32 metadataHash;
        uint256 acceptDeadline;
        uint256 deliveryDurationDays;
        uint256 deliveryDeadline;
        uint256 deliveryTime;
        uint256 acceptTime;        // When provider accepted (for cancellation penalty calc)
        ContractState state;
        bool isExtraDeposit;       // True if 25% extra deposit was required (< $200)
        string evidenceURI;        // Proof of work submitted by provider on delivery
    }

    // Separate struct for dispute lifecycle data
    struct DisputeDetails {
        address initiator;
        bool feePaid;           // Initiator paid their share
        bool counterFeePaid;    // Counter party paid their share (jury mode)
        bool resolved;
        uint256 resolutionTimestamp;
        address resolverAddress;
        string disputeReasonURI;
        string resolutionReasonURI;
        uint256 linkedCaseId;   // NovaJury caseId (when jury is active)
        uint8 categoryId;       // Dispute category (stored for UI/admin)
    }

    uint256 public contractCount;
    mapping(uint256 => EscrowContract) internal contracts;
    mapping(uint256 => DisputeDetails) public contractDisputeDetails;

    // Pull payment: tokenAddress => payee => amount
    mapping(address => mapping(address => uint256)) public pendingWithdrawals;

    // --- Custom Getters (replaces auto-generated public getter) ---

    function getContractCore(uint256 _contractId) external view returns (
        uint256 id, address client, address provider, address paymentToken,
        uint256 agreedPrice, uint256 totalLocked,
        string memory metadataURI, bytes32 metadataHash
    ) {
        EscrowContract storage c = contracts[_contractId];
        return (c.id, c.client, c.provider, c.paymentToken, c.agreedPrice, c.totalLocked, c.metadataURI, c.metadataHash);
    }

    function getContractDetails(uint256 _contractId) external view returns (
        uint256 acceptDeadline, uint256 deliveryDurationDays,
        uint256 deliveryDeadline, uint256 deliveryTime,
        uint256 acceptTime, uint8 state, bool isExtraDeposit,
        string memory evidenceURI
    ) {
        EscrowContract storage c = contracts[_contractId];
        return (c.acceptDeadline, c.deliveryDurationDays, c.deliveryDeadline, c.deliveryTime, c.acceptTime, uint8(c.state), c.isExtraDeposit, c.evidenceURI);
    }

    // Events
    event TokenSupported(address indexed token, address indexed priceFeed);
    event TokenRemoved(address indexed token);
    event ContractCreated(uint256 indexed contractId, address indexed client, address indexed provider, address paymentToken, uint256 agreedPrice, uint256 totalLocked);
    event ContractAccepted(uint256 indexed contractId, address indexed provider, uint256 deliveryDeadline);
    event ContractRejected(uint256 indexed contractId, address indexed provider, uint256 refundAmount);
    event WorkDelivered(uint256 indexed contractId, address indexed provider, uint256 deliveryTime, string evidenceURI);
    event ContractCompleted(uint256 indexed contractId, address indexed client, address indexed provider, uint256 feeTaken);
    event DisputeOpened(uint256 indexed contractId, address indexed opener, string reasonURI);
    event DisputeSettled(uint256 indexed contractId, uint256 clientRefund, uint256 grossProviderPayment, string resolutionURI, uint256 feeTaken, uint256 netProviderPayment);
    event ContractCancelled(uint256 indexed contractId, address indexed canceller, uint256 clientRefund, uint256 providerPenaltyPayment);
    event TimeoutClaimed(uint256 indexed contractId);
    event FundsWithdrawn(address indexed token, address indexed payee, uint256 amount);
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event PriceFeedUpdated(address indexed token, address indexed oldFeed, address indexed newFeed);
    // New events
    event ResolverChanged(address indexed oldResolver, address indexed newResolver);
    event DisputeFeePaidUSDT(uint256 indexed contractId, address indexed payer, uint256 amountUSDT);
    event DisputeResolved(uint256 indexed contractId, address indexed resolver, uint256 timestamp, string resolutionURI);

    modifier validContract(uint256 _contractId) {
        require(_contractId > 0 && _contractId <= contractCount, "Invalid contract ID");
        _;
    }

    // Allows resolver (owner or designated address) to settle disputes (only when jury inactive)
    modifier onlyResolverOrOwner() {
        require(msg.sender == resolver || msg.sender == owner(), "Not authorized resolver");
        require(!isJurySystemActive, "Jury system active: use jury flow");
        _;
    }

    // Only NovaJury contract can call jury-settlement functions
    modifier onlyJuryContract() {
        require(msg.sender == juryContract, "Only NovaJury");
        require(isJurySystemActive, "Jury system not active");
        _;
    }

    using SafeERC20 for IERC20;

    constructor(address _usdt, address _nativePriceFeed) Ownable(msg.sender) {
        require(_usdt != address(0) && _nativePriceFeed != address(0), "Invalid addresses");
        resolver = owner();
        
        usdtToken = IERC20(_usdt);
        nativePriceFeed = AggregatorV3Interface(_nativePriceFeed);
        
        supportedTokens[address(0)] = true; // Support Native ETH by default
        supportedTokens[_usdt] = true;      // Support USDT by default
        tokenPriceFeeds[address(0)] = _nativePriceFeed;
    }


    // --- Admin Functions ---

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function setPlatformFee(uint256 _newFeePercentage) external onlyOwner {
        require(_newFeePercentage <= 10, "Fee cannot exceed 10%");
        emit PlatformFeeUpdated(platformFeePercentage, _newFeePercentage);
        platformFeePercentage = _newFeePercentage;
    }

    // ---- Jury System Admin ----
    function setJuryContract(address _juryContract) external onlyOwner {
        require(_juryContract != address(0), "Invalid address");
        juryContract = _juryContract;
    }

    function activateJurySystem() external onlyOwner {
        require(juryContract != address(0), "Set jury contract first");
        isJurySystemActive = true;
        resolver = juryContract; // Route future disputes to jury
        emit JurySystemActivated(juryContract);
    }

    function deactivateJurySystem() external onlyOwner {
        isJurySystemActive = false;
        resolver = owner();
        emit JurySystemDeactivated();
    }

    // ---- Resolver Management ----
    function setResolver(address _resolver) external onlyOwner {
        require(_resolver != address(0), "Resolver cannot be zero address");
        address oldResolver = resolver;
        resolver = _resolver;
        emit ResolverChanged(oldResolver, _resolver);
    }


    // --- Token Management ---
    function addSupportedToken(address _token, address _feed) external onlyOwner {
        require(_token != address(0), "Use address(0) for native ETH");
        require(_feed != address(0), "Invalid feed address");
        supportedTokens[_token] = true;
        tokenPriceFeeds[_token] = _feed;
        emit TokenSupported(_token, _feed);
    }

    function removeSupportedToken(address _token) external onlyOwner {
        require(_token != address(0) && _token != address(usdtToken), "Cannot remove core tokens");
        supportedTokens[_token] = false;
        emit TokenRemoved(_token);
    }

    function setPriceFeed(address _token, address _priceFeed) external onlyOwner {
        require(_priceFeed != address(0), "Invalid feed");
        AggregatorV3Interface feed = AggregatorV3Interface(_priceFeed);
        require(feed.decimals() == 8, "Unsupported feed decimals");
        
        address oldFeed = tokenPriceFeeds[_token];
        tokenPriceFeeds[_token] = _priceFeed;
        
        if (_token == address(0)) {
            nativePriceFeed = feed;
        }
        
        emit PriceFeedUpdated(_token, oldFeed, _priceFeed);
    }

    // --- Utility Functions ---

    /**
     * @dev Returns the latest token price in USD (8 decimals).
     *      If token feed is not set, assumes no oracle -> safely forces 1.25x deposit logic for random ERC20s.
     */
    function getLatestTokenUSDPrice(address _token) public view returns (uint256) {
        address feedAddress = tokenPriceFeeds[_token];
        if (feedAddress == address(0)) {
            // If it's a stablecoin like USDT lacking a direct feed here, we can hardcode fallback
            if (_token == address(usdtToken)) {
                // Return 1 USD with 8 decimals (1e8)
                return 1e8;
            }
            return 0; // Means we can't price it -> triggers extra deposit wrapper securely
        }
        
        AggregatorV3Interface feed = AggregatorV3Interface(feedAddress);
        (
            uint80 roundId,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = feed.latestRoundData();
        
        require(price > 0, "Invalid price");
        require(updatedAt > 0, "Incomplete round");
        require(block.timestamp - updatedAt < STALE_PRICE_DELAY, "Stale price");
        require(answeredInRound >= roundId, "Stale round");
        
        return uint256(price);
    }

    /**
     * @dev Returns the decimal count of a payment token.
     *      Native ETH is treated as 18 decimals.
     *      For ERC20s, reads the on-chain decimals() value with a safe fallback.
     */
    function _getTokenDecimals(address _token) internal view returns (uint256) {
        if (_token == address(0)) return 18; // Native ETH
        try IERC20Metadata(_token).decimals() returns (uint8 d) {
            return uint256(d);
        } catch {
            return 18; // Safe fallback for non-standard tokens
        }
    }


    // --- Core Workflow ---

    /**
     * @dev Step 1: Client creates contract and locks funds.
     * @param _acceptDays Days provider has to accept.
     * @param _deliveryDays Days provider has after acceptance to deliver.
     */
    function createContract(
        address _provider,
        address _paymentToken,
        string calldata _metadataURI, 
        bytes32 _metadataHash,
        uint256 _acceptDays,
        uint256 _deliveryDays, 
        uint256 _agreedPrice,
        uint256 _erc20DepositAmount
    ) external payable whenNotPaused nonReentrant {
        require(_provider != msg.sender, "Client cannot be provider");
        require(_provider != address(0), "Invalid provider");
        require(_agreedPrice > 0, "Price must be > 0");
        require(bytes(_metadataURI).length > 0, "Metadata required");
        require(_metadataHash != bytes32(0), "Metadata hash required");
        require(_acceptDays > 0 && _acceptDays <= 30, "Invalid accept duration");
        require(_deliveryDays > 0 && _deliveryDays <= 365, "Invalid delivery duration");
        require(supportedTokens[_paymentToken], "Token not supported");

        uint256 cId = ++contractCount;
        _initContractCore(cId, _provider, _paymentToken, _metadataURI, _metadataHash, _agreedPrice, _erc20DepositAmount);
        _initContractTiming(cId, _acceptDays, _deliveryDays);
    }

    function _initContractCore(
        uint256 cId,
        address provider,
        address paymentToken,
        string calldata metadataURI,
        bytes32 metadataHash,
        uint256 agreedPrice,
        uint256 erc20DepositAmount
    ) internal {
        EscrowContract storage newContract = contracts[cId];
        newContract.id = cId;
        newContract.client = msg.sender;
        newContract.provider = provider;
        newContract.paymentToken = paymentToken;
        newContract.agreedPrice = agreedPrice;
        newContract.metadataURI = metadataURI;
        newContract.metadataHash = metadataHash;
        newContract.state = ContractState.Created;
        
        // Price conversion check to enforce extra deposit for < $200 contracts
        uint256 priceUSD = getLatestTokenUSDPrice(paymentToken);
        if (priceUSD > 0) {
            uint256 tokenDecimals = _getTokenDecimals(paymentToken);
            newContract.isExtraDeposit = ((agreedPrice * priceUSD) / (10 ** tokenDecimals)) < USD_THRESHOLD;
        } else {
            // Fallback if no Oracle exists for ERC20
            newContract.isExtraDeposit = true;
        }
        
        require(agreedPrice <= type(uint256).max / 125, "Price too large");
        uint256 requiredDeposit = newContract.isExtraDeposit ? (agreedPrice * 125) / 100 : agreedPrice;
        
        if (paymentToken == address(0)) {
            require(msg.value == requiredDeposit, "Incorrect ETH deposit");
            newContract.totalLocked = msg.value;
        } else {
            require(msg.value == 0, "Do not send ETH for ERC20 payment");
            require(erc20DepositAmount == requiredDeposit, "Incorrect ERC20 deposit");
            newContract.totalLocked = requiredDeposit;
            
            uint256 balanceBefore = IERC20(paymentToken).balanceOf(address(this));
            IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), requiredDeposit);
            uint256 balanceAfter = IERC20(paymentToken).balanceOf(address(this));
            
            require(balanceAfter - balanceBefore == requiredDeposit, "Fee-on-transfer tokens not supported");
        }
    }

    // Helper to reduce stack slots in createContract (Stack Too Deep workaround)
    function _initContractTiming(
        uint256 cId,
        uint256 acceptDays,
        uint256 deliveryDays
    ) internal {
        EscrowContract storage newContract = contracts[cId];
        newContract.acceptDeadline = block.timestamp + (acceptDays * 1 days);
        newContract.deliveryDurationDays = deliveryDays;
        newContract.deliveryDeadline = 0;
        newContract.deliveryTime = 0;
        
        emit ContractCreated(cId, newContract.client, newContract.provider, newContract.paymentToken, newContract.agreedPrice, newContract.totalLocked);
    }

    /**
     * @dev Step 2: Provider accepts the terms.
     */
    function acceptContract(uint256 _contractId) external validContract(_contractId) whenNotPaused nonReentrant {
        EscrowContract storage esc = contracts[_contractId];
        require(esc.state == ContractState.Created, "Not in Created state");
        require(msg.sender == esc.provider, "Only provider can accept");
        require(block.timestamp <= esc.acceptDeadline, "Accept deadline passed");

        esc.state = ContractState.Accepted;
        esc.acceptTime = block.timestamp;
        // Set absolute timestamp based on stored duration
        esc.deliveryDeadline = block.timestamp + (esc.deliveryDurationDays * 1 days);

        emit ContractAccepted(_contractId, msg.sender, esc.deliveryDeadline);
    }

    /**
     * @dev Provider rejects the terms, client gets immediate refund.
     */
    function rejectContract(uint256 _contractId) external validContract(_contractId) nonReentrant {
        EscrowContract storage esc = contracts[_contractId];
        require(esc.state == ContractState.Created, "Cannot reject now");
        require(msg.sender == esc.provider, "Only provider can reject");

        _finalizeAndRefund(_contractId, ContractState.Cancelled);
        emit ContractRejected(_contractId, msg.sender, contracts[_contractId].totalLocked);
    }

    /**
     * @dev Step 3: Provider delivers work.
     */
    function deliverWork(uint256 _contractId, string calldata _evidenceURI) external validContract(_contractId) whenNotPaused nonReentrant {
        EscrowContract storage esc = contracts[_contractId];
        require(esc.state == ContractState.Accepted, "Work must be Accepted first");
        require(msg.sender == esc.provider, "Only provider can deliver");
        require(block.timestamp <= esc.deliveryDeadline, "Delivery deadline passed");
        require(bytes(_evidenceURI).length > 0, "Evidence required");

        esc.state = ContractState.Delivered;
        esc.deliveryTime = block.timestamp;
        esc.evidenceURI = _evidenceURI;

        emit WorkDelivered(_contractId, msg.sender, block.timestamp, _evidenceURI);
    }

    /**
     * @dev Step 4: Client approves and funds are released.
     */
    function approveWork(uint256 _contractId) external validContract(_contractId) nonReentrant whenNotPaused {
        EscrowContract storage c = contracts[_contractId];
        require(msg.sender == c.client, "Only client");
        require(c.state == ContractState.Delivered, "Not in delivered state");
        
        _distributeFunds(_contractId, c.agreedPrice, ContractState.Completed);
    }

    /**
     * @dev Automated claim if client doesn't respond 7 days after delivery.
     */
    function claimTimeout(uint256 _contractId) external validContract(_contractId) nonReentrant whenNotPaused {
        EscrowContract storage c = contracts[_contractId];
        require(msg.sender == c.provider, "Only provider");
        require(c.state == ContractState.Delivered, "Not in delivered state");
        require(block.timestamp >= c.deliveryTime + 7 days, "Review period active");

        emit TimeoutClaimed(_contractId);
        _distributeFunds(_contractId, c.agreedPrice, ContractState.Completed);
    }

    /**
     * @dev Opens a dispute.
     *
     * JURY MODE (isJurySystemActive = true):
     *   - Initiator pays their share of the dispute fee (10% of agreedPrice, max $120).
     *   - Case is forwarded to NovaJury which waits for counter-party's fee.
     *   - If counter-party doesn't pay within 3 days → initiator auto-wins.
     *   - If both pay → 3 random jurors assigned, 48h voting window.
     *
     * LEGACY MODE (isJurySystemActive = false):
     *   - Flat DISPUTE_FEE, admin settles manually.
     */
    function disputeWork(
        uint256 _contractId,
        uint8 _categoryId,
        string calldata _reasonURI
    ) external payable validContract(_contractId) nonReentrant whenNotPaused {
        EscrowContract storage c = contracts[_contractId];
        DisputeDetails storage dd = contractDisputeDetails[_contractId];

        require(c.state == ContractState.Delivered, "Not in delivered state");
        require(!dd.resolved && !dd.feePaid, "Already disputed or resolved");
        require(msg.sender == c.client || msg.sender == c.provider, "Only parties");
        require(bytes(_reasonURI).length > 0, "Reason required");

        // Always save category regardless of mode
        dd.initiator = msg.sender;
        dd.feePaid = true;
        dd.disputeReasonURI = _reasonURI;
        dd.categoryId = _categoryId;
        c.state = ContractState.Disputed;

        if (isJurySystemActive) {
            // ── JURY MODE ──────────────────────────────────────────────
            uint256 feeUSDT = INovaJury(juryContract).computeDisputeFeePerParty(c.agreedPrice);
            
            // Require the initiator to have approved usdtToken for feeUSDT
            // Transfer directly to NovaJury
            usdtToken.safeTransferFrom(msg.sender, juryContract, feeUSDT);

            emit DisputeFeePaidUSDT(_contractId, msg.sender, feeUSDT);
            emit DisputeOpened(_contractId, msg.sender, _reasonURI);

            // Forward case data to NovaJury and capture caseId
            uint256 caseId = INovaJury(juryContract).createCase(
                _contractId,
                c.client,
                c.provider,
                msg.sender,
                feeUSDT,
                c.evidenceURI,
                _reasonURI,
                _categoryId
            );
            dd.linkedCaseId = caseId;
        } else {
            // ── LEGACY MODE ────────────────────────────────────────────
            uint256 legacyFee = getLegacyDisputeFee();
            // Allow 1% slippage for Chainlink price timing drift
            uint256 minFee = (legacyFee * 99) / 100;
            require(msg.value >= minFee, "Incorrect legacy dispute fee");
            // Track collected fee separately — prevents confusion with locked escrow ETH
            collectedLegacyDisputeFees += msg.value;

            emit DisputeOpened(_contractId, msg.sender, _reasonURI);
        }
    }

    /**
     * @dev Called exclusively by NovaJury when counter party pays their fee.
     *      Updates counterFeePaid in DisputeDetails for UI and state tracking.
     */
    function onCounterFeePaid(uint256 _contractId) external onlyJuryContract {
        contractDisputeDetails[_contractId].counterFeePaid = true;
    }

    /**
     * @dev Called exclusively by NovaJury after verdict is finalized.
     *      @param _providerBps  Basis points (0-10000) of agreedPrice going to provider.
     *      Examples: 0 = full client win, 10000 = full provider win, 5000 = 50/50 split.
     */
    function settleDisputeByJury(
        uint256 _contractId,
        uint256 _caseId,
        uint256 _providerBps
    ) external onlyJuryContract nonReentrant {
        EscrowContract storage c = contracts[_contractId];
        DisputeDetails storage dd = contractDisputeDetails[_contractId];

        require(c.state == ContractState.Disputed, "Not disputed");
        require(!dd.resolved,                      "Already resolved");
        require(_providerBps <= 10000,             "BPS out of range");

        dd.resolved            = true;
        dd.resolutionTimestamp = block.timestamp;
        dd.resolverAddress     = juryContract;
        dd.linkedCaseId        = _caseId;

        // Convert basis points to actual amounts
        // providerGross: how many ETH (wei) does provider get from agreedPrice
        uint256 providerGross = (c.agreedPrice * _providerBps) / 10000;
        // clientRefund:  everything that isn't going to provider (incl. any extra deposit)
        uint256 clientRefund  = c.totalLocked - providerGross;

        string memory resolutionNote = "Resolved by NovaJury";
        dd.resolutionReasonURI = resolutionNote;

        (uint256 feeTaken, uint256 netProvider) = _distributeFundsCustom(
            _contractId, clientRefund, providerGross
        );

        emit DisputeResolved(_contractId, juryContract, block.timestamp, resolutionNote);
        emit DisputeSettled(_contractId, clientRefund, providerGross, resolutionNote, feeTaken, netProvider);
    }

    /**
     * @dev Admin resolves the dispute.
     */
    function settleDispute(
        uint256 _contractId, 
        uint256 _clientRefund, 
        uint256 _grossProviderPayment,
        string calldata _resolutionURI
    ) external validContract(_contractId) onlyResolverOrOwner nonReentrant {
        EscrowContract storage c = contracts[_contractId];
        DisputeDetails storage dd = contractDisputeDetails[_contractId];

        require(c.state == ContractState.Disputed, "Not in disputed state");
        require(!dd.resolved, "Already resolved");
        require(bytes(_resolutionURI).length > 0, "Resolution required");
        require(_clientRefund + _grossProviderPayment == c.totalLocked, "Invalid split");

        dd.resolutionReasonURI = _resolutionURI;
        dd.resolved = true;
        dd.resolutionTimestamp = block.timestamp;
        dd.resolverAddress = msg.sender;

        // Distribute dispute fee (Legacy ETH) to the resolver
        if (dd.feePaid && !isJurySystemActive) {
            dd.feePaid = false;
            uint256 legacyFee = getLegacyDisputeFee();
            // Use dedicated tracker — avoids touching locked escrow ETH
            uint256 collectedFee = collectedLegacyDisputeFees >= legacyFee
                ? legacyFee
                : collectedLegacyDisputeFees;
            collectedLegacyDisputeFees -= collectedFee;
            pendingWithdrawals[address(0)][msg.sender] += collectedFee;
        }

        (uint256 feeTaken, uint256 netProviderPayment) = _distributeFundsCustom(_contractId, _clientRefund, _grossProviderPayment);
        
        emit DisputeResolved(_contractId, msg.sender, block.timestamp, _resolutionURI);
        emit DisputeSettled(_contractId, _clientRefund, _grossProviderPayment, _resolutionURI, feeTaken, netProviderPayment);
    }

    /**
     * @dev Cancel before acceptance or past delivery deadline.
     */
    function cancelContract(uint256 _contractId) external validContract(_contractId) nonReentrant {
        EscrowContract storage esc = contracts[_contractId];
        
        bool canCancel = false;
        if (esc.state == ContractState.Created) {
            // Client can cancel at any time while created (full refund)
            if (msg.sender == esc.client || msg.sender == owner()) {
                canCancel = true;
            }
        } else if (esc.state == ContractState.Accepted) {
            // Client can cancel if delivery deadline passed (full refund)
            // or client can cancel before deadline (partial penalty may apply)
            if (msg.sender == esc.client) canCancel = true;
        }

        require(canCancel || msg.sender == owner(), "Cannot cancel");

        if (esc.state == ContractState.Accepted && msg.sender == esc.client) {
            // Check if more than half the delivery period has elapsed
            uint256 totalDuration = esc.deliveryDurationDays * 1 days;
            uint256 elapsed = block.timestamp - esc.acceptTime;
            if (block.timestamp > esc.deliveryDeadline) {
                // Gecikme Durumu: Süre bitmişse Provider işi yapmamıştır. 
                // Müşteri ceza ödemeden paranın TAMAMINI iade alır.
                // Aşağıdaki tam iade (Full refund) bloğuna yönlendirilir.
            } else if (elapsed > totalDuration / 2) {
                // PENALTY: Provider gets 50% of agreed price (with platform fee deducted)
                uint256 providerShare = esc.agreedPrice / 2;
                uint256 platformFee = (providerShare * platformFeePercentage) / 100;
                uint256 netProvider = providerShare - platformFee;
                uint256 clientRefund = esc.totalLocked - providerShare;

                esc.state = ContractState.Cancelled;
                _creditPayments(esc.paymentToken, esc.client, esc.provider, clientRefund, netProvider, platformFee);
                emit ContractCancelled(_contractId, msg.sender, clientRefund, providerShare);
                return;
            }
        }

        // Full refund (Created state, Accepted but before half-period, or past delivery deadline)
        esc.state = ContractState.Cancelled;
        pendingWithdrawals[esc.paymentToken][esc.client] += esc.totalLocked;
        emit ContractCancelled(_contractId, msg.sender, esc.totalLocked, 0);
    }

    // --- Internal Helpers ---

    /**
     * @dev Handles distribution for normal completion (pull model).
     */
    function _distributeFunds(uint256 _contractId, uint256 _providerBase, ContractState _finalState) internal {
        EscrowContract storage esc = contracts[_contractId];
        esc.state = _finalState;

        uint256 platformFee = (_providerBase * platformFeePercentage) / 100;
        uint256 netProvider = _providerBase - platformFee;
        uint256 refundAmount = esc.totalLocked - _providerBase;

        _creditPayments(esc.paymentToken, esc.client, esc.provider, refundAmount, netProvider, platformFee);
        emit ContractCompleted(_contractId, esc.client, esc.provider, platformFee);
    }

    /**
     * @dev Handles distribution for mediator settlement (pull model).
     * @return feeTaken The platform fee deducted.
     * @return netProvider The net amount credited to the provider.
     */
    function _distributeFundsCustom(uint256 _contractId, uint256 _clientRefund, uint256 _grossProvider) internal returns (uint256 feeTaken, uint256 netProvider) {
        EscrowContract storage esc = contracts[_contractId];
        esc.state = ContractState.Resolved;

        feeTaken = (_grossProvider * platformFeePercentage) / 100;
        netProvider = _grossProvider - feeTaken;

        _creditPayments(esc.paymentToken, esc.client, esc.provider, _clientRefund, netProvider, feeTaken);
    }

    function _finalizeAndRefund(uint256 _contractId, ContractState _finalState) internal {
        EscrowContract storage esc = contracts[_contractId];
        esc.state = _finalState;
        uint256 amount = esc.totalLocked;
        
        pendingWithdrawals[esc.paymentToken][esc.client] += amount;
    }

    /**
     * @dev Credits amounts to pending balances instead of pushing ETH (pull pattern).
     */
    function _creditPayments(address _token, address _client, address _provider, uint256 _refund, uint256 _payment, uint256 _fee) internal {
        if (_fee > 0) {
            pendingWithdrawals[_token][owner()] += _fee;
        }
        if (_payment > 0) {
            pendingWithdrawals[_token][_provider] += _payment;
        }
        if (_refund > 0) {
            pendingWithdrawals[_token][_client] += _refund;
        }
    }

    // --- Pull Payment ---

    /**
     * @dev Allows any address to withdraw their accumulated balance.
     */
    function withdraw(address _token) external nonReentrant {
        uint256 amount = pendingWithdrawals[_token][msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingWithdrawals[_token][msg.sender] = 0;

        if (_token == address(0)) {
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "Withdraw failed");
        } else {
            IERC20(_token).safeTransfer(msg.sender, amount);
        }

        emit FundsWithdrawn(_token, msg.sender, amount);
    }
}


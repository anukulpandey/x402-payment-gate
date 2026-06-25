// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ERC-8004 Trustless Agents — minimal Identity + Reputation registries.
 * @notice Faithful to the ERC-8004 interface for the functions GateKeep uses:
 *   Identity (ERC-721 agent identities): register / setAgentURI / setAgentWallet /
 *   getAgentWallet, plus a wallet→agentId reverse index so a gateway can resolve a
 *   paying wallet to its on-chain identity.
 *   Reputation: giveFeedback / getSummary / getLastIndex.
 *
 * Simplifications vs the full draft: setAgentWallet is owner-gated (no EIP-712
 * delegation), validation registry omitted. Enough to make x402 payments
 * identity- and reputation-aware on Avalanche.
 */
contract IdentityRegistry {
    string public constant name = "ERC-8004 Trustless Agents";
    string public constant symbol = "AGENT";

    uint256 public totalAgents; // agentIds start at 1; 0 means "no identity"

    mapping(uint256 => address) public ownerOf; // ERC-721 owner
    mapping(address => uint256) public balanceOf;
    mapping(uint256 => string) public agentURI; // Agent Card URI
    mapping(uint256 => address) public agentWallet; // verified payment wallet
    mapping(address => uint256) public agentByWallet; // reverse: wallet -> agentId

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event AgentWalletSet(uint256 indexed agentId, address indexed wallet);

    /// @notice Register a new agent identity; the caller becomes its owner.
    function register(string calldata uri) external returns (uint256 agentId) {
        agentId = ++totalAgents;
        ownerOf[agentId] = msg.sender;
        balanceOf[msg.sender] += 1;
        agentURI[agentId] = uri;
        emit Transfer(address(0), msg.sender, agentId);
        emit Registered(agentId, uri, msg.sender);
    }

    function setAgentURI(uint256 agentId, string calldata uri) external {
        require(ownerOf[agentId] == msg.sender, "not owner");
        agentURI[agentId] = uri;
    }

    /// @notice Bind the wallet this agent pays from, so gateways can resolve it.
    function setAgentWallet(uint256 agentId, address wallet) external {
        require(ownerOf[agentId] == msg.sender, "not owner");
        address prev = agentWallet[agentId];
        if (prev != address(0)) agentByWallet[prev] = 0;
        require(agentByWallet[wallet] == 0, "wallet taken");
        agentWallet[agentId] = wallet;
        agentByWallet[wallet] = agentId;
        emit AgentWalletSet(agentId, wallet);
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        return agentWallet[agentId];
    }

    function tokenURI(uint256 agentId) external view returns (string memory) {
        return agentURI[agentId];
    }
}

contract ReputationRegistry {
    address public immutable identityRegistry;

    struct Feedback {
        address client;
        int128 value;
        uint8 valueDecimals;
        string tag1;
        bool revoked;
    }

    mapping(uint256 => Feedback[]) private _feedback; // agentId -> feedback

    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string tag1
    );

    constructor(address _identityRegistry) {
        identityRegistry = _identityRegistry;
    }

    function getIdentityRegistry() external view returns (address) {
        return identityRegistry;
    }

    /// @notice Post feedback about an agent (e.g. a gate attesting a successful, paid interaction).
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata, /* tag2 */
        string calldata, /* endpoint */
        string calldata, /* feedbackURI */
        bytes32 /* feedbackHash */
    ) external {
        uint64 idx = uint64(_feedback[agentId].length);
        _feedback[agentId].push(Feedback(msg.sender, value, valueDecimals, tag1, false));
        emit NewFeedback(agentId, msg.sender, idx, value, valueDecimals, tag1);
    }

    /// @notice Aggregate reputation: number of feedbacks + average value.
    function getSummary(
        uint256 agentId,
        address[] calldata, /* clientAddresses */
        string calldata, /* tag1 */
        string calldata /* tag2 */
    ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals) {
        Feedback[] storage fs = _feedback[agentId];
        int256 sum;
        uint64 n;
        for (uint256 i = 0; i < fs.length; i++) {
            if (!fs[i].revoked) {
                sum += int256(fs[i].value);
                n++;
            }
        }
        count = n;
        summaryValue = n == 0 ? int128(0) : int128(sum / int256(uint256(n)));
        summaryValueDecimals = 0;
    }

    function getLastIndex(uint256 agentId, address /* client */) external view returns (uint64) {
        return uint64(_feedback[agentId].length);
    }
}

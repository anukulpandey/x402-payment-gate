// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockUSDC
 * @notice A minimal, faucet-mintable ERC-20 that implements EIP-3009
 *         `transferWithAuthorization` — the exact mechanism Circle's real USDC
 *         uses for gasless, signature-based transfers in the x402 protocol.
 *
 *         This lets GateKeep run the FULL real settlement flow against a local
 *         Anvil chain: an agent signs an EIP-712 authorization off-chain, and
 *         GateKeep's facilitator submits it on-chain here, paying the gas. The
 *         only difference from production is the token contract — swap this
 *         address for real USDC on Base/Avalanche and nothing else changes.
 */
contract MockUSDC {
    string public name = "USD Coin";
    string public symbol = "USDC";
    uint8 public constant decimals = 6;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // EIP-3009: authorizationState[authorizer][nonce] => used?
    mapping(address => mapping(bytes32 => bool)) public authorizationState;

    bytes32 public immutable DOMAIN_SEPARATOR;

    // keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
        0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("USD Coin")),
                keccak256(bytes("2")),
                block.chainid,
                address(this)
            )
        );
    }

    /// @notice Open faucet — mint test USDC to anyone (test token only).
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    /**
     * @notice EIP-3009 gasless transfer. The `from` account signed the
     *         authorization off-chain; any relayer (GateKeep's facilitator)
     *         can submit it and pay the gas.
     */
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes calldata signature
    ) external {
        require(block.timestamp > validAfter, "auth not yet valid");
        require(block.timestamp < validBefore, "auth expired");
        require(!authorizationState[from][nonce], "auth already used");

        bytes32 structHash = keccak256(
            abi.encode(TRANSFER_WITH_AUTHORIZATION_TYPEHASH, from, to, value, validAfter, validBefore, nonce)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        require(_recover(digest, signature) == from, "invalid signature");

        authorizationState[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);
        _transfer(from, to, value);
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(balanceOf[from] >= value, "insufficient balance");
        unchecked {
            balanceOf[from] -= value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }

    function _recover(bytes32 digest, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "bad signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 0x20))
            s := mload(add(sig, 0x40))
            v := byte(0, mload(add(sig, 0x60)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "bad v");
        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "zero signer");
        return signer;
    }
}

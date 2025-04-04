// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PaymentPreferences
 * @dev Maps user addresses to IPFS hashes that store their payment preferences
 */
contract PaymentPreferences is Ownable, ReentrancyGuard {
    // Chain identifiers (keep for reference)
    struct ChainInfo {
        uint256 chainId;
        string name;
    }
    
    // Supported tokens (keep for reference)
    struct TokenInfo {
        address tokenAddress;
        string symbol;
        uint8 decimals;
    }
    
    // Mapping from user address to their IPFS hash containing preferences
    mapping(address => string) private userPreferencesIPFSHash;
    
    // Mapping to store the timestamp of the last update
    mapping(address => uint256) private lastUpdateTimestamp;
    
    // Supported chains
    ChainInfo[] public supportedChains;
    
    // Supported tokens per chain
    mapping(uint256 => TokenInfo[]) public supportedTokens;
    
    // Events
    event PreferencesUpdated(address indexed user, string ipfsHash, uint256 timestamp);
    event PreferencesRemoved(address indexed user, uint256 timestamp);
    
    constructor() {
        // Add initial supported chains
        supportedChains.push(ChainInfo(1, "Ethereum"));
        supportedChains.push(ChainInfo(137, "Polygon"));
        supportedChains.push(ChainInfo(56, "BSC"));
        supportedChains.push(ChainInfo(43114, "Avalanche"));
        supportedChains.push(ChainInfo(8453, "Base"));
        supportedChains.push(ChainInfo(42161, "Arbitrum"));
    }
    
    /**
     * @dev Add a supported token to a chain
     * @param chainId Chain identifier
     * @param tokenAddress Token contract address
     * @param symbol Token symbol
     * @param decimals Token decimals
     */
    function addSupportedToken(uint256 chainId, address tokenAddress, string memory symbol, uint8 decimals) external onlyOwner {
        supportedTokens[chainId].push(TokenInfo(tokenAddress, symbol, decimals));
    }
    
    /**
     * @dev Set or update user's preferences IPFS hash
     * @param ipfsHash IPFS hash that points to the user's preferences JSON
     */
    function setPreferencesIPFSHash(string memory ipfsHash) external {
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        
        userPreferencesIPFSHash[msg.sender] = ipfsHash;
        lastUpdateTimestamp[msg.sender] = block.timestamp;
        
        emit PreferencesUpdated(msg.sender, ipfsHash, block.timestamp);
    }
    
    /**
     * @dev Get user's preferences IPFS hash
     * @param user User address
     * @return IPFS hash and last update timestamp
     */
    function getPreferencesIPFSHash(address user) external view returns (string memory, uint256) {
        return (userPreferencesIPFSHash[user], lastUpdateTimestamp[user]);
    }
    
    /**
     * @dev Check if user has preferences set
     * @param user User address
     * @return True if the user has preferences set
     */
    function hasPreferences(address user) external view returns (bool) {
        return bytes(userPreferencesIPFSHash[user]).length > 0;
    }
    
    /**
     * @dev Remove user's preferences
     */
    function removePreferences() external {
        require(bytes(userPreferencesIPFSHash[msg.sender]).length > 0, "No preferences to remove");
        
        delete userPreferencesIPFSHash[msg.sender];
        lastUpdateTimestamp[msg.sender] = block.timestamp;
        
        emit PreferencesRemoved(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Get all supported chains
     * @return Array of supported chains
     */
    function getSupportedChains() external view returns (ChainInfo[] memory) {
        return supportedChains;
    }
    
    /**
     * @dev Get all supported tokens for a chain
     * @param chainId Chain identifier
     * @return Array of supported tokens
     */
    function getSupportedTokens(uint256 chainId) external view returns (TokenInfo[] memory) {
        return supportedTokens[chainId];
    }
} 
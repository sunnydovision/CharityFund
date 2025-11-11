// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CharityFund
 * @dev Contract nhận quyên góp ETH và tự động chuyển về Gnosis Safe khi đạt ngưỡng
 */
contract CharityFund {
    // Address của Gnosis Safe (multisig wallet)
    address public safe;
    
    // Ngưỡng tự động chuyển (5 ETH)
    uint256 public constant THRESHOLD = 5 ether;
    
    // Events
    event DonationReceived(
        address indexed donor,
        uint256 amount,
        uint256 balance,
        uint256 timestamp
    );
    
    event AutoTransfer(
        uint256 amount,
        address indexed to,
        uint256 timestamp
    );
    
    event SafeUpdated(
        address indexed oldSafe,
        address indexed newSafe,
        uint256 timestamp
    );
    
    // Modifier: chỉ cho phép Safe hiện tại
    modifier onlySafe() {
        require(msg.sender == safe, "Only Safe can call this function");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _safe Địa chỉ Gnosis Safe
     */
    constructor(address _safe) {
        require(_safe != address(0), "Safe address cannot be zero");
        safe = _safe;
    }
    
    /**
     * @dev Nhận ETH - tự động trigger check và chuyển nếu đủ ngưỡng
     */
    receive() external payable {
        require(msg.value > 0, "Donation must be greater than 0");
        
        emit DonationReceived(
            msg.sender,
            msg.value,
            address(this).balance,
            block.timestamp
        );
        
        // Kiểm tra và tự động chuyển nếu >= threshold
        _checkAndTransfer();
    }
    
    /**
     * @dev Fallback function
     */
    fallback() external payable {
        require(msg.value > 0, "Donation must be greater than 0");
        
        emit DonationReceived(
            msg.sender,
            msg.value,
            address(this).balance,
            block.timestamp
        );
        
        _checkAndTransfer();
    }
    
    /**
     * @dev Kiểm tra và tự động chuyển nếu balance >= threshold
     */
    function _checkAndTransfer() internal {
        uint256 balance = address(this).balance;
        
        if (balance >= THRESHOLD) {
            _transferToSafe();
        }
    }
    
    /**
     * @dev Chuyển toàn bộ balance về Safe
     */
    function _transferToSafe() internal {
        uint256 amount = address(this).balance;
        require(amount > 0, "No funds to transfer");
        
        (bool success, ) = safe.call{value: amount}("");
        require(success, "Transfer to Safe failed");
        
        emit AutoTransfer(amount, safe, block.timestamp);
    }
    
    /**
     * @dev Cho phép gọi thủ công để chuyển quỹ (ai cũng có thể gọi)
     */
    function transferToSafe() external {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to transfer");
        
        _transferToSafe();
    }
    
    /**
     * @dev Cập nhật địa chỉ Safe mới (chỉ Safe hiện tại có quyền)
     * @param _newSafe Địa chỉ Safe mới
     */
    fnuction updateSafe(address _newSafe) external onlySafe {
        require(_newSafe != address(0), "New Safe address cannot be zero");
        require(_newSafe != safe, "New Safe must be different from current Safe");
        
        address oldSafe = safe;
        safe = _newSafe;
        
        emit SafeUpdated(oldSafe, _newSafe, block.timestamp);
    }
    
    /**
     * @dev Lấy balance hiện tại của contract
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Kiểm tra xem có đủ ngưỡng để auto transfer không
     */
    function isAboveThreshold() external view returns (bool) {
        return address(this).balance >= THRESHOLD;
    }
}

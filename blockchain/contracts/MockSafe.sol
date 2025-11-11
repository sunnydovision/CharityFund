// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockSafe
 * @dev Contract giả lập Gnosis Safe để test local
 * Chỉ nhận ETH và emit event để tracking
 */
contract MockSafe {
    // Events
    event FundsReceived(
        address indexed from,
        uint256 amount,
        uint256 balance,
        uint256 timestamp
    );
    
    event FundsWithdrawn(
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );
    
    // Owner addresses (giả lập multisig)
    address[] public owners;
    
    /**
     * @dev Constructor
     * @param _owners Danh sách owner addresses
     */
    constructor(address[] memory _owners) {
        require(_owners.length >= 2, "At least 2 owners required");
        owners = _owners;
    }
    
    /**
     * @dev Nhận ETH
     */
    receive() external payable {
        emit FundsReceived(
            msg.sender,
            msg.value,
            address(this).balance,
            block.timestamp
        );
    }
    
    /**
     * @dev Fallback
     */
    fallback() external payable {
        emit FundsReceived(
            msg.sender,
            msg.value,
            address(this).balance,
            block.timestamp
        );
    }
    
    /**
     * @dev Rút ETH (giả lập withdraw từ Safe)
     * Trong thực tế Gnosis Safe sẽ require multiple signatures
     */
    function withdraw(address payable _to, uint256 _amount) external {
        require(_isOwner(msg.sender), "Only owners can withdraw");
        require(_amount <= address(this).balance, "Insufficient balance");
        require(_to != address(0), "Invalid recipient");
        
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(_to, _amount, block.timestamp);
    }
    
    /**
     * @dev Kiểm tra xem address có phải owner không
     */
    function _isOwner(address _address) internal view returns (bool) {
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == _address) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Lấy balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Lấy danh sách owners
     */
    function getOwners() external view returns (address[] memory) {
        return owners;
    }
}

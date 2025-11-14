//SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract CharityFundContract {
    address public safeAddress;
    uint256 public capAmountForAutoTransfering;
    uint256 private totalReceive;
    uint256 private totalTransfer;

    constructor(address _safeAddress, uint256 _capAmountForAutoTransferingWei) {
        safeAddress = _safeAddress;
        // Nhận NGAY TỪ FRONTEND theo WEI (parseEther("5"))
        capAmountForAutoTransfering = _capAmountForAutoTransferingWei;
    }

    event donationReceived(address indexed donor, uint256 amount, uint256 balance, uint256 timestamp);
    event donationFallback(address indexed donor, uint256 amount, uint256 balance, uint256 timestamp);
    event autoTransfer(uint256 amount, address indexed to, uint256 timestamp);
    event manualTransfer(uint256 amount, address indexed by, uint256 timestamp);
    event SafeUpdated(address indexed oldSafe, address indexed newSafe, uint256 timestamp);

    // Nhận donation chuẩn
    receive() external payable {
        require(msg.value > 0, "Donation must be greater than 0");
        totalReceive += msg.value;
        emit donationReceived(msg.sender, msg.value, address(this).balance, block.timestamp);
        checkAndTransfer();
    }

    // Nhận tiền qua fallback (cũng ghi sổ giống receive)
    fallback() external payable {
        if (msg.value > 0) {
            totalReceive += msg.value;
            emit donationFallback(msg.sender, msg.value, address(this).balance, block.timestamp);
            checkAndTransfer();
        } else {
            emit donationFallback(msg.sender, 0, address(this).balance, block.timestamp);
        }
    }

    function checkAndTransfer() internal {
        uint256 balance = address(this).balance;
        if (balance >= capAmountForAutoTransfering) {
            transferToSafe(balance);
        }
    }

    function transferToSafe(uint256 amount) internal {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to transfer");
        require(amount <= balance, "Exceed amount transferring");

        // Effects before Interactions
        totalTransfer += amount;

        (bool ok, ) = safeAddress.call{value: amount}("");
        require(ok, "Transfer to Safe failed");

        emit autoTransfer(amount, safeAddress, block.timestamp);
    }

    // Manual (chỉ Safe mới gọi được)
    function manualTransferToSafe(uint256 amount) external onlySafe {
        require(amount <= address(this).balance, "Amount exceeds balance");
        // sẽ tự tăng totalTransfer + emit autoTransfer bên trong
        transferToSafe(amount);
        emit manualTransfer(amount, msg.sender, block.timestamp); // by = msg.sender
    }

    modifier onlySafe() {
        require(msg.sender == safeAddress, "Only Gnosis Safe");
        _;
    }

    function updateSafe(address _newSafeAddress) external onlySafe {
        require(_newSafeAddress != address(0), "New Safe address cannot be zero");
        require(_newSafeAddress != safeAddress, "New Safe must be different from current Safe");
        address old = safeAddress;
        safeAddress = _newSafeAddress;
        emit SafeUpdated(old, _newSafeAddress, block.timestamp);
    }

    // Views
    function getBalance() external view returns (uint256) { return address(this).balance; }
    function isAboveThreshold() external view returns (bool) { return address(this).balance >= capAmountForAutoTransfering; }
    function getTotalReceive() external view returns (uint256) { return totalReceive; }
    function getTotalTransfer() external view returns (uint256) { return totalTransfer; }
}

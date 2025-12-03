// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISafeLike {
    function isModuleEnabled(address module) external view returns (bool);
    function getTransactionHash(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address refundReceiver,
        uint256 _nonce
    ) external view returns (bytes32);
    function nonce() external view returns (uint256);
}

interface ISafeGuard {
    function checkTransaction(
        address to,
        uint256 value,
        bytes memory data,
        uint8 operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address refundReceiver,
        bytes memory signatures,
        address msgSender
    ) external view;
    
    function checkAfterExecution(bytes32 txHash, bool success) external;
}

contract RequireSignerAForTransferGuard is ISafeGuard {
    address public immutable safe;
    address public immutable requiredSigner;
    
    constructor(address _safe, address _requiredSigner) {
        safe = _safe;
        requiredSigner = _requiredSigner;
    }
    
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0xe6d7a83a; // ISafeGuard interface ID
    }
    
    function checkTransaction(
        address to,
        uint256 value,
        bytes memory data,
        uint8 operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address refundReceiver,
        bytes memory /*signatures*/,
        address msgSender
    ) external override view {
        // Chỉ Safe được phép gọi guard
        if (msg.sender != safe) {
            return;
        }

        // WHITELIST setGuard & các hàm quản trị Safe
        if (to == safe && data.length >= 4) {
            bytes4 funcSelector;
            assembly {
                funcSelector := mload(add(data, 0x20))
                funcSelector := shr(224, funcSelector)
            }
            
            if (
                funcSelector == 0xe19a9dd9 || // setGuard(address)
                funcSelector == 0xe318b52b || // setGuard(address) (variant khác)
                funcSelector == 0xf08a0323 || // setFallbackHandler(address)
                funcSelector == 0xd4d9bdcd || // approveHash(bytes32)
                funcSelector == 0xf8dc5dd9 || // removeOwner(address,address,uint256)
                funcSelector == 0x694e80c3 || // changeThreshold(uint256)
                funcSelector == 0x610b5925 || // enableModule(address)
                funcSelector == 0xe009cfde || // disableModule(address)
                funcSelector == 0x0d582f13    // addOwnerWithThreshold(address,uint256)
            ) {
                return; // không check signer
            }
        }

        //  Nếu gọi từ module đã enable pass
        if (msgSender != address(0) && msgSender != safe) {
            try ISafeLike(safe).isModuleEnabled(msgSender) returns (bool enabled) {
                if (enabled) {
                    return;
                }
            } catch {
                // nếu gọi isModuleEnabled fail (simulate lạ) -> bỏ qua, xử lý như tx thường
            }
        }

        //  Nhận diện có phải chuyển tiền không
        bool isTransfer = value > 0;

        if (!isTransfer && data.length >= 4) {
            bytes4 funcSelector;
            assembly {
                funcSelector := mload(add(data, 0x20))
                funcSelector := shr(224, funcSelector)
            }
            if (
                funcSelector == 0xa9059cbb || // ERC20 transfer(address,uint256)
                funcSelector == 0x23b872dd    // ERC20 transferFrom(address,address,uint256)
            ) {
                isTransfer = true;
            }
        }

        // Không phải transfer → không ràng buộc gì thêm
        if (!isTransfer) {
            return;
        }

        // TRANSFER => BẮT BUỘC msgSender phải là requiredSigner (A)
        if (msgSender != requiredSigner) {
            revert("Missing required signer (executor) for transfer");
        }

        // Nếu msgSender == requiredSigner -> OK, cho execute
    }
    
    function checkAfterExecution(bytes32, bool) external override {
        // Không cần xử lý sau khi execute
    }
}

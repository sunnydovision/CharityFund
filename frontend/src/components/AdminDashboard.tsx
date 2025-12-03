import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  TextField,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SendIcon from '@mui/icons-material/Send';
import { manualTransferToSafe, getProvider, isConnectedToSafe, updateSafeAddress } from '../services/ethers.service';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { ethers } from 'ethers';
import UpdateIcon from '@mui/icons-material/Update';
import SecurityIcon from '@mui/icons-material/Security';

export const AdminDashboard: React.FC = () => {
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [isSafeOwner, setIsSafeOwner] = useState(false);
  const [safeOwners, setSafeOwners] = useState<string[]>([]);
  const [isCheckingOwner, setIsCheckingOwner] = useState(false);

  const [amountEth, setAmountEth] = useState<string>('');
  const [isValidAmount, setIsValidAmount] = useState<boolean>(true);

  // Update Safe address state
  const [newSafeAddress, setNewSafeAddress] = useState<string>('');
  const [isUpdatingSafe, setIsUpdatingSafe] = useState(false);
  const [updateSafeError, setUpdateSafeError] = useState<string | null>(null);
  const [updateSafeSuccess, setUpdateSafeSuccess] = useState(false);
  const [updateSafeTxHash, setUpdateSafeTxHash] = useState('');
  const [confirmUpdateDialog, setConfirmUpdateDialog] = useState(false);
  const [isValidSafeAddress, setIsValidSafeAddress] = useState(true);

  const { isConnected, address } = useWallet();
  const { contractBalance, safeAddress, threshold, refreshData } = useContract();

  useEffect(() => {
    const checkIfSafeOwner = async () => {
      if (!isConnected || !address) {
        setIsSafeOwner(false);
        return;
      }

      setIsCheckingOwner(true);
      try {
        // QUAN TRỌNG: Nếu đang dùng Safe Wallet, address là Safe address
        // Cần check xem address có phải là Safe address không
        const isUsingSafeWallet = isConnectedToSafe();
        
        if (isUsingSafeWallet) {
          // Khi dùng Safe Wallet, address là Safe address
          // Check xem address có match với safeAddress từ contract không
          if (safeAddress && address.toLowerCase() === safeAddress.toLowerCase()) {
            // Đây là Safe address - có quyền gọi updateSafe()
            setIsSafeOwner(true);
            setSafeOwners([]); // Không cần load owners
            setIsCheckingOwner(false);
            return;
          }
        }

        // Nếu không dùng Safe Wallet, check xem có phải owner không
        if (!safeAddress) {
          setIsSafeOwner(false);
          setIsCheckingOwner(false);
          return;
        }

        const provider = getProvider();
        if (!provider) {
          setIsSafeOwner(false);
          setIsCheckingOwner(false);
          return;
        }

        const { ethers } = await import('ethers');
        const safeABI = ['function getOwners() external view returns (address[])'];
        const safeContract = new ethers.Contract(safeAddress, safeABI, provider);
        const owners = await safeContract.getOwners();

        setSafeOwners(owners);
        
        // Check xem address có phải là owner hoặc Safe address không
        const isOwner = owners.some(
          (owner: string) => owner.toLowerCase() === address.toLowerCase()
        );
        
        // Hoặc address có phải là Safe address không
        const isSafeAddr = safeAddress && address.toLowerCase() === safeAddress.toLowerCase();
        
        setIsSafeOwner(isOwner || isSafeAddr);
      } catch (error) {
        console.error('Error checking Safe owner:', error);
        setIsSafeOwner(false);
      } finally {
        setIsCheckingOwner(false);
      }
    };

    checkIfSafeOwner();
  }, [isConnected, address, safeAddress]);

  const validateAmount = (value: string): boolean => {
    const amount = parseFloat(value);
    const bal = parseFloat(contractBalance || '0');
    
    if (value === '') {
      return false;
    }
    
    if (isNaN(amount) || amount <= 0) {
      return false;
    }
    
    if (amount > bal) {
      return false;
    }
    
    return true;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and a single decimal point
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setAmountEth(value);
      setIsValidAmount(validateAmount(value));
    }
  };

  const handleTransferClick = () => {
    setError(null);
    
    if (!isValidAmount) {
      setError('Please enter a valid amount to transfer');
      return;
    }
    
    const bal = parseFloat(contractBalance || '0');
    if (bal === 0) {
      setError('Contract balance is zero');
      return;
    }

    setConfirmDialog(true);
  };

  const handleTransferConfirm = async () => {
    setConfirmDialog(false);
    setIsTransferring(true);
    setError(null);

    try {
      // pass ETH string to service
      const hash = await manualTransferToSafe(amountEth);
      setTxHash(hash);
      setSuccess(true);

      // Refresh after a moment
      setTimeout(() => {
        refreshData();
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to transfer. Please try again.');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleCloseSuccess = () => setSuccess(false);

  // Update Safe address handlers
  const validateSafeAddress = (addr: string): boolean => {
    if (!addr) return false;
    try {
      return ethers.isAddress(addr);
    } catch {
      return false;
    }
  };

  const handleSafeAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setNewSafeAddress(value);
    setIsValidSafeAddress(value === '' || validateSafeAddress(value));
    setUpdateSafeError(null);
  };

  const handleUpdateSafeClick = () => {
    setUpdateSafeError(null);
    
    if (!newSafeAddress) {
      setUpdateSafeError('Please enter a new Safe address');
      return;
    }

    if (!isValidSafeAddress) {
      setUpdateSafeError('Invalid Ethereum address format');
      return;
    }

    if (newSafeAddress.toLowerCase() === safeAddress?.toLowerCase()) {
      setUpdateSafeError('New Safe address must be different from current Safe address');
      return;
    }

    setConfirmUpdateDialog(true);
  };

  const handleUpdateSafeConfirm = async () => {
    setConfirmUpdateDialog(false);
    setIsUpdatingSafe(true);
    setUpdateSafeError(null);

    try {
      const hash = await updateSafeAddress(newSafeAddress);
      setUpdateSafeTxHash(hash);
      setUpdateSafeSuccess(true);
      setNewSafeAddress(''); // Clear form

      // Refresh data after a moment to get updated Safe address
      setTimeout(() => {
        refreshData();
      }, 2000);
    } catch (err: any) {
      setUpdateSafeError(err?.message || 'Failed to update Safe address. Please try again.');
    } finally {
      setIsUpdatingSafe(false);
    }
  };

  const handleCloseUpdateSuccess = () => setUpdateSafeSuccess(false);

  if (!isConnected) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <AdminPanelSettingsIcon color="primary" />
            <Typography variant="h6">Admin Dashboard</Typography>
          </Box>
          <Alert severity="info">Please connect your wallet to access admin functions</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <AdminPanelSettingsIcon color="primary" />
            <Typography variant="h6">Admin Dashboard</Typography>
          </Box>

          {isCheckingOwner && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <CircularProgress size={16} sx={{ mr: 1, verticalAlign: 'middle' }} />
              Checking if you are a Safe owner...
            </Alert>
          )}

          {!isCheckingOwner && !isSafeOwner && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              ⚠️ You are NOT a Safe owner
              <br />
              <strong>Your Address:</strong> {address}
              <br />
              <strong>Safe Address:</strong> {safeAddress || 'Loading...'}
              <br />
              <strong>Safe Owners:</strong>{' '}
              {safeOwners.length > 0
                ? safeOwners.map((o) => `${o.substring(0, 6)}...`).join(', ')
                : 'Loading...'}
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                Only Safe owners can update the Safe address. Manual transfers can be done by anyone.
              </Typography>
            </Alert>
          )}

          {!isCheckingOwner && isSafeOwner && (
            <Alert severity="success" sx={{ mb: 2 }}>
              ✅ You ARE a Safe owner! You have full admin access.
            </Alert>
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Current Contract Balance
            </Typography>
            <Typography variant="h4" gutterBottom>
              {contractBalance ? Number(contractBalance).toLocaleString(undefined, {
                minimumFractionDigits: 4,
                maximumFractionDigits: 4
              }) : '0.0000'} ETH
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Available for manual transfer
            </Typography>
          </Box>

          <TextField
            label="ETH amount to transfer"
            placeholder={`e.g. 0.005 (Max: ${parseFloat(contractBalance || '0').toFixed(6)} ETH)`}
            fullWidth
            value={amountEth}
            onChange={handleAmountChange}
            sx={{ mb: 2 }}
            inputProps={{ 
              inputMode: 'decimal',
              pattern: '^\d*\.?\d*$'
            }}
            error={!isValidAmount && amountEth !== ''}
            helperText={!isValidAmount && amountEth !== '' ? 'Please enter a valid amount' : ''}
          />

          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>Manual Transfer:</strong> Transfer the specified amount from the contract to
            the Safe wallet (can be done by anyone).
          </Typography>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleTransferClick}
            disabled={isTransferring || !isValidAmount || amountEth === '' || parseFloat(contractBalance) === 0}
            startIcon={isTransferring ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {isTransferring ? 'Processing Transfer...' : 'Transfer to Safe'}
          </Button>

          <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="caption" color="info.contrastText">
              <strong>Note:</strong> Auto-transfer triggers when balance ≥ {threshold} ETH.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Update Safe Address Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <SecurityIcon color="primary" />
            <Typography variant="h6">Update Safe Address</Typography>
          </Box>

          {updateSafeError && <Alert severity="error" sx={{ mb: 2 }}>{updateSafeError}</Alert>}

          <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1, mb: 2 }}>
            <Typography variant="body2" color="info.contrastText" gutterBottom>
              Current Safe Address
            </Typography>
            <Typography variant="body1" color="info.contrastText" sx={{ wordBreak: 'break-all' }}>
              {safeAddress || 'Loading...'}
            </Typography>
          </Box>

          <TextField
            label="New Safe Address"
            placeholder="0x..."
            fullWidth
            value={newSafeAddress}
            onChange={handleSafeAddressChange}
            sx={{ mb: 2 }}
            error={!isValidSafeAddress && newSafeAddress !== ''}
            helperText={
              !isValidSafeAddress && newSafeAddress !== ''
                ? 'Invalid Ethereum address format'
                : 'Enter the new Safe wallet address'
            }
          />

          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>Update Safe Address:</strong> Change the Safe wallet address that receives funds
            from the contract. Only the current Safe address can update this.
          </Typography>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleUpdateSafeClick}
            disabled={
              isUpdatingSafe ||
              !isValidSafeAddress ||
              !newSafeAddress ||
              newSafeAddress.toLowerCase() === safeAddress?.toLowerCase()
            }
            startIcon={isUpdatingSafe ? <CircularProgress size={20} /> : <UpdateIcon />}
          >
            {isUpdatingSafe ? 'Processing Update...' : 'UPDATE SAFE'}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>Confirm Transfer</DialogTitle>
        <DialogContent>
          <Typography>
            Transfer <strong>{parseFloat(amountEth || '0').toFixed(6)} ETH</strong> from contract to Safe?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will withdraw funds from the contract and send them to the Safe address.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Safe address: {safeAddress || 'Loading...'}
          </Typography>
          <Typography variant="body2" color="warning.main" sx={{ mt: 1, fontWeight: 'bold' }}>
            ⚠️ Contract has "onlySafe" modifier - requires Safe Wallet and multisig approval.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Transaction will be proposed to Safe Wallet and needs approval from Safe owners.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button onClick={handleTransferConfirm} variant="contained" color="primary">
            Confirm Transfer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Update Safe Dialog */}
      <Dialog open={confirmUpdateDialog} onClose={() => setConfirmUpdateDialog(false)}>
        <DialogTitle>Confirm Safe Address Update</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to update the Safe address?
          </Typography>
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Current Safe Address:</strong>
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all', mb: 2 }}>
              {safeAddress || 'Loading...'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>New Safe Address:</strong>
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              {newSafeAddress}
            </Typography>
          </Box>
          <Typography variant="body2" color="warning.main" sx={{ mt: 2, fontWeight: 'bold' }}>
            ⚠️ Contract has "onlySafe" modifier - only current Safe address can call this function.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmUpdateDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateSafeConfirm} variant="contained" color="primary">
            Confirm Update
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={success}
        autoHideDuration={10000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSuccess} 
          severity="success" 
          sx={{ width: '100%' }}
          variant="filled"
        >
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Transfer Successful!
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              Amount: {parseFloat(amountEth).toFixed(6)} ETH
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, wordBreak: 'break-all' }}>
              TX: {txHash}
            </Typography>
            <Button 
              size="small" 
              color="inherit" 
              href={`https://etherscan.io/tx/${txHash}`} 
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mt: 1, color: 'white', textDecoration: 'underline' }}
            >
              View on Etherscan
            </Button>
          </Box>
        </Alert>
      </Snackbar>

      {/* Update Safe Success Snackbar */}
      <Snackbar
        open={updateSafeSuccess}
        autoHideDuration={10000}
        onClose={handleCloseUpdateSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseUpdateSuccess}
          severity="success"
          sx={{ width: '100%' }}
          variant="filled"
        >
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Safe Address Update Successful!
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              Safe address has been updated successfully.
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, wordBreak: 'break-all' }}>
              TX: {updateSafeTxHash}
            </Typography>
            <Button
              size="small"
              color="inherit"
              href={`https://sepolia.etherscan.io/tx/${updateSafeTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mt: 1, color: 'white', textDecoration: 'underline' }}
            >
              View on Etherscan
            </Button>
          </Box>
        </Alert>
      </Snackbar>
    </>
  );
};

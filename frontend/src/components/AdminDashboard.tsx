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
import { manualTransferToSafe, getProvider, isConnectedToSafe } from '../services/ethers.service';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { SAFE_ADDRESS } from '../constants/contractAddress';

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

  const { isConnected, address } = useWallet();
  const { contractBalance, threshold, refreshData } = useContract();

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
          // Check xem address có match với SAFE_ADDRESS không
          if (SAFE_ADDRESS && address.toLowerCase() === SAFE_ADDRESS.toLowerCase()) {
            // Đây là Safe address - có quyền gọi updateSafe()
            setIsSafeOwner(true);
            setSafeOwners([]); // Không cần load owners
            setIsCheckingOwner(false);
            return;
          }
        }

        // Nếu không dùng Safe Wallet, check xem có phải owner không
        const provider = getProvider();
        if (!provider) {
          setIsSafeOwner(false);
          setIsCheckingOwner(false);
          return;
        }

        const { ethers } = await import('ethers');
        const safeABI = ['function getOwners() external view returns (address[])'];
        const safeContract = new ethers.Contract(SAFE_ADDRESS, safeABI, provider);
        const owners = await safeContract.getOwners();

        setSafeOwners(owners);
        
        // Check xem address có phải là owner hoặc Safe address không
        const isOwner = owners.some(
          (owner: string) => owner.toLowerCase() === address.toLowerCase()
        );
        
        // Hoặc address có phải là Safe address không
        const isSafeAddress = SAFE_ADDRESS && address.toLowerCase() === SAFE_ADDRESS.toLowerCase();
        
        setIsSafeOwner(isOwner || isSafeAddress);
      } catch (error) {
        console.error('Error checking Safe owner:', error);
        setIsSafeOwner(false);
      } finally {
        setIsCheckingOwner(false);
      }
    };

    checkIfSafeOwner();
  }, [isConnected, address]);

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
              <strong>Safe Address:</strong> {SAFE_ADDRESS}
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
            Safe address: {SAFE_ADDRESS}
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
    </>
  );
};

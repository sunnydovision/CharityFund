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
import { manualTransferToSafe, getProvider } from '../services/ethers.service';
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

  // NEW: amount state (ETH string)
  const [amountEth, setAmountEth] = useState<string>('');

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
        const provider = getProvider();
        if (!provider) return;

        const { ethers } = await import('ethers');
        const safeABI = ['function getOwners() external view returns (address[])'];
        const safeContract = new ethers.Contract(SAFE_ADDRESS, safeABI, provider);
        const owners = await safeContract.getOwners();

        setSafeOwners(owners);
        const isOwner = owners.some(
          (owner: string) => owner.toLowerCase() === address.toLowerCase()
        );
        setIsSafeOwner(isOwner);
      } catch {
        setIsSafeOwner(false);
      } finally {
        setIsCheckingOwner(false);
      }
    };

    checkIfSafeOwner();
  }, [isConnected, address]);

  const handleTransferClick = () => {
    setError(null);

    const bal = parseFloat(contractBalance || '0');
    if (bal === 0) {
      setError('Contract balance is zero');
      return;
    }

    // Validate amount
    const n = parseFloat(amountEth);
    if (isNaN(n) || n <= 0) {
      setError('Please enter a positive ETH amount.');
      return;
    }
    if (n > bal) {
      setError(`Amount exceeds contract balance (${bal.toFixed(6)} ETH).`);
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
              {parseFloat(contractBalance).toFixed(4)} ETH
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Available for manual transfer
            </Typography>
          </Box>

          {/* NEW: input amount */}
          <TextField
            label="ETH amount to transfer"
            placeholder="e.g. 0.005"
            fullWidth
            value={amountEth}
            onChange={(e) => setAmountEth(e.target.value)}
            sx={{ mb: 2 }}
            inputProps={{ inputMode: 'decimal' }}
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
            disabled={isTransferring || parseFloat(contractBalance) === 0}
            startIcon={isTransferring ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {isTransferring ? 'Transferring...' : 'Transfer to Safe'}
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
            Transfer <strong>{parseFloat(amountEth || '0').toFixed(6)} ETH</strong> to the Safe?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Safe address: {SAFE_ADDRESS}
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
        autoHideDuration={6000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSuccess} severity="success" sx={{ width: '100%' }}>
          Transfer successful! Transaction: {txHash.substring(0, 10)}...
        </Alert>
      </Snackbar>
    </>
  );
};

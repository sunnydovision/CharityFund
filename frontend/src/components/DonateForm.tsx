import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  InputAdornment,
  Snackbar,
} from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { donateETH } from '../services/ethers.service';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { getCurrentNetworkConfig } from '../constants/networkConfig';

const SUGGESTED_AMOUNTS = ['0.01', '0.1', '0.5', '1.0', '5.0'];

export const DonateForm: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState('');

  const { isConnected, chainId } = useWallet();
  const { refreshData } = useContract();

  const expectedChainId = getCurrentNetworkConfig().chainId;
  const isWrongNetwork = isConnected && chainId !== expectedChainId;

  const handleDonate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (isWrongNetwork) {
      setError('Please switch to the correct network');
      return;
    }

    setIsDonating(true);
    setError(null);

    try {
      const hash = await donateETH(amount);
      setTxHash(hash);
      setSuccess(true);
      setAmount('');
      
      // Refresh contract data after donation
      setTimeout(() => {
        refreshData();
      }, 2000);
    } catch (err: any) {
      console.error('Donation error:', err);
      setError(err.message || 'Failed to donate. Please try again.');
    } finally {
      setIsDonating(false);
    }
  };

  const handleSuggestedAmount = (suggestedAmount: string) => {
    setAmount(suggestedAmount);
  };

  const handleCloseSuccess = () => {
    setSuccess(false);
  };

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <VolunteerActivismIcon color="primary" />
            <Typography variant="h6">Make a Donation</Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" paragraph>
            Your donation will help support our charity initiatives. When the contract balance reaches the threshold, funds are automatically transferred to the Safe wallet.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isDonating || !isConnected || isWrongNetwork}
            InputProps={{
              endAdornment: <InputAdornment position="end">ETH</InputAdornment>,
            }}
            sx={{ mb: 2 }}
            helperText={!isConnected ? 'Connect wallet to donate' : ''}
          />

          <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
            <Typography variant="body2" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
              Quick amounts:
            </Typography>
            {SUGGESTED_AMOUNTS.map((suggestedAmount) => (
              <Button
                key={suggestedAmount}
                variant="outlined"
                size="small"
                onClick={() => handleSuggestedAmount(suggestedAmount)}
                disabled={isDonating || !isConnected || isWrongNetwork}
              >
                {suggestedAmount} ETH
              </Button>
            ))}
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleDonate}
            disabled={!isConnected || isWrongNetwork || isDonating || !amount}
            startIcon={isDonating ? <CircularProgress size={20} /> : <VolunteerActivismIcon />}
          >
            {isDonating ? 'Processing...' : 'Donate Now'}
          </Button>

          {!isConnected && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Please connect your wallet to make a donation
            </Alert>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSuccess} severity="success" sx={{ width: '100%' }}>
          Donation successful! Transaction: {txHash.substring(0, 10)}...
        </Alert>
      </Snackbar>
    </>
  );
};

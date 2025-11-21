import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const shouldDonateAfterConnect = useRef(false);
  const pendingAmount = useRef('');

  const { isConnected, chainId, connect, isConnecting } = useWallet();
  const { refreshData } = useContract();

  const expectedChainId = getCurrentNetworkConfig().chainId;
  const isWrongNetwork = isConnected && chainId !== expectedChainId;

  const executeDonation = useCallback(async (donationAmount?: string) => {
    const amountToUse = donationAmount || amount;
    
    if (!amountToUse || parseFloat(amountToUse) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (isWrongNetwork) {
      setError('Please switch to the correct network');
      return;
    }

    setIsDonating(true);
    setError(null);

    try {
      const hash = await donateETH(amountToUse);
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
  }, [amount, isWrongNetwork, refreshData]);

  // Tự động donate sau khi connect thành công
  useEffect(() => {
    if (isConnected && shouldDonateAfterConnect.current && pendingAmount.current) {
      shouldDonateAfterConnect.current = false;
      const amountToDonate = pendingAmount.current;
      pendingAmount.current = '';
      executeDonation(amountToDonate);
    }
  }, [isConnected, executeDonation]);

  const handleDonate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Tự động kết nối ví nếu chưa kết nối
    if (!isConnected) {
      setError(null);
      try {
        // Lưu amount và flag để donate sau khi connect
        pendingAmount.current = amount;
        shouldDonateAfterConnect.current = true;
        
        // Kết nối ví
        await connect();
        // Donate sẽ được thực hiện tự động trong useEffect khi isConnected = true
        return;
      } catch (err: any) {
        shouldDonateAfterConnect.current = false;
        pendingAmount.current = '';
        setError(err.message || 'Failed to connect wallet. Please try again.');
        return;
      }
    }

    // Nếu đã connect, thực hiện donate ngay
    await executeDonation();
  };

  const handleSuggestedAmount = (suggestedAmount: string) => {
    setAmount(suggestedAmount);
  };

  const handleCloseSuccess = () => {
    setSuccess(false);
  };

  return (
    <>
      <Card 
        sx={{ 
          mb: 3,
          boxShadow: 4,
          border: '2px solid',
          borderColor: 'primary.main',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={3}>
            <VolunteerActivismIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h4" fontWeight="bold" color="primary">
              Make a Donation
            </Typography>
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
            disabled={isDonating || isConnecting || isWrongNetwork}
            InputProps={{
              endAdornment: <InputAdornment position="end">ETH</InputAdornment>,
            }}
            sx={{ mb: 2 }}
            helperText={!isConnected && !isConnecting ? 'Wallet will be connected automatically when you click donate' : ''}
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
                disabled={isDonating || isConnecting || isWrongNetwork}
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
            disabled={isWrongNetwork || isDonating || isConnecting || !amount}
            startIcon={
              isDonating || isConnecting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <VolunteerActivismIcon />
              )
            }
            sx={{
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 'bold',
            }}
          >
            {isConnecting
              ? 'Connecting Wallet...'
              : isDonating
              ? 'Processing...'
              : !isConnected
              ? 'Connect Wallet & Donate'
              : 'Donate Now'}
          </Button>

          {!isConnected && !isConnecting && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Click "Connect Wallet & Donate" to automatically connect your MetaMask wallet
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

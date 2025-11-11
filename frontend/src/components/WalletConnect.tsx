import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SecurityIcon from '@mui/icons-material/Security';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useWallet } from '../hooks/useWallet';
import { getCurrentNetworkConfig } from '../constants/networkConfig';

export const WalletConnect: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const {
    address,
    balance,
    chainId,
    isConnected,
    isConnecting,
    error,
    connect,
    connectSafe,
    disconnect,
    switchToCorrectNetwork,
    refreshBalance,
  } = useWallet();

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    await refreshBalance();
    setIsRefreshing(false);
  };

  const expectedChainId = getCurrentNetworkConfig().chainId;
  const isWrongNetwork = isConnected && chainId !== expectedChainId;

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };


  if (!isConnected) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            <AccountBalanceWalletIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            <Typography variant="h6" align="center">
              Connect Your Wallet
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Connect your wallet to start donating
            </Typography>
            {error && (
              <Alert severity="error" sx={{ width: '100%' }}>
                {error}
              </Alert>
            )}
            <Box display="flex" flexDirection="column" gap={2} sx={{ width: '100%', maxWidth: 400 }}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={connect}
                disabled={isConnecting}
                startIcon={isConnecting ? <CircularProgress size={20} /> : <AccountBalanceWalletIcon />}
              >
                {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
              </Button>
              <Divider>OR</Divider>
              <Button
                variant="outlined"
                size="large"
                fullWidth
                onClick={connectSafe}
                disabled={isConnecting}
                startIcon={isConnecting ? <CircularProgress size={20} /> : <SecurityIcon />}
              >
                {isConnecting ? 'Connecting...' : 'Connect Safe Wallet'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Connected Wallet
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Chip
                label={formatAddress(address || '')}
                color="primary"
                size="small"
              />
              {isWrongNetwork && (
                <Chip
                  label="Wrong Network"
                  color="error"
                  size="small"
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Balance: {parseFloat(balance || '0').toFixed(4)} ETH
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            {isWrongNetwork && (
              <Button
                variant="outlined"
                size="small"
                onClick={switchToCorrectNetwork}
                color="warning"
              >
                Switch Network
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={handleRefreshBalance}
              disabled={isRefreshing}
              startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
              color="info"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={disconnect}
              startIcon={<PowerSettingsNewIcon />}
              color="error"
            >
              Disconnect
            </Button>
          </Box>
        </Box>
        {isWrongNetwork && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Please switch to {getCurrentNetworkConfig().name} to continue
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

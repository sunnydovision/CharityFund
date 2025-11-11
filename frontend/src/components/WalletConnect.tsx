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
import { isConnectedToSafe } from '../services/ethers.service';

export const WalletConnect: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSafeConnected, setIsSafeConnected] = useState(false);
  
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

  // Check if connected to Safe Wallet
  React.useEffect(() => {
    if (isConnected) {
      setIsSafeConnected(isConnectedToSafe());
    } else {
      setIsSafeConnected(false);
    }
  }, [isConnected]);

  // Auto-detect and connect if we're in Safe Wallet iframe
  React.useEffect(() => {
    const checkSafeWallet = async () => {
      // Check if we're in an iframe (likely Safe Wallet)
      if (window.self !== window.top && !isConnected && !isConnecting) {
        console.log('🔍 Detected Safe Wallet iframe, attempting to connect...');
        try {
          // Wait for Safe Wallet to fully initialize
          // Safe Wallet cần thời gian để load app và sẵn sàng
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Try to connect automatically
          console.log('🔄 Attempting auto-connect to Safe Wallet...');
          await connectSafe();
          console.log('✅ Auto-connect successful!');
        } catch (error: any) {
          // Log error but don't show to user - they can manually connect
          console.log('⚠️ Auto-connect to Safe Wallet failed (user can try manually):', error?.message || error);
          // Don't set error state - let user try manually
        }
      }
    };

    // Check immediately and also after a delay
    checkSafeWallet();
    const timeoutId = setTimeout(checkSafeWallet, 2000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              {window.self !== window.top && (
              <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2">
                  <strong>✅ Bạn đang trong Safe Wallet!</strong>
                  <br />
                  App đang tự động kết nối với Safe Wallet của bạn...
                  <br />
                  Nếu không tự động kết nối, vui lòng nhấn "Connect Safe Wallet" bên dưới.
                </Typography>
              </Alert>
            )}
            <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 1 }}>
                <strong>Hướng dẫn kết nối Safe Wallet:</strong>
                <br />
                1. Nhấn nút này để mở Safe Wallet
                <br />
                2. Trong Safe Wallet, nhấn <strong>"Use the App with your Safe Account"</strong>
                <br />
                3. App sẽ tự động kết nối hoặc nhấn "Connect Safe Wallet" lại
                <br />
                <em>Safe Wallet cho phép gọi các hàm admin như updateSafe()</em>
              </Typography>
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
              {isSafeConnected && (
                <Chip
                  label="Safe Wallet"
                  color="success"
                  size="small"
                  icon={<SecurityIcon />}
                />
              )}
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

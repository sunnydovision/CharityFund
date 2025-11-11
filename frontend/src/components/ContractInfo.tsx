import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SecurityIcon from '@mui/icons-material/Security';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useContract } from '../hooks/useContract';
import { CONTRACT_ADDRESS, SAFE_ADDRESS } from '../constants/contractAddress';
import { getCurrentNetworkConfig } from '../constants/networkConfig';

export const ContractInfo: React.FC = () => {
  const {
    contractBalance,
    safeBalance,
    threshold,
    totalReceived,
    totalTransferred,
    isLoading,
    refreshData,
  } = useContract();

  const progress = (parseFloat(contractBalance) / parseFloat(threshold)) * 100;
  const networkConfig = getCurrentNetworkConfig();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatAddress = (addr: string) => {
    if (!addr) return 'Not set';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const openInExplorer = (address: string) => {
    if (networkConfig.blockExplorer) {
      window.open(`${networkConfig.blockExplorer}/address/${address}`, '_blank');
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <AccountBalanceIcon color="primary" />
            <Typography variant="h6">Contract Information</Typography>
          </Box>
          <Tooltip title="Refresh data">
            <IconButton onClick={refreshData} disabled={isLoading} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'primary.light',
                borderRadius: 1,
                height: '100%',
              }}
            >
              <Typography variant="body2" color="primary.contrastText" gutterBottom>
                Current Balance
              </Typography>
              <Typography variant="h4" color="primary.contrastText">
                {parseFloat(contractBalance).toFixed(4)} ETH
              </Typography>
              <Typography variant="caption" color="primary.contrastText">
                of {parseFloat(threshold).toFixed(1)} ETH threshold
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'success.light',
                borderRadius: 1,
                height: '100%',
              }}
            >
              <Typography variant="body2" color="success.contrastText" gutterBottom>
                Total Received
              </Typography>
              <Typography variant="h4" color="success.contrastText">
                {parseFloat(totalReceived).toFixed(4)} ETH
              </Typography>
              <Typography variant="caption" color="success.contrastText">
                All-time donations
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'info.light',
                borderRadius: 1,
                height: '100%',
              }}
            >
              <Typography variant="body2" color="info.contrastText" gutterBottom>
                Total Transferred
              </Typography>
              <Typography variant="h4" color="info.contrastText">
                {parseFloat(totalTransferred).toFixed(4)} ETH
              </Typography>
              <Typography variant="caption" color="info.contrastText">
                Sent to Safe wallet
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Progress to Auto-Transfer
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {progress.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={Math.min(progress, 100)} sx={{ height: 8, borderRadius: 1 }} />
          {progress >= 100 && (
            <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
              ✓ Threshold reached! Next donation will trigger auto-transfer
            </Typography>
          )}
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Network: <Chip label={networkConfig.name} size="small" />
          </Typography>
          
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Typography variant="body2" color="text.secondary">
              Contract:
            </Typography>
            <Chip
              label={formatAddress(CONTRACT_ADDRESS)}
              size="small"
              onClick={() => openInExplorer(CONTRACT_ADDRESS)}
              sx={{ cursor: 'pointer' }}
            />
            <IconButton size="small" onClick={() => copyToClipboard(CONTRACT_ADDRESS)}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">
              Safe Wallet:
            </Typography>
            <Chip
              label={formatAddress(SAFE_ADDRESS)}
              size="small"
              onClick={() => openInExplorer(SAFE_ADDRESS)}
              sx={{ cursor: 'pointer' }}
            />
            <IconButton size="small" onClick={() => copyToClipboard(SAFE_ADDRESS)}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <SecurityIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              Safe Balance: {parseFloat(safeBalance).toFixed(4)} ETH
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

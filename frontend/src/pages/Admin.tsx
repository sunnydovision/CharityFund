import React from 'react';
import { Container, Box, Typography, Grid, Alert } from '@mui/material';
import { Navigate } from 'react-router-dom';
import { WalletConnect } from '../components/WalletConnect';
import { ContractInfo } from '../components/ContractInfo';
import { AdminDashboard } from '../components/AdminDashboard';
import { DonationHistory } from '../components/DonationHistory';
import { isConnectedToSafe } from '../services/ethers.service';
import { useWallet } from '../hooks/useWallet';

export const Admin: React.FC = () => {
  const { isConnected } = useWallet();
  const isSafeConnected = isConnectedToSafe();

  // Nếu không dùng Safe Wallet, redirect về home
  if (isConnected && !isSafeConnected) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Admin page chỉ dành cho Safe Wallet
          </Typography>
          <Typography variant="body2">
            Vui lòng kết nối Safe Wallet để truy cập trang Admin.
            <br />
            MetaMask không có quyền truy cập trang này.
          </Typography>
        </Alert>
        <Navigate to="/" replace />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box textAlign="center" mb={4}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage the charity fund contract
        </Typography>
      </Box>

      <WalletConnect />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <ContractInfo />
        </Grid>

        <Grid item xs={12} md={6}>
          <AdminDashboard />
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ p: 3, bgcolor: 'grey.100', borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Admin Functions
            </Typography>
            <Typography variant="body2" paragraph>
              As an admin, you can:
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" variant="body2" paragraph>
                Manually trigger fund transfers to the Safe wallet
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                Monitor all donations and transfers in real-time
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                View contract balance and statistics
              </Typography>
            </Box>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
              <Typography variant="body2" color="warning.contrastText">
                <strong>⚠️ Note:</strong> Only the current Safe wallet address can update the Safe address.
                Manual transfer can be triggered by anyone.
              </Typography>
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <DonationHistory />
        </Grid>
      </Grid>
    </Container>
  );
};

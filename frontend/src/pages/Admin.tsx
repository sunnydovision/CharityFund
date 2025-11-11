import React from 'react';
import { Container, Box, Typography, Grid } from '@mui/material';
import { WalletConnect } from '../components/WalletConnect';
import { ContractInfo } from '../components/ContractInfo';
import { AdminDashboard } from '../components/AdminDashboard';
import { DonationHistory } from '../components/DonationHistory';

export const Admin: React.FC = () => {
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

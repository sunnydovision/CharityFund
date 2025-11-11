import React from 'react';
import { Container, Box, Typography, Grid, Paper } from '@mui/material';
import { WalletConnect } from '../components/WalletConnect';
import { ContractInfo } from '../components/ContractInfo';
import { DonateForm } from '../components/DonateForm';
import { DonationHistory } from '../components/DonationHistory';
import LogoImage from "../assets/logo-full.png";

export const Home: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box textAlign="center" mb={4}>
        <img src={LogoImage} alt="SOLID FUND" height={200} />
        <Typography variant="h6" color="text.secondary" paragraph>
          Transparent Charity Donation Platform
        </Typography>
        <Typography variant="body1" color="text.secondary" maxWidth="md" mx="auto">
          A decentralized charity platform where donations are automatically transferred to a secure
          Gnosis Safe multisig wallet when the threshold is reached. All transactions are transparent
          and verifiable on the blockchain.
        </Typography>
      </Box>

      <WalletConnect />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <ContractInfo />
        </Grid>

        <Grid item xs={12} md={5}>
          <DonateForm />
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              How It Works
            </Typography>
            <Box component="ol" sx={{ pl: 2 }}>
              <Typography component="li" variant="body2" paragraph>
                <strong>Connect Your Wallet:</strong> Connect your MetaMask wallet to the platform
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                <strong>Make a Donation:</strong> Send ETH to the charity contract
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                <strong>Automatic Transfer:</strong> When the contract balance reaches 5 ETH, funds are
                automatically transferred to the Gnosis Safe multisig wallet
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                <strong>Track Transactions:</strong> All donations and transfers are recorded on the blockchain
                and visible in the transaction history
              </Typography>
            </Box>

            <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
              <Typography variant="body2" color="primary.contrastText">
                <strong>🔒 Security:</strong> Funds are managed by a 2/3 multisig Gnosis Safe wallet,
                ensuring maximum security and decentralized control.
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <DonationHistory />
        </Grid>
      </Grid>
    </Container>
  );
};

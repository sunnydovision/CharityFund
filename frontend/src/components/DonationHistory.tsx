import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import { useContract } from '../hooks/useContract';
import { format } from 'date-fns';
import { getCurrentNetworkConfig } from '../constants/networkConfig';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

export const DonationHistory: React.FC = () => {
  const { donations, transfers } = useContract();
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const networkConfig = getCurrentNetworkConfig();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSearchTerm('');
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp * 1000), 'MMM dd, yyyy HH:mm:ss');
  };

  const openTxInExplorer = (txHash: string) => {
    if (networkConfig.blockExplorer) {
      window.open(`${networkConfig.blockExplorer}/tx/${txHash}`, '_blank');
    }
  };

  const filteredDonations = donations.filter(
    (d) =>
      d.donor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.txHash.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransfers = transfers.filter(
    (t) =>
      t.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.txHash.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <HistoryIcon color="primary" />
          <Typography variant="h6">Transaction History</Typography>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`Donations (${donations.length})`} />
            <Tab label={`Transfers (${transfers.length})`} />
          </Tabs>
        </Box>

        <TextField
          fullWidth
          size="small"
          placeholder="Search by address or transaction hash..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <TabPanel value={tabValue} index={0}>
          {filteredDonations.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary">
                {searchTerm ? 'No donations found' : 'No donations yet'}
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Donor</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Balance After</TableCell>
                    <TableCell align="center">Transaction</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDonations.map((donation, index) => (
                    <TableRow key={`${donation.txHash}-${index}`} hover>
                      <TableCell>
                        <Typography variant="caption">
                          {formatDate(donation.timestamp)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={formatAddress(donation.donor)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          +{parseFloat(donation.amount).toFixed(4)} ETH
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {parseFloat(donation.balance).toFixed(4)} ETH
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View on explorer">
                          <IconButton
                            size="small"
                            onClick={() => openTxInExplorer(donation.txHash)}
                            disabled={!networkConfig.blockExplorer}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {filteredTransfers.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary">
                {searchTerm ? 'No transfers found' : 'No transfers yet'}
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>To</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="center">Transaction</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTransfers.map((transfer, index) => (
                    <TableRow key={`${transfer.txHash}-${index}`} hover>
                      <TableCell>
                        <Typography variant="caption">
                          {formatDate(transfer.timestamp)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={formatAddress(transfer.to)}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="info.main">
                          {parseFloat(transfer.amount).toFixed(4)} ETH
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View on explorer">
                          <IconButton
                            size="small"
                            onClick={() => openTxInExplorer(transfer.txHash)}
                            disabled={!networkConfig.blockExplorer}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </CardContent>
    </Card>
  );
};

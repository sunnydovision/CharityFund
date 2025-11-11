import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import {
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import LogoImage from './assets/logo-full.png';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { theme } from './theme';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';
import { isConnectedToSafe } from './services/ethers.service';
import { useWallet } from './hooks/useWallet';

function App() {
  const { isConnected } = useWallet();
  const [isSafeConnected, setIsSafeConnected] = useState(false);

  // Update Safe connection status khi wallet state thay đổi
  useEffect(() => {
    const checkSafeConnection = async () => {
      // Check xem có đang trong Safe Wallet iframe không
      const inIframe = typeof window !== 'undefined' && window.self !== window.top;
      
      if (inIframe) {
        // Đang trong iframe - có thể là Safe Wallet
        // Thử check Safe connection
        const safeConnected = isConnectedToSafe();
        setIsSafeConnected(safeConnected);
        
        // Nếu chưa connected nhưng đang trong iframe, có thể cần đợi thêm
        if (!safeConnected && isConnected) {
          // Đã connect wallet nhưng chưa detect Safe
          // Có thể cần thời gian để Safe SDK initialize
          console.log('In iframe but Safe not detected yet, will retry...');
        }
      } else {
        // Không trong iframe - chắc chắn không phải Safe Wallet
        setIsSafeConnected(false);
      }
    };

    // Check ngay lập tức
    checkSafeConnection();

    // Check định kỳ để đảm bảo reactive (mỗi 1 giây khi đang trong iframe)
    // Điều này đảm bảo UI update khi Safe connection được establish
    const interval = setInterval(checkSafeConnection, 1000);

    return () => clearInterval(interval);
  }, [isConnected]); // Re-check khi isConnected thay đổi

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <AppBar position="static" elevation={1}>
            <Toolbar>
              <div style={{ display: 'flex', flexGrow: 1, fontWeight: 'bold' }}>
                <img src={LogoImage} alt="SOLID FUND" height={55} />
              </div>
              <Button
                color="inherit"
                component={Link}
                to="/"
                startIcon={<HomeIcon />}
              >
                Home
              </Button>
              {/* Chỉ hiển thị nút Admin khi đang dùng Safe Wallet */}
              {isSafeConnected && (
                <Button
                  color="inherit"
                  component={Link}
                  to="/admin"
                  startIcon={<AdminPanelSettingsIcon />}
                >
                  Admin
                </Button>
              )}
            </Toolbar>
          </AppBar>

          <Box component="main" sx={{ flexGrow: 1, bgcolor: 'grey.50' }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route 
                path="/admin" 
                element={
                  isSafeConnected ? (
                    <Admin />
                  ) : (
                    <Navigate to="/" replace />
                  )
                } 
              />
            </Routes>
          </Box>

          <Box
            component="footer"
            sx={{
              py: 3,
              px: 2,
              mt: 'auto',
              bgcolor: 'grey.900',
              color: 'white',
            }}
          >
            <Container maxWidth="lg">
              <Typography variant="body2" align="center">
                © {new Date().getFullYear()} SOLID FUND - Transparent Charity Platform
              </Typography>
              <Typography variant="caption" align="center" display="block" sx={{ mt: 1 }}>
                Built with Solidity, Hardhat, React, and Material-UI
              </Typography>
            </Container>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;

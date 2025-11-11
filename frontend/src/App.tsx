import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
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

function App() {
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
              <Button
                color="inherit"
                component={Link}
                to="/admin"
                startIcon={<AdminPanelSettingsIcon />}
              >
                Admin
              </Button>
            </Toolbar>
          </AppBar>

          <Box component="main" sx={{ flexGrow: 1, bgcolor: 'grey.50' }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/admin" element={<Admin />} />
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

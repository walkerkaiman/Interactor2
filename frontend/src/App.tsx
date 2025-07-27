
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { Toaster } from 'sonner';
import { TopBar } from './components/common/TopBar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ModuleEditorTab } from './components/tabs/ModuleEditorTab';
import { WikiTab } from './components/tabs/WikiTab';
import { ConsoleTab } from './components/tabs/ConsoleTab';
import { PerformanceDashboardTab } from './components/tabs/PerformanceDashboardTab';
import { useWebSocket } from './hooks/useWebSocket';
import { useActiveTab } from './store';

// Create Material-UI dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
        },
      },
    },
  },
});

function App() {
  // Initialize WebSocket connection
  useWebSocket();
  
  const activeTab = useActiveTab();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'editor':
        return <ModuleEditorTab />;
      case 'wiki':
        return <WikiTab />;
      case 'console':
        return <ConsoleTab />;
      case 'dashboard':
        return <PerformanceDashboardTab />;
      default:
        return <ModuleEditorTab />;
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ErrorBoundary>
        <Box sx={{ 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          bgcolor: 'background.default',
          color: 'text.primary'
        }}>
          <TopBar />
          
          <Box component="main" sx={{ 
            flex: 1, 
            overflow: 'hidden', 
            position: 'relative',
            bgcolor: 'background.default'
          }}>
            {/* Background Pattern */}
            <Box sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0.1,
              background: 'radial-gradient(circle at 1px 1px, rgba(25, 118, 210, 0.3) 1px, transparent 0)',
              backgroundSize: '20px 20px'
            }} />
            
            {/* Content */}
            <Box sx={{ 
              position: 'relative', 
              zIndex: 10, 
              height: '100%' 
            }}>
              {renderTabContent()}
            </Box>
          </Box>

          <Toaster 
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(30, 30, 30, 0.95)',
                color: '#ffffff',
                border: '1px solid rgba(66, 66, 66, 0.2)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                boxShadow: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)'
              }
            }}
          />
        </Box>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App; 
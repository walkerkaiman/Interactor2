import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Chip,
  Avatar,
  useTheme
} from '@mui/material';
import {
  Book as BookIcon,
  Build as BuildIcon,
  List as ListIcon,
  Analytics as AnalyticsIcon,
  Circle as CircleIcon
} from '@mui/icons-material';
import { useActiveTab, useAppActions } from '@/store';
import { RealTimeNotifications } from './RealTimeNotifications';

export const TopBar: React.FC = () => {
  const activeTab = useActiveTab();
  const actions = useAppActions();
  const theme = useTheme();

  const tabs = [
    { id: 'wiki', label: 'Wiki', icon: <BookIcon /> },
    { id: 'editor', label: 'Module Editor', icon: <BuildIcon /> },
    { id: 'console', label: 'Console', icon: <ListIcon /> },
    { id: 'dashboard', label: 'Performance', icon: <AnalyticsIcon /> },
  ] as const;

  return (
    <AppBar
      position="static"
      elevation={2}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: `1px solid ${theme.palette.divider}`
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                width: 40,
                height: 40
              }}
            >
              I
            </Avatar>
            <Typography
              variant="h5"
              component="h1"
              sx={{
                fontWeight: 'bold',
                color: 'text.primary'
              }}
            >
              Interactor
            </Typography>
          </Box>

          {/* Navigation */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => actions.switchTab(tab.id)}
                variant={activeTab === tab.id ? "contained" : "text"}
                startIcon={tab.icon}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 'medium',
                  px: 2,
                  py: 1,
                  ...(activeTab === tab.id && {
                    bgcolor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    }
                  }),
                  ...(activeTab !== tab.id && {
                    color: 'text.secondary',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      color: 'text.primary',
                    }
                  })
                }}
              >
                {tab.label}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Status & Notifications */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <RealTimeNotifications />
          <Chip
            icon={<CircleIcon sx={{ color: 'success.main', fontSize: 12 }} />}
            label="System Online"
            variant="outlined"
            color="success"
            size="small"
            sx={{
              borderColor: 'success.main',
              color: 'success.main',
              '& .MuiChip-label': {
                fontWeight: 'medium'
              }
            }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
}; 
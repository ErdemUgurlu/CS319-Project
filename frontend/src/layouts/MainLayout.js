import React, { useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as TaskIcon,
  Timeline as WorkloadIcon,
  Event as ExamIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  School as SchoolIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
  SwapHoriz as SwapIcon,
  EventNote as EventIcon,
} from '@mui/icons-material';
import { logout } from '../store/slices/authSlice';
import bilkentLogo from '../assets/bilkent-logo.png';

const drawerWidth = 280;

const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenuOpen = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchor(null);
  };

  // Get menu items based on user role
  const menuItems = useMemo(() => {
    if (!user) return [];

    const items = [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    ];

    // Add role-specific menu items
    if (user.permissions.includes('view_tasks') || user.permissions.includes('create_tasks')) {
      items.push({ text: 'Task Management', icon: <TaskIcon />, path: '/tasks' });
    }

    if (user.permissions.includes('view_workload')) {
      items.push({ text: 'Workload Tracking', icon: <WorkloadIcon />, path: '/workload' });
    }

    if (user.permissions.includes('create_exams') || user.permissions.includes('assign_proctors')) {
      items.push({ text: 'Exam Proctoring', icon: <ExamIcon />, path: '/proctoring' });
    }

    if (user.permissions.includes('view_reports')) {
      items.push({ text: 'Reports', icon: <AssessmentIcon />, path: '/reports' });
    }

    if (user.permissions.includes('manage_users')) {
      items.push({ text: 'User Management', icon: <GroupIcon />, path: '/users' });
    }

    if (user.permissions.includes('manage_courses')) {
      items.push({ text: 'Course Management', icon: <SchoolIcon />, path: '/courses' });
    }

    if (user.permissions.includes('manage_settings')) {
      items.push({ text: 'Settings', icon: <SettingsIcon />, path: '/settings' });
    }

    if (user.permissions.includes('view_task_completion_reports')) {
      items.push({ text: 'Task Completion Reports', icon: <TaskIcon />, path: '/task-completion' });
    }

    return items;
  }, [user]);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
        }}
      >
        <Box
          component="img"
          src={bilkentLogo}
          alt="Bilkent University"
          sx={{
            height: 60,
            width: 'auto',
          }}
        />
      </Box>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
          TA Management System
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {user?.department || 'Department'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
          2024-2025 Spring Semester
        </Typography>
      </Box>
      <Divider />
      <List sx={{ flexGrow: 1, px: 2 }}>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              if (isMobile) setMobileOpen(false);
            }}
            selected={location.pathname === item.path}
            sx={{
              borderRadius: 2,
              mb: 1,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'white',
                '& .MuiListItemIcon-root': {
                  color: 'white',
                },
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: location.pathname === item.path ? 'white' : 'primary.main',
                minWidth: 40,
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List sx={{ px: 2 }}>
        <ListItem
          button
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            color: 'error.main',
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'white',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'white',
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            color="inherit"
            onClick={handleNotificationMenuOpen}
            sx={{ mr: 2 }}
          >
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={handleProfileMenuOpen}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.main',
                mr: 1,
              }}
            >
              {user?.name?.charAt(0) || 'U'}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                {user?.name || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.role || 'Role'}
              </Typography>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            borderRadius: 2,
          },
        }}
      >
        <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/profile'); }}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
      
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 300,
            borderRadius: 2,
          },
        }}
      >
        <MenuItem onClick={handleNotificationMenuClose}>
          <Typography variant="body2">New task assigned: CS101 Lab</Typography>
        </MenuItem>
        <MenuItem onClick={handleNotificationMenuClose}>
          <Typography variant="body2">Exam proctoring request approved</Typography>
        </MenuItem>
        <MenuItem onClick={handleNotificationMenuClose}>
          <Typography variant="body2">Workload report available</Typography>
        </MenuItem>
      </Menu>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout; 
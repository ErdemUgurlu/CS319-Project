import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Drawer, 
  List, 
  ListItemButton,
  ListItemIcon, 
  ListItemText,
  Box,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Badge
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import WorkIcon from '@mui/icons-material/Work';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import SchoolIcon from '@mui/icons-material/School';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ApprovalIcon from '@mui/icons-material/Approval';
import { useAuth } from '../context/AuthContext';

const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authState, logout } = useAuth();
  const { user } = authState;
  
  // State for drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // State for user menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const userMenuOpen = Boolean(anchorEl);
  
  // Handle drawer toggle
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  // Handle user menu
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle logout
  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };
  
  // Navigation items based on user role
  const getNavigationItems = () => {
    const items = [
      {
        text: 'Dashboard',
        icon: <DashboardIcon />,
        path: '/dashboard',
        roles: ['TA', 'INSTRUCTOR', 'STAFF', 'ADMIN', 'DEAN_OFFICE']
      },
      {
        text: 'Tasks',
        icon: <AssignmentIcon />,
        path: '/tasks',
        roles: ['TA', 'INSTRUCTOR', 'STAFF', 'ADMIN']
      },
      {
        text: 'My Workload',
        icon: <WorkIcon />,
        path: '/workload',
        roles: ['TA']
      }
    ];
    
    if (user) {
      const userRole = (user.role || '').toUpperCase();
      
      // Add Leave Requests for TAs
      if (userRole === 'TA') {
        items.push({
          text: 'Leave Requests',
          icon: <ScheduleIcon />,
          path: '/leave-requests',
          roles: ['TA']
        });
      }
      
      // Add role-specific navigation items
      if (['INSTRUCTOR', 'STAFF', 'ADMIN'].includes(userRole)) {
        items.push({
          text: 'Exam Management',
          icon: <EventIcon />,
          path: '/exam-management',
          roles: ['INSTRUCTOR', 'STAFF', 'ADMIN']
        });
      }
      
      // Add Leave Approvals for Instructors
      if (userRole === 'INSTRUCTOR') {
        items.push({
          text: 'Leave Approvals',
          icon: <ApprovalIcon />,
          path: '/instructor/leave-approvals',
          roles: ['INSTRUCTOR']
        });
      }
      
      if (['STAFF', 'ADMIN'].includes(userRole)) {
        items.push({
          text: 'Import/Approve Users',
          icon: <HowToRegIcon />,
          path: '/approve-users',
          roles: ['STAFF', 'ADMIN']
        });
        
/* Hiding User Management from sidebar as per user request
        items.push({
          text: 'User Management',
          icon: <PeopleIcon />,
          path: '/users',
          roles: ['STAFF', 'ADMIN']
        });
*/

        items.push({
          text: 'Course Management',
          icon: <SchoolIcon />,
          path: '/courses',
          roles: ['STAFF', 'ADMIN']
        });
      }
      
      if (userRole === 'ADMIN') {
        items.push({
          text: 'Settings',
          icon: <SettingsIcon />,
          path: '/settings',
          roles: ['ADMIN']
        });
      }
    }
    
    return items;
  };
  
  // Filter navigation items based on user role
  const filteredNavItems = getNavigationItems().filter(item => {
    if (!user) return false;
    const userRole = (user.role || '').toUpperCase();
    return item.roles.includes(userRole);
  });
  
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Bilkent TA Management
          </Typography>
          
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button 
                color="inherit"
                onClick={handleUserMenuOpen}
                endIcon={<AccountCircleIcon />}
              >
                {user.first_name} {user.last_name}
              </Button>
              
              <Menu
                anchorEl={anchorEl}
                open={userMenuOpen}
                onClose={handleUserMenuClose}
              >
                <MenuItem onClick={() => {
                  handleUserMenuClose();
                  navigate('/profile');
                }}>
                  <ListItemIcon>
                    <AccountCircleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Profile</ListItemText>
                </MenuItem>
                
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
      >
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleDrawer}
        >
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              {user?.first_name?.charAt(0) || 'U'}
            </Avatar>
            <Typography variant="subtitle1">
              {user?.first_name} {user?.last_name}
            </Typography>
          </Box>
          
          <Divider />
          
          <List>
            {filteredNavItems.map((item) => (
              <ListItemButton 
                key={item.text} 
                onClick={() => navigate(item.path)}
                selected={location.pathname === item.path}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default NavBar;

export {}; 
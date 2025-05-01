import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
} from '@mui/material';
import { Assignment, EventNote } from '@mui/icons-material';

const Navbar = () => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          backgroundColor: '#0A2647',
          color: 'white',
        },
      }}
    >
      <List sx={{ mt: 8 }}>
        <Link
          component={RouterLink}
          to="/tasks"
          sx={{ textDecoration: 'none', color: 'inherit' }}
        >
          <ListItem button>
            <ListItemIcon sx={{ color: 'white' }}>
              <Assignment />
            </ListItemIcon>
            <ListItemText primary="Tasks" />
          </ListItem>
        </Link>
        
        <Link
          component={RouterLink}
          to="/leave-requests"
          sx={{ textDecoration: 'none', color: 'inherit' }}
        >
          <ListItem button>
            <ListItemIcon sx={{ color: 'white' }}>
              <EventNote />
            </ListItemIcon>
            <ListItemText primary="Leave Requests" />
          </ListItem>
        </Link>
      </List>
    </Drawer>
  );
};

export default Navbar; 
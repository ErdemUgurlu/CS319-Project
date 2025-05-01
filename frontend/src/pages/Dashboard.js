import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  EventBusy as LeaveIcon,
  SwapHoriz as SwapIcon,
} from '@mui/icons-material';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user: taUser } = useSelector((state) => state.auth);

  // Mock data for upcoming tasks
  const upcomingTasks = [
    {
      id: 1,
      title: 'CS101 Lab Session',
      date: '2024-04-25',
      time: '10:00',
      type: 'Lab',
      duration: '2 hours',
    },
    {
      id: 2,
      title: 'CS102 Exam Proctoring',
      date: '2024-04-26',
      time: '14:00',
      type: 'Exam Proctoring',
      duration: '3 hours',
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {taUser?.name || 'TA'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your tasks, leave requests, and proctoring swaps from this dashboard.
        </Typography>
      </Paper>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Task Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View and manage tasks assigned to you by course instructors, including lab sessions, grading, and proctoring duties.
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                startIcon={<AssignmentIcon />}
                onClick={() => navigate('/tasks')}
                variant="contained"
                fullWidth
              >
                Manage Tasks
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Leave Request
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Submit leave requests for medical, conference, or vacation purposes.
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                startIcon={<LeaveIcon />}
                onClick={() => navigate('/leave')}
                variant="contained"
                fullWidth
              >
                Request Leave
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Proctoring Swap
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Request to swap your proctoring duties with another TA.
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                startIcon={<SwapIcon />}
                onClick={() => navigate('/swap')}
                variant="contained"
                fullWidth
              >
                Request Swap
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Upcoming Tasks */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Upcoming Tasks
        </Typography>
        <List>
          {upcomingTasks.map((task) => (
            <React.Fragment key={task.id}>
              <ListItem>
                <ListItemIcon>
                  <AssignmentIcon />
                </ListItemIcon>
                <ListItemText
                  primary={task.title}
                  secondary={`${task.date} at ${task.time} (${task.duration})`}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default Dashboard; 
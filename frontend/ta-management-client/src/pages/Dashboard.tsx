import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Card, 
  CardContent, 
  CardHeader,
  CardActionArea,
  Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { authState } = useAuth();
  const { user } = authState;
  const navigate = useNavigate();

  // Role-specific dashboard content
  const getDashboardContent = () => {
    if (!user) return null;

    console.log('User in dashboard:', user);
    console.log('User role:', user.role);
    
    // Standardize role to uppercase for case-insensitive comparison
    const userRole = (user.role || '').toUpperCase();

    switch (userRole) {
      case 'TA':
        return (
          <>
            <Typography variant="h5" gutterBottom>
              TA Dashboard
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={3}>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/tasks')}>
                    <CardHeader title="My Tasks" />
                    <CardContent>
                      <Typography>View and manage your assigned tasks</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/schedule')}>
                    <CardHeader title="My Schedule" />
                    <CardContent>
                      <Typography>
                        View your weekly schedule and manage availability
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
              {/* <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/proctoring')}>
                    <CardHeader title="Proctoring Assignments" />
                    <CardContent>
                      <Typography>
                        View your upcoming proctoring assignments
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box> */}
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/leaves')}>
                    <CardHeader title="Leave Requests" />
                    <CardContent>
                      <Typography>
                        Submit and track your leave requests
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
            </Stack>
          </>
        );
      
      case 'INSTRUCTOR':
        return (
          <>
            <Typography variant="h5" gutterBottom>
              Instructor Dashboard
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={3}>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/courses')}>
                    <CardHeader title="My Courses" />
                    <CardContent>
                      <Typography>View and manage your courses</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/tasks')}>
                    <CardHeader title="Assign Tasks" />
                    <CardContent>
                      <Typography>
                        Create and assign tasks to teaching assistants
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/tasks/review')}>
                    <CardHeader title="Task Reviews" />
                    <CardContent>
                      <Typography>
                        Review completed tasks and provide feedback
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/exams')}>
                    <CardHeader title="Exams" />
                    <CardContent>
                      <Typography>
                        Manage exams and proctoring requirements
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/manage-tas')}>
                    <CardHeader title="Manage Teaching Assistants" />
                    <CardContent>
                      <Typography>
                        Add, remove, and manage your teaching assistants and their workloads
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
            </Stack>
          </>
        );
      
      case 'STAFF':
        return (
          <>
            <Typography variant="h5" gutterBottom>
              Staff Dashboard
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={3}>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/users')}>
                    <CardHeader title="User Management" />
                    <CardContent>
                      <Typography>
                        View and manage system users
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/courses')}>
                    <CardHeader title="Course Management" />
                    <CardContent>
                      <Typography>
                        Manage departments, courses, and sections
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
              {/* <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/proctoring')}>
                    <CardHeader title="Proctoring Management" />
                    <CardContent>
                      <Typography>
                        Manage exam proctoring assignments
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box> */}
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/reports')}>
                    <CardHeader title="Reports" />
                    <CardContent>
                      <Typography>
                        Generate and view system reports
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
            </Stack>
          </>
        );
      
      case 'DEAN_OFFICE':
        return (
          <>
            <Typography variant="h5" gutterBottom>
              Dean's Office Dashboard
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={3}>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/dean/exam-management')}>
                    <CardHeader 
                      title="Exam Management" 
                      titleTypographyProps={{ color: 'primary' }}
                    />
                    <CardContent>
                      <Typography>
                        <strong>Assign classrooms to exams waiting for places</strong>
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/users')}>
                    <CardHeader title="User Management" />
                    <CardContent>
                      <Typography>
                        View and manage system users
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/courses')}>
                    <CardHeader title="Course Management" />
                    <CardContent>
                      <Typography>
                        Manage departments, courses, and sections
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/reports')}>
                    <CardHeader title="Reports" />
                    <CardContent>
                      <Typography>
                        Generate and view system reports
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
            </Stack>
          </>
        );
      
      case 'ADMIN':
        return (
          <>
            <Typography variant="h5" gutterBottom>
              Admin Dashboard
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={3}>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/settings')}>
                    <CardHeader title="System Management" />
                    <CardContent>
                      <Typography>
                        Manage system parameters and configuration
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/users')}>
                    <CardHeader title="User Management" />
                    <CardContent>
                      <Typography>
                        Manage all system users and permissions
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/data')}>
                    <CardHeader title="Data Management" />
                    <CardContent>
                      <Typography>
                        Import and export system data
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
              <Box sx={{ width: { xs: '100%', md: '47%' } }}>
                <Card>
                  <CardActionArea onClick={() => navigate('/logs')}>
                    <CardHeader title="Activity Logs" />
                    <CardContent>
                      <Typography>
                        View system audit logs
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Box>
            </Stack>
          </>
        );
      
      default:
        return (
          <Typography>
            Unknown user role. Please contact the administrator.
          </Typography>
        );
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome, {user?.first_name} {user?.last_name}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Bilkent University TA Management System
          </Typography>
          <Box sx={{ mt: 4 }}>
            {getDashboardContent()}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Dashboard; 
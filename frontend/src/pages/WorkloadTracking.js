import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

const WorkloadTracking = () => {
  // Örnek veri
  const workloadData = {
    currentWeek: 15,
    weeklyLimit: 20,
    monthlyTotal: 45,
    monthlyLimit: 80,
    tasks: [
      {
        id: 1,
        type: 'Lab Work',
        course: 'CS101',
        hours: 4,
        date: '2024-04-25',
      },
      {
        id: 2,
        type: 'Grading',
        course: 'CS102',
        hours: 3,
        date: '2024-04-26',
      },
      {
        id: 3,
        type: 'Office Hours',
        course: 'CS103',
        hours: 2,
        date: '2024-04-27',
      },
    ],
  };

  const weeklyProgress = (workloadData.currentWeek / workloadData.weeklyLimit) * 100;
  const monthlyProgress = (workloadData.monthlyTotal / workloadData.monthlyLimit) * 100;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Workload Tracking
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weekly Workload
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box sx={{ flexGrow: 1, mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={weeklyProgress}
                    color={weeklyProgress > 90 ? 'error' : 'primary'}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {`${Math.round(weeklyProgress)}%`}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {`${workloadData.currentWeek} / ${workloadData.weeklyLimit} hours`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Workload
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box sx={{ flexGrow: 1, mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={monthlyProgress}
                    color={monthlyProgress > 90 ? 'error' : 'primary'}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {`${Math.round(monthlyProgress)}%`}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {`${workloadData.monthlyTotal} / ${workloadData.monthlyLimit} hours`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Task Type</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell>Hours</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workloadData.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{task.type}</TableCell>
                    <TableCell>{task.course}</TableCell>
                    <TableCell>{task.hours}</TableCell>
                    <TableCell>{task.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
};

export default WorkloadTracking; 
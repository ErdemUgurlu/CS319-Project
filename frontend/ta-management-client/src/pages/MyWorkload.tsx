import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Card, 
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem, 
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  AlertTitle,
  LinearProgress
} from '@mui/material';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface WorkloadActivity {
  id: number;
  activity_type: string;
  description: string;
  hours: number;
  weighted_hours: number;
  is_recurring: boolean;
  recurrence_pattern: string;
  start_date: string;
  end_date: string | null;
  course_code: string;
  section: string;
}

interface TAWorkload {
  id: number;
  ta_details: {
    id: number;
    email: string;
    full_name: string;
    academic_level: string;
    employment_type: string;
  };
  academic_term: string;
  department_details: {
    id: number;
    code: string;
    name: string;
  };
  max_weekly_hours: number;
  current_weekly_hours: number;
  total_assigned_hours: number;
  required_workload_hours: number;
  is_overloaded: boolean;
  overload_approved: boolean;
  activities: WorkloadActivity[];
  policy_details: {
    id: number;
    max_hours_phd_full_time: number;
    max_hours_phd_part_time: number;
    max_hours_msc_full_time: number;
    max_hours_msc_part_time: number;
    max_hours_undergrad: number;
    lecture_weight: number;
    lab_weight: number;
    grading_weight: number;
    office_hours_weight: number;
  } | null;
}

// Helper function to get color based on workload percentage
const getWorkloadColor = (current: number, max: number) => {
  const percentage = (current / max) * 100;
  if (percentage < 70) return 'success';
  if (percentage < 90) return 'warning';
  return 'error';
};

// Helper function to get activity type display name
const getActivityTypeDisplay = (type: string) => {
  const activityMap: Record<string, string> = {
    'LECTURE': 'Lecture Assistance',
    'LAB': 'Laboratory Session',
    'OFFICE_HOURS': 'Office Hours',
    'GRADING': 'Grading/Assessment',
    'PROCTORING': 'Exam Proctoring',
    'PREP': 'Course Preparation',
    'MEETING': 'Staff Meeting',
    'OTHER': 'Other Activity'
  };
  return activityMap[type] || type;
};

// Helper function to get recurrence pattern display
const getRecurrenceDisplay = (pattern: string) => {
  const recurrenceMap: Record<string, string> = {
    'ONCE': 'One-time',
    'DAILY': 'Daily',
    'WEEKLY': 'Weekly',
    'BIWEEKLY': 'Bi-weekly',
    'MONTHLY': 'Monthly'
  };
  return recurrenceMap[pattern] || pattern;
};

// Helper function to get TA employment type display
const getEmploymentTypeDisplay = (type: string) => {
  const employmentMap: Record<string, string> = {
    'FULL_TIME': 'Full-Time',
    'PART_TIME': 'Part-Time',
    'NOT_APPLICABLE': 'Not Applicable'
  };
  return employmentMap[type] || type;
};

const MyWorkload: React.FC = () => {
  const { authState } = useAuth();
  const [workload, setWorkload] = useState<TAWorkload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkload = async () => {
      try {
        setLoading(true);
        const response = await api.get('/workload/workloads/my_workload/');
        setWorkload(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching workload:', err);
        setError(err.response?.data?.error || 'Failed to load workload data');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkload();
  }, []);

  // Group activities by type
  const groupedActivities = React.useMemo(() => {
    if (!workload?.activities) return {};
    
    return workload.activities.reduce((acc, activity) => {
      const type = activity.activity_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(activity);
      return acc;
    }, {} as Record<string, WorkloadActivity[]>);
  }, [workload]);

  // Calculate hours by activity type
  const hoursByType = React.useMemo(() => {
    if (!workload?.activities) return {};
    
    return workload.activities.reduce((acc, activity) => {
      const type = activity.activity_type;
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type] += activity.weighted_hours;
      return acc;
    }, {} as Record<string, number>);
  }, [workload]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!workload) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="info">
          <AlertTitle>No Workload Data</AlertTitle>
          No workload information is available for the current term.
        </Alert>
      </Container>
    );
  }

  // Calculate completion percentage
  const workloadCompletionPercentage = Math.min(
    (workload.total_assigned_hours / workload.required_workload_hours) * 100, 
    100
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Workload
      </Typography>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: {xs: 'column', md: 'row'}, gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Overview</Typography>
            <Typography variant="body1">
              {workload.academic_term} - {workload.department_details.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {getEmploymentTypeDisplay(workload.ta_details.employment_type)} Teaching Assistant
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Weekly hours: {workload.current_weekly_hours.toFixed(1)} / {workload.max_weekly_hours} hours
                {workload.is_overloaded && !workload.overload_approved && (
                  <Chip 
                    size="small" 
                    color="error" 
                    label="Overloaded" 
                    sx={{ ml: 1 }} 
                  />
                )}
                {workload.is_overloaded && workload.overload_approved && (
                  <Chip 
                    size="small" 
                    color="warning" 
                    label="Overload Approved" 
                    sx={{ ml: 1 }} 
                  />
                )}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={Math.min((workload.current_weekly_hours / workload.max_weekly_hours) * 100, 100)}
                color={getWorkloadColor(workload.current_weekly_hours, workload.max_weekly_hours)}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Total term workload: {workload.total_assigned_hours.toFixed(1)} / {workload.required_workload_hours} hours
                {workload.ta_details.employment_type === 'FULL_TIME' && (
                  <Chip 
                    size="small" 
                    color="primary" 
                    label="Full-Time Requirement" 
                    sx={{ ml: 1 }} 
                  />
                )}
                {workload.ta_details.employment_type === 'PART_TIME' && (
                  <Chip 
                    size="small" 
                    color="info" 
                    label="Part-Time Requirement" 
                    sx={{ ml: 1 }} 
                  />
                )}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={workloadCompletionPercentage}
                color={getWorkloadColor(workload.total_assigned_hours, workload.required_workload_hours)}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Hours by Activity Type</Typography>
            <List dense>
              {Object.entries(hoursByType).map(([type, hours]) => (
                <ListItem key={type} disablePadding sx={{ py: 0.5 }}>
                  <ListItemText 
                    primary={getActivityTypeDisplay(type)} 
                    secondary={`${hours.toFixed(1)} hours`}
                  />
                  <Box sx={{ width: '30%' }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={(hours / workload.total_assigned_hours) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        </Box>
      </Paper>
      
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Activity Details
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {Object.entries(groupedActivities).map(([type, activities]) => (
          <Box key={type} sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 24px)' } }}>
            <Card>
              <CardHeader 
                title={getActivityTypeDisplay(type)}
                titleTypographyProps={{ variant: 'h6' }}
                sx={{ 
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText'
                }}
              />
              <CardContent>
                <List dense>
                  {activities.map((activity) => (
                    <React.Fragment key={activity.id}>
                      <ListItem alignItems="flex-start">
                        <ListItemText
                          primary={
                            <>
                              {activity.description}
                              {activity.course_code && (
                                <Typography 
                                  component="span" 
                                  variant="body2" 
                                  color="text.secondary" 
                                  sx={{ ml: 1 }}
                                >
                                  ({activity.course_code}{activity.section && `-${activity.section}`})
                                </Typography>
                              )}
                            </>
                          }
                          secondary={
                            <>
                              <Typography component="span" variant="body2" color="text.primary">
                                {activity.hours} hours {activity.hours !== activity.weighted_hours && `(weighted: ${activity.weighted_hours})`}
                              </Typography>
                              <br />
                              <Typography component="span" variant="body2">
                                {activity.is_recurring ? getRecurrenceDisplay(activity.recurrence_pattern) : 'One-time'} • 
                                {activity.start_date && ` ${format(new Date(activity.start_date), 'MMM d, yyyy')}`}
                                {activity.end_date && ` to ${format(new Date(activity.end_date), 'MMM d, yyyy')}`}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </Container>
  );
};

export default MyWorkload; 
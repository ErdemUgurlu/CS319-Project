import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  CircularProgress,
  Alert,
  AlertTitle,
  Card,
  CardContent
} from '@mui/material';
// import { format } from 'date-fns'; // Not needed for simplified view
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Simplified interface to match MyWorkloadCreditSerializer output
interface MyWorkloadData {
  workload_credits: number;
  email: string;
  full_name: string;
  academic_level: string;
  employment_type: string;
  department_code: string;
}

// Helper function to get TA employment type display (can be kept if needed)
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
  const [workloadData, setWorkloadData] = useState<MyWorkloadData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkload = async () => {
      try {
        setLoading(true);
        const response = await api.get('duties/my_workload/');
        setWorkloadData(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching workload:', err);
        setError(err.response?.data?.error || 'Failed to load workload data. Please ensure your TA profile is complete.');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkload();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!workloadData) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="info">
          <AlertTitle>No Workload Data</AlertTitle>
          No workload information is currently available. This might be because your TA profile is not yet fully processed or no workload credits have been assigned.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
        My Workload Credits
      </Typography>
      
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Card sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle1" color="text.secondary">
              TA Name
            </Typography>
            <Typography variant="h5" component="div" gutterBottom>
              {workloadData.full_name}
            </Typography>

            <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 2 }}>
              Email
            </Typography>
            <Typography variant="body1" gutterBottom>
              {workloadData.email}
            </Typography>
            
            <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 2 }}>
              Department
            </Typography>
            <Typography variant="body1" gutterBottom>
              {workloadData.department_code}
            </Typography>

            <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 2 }}>
              Employment Type
            </Typography>
            <Typography variant="body1" gutterBottom>
              {getEmploymentTypeDisplay(workloadData.employment_type)}
            </Typography>
            
            <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 3 }}>
              Assigned Workload Credits
            </Typography>
            <Typography variant="h2" component="div" color="primary" sx={{ fontWeight: 'bold' }}>
              {workloadData.workload_credits}
            </Typography>
          </CardContent>
        </Card>
      </Paper>
    </Container>
  );
};

export default MyWorkload; 
import React, { useState } from 'react';
import { Container, Stepper, Step, StepLabel, Box } from '@mui/material';
import ExamCreationForm from '../components/ExamCreationForm';
import AutomaticAssignmentResult from '../components/AutomaticAssignmentResult';
import ManualAssignment from '../components/ManualAssignment';

const steps = [
  'Create Exam',
  'Assign Proctors',
  'Assign Classrooms',
  'Finalize'
];

const ProctorAssignment = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [examData, setExamData] = useState(null);
  const [assignedTAs, setAssignedTAs] = useState([]);
  const [availableTAs, setAvailableTAs] = useState([]);

  const handleExamCreate = async (data) => {
    setExamData(data);
    
    if (data.assignmentType === 'automatic') {
      // In a real application, this would be an API call
      const mockAssignedTAs = [
        {
          id: 1,
          name: 'John Doe',
          department: 'Computer Science',
          workload: 10
        },
        {
          id: 2,
          name: 'Jane Smith',
          department: 'Computer Science',
          workload: 8
        }
      ];
      setAssignedTAs(mockAssignedTAs);
    } else {
      // In a real application, this would be an API call
      const mockAvailableTAs = [
        {
          id: 1,
          name: 'John Doe',
          department: 'Computer Science',
          workload: 10,
          is_course_ta: true,
          is_phd: true
        },
        {
          id: 2,
          name: 'Jane Smith',
          department: 'Computer Science',
          workload: 8,
          is_course_ta: true,
          is_phd: false
        },
        {
          id: 3,
          name: 'Bob Wilson',
          department: 'Computer Science',
          workload: 12,
          is_course_ta: false,
          is_phd: true,
          has_exam_conflict: true
        }
      ];
      setAvailableTAs(mockAvailableTAs);
    }
    
    setActiveStep(1);
  };

  const handleClassroomAssign = async (classrooms) => {
    // In a real application, this would be an API call
    console.log('Assigning classrooms:', classrooms);
    setActiveStep(2);
  };

  const handleManualAssign = async (assignments) => {
    // In a real application, this would be an API call
    console.log('Manual assignments:', assignments);
    setActiveStep(2);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return <ExamCreationForm onSubmit={handleExamCreate} />;
      case 1:
        return examData?.assignmentType === 'automatic' ? (
          <AutomaticAssignmentResult
            examData={examData}
            assignedTAs={assignedTAs}
            onClassroomAssign={handleClassroomAssign}
          />
        ) : (
          <ManualAssignment
            examData={examData}
            availableTAs={availableTAs}
            onAssignTAs={handleManualAssign}
          />
        );
      case 2:
        return (
          <Box sx={{ mt: 3 }}>
            Assignment completed successfully!
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ width: '100%', mt: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Box sx={{ mt: 4 }}>
          {renderStepContent()}
        </Box>
      </Box>
    </Container>
  );
};

export default ProctorAssignment; 
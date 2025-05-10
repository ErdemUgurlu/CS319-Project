import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography,
  Box,
  Alert
} from '@mui/material';
import examService from '../../services/examService';
import DragDropFileUpload from '../common/DragDropFileUpload';

interface ExamPlacementImportProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ExamPlacementImport: React.FC<ExamPlacementImportProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError("Please select a file to import");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await examService.importExamPlacements(selectedFile);
      
      setSuccess(true);
      setLoading(false);
      
      // Show success message for a moment before closing
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
      
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.detail || 'Failed to import exam placements. Please check the file format.');
      console.error('Error importing exam placements:', err);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Import Exam Placements</DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Upload an Excel file with exam placement data
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            The Excel file should contain columns for Exam ID, Building, Room Number, and Capacity.
            This will assign classrooms to exams that are waiting for places.
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            Make sure the Excel file has the following columns:
            <ul>
              <li><strong>Exam ID</strong> - The ID of the exam</li>
              <li><strong>Building</strong> - Building name/code</li>
              <li><strong>Room Number</strong> - Room number</li>
              <li><strong>Capacity</strong> - Room capacity</li>
            </ul>
          </Alert>
        </Box>
        
        <DragDropFileUpload
          onFileSelect={handleFileSelect}
          acceptedFileTypes=".xlsx,.xls"
          helperText="Accepted file types: Excel (.xlsx, .xls)"
          label="Drop your exam placement file here, or click to select"
          loading={loading}
          error={error}
          success={success}
        />
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleImport} 
          variant="contained" 
          color="primary"
          disabled={!selectedFile || loading || success}
        >
          {loading ? 'Importing...' : 'Import Placements'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExamPlacementImport; 
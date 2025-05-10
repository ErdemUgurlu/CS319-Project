import React, { useState, useRef } from 'react';
import {
  Typography,
  Box,
  Button,
  Paper,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Stack,
  Divider
} from '@mui/material';
import {
  Upload as UploadIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Description as FileIcon,
  CloudUpload as CloudUploadIcon,
  FileDownload as DownloadIcon
} from '@mui/icons-material';
import courseService from '../../services/courseService';
import { CourseImportResponse } from '../../interfaces/course';

interface ImportCoursesProps {
  onImportComplete: () => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ImportCourses: React.FC<ImportCoursesProps> = ({ 
  onImportComplete, 
  showNotification 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importResults, setImportResults] = useState<CourseImportResponse | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check if it's an Excel file
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
      } else {
        showNotification('Please select a valid Excel file (.xlsx or .xls)', 'error');
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Check if it's an Excel file
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
      } else {
        showNotification('Please select a valid Excel file (.xlsx or .xls)', 'error');
      }
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle download template
  const handleDownloadTemplate = () => {
    // In a real implementation, this would download a template Excel file
    showNotification('Template download not implemented yet', 'info');
  };

  // Handle import
  const handleImport = async () => {
    if (!selectedFile) {
      showNotification('Please select a file to import', 'error');
      return;
    }

    setLoading(true);
    setImportResults(null);
    
    try {
      const response = await courseService.importCoursesFromExcel(selectedFile);
      setImportResults(response.data);
      
      // Show success message
      const totalCreated = response.data.total_courses_created + response.data.total_sections_created;
      const message = totalCreated > 0 
        ? `Import successful! Created ${response.data.total_courses_created} courses and ${response.data.total_sections_created} sections` 
        : 'Import completed, but no new courses or sections were created';
        
      showNotification(message, totalCreated > 0 ? 'success' : 'info');
      
      // Call the onImportComplete callback to refresh data
      onImportComplete();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Error importing courses:', error);
      showNotification(
        error.response?.data?.detail || 'Failed to import courses',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle showing error details
  const handleViewDetails = () => {
    setShowDetails(true);
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 3, mb: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Import Courses from Excel
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
              Upload an Excel file containing course information to bulk import courses and sections.
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2">Required columns:</Typography>
              <Typography variant="body2" component="div">
                <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                  <li><strong>Department</strong> - Department code (e.g., CS, EE)</li>
                  <li><strong>Course Code</strong> - Course code (e.g., 101, 202)</li>
                  <li><strong>Course Title</strong> - Full name of the course</li>
                  <li><strong>Credits</strong> - Credit value (numeric)</li>
                  <li><strong>Section Count</strong> - Number of sections to create</li>
                  <li><strong>Student Count</strong> - Student count per section</li>
                  <li><strong>Academic Level</strong> - Level (e.g., Undergraduate, Graduate, PhD)</li>
                </ul>
              </Typography>
            </Alert>
            
            <Box 
              sx={{ 
                mb: 3, 
                p: 3, 
                border: '2px dashed #ccc', 
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: selectedFile ? '#f1f8e9' : '#f5f5f5',
                '&:hover': {
                  backgroundColor: '#e8f5e9',
                  borderColor: '#4caf50'
                },
                minHeight: 150
              }}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="course-import-file"
              />
              
              {selectedFile ? (
                <>
                  <FileIcon sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Math.round(selectedFile.size / 1024)} KB
                  </Typography>
                </>
              ) : (
                <>
                  <CloudUploadIcon sx={{ fontSize: 40, color: '#757575', mb: 1 }} />
                  <Typography variant="subtitle1">
                    Drag & Drop an Excel file here
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    or click to browse
                  </Typography>
                </>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadTemplate}
                size="small"
              >
                Download Template
              </Button>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<UploadIcon />}
                onClick={handleImport}
                disabled={!selectedFile || loading}
              >
                {loading ? 'Importing...' : 'Import Courses'}
              </Button>
            </Box>
            
            {loading && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Importing courses...
                </Typography>
                <LinearProgress />
              </Box>
            )}
          </Paper>
        </Box>
        
        <Box sx={{ flex: 1 }}>
          {importResults ? (
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Import Results
              </Typography>
              
              <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <Card variant="outlined" sx={{ flex: 1 }}>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Courses Created
                    </Typography>
                    <Typography variant="h4">
                      {importResults.total_courses_created}
                    </Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined" sx={{ flex: 1 }}>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Sections Created
                    </Typography>
                    <Typography variant="h4">
                      {importResults.total_sections_created}
                    </Typography>
                  </CardContent>
                </Card>
              </Stack>
              
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Errors
                  </Typography>
                  <Typography variant="h4" color={importResults.total_errors > 0 ? 'error' : 'text.primary'}>
                    {importResults.total_errors}
                  </Typography>
                  
                  {importResults.total_errors > 0 && (
                    <Button 
                      size="small" 
                      onClick={handleViewDetails} 
                      sx={{ mt: 1 }}
                    >
                      View Details
                    </Button>
                  )}
                </CardContent>
              </Card>
              
              {importResults.created_courses.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Courses Created
                  </Typography>
                  <List dense>
                    {importResults.created_courses.slice(0, 5).map((course) => (
                      <ListItem key={course.id}>
                        <ListItemIcon>
                          <CheckIcon color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={`${course.code}: ${course.title}`}
                        />
                      </ListItem>
                    ))}
                    {importResults.created_courses.length > 5 && (
                      <ListItem>
                        <ListItemText 
                          secondary={`... and ${importResults.created_courses.length - 5} more courses`}
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              )}
            </Paper>
          ) : (
            <Paper sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box textAlign="center">
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No import results yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Import results will appear here after you upload an Excel file
                </Typography>
              </Box>
            </Paper>
          )}
        </Box>
      </Stack>
      
      {/* Details Dialog */}
      <Dialog 
        open={showDetails} 
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Details</DialogTitle>
        <DialogContent dividers>
          {importResults?.errors.length && importResults.errors.length > 0 ? (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Errors
              </Typography>
              <List>
                {importResults.errors.map((error, index) => (
                  <ListItem key={index} divider>
                    <ListItemIcon>
                      <ErrorIcon color="error" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`Row ${error.row}: ${error.error}`}
                      secondary={`Data: ${JSON.stringify(error.data)}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : (
            <Typography>No errors found.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImportCourses; 
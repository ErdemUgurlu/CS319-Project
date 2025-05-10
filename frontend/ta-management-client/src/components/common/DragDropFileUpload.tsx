import React, { useState, useRef, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  CircularProgress,
  Alert
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { styled } from '@mui/material/styles';

const UploadBox = styled(Paper)(({ theme }) => ({
  border: `2px dashed ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: theme.palette.mode === 'dark' 
    ? theme.palette.background.default 
    : '#f8f9fa',
  transition: 'border-color 0.3s ease-in-out',
  '&:hover': {
    borderColor: theme.palette.secondary.main,
  },
  '&.drag-active': {
    borderColor: theme.palette.success.main,
    backgroundColor: theme.palette.success.light + '22', // 22 = 13% opacity in hex
  }
}));

interface DragDropFileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFileTypes?: string; // e.g. ".xlsx,.xls,application/vnd.ms-excel"
  maxFileSizeMB?: number;
  label?: string;
  helperText?: string;
  fileSelectedLabel?: string;
  loading?: boolean;
  error?: string | null;
  success?: boolean;
}

const DragDropFileUpload: React.FC<DragDropFileUploadProps> = ({
  onFileSelect,
  acceptedFileTypes = ".xlsx,.xls,.csv",
  maxFileSizeMB = 5,
  label = "Drop your file here, or click to select",
  helperText = "Accepted file types: Excel (.xlsx, .xls) or CSV",
  fileSelectedLabel = "File selected:",
  loading = false,
  error = null,
  success = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024; // Convert MB to bytes
  
  const validateFile = (file: File): { valid: boolean, error?: string } => {
    // Check file type
    if (acceptedFileTypes && !file.name.match(new RegExp(`(${acceptedFileTypes.split(',').join('|')})$`, 'i'))) {
      return { 
        valid: false, 
        error: `Invalid file type. Accepted types: ${acceptedFileTypes}` 
      };
    }
    
    // Check file size
    if (file.size > maxFileSizeBytes) {
      return { 
        valid: false, 
        error: `File size exceeds the limit of ${maxFileSizeMB} MB` 
      };
    }
    
    return { valid: true };
  };

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0]; // Take only the first file
      const validation = validateFile(file);
      
      if (validation.valid) {
        setSelectedFile(file);
        onFileSelect(file);
      } else if (validation.error) {
        // Use any provided error callback or just log to console
        console.error(validation.error);
        // You could set an error state here if needed
      }
    }
  }, [onFileSelect, acceptedFileTypes, maxFileSizeBytes]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const validation = validateFile(file);
      
      if (validation.valid) {
        setSelectedFile(file);
        onFileSelect(file);
      } else if (validation.error) {
        console.error(validation.error);
        // You could set an error state here if needed
      }
    }
  };
  
  const handleButtonClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <input
        ref={inputRef}
        type="file"
        accept={acceptedFileTypes}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      
      <UploadBox
        className={dragActive ? 'drag-active' : ''}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={handleButtonClick}
        sx={{ mb: 2 }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>Processing file...</Typography>
          </Box>
        ) : success ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h6" color="success.main">Upload successful!</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CloudUploadIcon sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6">{label}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {helperText}
            </Typography>
            
            {selectedFile && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  {fileSelectedLabel}
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {selectedFile.name}
                </Typography>
              </Box>
            )}
            
            <Button 
              variant="contained" 
              component="span" 
              sx={{ mt: 2 }}
              startIcon={<CloudUploadIcon />}
            >
              {selectedFile ? 'Change File' : 'Select File'}
            </Button>
          </Box>
        )}
      </UploadBox>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default DragDropFileUpload; 
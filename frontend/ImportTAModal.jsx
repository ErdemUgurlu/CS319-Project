import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText
} from "@mui/material";
import UploadFileIcon from '@mui/icons-material/UploadFile';

const ImportTAModal = ({ open, onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = () => {
    if (selectedFile) {
      // Excel işleme logic buraya eklenir
      console.log("Uploading:", selectedFile.name);
    }
  };

  const requiredHeaders = [
    "Name", "Surname", "Email", "Bilkent ID", "IBAN", "Phone Number",
    "Employment Type (P/F)", "Academic Level (PhD/Masters)",
    "Undergraduate University", "Workload Number"
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Teaching Assistants from Excel</DialogTitle>
      <DialogContent>
        <Button
          variant="outlined"
          component="label"
          startIcon={<UploadFileIcon />}
          sx={{ mb: 2 }}
        >
          CHOOSE EXCEL FILE
          <input type="file" accept=".xlsx, .xls" hidden onChange={handleFileChange} />
        </Button>

        <Box sx={{ backgroundColor: "#e3f2fd", p: 2, borderRadius: 2 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Required Headers</strong> (case-insensitive, exact order preferred):
          </Typography>
          <List dense>
            {requiredHeaders.map((header, index) => (
              <ListItem key={index}>
                <ListItemText primary={header} />
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>CANCEL</Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!selectedFile}
        >
          UPLOAD & PROCESS TA'S
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportTAModal;

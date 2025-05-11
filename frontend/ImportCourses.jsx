// ImportCourses.jsx

import React from "react";
import { Box, Typography, Paper, Grid, Divider } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const ImportCourses = () => {
  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold">Course Management</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Manage departments, courses, and sections
      </Typography>

      <Box display="flex" mt={2}>
        {/* Left Panel: Instructions */}
        <Paper elevation={3} sx={{ flex: 1, p: 3, mr: 2 }}>
          <Typography variant="h6" gutterBottom>
            Import Courses from Excel
          </Typography>
          <Typography>
            Upload an Excel file containing course information to bulk import courses and sections.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography fontWeight="bold" gutterBottom>📌 Required columns:</Typography>
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            <li><strong>Department</strong>: Department code (e.g., CS, EE)</li>
            <li><strong>Course Code</strong>: Course code (e.g., 101, 202)</li>
            <li><strong>Course Title</strong>: Full name of the course</li>
            <li><strong>Credits</strong>: Credit value (numeric)</li>
            <li><strong>Section Count</strong>: Number of sections to create</li>
            <li><strong>Student Count</strong>: Student count per section</li>
            <li><strong>Academic Level</strong>: Level (e.g., Undergraduate, Graduate, PhD)</li>
          </ul>
          <Box mt={3} textAlign="center">
            <CloudUploadIcon sx={{ fontSize: 40, color: "#666" }} />
            <Typography variant="body2">Upload Excel file here</Typography>
          </Box>
        </Paper>

        {/* Right Panel: Results */}
        <Paper elevation={3} sx={{ flex: 1, p: 3 }}>
          <Typography variant="body1" align="center" sx={{ mt: 4, color: "gray" }}>
            No import results yet
          </Typography>
          <Typography variant="body2" align="center" sx={{ color: "lightgray" }}>
            Import results will appear here after you upload an Excel file
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default ImportCourses;
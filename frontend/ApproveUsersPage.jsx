import React, { useState } from "react";
import {
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  Box,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

const ApproveUsersPage = () => {
  const [roleFilter, setRoleFilter] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("Pending Approval");

  const handleRoleChange = (event) => {
    setRoleFilter(event.target.value);
  };

  const handleStatusChange = (event) => {
    setApprovalStatus(event.target.value);
  };

  const handleImportTAs = () => {
    // Trigger file upload or API call for TA import
    console.log("Import TAs");
  };

  const handleImportInstructors = () => {
    // Trigger file upload or API call for instructor import
    console.log("Import Instructors");
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        User Import/Approval Panel
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        You can approve users from the CS department or import TA’s or instructors from an Excel file.
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <FormControl>
          <InputLabel>Role Filter</InputLabel>
          <Select value={roleFilter} label="Role Filter" onChange={handleRoleChange}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="TA">TA</MenuItem>
            <MenuItem value="Instructor">Instructor</MenuItem>
          </Select>
        </FormControl>

        <FormControl>
          <InputLabel>Approval Status</InputLabel>
          <Select value={approvalStatus} label="Approval Status" onChange={handleStatusChange}>
            <MenuItem value="Pending Approval">Pending Approval</MenuItem>
            <MenuItem value="Approved">Approved</MenuItem>
          </Select>
        </FormControl>

        <Button variant="contained" onClick={() => window.location.reload()}>
          Refresh
        </Button>

        <Button variant="contained" onClick={handleImportTAs}>
          Import TA's
        </Button>

        <Button variant="contained" onClick={handleImportInstructors}>
          Import Instructors
        </Button>
      </Box>

      {/* Boş tablo gösterimi */}
      <Box sx={{ height: 300 }}>
        <Typography variant="body2" color="text.secondary">
          No users waiting for approval.
        </Typography>
      </Box>
    </Box>
  );
};

export default ApproveUsersPage;

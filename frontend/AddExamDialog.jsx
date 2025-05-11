// AddExamDialog.jsx

import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem
} from "@mui/material";

const AddExamDialog = ({ open, onClose, onCreate }) => {
  const [course, setCourse] = useState("");
  const [type, setType] = useState("Midterm");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");

  const handleSubmit = () => {
    if (!course || !date || !time || !duration) {
      alert("Please fill in all required fields!");
      return;
    }
    onCreate({ course, type, date, time, duration });
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add New Exam</DialogTitle>
      <DialogContent>
        <TextField
          label="Course"
          select
          fullWidth
          margin="normal"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
        >
          <MenuItem value="CS600">CS 600</MenuItem>
          <MenuItem value="CS201">CS 201</MenuItem>
        </TextField>

        <TextField
          label="Exam Type"
          fullWidth
          margin="normal"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />

        <TextField
          label="Date"
          type="date"
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <TextField
          label="Time"
          type="time"
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />

        <TextField
          label="Duration (minutes)"
          type="number"
          fullWidth
          margin="normal"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Create</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddExamDialog;
// ExamTable.jsx

import React from "react";
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, Chip
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/WarningAmber";

const statusColor = (status) => {
  switch (status) {
    case "Awaiting Proctors": return "info";
    case "Waiting for Student List": return "warning";
    case "Ready": return "success";
    default: return "default";
  }
};

const exams = [
  {
    course: "600",
    title: "phdcourse",
    type: "Quiz",
    date: "May 9, 2025",
    time: "21:54",
    duration: 90,
    students: 5,
    status: "Awaiting Proctors",
    classroom: "Building F - F102",
    proctors: "0 / 3"
  },
  {
    course: "600",
    title: "phdcourse",
    type: "Quiz",
    date: "May 11, 2025",
    time: "10:09",
    duration: 90,
    students: 0,
    status: "Waiting for Student List",
    classroom: "Not Assigned",
    proctors: "1"
  },
  {
    course: "201",
    title: "Fundamental Structures of Computer Science I",
    type: "Quiz",
    date: "May 12, 2025",
    time: "16:33",
    duration: 90,
    students: 5,
    status: "Awaiting Proctors",
    classroom: "B-Z01",
    proctors: "0 / 1"
  }
];

const ExamTable = () => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Course</TableCell>
          <TableCell>Type</TableCell>
          <TableCell>Date & Time</TableCell>
          <TableCell>Duration</TableCell>
          <TableCell>Students</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Classroom</TableCell>
          <TableCell>Proctors</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {exams.map((exam, index) => (
          <TableRow key={index}>
            <TableCell>
              <strong>{exam.course}</strong><br />
              <small>{exam.title}</small>
            </TableCell>
            <TableCell>{exam.type}</TableCell>
            <TableCell>{exam.date} {exam.time}</TableCell>
            <TableCell>{exam.duration} min</TableCell>
            <TableCell>{exam.students}</TableCell>
            <TableCell>
              <Chip
                label={exam.status}
                color={statusColor(exam.status)}
                size="small"
              />
            </TableCell>
            <TableCell>{exam.classroom}</TableCell>
            <TableCell>{exam.proctors}</TableCell>
            <TableCell>
              <Tooltip title="Edit">
                <IconButton><EditIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Upload List">
                <IconButton><CloudUploadIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Approve">
                <IconButton><CheckIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton color="error"><DeleteIcon /></IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ExamTable;
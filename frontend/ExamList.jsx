import React from "react";
import "./ExamList.css";

const exams = [
  {
    id: 1,
    code: "102",
    department: "IE",
    title: "A Process Outlook for Industrial Engineering",
    type: "Midterm",
    level: "Undergraduate",
    date: "May 9, 2025",
    time: "17:18",
    duration: "120 min",
    students: 6,
    status: "Awaiting Proctors",
    classroom: "Building F - F102",
    proctors: "0 / 1",
  },
  {
    id: 2,
    code: "101",
    department: "CS",
    title: "Algorithms and Programming I",
    type: "Midterm",
    level: "Undergraduate",
    date: "May 9, 2025",
    time: "21:15",
    duration: "120 min",
    students: 6,
    status: "Awaiting Proctors",
    classroom: "Building T - T301",
    proctors: "0 / 1",
  },
  {
    id: 3,
    code: "319",
    department: "CS",
    title: "Object-Oriented Software Engineering",
    type: "Midterm",
    level: "Undergraduate",
    date: "May 12, 2025",
    time: "16:45",
    duration: "120 min",
    students: 6,
    status: "Awaiting Proctors",
    classroom: "Building T - T301",
    proctors: "0 / 2",
  },
  {
    id: 4,
    code: "102",
    department: "CS",
    title: "Algorithms and Programming II",
    type: "Midterm",
    level: "Undergraduate",
    date: "May 22, 2025",
    time: "13:40",
    duration: "90 min",
    students: 6,
    status: "Awaiting Proctors",
    classroom: "Building F - F102",
    proctors: "0 / 1",
  },
  {
    id: 5,
    code: "590",
    department: "CS",
    title: "Research Seminar I",
    type: "Quiz",
    level: "Graduate",
    date: "Jun 27, 2025",
    time: "08:31",
    duration: "120 min",
    students: 6,
    status: "Awaiting Proctors",
    classroom: "Building Z - Z202",
    proctors: "0 / 1",
  },
];

const ExamList = () => {
  return (
    <div className="exam-list-container">
      <h3>{exams.length} Exams found</h3>
      <table>
        <thead>
          <tr>
            <th>Course</th>
            <th>Type</th>
            <th>Date & Time</th>
            <th>Duration</th>
            <th>Students</th>
            <th>Status</th>
            <th>Classroom</th>
            <th>Proctors</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {exams.map((exam) => (
            <tr key={exam.id}>
              <td>
                <div className="course-info">
                  <div className="dept-circle">{exam.department}</div>
                  <div>
                    <strong>{exam.code}</strong> {exam.title}
                    <div className="course-level">{exam.level}</div>
                  </div>
                </div>
              </td>
              <td>
                <span className="exam-type">{exam.type}</span>
              </td>
              <td>
                {exam.date} <br />
                {exam.time}
              </td>
              <td>{exam.duration}</td>
              <td>{exam.students}</td>
              <td>
                <span className="status-badge">{exam.status}</span>
              </td>
              <td>{exam.classroom}</td>
              <td>{exam.proctors}</td>
              <td>
                <button className="action-btn">Manage</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ExamList;
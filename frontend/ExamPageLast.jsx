// ExamPageLast.jsx
import React from 'react';
import './ExamPageLast.css'; // Optional CSS for styling

const ExamPageLast = () => {
  return (
    <div className="exam-container">
      <div className="header-bar">
        <h1 className="title">Bilkent TA Management</h1>
        <div className="user-info">ERAY TÜZÜN </div>
      </div>

      <div className="exam-panel">
        <h2>Exam Management</h2>
        <p className="subtitle">Manage exam schedules for your courses</p>

        <div className="exam-controls">
          <div className="tabs">
            <span className="active-tab">ALL EXAMS</span>
            <span className="tab">NEED STUDENT LIST <span className="badge">0</span></span>
            <span className="tab">AWAITING PROCTORS</span>
            <span className="tab">READY</span>
          </div>
          <button className="add-button">+ ADD EXAM</button>
        </div>

        <table className="exam-table">
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
            <tr>
              <td colSpan="9" className="no-exams">No exams found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExamPageLast;
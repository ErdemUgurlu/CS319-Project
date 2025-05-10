import React, { useState } from "react";
import "./DefineExam.css";

const DefineExam = () => {
  const [courseName, setCourseName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("");
  const [duration, setDuration] = useState("");
  const [section, setSection] = useState("");
  const [showError, setShowError] = useState(false);

  const handleApply = () => {
    if (!courseName || !examDate || !examTime || !duration || !section) {
      setShowError(true);
    } else {
      alert("Exam created successfully!");
      setShowError(false);
    }
  };

  return (
    <div className="define-exam-container">
      <h2>DEFINE EXAM</h2>
      <div className="exam-box">
        <h4>Define Exam</h4>

        <label>Choose Course:</label>
        <input
          type="text"
          placeholder="Enter course name"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
        />

        <label>Choose Date / Time:</label>
        <div className="datetime-group">
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
          <input
            type="time"
            value={examTime}
            onChange={(e) => setExamTime(e.target.value)}
          />
        </div>

        <label>Choose Sections:</label>
        <input
          type="text"
          placeholder="e.g. A, B"
          value={section}
          onChange={(e) => setSection(e.target.value)}
        />

        <label>Choose Exam Duration:</label>
        <input
          type="text"
          placeholder="Enter duration in minutes"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />

        <button className="apply-btn" onClick={handleApply}>
          APPLY
        </button>
      </div>

      {showError && (
        <div className="error-popup">
          <p>ERROR! CHECK YOUR EXAM INFO!</p>
          <button onClick={() => setShowError(false)}>OK</button>
        </div>
      )}
    </div>
  );
};

export default DefineExam;
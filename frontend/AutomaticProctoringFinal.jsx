import React, { useState } from "react";
import "./AutomaticProctoringFinal.css";

const TA_DATA = [
  {
    name: "Berfin",
    courses: "CS 489, CS 544",
    workload: "3 proctoring",
  },
  {
    name: "Gülferiz",
    courses: "CS 473, CS 544",
    workload: "4 proctoring",
  },
  {
    name: "Erdem",
    courses: "CS 378, CS 442",
    workload: "5 proctoring",
  },
  {
    name: "Emre",
    courses: "CS 378, CS 432",
    workload: "5 proctoring",
  },
];

const AutomaticProctoringFinal = () => {
  const [course, setCourse] = useState("CS 544");
  const [required, setRequired] = useState("4");
  const [classrooms, setClassrooms] = useState(["", "", "", ""]);

  const handleClassroomChange = (index, value) => {
    const updated = [...classrooms];
    updated[index] = value;
    setClassrooms(updated);
  };

  const handleSubmit = () => {
    alert("Classrooms set and proctoring submitted!");
  };

  return (
    <div className="auto-proctor-container">
      <h2>Automatic Proctoring Assign</h2>
      <div className="auto-box">
        <div className="form-left">
          <label>Course name:</label>
          <input value={course} onChange={(e) => setCourse(e.target.value)} />

          <label>Required Number of TA's:</label>
          <input
            type="number"
            value={required}
            onChange={(e) => setRequired(e.target.value)}
          />

          <label>Choose TAs:</label>
          <table>
            <thead>
              <tr>
                <th>TA Name</th>
                <th>TA's Courses</th>
                <th>Workload</th>
              </tr>
            </thead>
            <tbody>
              {TA_DATA.map((ta, i) => (
                <tr key={i}>
                  <td>{ta.name}</td>
                  <td>{ta.courses}</td>
                  <td>{ta.workload}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="form-right">
          <label>Set Restriction:</label>
          <button>Consecutive days available</button>
          <button>Break Ms/PHD restriction</button>

          <button className="blue-btn">Assign Proctoring</button>
        </div>
      </div>

      <p className="success-msg">
        ✅ Proctoring is successfully assigned, assign classrooms for TAs.
      </p>

      <table className="final-table">
        <thead>
          <tr>
            <th>TA Name</th>
            <th>TA's Courses</th>
            <th>Workload</th>
            <th>Exam Class</th>
          </tr>
        </thead>
        <tbody>
          {TA_DATA.map((ta, i) => (
            <tr key={i}>
              <td>{ta.name}</td>
              <td>{ta.courses}</td>
              <td>{ta.workload}</td>
              <td>
                <input
                  type="text"
                  value={classrooms[i]}
                  placeholder="Enter classroom"
                  onChange={(e) => handleClassroomChange(i, e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="submit-btn" onClick={handleSubmit}>
        Set classrooms and submit
      </button>
    </div>
  );
};

export default AutomaticProctoringFinal;
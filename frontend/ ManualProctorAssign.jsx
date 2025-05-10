import React, { useState } from "react";
import "./ManualProctorAssign.css";

const TA_LIST = [
  {
    name: "Berfin Örtülü",
    courses: "CS 489, CS 544",
    workload: "3 proctoring",
    availability: "yes",
  },
  {
    name: "Gülferiz Özçırak",
    courses: "CS 473, CS 544",
    workload: "4 proctoring",
    availability: "yes",
  },
  {
    name: "Erdem Uğurlu",
    courses: "CS 313, CS 442",
    workload: "5 proctoring",
    availability: "no",
  },
  {
    name: "Emre Şahin",
    courses: "CS 378, CS 432",
    workload: "5 proctoring",
    availability: "yes",
  },
  {
    name: "Kenan Ataman",
    courses: "CS 313, CS 432",
    workload: "5 proctoring",
    availability: "yes",
  },
];

const ManualProctorAssign = () => {
  const [courseName, setCourseName] = useState("CS 544");
  const [requiredTAs, setRequiredTAs] = useState("4");

  const handleAssign = () => {
    alert("TA assignment approved!");
  };

  return (
    <div className="manual-assign-container">
      <h2>Manual Proctoring Assign</h2>
      <div className="manual-box">
        <label>Course name:</label>
        <input
          type="text"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
        />

        <label>Required Number of TA's:</label>
        <input
          type="number"
          value={requiredTAs}
          onChange={(e) => setRequiredTAs(e.target.value)}
        />

        <label>Choose TAs:</label>
        <table>
          <thead>
            <tr>
              <th>TA Name</th>
              <th>TA's Courses</th>
              <th>Workload</th>
              <th>Availability</th>
            </tr>
          </thead>
          <tbody>
            {TA_LIST.map((ta, idx) => (
              <tr key={idx}>
                <td>{ta.name}</td>
                <td>{ta.courses}</td>
                <td>{ta.workload}</td>
                <td>{ta.availability}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="assign-btn" onClick={handleAssign}>
          ASSIGN / APPROVE
        </button>
      </div>
    </div>
  );
};

export default ManualProctorAssign;
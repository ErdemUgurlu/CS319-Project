import React, { useState } from "react";
import "./DeanOfficeRequest.css";

const DeanOfficeRequest = () => {
  const [exam, setExam] = useState("");
  const [taNumber, setTaNumber] = useState("");

  const handleRequest = () => {
    if (exam && taNumber) {
      alert(`Request sent for ${exam} with ${taNumber} TA(s)`);
      setExam("");
      setTaNumber("");
    } else {
      alert("Please fill in both fields!");
    }
  };

  return (
    <div className="dean-office-container">
      <h2>Request Dean Office for Proctoring</h2>

      <div className="request-box">
        <table>
          <thead>
            <tr>
              <th>Course Name</th>
              <th>Date</th>
              <th>Time</th>
              <th>Required TA No</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CS-102 MT</td>
              <td>14.04.2025</td>
              <td>18.40</td>
              <td>2</td>
            </tr>
            <tr>
              <td>CS-202 MT</td>
              <td>23.04.2025</td>
              <td>17.30</td>
              <td>7</td>
            </tr>
          </tbody>
        </table>

        <div className="input-section">
          <div className="input-group">
            <label>Enter Exam:</label>
            <input
              type="text"
              value={exam}
              onChange={(e) => setExam(e.target.value)}
              placeholder="e.g., CS-303 MT"
            />
          </div>
          <div className="input-group">
            <label>Enter number of TA needed:</label>
            <input
              type="number"
              value={taNumber}
              onChange={(e) => setTaNumber(e.target.value)}
              placeholder="e.g., 5"
            />
          </div>
          <button onClick={handleRequest}>Request</button>
        </div>
      </div>
    </div>
  );
};

export default DeanOfficeRequest;
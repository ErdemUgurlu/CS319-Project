import React, { useState } from "react";
import "./AutoProctorAssign.css";

const AutoProctorAssign = () => {
  const [showError, setShowError] = useState(false);

  const handleAssign = () => {
    // Simülasyon: hiçbir TA kısıtlara uymuyor gibi davran
    setShowError(true);
  };

  return (
    <div className="auto-proctor-container">
      <h2>Automatic Proctoring Assign</h2>

      <div className="form-box">
        <div className="left-section">
          <label>Course name:</label>
          <input type="text" value="CS 544" readOnly />

          <label>Required Number of TA's:</label>
          <input type="number" value="4" readOnly />

          <label>Choose TAs:</label>
          <table>
            <thead>
              <tr><th>TA Name</th></tr>
            </thead>
            <tbody>
              <tr><td>Berfin</td></tr>
              <tr><td>Gülfer</td></tr>
              <tr><td>Erdem</td></tr>
            </tbody>
          </table>
        </div>

        <div className="right-section">
          <label>Set Restriction:</label>
          <button>Consecutive days available</button>
          <button>Break Ms/PHD restriction</button>

          <button className="assign-btn" onClick={handleAssign}>Assign</button>
        </div>
      </div>

      {showError && (
        <div className="error-popup">
          <p>Error! No TA's were found for the features you selected. Please regard your restrictions again.</p>
          <button onClick={() => setShowError(false)}>OK</button>
        </div>
      )}
    </div>
  );
};

export default AutoProctorAssign;
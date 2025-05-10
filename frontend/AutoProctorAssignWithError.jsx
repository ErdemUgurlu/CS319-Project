import React, { useState } from "react";
import "./AutoProctorAssignWithError.css";

const AutoProctorAssignWithError = () => {
  const [showError, setShowError] = useState(true); // popup açık
  const [course, setCourse] = useState("CS 544");
  const [requiredTAs, setRequiredTAs] = useState("4");

  const TA_LIST = ["Berfin", "Gülferiz", "Erdem"];

  return (
    <div className="proctor-assign-container">
      <h2>Automatic Proctoring Assign</h2>
      <div className="assign-box">
        <div className="form-section">
          <label>Course name:</label>
          <input
            type="text"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
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
              </tr>
            </thead>
            <tbody>
              {TA_LIST.map((ta, i) => (
                <tr key={i}>
                  <td>{ta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="restriction-section">
          <label>Set Restriction:</label>
          <button>Consecutive days available</button>
          <button>Break Ms/PHD restriction</button>
        </div>
      </div>

      {showError && (
        <div className="error-popup">
          <p>
            Error! No TA's were found for the features you selected. Please
            regard your restrictions again.
          </p>
          <button onClick={() => setShowError(false)}>OK</button>
        </div>
      )}
    </div>
  );
};

export default AutoProctorAssignWithError;
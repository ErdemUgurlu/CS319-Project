import React, { useState } from "react";
import "./AutoProctoringError.css";

const AutoProctoringError = () => {
  const [showError, setShowError] = useState(true);

  const TAs = ["Berfin", "Gülferiz", "Erdem"];

  return (
    <div className="auto-container">
      <h2>Automatic Proctoring Assign</h2>

      <div className="input-grid">
        <div>
          <label>Course name</label>
          <input type="text" value="CS 544" readOnly />
        </div>
        <div>
          <label>Required Number of TA’s</label>
          <input type="number" value={4} readOnly />
        </div>
        <div className="restrictions">
          <label>Set Restriction:</label>
          <button>Consecutive days available</button>
          <button>Break Ms/PHD restriction</button>
        </div>
      </div>

      <div className="ta-table">
        <table>
          <thead>
            <tr>
              <th>TA Name</th>
            </tr>
          </thead>
          <tbody>
            {TAs.map((ta, i) => (
              <tr key={i}>
                <td>{ta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showError && (
        <div className="error-banner">
          <span>
            Error! No TA’s were found for the features you selected. Please regard your restrictions again.
          </span>
          <button onClick={() => setShowError(false)}>OK</button>
        </div>
      )}
    </div>
  );
};

export default AutoProctoringError;
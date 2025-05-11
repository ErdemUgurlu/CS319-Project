import React, { useState } from "react";
import "./LeaveRequestForm.css";

const LeaveRequestForm = () => {
  const [message, setMessage] = useState(
    "Begüm Hocam ,\n\nI want to drop my Math 230 proctoring on 3 March 15:30."
  );
  const [file, setFile] = useState(null);

  const handleSubmit = () => {
    alert("Leave request sent!");
  };

  return (
    <div className="leave-container">
      <h2>Proctoring</h2>

      <div className="tab-bar">
        <button>SWAP PROCTORING</button>
        <button>ASSIGNED PROCTORINGS</button>
        <button className="active">LEAVE REQUEST</button>
      </div>

      <p className="leave-label">Enter Date to Leave:</p>

      <div className="mail-card">
        <input type="text" readOnly value="From : berfin.ortulu@ug.bilkent.edu.tr" />
        <input type="text" readOnly value="To : begum.cinar@ug.bilkent.edu.tr" />

        <textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <div className="bottom-bar">
          <label className="file-upload">
            + Add file if necessary
            <input type="file" onChange={(e) => setFile(e.target.files[0])} hidden />
          </label>

          <button className="send-btn" onClick={handleSubmit}>
            SEND
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestForm;
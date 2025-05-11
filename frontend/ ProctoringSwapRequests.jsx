import React, { useState } from "react";
import "./ProctoringSwapRequests.css";

const mockRequests = [
  { id: 1, name: "Ayşe", course: "MATH-102", date: "3 March" },
  { id: 2, name: "Ali", course: "CS-101", date: "19 March" },
];

const ProctoringSwapRequests = () => {
  const [requests, setRequests] = useState(mockRequests);

  const handleDecision = (id, decision) => {
    alert(`${decision}ED swap request with ID ${id}`);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="swap-container">
      <h2>Proctoring</h2>

      <div className="tab-bar">
        <button className="active">SWAP PROCTORING</button>
        <button>ASSIGNED PROCTORINGS</button>
        <button>LEAVE REQUEST</button>
      </div>

      <div className="request-box">
        {requests.map((req) => (
          <div key={req.id} className="swap-card">
            <span>
              <strong>{req.name}</strong> wants to change <strong>{req.course}</strong> proctoring on{" "}
              <strong>{req.date}</strong>.
            </span>
            <div className="btn-group">
              <button className="reject-btn" onClick={() => handleDecision(req.id, "REJECT")}>
                REJECT
              </button>
              <button className="approve-btn" onClick={() => handleDecision(req.id, "APPROVE")}>
                APPROVE
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProctoringSwapRequests;
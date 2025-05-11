import React, { useState } from "react";
import "./MyProctoringAssignments.css";

const MyProctoringAssignments = () => {
  const [tab, setTab] = useState("upcoming");
  const [error, setError] = useState(true); // Simülasyon: hata açık

  const renderContent = () => {
    if (error) {
      return (
        <div className="error-box">
          <strong>⚠️ Error</strong> — Error fetching proctor assignments
        </div>
      );
    }

    switch (tab) {
      case "upcoming":
        return <p className="empty-state">You don't have any upcoming proctoring assignments.</p>;
      case "past":
        return <p className="empty-state">You have no past proctoring assignments.</p>;
      case "swap":
        return <p className="empty-state">No swap history found.</p>;
      default:
        return null;
    }
  };

  return (
    <div className="proctor-page">
      <h2>My Proctoring Assignments</h2>

      <div className="tab-row">
        <button className={tab === "upcoming" ? "active" : ""} onClick={() => setTab("upcoming")}>
          UPCOMING ASSIGNMENTS
        </button>
        <button className={tab === "past" ? "active" : ""} onClick={() => setTab("past")}>
          PAST ASSIGNMENTS
        </button>
        <button className={tab === "swap" ? "active" : ""} onClick={() => setTab("swap")}>
          SWAP HISTORY
        </button>
        <button className="refresh-btn" onClick={() => setError(!error)}>
          
        </button>
      </div>

      <div className="assignment-content">{renderContent()}</div>
    </div>
  );
};

export default MyProctoringAssignments;
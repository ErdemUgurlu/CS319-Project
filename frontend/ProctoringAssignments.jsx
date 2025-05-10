import React, { useState } from "react";
import "./ProctoringAssignments.css";

const ProctoringAssignments = () => {
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [error, setError] = useState(true); // Error simülasyonu

  const tabs = [
    { name: "Upcoming Assignments", key: "Upcoming" },
    { name: "Past Assignments", key: "Past" },
    { name: "Swap History", key: "Swap" },
  ];

  return (
    <div className="proctoring-container">
      <h2>My Proctoring Assignments</h2>

      {error && (
        <div className="error-box">
          <strong>⚠️ Error</strong>
          <p>Error fetching proctor assignments</p>
        </div>
      )}

      <div className="tab-bar">
        {tabs.map((tab) => (
          <span
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.name.toUpperCase()}
          </span>
        ))}
        <span className="refresh-icon" title="Refresh" onClick={() => alert("Refreshing...")}>
          🔄
        </span>
      </div>

      <div className="content-box">
        {activeTab === "Upcoming" && (
          <p className="empty-msg">You don't have any upcoming proctoring assignments.</p>
        )}
        {activeTab === "Past" && (
          <p className="empty-msg">No past proctoring assignments found.</p>
        )}
        {activeTab === "Swap" && (
          <p className="empty-msg">No swap history available.</p>
        )}
      </div>
    </div>
  );
};

export default ProctoringAssignments;
import React from "react";
import "./LeaveRequests.css";

const leaveRequests = [
  {
    id: 1,
    requestDate: "May 10, 2025",
    type: "Annual Leave",
    dateRange: "Oct 22, 2025 to Oct 24, 2025 (3 days)",
    status: "Pending",
  },
  // Daha fazla örnek ekleyebilirsin
];

const statusColors = {
  Pending: "pending",
  Approved: "approved",
  Rejected: "rejected",
  Cancelled: "cancelled",
};

const LeaveRequests = () => {
  const handleView = (request) => {
    alert(`Viewing request from ${request.requestDate}`);
  };

  return (
    <div className="leave-requests-container">
      <h2>My Leave Requests</h2>
      <p>Submit and track your leave requests</p>

      <div className="table-header">
        <button className="new-request-btn">+ NEW REQUEST</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Request Date</th>
            <th>Type</th>
            <th>Date Range</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leaveRequests.map((req) => (
            <tr key={req.id}>
              <td>{req.requestDate}</td>
              <td>{req.type}</td>
              <td>{req.dateRange}</td>
              <td>
                <span className={`status-badge ${statusColors[req.status]}`}>
                  {req.status}
                </span>
              </td>
              <td>
                <button className="view-btn" onClick={() => handleView(req)}>
                  👁️ VIEW
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="status-guide">
        <h4>Leave Request Status Guide</h4>
        <div className="guide-row">
          <span className="status-badge pending">Pending</span>
          <span>Waiting for instructor approval</span>
        </div>
        <div className="guide-row">
          <span className="status-badge approved">Approved</span>
          <span>Your request has been approved</span>
        </div>
        <div className="guide-row">
          <span className="status-badge rejected">Rejected</span>
          <span>Your request has been rejected</span>
        </div>
        <div className="guide-row">
          <span className="status-badge cancelled">Cancelled</span>
          <span>You cancelled this request</span>
        </div>
      </div>
    </div>
  );
};

export default LeaveRequests;
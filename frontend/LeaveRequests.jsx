
import { useState } from "react";

export default function LeaveRequests() {
  const [requests] = useState([]);

  return (
    <div>
      <h2>My Leave Requests</h2>
      {requests.length === 0 ? (
        <p>No leave requests found</p>
      ) : (
        requests.map((r, i) => <div key={i}>{r.type}</div>)
      )}
    </div>
  );
}

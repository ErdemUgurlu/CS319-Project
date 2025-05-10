
import { useState, useEffect } from "react";

export default function ProctoringAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/proctoring/")
      .then((res) => res.json())
      .then((data) => setAssignments(data))
      .catch(() => setError(true));
  }, []);

  return (
    <div>
      <h2>My Proctoring Assignments</h2>
      {error && <div>Error fetching proctor assignments</div>}
      {assignments.length === 0 && !error && (
        <p>You don't have any upcoming proctoring assignments.</p>
      )}
    </div>
  );
}

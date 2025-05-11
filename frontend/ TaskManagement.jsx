import React, { useState } from "react";
import "./TaskManagement.css";

const TaskManagement = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const tasks = []; // Şu an boş, dilersen simülasyonla doldurabiliriz.

  return (
    <div className="task-mgmt-container">
      <h2>Task Management</h2>
      <div className="search-row">
        <input
          type="text"
          placeholder="Search Tasks"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="task-content">
        {tasks.length === 0 ? (
          <p className="no-tasks">No tasks found.</p>
        ) : (
          tasks.map((task) => <div key={task.id}>{task.title}</div>)
        )}
      </div>
    </div>
  );
};

export default TaskManagement;
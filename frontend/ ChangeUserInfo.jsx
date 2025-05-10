import React, { useState } from "react";
import "./ChangeUserInfo.css";

const users = [
  { name: "Berfin", surname: "Bayar", role: "TA" },
  { name: "Gülferiz", surname: "Örtülü", role: "TA" },
  { name: "Erdem", surname: "Uğurlu", role: "TA" },
];

const ChangeUserInfo = () => {
  const [selectedRole, setSelectedRole] = useState("TA");
  const [selectedUserIndex, setSelectedUserIndex] = useState(null);
  const [deleteCourse, setDeleteCourse] = useState("");
  const [addCourse, setAddCourse] = useState("");

  const handleRoleClick = (role) => {
    setSelectedRole(role);
    setSelectedUserIndex(null);
  };

  const handleChangeClick = () => {
    if (selectedUserIndex === null) return alert("Select a user first.");
    alert(`Changing role/info for ${users[selectedUserIndex].name}`);
  };

  const handleDelete = () => {
    if (!deleteCourse) return;
    alert(`Deleted course: ${deleteCourse}`);
    setDeleteCourse("");
  };

  const handleAdd = () => {
    if (!addCourse) return;
    alert(`Added course: ${addCourse}`);
    setAddCourse("");
  };

  return (
    <div className="change-user-container">
      <h2>Change User Info</h2>

      <div className="role-tabs">
        {["TA", "Instructor", "Authorized Staff"].map((role) => (
          <button
            key={role}
            className={`role-btn ${
              selectedRole === role ? "active-role" : ""
            }`}
            onClick={() => handleRoleClick(role)}
          >
            {role}
          </button>
        ))}
      </div>

      <h4>Choose User from the List:</h4>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Surname</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, i) => (
            <tr
              key={i}
              className={i === selectedUserIndex ? "selected" : ""}
              onClick={() => setSelectedUserIndex(i)}
            >
              <td>{user.name}</td>
              <td>{user.surname}</td>
              <td>{user.role}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="course-edit">
        <label>Delete course from TA / INSTRUCTOR:</label>
        <div className="row-group">
          <input
            placeholder="Enter course..."
            value={deleteCourse}
            onChange={(e) => setDeleteCourse(e.target.value)}
          />
          <button onClick={handleDelete}>Assign</button>
        </div>

        <label>Add course to TA / INSTRUCTOR:</label>
        <div className="row-group">
          <input
            placeholder="Enter course..."
            value={addCourse}
            onChange={(e) => setAddCourse(e.target.value)}
          />
          <button onClick={handleAdd}>Assign</button>
        </div>
      </div>

      <div className="change-btn-wrapper">
        <button className="change-btn" onClick={handleChangeClick}>
          Change
        </button>
      </div>
    </div>
  );
};

export default ChangeUserInfo;
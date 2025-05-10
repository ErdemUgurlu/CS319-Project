import React, { useState } from "react";
import "./CourseManagement.css";

const courses = [
  {
    id: 1,
    department: "CS",
    code: "101",
    title: "Algorithms and Programming I",
    credits: 4.0,
    level: "Undergraduate",
  },
  {
    id: 2,
    department: "CS",
    code: "102",
    title: "Algorithms and Programming II",
    credits: 4.0,
    level: "Undergraduate",
  },
  {
    id: 3,
    department: "CS",
    code: "590",
    title: "Research Seminar I",
    credits: 3.0,
    level: "Graduate",
  },
  {
    id: 4,
    department: "CS",
    code: "319",
    title: "Object-Oriented Software Engineering",
    credits: 4.0,
    level: "Undergraduate",
  },
  {
    id: 5,
    department: "CS",
    code: "201",
    title: "Fundamental Structures of Computer Science I",
    credits: 3.0,
    level: "Undergraduate",
  },
];

const CourseManagement = () => {
  const [activeTab, setActiveTab] = useState("Courses");

  const handleEdit = (course) => {
    alert(`Editing course: ${course.title}`);
  };

  const handleDelete = (course) => {
    alert(`Deleting course: ${course.title}`);
  };

  const handleAssignTAs = (course) => {
    alert(`Assigning TAs for: ${course.title}`);
  };

  return (
    <div className="course-mgmt-container">
      <h2>Course Management</h2>
      <p>Manage departments, courses, and sections</p>

      <div className="tab-bar">
        {["Courses", "Sections", "Import"].map((tab) => (
          <span
            key={tab}
            className={`tab-item ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </span>
        ))}
      </div>

      {activeTab === "Courses" && (
        <div className="course-table-container">
          <div className="table-header">
            <span>Select a course from the list below to manage details or assign TAs.</span>
            <button className="add-btn">+ ADD COURSE</button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Course Code</th>
                <th>Title</th>
                <th>Credits</th>
                <th>Academic Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <td>
                    <div className="dept-circle">{course.department}</div>
                  </td>
                  <td>{course.code}</td>
                  <td>{course.title}</td>
                  <td>{course.credits.toFixed(1)}</td>
                  <td>{course.level}</td>
                  <td>
                    <button
                      className="icon-btn"
                      title="Edit"
                      onClick={() => handleEdit(course)}
                    >
                      ✏️
                    </button>
                    <button
                      className="icon-btn"
                      title="Delete"
                      onClick={() => handleDelete(course)}
                    >
                      🗑️
                    </button>
                    <button
                      className="assign-btn"
                      onClick={() => handleAssignTAs(course)}
                    >
                      ASSIGN TAS
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab !== "Courses" && (
        <div className="placeholder">
          <p>{activeTab} page content goes here.</p>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
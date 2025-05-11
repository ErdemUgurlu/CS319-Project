import React, { useState } from "react";
import "./DefineExamForm.css";

const DefineExamForm = () => {
  const [form, setForm] = useState({
    course: "",
    date: "",
    time: "",
    section: "",
    duration: "",
    type: "",
    taCount: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    alert("Exam defined successfully!");
    console.log(form);
  };

  return (
    <div className="define-exam-container">
      <h2>DEFINE EXAM</h2>

      <div className="exam-form">
        <div className="form-group">
          <label>Choose Course:</label>
          <input name="course" placeholder="Select Course" onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Choose Date / Time:</label>
          <div className="row">
            <input type="date" name="date" onChange={handleChange} />
            <input type="time" name="time" onChange={handleChange} />
          </div>
        </div>

        <div className="form-group">
          <label>Choose Sections:</label>
          <input name="section" placeholder="e.g. 1" onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Choose Exam Duration:</label>
          <input name="duration" placeholder="Enter Duration" onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Choose Exam Type:</label>
          <select name="type" onChange={handleChange}>
            <option value="">Select Exam Type</option>
            <option value="Midterm">Midterm</option>
            <option value="Final">Final</option>
            <option value="Quiz">Quiz</option>
          </select>
        </div>

        <div className="form-group">
          <label>Enter Number of required TA's:</label>
          <input name="taCount" type="number" min="1" onChange={handleChange} />
        </div>

        <button className="apply-btn" onClick={handleSubmit}>
          APPLY
        </button>
      </div>
    </div>
  );
};

export default DefineExamForm;
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const dummyCourses = [
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

export default function CourseManagement() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    // Gerçek sistemde: fetch("/api/courses").then...
    setCourses(dummyCourses);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Course Management</h1>
      <p className="text-gray-600 mb-6">
        Manage departments, courses, and sections.
      </p>

      <div className="flex justify-between items-center mb-4">
        <div className="space-x-4">
          <Button variant="default">COURSES</Button>
          <Button variant="ghost">SECTIONS</Button>
          <Button variant="ghost">IMPORT</Button>
        </div>
        <Button variant="default">+ ADD COURSE</Button>
      </div>

      <table className="w-full border text-left">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Department</th>
            <th className="p-2">Course Code</th>
            <th className="p-2">Title</th>
            <th className="p-2">Credits</th>
            <th className="p-2">Academic Level</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course.id} className="border-t">
              <td className="p-2">{course.department}</td>
              <td className="p-2">{course.code}</td>
              <td className="p-2">{course.title}</td>
              <td className="p-2">{course.credits}</td>
              <td className="p-2">{course.level}</td>
              <td className="p-2 space-x-2">
                <Button variant="secondary">✏️</Button>
                <Button variant="destructive">🗑️</Button>
                <Button variant="default">ASSIGN TAs</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

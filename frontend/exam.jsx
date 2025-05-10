import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ExamManagement() {
  const [exams, setExams] = useState([
    {
      course: "101",
      name: "Algorithms and Programming I",
      type: "Midterm",
      date: "May 9, 2025",
      time: "21:15",
      duration: "120 min",
      students: 6,
      status: "Awaiting Proctors",
      classroom: "Building T-T301",
      proctors: "0 / 1",
    },
    {
      course: "319",
      name: "Object-Oriented Software Engineering",
      type: "Midterm",
      date: "May 12, 2025",
      time: "16:45",
      duration: "120 min",
      students: 6,
      status: "Awaiting Proctors",
      classroom: "Building T-T301",
      proctors: "0 / 2",
    },
    {
      course: "590",
      name: "Research Seminar I",
      type: "Quiz",
      date: "Jun 27, 2025",
      time: "08:31",
      duration: "120 min",
      students: 6,
      status: "Awaiting Proctors",
      classroom: "Building Z-Z202",
      proctors: "0 / 1",
    }
  ]);

  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Exam Management</h1>
        <Button onClick={() => setShowModal(true)}>+ ADD EXAM</Button>
      </div>
      <p className="text-sm text-muted-foreground">Manage exam schedules for all courses</p>
      <table className="w-full table-auto border border-gray-300">
        <thead>
          <tr>
            <th className="border p-2">Course</th>
            <th className="border p-2">Type</th>
            <th className="border p-2">Date & Time</th>
            <th className="border p-2">Duration</th>
            <th className="border p-2">Students</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Classroom</th>
            <th className="border p-2">Proctors</th>
          </tr>
        </thead>
        <tbody>
          {exams.map((exam, index) => (
            <tr key={index}>
              <td className="border p-2">{exam.course} - {exam.name}</td>
              <td className="border p-2">{exam.type}</td>
              <td className="border p-2">{exam.date} {exam.time}</td>
              <td className="border p-2">{exam.duration}</td>
              <td className="border p-2">{exam.students}</td>
              <td className="border p-2 text-blue-600">{exam.status}</td>
              <td className="border p-2">{exam.classroom}</td>
              <td className="border p-2">{exam.proctors}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow w-[400px] space-y-4">
            <h2 className="text-lg font-semibold">Add New Exam</h2>
            <select className="w-full border p-2">
              <option>CS102 - Algorithms and Programming II</option>
              <option>CS319 - Software Engineering</option>
            </select>
            <select className="w-full border p-2">
              <option>Midterm</option>
              <option>Quiz</option>
              <option>Final</option>
            </select>
            <Input type="date" />
            <Input type="time" />
            <Input type="number" placeholder="Duration (minutes)" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>CANCEL</Button>
              <Button>CREATE</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

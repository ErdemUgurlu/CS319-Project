import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ExamManagement = () => {
  const [exams, setExams] = useState([]);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await axios.get('/api/exams');
      setExams(response.data);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const statusBadge = (status) => {
    const map = {
      'Ready': 'bg-green-500',
      'Awaiting Proctors': 'bg-blue-500',
      'Awaiting Students': 'bg-yellow-500'
    };
    return <span className={`text-white px-2 py-1 rounded ${map[status] || 'bg-gray-500'}`}>{status}</span>;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Exam Management</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">+ ADD EXAM</button>
      </div>
      <table className="w-full table-auto border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Course</th>
            <th className="p-2 border">Type</th>
            <th className="p-2 border">Date & Time</th>
            <th className="p-2 border">Duration</th>
            <th className="p-2 border">Students</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Classroom</th>
            <th className="p-2 border">Proctors</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {exams.map((exam, index) => (
            <tr key={index} className="text-center">
              <td className="p-2 border">{exam.courseCode}</td>
              <td className="p-2 border">{exam.type}</td>
              <td className="p-2 border">{exam.dateTime}</td>
              <td className="p-2 border">{exam.duration} min</td>
              <td className="p-2 border">{exam.students}</td>
              <td className="p-2 border">{statusBadge(exam.status)}</td>
              <td className="p-2 border">{exam.classroom}</td>
              <td className="p-2 border">{exam.proctors}</td>
              <td className="p-2 border flex justify-center space-x-2">
                <button className="text-blue-600">✎</button>
                <button className="text-green-600">⬆</button>
                <button className="text-indigo-600">🧑‍🏫</button>
                <button className="text-red-600">🗑</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ExamManagement;

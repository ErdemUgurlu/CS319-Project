import React from 'react';

const teachingAssistants = [
  {
    name: 'erdem.ugurlu@ug.bilkent.edu.tr',
    type: 'Part-Time',
    level: "Master's",
    assignedDate: '10/05/2025',
  },
  {
    name: 'csta1@bilkent.edu.tr',
    type: 'Full-Time',
    level: 'PhD',
    assignedDate: '10/05/2025',
  },
];

const badgeClass = (label) => {
  if (label === 'Part-Time') return 'bg-red-500 text-white';
  if (label === 'Full-Time') return 'bg-blue-900 text-white';
  if (label === "Master's") return 'bg-blue-300 text-white';
  if (label === 'PhD') return 'bg-green-600 text-white';
  return 'bg-gray-300';
};

const ManageTAs = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold mb-4">Manage Teaching Assistants</h1>
      <div className="bg-white shadow-md rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium">My Teaching Assistants</h2>
          <button className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800">
            + Add TA
          </button>
        </div>
        <table className="w-full text-left border-t border-gray-200">
          <thead>
            <tr className="text-gray-600">
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Type</th>
              <th>Level</th>
              <th>Assigned Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachingAssistants.map((ta, index) => (
              <tr key={index} className="border-t">
                <td className="py-2">{ta.name.split('@')[0]}</td>
                <td>{ta.name}</td>
                <td>
                  <span className={`px-2 py-1 rounded text-sm ${badgeClass(ta.type)}`}>{ta.type}</span>
                </td>
                <td>
                  <span className={`px-2 py-1 rounded text-sm ${badgeClass(ta.level)}`}>{ta.level}</span>
                </td>
                <td>{ta.assignedDate}</td>
                <td className="flex space-x-3">
                  <button title="View Workload">
                    <i className="fas fa-balance-scale text-blue-900"></i>
                  </button>
                  <button title="Task List">
                    <i className="fas fa-clipboard-list text-orange-500"></i>
                  </button>
                  <button title="Remove TA">
                    <i className="fas fa-user-minus text-red-500"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageTAs;

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

const exampleTAs = [
  {
    id: "csta1@bilkent.edu.tr",
    name: "cs ta master full time 1",
    academicLevel: "MASTERS",
    workload: 1,
  },
  {
    id: "csta2@bilkent.edu.tr",
    name: "cs ta phdfull time 2",
    academicLevel: "PHD",
    workload: 0,
  },
  {
    id: "csta3@bilkent.edu.tr",
    name: "cs ta part time phd 3",
    academicLevel: "PHD",
    workload: 1,
  },
];

export default function AssignProctorsModal({ onClose, onSubmit }) {
  const [selectedTAs, setSelectedTAs] = useState([]);
  const [markAsPaid, setMarkAsPaid] = useState(false);

  const toggleSelect = (id) => {
    setSelectedTAs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    onSubmit({ selectedTAs, markAsPaid });
  };

  return (
    <div className="bg-white p-6 rounded shadow-xl w-[600px]">
      <h2 className="text-lg font-bold mb-2">Assign Proctors to: CS101 - Midterm</h2>
      <p className="text-sm text-gray-600 mb-4">Date: May 9, 2025 – Required Proctors: 1</p>

      <Button className="w-full mb-4" variant="default">
        AUTOMATIC ASSIGN PROCTORS
      </Button>

      <div className="space-y-3 mb-4">
        {exampleTAs.map((ta) => (
          <div key={ta.id} className="flex items-center justify-between p-2 border rounded">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedTAs.includes(ta.id)}
                onChange={() => toggleSelect(ta.id)}
              />
              <div>
                <div>{ta.name} ({ta.id})</div>
                <div className="text-sm text-gray-500">Academic Level: {ta.academicLevel}</div>
              </div>
            </label>
            <span className="text-sm bg-gray-200 px-2 py-1 rounded">
              Current Workload: {ta.workload}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <input
          type="checkbox"
          checked={markAsPaid}
          onChange={(e) => setMarkAsPaid(e.target.checked)}
        />
        <label className="text-sm">Mark selected assignments as paid</label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Assign Proctors</Button>
      </div>
    </div>
  );
}

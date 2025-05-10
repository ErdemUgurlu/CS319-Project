import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function AssignProctorsWithSuggestion() {
  const [confirmedAuto, setConfirmedAuto] = useState(false);
  const [selected, setSelected] = useState([1, 2]);
  const [paid, setPaid] = useState(false);

  const tas = [
    { id: 1, name: "cs ta part time phd 3", email: "csta3@bilkent.edu.tr", level: "PHD", workload: 0 },
    { id: 2, name: "cs ta master full time 1", email: "csta1@bilkent.edu.tr", level: "MASTERS", workload: 0 },
    { id: 3, name: "cs ta phdfull time 2", email: "csta2@bilkent.edu.tr", level: "PHD", workload: 0 },
  ];

  const toggleSelection = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleConfirm = () => {
    setConfirmedAuto(true);
  };

  const handleAssign = () => {
    alert("Proctors assigned successfully!");
  };

  return (
    <div className="p-6 space-y-4">
      <div className="bg-white p-6 rounded shadow-lg w-[500px] mx-auto space-y-4 border border-gray-200">
        <h2 className="text-lg font-bold">Assign Proctors to: CS319 - Midterm</h2>
        <p className="text-sm">Date: May 12, 2025 at 16:45</p>
        <p className="text-sm font-medium">Required Proctors: 2</p>

        {!confirmedAuto ? (
          <>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleConfirm}>
              CONFIRM AUTO ASSIGNMENT
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setSelected([])}>
              CANCEL SUGGESTION
            </Button>
          </>
        ) : (
          <>
            <p className="font-medium">Review Suggested TAs (or select manually):</p>
            {tas.map(ta => (
              <label key={ta.id} className="block border p-2 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(ta.id)}
                  onChange={() => toggleSelection(ta.id)}
                  className="mr-2"
                />
                <span className="font-semibold">{ta.name}</span> ({ta.email})
                <div className="text-sm text-muted-foreground">Academic Level: {ta.level}</div>
                <div className="text-sm text-muted-foreground">Current Workload: {ta.workload}</div>
              </label>
            ))}
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={paid} onChange={() => setPaid(!paid)} />
              <span>Mark selected assignments as paid</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setConfirmedAuto(false)}>CANCEL</Button>
              <Button onClick={handleAssign}>ASSIGN PROCTORS</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

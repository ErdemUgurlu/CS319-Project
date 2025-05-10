import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function LeaveRequests() {
  const [showForm, setShowForm] = useState(false);
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const [requests, setRequests] = useState([
    {
      date: "Dec 05, 2023",
      type: "Sick Leave",
      range: "Dec 10, 2023 to Dec 12, 2023",
      reason: "Medical appointment",
      status: "Approved"
    },
    {
      date: "Jan 01, 2024",
      type: "Personal Leave",
      range: "Jan 15, 2024 to Jan 17, 2024",
      reason: "Family event",
      status: "Pending"
    }
  ]);

  const handleSubmit = () => {
    if (!leaveType || !startDate || !endDate || !reason) return;
    const newRequest = {
      date: new Date().toDateString(),
      type: leaveType,
      range: `${startDate} to ${endDate}`,
      reason,
      status: "Pending"
    };
    setRequests([...requests, newRequest]);
    setShowForm(false);
    setLeaveType("");
    setStartDate("");
    setEndDate("");
    setReason("");
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Leave Requests</h1>
        <Button onClick={() => setShowForm(true)}>+ NEW REQUEST</Button>
      </div>
      <p className="text-sm text-muted-foreground">Submit and track your leave requests</p>

      <table className="w-full table-auto border border-gray-300">
        <thead>
          <tr>
            <th className="border p-2">Request Date</th>
            <th className="border p-2">Type</th>
            <th className="border p-2">Date Range</th>
            <th className="border p-2">Reason</th>
            <th className="border p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req, index) => (
            <tr key={index}>
              <td className="border p-2">{req.date}</td>
              <td className="border p-2">{req.type}</td>
              <td className="border p-2">{req.range}</td>
              <td className="border p-2">{req.reason}</td>
              <td className="border p-2">
                <span className={`px-2 py-1 rounded text-white text-xs ${
                  req.status === "Approved" ? "bg-green-500" : 
                  req.status === "Rejected" ? "bg-red-500" : "bg-yellow-500"
                }`}>
                  {req.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showForm && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg w-[400px] space-y-4">
            <h2 className="text-lg font-semibold">New Leave Request</h2>
            <select
              className="w-full border p-2"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
            >
              <option value="">Leave Type</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Personal Leave">Personal Leave</option>
              <option value="Academic Leave">Academic Leave</option>
            </select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />
            <Textarea
              placeholder="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>CANCEL</Button>
              <Button onClick={handleSubmit}>SUBMIT</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

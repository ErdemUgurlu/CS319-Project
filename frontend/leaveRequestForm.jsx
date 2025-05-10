import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function LeaveRequestForm() {
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState(null);

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append("leave_type", leaveType);
    formData.append("start_date", startDate);
    formData.append("end_date", endDate);
    formData.append("reason", reason);
    if (file) formData.append("document", file);

    fetch("/api/leaves/", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: formData,
    }).then((res) => {
      if (res.ok) alert("Leave request submitted");
      else alert("Submission failed");
    });
  };

  return (
    <div className="p-6 space-y-4 max-w-xl mx-auto bg-white shadow rounded">
      <h2 className="text-xl font-bold">New Leave Request</h2>

      <Label>Leave Type</Label>
      <Select onValueChange={setLeaveType}>
        <SelectTrigger>
          <SelectValue placeholder="Select Leave Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Sick">Sick Leave (Requires Documentation)</SelectItem>
          <SelectItem value="Personal">Personal Leave</SelectItem>
          <SelectItem value="Academic">Academic Leave (Requires Documentation)</SelectItem>
          <SelectItem value="Emergency">Emergency Leave (Requires Documentation)</SelectItem>
        </SelectContent>
      </Select>

      <Label>Start Date</Label>
      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      <Label>End Date</Label>
      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      <Label>Reason</Label>
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
      <Label>Upload Document (Optional)</Label>
      <Input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <div className="flex gap-4 mt-4">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSubmit}>Submit</Button>
      </div>
    </div>
  );
}

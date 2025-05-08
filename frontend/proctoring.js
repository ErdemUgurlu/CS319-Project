import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/datepicker";
import axios from "axios";

export default function ProctoringAssignment() {
  const [examInfo, setExamInfo] = useState({
    course: "",
    date: "",
    duration: "",
    type: "Midterm",
    roomCount: 1,
    taCount: 1,
    file: null,
  });

  const [availableTAs, setAvailableTAs] = useState([]);
  const [selectedTAs, setSelectedTAs] = useState([]);
  const [assignmentMode, setAssignmentMode] = useState("pending"); // pending, manual, auto

  const handleFileUpload = (e) => {
    setExamInfo({ ...examInfo, file: e.target.files[0] });
  };

  const handleExamSubmit = async () => {
    const formData = new FormData();
    Object.entries(examInfo).forEach(([key, value]) => {
      formData.append(key, value);
    });

    try {
      await axios.post("/api/exams/create", formData);
      alert("Sınav kaydedildi. Proctor ataması yapılabilir.");
    } catch (err) {
      console.error(err);
      alert("Sınav kaydı başarısız.");
    }
  };

  const fetchAvailableTAs = async () => {
    try {
      const res = await axios.get("/api/tas/available", {
        params: {
          date: examInfo.date,
          duration: examInfo.duration,
        },
      });
      setAvailableTAs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoAssign = () => {
    const sorted = [...availableTAs].sort((a, b) => a.workload - b.workload);
    setSelectedTAs(sorted.slice(0, examInfo.taCount));
    setAssignmentMode("auto");
  };

  const handleManualSelect = (ta) => {
    if (selectedTAs.includes(ta)) {
      setSelectedTAs(selectedTAs.filter((x) => x.id !== ta.id));
    } else {
      if (selectedTAs.length < examInfo.taCount) {
        setSelectedTAs([...selectedTAs, ta]);
      }
    }
    setAssignmentMode("manual");
  };

  const finalizeAssignment = async () => {
    try {
      await axios.post("/api/exams/assign", {
        examId: examInfo.id,
        taIds: selectedTAs.map((ta) => ta.id),
        mode: assignmentMode,
      });
      alert("Proctor ataması tamamlandı.");
    } catch (err) {
      console.error(err);
      alert("Atama başarısız.");
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-xl font-bold">Sınav Tanımlama</h2>
      <CardContent className="space-y-3">
        <Input placeholder="Ders Adı" onChange={(e) => setExamInfo({ ...examInfo, course: e.target.value })} />
        <DatePicker onChange={(date) => setExamInfo({ ...examInfo, date })} />
        <Input type="number" placeholder="Süre (dk)" onChange={(e) => setExamInfo({ ...examInfo, duration: e.target.value })} />
        <Input type="number" placeholder="Kullanılacak sınıf sayısı" onChange={(e) => setExamInfo({ ...examInfo, roomCount: parseInt(e.target.value) })} />
        <Input type="number" placeholder="Gerekli TA sayısı" onChange={(e) => setExamInfo({ ...examInfo, taCount: parseInt(e.target.value) })} />
        <Input type="file" onChange={handleFileUpload} />
        <Button onClick={handleExamSubmit}>Sınavı Kaydet</Button>
      </CardContent>

      <hr />

      <h2 className="text-xl font-bold">Proctor Atama</h2>
      <Button onClick={fetchAvailableTAs}>Uygun TA'leri Getir</Button>
      <Button onClick={handleAutoAssign}>Otomatik Atama</Button>
      <div className="grid grid-cols-2 gap-2">
        {availableTAs.map((ta) => (
          <div
            key={ta.id}
            className={`border p-2 rounded ${selectedTAs.includes(ta) ? "bg-green-200" : ""}`}
            onClick={() => handleManualSelect(ta)}
          >
            {ta.name} - Yük: {ta.workload} saat
          </div>
        ))}
      </div>
      <Button onClick={finalizeAssignment}>Atamayı Tamamla</Button>
    </Card>
  );
}
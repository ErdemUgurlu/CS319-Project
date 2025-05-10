import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function UploadStudentList() {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = () => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }
    alert("File uploaded: " + file.name);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="bg-white p-6 rounded shadow-lg w-[450px] mx-auto space-y-4 border border-gray-200">
        <h2 className="text-lg font-bold">Upload Student List</h2>
        <p className="text-sm text-blue-700 bg-blue-50 border-l-4 border-blue-400 p-2 rounded">
          Please upload an Excel file (.xlsx, .xls) or CSV file with student information.
          The file should include a column with student IDs.
        </p>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 p-6 rounded-md text-center cursor-pointer hover:border-blue-400">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <span className="text-blue-500 font-semibold">Drop your student list file here, or click to select</span>
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline">CANCEL</Button>
          <Button disabled={!file} onClick={handleUpload}>
            UPLOAD STUDENT LIST
          </Button>
        </div>
      </div>
    </div>
  );
}

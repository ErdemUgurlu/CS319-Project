export default function AssignClassrooms() {
    const tabs = ["ALL EXAMS", "WAITING FOR PLACES", "READY"];
    const selected = "WAITING FOR PLACES";
  
    return (
      <div className="p-6 space-y-4">
        <div className="text-sm text-blue-600 underline">Dashboard {'>'} Exam Management</div>
        <h1 className="text-2xl font-bold">Assign Classrooms to Exams</h1>
        <p className="text-sm text-muted-foreground">Review and assign classrooms to exams.</p>
  
        <div className="flex space-x-6 border-b">
          {tabs.map((tab) => (
            <div
              key={tab}
              className={`pb-2 px-1 border-b-2 cursor-pointer ${
                tab === selected ? "border-blue-500 text-blue-600 font-semibold" : "border-transparent"
              }`}
            >
              {tab} {tab === "WAITING FOR PLACES" && <span className="ml-1 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">0</span>}
            </div>
          ))}
        </div>
  
        <table className="w-full border border-gray-300 mt-4">
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
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2 text-center" colSpan={9}>
                No exams found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
  
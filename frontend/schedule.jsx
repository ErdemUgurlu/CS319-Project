import { Button } from "@/components/ui/button";

export default function WeeklySchedule() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const hours = [
    "08:30 - 09:20",
    "09:30 - 10:20",
    "10:30 - 11:20",
    "11:30 - 12:20",
    "13:30 - 14:20",
    "14:30 - 15:20",
    "15:30 - 16:20",
  ];

  const schedule = {
    Monday: ["Class Hours", "Class Hours", "Class Hours", "Class Hours", "", "", ""],
    Tuesday: ["Class Hours", "Class Hours", "", "", "", "", ""],
    Wednesday: ["", "", "", "", "", "", ""],
    Thursday: ["", "", "", "", "", "", ""],
    Friday: ["", "", "", "", "", "", ""],
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">My Class Schedule</h1>
      <p className="text-sm text-muted-foreground">
        Manage your weekly class schedule here. These hours will be marked as unavailable for proctoring assignments.
      </p>
      <Button className="ml-auto">REFRESH</Button>
      <div className="overflow-auto">
        <table className="w-full border border-gray-300">
          <thead>
            <tr>
              <th className="border p-2">Time</th>
              {days.map((day) => (
                <th key={day} className="border p-2">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour, i) => (
              <tr key={hour}>
                <td className="border p-2 font-semibold">{hour}</td>
                {days.map((day) => (
                  <td
                    key={`${day}-${i}`}
                    className={`border p-2 text-center ${schedule[day][i] ? "bg-blue-100" : ""}`}
                  >
                    {schedule[day][i] || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

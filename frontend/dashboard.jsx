import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/router";

export default function TADashboard() {
  const router = useRouter();

  const tiles = [
    {
      title: "My Tasks",
      desc: "View and manage your assigned tasks",
      route: "/tasks",
    },
    {
      title: "My Schedule",
      desc: "View your weekly schedule and manage availability",
      route: "/schedule",
    },
    {
      title: "Proctoring Assignments",
      desc: "View your upcoming proctoring assignments",
      route: "/proctoring",
    },
    {
      title: "Leave Requests",
      desc: "Submit and track your leave requests",
      route: "/leave",
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Welcome, cs ta part time phd 3</h1>
      <p className="text-sm">Bilkent University TA Management System</p>
      <h2 className="text-xl mt-4">TA Dashboard</h2>
      <div className="grid grid-cols-2 gap-4">
        {tiles.map((tile) => (
          <Card
            key={tile.title}
            className="cursor-pointer hover:shadow-md"
            onClick={() => router.push(tile.route)}
          >
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold">{tile.title}</h3>
              <p className="text-sm text-muted-foreground">{tile.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

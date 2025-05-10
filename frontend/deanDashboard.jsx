import { useRouter } from "next/router";
import { Card, CardContent } from "@/components/ui/card";

export default function DeanDashboard() {
  const router = useRouter();

  const tiles = [
    {
      title: "Exam Management",
      desc: "Assign classrooms to exams waiting for places",
      route: "/assign-classroom",
    },
    {
      title: "Course Management",
      desc: "Manage departments, courses, and sections",
      route: "/course-management",
    },
    {
      title: "User Management",
      desc: "View and manage system users",
      route: "/user-management",
    },
    {
      title: "Reports",
      desc: "Generate and view system reports",
      route: "/reports",
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Welcome, ahmet ataman</h1>
      <p className="text-sm">Bilkent University TA Management System</p>
      <h2 className="text-xl mt-4">Dean's Office Dashboard</h2>
      <div className="grid grid-cols-2 gap-4">
        {tiles.map((tile) => (
          <Card key={tile.title} className="cursor-pointer hover:shadow-md" onClick={() => router.push(tile.route)}>
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

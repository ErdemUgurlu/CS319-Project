import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from "@/components/ui/table";
import { Heading } from "@/components/ui/heading";

const AssignClassrooms = () => {
  const [tab, setTab] = useState("waiting");
  const tabs = [
    { id: "all", label: "All Exams" },
    { id: "waiting", label: "Waiting for Places", count: 0 },
    { id: "approval", label: "Cross-Dept. Approval", count: 0 },
    { id: "ready", label: "Ready" },
  ];

  return (
    <div className="p-8">
      <div className="mb-6 text-sm text-muted-foreground">
        <a href="#" className="text-primary underline">Dashboard</a> &gt; Exam Management
      </div>

      <Heading level={2} className="mb-4">Assign Classrooms to Exams</Heading>
      <p className="text-muted-foreground mb-6">Review and assign classrooms to exams.</p>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="gap-2 mb-4">
          {tabs.map(({ id, label, count }) => (
            <TabsTrigger key={id} value={id}>
              {label} {count !== undefined && <Badge variant="outline" className="ml-1">{count}</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(({ id }) => (
          <TabsContent key={id} value={id}>
            <Card className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Course</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Date &amp; Time</TableHeaderCell>
                    <TableHeaderCell>Duration</TableHeaderCell>
                    <TableHeaderCell>Students</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Classroom</TableHeaderCell>
                    <TableHeaderCell>Proctors</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                      No exams found
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AssignClassrooms;

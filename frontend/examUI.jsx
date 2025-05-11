import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';

const examData = [
  {
    id: 1,
    courseCode: 'CS201',
    courseName: 'Fundamental Structures of Computer Science I',
    type: 'Midterm',
    date: 'May 11, 2025',
    time: '14:29',
    duration: '90 min',
    students: 0,
    status: 'Awaiting Proctors',
    classroom: 'Building F - F102',
    proctors: '1 / 6'
  },
  {
    id: 2,
    courseCode: 'CS600',
    courseName: 'phdcourse',
    type: 'Midterm',
    date: 'May 12, 2025',
    time: '14:30',
    duration: '90 min',
    students: 0,
    status: 'Awaiting Cross-Department Proctor',
    classroom: 'B-Z01',
    proctors: '0 / 6'
  },
  {
    id: 3,
    courseCode: 'CS600',
    courseName: 'phdcourse',
    type: 'Midterm',
    date: 'May 12, 2025',
    time: '15:18',
    duration: '90 min',
    students: 0,
    status: 'Awaiting Proctors',
    classroom: 'Building D - D101',
    proctors: '0 / 5'
  }
];

export default function ExamManagement() {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Exam Management</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Exams</TabsTrigger>
          <TabsTrigger value="need-list">Need Student List</TabsTrigger>
          <TabsTrigger value="awaiting">Awaiting Proctors</TabsTrigger>
          <TabsTrigger value="cross">Cross-Dept. Proctors</TabsTrigger>
          <TabsTrigger value="ready">Ready</TabsTrigger>
        </TabsList>
      </Tabs>

      <Button className="mb-4">+ Add Exam</Button>

      <Card>
        <CardContent className="overflow-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Course</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Date & Time</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Students</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Classroom</TableCell>
                <TableCell>Proctors</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {examData.map(exam => (
                <TableRow key={exam.id}>
                  <TableCell>
                    <div className="font-semibold">{exam.courseCode}</div>
                    <div className="text-sm text-gray-500">{exam.courseName}</div>
                  </TableCell>
                  <TableCell>{exam.type}</TableCell>
                  <TableCell>{exam.date} {exam.time}</TableCell>
                  <TableCell>{exam.duration}</TableCell>
                  <TableCell>{exam.students}</TableCell>
                  <TableCell>
                    <span className={
                      exam.status.includes('Cross') ? 'text-green-600' : 'text-blue-600'
                    }>
                      {exam.status}
                    </span>
                  </TableCell>
                  <TableCell>{exam.classroom}</TableCell>
                  <TableCell>{exam.proctors}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">✏️</Button>
                      <Button variant="ghost" size="icon">👁️</Button>
                      <Button variant="ghost" size="icon">🧑‍🏫</Button>
                      <Button variant="ghost" size="icon">✅</Button>
                      <Button variant="destructive" size="icon">🗑️</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

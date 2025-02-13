
TA Management System [ CS 319 TERM PROJECT]

Group Members
Berfin Örtülü (21802704) 
Gülferiz bayar (21901442) 
Ahmet Kenan Ataman (22203434) 
Mehmet Emre Şahin (22201765) 
Erdem Uğurlu (22203391)

Description
A Linux and web-based platform called the TA Management System was created to effectively manage the responsibilities of teaching assistants (TAs). The system offers reporting and administrative features, lets TAs document their work, and assigns proctoring assignments according to workload distribution. The technology accelerates TA-related activities in a university department and guarantees equitable workload sharing. The workloads and the schedules of the TA’s will be achieved through the given excel file.

Features

Primary Functions
Lab work, grading, recitation, office hours, and other responsibilities can be entered by TAs
TAs with the least amount of work are given priority when proctoring tasks are assigned

Secondary Functions
Develops exam distribution lists for students in the classroom.
Reports on workload are provided.

TA Duty Workflow / Proctoring
TAs choose the task type, duration, date, and time
After being notified, the course instructor has the option to accept or reject the submission
The TA's overall workload for the semester is increased by approved tasks
TAs ask for leave for particular dates (e.g., conferences, medical reasons).
The request is approved or denied by the department head or authorized personnel.
Proctoring assignments on those dates is prohibited by approved leave.

Assignment In Detail
Instructors define exam parameters (course, date/time, duration, and number of proctors). Assignments can be manual or automatic:
Automated Assignment prioritizes TAs with the least workload, considering availability and PHD/MS
course restrictions.
Manual Assignment allows authorized staff to select TAs with priority warnings.

If TAs are insufficient, overrides (e.g., consecutive assignments, MS/PHD restrictions) or additional TAs from other departments can be requested.

Once finalized, the system notifies all parties via email and updates TA workloads.
  
Proctor Swaps
TAs in the department have the option to request exchanges with other TAs.
The system updates workloads and alerts everyone whether it is accepted.
In order to avoid recurring cycles, staff members can also reassign proctors while keeping track of any modifications.

Dean’s Office Assignments
Assignments can be distributed around departments for tests that are centrally scheduled, and certain departments can combine for proctoring.

Stored Information
Student Table: Name, academic level, TA status, student ID, and eligibility for proctoring.
Staff Table: Name, role, and personnel ID.
 Courses & Offerings: Interactions among TAs, instructors, and students.
Classrooms: Details on the space and its capacity.
Permissions: TAs, instructors, department employees, and administrators have varying degrees of access.

System Limits
adjustable TA workload caps for each semester or school year.

Import Functionality (Excel)
Import data (students, faculty, courses, enrollments) from Excel.

Role-Based Access Control
Groups: TA, Faculty, Department Staff, Department Chair, Dean, Administrator.
Global parameters, like the current semester, can be modified by administrators.

System Requirements
Operating System: Linux
Web Server: Apache2
Database: MySQL


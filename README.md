# 🎓 TA Management System  
**[ CS 319 TERM PROJECT ]**  

---

## 👥 Group Members  
- **Berfin Örtülü** *(21802704)*  
- **Gülferiz Bayar** *(21901442)*  
- **Ahmet Kenan Ataman** *(22203434)*  
- **Mehmet Emre Şahin** *(22201765)*  
- **Erdem Uğurlu** *(22203391)*  

---

## 📌 1) Description  
The **TA Management System** is a **Linux and web-based platform** designed to efficiently manage the responsibilities of **Teaching Assistants (TAs)**.  

### ✅ Key Features:
- Provides **reporting and administrative tools** for workload management.  
- Assigns **proctoring tasks** based on TA workload distribution.  
- Ensures **equitable workload sharing** within the department.  
- Supports **Excel-based** workload tracking.  

---

## 🚀 2) Features  

### 📑 **Primary Functions**  
- **TAs can log their tasks**, including:  
  - Lab work  
  - Grading  
  - Recitation  
  - Office hours  
- **Smart Task Allocation:**  
  - **TAs with the least workload** are prioritized for proctoring assignments.  

### 🏫 **Secondary Functions**  
- **Automated Exam Distribution Lists:** Ensures fair and balanced workload for exam supervision.  
- **Workload Reports:** Generates workload summaries for TAs and faculty.  

---

### 🔄 **TA Duty Workflow / Proctoring**  
1. **TAs select** task type, duration, date, and time.  
2. **Course instructors** can approve or reject tasks.  
3. **Approved tasks** update TA workload automatically.  
4. **Leave Requests** (for conferences, medical reasons) require approval.  
5. **Proctoring tasks are restricted** for TAs with approved leave.  

---

### 📝 **Assignment Management**  
📌 **Exam parameters** (course, date, duration, number of proctors) are defined by instructors.  

✅ **Assignment Modes:**  
- **Automated:** Prioritizes **least-burdened TAs**, considering **MS/PHD workload restrictions**.  
- **Manual:** Staff can manually assign proctors with **priority warnings**.  

💡 If **TAs are insufficient**, the system allows:  
- Overrides (e.g., **back-to-back assignments** or **MS/PHD exemptions**).  
- Requesting additional **TAs from other departments**.  
- Notifications via **email** with **real-time workload updates**.

---

### 🔄 **Proctor Swaps**  
- **TAs** can request **swaps** with other TAs.  
- **The system updates workloads** and notifies relevant parties.  
- **Staff can intervene** to reassign proctors **if necessary**, maintaining **fair distribution**.  

---

### 🏛 **Dean’s Office Assignments**  
📌 **Interdepartmental Proctoring:**  
- Centrally scheduled exams can have **cross-departmental** TA assignments.  
- Departments can collaborate for **shared proctoring duties**.  

---

### 📊 **Stored Information**  
| **Category**    | **Details** |
|----------------|------------|
| **Student Table**  | Name, academic level, TA status, student ID, eligibility for proctoring |
| **Staff Table**    | Name, role, personnel ID |
| **Courses & Offerings** | TA, instructor, and student interactions |
| **Classrooms** | Room details and capacity |
| **Permissions** | Role-based access for TAs, instructors, staff, admins |

---

### ⚙️ **System Limits**  
- Adjustable **TA workload caps** per semester or academic year.  

### 📥 **Import Functionality (Excel)**  
- Import **students, faculty, courses, enrollments** from **Excel files**.  

---

### 🔐 **Role-Based Access Control**  
✅ **User Groups:**  
- **TA**  
- **Faculty**  
- **Department Staff**  
- **Department Chair**  
- **Dean**  
- **Administrator**  

📌 **Global System Settings** (e.g., current semester) can only be modified by **administrators**.  

---

## 🛠 **System Requirements**  
| **Component**  | **Requirement** |
|--------------|----------------|
| **Operating System** | Linux |
| **Web Server** | Apache2 |
| **Database** | MySQL |

---

### 📩 Contact & Contributions  
For any questions or contributions, feel free to reach out via email or submit a **pull request**. 🚀  

---

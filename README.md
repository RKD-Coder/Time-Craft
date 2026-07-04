# Time Craft — Smart Timetable Generator

![Time Craft Screenshot](assets/Screenshot%202026-07-05%20021232.png)

**Time Craft** is an intelligent, feature-rich Timetable Generator designed for schools (CBSE / State Board, Classes 1–12). It streamlines the complex process of scheduling classes, assigning teachers, and managing subjects through a 3-phase intelligent scheduling engine.

🌐 **Live Demo:** [https://time-craft.pages.dev/](https://time-craft.pages.dev/)
👨‍💻 **Created by:** [RKD-Coder](https://github.com/RKD-Coder)

---

## 🌟 Benefits
- **Automated Scheduling:** Save hours of manual work with an intelligent algorithm that automatically resolves conflicts and generates optimized timetables.
- **Error-Free:** Prevents teacher double-booking and ensures subjects are distributed evenly across the week.
- **Customizable:** Adaptable to any school's structure with configurable periods, break times, and working days.
- **Export Options:** Easily export timetables to PDF, Excel, and CSV formats for printing or sharing.
- **Data Portability:** Backup and restore all configurations using JSON export/import.
- **Offline Capable:** Works completely in the browser without requiring a server backend.

## 🚀 How to Use (Step-by-Step Guide)

### 1. School Setup
- Navigate to the **School Setup** tab.
- Configure your school's basic parameters: School Name, Academic Year, Periods Per Day, Period Duration, Recess timing, and Working Days.
- Upload your School Logo and Principal Signature (these will appear on exported PDFs).
- Click **Save Configuration**. (You can also load sample data to test the application).

### 2. Teacher Management
- Go to the **Teachers** tab.
- Click **Add Teacher** to add staff members.
- Define their Unique ID, Name, Teaching Level (PGT, TGT, PRT), and maximum periods per day/week.
- Select the subjects they are qualified to teach and the classes they are eligible for.
- Mark any unavailable days to prevent the algorithm from scheduling them on those days.

### 3. Subject Management
- In the **Subjects** tab, add all the subjects taught in your school.
- Set the Subject Code, Name, Type, and Priority (Main, Semi-Main, Free).
- You can group alternative subjects (electives) together.
- Mark "Tough Subjects" to instruct the engine to prefer scheduling them in the earlier periods of the day.

### 4. Class Management
- Open the **Classes** tab to create sections.
- Add Class, Section, and Course Stream (for 11th & 12th).
- Assign a Class Incharge (Teacher).
- Set maximum periods per day and week.
- Map the subjects to each class and allocate the required number of periods per week.

### 5. Generate Timetable
- Go to the **Generate** tab.
- Run the **Pre-Generation Check** to ensure all parameters are valid and feasible.
- Click **Generate Full Timetable**. The 3-phase intelligent scheduling engine will:
  1. **Phase 1:** Column-lock subjects (ensures consistency for main subjects).
  2. **Phase 2:** Column-lock teachers (ensures teachers have consistent schedules and don't clash).
  3. **Phase 3:** Finalize (verifies all slots, flags shortages, and saves to history).

### 6. View & Export Timetables
- Navigate to the **View Timetables** tab.
- Switch between Class Timetables, Teacher Timetables, and History.
- Use the **Edit Mode** to make manual adjustments if necessary.
- Download individual or bulk timetables in **PDF**, **Excel**, or **CSV** formats using the provided export buttons.

## 🧠 Logic and Working
Time Craft operates entirely on the client side, utilizing modern Web APIs and JavaScript to handle complex scheduling logic.

**The Scheduling Engine (3-Phase Algorithm):**
1. **Subject Distribution & Constraints:** The engine first evaluates the required periods for each subject per class. It respects the "Tough Subject" flag by prioritizing them in the morning slots (Periods 1-5).
2. **Conflict Resolution:** It ensures that a teacher is not assigned to two different classes at the same time and respects the teacher's maximum daily/weekly period limits and unavailable days.
3. **Consistency & Locking:**
   - **Subject Locking:** Aims to keep the same subject at the same time across different days for a more predictable student routine.
   - **Teacher Locking:** Class Incharges are prioritized for the first period of their respective classes.
4. **Data Persistence:** All settings and generated timetables are stored in LocalStorage or IndexedDB, meaning your data persists across browser sessions.

## 🛠️ Technologies Used
- **HTML5 & CSS3:** With CSS Variables for dynamic Light/Dark mode theming.
- **Vanilla JavaScript (ES6+):** For the core scheduling algorithm and DOM manipulation.
- **Tailwind CSS (via CDN):** For rapid and responsive UI styling.
- **Remix Icon:** For beautiful, scalable vector icons.
- **jsPDF & jsPDF-AutoTable:** For client-side PDF generation.
- **SheetJS (xlsx):** For exporting data to Excel formats.

## 📄 License
This project is created by [RKD-Coder](https://github.com/RKD-Coder). All rights reserved.

---
*Enjoy crafting your timetables effortlessly with Time Craft!*

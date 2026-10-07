Automated Teacher Loading and Assignment System (DepEd)

Capstone 2 · Universidad de Manila · 2026 · Status: In progress

Overview:
A web-based system that automates teacher loading and assignment for the Department of Education (DepEd), and compares two allocation algorithms, Greedy and Backtracking, on the same scheduling problem.

The Problem:
In many DepEd schools, teacher loading (assigning teachers to subjects, grade levels, and sections) is still done manually with spreadsheets, handwritten forms, and informal coordination. It is slow and error-prone, and it often leads to scheduling conflicts, uneven workloads, and difficulty complying with DepEd staffing standards and K to 12 guidelines before classes open.

The Solution: 
This project automates the process: it generates teacher load assignments from teacher qualifications, subject offerings, and DepEd workload limits, and it compares two allocation algorithms (Greedy and Backtracking) on processing time, conflict resolution, and fairness of workload distribution.

Features:
 •Teacher, subject, and section management
 •Automated load assignment using Greedy and Backtracking
 •Side-by-side comparison of algorithm results
 •Role-based login (JWT authentication)
 •Generation log of every assignment run


Algorithms:
1.) Greedy assigns each section to the best available teacher using a priority rule. It is fast, but it may leave conflicts or produce a poor overall result because it never reconsiders a choice.
2.) Backtracking tries an assignment, undoes it when a constraint is violated, and tries another. It can find a valid assignment when one exists, but it gets slower as the problem grows.

Constraints considered: 
Teacher qualification and specialization, subject and grade-level requirements, maximum teaching hours per teacher (DepEd workload limits), and scheduling conflicts. 

Database Design:
Relational MySQL schema with primary/foreign key constraints, normalized to 3NF.

Entity-Relationship Diagram:
![ERD](docs/erd.md)

Tech Stack:
Backend: Python, Django, Django REST Framework (JWT auth)
Frontend: React
Database: MySQL

Notes:
No real DepEd data or credentials are stored in this repository. Sample data is for testing only.

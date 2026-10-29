# System Test Data — Reference Excel Format

This package converts the four current CSV datasets into the same three-workbook Excel format as `systestdata.zip`.

Each folder contains:
- `teacher_import_test_data.xlsx` — `Teachers` sheet
- `sections_test_data.xlsx` — `Sections` sheet
- `subject_offerings_test_data.xlsx` — `Subject Offerings` sheet

The four datasets remain separate so their IDs do not collide during testing. Source relationships are preserved. The source `school_year_id=2` is represented as school year `2025`, grade IDs `14–25` are represented as `Grade 1–Grade 12`, employment status IDs are represented as `Permanent`, `Provisional`, and `Part-time`, and each teacher's subject specializations are combined into the reference workbook's comma-separated `Specializations` field. Strand and adviser values remain blank because the source values are blank.

Weekly hours needed is calculated as sections × 10 subject offerings × 3 hours, matching the original test-data definition.

| Dataset | Sections | Teachers | Subjects | Offering rows | Weekly hours needed |
|---|---:|---:|---:|---:|---:|
| Test_1 | 12 | 15 | 10 | 60 | 360 |
| Test_2 | 48 | 71 | 10 | 120 | 1440 |
| Test_3 | 96 | 121 | 10 | 120 | 2880 |
| Test_4 | 144 | 179 | 10 | 120 | 4320 |

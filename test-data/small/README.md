# Small TeachLoad Test Dataset


This package contains deterministic CSV test data for the migrated multi-school schema.

## Main requested files

- `subjects.csv` — 8 subjects
- `teachers.csv` — 12 teachers
- `subject_offerings.csv` — 16 subject offerings
- `sections.csv` — 6 sections

## Supporting files for allocation tests

- `teacher_load_limits.csv` — active maximum weekly load per teacher
- `teacher_specializations.csv` — qualified subjects per teacher

## Reference IDs

The files assume these records already exist in the database:

- School IDs: `1` through `3`
- School-year IDs: one active 2026–2027 year per school, using the same ID as its school
- Grade-level IDs: 1 through 12
- Strand IDs: 1 through 4
- Employment-status IDs: 1 = Permanent, 2 = Provisional, 3 = Part-time

If your database uses different IDs, replace the foreign-key values before importing.

## Recommended import order

1. Create or verify schools.
2. Create or verify school years.
3. Create or verify grade levels, strands, and employment statuses.
4. Import `subjects.csv`.
5. Import `teachers.csv`.
6. Import `teacher_load_limits.csv`.
7. Import `teacher_specializations.csv`.
8. Import `subject_offerings.csv`.
9. Import `sections.csv`.

The system does not currently include a CSV bulk-import command, so these files are intended for manual import, a database import utility, or a future seed script. Do not import them directly into a production database.

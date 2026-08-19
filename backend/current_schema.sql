--
-- Create model GradeLevel
--
CREATE TABLE `GRADE_LEVEL` (`grade_level_id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `grade_name` varchar(50) NOT NULL, `education_level` varchar(50) NOT NULL);
--
-- Create model School
--
CREATE TABLE `SCHOOL` (`school_id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `deped_school_id` varchar(20) NOT NULL UNIQUE, `school_name` varchar(150) NOT NULL, `school_level` varchar(50) NOT NULL, `address` varchar(255) NULL);
--
-- Create model SchoolYear
--
CREATE TABLE `SCHOOL_YEAR` (`school_year_id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `year_start` integer NOT NULL, `year_end` integer NOT NULL);
--
-- Create model Strand
--
CREATE TABLE `STRAND` (`strand_id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `strand_name` varchar(100) NOT NULL);
--
-- Create model Subject
--
CREATE TABLE `SUBJECT` (`subject_id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `subject_name` varchar(100) NOT NULL, `subject_type` varchar(50) NULL);
--
-- Create model Track
--
CREATE TABLE `TRACK` (`track_id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `track_name` varchar(100) NOT NULL);
--
-- Create model SubjectOffering
--
CREATE TABLE `SUBJECT_OFFERING` (`offering_id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `hours_per_week` double precision NOT NULL, `grade_level_id` integer NOT NULL, `strand_id` integer NULL, `subject_id` integer NOT NULL);
--
-- Create model Teacher
--
CREATE TABLE `TEACHER` (`teacher_id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `full_name` varchar(150) NOT NULL, `employment_status` varchar(50) NOT NULL, `max_load_hours` double precision NOT NULL, `school_id` integer NOT NULL);
--
-- Create model Section
--
CREATE TABLE `SECTION` (`section_id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `section_name` varchar(100) NOT NULL, `grade_level_id` integer NOT NULL, `school_id` integer NOT NULL, `school_year_id` integer NOT NULL, `strand_id` integer NULL, `adviser_teacher_id` integer NULL);
--
-- Create model TeachingLoad
--
CREATE TABLE `TEACHING_LOAD` (`load_id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `is_manual_override` bool NOT NULL, `offering_id` integer NOT NULL, `section_id` integer NOT NULL, `teacher_id` integer NOT NULL);
--
-- Add field track to strand
--
ALTER TABLE `STRAND` ADD COLUMN `track_id` integer NOT NULL , ADD CONSTRAINT `STRAND_track_id_204ebb48_fk_TRACK_track_id` FOREIGN KEY (`track_id`) REFERENCES `TRACK`(`track_id`);
--
-- Create model UserAccount
--
CREATE TABLE `USER_ACCOUNT` (`user_id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `username` varchar(50) NOT NULL UNIQUE, `password_hash` varchar(255) NOT NULL, `school_id` integer NOT NULL);
--
-- Create model TeacherSpecialization
--
CREATE TABLE `TEACHER_SPECIALIZATION` (`specialization_id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `subject_id` integer NOT NULL, `teacher_id` integer NOT NULL);
ALTER TABLE `SUBJECT_OFFERING` ADD CONSTRAINT `SUBJECT_OFFERING_grade_level_id_bf09baac_fk_GRADE_LEV` FOREIGN KEY (`grade_level_id`) REFERENCES `GRADE_LEVEL` (`grade_level_id`);
ALTER TABLE `SUBJECT_OFFERING` ADD CONSTRAINT `SUBJECT_OFFERING_strand_id_1f5275db_fk_STRAND_strand_id` FOREIGN KEY (`strand_id`) REFERENCES `STRAND` (`strand_id`);
ALTER TABLE `SUBJECT_OFFERING` ADD CONSTRAINT `SUBJECT_OFFERING_subject_id_dbe5bbf9_fk_SUBJECT_subject_id` FOREIGN KEY (`subject_id`) REFERENCES `SUBJECT` (`subject_id`);
ALTER TABLE `TEACHER` ADD CONSTRAINT `TEACHER_school_id_0e2620bd_fk_SCHOOL_school_id` FOREIGN KEY (`school_id`) REFERENCES `SCHOOL` (`school_id`);
ALTER TABLE `SECTION` ADD CONSTRAINT `SECTION_grade_level_id_a85069d9_fk_GRADE_LEVEL_grade_level_id` FOREIGN KEY (`grade_level_id`) REFERENCES `GRADE_LEVEL` (`grade_level_id`);
ALTER TABLE `SECTION` ADD CONSTRAINT `SECTION_school_id_4088e3e7_fk_SCHOOL_school_id` FOREIGN KEY (`school_id`) REFERENCES `SCHOOL` (`school_id`);
ALTER TABLE `SECTION` ADD CONSTRAINT `SECTION_school_year_id_dfc52471_fk_SCHOOL_YEAR_school_year_id` FOREIGN KEY (`school_year_id`) REFERENCES `SCHOOL_YEAR` (`school_year_id`);
ALTER TABLE `SECTION` ADD CONSTRAINT `SECTION_strand_id_f5f8db4b_fk_STRAND_strand_id` FOREIGN KEY (`strand_id`) REFERENCES `STRAND` (`strand_id`);
ALTER TABLE `SECTION` ADD CONSTRAINT `SECTION_adviser_teacher_id_48d2004d_fk_TEACHER_teacher_id` FOREIGN KEY (`adviser_teacher_id`) REFERENCES `TEACHER` (`teacher_id`);
ALTER TABLE `TEACHING_LOAD` ADD CONSTRAINT `TEACHING_LOAD_offering_id_def9c2e5_fk_SUBJECT_O` FOREIGN KEY (`offering_id`) REFERENCES `SUBJECT_OFFERING` (`offering_id`);
ALTER TABLE `TEACHING_LOAD` ADD CONSTRAINT `TEACHING_LOAD_section_id_024464f5_fk_SECTION_section_id` FOREIGN KEY (`section_id`) REFERENCES `SECTION` (`section_id`);
ALTER TABLE `TEACHING_LOAD` ADD CONSTRAINT `TEACHING_LOAD_teacher_id_c4b1193b_fk_TEACHER_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `TEACHER` (`teacher_id`);
ALTER TABLE `USER_ACCOUNT` ADD CONSTRAINT `USER_ACCOUNT_school_id_9e069ba5_fk_SCHOOL_school_id` FOREIGN KEY (`school_id`) REFERENCES `SCHOOL` (`school_id`);
ALTER TABLE `TEACHER_SPECIALIZATION` ADD CONSTRAINT `TEACHER_SPECIALIZATION_teacher_id_subject_id_ce396752_uniq` UNIQUE (`teacher_id`, `subject_id`);
ALTER TABLE `TEACHER_SPECIALIZATION` ADD CONSTRAINT `TEACHER_SPECIALIZATION_subject_id_a6391a5c_fk_SUBJECT_subject_id` FOREIGN KEY (`subject_id`) REFERENCES `SUBJECT` (`subject_id`);
ALTER TABLE `TEACHER_SPECIALIZATION` ADD CONSTRAINT `TEACHER_SPECIALIZATION_teacher_id_63616327_fk_TEACHER_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `TEACHER` (`teacher_id`);

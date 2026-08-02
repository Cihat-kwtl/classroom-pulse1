import type { Assessment, AttendanceRecord, Classroom, Score, Student, TeacherSettings } from '../types';

const classes: Classroom[] = [
  { id: 'class-10-a', name: 'Grade 10 · Section A', grade: '10', section: 'A', createdAt: '2026-01-05' },
  { id: 'class-10-b', name: 'Grade 10 · Section B', grade: '10', section: 'B', createdAt: '2026-01-05' },
];

const students: Student[] = [
  { id: 'student-1', name: 'Aarav Patel', studentId: 'CP-001', grade: '10', section: 'A', classId: 'class-10-a', commitment: 94, attendance: 98, status: 'Active', createdAt: '2026-01-05' },
  { id: 'student-2', name: 'Maya Thompson', studentId: 'CP-002', grade: '10', section: 'A', classId: 'class-10-a', commitment: 88, attendance: 95, status: 'Active', createdAt: '2026-01-05' },
  { id: 'student-3', name: 'Liam Chen', studentId: 'CP-003', grade: '10', section: 'A', classId: 'class-10-a', commitment: 73, attendance: 92, status: 'Needs Attention', createdAt: '2026-01-05' },
  { id: 'student-4', name: 'Sofia Garcia', studentId: 'CP-004', grade: '10', section: 'B', classId: 'class-10-b', commitment: 97, attendance: 100, status: 'Active', createdAt: '2026-01-05' },
  { id: 'student-5', name: 'Noah Williams', studentId: 'CP-005', grade: '10', section: 'B', classId: 'class-10-b', commitment: 66, attendance: 84, status: 'Needs Attention', createdAt: '2026-01-05' },
  { id: 'student-6', name: 'Emma Wilson', studentId: 'CP-006', grade: '10', section: 'B', classId: 'class-10-b', commitment: 91, attendance: 96, status: 'Active', createdAt: '2026-01-05' },
  { id: 'student-7', name: 'Oliver Brown', studentId: 'CP-007', grade: '10', section: 'A', classId: 'class-10-a', commitment: 82, attendance: 89, status: 'Active', createdAt: '2026-01-05' },
  { id: 'student-8', name: 'Ava Davis', studentId: 'CP-008', grade: '10', section: 'B', classId: 'class-10-b', commitment: 79, attendance: 91, status: 'Active', createdAt: '2026-01-05' },
];

const assessments: Assessment[] = [
  { id: 'assessment-1', title: 'Quadratic Functions Quiz', type: 'Quiz', date: '2026-07-07', maxMark: 20, createdAt: '2026-07-01' },
  { id: 'assessment-2', title: 'Functions & Transformations', type: 'Homework', date: '2026-07-12', maxMark: 25, createdAt: '2026-07-05' },
  { id: 'assessment-3', title: 'Term 1 Examination', type: 'Exam', date: '2026-07-18', maxMark: 40, createdAt: '2026-07-10' },
  { id: 'assessment-4', title: 'Exponential Models Check-in', type: 'Quiz', date: '2026-07-24', maxMark: 15, createdAt: '2026-07-15' },
];

const scoreValues = [18, 15, 11, 19, 9, 17, 14, 16];
const homeworkValues = [23, 21, 16, 24, 12, 22, 19, 20];
const examValues = [36, 32, 24, 38, 19, 34, 29, 31];
const quizTwoValues = [14, 12, 8, 13, null, 13, 10, 12];
const scores: Score[] = students.flatMap((student, index) => [
  { id: `score-1-${index}`, assessmentId: 'assessment-1', studentId: student.id, score: scoreValues[index], absent: false, excused: false },
  { id: `score-2-${index}`, assessmentId: 'assessment-2', studentId: student.id, score: homeworkValues[index], absent: false, excused: false },
  { id: `score-3-${index}`, assessmentId: 'assessment-3', studentId: student.id, score: examValues[index], absent: false, excused: false },
  { id: `score-4-${index}`, assessmentId: 'assessment-4', studentId: student.id, score: quizTwoValues[index], absent: quizTwoValues[index] === null, excused: false },
]);

const attendanceRecords: AttendanceRecord[] = [
  { id: 'attendance-1-3', studentId: 'student-3', date: '2026-07-15', status: 'Absent', note: 'Family appointment' },
  { id: 'attendance-1-5', studentId: 'student-5', date: '2026-07-15', status: 'Absent' },
  { id: 'attendance-2-5', studentId: 'student-5', date: '2026-07-18', status: 'Excused', note: 'School activity' },
];

export const demoData = { classes, students, assessments, scores, attendanceRecords };
export const demoSettings: TeacherSettings = { gradingMode: 'raw', textSize: 'medium', examWeight: 50, quizWeight: 25, homeworkWeight: 15, commitmentWeight: 5, attendanceWeight: 5 };

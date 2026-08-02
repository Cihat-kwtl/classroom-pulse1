export type AssessmentType = 'Exam' | 'Quiz' | 'Homework';
export type StudentStatus = 'Active' | 'Needs Attention';
export type GradingMode = 'raw' | 'weighted';
export type TextSize = 'small' | 'medium' | 'large';
export type AttendanceStatus = 'Present' | 'Absent' | 'Excused';

export interface Classroom {
  id: string;
  name: string;
  grade: string;
  section: string;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  studentId: string;
  grade: string;
  section: string;
  classId?: string;
  commitment: number;
  attendance: number;
  status: StudentStatus;
  createdAt: string;
}

export interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  date: string;
  maxMark: number;
  createdAt: string;
}

export interface Score {
  id?: string;
  assessmentId: string;
  studentId: string;
  score: number | null;
  absent: boolean;
  excused: boolean;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
  updatedAt?: string;
}

export interface TeacherSettings {
  gradingMode: GradingMode;
  textSize: TextSize;
  examWeight: number;
  quizWeight: number;
  homeworkWeight: number;
  commitmentWeight: number;
  attendanceWeight: number;
}

export interface AuthUser {
  id: string;
  email?: string;
}

export interface StudentMetrics {
  student: Student;
  academicTotal: number;
  examPercentage: number | null;
  quizPercentage: number | null;
  homeworkPercentage: number | null;
  weightedTotal: number;
  completed: number;
  missing: number;
  entered: number;
  total: number;
  trend: { label: string; value: number }[];
}

export interface AssessmentSummary extends Assessment {
  entered: number;
  average: number | null;
  completion: number;
}

export interface Filters {
  from: string;
  to: string;
  type: AssessmentType | 'All';
  section: string;
  studentId: string;
  status: StudentStatus | 'All';
  query?: string;
}

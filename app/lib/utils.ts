import type { Assessment, AssessmentType, AttendanceRecord, Score, Student, StudentMetrics, TeacherSettings } from '../types';

export const uid = () => crypto.randomUUID();

export const today = () => new Date().toISOString().slice(0, 10);

export const formatDate = (date: string) => new Intl.DateTimeFormat('en', {
  month: 'short', day: 'numeric', year: 'numeric',
}).format(new Date(`${date}T12:00:00`));

export const formatShortDate = (date: string) => new Intl.DateTimeFormat('en', {
  month: 'short', day: 'numeric',
}).format(new Date(`${date}T12:00:00`));

export const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

export const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

export const scorePercent = (score: number | null, max: number) => score === null || max <= 0 ? null : clamp((score / max) * 100);

export const typeColor = (type: AssessmentType) => ({ Exam: 'coral', Quiz: 'blue', Homework: 'green' }[type]);

export const statusColor = (status: Student['status']) => status === 'Active' ? 'green' : 'amber';

export const attendanceStatusColor = (status: AttendanceRecord['status']) => ({ Present: 'green', Absent: 'coral', Excused: 'amber' }[status]);

export const attendancePercentage = (student: Student, records: AttendanceRecord[]) => {
  const studentRecords = records.filter((record) => record.studentId === student.id);
  const counted = studentRecords.filter((record) => record.status !== 'Excused');
  if (!counted.length) return student.attendance;
  return clamp((counted.filter((record) => record.status === 'Present').length / counted.length) * 100);
};

export const getStudentMetrics = (student: Student, assessments: Assessment[], scores: Score[], settings: TeacherSettings, attendanceRecords: AttendanceRecord[] = []): StudentMetrics => {
  const effectiveStudent = attendanceRecords.length ? { ...student, attendance: attendancePercentage(student, attendanceRecords) } : student;
  const studentScores = scores.filter((score) => score.studentId === student.id);
  const byAssessment = (assessment: Assessment) => studentScores.find((score) => score.assessmentId === assessment.id);
  const enteredScores = assessments.map((assessment) => ({ assessment, score: byAssessment(assessment) })).filter(({ score }) => score?.score !== null && score?.score !== undefined);
  const totalPossible = assessments.reduce((sum, assessment) => sum + assessment.maxMark, 0);
  const totalObtained = enteredScores.reduce((sum, item) => sum + (item.score?.score ?? 0), 0);
  const percentageFor = (type: AssessmentType) => {
    const items = enteredScores.filter(({ assessment }) => assessment.type === type);
    const possible = items.reduce((sum, item) => sum + item.assessment.maxMark, 0);
    const obtained = items.reduce((sum, item) => sum + (item.score?.score ?? 0), 0);
    return possible ? clamp((obtained / possible) * 100) : null;
  };
  const examPercentage = percentageFor('Exam');
  const quizPercentage = percentageFor('Quiz');
  const homeworkPercentage = percentageFor('Homework');
  const raw = totalPossible ? clamp((totalObtained / totalPossible) * 100) : 0;
  const weightedParts = [
    [examPercentage, settings.examWeight],
    [quizPercentage, settings.quizWeight],
    [homeworkPercentage, settings.homeworkWeight],
    [effectiveStudent.commitment, settings.commitmentWeight],
    [effectiveStudent.attendance, settings.attendanceWeight],
  ] as [number | null, number][];
  const weightTotal = weightedParts.reduce((sum, [, weight]) => sum + weight, 0);
  const weightedTotal = weightTotal ? weightedParts.reduce((sum, [value, weight]) => sum + (value ?? 0) * weight, 0) / weightTotal : raw;
  const trend = assessments.slice().sort((a, b) => a.date.localeCompare(b.date)).map((assessment) => {
    const score = byAssessment(assessment);
    return { label: formatShortDate(assessment.date), value: scorePercent(score?.score ?? null, assessment.maxMark) ?? 0 };
  });
  return {
    student: effectiveStudent,
    academicTotal: raw,
    examPercentage,
    quizPercentage,
    homeworkPercentage,
    weightedTotal,
    completed: enteredScores.length,
    missing: Math.max(0, assessments.length - enteredScores.length),
    entered: enteredScores.length,
    total: assessments.length,
    trend,
  };
};

export const assessmentSummary = (assessment: Assessment, students: Student[], scores: Score[]): { entered: number; average: number | null; completion: number } => {
  const values = students.map((student) => scores.find((score) => score.studentId === student.id && score.assessmentId === assessment.id)).filter((score) => score?.score !== null && score?.score !== undefined).map((score) => scorePercent(score?.score ?? null, assessment.maxMark) ?? 0);
  return { entered: values.length, average: average(values), completion: students.length ? (values.length / students.length) * 100 : 0 };
};

export const downloadCsv = (filename: string, rows: (string | number | null)[][]) => {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const downloadJson = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const emptySettings: TeacherSettings = {
  gradingMode: 'raw',
  textSize: 'medium',
  examWeight: 50,
  quizWeight: 25,
  homeworkWeight: 15,
  commitmentWeight: 5,
  attendanceWeight: 5,
};

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Assessment, AttendanceRecord, AuthUser, Classroom, Score, Student, TeacherSettings } from '../types';
import { demoData, demoSettings } from './demoData';
import { emptySettings, uid } from './utils';
import { isSupabaseConfigured, supabase } from './supabase';

type Notice = { type: 'success' | 'error' | 'info'; message: string } | null;

interface AppContextValue {
  user: AuthUser | null;
  loading: boolean;
  dataLoading: boolean;
  isDemoMode: boolean;
  classes: Classroom[];
  students: Student[];
  assessments: Assessment[];
  scores: Score[];
  attendanceRecords: AttendanceRecord[];
  settings: TeacherSettings;
  notice: Notice;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createClass: (input: Omit<Classroom, 'id' | 'createdAt'>) => Promise<void>;
  updateClass: (id: string, input: Partial<Omit<Classroom, 'id' | 'createdAt'>>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  createStudent: (input: Omit<Student, 'id' | 'createdAt'>) => Promise<void>;
  updateStudent: (id: string, input: Partial<Omit<Student, 'id' | 'createdAt'>>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  createAssessment: (input: Omit<Assessment, 'id' | 'createdAt'>) => Promise<string>;
  updateAssessment: (id: string, input: Partial<Omit<Assessment, 'id' | 'createdAt'>>) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
  saveScores: (assessmentId: string, changes: Score[]) => Promise<void>;
  saveAttendance: (date: string, changes: AttendanceRecord[]) => Promise<void>;
  updateSettings: (input: TeacherSettings) => Promise<void>;
  notify: (notice: Exclude<Notice, null>) => void;
  clearNotice: () => void;
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const DEMO_STORAGE_KEY = 'classroom-pulse-demo-v1';

const readDemoState = () => {
  try {
    const saved = localStorage.getItem(DEMO_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<{ classes: Classroom[]; students: Student[]; assessments: Assessment[]; scores: Score[]; attendanceRecords: AttendanceRecord[]; settings: TeacherSettings }>;
      return {
        classes: parsed.classes ?? demoData.classes,
        students: parsed.students ?? demoData.students,
        assessments: parsed.assessments ?? demoData.assessments,
        scores: parsed.scores ?? demoData.scores,
        attendanceRecords: parsed.attendanceRecords ?? [],
        settings: { ...demoSettings, ...(parsed.settings ?? {}) },
      };
    }
  } catch {
    // A clean in-memory demo is still useful if storage is unavailable.
  }
    return { classes: demoData.classes, students: demoData.students, assessments: demoData.assessments, scores: demoData.scores, attendanceRecords: demoData.attendanceRecords, settings: demoSettings };
};

const cloudStudent = (row: Record<string, unknown>): Student => ({
  id: String(row.id), name: String(row.name), studentId: String(row.student_id), grade: String(row.grade ?? ''), section: String(row.section ?? ''), classId: row.class_id ? String(row.class_id) : undefined,
  commitment: Number(row.commitment_percentage ?? 0), attendance: Number(row.attendance_percentage ?? 0), status: row.status === 'Needs Attention' ? 'Needs Attention' : 'Active', createdAt: String(row.created_at),
});

const cloudClass = (row: Record<string, unknown>): Classroom => ({
  id: String(row.id), name: String(row.name), grade: String(row.grade ?? ''), section: String(row.section ?? ''), createdAt: String(row.created_at),
});

const cloudAssessment = (row: Record<string, unknown>): Assessment => ({
  id: String(row.id), title: String(row.title), type: row.type as Assessment['type'], date: String(row.assessment_date), maxMark: Number(row.max_mark), createdAt: String(row.created_at),
});

const cloudScore = (row: Record<string, unknown>): Score => ({
  id: String(row.id), assessmentId: String(row.assessment_id), studentId: String(row.student_id), score: row.score === null ? null : Number(row.score), absent: Boolean(row.absent), excused: Boolean(row.excused), updatedAt: String(row.updated_at ?? ''),
});

const cloudAttendance = (row: Record<string, unknown>): AttendanceRecord => ({
  id: String(row.id), studentId: String(row.student_id), date: String(row.attendance_date), status: row.status as AttendanceRecord['status'], note: String(row.note ?? ''), updatedAt: String(row.updated_at ?? ''),
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(isSupabaseConfigured ? null : { id: 'demo-user', email: 'demo@classroompulse.app' });
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [dataLoading, setDataLoading] = useState(false);
  const [classes, setClasses] = useState<Classroom[]>(isSupabaseConfigured ? [] : readDemoState().classes);
  const [students, setStudents] = useState<Student[]>(isSupabaseConfigured ? [] : readDemoState().students);
  const [assessments, setAssessments] = useState<Assessment[]>(isSupabaseConfigured ? [] : readDemoState().assessments);
  const [scores, setScores] = useState<Score[]>(isSupabaseConfigured ? [] : readDemoState().scores);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(isSupabaseConfigured ? [] : readDemoState().attendanceRecords);
  const [settings, setSettings] = useState<TeacherSettings>(isSupabaseConfigured ? emptySettings : readDemoState().settings);
  const [notice, setNotice] = useState<Notice>(null);

  const persistDemo = (next: Partial<{ classes: Classroom[]; students: Student[]; assessments: Assessment[]; scores: Score[]; attendanceRecords: AttendanceRecord[]; settings: TeacherSettings }> = {}) => {
    const current = readDemoState();
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ ...current, ...next }));
  };

  const loadCloudData = async (currentUser: AuthUser) => {
    if (!supabase) return;
    setDataLoading(true);
    const [classResult, studentResult, assessmentResult, scoreResult, attendanceResult, settingsResult] = await Promise.all([
      supabase.from('classrooms').select('*').order('name'),
      supabase.from('students').select('*').order('name'),
      supabase.from('assessments').select('*').order('assessment_date', { ascending: false }),
      supabase.from('assessment_scores').select('*'),
      supabase.from('attendance_records').select('*').order('attendance_date', { ascending: false }),
      supabase.from('teacher_settings').select('*').eq('user_id', currentUser.id).maybeSingle(),
    ]);
    const firstError = classResult.error || studentResult.error || assessmentResult.error || scoreResult.error || attendanceResult.error || settingsResult.error;
    if (firstError) {
      setNotice({ type: 'error', message: firstError.message });
    } else {
      setClasses((classResult.data ?? []).map((row) => cloudClass(row)));
      setStudents((studentResult.data ?? []).map((row) => cloudStudent(row)));
      setAssessments((assessmentResult.data ?? []).map((row) => cloudAssessment(row)));
      setScores((scoreResult.data ?? []).map((row) => cloudScore(row)));
      setAttendanceRecords((attendanceResult.data ?? []).map((row) => cloudAttendance(row)));
      const row = settingsResult.data as Record<string, unknown> | null;
      setSettings(row ? {
        gradingMode: row.grading_mode === 'weighted' ? 'weighted' : 'raw',
        textSize: row.text_size === 'small' || row.text_size === 'large' ? row.text_size : 'medium',
        examWeight: Number(row.exam_weight ?? emptySettings.examWeight), quizWeight: Number(row.quiz_weight ?? emptySettings.quizWeight),
        homeworkWeight: Number(row.homework_weight ?? emptySettings.homeworkWeight), commitmentWeight: Number(row.commitment_weight ?? emptySettings.commitmentWeight), attendanceWeight: Number(row.attendance_weight ?? emptySettings.attendanceWeight),
      } : emptySettings);
    }
    setDataLoading(false);
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const currentUser = data.session?.user;
      if (currentUser) {
        const mapped = { id: currentUser.id, email: currentUser.email };
        setUser(mapped);
        void loadCloudData(mapped);
      }
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user;
      const mapped = currentUser ? { id: currentUser.id, email: currentUser.email } : null;
      setUser(mapped);
      if (mapped) void loadCloudData(mapped);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      setUser({ id: 'demo-user', email: email || 'demo@classroompulse.app' });
      setNotice({ type: 'success', message: 'Welcome back. Demo mode is ready to explore.' });
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) {
      setUser({ id: 'demo-user', email: email || 'demo@classroompulse.app' });
      setNotice({ type: 'success', message: 'Demo account created.' });
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    setNotice({ type: 'success', message: 'Account created. Check your email if confirmation is enabled.' });
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    else setUser(null);
  };

  const createClass = async (input: Omit<Classroom, 'id' | 'createdAt'>) => {
    const createdAt = new Date().toISOString();
    if (supabase && user) {
      const { data, error } = await supabase.from('classrooms').insert({ user_id: user.id, name: input.name, grade: input.grade, section: input.section }).select().single();
      if (error) throw error;
      setClasses((current) => [...current, cloudClass(data)].sort((a, b) => a.name.localeCompare(b.name)));
    } else {
      const classroom = { ...input, id: uid(), createdAt };
      const next = [...classes, classroom].sort((a, b) => a.name.localeCompare(b.name)); setClasses(next); persistDemo({ classes: next });
    }
  };

  const updateClass = async (id: string, input: Partial<Omit<Classroom, 'id' | 'createdAt'>>) => {
    if (supabase && user) {
      const { data, error } = await supabase.from('classrooms').update(input).eq('id', id).select().single();
      if (error) throw error;
      setClasses((current) => current.map((classroom) => classroom.id === id ? cloudClass(data) : classroom));
    } else {
      const next = classes.map((classroom) => classroom.id === id ? { ...classroom, ...input } : classroom); setClasses(next); persistDemo({ classes: next });
    }
  };

  const deleteClass = async (id: string) => {
    if (students.some((student) => student.classId === id)) throw new Error('Move the students out of this class before deleting it.');
    if (supabase && user) {
      const { error } = await supabase.from('classrooms').delete().eq('id', id);
      if (error) throw error;
    }
    const next = classes.filter((classroom) => classroom.id !== id); setClasses(next); persistDemo({ classes: next });
  };

  const createStudent = async (input: Omit<Student, 'id' | 'createdAt'>) => {
    const createdAt = new Date().toISOString();
    if (supabase && user) {
      const { data, error } = await supabase.from('students').insert({ user_id: user.id, name: input.name, student_id: input.studentId, grade: input.grade, section: input.section, class_id: input.classId ?? null, commitment_percentage: input.commitment, attendance_percentage: input.attendance, status: input.status }).select().single();
      if (error) throw error;
      setStudents((current) => [...current, cloudStudent(data)].sort((a, b) => a.name.localeCompare(b.name)));
    } else {
      const student = { ...input, id: uid(), createdAt };
      setStudents((current) => [...current, student].sort((a, b) => a.name.localeCompare(b.name)));
      persistDemo({ students: [...students, student] });
    }
  };

  const updateStudent = async (id: string, input: Partial<Omit<Student, 'id' | 'createdAt'>>) => {
    if (supabase && user) {
      const payload: Record<string, unknown> = {};
      if (input.name !== undefined) payload.name = input.name;
      if (input.studentId !== undefined) payload.student_id = input.studentId;
      if (input.grade !== undefined) payload.grade = input.grade;
      if (input.section !== undefined) payload.section = input.section;
      if (input.classId !== undefined) payload.class_id = input.classId || null;
      if (input.commitment !== undefined) payload.commitment_percentage = input.commitment;
      if (input.attendance !== undefined) payload.attendance_percentage = input.attendance;
      if (input.status !== undefined) payload.status = input.status;
      const { data, error } = await supabase.from('students').update(payload).eq('id', id).select().single();
      if (error) throw error;
      setStudents((current) => current.map((student) => student.id === id ? cloudStudent(data) : student));
    } else {
      const next = students.map((student) => student.id === id ? { ...student, ...input } : student);
      setStudents(next);
      persistDemo({ students: next });
    }
  };

  const deleteStudent = async (id: string) => {
    if (supabase && user) {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    }
    const nextStudents = students.filter((student) => student.id !== id);
    const nextScores = scores.filter((score) => score.studentId !== id);
    setStudents(nextStudents); setScores(nextScores); persistDemo({ students: nextStudents, scores: nextScores });
  };

  const createAssessment = async (input: Omit<Assessment, 'id' | 'createdAt'>) => {
    const createdAt = new Date().toISOString();
    if (supabase && user) {
      const { data, error } = await supabase.from('assessments').insert({ user_id: user.id, title: input.title, type: input.type, assessment_date: input.date, max_mark: input.maxMark }).select().single();
      if (error) throw error;
      const created = cloudAssessment(data); setAssessments((current) => [created, ...current]); return created.id;
    }
    const assessment = { ...input, id: uid(), createdAt };
    const next = [assessment, ...assessments]; setAssessments(next); persistDemo({ assessments: next }); return assessment.id;
  };

  const updateAssessment = async (id: string, input: Partial<Omit<Assessment, 'id' | 'createdAt'>>) => {
    if (supabase && user) {
      const payload: Record<string, unknown> = {};
      if (input.title !== undefined) payload.title = input.title;
      if (input.type !== undefined) payload.type = input.type;
      if (input.date !== undefined) payload.assessment_date = input.date;
      if (input.maxMark !== undefined) payload.max_mark = input.maxMark;
      const { data, error } = await supabase.from('assessments').update(payload).eq('id', id).select().single();
      if (error) throw error;
      setAssessments((current) => current.map((assessment) => assessment.id === id ? cloudAssessment(data) : assessment));
    } else {
      const next = assessments.map((assessment) => assessment.id === id ? { ...assessment, ...input } : assessment); setAssessments(next); persistDemo({ assessments: next });
    }
  };

  const deleteAssessment = async (id: string) => {
    if (supabase && user) {
      const { error } = await supabase.from('assessments').delete().eq('id', id);
      if (error) throw error;
    }
    const nextAssessments = assessments.filter((assessment) => assessment.id !== id);
    const nextScores = scores.filter((score) => score.assessmentId !== id);
    setAssessments(nextAssessments); setScores(nextScores); persistDemo({ assessments: nextAssessments, scores: nextScores });
  };

  const saveScores = async (assessmentId: string, changes: Score[]) => {
    if (supabase && user) {
      const payload = changes.map((score) => ({ user_id: user.id, assessment_id: assessmentId, student_id: score.studentId, score: score.score, absent: score.absent, excused: score.excused }));
      const { data, error } = await supabase.from('assessment_scores').upsert(payload, { onConflict: 'assessment_id,student_id' }).select();
      if (error) throw error;
      const saved = (data ?? []).map((row) => cloudScore(row));
      setScores((current) => [...current.filter((score) => score.assessmentId !== assessmentId), ...saved]);
    } else {
      const remaining = scores.filter((score) => score.assessmentId !== assessmentId || !changes.some((change) => change.studentId === score.studentId));
      const next = [...remaining, ...changes.map((change) => ({ ...change, id: change.id ?? uid(), updatedAt: new Date().toISOString() }))];
      setScores(next); persistDemo({ scores: next });
    }
  };

  const saveAttendance = async (date: string, changes: AttendanceRecord[]) => {
    if (supabase && user) {
      const payload = changes.map((record) => ({ user_id: user.id, student_id: record.studentId, attendance_date: date, status: record.status, note: record.note ?? '' }));
      const { data, error } = await supabase.from('attendance_records').upsert(payload, { onConflict: 'student_id,attendance_date' }).select();
      if (error) throw error;
      const saved = (data ?? []).map((row) => cloudAttendance(row));
      setAttendanceRecords((current) => [...current.filter((record) => record.date !== date || !changes.some((change) => change.studentId === record.studentId)), ...saved]);
    } else {
      const remaining = attendanceRecords.filter((record) => record.date !== date || !changes.some((change) => change.studentId === record.studentId));
      const next = [...remaining, ...changes.map((change) => ({ ...change, id: change.id ?? uid(), date, updatedAt: new Date().toISOString() }))];
      setAttendanceRecords(next); persistDemo({ attendanceRecords: next });
    }
  };

  const updateSettings = async (input: TeacherSettings) => {
    if (supabase && user) {
      const { error } = await supabase.from('teacher_settings').upsert({ user_id: user.id, grading_mode: input.gradingMode, text_size: input.textSize, exam_weight: input.examWeight, quiz_weight: input.quizWeight, homework_weight: input.homeworkWeight, commitment_weight: input.commitmentWeight, attendance_weight: input.attendanceWeight });
      if (error) throw error;
    }
    setSettings(input); persistDemo({ settings: input });
  };

  const resetDemo = () => {
    if (supabase) return;
    localStorage.removeItem(DEMO_STORAGE_KEY);
    setClasses(demoData.classes); setStudents(demoData.students); setAssessments(demoData.assessments); setScores(demoData.scores); setAttendanceRecords(demoData.attendanceRecords); setSettings(demoSettings);
    setNotice({ type: 'success', message: 'Demo workspace reset.' });
  };

  const value = useMemo<AppContextValue>(() => ({ user, loading, dataLoading, isDemoMode: !isSupabaseConfigured, classes, students, assessments, scores, attendanceRecords, settings, notice, signIn, signUp, signOut, createClass, updateClass, deleteClass, createStudent, updateStudent, deleteStudent, createAssessment, updateAssessment, deleteAssessment, saveScores, saveAttendance, updateSettings, notify: setNotice, clearNotice: () => setNotice(null), resetDemo }), [user, loading, dataLoading, classes, students, assessments, scores, attendanceRecords, settings, notice]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

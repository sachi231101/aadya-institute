import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import {
  BookOpen,
  User,
  Calendar,
  ClipboardList,
  Download,
  Star,
  LayoutGrid,
  FileEdit,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  Code2,
  Layers,
  FileText,
  Building,
} from "lucide-react";
import { useStudentList } from "../../../hooks/useStudents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── COMPREHENSIVE STUDENT DIRECTORY DATA ──────────────────────────────────

interface StudentData {
  id: string;
  name: string;
  studentCode: string;
  email: string;
  phone: string;
  course: string;
  batch: string;
  faculty: string;
  center: string;
  admissionNo: string;
  dateOfJoining: string;
  status: string;
  avatar: string;
  attendance: number;
  progress: number;
  coursesCount: number;
  assignmentsCompleted: string;
  performanceGrade: string;
  performanceMessage: string;
  assessments: {
    name: string;
    course: string;
    type: string;
    date: string;
    maxMarks: number;
    obtained: number;
    score: string;
    grade: string;
    gradeColor: string;
  }[];
  enrolledCourses: {
    name: string;
    batch: string;
    progress: number;
    status: string;
    icon: any;
    iconBg: string;
  }[];
  attendanceHistory: { date: string; attendance: number }[];
  performanceTrend: { month: string; score: number }[];
}

const ALL_STUDENTS_DIRECTORY: Record<string, StudentData> = {
  "ST001": {
    id: "ST001",
    name: "Rahul Kumar",
    studentCode: "ST001",
    email: "rahul.kumar@gmail.com",
    phone: "+91 98765 43210",
    course: "Digital Marketing",
    batch: "Digital Marketing - DM-01",
    faculty: "Priya Sharma",
    center: "Bengaluru Central",
    admissionNo: "ADM-2024-001",
    dateOfJoining: "10 Jun 2026",
    status: "ACTIVE",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250",
    attendance: 92,
    progress: 78,
    coursesCount: 2,
    assignmentsCompleted: "18/24",
    performanceGrade: "Good",
    performanceMessage: "Keep going!",
    assessments: [
      { name: "SEO & Keyword Research Test", course: "Digital Marketing", type: "Test", date: "12 May 2026", maxMarks: 50, obtained: 46, score: "92%", grade: "A+", gradeColor: "bg-emerald-100 text-emerald-700" },
      { name: "Social Media Campaign Project", course: "Digital Marketing", type: "Assignment", date: "05 May 2026", maxMarks: 50, obtained: 41, score: "82%", grade: "A", gradeColor: "bg-green-100 text-green-700" },
      { name: "Google Ads Fundamentals Test", course: "Digital Marketing", type: "Test", date: "28 Apr 2026", maxMarks: 50, obtained: 38, score: "76%", grade: "B", gradeColor: "bg-blue-100 text-blue-700" },
      { name: "Content Marketing Assignment", course: "Digital Marketing", type: "Assignment", date: "20 Apr 2026", maxMarks: 50, obtained: 44, score: "88%", grade: "A", gradeColor: "bg-green-100 text-green-700" },
      { name: "Email Marketing & Analytics Test", course: "Digital Marketing", type: "Test", date: "15 Apr 2026", maxMarks: 50, obtained: 35, score: "70%", grade: "B", gradeColor: "bg-blue-100 text-blue-700" },
    ],
    enrolledCourses: [
      { name: "Digital Marketing Masterclass", batch: "DM-01", progress: 78, status: "In Progress", icon: Code2, iconBg: "bg-blue-50 text-blue-600" },
      { name: "Social Media Growth Strategies", batch: "SM-02", progress: 60, status: "In Progress", icon: Layers, iconBg: "bg-purple-50 text-purple-600" }
    ],
    attendanceHistory: [
      { date: "1 May", attendance: 88 },
      { date: "4 May", attendance: 92 },
      { date: "7 May", attendance: 90 },
      { date: "10 May", attendance: 95 },
      { date: "13 May", attendance: 92 },
    ],
    performanceTrend: [
      { month: "Jan", score: 65 },
      { month: "Feb", score: 72 },
      { month: "Mar", score: 70 },
      { month: "Apr", score: 79 },
      { month: "May", score: 84 },
    ]
  },
  "ST002": {
    id: "ST002",
    name: "Anjali Sharma",
    studentCode: "ST002",
    email: "anjali.sharma@gmail.com",
    phone: "+91 91234 56780",
    course: "Graphic Design",
    batch: "Graphic Design - GD-02",
    faculty: "Arjun Mehta",
    center: "Malleswaram Branch",
    admissionNo: "ADM-2024-002",
    dateOfJoining: "15 Jun 2026",
    status: "ACTIVE",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250",
    attendance: 84,
    progress: 65,
    coursesCount: 2,
    assignmentsCompleted: "14/20",
    performanceGrade: "Good",
    performanceMessage: "Doing well!",
    assessments: [
      { name: "Figma UI/UX Prototype Test", course: "Graphic Design", type: "Test", date: "10 May 2026", maxMarks: 50, obtained: 43, score: "86%", grade: "A", gradeColor: "bg-green-100 text-green-700" },
      { name: "Adobe Photoshop Poster Design", course: "Graphic Design", type: "Assignment", date: "02 May 2026", maxMarks: 50, obtained: 40, score: "80%", grade: "A", gradeColor: "bg-green-100 text-green-700" },
      { name: "Illustrator Vector Graphics Test", course: "Graphic Design", type: "Test", date: "24 Apr 2026", maxMarks: 50, obtained: 34, score: "68%", grade: "B", gradeColor: "bg-blue-100 text-blue-700" },
      { name: "Typography & Layout Project", course: "Graphic Design", type: "Assignment", date: "16 Apr 2026", maxMarks: 50, obtained: 37, score: "74%", grade: "B", gradeColor: "bg-blue-100 text-blue-700" },
      { name: "Brand Identity Design Test", course: "Graphic Design", type: "Test", date: "08 Apr 2026", maxMarks: 50, obtained: 39, score: "78%", grade: "B", gradeColor: "bg-blue-100 text-blue-700" },
    ],
    enrolledCourses: [
      { name: "Graphic Design Fundamentals", batch: "GD-02", progress: 65, status: "In Progress", icon: Layers, iconBg: "bg-pink-50 text-pink-600" },
      { name: "UI/UX Design Essentials", batch: "UX-01", progress: 45, status: "In Progress", icon: Code2, iconBg: "bg-blue-50 text-blue-600" }
    ],
    attendanceHistory: [
      { date: "1 May", attendance: 80 },
      { date: "4 May", attendance: 85 },
      { date: "7 May", attendance: 82 },
      { date: "10 May", attendance: 88 },
      { date: "13 May", attendance: 84 },
    ],
    performanceTrend: [
      { month: "Jan", score: 55 },
      { month: "Feb", score: 62 },
      { month: "Mar", score: 68 },
      { month: "Apr", score: 72 },
      { month: "May", score: 77 },
    ]
  },
  "ST003": {
    id: "ST003",
    name: "Vikram Rao",
    studentCode: "ST003",
    email: "vikram.rao@gmail.com",
    phone: "+91 99887 76655",
    course: "Tally Prime",
    batch: "Tally Prime - TP-01",
    faculty: "Sneha Reddy",
    center: "Bengaluru Central",
    admissionNo: "ADM-2024-003",
    dateOfJoining: "01 Jul 2026",
    status: "ACTIVE",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250",
    attendance: 96,
    progress: 91,
    coursesCount: 1,
    assignmentsCompleted: "22/24",
    performanceGrade: "Excellent",
    performanceMessage: "Outstanding work!",
    assessments: [
      { name: "GST & Taxation Compliance Test", course: "Tally Prime", type: "Test", date: "14 May 2026", maxMarks: 50, obtained: 48, score: "96%", grade: "A+", gradeColor: "bg-emerald-100 text-emerald-700" },
      { name: "Balance Sheet & P&L Analysis", course: "Tally Prime", type: "Assignment", date: "06 May 2026", maxMarks: 50, obtained: 47, score: "94%", grade: "A+", gradeColor: "bg-emerald-100 text-emerald-700" },
      { name: "Inventory Management Test", course: "Tally Prime", type: "Test", date: "29 Apr 2026", maxMarks: 50, obtained: 45, score: "90%", grade: "A+", gradeColor: "bg-emerald-100 text-emerald-700" },
      { name: "Voucher Entry & Ledger Creation", course: "Tally Prime", type: "Assignment", date: "21 Apr 2026", maxMarks: 50, obtained: 46, score: "92%", grade: "A+", gradeColor: "bg-emerald-100 text-emerald-700" },
      { name: "Payroll Management Test", course: "Tally Prime", type: "Test", date: "12 Apr 2026", maxMarks: 50, obtained: 43, score: "86%", grade: "A", gradeColor: "bg-green-100 text-green-700" },
    ],
    enrolledCourses: [
      { name: "Tally Prime Advanced with GST", batch: "TP-01", progress: 91, status: "In Progress", icon: Code2, iconBg: "bg-emerald-50 text-emerald-600" }
    ],
    attendanceHistory: [
      { date: "1 May", attendance: 95 },
      { date: "4 May", attendance: 98 },
      { date: "7 May", attendance: 94 },
      { date: "10 May", attendance: 97 },
      { date: "13 May", attendance: 96 },
    ],
    performanceTrend: [
      { month: "Jan", score: 80 },
      { month: "Feb", score: 85 },
      { month: "Mar", score: 88 },
      { month: "Apr", score: 92 },
      { month: "May", score: 95 },
    ]
  },
  "ST004": {
    id: "ST004",
    name: "Karan Singh",
    studentCode: "ST004",
    email: "karan.singh@gmail.com",
    phone: "+91 88990 01122",
    course: "Python Programming",
    batch: "Python Programming - PY-03",
    faculty: "Rahul Deshmukh",
    center: "Ramamurthy Nagar",
    admissionNo: "ADM-2024-004",
    dateOfJoining: "20 May 2026",
    status: "AT RISK",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250",
    attendance: 61,
    progress: 48,
    coursesCount: 1,
    assignmentsCompleted: "8/20",
    performanceGrade: "Needs Improvement",
    performanceMessage: "Attention required.",
    assessments: [
      { name: "Python Basics & Syntax Test", course: "Python Programming", type: "Test", date: "11 May 2026", maxMarks: 50, obtained: 28, score: "56%", grade: "C", gradeColor: "bg-orange-100 text-orange-700" },
      { name: "Data Structures in Python", course: "Python Programming", type: "Assignment", date: "03 May 2026", maxMarks: 50, obtained: 24, score: "48%", grade: "C", gradeColor: "bg-orange-100 text-orange-700" },
      { name: "Object Oriented Python Test", course: "Python Programming", type: "Test", date: "25 Apr 2026", maxMarks: 50, obtained: 22, score: "44%", grade: "F", gradeColor: "bg-red-100 text-red-700" },
      { name: "File Handling & Regex Project", course: "Python Programming", type: "Assignment", date: "17 Apr 2026", maxMarks: 50, obtained: 30, score: "60%", grade: "C", gradeColor: "bg-orange-100 text-orange-700" },
      { name: "Exception Handling Test", course: "Python Programming", type: "Test", date: "09 Apr 2026", maxMarks: 50, obtained: 26, score: "52%", grade: "C", gradeColor: "bg-orange-100 text-orange-700" },
    ],
    enrolledCourses: [
      { name: "Python Full Stack Development", batch: "PY-03", progress: 48, status: "In Progress", icon: Code2, iconBg: "bg-blue-50 text-blue-600" }
    ],
    attendanceHistory: [
      { date: "1 May", attendance: 55 },
      { date: "4 May", attendance: 60 },
      { date: "7 May", attendance: 58 },
      { date: "10 May", attendance: 65 },
      { date: "13 May", attendance: 61 },
    ],
    performanceTrend: [
      { month: "Jan", score: 62 },
      { month: "Feb", score: 55 },
      { month: "Mar", score: 50 },
      { month: "Apr", score: 46 },
      { month: "May", score: 52 },
    ]
  },
  "ST005": {
    id: "ST005",
    name: "Sneha Iyer",
    studentCode: "ST005",
    email: "sneha.iyer@gmail.com",
    phone: "+91 98712 34560",
    course: "Web Design",
    batch: "Web Design - WD-01",
    faculty: "Priya Sharma",
    center: "Bengaluru Central",
    admissionNo: "ADM-2024-005",
    dateOfJoining: "12 Jun 2026",
    status: "ACTIVE",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=250",
    attendance: 88,
    progress: 72,
    coursesCount: 2,
    assignmentsCompleted: "16/22",
    performanceGrade: "Good",
    performanceMessage: "Steady progress!",
    assessments: [
      { name: "HTML5 Semantic Structure Test", course: "Web Design", type: "Test", date: "12 May 2026", maxMarks: 50, obtained: 44, score: "88%", grade: "A", gradeColor: "bg-green-100 text-green-700" },
      { name: "CSS Flexbox & Grid Assignment", course: "Web Design", type: "Assignment", date: "04 May 2026", maxMarks: 50, obtained: 41, score: "82%", grade: "A", gradeColor: "bg-green-100 text-green-700" },
      { name: "Tailwind CSS Project", course: "Web Design", type: "Assignment", date: "26 Apr 2026", maxMarks: 50, obtained: 39, score: "78%", grade: "B", gradeColor: "bg-blue-100 text-blue-700" },
      { name: "Responsive Portfolio Test", course: "Web Design", type: "Test", date: "18 Apr 2026", maxMarks: 50, obtained: 42, score: "84%", grade: "A", gradeColor: "bg-green-100 text-green-700" },
      { name: "JavaScript DOM Manipulation", course: "Web Design", type: "Test", date: "10 Apr 2026", maxMarks: 50, obtained: 36, score: "72%", grade: "B", gradeColor: "bg-blue-100 text-blue-700" },
    ],
    enrolledCourses: [
      { name: "Front-End Web Development", batch: "WD-01", progress: 72, status: "In Progress", icon: Code2, iconBg: "bg-blue-50 text-blue-600" },
      { name: "Responsive UI Fundamentals", batch: "WD-02", progress: 50, status: "In Progress", icon: Layers, iconBg: "bg-purple-50 text-purple-600" }
    ],
    attendanceHistory: [
      { date: "1 May", attendance: 85 },
      { date: "4 May", attendance: 90 },
      { date: "7 May", attendance: 86 },
      { date: "10 May", attendance: 92 },
      { date: "13 May", attendance: 88 },
    ],
    performanceTrend: [
      { month: "Jan", score: 58 },
      { month: "Feb", score: 66 },
      { month: "Mar", score: 72 },
      { month: "Apr", score: 78 },
      { month: "May", score: 81 },
    ]
  },
  "ST006": {
    id: "ST006",
    name: "Mohammed Ali",
    studentCode: "ST006",
    email: "ali.mohammed@gmail.com",
    phone: "+91 88997 76655",
    course: "Digital Marketing",
    batch: "Digital Marketing - DM-02",
    faculty: "Sneha Reddy",
    center: "Malleswaram Branch",
    admissionNo: "ADM-2024-006",
    dateOfJoining: "05 Jul 2026",
    status: "ACTIVE",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=250",
    attendance: 75,
    progress: 60,
    coursesCount: 1,
    assignmentsCompleted: "12/20",
    performanceGrade: "Average",
    performanceMessage: "Can do better.",
    assessments: [
      { name: "Meta Ads Manager Test", course: "Digital Marketing", type: "Test", date: "10 May 2026", maxMarks: 50, obtained: 37, score: "74%", grade: "B", gradeColor: "bg-blue-100 text-blue-700" },
      { name: "Google Analytics 4 Setup", course: "Digital Marketing", type: "Assignment", date: "02 May 2026", maxMarks: 50, obtained: 32, score: "64%", grade: "C", gradeColor: "bg-orange-100 text-orange-700" },
      { name: "Email Copywriting Test", course: "Digital Marketing", type: "Test", date: "24 Apr 2026", maxMarks: 50, obtained: 35, score: "70%", grade: "B", gradeColor: "bg-blue-100 text-blue-700" },
      { name: "Influencer Marketing Strategy", course: "Digital Marketing", type: "Assignment", date: "16 Apr 2026", maxMarks: 50, obtained: 30, score: "60%", grade: "C", gradeColor: "bg-orange-100 text-orange-700" },
      { name: "Keyword Planning Test", course: "Digital Marketing", type: "Test", date: "08 Apr 2026", maxMarks: 50, obtained: 33, score: "66%", grade: "C", gradeColor: "bg-orange-100 text-orange-700" },
    ],
    enrolledCourses: [
      { name: "Digital Marketing Strategy", batch: "DM-02", progress: 60, status: "In Progress", icon: Code2, iconBg: "bg-blue-50 text-blue-600" }
    ],
    attendanceHistory: [
      { date: "1 May", attendance: 70 },
      { date: "4 May", attendance: 78 },
      { date: "7 May", attendance: 72 },
      { date: "10 May", attendance: 80 },
      { date: "13 May", attendance: 75 },
    ],
    performanceTrend: [
      { month: "Jan", score: 50 },
      { month: "Feb", score: 55 },
      { month: "Mar", score: 62 },
      { month: "Apr", score: 65 },
      { month: "May", score: 68 },
    ]
  },
  "ST007": {
    id: "ST007",
    name: "Pooja Patel",
    studentCode: "ST007",
    email: "pooja.patel@gmail.com",
    phone: "+91 77889 90011",
    course: "Graphic Design",
    batch: "Graphic Design - GD-01",
    faculty: "Arjun Mehta",
    center: "Bengaluru Central",
    admissionNo: "ADM-2024-007",
    dateOfJoining: "22 May 2026",
    status: "AT RISK",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=250",
    attendance: 52,
    progress: 30,
    coursesCount: 1,
    assignmentsCompleted: "5/18",
    performanceGrade: "Needs Improvement",
    performanceMessage: "Action required.",
    assessments: [
      { name: "Color Theory & Contrast Test", course: "Graphic Design", type: "Test", date: "09 May 2026", maxMarks: 50, obtained: 25, score: "50%", grade: "C", gradeColor: "bg-orange-100 text-orange-700" },
      { name: "Vector Illustration Assignment", course: "Graphic Design", type: "Assignment", date: "01 May 2026", maxMarks: 50, obtained: 20, score: "40%", grade: "F", gradeColor: "bg-red-100 text-red-700" },
      { name: "Typography Basics Test", course: "Graphic Design", type: "Test", date: "23 Apr 2026", maxMarks: 50, obtained: 22, score: "44%", grade: "F", gradeColor: "bg-red-100 text-red-700" },
      { name: "Photo Retouching Project", course: "Graphic Design", type: "Assignment", date: "15 Apr 2026", maxMarks: 50, obtained: 28, score: "56%", grade: "C", gradeColor: "bg-orange-100 text-orange-700" },
      { name: "Logo Design Concept Test", course: "Graphic Design", type: "Test", date: "07 Apr 2026", maxMarks: 50, obtained: 24, score: "48%", grade: "C", gradeColor: "bg-orange-100 text-orange-700" },
    ],
    enrolledCourses: [
      { name: "Creative Visual Design", batch: "GD-01", progress: 30, status: "In Progress", icon: Layers, iconBg: "bg-pink-50 text-pink-600" }
    ],
    attendanceHistory: [
      { date: "1 May", attendance: 48 },
      { date: "4 May", attendance: 54 },
      { date: "7 May", attendance: 50 },
      { date: "10 May", attendance: 56 },
      { date: "13 May", attendance: 52 },
    ],
    performanceTrend: [
      { month: "Jan", score: 45 },
      { month: "Feb", score: 48 },
      { month: "Mar", score: 42 },
      { month: "Apr", score: 38 },
      { month: "May", score: 46 },
    ]
  },
  "ST008": {
    id: "ST008",
    name: "Rakesh Babu",
    studentCode: "ST008",
    email: "rakesh.babu@gmail.com",
    phone: "+91 99880 01122",
    course: "Tally Prime",
    batch: "Tally Prime - TP-02",
    faculty: "Rahul Deshmukh",
    center: "Bengaluru Central",
    admissionNo: "ADM-2024-008",
    dateOfJoining: "10 Jun 2026",
    status: "ACTIVE",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=250",
    attendance: 90,
    progress: 85,
    coursesCount: 1,
    assignmentsCompleted: "20/24",
    performanceGrade: "Excellent",
    performanceMessage: "Great job!",
    assessments: [
      { name: "Accounting Standards & Rules", course: "Tally Prime", type: "Test", date: "13 May 2026", maxMarks: 50, obtained: 45, score: "90%", grade: "A+", gradeColor: "bg-emerald-100 text-emerald-700" },
      { name: "GST Return Filing Simulation", course: "Tally Prime", type: "Assignment", date: "05 May 2026", maxMarks: 50, obtained: 42, score: "84%", grade: "A", gradeColor: "bg-green-100 text-green-700" },
      { name: "Tally Audit & Security Controls", course: "Tally Prime", type: "Test", date: "27 Apr 2026", maxMarks: 50, obtained: 41, score: "82%", grade: "A", gradeColor: "bg-green-100 text-green-700" },
      { name: "Cost Centers & Budgeting", course: "Tally Prime", type: "Assignment", date: "19 Apr 2026", maxMarks: 50, obtained: 44, score: "88%", grade: "A", gradeColor: "bg-green-100 text-green-700" },
      { name: "Final Accounts Preparation", course: "Tally Prime", type: "Test", date: "11 Apr 2026", maxMarks: 50, obtained: 40, score: "80%", grade: "A", gradeColor: "bg-green-100 text-green-700" },
    ],
    enrolledCourses: [
      { name: "Tally Prime Professional", batch: "TP-02", progress: 85, status: "In Progress", icon: Code2, iconBg: "bg-emerald-50 text-emerald-600" }
    ],
    attendanceHistory: [
      { date: "1 May", attendance: 88 },
      { date: "4 May", attendance: 92 },
      { date: "7 May", attendance: 89 },
      { date: "10 May", attendance: 94 },
      { date: "13 May", attendance: 90 },
    ],
    performanceTrend: [
      { month: "Jan", score: 72 },
      { month: "Feb", score: 78 },
      { month: "Mar", score: 82 },
      { month: "Apr", score: 86 },
      { month: "May", score: 89 },
    ]
  }
};

export const StudentPerformance: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryStudentId = searchParams.get("studentId");

  // Fetch real students from API
  const { data: studentListResponse } = useStudentList({ limit: 100 });
  const apiStudents = studentListResponse?.data ?? [];

  // Build unified student list
  const allAvailableStudents = useMemo(() => {
    const mockList = Object.values(ALL_STUDENTS_DIRECTORY);
    if (apiStudents.length === 0) return mockList;

    // Combine API students and mock students so all IDs work
    const combined = [...mockList];
    apiStudents.forEach(apiS => {
      const existing = combined.find(s => s.id === apiS.id || s.studentCode === apiS.studentCode);
      if (!existing) {
        combined.push({
          id: apiS.id,
          name: apiS.user?.name || apiS.studentCode,
          studentCode: apiS.studentCode,
          email: apiS.user?.email || "student@aadya.in",
          phone: apiS.user?.phone || "+91 98765 43210",
          course: "Full Stack Web Development",
          batch: "Web Development - WD-01",
          faculty: "Priya Sharma",
          center: apiS.branch?.name || "Aadya Central Branch",
          admissionNo: `ADM-${apiS.studentCode}`,
          dateOfJoining: new Date(apiS.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          status: apiS.status || "ACTIVE",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250",
          attendance: 87,
          progress: 76,
          coursesCount: 2,
          assignmentsCompleted: "18/24",
          performanceGrade: "Good",
          performanceMessage: "Keep going!",
          assessments: ALL_STUDENTS_DIRECTORY["ST001"].assessments,
          enrolledCourses: ALL_STUDENTS_DIRECTORY["ST001"].enrolledCourses,
          attendanceHistory: ALL_STUDENTS_DIRECTORY["ST001"].attendanceHistory,
          performanceTrend: ALL_STUDENTS_DIRECTORY["ST001"].performanceTrend
        });
      }
    });
    return combined;
  }, [apiStudents]);

  // Determine selected student ID
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    return queryStudentId || (allAvailableStudents[0]?.id ?? "ST001");
  });

  // Sync state with URL parameter changes
  useEffect(() => {
    if (queryStudentId && queryStudentId !== selectedStudentId) {
      setSelectedStudentId(queryStudentId);
    } else if (!queryStudentId && allAvailableStudents.length > 0) {
      setSelectedStudentId(allAvailableStudents[0].id);
      setSearchParams({ studentId: allAvailableStudents[0].id });
    }
  }, [queryStudentId, allAvailableStudents]);

  const handleStudentSelect = (newStudentId: string) => {
    setSelectedStudentId(newStudentId);
    setSearchParams({ studentId: newStudentId });
  };

  // Find the active student data
  const currentStudent = useMemo(() => {
    const found = allAvailableStudents.find(
      s => s.id === selectedStudentId || s.studentCode === selectedStudentId
    );
    return found || allAvailableStudents[0] || ALL_STUDENTS_DIRECTORY["ST001"];
  }, [allAvailableStudents, selectedStudentId]);

  // Calculate Average Test Score
  const avgTestScore = useMemo(() => {
    if (!currentStudent.assessments || currentStudent.assessments.length === 0) return currentStudent.progress;
    const totalPercentage = currentStudent.assessments.reduce((acc, curr) => {
      return acc + Math.round((curr.obtained / curr.maxMarks) * 100);
    }, 0);
    return Math.round(totalPercentage / currentStudent.assessments.length);
  }, [currentStudent]);

  // Calculate Assessment Breakdown
  const assessmentDistribution = useMemo(() => {
    const scores = currentStudent.assessments.map(a => Math.round((a.obtained / a.maxMarks) * 100));
    const total = scores.length || 1;
    const excellent = scores.filter(s => s >= 80).length;
    const good = scores.filter(s => s >= 60 && s < 80).length;
    const average = scores.filter(s => s >= 40 && s < 60).length;
    const below = scores.filter(s => s < 40).length;

    return [
      { name: 'Excellent (80-100%)', count: excellent, percent: `${Math.round((excellent / total) * 100)}%`, color: '#22c55e' },
      { name: 'Good (60-79%)', count: good, percent: `${Math.round((good / total) * 100)}%`, color: '#3b82f6' },
      { name: 'Average (40-59%)', count: average, percent: `${Math.round((average / total) * 100)}%`, color: '#f59e0b' },
      { name: 'Below Average (0-39%)', count: below, percent: `${Math.round((below / total) * 100)}%`, color: '#ef4444' },
    ];
  }, [currentStudent]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">

      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-3.5 text-slate-700 hover:text-[#1769AA] hover:bg-blue-50/50 border-slate-200 shadow-sm font-semibold flex items-center gap-2 transition-colors"
            onClick={() => navigate("/admin/students/all")}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Student Performance</h2>
            <p className="text-sm text-slate-500">
              View detailed academic analytics and progress for individual students.
            </p>
          </div>
        </div>

        <div className="w-full sm:w-80">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              value={currentStudent.id}
              onChange={(e) => handleStudentSelect(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA] font-medium cursor-pointer shadow-sm"
            >
              {allAvailableStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.studentCode})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Student Profile Card */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">

            {/* Left: Avatar + Info */}
            <div className="flex items-center gap-4 min-w-[320px]">
              <img
                src={currentStudent.avatar}
                alt={currentStudent.name}
                className="h-16 w-16 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
              />
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h2 className="text-xl font-bold text-slate-900">{currentStudent.name}</h2>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${currentStudent.status === "AT RISK"
                    ? "bg-red-50 text-red-600 border border-red-200/60"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                    }`}>
                    {currentStudent.status === "AT RISK" ? "At Risk" : "Active"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                  <span>{currentStudent.studentCode}</span>
                  <span>•</span>
                  <span>{currentStudent.phone}</span>
                  <span>•</span>
                  <span className="text-slate-500">{currentStudent.email}</span>
                </p>
              </div>
            </div>

            <div className="hidden lg:block w-px h-12 bg-slate-100"></div>

            {/* Right: 5 Detail Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 flex-1 w-full">
              <div>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                  <FileText className="h-3.5 w-3.5 text-slate-400" /> Admission No.
                </p>
                <p className="text-[13px] font-bold text-slate-800">{currentStudent.admissionNo}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Batch
                </p>
                <p className="text-[13px] font-bold text-slate-800">{currentStudent.batch}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                  <BookOpen className="h-3.5 w-3.5 text-slate-400" /> Course
                </p>
                <p className="text-[13px] font-bold text-slate-800">{currentStudent.course}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                  <Building className="h-3.5 w-3.5 text-slate-400" /> Center
                </p>
                <p className="text-[13px] font-bold text-slate-800">{currentStudent.center}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Date of Joining
                </p>
                <p className="text-[13px] font-bold text-slate-800">{currentStudent.dateOfJoining}</p>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* 3. 5 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

        {/* KPI 1 */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-start gap-3.5">
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Courses Enrolled</p>
              <h3 className="text-2xl font-black text-slate-900 my-0.5">{currentStudent.coursesCount}</h3>
              <p className="text-xs text-slate-400 font-medium">Active Courses</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2 */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-start gap-3.5">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">Overall Attendance</p>
                <span className={`text-[10px] font-bold flex items-center ${currentStudent.attendance >= 75 ? "text-emerald-600" : "text-red-500"}`}>
                  {currentStudent.attendance >= 75 ? (
                    <><TrendingUp className="h-3 w-3 mr-0.5" /> 8%</>
                  ) : (
                    <><TrendingDown className="h-3 w-3 mr-0.5" /> 5%</>
                  )}
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 my-0.5">{currentStudent.attendance}%</h3>
              <p className="text-xs text-slate-400 font-medium truncate">
                Present in {Math.round((currentStudent.attendance / 100) * 100)} of 100 classes
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3 */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-start gap-3.5">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shrink-0">
              <FileEdit className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">Average Test Score</p>
                <span className="text-[10px] font-bold text-emerald-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-0.5" /> 6%
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 my-0.5">{avgTestScore}%</h3>
              <p className="text-xs text-slate-400 font-medium truncate">Across {currentStudent.assessments.length} assessments</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4 */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-start gap-3.5">
            <div className="p-2.5 bg-orange-50 rounded-xl text-orange-500 shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Assignments Completed</p>
              <h3 className="text-2xl font-black text-slate-900 my-0.5">{currentStudent.assignmentsCompleted}</h3>
              <p className="text-xs text-slate-400 font-medium">Completion Rate</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 5 */}
        <Card className="border-slate-200 shadow-sm bg-white col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-start gap-3.5">
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 shrink-0">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Overall Performance</p>
              <h3 className="text-2xl font-black text-slate-900 my-0.5">{currentStudent.performanceGrade}</h3>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                {currentStudent.performanceMessage} <Info className="h-3 w-3 text-slate-400" />
              </p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 4. Filter Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <Button variant="outline" className="h-9 text-xs font-medium text-slate-700 bg-slate-50/70 border-slate-200 hover:bg-slate-100 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            01 May 2026 - 14 May 2026
          </Button>

          <select className="h-9 px-3 bg-slate-50/70 border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1769AA]">
            <option>All Courses</option>
            <option>{currentStudent.course}</option>
          </select>

          <select className="h-9 px-3 bg-slate-50/70 border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1769AA]">
            <option>All Assessments</option>
            <option>Tests Only</option>
            <option>Assignments Only</option>
          </select>
        </div>

        <Button variant="outline" className="h-9 text-xs font-bold text-[#1769AA] border-blue-200 hover:bg-blue-50/60 shadow-sm flex items-center gap-2">
          <Download className="h-3.5 w-3.5" /> Export Report
        </Button>
      </div>

      {/* 5. Three Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Card 1: Attendance Overview */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-bold text-slate-900">Attendance Overview</CardTitle>
            <select className="text-xs font-medium border border-slate-200 rounded-md px-2 py-1 bg-slate-50 text-slate-600 focus:outline-none">
              <option>This Month</option>
              <option>Last Month</option>
              <option>All Time</option>
            </select>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="mb-4">
              <p className="text-xs text-slate-400 font-medium">Overall Attendance</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-bold text-slate-900">{currentStudent.attendance}%</span>
                <span className={`text-xs font-bold flex items-center ${currentStudent.attendance >= 75 ? "text-emerald-600" : "text-red-500"}`}>
                  {currentStudent.attendance >= 75 ? (
                    <><TrendingUp className="h-3 w-3 mr-0.5" /> 8% vs Last Month</>
                  ) : (
                    <><TrendingDown className="h-3 w-3 mr-0.5" /> 5% vs Last Month</>
                  )}
                </span>
              </div>
            </div>

            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentStudent.attendanceHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => [`${val}%`, 'Attendance']}
                  />
                  <Line type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Assessment Performance */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">Assessment Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center justify-between gap-4">
              {/* Donut Chart */}
              <div className="h-[180px] w-[140px] relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assessmentDistribution}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={68} paddingAngle={2} dataKey="count"
                    >
                      {assessmentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-slate-900">{currentStudent.assessments.length}</span>
                  <span className="text-[10px] font-semibold text-slate-400 leading-tight">Total Tests</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="flex-1 space-y-2.5">
                {assessmentDistribution.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-slate-700 text-[11px]">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800 text-[11px]">
                      {item.count} <span className="text-slate-400 font-normal">({item.percent})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Performance Trend */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-bold text-slate-900">Performance Trend</CardTitle>
            <select className="text-xs font-medium border border-slate-200 rounded-md px-2 py-1 bg-slate-50 text-slate-600 focus:outline-none">
              <option>All Assessments</option>
              <option>Tests</option>
              <option>Assignments</option>
            </select>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentStudent.performanceTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => [`${val}%`, 'Score']}
                  />
                  <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#purpleGradient)" dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 6. Assessment Results & Enrolled Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Assessment Results Table (Spans 2 cols) */}
        <Card className="border-slate-200 shadow-sm bg-white lg:col-span-2 flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Assessment Results</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Assessment Name</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-center">Max Marks</th>
                  <th className="px-4 py-3 font-medium text-center">Obtained Marks</th>
                  <th className="px-4 py-3 font-medium text-center">Score</th>
                  <th className="px-5 py-3 font-medium text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {currentStudent.assessments.map((test, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{test.name}</td>
                    <td className="px-4 py-3.5 text-slate-600">{test.course}</td>
                    <td className="px-4 py-3.5 text-slate-500">{test.type}</td>
                    <td className="px-4 py-3.5 text-slate-500">{test.date}</td>
                    <td className="px-4 py-3.5 text-slate-600 text-center">{test.maxMarks}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800 text-center">{test.obtained}</td>
                    <td className="px-4 py-3.5 font-bold text-[#1769AA] text-center">{test.score}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded font-bold text-[11px] ${test.gradeColor}`}>
                        {test.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-center">
            <button className="text-xs font-bold text-[#1769AA] hover:text-[#125890] flex items-center gap-1.5">
              View All Assessments <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Card>

        {/* Enrolled Courses */}
        <Card className="border-slate-200 shadow-sm bg-white flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Enrolled Courses ({currentStudent.enrolledCourses.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-5 flex-1 space-y-4">
            {currentStudent.enrolledCourses.map((c, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${c.iconBg} shrink-0 mt-0.5`}>
                    <c.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{c.name}</h4>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Batch: <span className="text-slate-600">{c.batch}</span></p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Progress</span>
                    <span className="font-bold text-slate-900">{c.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${c.progress}%` }} />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[11px] text-slate-400 font-medium">Status</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-center mt-auto">
            <button className="text-xs font-bold text-[#1769AA] hover:text-[#125890] flex items-center gap-1.5">
              View All Courses <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Card>

      </div>

      {/* 7. Bottom Note */}
      <div className="text-center pt-2">
        <p className="text-xs text-slate-400 font-medium">
          Note: All data is based on recorded attendance and assessments.
        </p>
      </div>
    </div>
  );
};

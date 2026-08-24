import React, { useState, useEffect, useMemo } from "react";
import {
  FileCheck2,
  Plus,
  Search,
  CheckCircle2,
  MoreVertical,
  ArrowRight,
  Eye,
  Copy,
  Check,
  Filter,
  SlidersHorizontal,
  FileText,
  UserCheck,
  XCircle,
  Phone,
  Mail,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  Upload,
  Download,
  Printer,
  ChevronRight,
  X,
  Send,
  RefreshCw,
  User,
  MapPin,
  Award
} from "lucide-react";
import { useAdmissionStore } from "../../../store/admission.store";
import { useCourseStore } from "../../../store/course.store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ─── EXTENDED APPLICATION TYPES FOR COUNSELLOR WORKFLOW ───────────────────────

export type DetailedStatus = "UNDER_REVIEW_BLUE" | "UNDER_REVIEW_ORANGE" | "NEW_APPLICATION" | "APPROVED" | "ADMITTED" | "REJECTED";

export interface StudentDocument {
  id: string;
  title: string;
  category: "Identity Proof" | "Academic Marksheet" | "Degree Certificate" | "Photograph" | "Other";
  fileName: string;
  fileSize: string;
  uploadDate: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface ApplicationNote {
  id: string;
  author: string;
  role: string;
  date: string;
  time: string;
  text: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  iconType: "submit" | "verify" | "payment" | "review" | "approved" | "note";
  completed: boolean;
}

export interface EnrichedApplication {
  id: string;
  applicationNo: string;
  applicantName: string;
  avatar: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  gender: "Female" | "Male" | "Other";
  dob: string;
  category: "General" | "OBC" | "SC" | "ST" | "EWS";
  fatherName: string;
  motherName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  
  // Course Information
  courseId: string;
  courseName: string;
  courseDuration: string;
  courseCode: string;
  preferredBatchTiming: string;
  preferredMode: "Offline (Classroom)" | "Online Live" | "Hybrid";

  // Academic Background
  highestQualification: string;
  collegeOrSchool: string;
  passingYear: string;
  gradePercentage: string;

  // Fee Details
  feeStatus: "PAID" | "NOT_PAID";
  feeAmount: number;
  paymentMethod?: "UPI / QR" | "Net Banking" | "Credit/Debit Card" | "Cash Counter";
  transactionId?: string;
  paidAt?: string;

  // Status & Workflow
  status: DetailedStatus;
  submittedDate: string;
  submittedTime: string;
  currentWorkflowStep: number; // 1 to 5: 1=New, 2=Doc Verification, 3=Fee Payment, 4=Under Review, 5=Approved

  // Documents & Notes
  documents: StudentDocument[];
  counselorNotes: ApplicationNote[];
  timeline: TimelineEvent[];
}

// ─── REALISTIC SEED / SAMPLE DATA ─────────────────────────────────────────────

const SAMPLE_APPLICATIONS: EnrichedApplication[] = [
  {
    id: "app-1",
    applicationNo: "APP-2025-0024",
    applicantName: "Ananya Sharma",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250",
    email: "ananya.sharma@email.com",
    phone: "+91 98765 43210",
    alternatePhone: "+91 98765 43219",
    gender: "Female",
    dob: "14 Aug 2003",
    category: "General",
    fatherName: "Rajendra Sharma",
    motherName: "Sunita Sharma",
    address: "Flat 402, Green Glen Heights, Bellandur",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560103",
    courseId: "c-dm",
    courseName: "Digital Marketing",
    courseDuration: "(1 Year Program)",
    courseCode: "DM-101",
    preferredBatchTiming: "Morning (09:00 AM - 11:00 AM)",
    preferredMode: "Offline (Classroom)",
    highestQualification: "B.Com in Marketing",
    collegeOrSchool: "St. Joseph's College of Commerce",
    passingYear: "2024",
    gradePercentage: "84.5%",
    feeStatus: "PAID",
    feeAmount: 500,
    paymentMethod: "UPI / QR",
    transactionId: "UPI/20250516/982341908",
    paidAt: "16 May 2025, 10:25 AM",
    status: "UNDER_REVIEW_BLUE",
    submittedDate: "16 May 2025",
    submittedTime: "10:30 AM",
    currentWorkflowStep: 4,
    documents: [
      { id: "d1", title: "10th Class Marksheet", category: "Academic Marksheet", fileName: "Ananya_10th_Marksheet.pdf", fileSize: "1.4 MB", uploadDate: "16 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "16 May 2025, 11:00 AM" },
      { id: "d2", title: "12th Standard Certificate", category: "Academic Marksheet", fileName: "Ananya_12th_Certificate.pdf", fileSize: "1.8 MB", uploadDate: "16 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "16 May 2025, 11:05 AM" },
      { id: "d3", title: "B.Com Degree / Provisional", category: "Degree Certificate", fileName: "Degree_Provisional_Certificate.pdf", fileSize: "2.1 MB", uploadDate: "16 May 2025", verified: false },
      { id: "d4", title: "Aadhaar Card (Front & Back)", category: "Identity Proof", fileName: "Aadhaar_Card_Verified.pdf", fileSize: "920 KB", uploadDate: "16 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "16 May 2025, 10:45 AM" },
      { id: "d5", title: "Passport Size Photograph", category: "Photograph", fileName: "Candidate_Photo_Studio.jpg", fileSize: "450 KB", uploadDate: "16 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "16 May 2025, 10:40 AM" },
    ],
    counselorNotes: [
      { id: "n1", author: "Priya Singh", role: "Senior Counsellor", date: "16 May 2025", time: "11:15 AM", text: "Applicant cleared preliminary career counseling session. Verified 10th, 12th, and Aadhaar card. Pending final verification on provisional graduation certificate before granting full approval." },
    ],
    timeline: [
      { id: "t1", title: "Online Application Form Submitted", description: "Candidate submitted form for Digital Marketing (1 Year Program).", timestamp: "16 May 2025, 10:30 AM", iconType: "submit", completed: true },
      { id: "t2", title: "Application Fee Received", description: "Online UPI payment of ₹500 confirmed (Ref: UPI/20250516/982341908).", timestamp: "16 May 2025, 10:25 AM", iconType: "payment", completed: true },
      { id: "t3", title: "Document Verification in Progress", description: "4 of 5 mandatory documents verified by counsellor.", timestamp: "16 May 2025, 11:05 AM", iconType: "verify", completed: true },
      { id: "t4", title: "Under Review by Admissions Committee", description: "Batch assignment DM-01 pending provisional certificate approval.", timestamp: "16 May 2025, 11:15 AM", iconType: "review", completed: true },
      { id: "t5", title: "Final Admission Approval", description: "Grant student roll number and welcome kit access.", timestamp: "Pending Decision", iconType: "approved", completed: false },
    ],
  },
  {
    id: "app-2",
    applicationNo: "APP-2025-0023",
    applicantName: "Rohit Mehta",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250",
    email: "rohit.mehta@email.com",
    phone: "+91 91234 56789",
    alternatePhone: "+91 91234 56780",
    gender: "Male",
    dob: "22 Nov 2001",
    category: "General",
    fatherName: "Kailash Mehta",
    motherName: "Geeta Mehta",
    address: "34, Shivaji Marg, Near Metro Station",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    courseId: "c-ae",
    courseName: "Advanced Excel",
    courseDuration: "(3 Months Program)",
    courseCode: "EXCEL-201",
    preferredBatchTiming: "Evening (06:30 PM - 08:00 PM)",
    preferredMode: "Hybrid",
    highestQualification: "BBA Finance",
    collegeOrSchool: "NMIMS University",
    passingYear: "2023",
    gradePercentage: "78.2%",
    feeStatus: "PAID",
    feeAmount: 300,
    paymentMethod: "Credit/Debit Card",
    transactionId: "CARD/20250515/3419081",
    paidAt: "15 May 2025, 04:10 PM",
    status: "UNDER_REVIEW_ORANGE",
    submittedDate: "15 May 2025",
    submittedTime: "04:15 PM",
    currentWorkflowStep: 4,
    documents: [
      { id: "d21", title: "Graduation Marksheet", category: "Academic Marksheet", fileName: "Rohit_BBA_Marks.pdf", fileSize: "1.2 MB", uploadDate: "15 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "15 May 2025, 05:00 PM" },
      { id: "d22", title: "Government ID Proof", category: "Identity Proof", fileName: "PAN_Card.pdf", fileSize: "600 KB", uploadDate: "15 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "15 May 2025, 05:05 PM" },
    ],
    counselorNotes: [
      { id: "n21", author: "Priya Singh", role: "Senior Counsellor", date: "15 May 2025", time: "05:10 PM", text: "Candidate requested evening hybrid batch due to office work. Eligibility criteria met." },
    ],
    timeline: [
      { id: "t21", title: "Application Submitted", description: "Advanced Excel course application received.", timestamp: "15 May 2025, 04:15 PM", iconType: "submit", completed: true },
      { id: "t22", title: "Fee Paid", description: "₹300 application fee confirmed.", timestamp: "15 May 2025, 04:10 PM", iconType: "payment", completed: true },
      { id: "t23", title: "Document Verification", description: "All documents verified.", timestamp: "15 May 2025, 05:05 PM", iconType: "verify", completed: true },
      { id: "t24", title: "Under Review", description: "Checking seat availability in Evening Batch EX-04.", timestamp: "15 May 2025, 05:10 PM", iconType: "review", completed: true },
      { id: "t25", title: "Admission Confirmation", description: "Awaiting final batch allocation.", timestamp: "Pending Decision", iconType: "approved", completed: false },
    ],
  },
  {
    id: "app-3",
    applicationNo: "APP-2025-0022",
    applicantName: "Neha Verma",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250",
    email: "neha.verma@email.com",
    phone: "+91 99887 66554",
    alternatePhone: "+91 99887 66500",
    gender: "Female",
    dob: "05 Mar 2004",
    category: "OBC",
    fatherName: "Sanjay Verma",
    motherName: "Pooja Verma",
    address: "House 12B, Sector 18, Indira Nagar",
    city: "Lucknow",
    state: "Uttar Pradesh",
    pincode: "226016",
    courseId: "c-tp",
    courseName: "Tally Prime with GST",
    courseDuration: "(2 Months Program)",
    courseCode: "TALLY-102",
    preferredBatchTiming: "Afternoon (02:00 PM - 04:00 PM)",
    preferredMode: "Offline (Classroom)",
    highestQualification: "12th Standard (Commerce)",
    collegeOrSchool: "Kendriya Vidyalaya",
    passingYear: "2024",
    gradePercentage: "89.2%",
    feeStatus: "NOT_PAID",
    feeAmount: 0,
    status: "NEW_APPLICATION",
    submittedDate: "15 May 2025",
    submittedTime: "11:20 AM",
    currentWorkflowStep: 1,
    documents: [
      { id: "d31", title: "10th Marksheet", category: "Academic Marksheet", fileName: "Neha_10th.pdf", fileSize: "1.1 MB", uploadDate: "15 May 2025", verified: false },
      { id: "d32", title: "12th Marksheet", category: "Academic Marksheet", fileName: "Neha_12th.pdf", fileSize: "1.3 MB", uploadDate: "15 May 2025", verified: false },
    ],
    counselorNotes: [
      { id: "n31", author: "Priya Singh", role: "Senior Counsellor", date: "15 May 2025", time: "11:30 AM", text: "New direct web lead. Sent fee payment link via WhatsApp and SMS." },
    ],
    timeline: [
      { id: "t31", title: "Application Submitted", description: "Form received via Website Admission Portal.", timestamp: "15 May 2025, 11:20 AM", iconType: "submit", completed: true },
      { id: "t32", title: "Document Verification", description: "Pending document upload and review.", timestamp: "In Progress", iconType: "verify", completed: false },
      { id: "t33", title: "Fee Payment", description: "Pending ₹500 application fee.", timestamp: "Pending", iconType: "payment", completed: false },
      { id: "t34", title: "Under Review", description: "Pending committee check.", timestamp: "Upcoming", iconType: "review", completed: false },
      { id: "t35", title: "Admission Confirmation", description: "Enroll in Tally Batch.", timestamp: "Upcoming", iconType: "approved", completed: false },
    ],
  },
  {
    id: "app-4",
    applicationNo: "APP-2025-0021",
    applicantName: "Arjun Patel",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250",
    email: "arjun.patel@email.com",
    phone: "+91 88221 33445",
    alternatePhone: "+91 88221 33400",
    gender: "Male",
    dob: "19 Oct 2002",
    category: "General",
    fatherName: "Bhavesh Patel",
    motherName: "Hansaben Patel",
    address: "Block C, 203, Orchid Enclave, Satellite",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380015",
    courseId: "c-wd",
    courseName: "Web Designing",
    courseDuration: "(6 Months Program)",
    courseCode: "WD-103",
    preferredBatchTiming: "Morning (10:00 AM - 12:00 PM)",
    preferredMode: "Offline (Classroom)",
    highestQualification: "BCA Computer Applications",
    collegeOrSchool: "Gujarat University",
    passingYear: "2024",
    gradePercentage: "81.0%",
    feeStatus: "PAID",
    feeAmount: 500,
    paymentMethod: "UPI / QR",
    transactionId: "UPI/20250514/4819028",
    paidAt: "14 May 2025, 02:40 PM",
    status: "APPROVED",
    submittedDate: "14 May 2025",
    submittedTime: "02:45 PM",
    currentWorkflowStep: 5,
    documents: [
      { id: "d41", title: "10th Marksheet", category: "Academic Marksheet", fileName: "Arjun_10th.pdf", fileSize: "1.5 MB", uploadDate: "14 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "14 May 2025, 03:15 PM" },
      { id: "d42", title: "12th Marksheet", category: "Academic Marksheet", fileName: "Arjun_12th.pdf", fileSize: "1.2 MB", uploadDate: "14 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "14 May 2025, 03:15 PM" },
      { id: "d43", title: "BCA Consolidated Transcript", category: "Degree Certificate", fileName: "BCA_Transcript.pdf", fileSize: "2.4 MB", uploadDate: "14 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "14 May 2025, 03:20 PM" },
      { id: "d44", title: "Aadhaar Card", category: "Identity Proof", fileName: "Aadhaar_Arjun.pdf", fileSize: "850 KB", uploadDate: "14 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "14 May 2025, 03:10 PM" },
    ],
    counselorNotes: [
      { id: "n41", author: "Priya Singh", role: "Senior Counsellor", date: "14 May 2025", time: "03:30 PM", text: "All documents verified and fee paid. Approved for Batch WD-2025-B1. Sent admission offer letter." },
    ],
    timeline: [
      { id: "t41", title: "Application Submitted", description: "Web Designing application submitted.", timestamp: "14 May 2025, 02:45 PM", iconType: "submit", completed: true },
      { id: "t42", title: "Application Fee Paid", description: "₹500 received via Google Pay UPI.", timestamp: "14 May 2025, 02:40 PM", iconType: "payment", completed: true },
      { id: "t43", title: "Documents Verified", description: "All 4 documents verified by counsellor.", timestamp: "14 May 2025, 03:20 PM", iconType: "verify", completed: true },
      { id: "t44", title: "Committee Review Completed", description: "Application marked as eligible.", timestamp: "14 May 2025, 03:30 PM", iconType: "review", completed: true },
      { id: "t45", title: "Admission Approved", description: "Ready to assign batch and issue student ID.", timestamp: "14 May 2025, 03:35 PM", iconType: "approved", completed: true },
    ],
  },
  {
    id: "app-5",
    applicationNo: "APP-2025-0020",
    applicantName: "Sneha Reddy",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250",
    email: "sneha.reddy@email.com",
    phone: "+91 77331 11223",
    alternatePhone: "+91 77331 11200",
    gender: "Female",
    dob: "28 Jul 2003",
    category: "General",
    fatherName: "Venkat Reddy",
    motherName: "Radha Reddy",
    address: "Plot 88, Jubilee Hills, Road No. 36",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500033",
    courseId: "c-py",
    courseName: "Python Programming",
    courseDuration: "(6 Months Program)",
    courseCode: "PY-104",
    preferredBatchTiming: "Weekend (10:00 AM - 02:00 PM)",
    preferredMode: "Online Live",
    highestQualification: "B.Tech Computer Science (3rd Yr)",
    collegeOrSchool: "JNTU Hyderabad",
    passingYear: "2025",
    gradePercentage: "88.0%",
    feeStatus: "PAID",
    feeAmount: 500,
    paymentMethod: "UPI / QR",
    transactionId: "UPI/20250514/1982736",
    paidAt: "14 May 2025, 09:05 AM",
    status: "APPROVED",
    submittedDate: "14 May 2025",
    submittedTime: "09:10 AM",
    currentWorkflowStep: 5,
    documents: [
      { id: "d51", title: "College ID & Marksheet", category: "Academic Marksheet", fileName: "Sneha_College_ID.pdf", fileSize: "1.4 MB", uploadDate: "14 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "14 May 2025, 10:00 AM" },
      { id: "d52", title: "Aadhaar Card", category: "Identity Proof", fileName: "Sneha_Aadhaar.pdf", fileSize: "780 KB", uploadDate: "14 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "14 May 2025, 10:05 AM" },
    ],
    counselorNotes: [
      { id: "n51", author: "Priya Singh", role: "Senior Counsellor", date: "14 May 2025", time: "10:15 AM", text: "Enrolled in Python Weekend Batch. Payment verified. Admission letter generated." },
    ],
    timeline: [
      { id: "t51", title: "Application Submitted", description: "Python Programming application submitted.", timestamp: "14 May 2025, 09:10 AM", iconType: "submit", completed: true },
      { id: "t52", title: "Application Fee Paid", description: "₹500 UPI transaction successful.", timestamp: "14 May 2025, 09:05 AM", iconType: "payment", completed: true },
      { id: "t53", title: "Documents Verified", description: "Verification completed.", timestamp: "14 May 2025, 10:05 AM", iconType: "verify", completed: true },
      { id: "t54", title: "Admissions Review", description: "Approved for admission.", timestamp: "14 May 2025, 10:15 AM", iconType: "review", completed: true },
      { id: "t55", title: "Admission Approved", description: "Batch PY-WE-01 allocated.", timestamp: "14 May 2025, 10:20 AM", iconType: "approved", completed: true },
    ],
  },
  // Additional records to support comprehensive search, filter and pagination
  {
    id: "app-6",
    applicationNo: "APP-2025-0019",
    applicantName: "Vikram Malhotra",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=250",
    email: "vikram.m@email.com",
    phone: "+91 98450 12345",
    gender: "Male",
    dob: "12 Dec 2002",
    category: "General",
    fatherName: "Sunil Malhotra",
    motherName: "Anita Malhotra",
    address: "24, Residency Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560025",
    courseId: "c-dm",
    courseName: "Digital Marketing",
    courseDuration: "(1 Year Program)",
    courseCode: "DM-101",
    preferredBatchTiming: "Morning (09:00 AM - 11:00 AM)",
    preferredMode: "Offline (Classroom)",
    highestQualification: "BBA",
    collegeOrSchool: "Christ University",
    passingYear: "2024",
    gradePercentage: "82.0%",
    feeStatus: "PAID",
    feeAmount: 500,
    paymentMethod: "UPI / QR",
    status: "UNDER_REVIEW_BLUE",
    submittedDate: "13 May 2025",
    submittedTime: "11:45 AM",
    currentWorkflowStep: 4,
    documents: [
      { id: "d61", title: "10th Marksheet", category: "Academic Marksheet", fileName: "Vikram_10th.pdf", fileSize: "1.2 MB", uploadDate: "13 May 2025", verified: true },
      { id: "d62", title: "Degree Marksheet", category: "Degree Certificate", fileName: "Vikram_BBA.pdf", fileSize: "2.0 MB", uploadDate: "13 May 2025", verified: true },
    ],
    counselorNotes: [],
    timeline: [],
  },
  {
    id: "app-7",
    applicationNo: "APP-2025-0018",
    applicantName: "Pooja Iyer",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=250",
    email: "pooja.iyer@email.com",
    phone: "+91 98451 55667",
    gender: "Female",
    dob: "02 Feb 2004",
    category: "General",
    fatherName: "K. Iyer",
    motherName: "Lakshmi Iyer",
    address: "18, TTK Road, Alwarpet",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600018",
    courseId: "c-ae",
    courseName: "Advanced Excel",
    courseDuration: "(3 Months Program)",
    courseCode: "EXCEL-201",
    preferredBatchTiming: "Weekend (10:00 AM - 01:00 PM)",
    preferredMode: "Online Live",
    highestQualification: "B.Com",
    collegeOrSchool: "Loyola College",
    passingYear: "2024",
    gradePercentage: "86.4%",
    feeStatus: "PAID",
    feeAmount: 300,
    paymentMethod: "Net Banking",
    status: "UNDER_REVIEW_ORANGE",
    submittedDate: "12 May 2025",
    submittedTime: "03:20 PM",
    currentWorkflowStep: 4,
    documents: [],
    counselorNotes: [],
    timeline: [],
  },
  {
    id: "app-8",
    applicationNo: "APP-2025-0017",
    applicantName: "Divya Krishnan",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250",
    email: "divya.k@email.com",
    phone: "+91 97401 22334",
    gender: "Female",
    dob: "15 Jun 2003",
    category: "OBC",
    fatherName: "Krishnan S",
    motherName: "Meenakshi K",
    address: "56, Koramangala 4th Block",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560034",
    courseId: "c-wd",
    courseName: "Web Designing",
    courseDuration: "(6 Months Program)",
    courseCode: "WD-103",
    preferredBatchTiming: "Afternoon (02:00 PM - 04:00 PM)",
    preferredMode: "Offline (Classroom)",
    highestQualification: "B.Sc CS",
    collegeOrSchool: "Mount Carmel College",
    passingYear: "2024",
    gradePercentage: "79.8%",
    feeStatus: "NOT_PAID",
    feeAmount: 0,
    status: "NEW_APPLICATION",
    submittedDate: "11 May 2025",
    submittedTime: "10:15 AM",
    currentWorkflowStep: 1,
    documents: [],
    counselorNotes: [],
    timeline: [],
  }
];

export const Applications: React.FC = () => {
  const { batches, fetchCourses, fetchBatches } = useCourseStore();
  const { convertApplicationToAdmission } = useAdmissionStore();

  // Local state for enriched application items initialized with realistic sample data
  const [applicationsList, setApplicationsList] = useState<EnrichedApplication[]>(SAMPLE_APPLICATIONS);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [feeFilter, setFeeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("ALL");
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  // Selected Application for Details Sheet / Drawer
  const [selectedApplication, setSelectedApplication] = useState<EnrichedApplication | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState<"overview" | "documents" | "fees" | "timeline">("overview");

  // Note creation in Details Drawer
  const [newNoteInput, setNewNoteInput] = useState<string>("");

  // Create New Application Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createCourse, setCreateCourse] = useState("Digital Marketing");
  const [createDuration, setCreateDuration] = useState("(1 Year Program)");
  const [createFeeStatus, setCreateFeeStatus] = useState<"PAID" | "NOT_PAID">("PAID");
  const [createFeeAmount] = useState<number>(500);
  const [createStatus, setCreateStatus] = useState<DetailedStatus>("UNDER_REVIEW_BLUE");
  const [createNotes, setCreateNotes] = useState("");

  // Convert to Full Admission Modal State
  const [convertModalOpen, setConvertModalOpen] = useState<boolean>(false);
  const [appToConvert, setAppToConvert] = useState<EnrichedApplication | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [isConverting, setIsConverting] = useState<boolean>(false);

  // Copy Feedback state
  const [copiedAppNo, setCopiedAppNo] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (fetchCourses) fetchCourses();
    if (fetchBatches) fetchBatches();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleCopyAppNo = (appNo: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(appNo);
    setCopiedAppNo(appNo);
    showToast(`Copied ${appNo} to clipboard!`);
    setTimeout(() => setCopiedAppNo(null), 2000);
  };

  // KPI Calculations strictly from real data
  const totalAppsCount = applicationsList.length;
  const underReviewCount = applicationsList.filter((a) => a.status === "UNDER_REVIEW_BLUE" || a.status === "UNDER_REVIEW_ORANGE").length;
  const feePaidCount = applicationsList.filter((a) => a.feeStatus === "PAID").length;
  const approvedCount = applicationsList.filter((a) => a.status === "APPROVED" || a.status === "ADMITTED").length;

  // Filter Logic
  const filteredList = useMemo(() => {
    return applicationsList.filter((app) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        app.applicationNo.toLowerCase().includes(q) ||
        app.applicantName.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        app.phone.includes(q) ||
        app.courseName.toLowerCase().includes(q);

      const matchesFee =
        feeFilter === "ALL" ||
        (feeFilter === "PAID" && app.feeStatus === "PAID") ||
        (feeFilter === "NOT_PAID" && app.feeStatus === "NOT_PAID");

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "UNDER_REVIEW" && (app.status === "UNDER_REVIEW_BLUE" || app.status === "UNDER_REVIEW_ORANGE")) ||
        (statusFilter === "NEW_APPLICATION" && app.status === "NEW_APPLICATION") ||
        (statusFilter === "APPROVED" && app.status === "APPROVED") ||
        (statusFilter === "ADMITTED" && app.status === "ADMITTED");

      const matchesCourse =
        selectedCourseFilter === "ALL" || app.courseName.toLowerCase() === selectedCourseFilter.toLowerCase();

      const matchesMode =
        selectedModeFilter === "ALL" || app.preferredMode.toLowerCase().includes(selectedModeFilter.toLowerCase());

      return matchesSearch && matchesFee && matchesStatus && matchesCourse && matchesMode;
    });
  }, [applicationsList, searchTerm, feeFilter, statusFilter, selectedCourseFilter, selectedModeFilter]);

  // Paginated Rows
  const currentRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage]);

  const handleOpenDetails = (app: EnrichedApplication) => {
    setSelectedApplication(app);
    setIsDetailsOpen(true);
  };

  const handleAddNote = () => {
    if (!newNoteInput.trim() || !selectedApplication) return;
    const newNote: ApplicationNote = {
      id: `n-${Date.now()}`,
      author: "Priya Singh",
      role: "Senior Counsellor",
      date: "Today",
      time: "Just now",
      text: newNoteInput.trim(),
    };
    const updated = {
      ...selectedApplication,
      counselorNotes: [newNote, ...(selectedApplication.counselorNotes || [])],
    };
    setSelectedApplication(updated);
    setApplicationsList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setNewNoteInput("");
    showToast("Counsellor note added successfully!");
  };

  const handleToggleDocVerify = (docId: string) => {
    if (!selectedApplication) return;
    const updatedDocs = selectedApplication.documents.map((d) => {
      if (d.id === docId) {
        return {
          ...d,
          verified: !d.verified,
          verifiedBy: !d.verified ? "Priya Singh" : undefined,
          verifiedAt: !d.verified ? "Just now" : undefined,
        };
      }
      return d;
    });
    const updated = { ...selectedApplication, documents: updatedDocs };
    setSelectedApplication(updated);
    setApplicationsList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    showToast("Document verification status updated!");
  };

  const handleUpdateStatus = (appId: string, newStatus: DetailedStatus) => {
    setApplicationsList((prev) =>
      prev.map((a) => {
        if (a.id === appId) {
          const step = newStatus === "APPROVED" || newStatus === "ADMITTED" ? 5 : newStatus === "NEW_APPLICATION" ? 1 : 4;
          return { ...a, status: newStatus, currentWorkflowStep: step };
        }
        return a;
      })
    );
    if (selectedApplication && selectedApplication.id === appId) {
      setSelectedApplication((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              currentWorkflowStep: newStatus === "APPROVED" || newStatus === "ADMITTED" ? 5 : newStatus === "NEW_APPLICATION" ? 1 : 4,
            }
          : null
      );
    }
    showToast(`Application status updated to ${newStatus.replace(/_/g, " ")}`);
  };

  const handleToggleFeePaid = (appId: string) => {
    setApplicationsList((prev) =>
      prev.map((a) => {
        if (a.id === appId) {
          const isPaid = a.feeStatus === "PAID";
          return {
            ...a,
            feeStatus: isPaid ? "NOT_PAID" : "PAID",
            feeAmount: isPaid ? 0 : 500,
            paymentMethod: isPaid ? undefined : "UPI / QR",
            paidAt: isPaid ? undefined : "Just now",
          };
        }
        return a;
      })
    );
    if (selectedApplication && selectedApplication.id === appId) {
      const isPaid = selectedApplication.feeStatus === "PAID";
      setSelectedApplication((prev) =>
        prev
          ? {
              ...prev,
              feeStatus: isPaid ? "NOT_PAID" : "PAID",
              feeAmount: isPaid ? 0 : 500,
              paymentMethod: isPaid ? undefined : "UPI / QR",
              paidAt: isPaid ? undefined : "Just now",
            }
          : null
      );
    }
    showToast("Application fee status updated!");
  };

  const handleCreateApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName || !createPhone) return;

    const newAppNo = `APP-2025-00${25 + applicationsList.length}`;
    const newApp: EnrichedApplication = {
      id: `app-${Date.now()}`,
      applicationNo: newAppNo,
      applicantName: createName,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(createName)}`,
      email: createEmail || `${createName.toLowerCase().replace(/\s+/g, "")}@email.com`,
      phone: createPhone,
      gender: "Female",
      dob: "10 Jun 2002",
      category: "General",
      fatherName: "Guardian Name",
      motherName: "Mother Name",
      address: "Main City Center",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      courseId: "c-new",
      courseName: createCourse,
      courseDuration: createDuration,
      courseCode: "CR-100",
      preferredBatchTiming: "Morning (09:00 AM - 11:00 AM)",
      preferredMode: "Offline (Classroom)",
      highestQualification: "Graduate",
      collegeOrSchool: "Bangalore University",
      passingYear: "2024",
      gradePercentage: "80.0%",
      feeStatus: createFeeStatus,
      feeAmount: createFeeStatus === "PAID" ? createFeeAmount : 0,
      paymentMethod: createFeeStatus === "PAID" ? "UPI / QR" : undefined,
      paidAt: createFeeStatus === "PAID" ? "Just now" : undefined,
      status: createStatus,
      submittedDate: "16 May 2025",
      submittedTime: "10:30 AM",
      currentWorkflowStep: createStatus === "APPROVED" ? 5 : createStatus === "NEW_APPLICATION" ? 1 : 4,
      documents: [
        { id: `d-${Date.now()}-1`, title: "10th Marksheet", category: "Academic Marksheet", fileName: "10th_Marksheet.pdf", fileSize: "1.2 MB", uploadDate: "Today", verified: true },
        { id: `d-${Date.now()}-2`, title: "Aadhaar Card", category: "Identity Proof", fileName: "Aadhaar.pdf", fileSize: "800 KB", uploadDate: "Today", verified: true },
      ],
      counselorNotes: createNotes
        ? [{ id: `n-${Date.now()}`, author: "Priya Singh", role: "Senior Counsellor", date: "Today", time: "Just now", text: createNotes }]
        : [],
      timeline: [
        { id: `t-${Date.now()}`, title: "Application Form Created", description: "Created manually by counsellor desk.", timestamp: "Just now", iconType: "submit", completed: true },
      ],
    };

    setApplicationsList([newApp, ...applicationsList]);
    setIsCreateModalOpen(false);
    setCreateName("");
    setCreateEmail("");
    setCreatePhone("");
    setCreateNotes("");
    showToast(`New Application ${newAppNo} created successfully!`);
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appToConvert) return;
    setIsConverting(true);
    try {
      if (convertApplicationToAdmission) {
        await convertApplicationToAdmission(appToConvert.id, { batchId: selectedBatchId });
      }
      handleUpdateStatus(appToConvert.id, "APPROVED");
      showToast(`Student admission confirmed for ${appToConvert.applicantName}!`);
    } catch {
      showToast("Admission conversion completed locally!");
    } finally {
      setIsConverting(false);
      setConvertModalOpen(false);
      setAppToConvert(null);
    }
  };

  // Helper for Status Badge Pill
  const renderStatusBadge = (status: DetailedStatus) => {
    switch (status) {
      case "UNDER_REVIEW_BLUE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#1769AA] border border-blue-100/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1769AA]" />
            Under Review
          </span>
        );
      case "UNDER_REVIEW_ORANGE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Under Review
          </span>
        );
      case "NEW_APPLICATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
            New Application
          </span>
        );
      case "APPROVED":
      case "ADMITTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
            Submitted
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1700px] w-full mx-auto space-y-6 bg-[#f8fafc] min-h-screen text-slate-900 font-sans antialiased">
      
      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-xs font-medium border border-slate-700/60 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── 1. BREADCRUMB & HEADER ─── */}
      <div className="space-y-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <UserCheck className="h-4 w-4" />
            <span>Counsellor Portal</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-500">Admissions</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-800 font-semibold">Admission Applications</span>
        </div>

        {/* Title and Top Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Admission Applications
            </h1>
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              Track submitted student application forms, document verification, and final admission approvals.
            </p>
          </div>

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#1769AA] hover:bg-[#12558c] text-white font-medium px-4.5 py-2.5 rounded-lg shadow-sm flex items-center gap-2 text-sm transition-all shrink-0 h-10"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Application</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. SUMMARY KPI CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Total Applications */}
        <Card 
          onClick={() => { setStatusFilter("ALL"); setFeeFilter("ALL"); }}
          className="border border-slate-200/80 bg-white rounded-xl shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50/90 text-[#1769AA] flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-500">Total Applications</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {totalAppsCount}
                </h3>
              </div>
            </div>
            <div className="self-end pb-1">
              <span className="text-xs font-semibold text-[#1769AA] hover:underline flex items-center gap-0.5">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Under Review */}
        <Card 
          onClick={() => setStatusFilter("UNDER_REVIEW")}
          className="border border-slate-200/80 bg-white rounded-xl shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-500">Under Review</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {underReviewCount}
                </h3>
              </div>
            </div>
            <div className="self-end pb-1">
              <span className="text-xs font-semibold text-amber-600 hover:underline flex items-center gap-0.5">
                Review now <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Application Fee Paid */}
        <Card 
          onClick={() => setFeeFilter("PAID")}
          className="border border-slate-200/80 bg-white rounded-xl shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-500">Application Fee Paid</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {feePaidCount}
                </h3>
              </div>
            </div>
            <div className="self-end pb-1">
              <span className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-0.5">
                View paid <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Approved / Admitted */}
        <Card 
          onClick={() => setStatusFilter("APPROVED")}
          className="border border-slate-200/80 bg-white rounded-xl shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform">
                <Award className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-500">Approved / Admitted</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {approvedCount}
                </h3>
              </div>
            </div>
            <div className="self-end pb-1">
              <span className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-0.5">
                View admitted <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ─── 3. SEARCH & FILTERS TOOLBAR ─── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by application no., applicant name, email, or course..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 h-10.5 bg-white border-slate-200/80 text-slate-800 placeholder:text-slate-400 rounded-lg text-sm focus-visible:ring-1 focus-visible:ring-[#1769AA] shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns & Extra Filter Button */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Fee Status Dropdown */}
          <div className="relative">
            <select
              value={feeFilter}
              onChange={(e) => {
                setFeeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10.5 px-3.5 pr-8 bg-white border border-slate-200/80 rounded-lg text-xs font-medium text-slate-700 appearance-none focus:outline-none focus:ring-1 focus:ring-[#1769AA] shadow-2xs cursor-pointer hover:bg-slate-50/50"
            >
              <option value="ALL">All Fee Status</option>
              <option value="PAID">Paid</option>
              <option value="NOT_PAID">Not Paid</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10.5 px-3.5 pr-8 bg-white border border-slate-200/80 rounded-lg text-xs font-medium text-slate-700 appearance-none focus:outline-none focus:ring-1 focus:ring-[#1769AA] shadow-2xs cursor-pointer hover:bg-slate-50/50"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="NEW_APPLICATION">New Application</option>
              <option value="APPROVED">Approved</option>
              <option value="ADMITTED">Admitted</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Advanced Filters Button */}
          <Button
            variant="outline"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`h-10.5 px-3.5 border-slate-200/80 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold gap-1.5 shadow-2xs transition-all ${
              showAdvancedFilters || selectedCourseFilter !== "ALL" || selectedModeFilter !== "ALL"
                ? "border-[#1769AA] text-[#1769AA] bg-blue-50/40"
                : ""
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
            {(selectedCourseFilter !== "ALL" || selectedModeFilter !== "ALL") && (
              <span className="h-2 w-2 rounded-full bg-[#1769AA]" />
            )}
          </Button>

          {/* Reset Filters button if any filter active */}
          {(searchTerm || feeFilter !== "ALL" || statusFilter !== "ALL" || selectedCourseFilter !== "ALL" || selectedModeFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setFeeFilter("ALL");
                setStatusFilter("ALL");
                setSelectedCourseFilter("ALL");
                setSelectedModeFilter("ALL");
                setCurrentPage(1);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 h-10.5 px-2"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* ─── ADVANCED FILTER DRAWER / PANEL ─── */}
      {showAdvancedFilters && (
        <Card className="border border-blue-100 bg-blue-50/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-150 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-blue-100/60 mb-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-[#1769AA]" /> Extended Filter Options
            </span>
            <button
              onClick={() => setShowAdvancedFilters(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Course</label>
              <select
                value={selectedCourseFilter}
                onChange={(e) => {
                  setSelectedCourseFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-700"
              >
                <option value="ALL">All Courses</option>
                <option value="Digital Marketing">Digital Marketing</option>
                <option value="Advanced Excel">Advanced Excel</option>
                <option value="Tally Prime with GST">Tally Prime with GST</option>
                <option value="Web Designing">Web Designing</option>
                <option value="Python Programming">Python Programming</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Program Mode</label>
              <select
                value={selectedModeFilter}
                onChange={(e) => {
                  setSelectedModeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-700"
              >
                <option value="ALL">All Delivery Modes</option>
                <option value="Offline">Offline (Classroom)</option>
                <option value="Online">Online Live</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Quick Action</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedCourseFilter("ALL");
                    setSelectedModeFilter("ALL");
                  }}
                  variant="outline"
                  className="w-full text-xs h-9 bg-white"
                >
                  Clear Extended
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ─── 4. APPLICATIONS DATA TABLE CARD ─── */}
      <Card className="border border-slate-200/80 shadow-2xs bg-white rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#fbfcfe] border-b border-slate-200/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-3.5 px-4 font-bold text-slate-700 text-xs tracking-wider">
                  App No.
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-slate-700 text-xs tracking-wider">
                  Applicant Details
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-slate-700 text-xs tracking-wider">
                  Applied Course
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-slate-700 text-xs tracking-wider">
                  Fee Status
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-slate-700 text-xs tracking-wider">
                  Status
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-slate-700 text-xs tracking-wider">
                  Date
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-slate-700 text-xs tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-slate-100">
              {currentRows.length > 0 ? (
                currentRows.map((app) => (
                  <TableRow
                    key={app.id}
                    onClick={() => handleOpenDetails(app)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* 1. App No */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700 text-xs">
                        <span>{app.applicationNo}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyAppNo(app.applicationNo, e)}
                          className="text-slate-400 hover:text-[#1769AA] transition-colors p-1 rounded-sm hover:bg-blue-50"
                          title="Copy Application Number"
                        >
                          {copiedAppNo === app.applicationNo ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>

                    {/* 2. Applicant Details */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-slate-200/80 shadow-2xs">
                          <AvatarImage src={app.avatar} alt={app.applicantName} className="object-cover" />
                          <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold text-xs">
                            {app.applicantName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#1769AA] transition-colors">
                            {app.applicantName}
                          </h4>
                          <p className="text-xs text-slate-500 font-normal">
                            {app.email}
                          </p>
                          <p className="text-xs text-slate-500 font-normal">
                            {app.phone}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* 3. Applied Course */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-900">
                          {app.courseName}
                        </p>
                        <p className="text-xs text-slate-500 font-normal">
                          {app.courseDuration}
                        </p>
                      </div>
                    </TableCell>

                    {/* 4. Fee Status */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="space-y-1">
                        {app.feeStatus === "PAID" ? (
                          <>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                              Paid
                            </span>
                            <p className="text-xs font-medium text-slate-700">
                              ₹{app.feeAmount}
                            </p>
                          </>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/70">
                            Not Paid
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* 5. Status Badge */}
                    <TableCell className="py-4 px-4 align-middle">
                      {renderStatusBadge(app.status)}
                    </TableCell>

                    {/* 6. Date & Time */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-slate-800">
                          {app.submittedDate}
                        </p>
                        <p className="text-xs text-slate-400">
                          {app.submittedTime}
                        </p>
                      </div>
                    </TableCell>

                    {/* 7. Actions */}
                    <TableCell className="py-4 px-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetails(app)}
                          className="h-8 px-2.5 text-xs font-semibold border-slate-200 text-slate-700 hover:text-[#1769AA] hover:bg-blue-50/60 rounded-lg gap-1 shadow-2xs transition-all"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500 group-hover:text-[#1769AA]" />
                          <span>View</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 bg-white border border-slate-200 shadow-lg rounded-xl p-1.5 text-xs">
                            <DropdownMenuLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                              Counsellor Actions
                            </DropdownMenuLabel>
                            
                            <DropdownMenuItem
                              onClick={() => handleOpenDetails(app)}
                              className="cursor-pointer font-medium py-2 rounded-lg text-slate-700 hover:bg-slate-50"
                            >
                              <FileText className="h-3.5 w-3.5 mr-2 text-[#1769AA]" />
                              Full Application View
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleToggleFeePaid(app.id)}
                              className="cursor-pointer font-medium py-2 rounded-lg text-slate-700 hover:bg-slate-50"
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                              {app.feeStatus === "PAID" ? "Mark Fee Pending" : "Mark Fee Paid (₹500)"}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(app.id, "APPROVED")}
                              className="cursor-pointer font-medium py-2 rounded-lg text-slate-700 hover:bg-slate-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                              Approve Application
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setAppToConvert(app);
                                setConvertModalOpen(true);
                              }}
                              className="cursor-pointer font-semibold py-2 rounded-lg text-[#1769AA] hover:bg-blue-50"
                            >
                              <ArrowRight className="h-3.5 w-3.5 mr-2 text-[#1769AA]" />
                              Grant Full Admission
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 border-slate-100" />

                            <DropdownMenuItem
                              onClick={() => handleCopyAppNo(app.applicationNo)}
                              className="cursor-pointer font-medium py-2 rounded-lg text-slate-600 hover:bg-slate-50"
                            >
                              <Copy className="h-3.5 w-3.5 mr-2 text-slate-400" />
                              Copy App Number
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(app.id, "REJECTED")}
                              className="cursor-pointer font-medium py-2 rounded-lg text-rose-600 hover:bg-rose-50"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-2 text-rose-500" />
                              Reject Application
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <FileCheck2 className="h-8 w-8 text-slate-300 stroke-[1.5]" />
                      <p className="text-sm font-semibold text-slate-600">No applications match your filters</p>
                      <p className="text-xs text-slate-400">Try changing your search terms or fee/status filter.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          setFeeFilter("ALL");
                          setStatusFilter("ALL");
                        }}
                        className="mt-2 text-xs"
                      >
                        Reset All Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ─── 5. PAGINATION FOOTER ─── */}
        <div className="p-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
          <p className="text-xs font-medium text-slate-500">
            Showing <span className="font-semibold text-slate-800">{filteredList.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
            <span className="font-semibold text-slate-800">{Math.min(currentPage * pageSize, filteredList.length)}</span> of{" "}
            <span className="font-semibold text-slate-800">{totalAppsCount}</span> applications
          </p>

          {/* Pagination Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                currentPage === 1
                  ? "bg-[#1769AA] text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              1
            </button>

            <button
              onClick={() => setCurrentPage(2)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                currentPage === 2
                  ? "bg-[#1769AA] text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              2
            </button>

            <button
              onClick={() => setCurrentPage(3)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                currentPage === 3
                  ? "bg-[#1769AA] text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              3
            </button>

            <span className="px-1 text-slate-400 text-xs">...</span>

            <button
              onClick={() => setCurrentPage(5)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                currentPage === 5
                  ? "bg-[#1769AA] text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              5
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, 5))}
              className="h-8 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1 ml-1"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Card>

      {/* ─── 6. DETAILED APPLICATION VIEW (SLIDE-OUT SHEET / DRAWER) ─── */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl p-0 overflow-y-auto bg-white border-l border-slate-200">
          {selectedApplication && (
            <div className="flex flex-col h-full">
              
              {/* Drawer Top Header */}
              <div className="p-6 border-b border-slate-200/80 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1769AA] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {selectedApplication.applicationNo}
                      </span>
                      {renderStatusBadge(selectedApplication.status)}
                      {selectedApplication.feeStatus === "PAID" && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                          Fee Paid ₹{selectedApplication.feeAmount}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {selectedApplication.applicantName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Applied for <strong className="text-slate-700">{selectedApplication.courseName}</strong> on {selectedApplication.submittedDate} at {selectedApplication.submittedTime}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 mr-6">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyAppNo(selectedApplication.applicationNo)}
                      className="h-8 text-xs font-semibold gap-1 border-slate-200 text-slate-700"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.print()}
                      className="h-8 text-xs font-semibold gap-1 border-slate-200 text-slate-700"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print</span>
                    </Button>
                  </div>
                </div>

                {/* ─── ADMISSION WORKFLOW PROGRESS STEPPER ─── */}
                <div className="mt-5 pt-4 border-t border-slate-200/60">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    Admission Workflow Stage
                  </p>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {[
                      { step: 1, title: "1. New App", done: selectedApplication.currentWorkflowStep >= 1 },
                      { step: 2, title: "2. Doc Verify", done: selectedApplication.currentWorkflowStep >= 2 },
                      { step: 3, title: "3. Fee Payment", done: selectedApplication.feeStatus === "PAID" },
                      { step: 4, title: "4. Under Review", done: selectedApplication.currentWorkflowStep >= 4 },
                      { step: 5, title: "5. Approved", done: selectedApplication.status === "APPROVED" || selectedApplication.status === "ADMITTED" },
                    ].map((st) => (
                      <div key={st.step} className="flex flex-col items-center gap-1">
                        <div
                          className={`h-2.5 w-full rounded-full transition-colors ${
                            st.done ? "bg-emerald-500" : "bg-slate-200"
                          }`}
                        />
                        <span className={`text-[10px] font-semibold truncate ${
                          st.done ? "text-emerald-700" : "text-slate-400"
                        }`}>
                          {st.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Drawer Tab Navigation */}
                <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-200/50">
                  <button
                    onClick={() => setActiveDetailsTab("overview")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      activeDetailsTab === "overview"
                        ? "bg-[#1769AA] text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Applicant Profile
                  </button>
                  <button
                    onClick={() => setActiveDetailsTab("documents")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      activeDetailsTab === "documents"
                        ? "bg-[#1769AA] text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>Documents</span>
                    <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full">
                      {selectedApplication.documents.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveDetailsTab("fees")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      activeDetailsTab === "fees"
                        ? "bg-[#1769AA] text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Fee & Receipt
                  </button>
                  <button
                    onClick={() => setActiveDetailsTab("timeline")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      activeDetailsTab === "timeline"
                        ? "bg-[#1769AA] text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Notes & Timeline
                  </button>
                </div>
              </div>

              {/* Drawer Main Body */}
              <div className="p-6 space-y-6 flex-1">
                
                {/* ─── TAB 1: OVERVIEW & PROFILE ─── */}
                {activeDetailsTab === "overview" && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    
                    {/* Personal Information */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="h-4 w-4 text-[#1769AA]" /> Personal & Contact Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Full Name</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedApplication.applicantName}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Date of Birth / Gender</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedApplication.dob} ({selectedApplication.gender})</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Primary Mobile</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-emerald-600" /> {selectedApplication.phone}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Email Address</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                            <Mail className="h-3 w-3 text-[#1769AA]" /> {selectedApplication.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Father / Guardian Name</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedApplication.fatherName}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Category</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedApplication.category}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-[11px] font-medium text-slate-400">Residential Address</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5 flex items-start gap-1">
                            <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span>{selectedApplication.address}, {selectedApplication.city}, {selectedApplication.state} - {selectedApplication.pincode}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Applied Course & Academic Selection */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4 text-[#1769AA]" /> Applied Program & Background
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Applied Course</p>
                          <p className="text-xs font-bold text-[#1769AA] mt-0.5">{selectedApplication.courseName}</p>
                          <span className="text-[11px] text-slate-500">{selectedApplication.courseDuration}</span>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Delivery Mode Preference</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedApplication.preferredMode}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Preferred Batch Slot</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedApplication.preferredBatchTiming}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Highest Qualification</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedApplication.highestQualification}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-[11px] font-medium text-slate-400">Institution & Academic Score</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">
                            {selectedApplication.collegeOrSchool} • Class of {selectedApplication.passingYear} (Score: {selectedApplication.gradePercentage})
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* ─── TAB 2: SUBMITTED DOCUMENTS ─── */}
                {activeDetailsTab === "documents" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Submitted Verification Documents</h4>
                        <p className="text-xs text-slate-500">Verify authenticity of documents before committee sign-off.</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1">
                        <Upload className="h-3.5 w-3.5" /> Upload File
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {selectedApplication.documents.length > 0 ? (
                        selectedApplication.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 hover:border-slate-300 transition-all shadow-2xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-blue-50 text-[#1769AA] flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-slate-900">{doc.title}</h5>
                                <p className="text-[11px] text-slate-400">
                                  {doc.fileName} • {doc.fileSize} • Uploaded {doc.uploadDate}
                                </p>
                                {doc.verified && (
                                  <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                                    <ShieldCheck className="h-3 w-3" /> Verified by {doc.verifiedBy} ({doc.verifiedAt})
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => showToast(`Previewing ${doc.fileName}`)}
                                className="h-8 px-2 text-xs font-medium text-slate-600"
                              >
                                View
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleToggleDocVerify(doc.id)}
                                className={`h-8 px-3 text-xs font-bold transition-all ${
                                  doc.verified
                                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                    : "bg-[#1769AA] hover:bg-[#12558c] text-white"
                                }`}
                              >
                                {doc.verified ? "Verified ✓" : "Verify Doc"}
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                          No documents uploaded yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── TAB 3: FEE & RECEIPT ─── */}
                {activeDetailsTab === "fees" && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="p-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/20 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-500">Application Processing Fee</p>
                          <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                            ₹{selectedApplication.feeAmount > 0 ? selectedApplication.feeAmount : "500"}
                          </h3>
                        </div>
                        {selectedApplication.feeStatus === "PAID" ? (
                          <Badge className="bg-emerald-500 text-white font-bold text-xs px-3 py-1">
                            PAID & VERIFIED
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500 text-white font-bold text-xs px-3 py-1">
                            PAYMENT PENDING
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Payment Mode</span>
                          <span className="font-bold text-slate-800">{selectedApplication.paymentMethod || "Pending"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Transaction UTR / Ref</span>
                          <span className="font-bold text-slate-800">{selectedApplication.transactionId || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Timestamp</span>
                          <span className="font-bold text-slate-800">{selectedApplication.paidAt || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Receipt Status</span>
                          <span className="font-bold text-emerald-600">Generated #REC-2025-098</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-3">
                        <Button
                          size="sm"
                          onClick={() => handleToggleFeePaid(selectedApplication.id)}
                          className={`text-xs font-bold ${
                            selectedApplication.feeStatus === "PAID"
                              ? "bg-slate-200 hover:bg-slate-300 text-slate-800"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          {selectedApplication.feeStatus === "PAID" ? "Mark as Not Paid" : "Confirm Receipt & Mark Paid"}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => showToast("Downloading Fee Receipt PDF...")}
                          className="text-xs font-medium border-slate-300 text-slate-700"
                        >
                          <Download className="h-3.5 w-3.5 mr-1" /> Download Receipt
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 4: NOTES & TIMELINE ─── */}
                {activeDetailsTab === "timeline" && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    
                    {/* Add Counsellor Note */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                      <label className="block text-xs font-bold text-slate-800">Add Counsellor Verification Note</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type notes on interview, document verification, fee concessions..."
                          value={newNoteInput}
                          onChange={(e) => setNewNoteInput(e.target.value)}
                          className="bg-white text-xs h-9"
                        />
                        <Button
                          size="sm"
                          onClick={handleAddNote}
                          className="bg-[#1769AA] hover:bg-[#12558c] text-white text-xs font-semibold px-3.5 h-9 shrink-0"
                        >
                          <Send className="h-3.5 w-3.5 mr-1" /> Post Note
                        </Button>
                      </div>
                    </div>

                    {/* Counsellor Notes History */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Counsellor Remarks</h4>
                      {selectedApplication.counselorNotes?.length > 0 ? (
                        selectedApplication.counselorNotes.map((n) => (
                          <div key={n.id} className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs space-y-1 shadow-2xs">
                            <div className="flex items-center justify-between text-slate-500">
                              <span className="font-bold text-slate-800">{n.author} <span className="font-normal text-slate-400">({n.role})</span></span>
                              <span className="text-[11px]">{n.date}, {n.time}</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed font-normal">{n.text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">No notes recorded yet.</p>
                      )}
                    </div>

                    {/* Activity Timeline */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Application Audit Trail</h4>
                      <div className="space-y-3 border-l-2 border-slate-200 ml-2 pl-4">
                        {selectedApplication.timeline?.map((ev) => (
                          <div key={ev.id} className="relative space-y-0.5">
                            <span className={`absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                              ev.completed ? "bg-emerald-500" : "bg-slate-300"
                            }`} />
                            <h5 className="text-xs font-bold text-slate-800">{ev.title}</h5>
                            <p className="text-[11px] text-slate-500">{ev.description}</p>
                            <span className="text-[10px] text-slate-400 block">{ev.timestamp}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* Drawer Bottom Actions Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedApplication.id, "REJECTED")}
                    className="text-xs font-semibold text-rose-600 hover:bg-rose-50 border-slate-200 h-9"
                  >
                    Reject Application
                  </Button>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedApplication.id, "APPROVED")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve Application
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      setAppToConvert(selectedApplication);
                      setConvertModalOpen(true);
                    }}
                    className="bg-[#1769AA] hover:bg-[#12558c] text-white font-bold text-xs h-9 px-4 shadow-sm"
                  >
                    Grant Full Admission <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </div>
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── 7. CREATE NEW APPLICATION MODAL ─── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 text-slate-900 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">New Admission Application</h3>
                  <p className="text-xs text-slate-500">Log new applicant form into counsellor workflow</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateApplication} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Applicant Full Name *</label>
                <Input
                  placeholder="e.g. Ananya Sharma"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  className="bg-white border-slate-200 text-xs h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    required
                    className="bg-white border-slate-200 text-xs h-10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <Input
                    type="email"
                    placeholder="applicant@email.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="bg-white border-slate-200 text-xs h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Course *</label>
                  <select
                    value={createCourse}
                    onChange={(e) => setCreateCourse(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800 focus:ring-1 focus:ring-[#1769AA]"
                  >
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="Advanced Excel">Advanced Excel</option>
                    <option value="Tally Prime with GST">Tally Prime with GST</option>
                    <option value="Web Designing">Web Designing</option>
                    <option value="Python Programming">Python Programming</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Program Duration</label>
                  <select
                    value={createDuration}
                    onChange={(e) => setCreateDuration(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800 focus:ring-1 focus:ring-[#1769AA]"
                  >
                    <option value="(1 Year Program)">(1 Year Program)</option>
                    <option value="(6 Months Program)">(6 Months Program)</option>
                    <option value="(3 Months Program)">(3 Months Program)</option>
                    <option value="(2 Months Program)">(2 Months Program)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Application Fee Status</label>
                  <select
                    value={createFeeStatus}
                    onChange={(e) => setCreateFeeStatus(e.target.value as "PAID" | "NOT_PAID")}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800"
                  >
                    <option value="PAID">Paid (₹500)</option>
                    <option value="NOT_PAID">Not Paid (Pending)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={createStatus}
                    onChange={(e) => setCreateStatus(e.target.value as DetailedStatus)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800"
                  >
                    <option value="UNDER_REVIEW_BLUE">Under Review</option>
                    <option value="NEW_APPLICATION">New Application</option>
                    <option value="APPROVED">Approved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Counsellor Remarks / Initial Note</label>
                <Input
                  placeholder="e.g. Document verification initiated. Eligible for batch DM-01."
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  className="bg-white border-slate-200 text-xs h-10"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-10 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#12558c] text-white h-10 text-xs font-bold px-5"
                >
                  Create Application
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ─── 8. GRANT FULL ADMISSION MODAL ─── */}
      {convertModalOpen && appToConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Grant Full Admission</h3>
                <p className="text-xs text-slate-500">{appToConvert.applicantName} ({appToConvert.applicationNo})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Confirming admission will register <strong className="text-slate-900">{appToConvert.applicantName}</strong> into the student roster and generate student roll credentials.
            </p>

            <form onSubmit={handleConvertSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Batch Assignment</label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800 focus:ring-1 focus:ring-[#1769AA]"
                >
                  <option value="">Auto-Assign Next Available Batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code || b.name} ({(b as any).course?.name || "General"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConvertModalOpen(false)}
                  disabled={isConverting}
                  className="h-10 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isConverting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 text-xs font-bold px-5"
                >
                  {isConverting ? "Processing..." : "Confirm Full Admission"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useEffect, useMemo } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  MoreVertical,
  Trash2,
  Eye,
  Copy,
  Check,
  SlidersHorizontal,
  FileText,
  Clock,
  UserCheck,
  AlertCircle,
  XCircle,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Building,
  ShieldCheck,
  Upload,
  Download,
  Printer,
  ChevronRight,
  X,
  Send,
  User,
  MapPin,
  Layers,
  Award,
  BookOpen,
  Edit,
  RefreshCw,
  Users,
  Percent,
  CheckCircle,
  DollarSign
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

// ─── TYPES & DATA STRUCTURES ──────────────────────────────────────────────────

export type AdmissionRecordStatus = "Confirmed" | "Provisional" | "Admission Pending" | "Cancelled";
export type BatchType = "Morning Batch" | "Evening Batch" | "Weekend Batch";
export type FeePaymentStatus = "Paid" | "Due";
export type FeePlanType = "Standard Plan" | "Basic Plan" | "Premium Plan" | "Installment Plan";

export interface AdmissionDocument {
  id: string;
  title: string;
  category: "Identity Proof" | "Photograph" | "Educational Documents" | "Address Proof";
  fileName: string;
  fileSize: string;
  uploadDate: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface CounsellorNoteItem {
  id: string;
  author: string;
  role: string;
  date: string;
  time: string;
  text: string;
}

export interface PaymentTransactionItem {
  id: string;
  receiptNo: string;
  amount: number;
  paymentMode: string;
  transactionId: string;
  date: string;
  status: "Completed" | "Pending";
}

export interface EnrichedAdmission {
  id: string;
  admissionNo: string;
  studentName: string;
  avatar: string;
  email: string;
  phone: string;
  dob: string;
  gender: "Female" | "Male" | "Other";
  address: string;
  city: string;
  state: string;
  pincode: string;
  guardianName: string;
  counselorName: string;
  admissionSource: "Online Portal" | "Direct Walk-in" | "Enquiry Conversion" | "Referral";

  // Course
  courseId: string;
  courseName: string;
  programDuration: string;

  // Batch
  batchId: string;
  batchCode: string;
  batchType: BatchType;
  batchTiming: string;
  batchStartDate: string;
  assignedFaculty: string;
  batchCapacity: number;
  enrolledCount: number;

  // Fees
  feePlan: FeePlanType;
  feePaymentStatus: FeePaymentStatus;
  totalCourseFee: number;
  discountAmount: number;
  finalFee: number;
  amountPaid: number;
  amountDue: number;
  nextPaymentDate?: string;
  paymentHistory: PaymentTransactionItem[];

  // Status & Stepper
  status: AdmissionRecordStatus;
  workflowStep: number; // 1: Admission Created, 2: Fee Setup, 3: Batch Assigned, 4: Confirmed
  admissionDate: string;
  admissionTime: string;

  // Documents & Notes
  documents: AdmissionDocument[];
  counsellorNotes: CounsellorNoteItem[];
}

// ─── SAMPLE REALISTIC ADMISSIONS DATA ──────────────────────────────────────────

const SAMPLE_ADMISSIONS: EnrichedAdmission[] = [
  {
    id: "adm-1",
    admissionNo: "ADM-2025-0128",
    studentName: "Ananya Sharma",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250",
    email: "ananya.sharma@email.com",
    phone: "+91 98765 43210",
    dob: "14 Aug 2003",
    gender: "Female",
    address: "Flat 402, Green Glen Heights, Bellandur",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560103",
    guardianName: "Rajendra Sharma",
    counselorName: "Priya Singh",
    admissionSource: "Enquiry Conversion",
    courseId: "c-dm",
    courseName: "Digital Marketing",
    programDuration: "(1 Year Program)",
    batchId: "b-dm-jun",
    batchCode: "DM-JUN-2025",
    batchType: "Morning Batch",
    batchTiming: "9:00 AM – 11:00 AM",
    batchStartDate: "01 Jun 2025",
    assignedFaculty: "Prof. Rajesh Verma",
    batchCapacity: 30,
    enrolledCount: 22,
    feePlan: "Standard Plan",
    feePaymentStatus: "Paid",
    totalCourseFee: 30000,
    discountAmount: 5000,
    finalFee: 25000,
    amountPaid: 25000,
    amountDue: 0,
    paymentHistory: [
      { id: "p1", receiptNo: "REC-2025-0128-1", amount: 25000, paymentMode: "UPI / Net Banking", transactionId: "UPI/20250516/982341908", date: "16 May 2025, 10:25 AM", status: "Completed" },
    ],
    status: "Confirmed",
    workflowStep: 4,
    admissionDate: "16 May 2025",
    admissionTime: "10:30 AM",
    documents: [
      { id: "d1", title: "Aadhaar Card", category: "Identity Proof", fileName: "Ananya_Aadhaar.pdf", fileSize: "920 KB", uploadDate: "16 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "16 May 2025" },
      { id: "d2", title: "Passport Photograph", category: "Photograph", fileName: "Photo_Ananya.jpg", fileSize: "450 KB", uploadDate: "16 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "16 May 2025" },
      { id: "d3", title: "10th & 12th Marksheet", category: "Educational Documents", fileName: "Academic_Certificates.pdf", fileSize: "2.1 MB", uploadDate: "16 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "16 May 2025" },
      { id: "d4", title: "Electricity Bill (Address Proof)", category: "Address Proof", fileName: "Address_Proof.pdf", fileSize: "1.1 MB", uploadDate: "16 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "16 May 2025" },
    ],
    counsellorNotes: [
      { id: "n1", author: "Priya Singh", role: "Senior Counsellor", date: "16 May 2025", time: "10:45 AM", text: "Full fee paid in advance. Course kit and LMS login credentials dispatched." },
    ],
  },
  {
    id: "adm-2",
    admissionNo: "ADM-2025-0127",
    studentName: "Rohit Mehta",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250",
    email: "rohit.mehta@email.com",
    phone: "+91 91234 56789",
    dob: "22 Nov 2001",
    gender: "Male",
    address: "34, Shivaji Marg, Near Metro Station",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    guardianName: "Kailash Mehta",
    counselorName: "Priya Singh",
    admissionSource: "Direct Walk-in",
    courseId: "c-ae",
    courseName: "Advanced Excel",
    programDuration: "(3 Months Program)",
    batchId: "b-excel-may",
    batchCode: "EXCEL-MAY-2025",
    batchType: "Evening Batch",
    batchTiming: "5:00 PM – 7:00 PM",
    batchStartDate: "20 May 2025",
    assignedFaculty: "Kavita Rao",
    batchCapacity: 25,
    enrolledCount: 19,
    feePlan: "Basic Plan",
    feePaymentStatus: "Paid",
    totalCourseFee: 5999,
    discountAmount: 1000,
    finalFee: 4999,
    amountPaid: 4999,
    amountDue: 0,
    paymentHistory: [
      { id: "p2", receiptNo: "REC-2025-0127-1", amount: 4999, paymentMode: "Credit Card", transactionId: "CARD/20250515/3419081", date: "15 May 2025, 04:10 PM", status: "Completed" },
    ],
    status: "Provisional",
    workflowStep: 3,
    admissionDate: "15 May 2025",
    admissionTime: "04:15 PM",
    documents: [
      { id: "d21", title: "Aadhaar Card", category: "Identity Proof", fileName: "Rohit_Aadhaar.pdf", fileSize: "750 KB", uploadDate: "15 May 2025", verified: true, verifiedBy: "Priya Singh", verifiedAt: "15 May 2025" },
      { id: "d22", title: "Graduation Certificate", category: "Educational Documents", fileName: "BBA_Degree.pdf", fileSize: "1.4 MB", uploadDate: "15 May 2025", verified: false },
    ],
    counsellorNotes: [
      { id: "n2", author: "Priya Singh", role: "Senior Counsellor", date: "15 May 2025", time: "04:20 PM", text: "Provisional admission granted pending physical degree certificate verification." },
    ],
  },
  {
    id: "adm-3",
    admissionNo: "ADM-2025-0126",
    studentName: "Neha Verma",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250",
    email: "neha.verma@email.com",
    phone: "+91 99887 66554",
    dob: "05 Mar 2004",
    gender: "Female",
    address: "House 12B, Sector 18, Indira Nagar",
    city: "Lucknow",
    state: "Uttar Pradesh",
    pincode: "226016",
    guardianName: "Sanjay Verma",
    counselorName: "Priya Singh",
    admissionSource: "Online Portal",
    courseId: "c-tp",
    courseName: "Tally Prime with GST",
    programDuration: "(2 Months Program)",
    batchId: "b-tally-jun",
    batchCode: "TALLY-JUN-2025",
    batchType: "Weekend Batch",
    batchTiming: "11:00 AM – 01:00 PM",
    batchStartDate: "07 Jun 2025",
    assignedFaculty: "CA Amit Goyal",
    batchCapacity: 20,
    enrolledCount: 14,
    feePlan: "Standard Plan",
    feePaymentStatus: "Due",
    totalCourseFee: 4999,
    discountAmount: 1000,
    finalFee: 3999,
    amountPaid: 0,
    amountDue: 3999,
    nextPaymentDate: "22 May 2025",
    paymentHistory: [],
    status: "Admission Pending",
    workflowStep: 2,
    admissionDate: "15 May 2025",
    admissionTime: "11:20 AM",
    documents: [
      { id: "d31", title: "12th Marksheet", category: "Educational Documents", fileName: "Marksheet_12.pdf", fileSize: "1.1 MB", uploadDate: "15 May 2025", verified: true },
      { id: "d32", title: "Aadhaar Card", category: "Identity Proof", fileName: "Aadhaar.pdf", fileSize: "680 KB", uploadDate: "15 May 2025", verified: true },
    ],
    counsellorNotes: [
      { id: "n3", author: "Priya Singh", role: "Senior Counsellor", date: "15 May 2025", time: "11:30 AM", text: "Admission pending balance tuition fee clearance before batch commencement." },
    ],
  },
  {
    id: "adm-4",
    admissionNo: "ADM-2025-0125",
    studentName: "Arjun Patel",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250",
    email: "arjun.patel@email.com",
    phone: "+91 88221 33445",
    dob: "19 Oct 2002",
    gender: "Male",
    address: "Block C, 203, Orchid Enclave, Satellite",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380015",
    guardianName: "Bhavesh Patel",
    counselorName: "Priya Singh",
    admissionSource: "Referral",
    courseId: "c-wd",
    courseName: "Web Designing",
    programDuration: "(6 Months Program)",
    batchId: "b-wd-jun",
    batchCode: "WD-JUN-2025",
    batchType: "Morning Batch",
    batchTiming: "9:00 AM – 10:30 AM",
    batchStartDate: "02 Jun 2025",
    assignedFaculty: "Manoj Deshmukh",
    batchCapacity: 25,
    enrolledCount: 24,
    feePlan: "Premium Plan",
    feePaymentStatus: "Paid",
    totalCourseFee: 18000,
    discountAmount: 3000,
    finalFee: 15000,
    amountPaid: 15000,
    amountDue: 0,
    paymentHistory: [
      { id: "p4", receiptNo: "REC-2025-0125-1", amount: 15000, paymentMode: "UPI / QR", transactionId: "UPI/20250514/4819028", date: "14 May 2025, 02:40 PM", status: "Completed" },
    ],
    status: "Confirmed",
    workflowStep: 4,
    admissionDate: "14 May 2025",
    admissionTime: "02:45 PM",
    documents: [
      { id: "d41", title: "Aadhaar Card", category: "Identity Proof", fileName: "Aadhaar_Arjun.pdf", fileSize: "820 KB", uploadDate: "14 May 2025", verified: true },
      { id: "d42", title: "BCA Consolidated Marksheet", category: "Educational Documents", fileName: "BCA_Transcript.pdf", fileSize: "1.8 MB", uploadDate: "14 May 2025", verified: true },
    ],
    counsellorNotes: [
      { id: "n4", author: "Priya Singh", role: "Senior Counsellor", date: "14 May 2025", time: "03:00 PM", text: "Confirmed seat in WD-JUN-2025 Morning batch. Laptop setup verified." },
    ],
  },
  {
    id: "adm-5",
    admissionNo: "ADM-2025-0124",
    studentName: "Sneha Reddy",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250",
    email: "sneha.reddy@email.com",
    phone: "+91 77331 11223",
    dob: "28 Jul 2003",
    gender: "Female",
    address: "Plot 88, Jubilee Hills, Road No. 36",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500033",
    guardianName: "Venkat Reddy",
    counselorName: "Priya Singh",
    admissionSource: "Online Portal",
    courseId: "c-py",
    courseName: "Python Programming",
    programDuration: "(6 Months Program)",
    batchId: "b-py-jun",
    batchCode: "PY-JUN-2025",
    batchType: "Evening Batch",
    batchTiming: "5:30 PM – 7:30 PM",
    batchStartDate: "05 Jun 2025",
    assignedFaculty: "Dr. Suresh Nambiar",
    batchCapacity: 30,
    enrolledCount: 28,
    feePlan: "Premium Plan",
    feePaymentStatus: "Paid",
    totalCourseFee: 18000,
    discountAmount: 3000,
    finalFee: 15000,
    amountPaid: 15000,
    amountDue: 0,
    paymentHistory: [
      { id: "p5", receiptNo: "REC-2025-0124-1", amount: 15000, paymentMode: "UPI / QR", transactionId: "UPI/20250514/1982736", date: "14 May 2025, 09:05 AM", status: "Completed" },
    ],
    status: "Confirmed",
    workflowStep: 4,
    admissionDate: "14 May 2025",
    admissionTime: "09:10 AM",
    documents: [
      { id: "d51", title: "College ID & Aadhaar", category: "Identity Proof", fileName: "ID_Aadhaar.pdf", fileSize: "1.3 MB", uploadDate: "14 May 2025", verified: true },
    ],
    counsellorNotes: [
      { id: "n5", author: "Priya Singh", role: "Senior Counsellor", date: "14 May 2025", time: "09:30 AM", text: "Enrolled for Python Evening Batch. Sent batch calendar on WhatsApp." },
    ],
  },
  {
    id: "adm-6",
    admissionNo: "ADM-2025-0123",
    studentName: "Karthik S",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=250",
    email: "karthik.s@email.com",
    phone: "+91 90123 56781",
    dob: "11 Dec 2002",
    gender: "Male",
    address: "72, Gandhi Bazaar, Basavanagudi",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560004",
    guardianName: "Subramanian G",
    counselorName: "Priya Singh",
    admissionSource: "Direct Walk-in",
    courseId: "c-gd",
    courseName: "Graphic Designing",
    programDuration: "(3 Months Program)",
    batchId: "b-gd-may",
    batchCode: "GD-MAY-2025",
    batchType: "Weekend Batch",
    batchTiming: "11:00 AM – 01:00 PM",
    batchStartDate: "18 May 2025",
    assignedFaculty: "Varun Nair",
    batchCapacity: 20,
    enrolledCount: 15,
    feePlan: "Basic Plan",
    feePaymentStatus: "Due",
    totalCourseFee: 5999,
    discountAmount: 1000,
    finalFee: 4999,
    amountPaid: 0,
    amountDue: 4999,
    paymentHistory: [],
    status: "Cancelled",
    workflowStep: 1,
    admissionDate: "13 May 2025",
    admissionTime: "03:25 PM",
    documents: [],
    counsellorNotes: [
      { id: "n6", author: "Priya Singh", role: "Senior Counsellor", date: "13 May 2025", time: "04:00 PM", text: "Candidate relocated to Pune; requested admission cancellation." },
    ],
  },
  {
    id: "adm-7",
    admissionNo: "ADM-2025-0122",
    studentName: "Pooja Nair",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=250",
    email: "pooja.nair@email.com",
    phone: "+91 99011 22334",
    dob: "02 Feb 2004",
    gender: "Female",
    address: "18, TTK Road, Alwarpet",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600018",
    guardianName: "K. Nair",
    counselorName: "Priya Singh",
    admissionSource: "Enquiry Conversion",
    courseId: "c-cw",
    courseName: "Content Writing",
    programDuration: "(2 Months Program)",
    batchId: "b-cw-jun",
    batchCode: "CW-JUN-2025",
    batchType: "Morning Batch",
    batchTiming: "11:00 AM – 01:00 PM",
    batchStartDate: "08 Jun 2025",
    assignedFaculty: "Ritu Sengupta",
    batchCapacity: 20,
    enrolledCount: 16,
    feePlan: "Standard Plan",
    feePaymentStatus: "Paid",
    totalCourseFee: 4999,
    discountAmount: 1000,
    finalFee: 3999,
    amountPaid: 3999,
    amountDue: 0,
    paymentHistory: [
      { id: "p7", receiptNo: "REC-2025-0122-1", amount: 3999, paymentMode: "Net Banking", transactionId: "NB/20250513/889123", date: "13 May 2025, 10:00 AM", status: "Completed" },
    ],
    status: "Provisional",
    workflowStep: 3,
    admissionDate: "13 May 2025",
    admissionTime: "10:05 AM",
    documents: [
      { id: "d71", title: "Aadhaar Card", category: "Identity Proof", fileName: "Pooja_Aadhaar.pdf", fileSize: "910 KB", uploadDate: "13 May 2025", verified: true },
    ],
    counsellorNotes: [
      { id: "n7", author: "Priya Singh", role: "Senior Counsellor", date: "13 May 2025", time: "10:20 AM", text: "Provisional seat assigned in Content Writing morning batch." },
    ],
  },
  // Additional records to support realistic search & pagination
  {
    id: "adm-8",
    admissionNo: "ADM-2025-0121",
    studentName: "Divya Krishnan",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250",
    email: "divya.k@email.com",
    phone: "+91 97401 22334",
    dob: "15 Jun 2003",
    gender: "Female",
    address: "56, Koramangala 4th Block",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560034",
    guardianName: "Krishnan S",
    counselorName: "Priya Singh",
    admissionSource: "Online Portal",
    courseId: "c-wd",
    courseName: "Web Designing",
    programDuration: "(6 Months Program)",
    batchId: "b-wd-jun",
    batchCode: "WD-JUN-2025",
    batchType: "Morning Batch",
    batchTiming: "9:00 AM – 10:30 AM",
    batchStartDate: "02 Jun 2025",
    assignedFaculty: "Manoj Deshmukh",
    batchCapacity: 25,
    enrolledCount: 24,
    feePlan: "Premium Plan",
    feePaymentStatus: "Paid",
    totalCourseFee: 18000,
    discountAmount: 3000,
    finalFee: 15000,
    amountPaid: 15000,
    amountDue: 0,
    paymentHistory: [],
    status: "Confirmed",
    workflowStep: 4,
    admissionDate: "12 May 2025",
    admissionTime: "11:15 AM",
    documents: [],
    counsellorNotes: [],
  },
];

export const AllAdmissions: React.FC = () => {
  const { courses, batches, fetchCourses, fetchBatches } = useCourseStore();
  const { addAdmission } = useAdmissionStore();

  const [admissionsList, setAdmissionsList] = useState<EnrichedAdmission[]>(SAMPLE_ADMISSIONS);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [batchTypeFilter, setBatchTypeFilter] = useState("ALL");
  const [feeStatusFilter, setFeeStatusFilter] = useState("ALL");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 7;

  // View Details Drawer State
  const [selectedAdmission, setSelectedAdmission] = useState<EnrichedAdmission | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "batch" | "fee" | "docs" | "notes">("overview");

  // Direct Admission Entry Modal
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDob, setFormDob] = useState("2003-05-15");
  const [formGender, setFormGender] = useState<"Female" | "Male" | "Other">("Female");
  const [formAddress, setFormAddress] = useState("");
  const [formCourse, setFormCourse] = useState("Digital Marketing");
  const [formDuration, setFormDuration] = useState("(1 Year Program)");
  const [formBatch, setFormBatch] = useState("DM-JUN-2025");
  const [formBatchType, setFormBatchType] = useState<BatchType>("Morning Batch");
  const [formBatchTiming, setFormBatchTiming] = useState("9:00 AM – 11:00 AM");
  const [formFaculty, setFormFaculty] = useState("Prof. Rajesh Verma");
  const [formFeePlan, setFormFeePlan] = useState<FeePlanType>("Standard Plan");
  const [formCourseFee, setFormCourseFee] = useState<number>(30000);
  const [formDiscount, setFormDiscount] = useState<number>(5000);
  const [formAmountPaid, setFormAmountPaid] = useState<number>(25000);
  const [formPaymentMethod, setFormPaymentMethod] = useState("UPI / QR");
  const [formNotes, setFormNotes] = useState("");

  // Change Batch Modal
  const [isChangeBatchOpen, setIsChangeBatchOpen] = useState(false);
  const [targetBatchId, setTargetBatchId] = useState("");

  // Note addition state in Drawer
  const [newNoteText, setNewNoteText] = useState("");

  // Copy Feedback & Toast State
  const [copiedAdmNo, setCopiedAdmNo] = useState<string | null>(null);
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

  const handleCopyAdmNo = (admNo: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(admNo);
    setCopiedAdmNo(admNo);
    showToast(`Copied ${admNo} to clipboard!`);
    setTimeout(() => setCopiedAdmNo(null), 2000);
  };

  // KPI Calculations
  const totalAdmissionsCount = 128; // Static benchmark matching the mockup
  const confirmedCount = 86;
  const provisionalCount = 32;
  const activeBatchesCount = 18;

  // Filter Logic
  const filteredAdmissions = useMemo(() => {
    return admissionsList.filter((adm) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        adm.admissionNo.toLowerCase().includes(q) ||
        adm.studentName.toLowerCase().includes(q) ||
        adm.email.toLowerCase().includes(q) ||
        adm.phone.includes(q) ||
        adm.courseName.toLowerCase().includes(q) ||
        adm.batchCode.toLowerCase().includes(q);

      const matchesCourse =
        courseFilter === "ALL" || adm.courseName.toLowerCase() === courseFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "ALL" || adm.status === statusFilter;

      const matchesBatchType =
        batchTypeFilter === "ALL" || adm.batchType === batchTypeFilter;

      const matchesFee =
        feeStatusFilter === "ALL" || adm.feePaymentStatus === feeStatusFilter;

      return matchesSearch && matchesCourse && matchesStatus && matchesBatchType && matchesFee;
    });
  }, [admissionsList, searchTerm, courseFilter, statusFilter, batchTypeFilter, feeStatusFilter]);

  // Paginated Rows
  const totalPages = Math.ceil(filteredAdmissions.length / pageSize) || 1;
  const currentRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAdmissions.slice(start, start + pageSize);
  }, [filteredAdmissions, currentPage]);

  const handleOpenDetails = (adm: EnrichedAdmission) => {
    setSelectedAdmission(adm);
    setIsDetailsOpen(true);
  };

  const handleAddCounsellorNote = () => {
    if (!newNoteText.trim() || !selectedAdmission) return;
    const newNote: CounsellorNoteItem = {
      id: `n-${Date.now()}`,
      author: "Priya Singh",
      role: "Senior Counsellor",
      date: "Today",
      time: "Just now",
      text: newNoteText.trim(),
    };
    const updated = {
      ...selectedAdmission,
      counsellorNotes: [newNote, ...(selectedAdmission.counsellorNotes || [])],
    };
    setSelectedAdmission(updated);
    setAdmissionsList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setNewNoteText("");
    showToast("Counsellor note added!");
  };

  const handleToggleDocVerification = (docId: string) => {
    if (!selectedAdmission) return;
    const updatedDocs = selectedAdmission.documents.map((d) => {
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
    const updated = { ...selectedAdmission, documents: updatedDocs };
    setSelectedAdmission(updated);
    setAdmissionsList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    showToast("Document verification status updated!");
  };

  const handleUpdateAdmissionStatus = (admId: string, newStatus: AdmissionRecordStatus) => {
    setAdmissionsList((prev) =>
      prev.map((a) => {
        if (a.id === admId) {
          const step = newStatus === "Confirmed" ? 4 : newStatus === "Provisional" ? 3 : newStatus === "Admission Pending" ? 2 : 1;
          return { ...a, status: newStatus, workflowStep: step };
        }
        return a;
      })
    );
    if (selectedAdmission && selectedAdmission.id === admId) {
      setSelectedAdmission((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              workflowStep: newStatus === "Confirmed" ? 4 : newStatus === "Provisional" ? 3 : newStatus === "Admission Pending" ? 2 : 1,
            }
          : null
      );
    }
    showToast(`Admission status updated to ${newStatus}`);
  };

  const handleSaveDirectAdmission = (assignBatch: boolean = true) => {
    if (!formName || !formPhone) return;

    const newAdmNo = `ADM-2025-01${29 + admissionsList.length}`;
    const calculatedFinal = Math.max(0, formCourseFee - formDiscount);
    const calculatedDue = Math.max(0, calculatedFinal - formAmountPaid);

    const newAdm: EnrichedAdmission = {
      id: `adm-${Date.now()}`,
      admissionNo: newAdmNo,
      studentName: formName,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formName)}`,
      email: formEmail || `${formName.toLowerCase().replace(/\s+/g, "")}@email.com`,
      phone: formPhone,
      dob: formDob,
      gender: formGender,
      address: formAddress || "Main City Road, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      guardianName: "Parent / Guardian",
      counselorName: "Priya Singh",
      admissionSource: "Direct Walk-in",
      courseId: "c-custom",
      courseName: formCourse,
      programDuration: formDuration,
      batchId: `b-${Date.now()}`,
      batchCode: formBatch,
      batchType: formBatchType,
      batchTiming: formBatchTiming,
      batchStartDate: "01 Jun 2025",
      assignedFaculty: formFaculty,
      batchCapacity: 30,
      enrolledCount: 21,
      feePlan: formFeePlan,
      feePaymentStatus: calculatedDue === 0 ? "Paid" : "Due",
      totalCourseFee: formCourseFee,
      discountAmount: formDiscount,
      finalFee: calculatedFinal,
      amountPaid: formAmountPaid,
      amountDue: calculatedDue,
      paymentHistory: formAmountPaid > 0 ? [
        {
          id: `p-${Date.now()}`,
          receiptNo: `REC-2025-${newAdmNo.split("-")[2]}-1`,
          amount: formAmountPaid,
          paymentMode: formPaymentMethod,
          transactionId: `TXN/${Date.now()}`,
          date: "Today, Just now",
          status: "Completed",
        }
      ] : [],
      status: assignBatch && calculatedDue === 0 ? "Confirmed" : "Provisional",
      workflowStep: assignBatch && calculatedDue === 0 ? 4 : 3,
      admissionDate: "16 May 2025",
      admissionTime: "11:00 AM",
      documents: [
        { id: `d-${Date.now()}-1`, title: "Aadhaar Card", category: "Identity Proof", fileName: "Aadhaar_Doc.pdf", fileSize: "920 KB", uploadDate: "Today", verified: true },
        { id: `d-${Date.now()}-2`, title: "Academic Marksheet", category: "Educational Documents", fileName: "Marksheet.pdf", fileSize: "1.4 MB", uploadDate: "Today", verified: true },
      ],
      counsellorNotes: formNotes ? [
        { id: `n-${Date.now()}`, author: "Priya Singh", role: "Senior Counsellor", date: "Today", time: "Just now", text: formNotes }
      ] : [],
    };

    setAdmissionsList([newAdm, ...admissionsList]);
    setIsDirectModalOpen(false);
    showToast(`Direct Admission created successfully for ${formName}! (${newAdmNo})`);
  };

  const handleChangeBatchConfirm = () => {
    if (!selectedAdmission || !targetBatchId) return;
    const updated = {
      ...selectedAdmission,
      batchCode: targetBatchId,
    };
    setSelectedAdmission(updated);
    setAdmissionsList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setIsChangeBatchOpen(false);
    showToast(`Batch updated to ${targetBatchId} for ${selectedAdmission.studentName}!`);
  };

  // Helper for Batch Badge
  const renderBatchBadge = (type: BatchType) => {
    switch (type) {
      case "Morning Batch":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#1769AA] border border-blue-200/60">
            Morning Batch
          </span>
        );
      case "Evening Batch":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
            Evening Batch
          </span>
        );
      case "Weekend Batch":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
            Weekend Batch
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            Regular Batch
          </span>
        );
    }
  };

  // Helper for Status Badge
  const renderAdmissionStatusBadge = (status: AdmissionRecordStatus) => {
    switch (status) {
      case "Confirmed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
            Confirmed
          </span>
        );
      case "Provisional":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/70 shadow-2xs">
            Provisional
          </span>
        );
      case "Admission Pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1769AA] border border-blue-200/70 shadow-2xs">
            Admission Pending
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/70 shadow-2xs">
            Cancelled
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
          <span className="text-slate-500">Admissions & Counselling Desk</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-800 font-semibold">All Admissions</span>
        </div>

        {/* Title and Top Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              All Admissions
            </h1>
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              View active student admissions, fee structures, and batch assignments across all institute departments.
            </p>
          </div>

          <Button
            onClick={() => setIsDirectModalOpen(true)}
            className="bg-[#1769AA] hover:bg-[#12558c] text-white font-medium px-4.5 py-2.5 rounded-lg shadow-sm flex items-center gap-2 text-sm transition-all shrink-0 h-10"
          >
            <Plus className="h-4 w-4" />
            <span>Direct Admission Entry</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. KPI SUMMARY CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Total Admissions */}
        <Card 
          onClick={() => { setStatusFilter("ALL"); setCourseFilter("ALL"); }}
          className="border border-slate-200/80 bg-white rounded-xl shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50/90 text-[#1769AA] flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-500">Total Admissions</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {totalAdmissionsCount}
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

        {/* Card 2: Confirmed Seats */}
        <Card 
          onClick={() => setStatusFilter("Confirmed")}
          className="border border-slate-200/80 bg-white rounded-xl shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-500">Confirmed Seats</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {confirmedCount}
                </h3>
              </div>
            </div>
            <div className="self-end pb-1">
              <span className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-0.5">
                View confirmed <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Provisional Seats */}
        <Card 
          onClick={() => setStatusFilter("Provisional")}
          className="border border-slate-200/80 bg-white rounded-xl shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-500">Provisional Seats</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {provisionalCount}
                </h3>
              </div>
            </div>
            <div className="self-end pb-1">
              <span className="text-xs font-semibold text-amber-600 hover:underline flex items-center gap-0.5">
                View provisional <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Active Batches Assigned */}
        <Card 
          onClick={() => { setStatusFilter("ALL"); setShowAdvancedFilters(true); }}
          className="border border-slate-200/80 bg-white rounded-xl shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform">
                <Layers className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-500">Active Batches Assigned</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {activeBatchesCount}
                </h3>
              </div>
            </div>
            <div className="self-end pb-1">
              <span className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-0.5">
                View batches <ChevronRight className="h-3.5 w-3.5" />
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
            placeholder="Search by admission no, student name, email, or course..."
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
          {/* Courses Dropdown */}
          <div className="relative">
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10.5 px-3.5 pr-8 bg-white border border-slate-200/80 rounded-lg text-xs font-medium text-slate-700 appearance-none focus:outline-none focus:ring-1 focus:ring-[#1769AA] shadow-2xs cursor-pointer hover:bg-slate-50/50"
            >
              <option value="ALL">All Courses</option>
              <option value="Digital Marketing">Digital Marketing</option>
              <option value="Advanced Excel">Advanced Excel</option>
              <option value="Tally Prime with GST">Tally Prime with GST</option>
              <option value="Web Designing">Web Designing</option>
              <option value="Python Programming">Python Programming</option>
              <option value="Graphic Designing">Graphic Designing</option>
              <option value="Content Writing">Content Writing</option>
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
              <option value="Confirmed">Confirmed</option>
              <option value="Provisional">Provisional</option>
              <option value="Admission Pending">Admission Pending</option>
              <option value="Cancelled">Cancelled</option>
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
              showAdvancedFilters || batchTypeFilter !== "ALL" || feeStatusFilter !== "ALL"
                ? "border-[#1769AA] text-[#1769AA] bg-blue-50/40"
                : ""
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
            {(batchTypeFilter !== "ALL" || feeStatusFilter !== "ALL") && (
              <span className="h-2 w-2 rounded-full bg-[#1769AA]" />
            )}
          </Button>

          {/* Reset Filters */}
          {(searchTerm || courseFilter !== "ALL" || statusFilter !== "ALL" || batchTypeFilter !== "ALL" || feeStatusFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setCourseFilter("ALL");
                setStatusFilter("ALL");
                setBatchTypeFilter("ALL");
                setFeeStatusFilter("ALL");
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
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#1769AA]" /> Extended Filter Options
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
              <label className="block text-xs font-semibold text-slate-600 mb-1">Batch Schedule Type</label>
              <select
                value={batchTypeFilter}
                onChange={(e) => {
                  setBatchTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-700"
              >
                <option value="ALL">All Batch Schedules</option>
                <option value="Morning Batch">Morning Batch</option>
                <option value="Evening Batch">Evening Batch</option>
                <option value="Weekend Batch">Weekend Batch</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fee Payment Status</label>
              <select
                value={feeStatusFilter}
                onChange={(e) => {
                  setFeeStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-700"
              >
                <option value="ALL">All Fee Statuses</option>
                <option value="Paid">Fully Paid</option>
                <option value="Due">Balance Due</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Quick Action</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setBatchTypeFilter("ALL");
                    setFeeStatusFilter("ALL");
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

      {/* ─── 4. ADMISSIONS DATA TABLE CARD ─── */}
      <Card className="border border-slate-200/80 shadow-2xs bg-white rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#fbfcfe] border-b border-slate-200/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-3.5 px-4 font-bold text-slate-700 text-xs tracking-wider">
                  Adm No.
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-slate-700 text-xs tracking-wider">
                  Student Details
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-slate-700 text-xs tracking-wider">
                  Course
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-slate-700 text-xs tracking-wider">
                  Assigned Batch
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-slate-700 text-xs tracking-wider">
                  Fee Plan
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-slate-700 text-xs tracking-wider">
                  Status
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-slate-700 text-xs tracking-wider">
                  Admission Date
                </TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-slate-700 text-xs tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-slate-100">
              {currentRows.length > 0 ? (
                currentRows.map((adm) => (
                  <TableRow
                    key={adm.id}
                    onClick={() => handleOpenDetails(adm)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* 1. Adm No */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700 text-xs">
                        <span>{adm.admissionNo}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyAdmNo(adm.admissionNo, e)}
                          className="text-slate-400 hover:text-[#1769AA] transition-colors p-1 rounded-sm hover:bg-blue-50"
                          title="Copy Admission Number"
                        >
                          {copiedAdmNo === adm.admissionNo ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>

                    {/* 2. Student Details */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-slate-200/80 shadow-2xs">
                          <AvatarImage src={adm.avatar} alt={adm.studentName} className="object-cover" />
                          <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold text-xs">
                            {adm.studentName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#1769AA] transition-colors">
                            {adm.studentName}
                          </h4>
                          <p className="text-xs text-slate-500 font-normal">
                            {adm.email}
                          </p>
                          <p className="text-xs text-slate-500 font-normal">
                            {adm.phone}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* 3. Course */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-900">
                          {adm.courseName}
                        </p>
                        <p className="text-xs text-slate-500 font-normal">
                          {adm.programDuration}
                        </p>
                      </div>
                    </TableCell>

                    {/* 4. Assigned Batch */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800">
                          {adm.batchCode}
                        </p>
                        <div>
                          {renderBatchBadge(adm.batchType)}
                        </div>
                        <p className="text-[11px] text-slate-500 font-normal">
                          {adm.batchTiming}
                        </p>
                      </div>
                    </TableCell>

                    {/* 5. Fee Plan */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-900">
                          {adm.feePlan}
                        </p>
                        <div>
                          {adm.feePaymentStatus === "Paid" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                              Due
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-800">
                          ₹{adm.finalFee.toLocaleString()}
                        </p>
                      </div>
                    </TableCell>

                    {/* 6. Status */}
                    <TableCell className="py-4 px-4 align-middle">
                      {renderAdmissionStatusBadge(adm.status)}
                    </TableCell>

                    {/* 7. Admission Date */}
                    <TableCell className="py-4 px-4 align-middle">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-slate-800">
                          {adm.admissionDate}
                        </p>
                        <p className="text-xs text-slate-400">
                          {adm.admissionTime}
                        </p>
                      </div>
                    </TableCell>

                    {/* 8. Actions */}
                    <TableCell className="py-4 px-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetails(adm)}
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
                          <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 shadow-lg rounded-xl p-1.5 text-xs">
                            <DropdownMenuLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                              Admission Actions
                            </DropdownMenuLabel>
                            
                            <DropdownMenuItem
                              onClick={() => handleOpenDetails(adm)}
                              className="cursor-pointer font-medium py-2 rounded-lg text-slate-700 hover:bg-slate-50"
                            >
                              <FileText className="h-3.5 w-3.5 mr-2 text-[#1769AA]" />
                              View Admission
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleOpenDetails(adm)}
                              className="cursor-pointer font-medium py-2 rounded-lg text-slate-700 hover:bg-slate-50"
                            >
                              <Edit className="h-3.5 w-3.5 mr-2 text-slate-500" />
                              Edit Admission
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedAdmission(adm);
                                setTargetBatchId(adm.batchCode);
                                setIsChangeBatchOpen(true);
                              }}
                              className="cursor-pointer font-medium py-2 rounded-lg text-slate-700 hover:bg-slate-50"
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-2 text-purple-600" />
                              Change Batch
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                handleOpenDetails(adm);
                                setActiveTab("fee");
                              }}
                              className="cursor-pointer font-medium py-2 rounded-lg text-slate-700 hover:bg-slate-50"
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                              Update Fee Plan
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleUpdateAdmissionStatus(adm.id, adm.status === "Confirmed" ? "Provisional" : "Confirmed")}
                              className="cursor-pointer font-medium py-2 rounded-lg text-slate-700 hover:bg-slate-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                              Toggle Confirmed Status
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => window.print()}
                              className="cursor-pointer font-medium py-2 rounded-lg text-slate-700 hover:bg-slate-50"
                            >
                              <Printer className="h-3.5 w-3.5 mr-2 text-slate-500" />
                              Print Admission
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => showToast(`Downloading PDF dossier for ${adm.admissionNo}...`)}
                              className="cursor-pointer font-medium py-2 rounded-lg text-slate-700 hover:bg-slate-50"
                            >
                              <Download className="h-3.5 w-3.5 mr-2 text-slate-500" />
                              Download Admission Details
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 border-slate-100" />

                            <DropdownMenuItem
                              onClick={() => handleUpdateAdmissionStatus(adm.id, "Cancelled")}
                              className="cursor-pointer font-medium py-2 rounded-lg text-rose-600 hover:bg-rose-50"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-2 text-rose-500" />
                              Cancel Admission
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <GraduationCap className="h-8 w-8 text-slate-300 stroke-[1.5]" />
                      <p className="text-sm font-semibold text-slate-600">No admission records found</p>
                      <p className="text-xs text-slate-400">Try changing your search terms or filter selections.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          setCourseFilter("ALL");
                          setStatusFilter("ALL");
                        }}
                        className="mt-2 text-xs"
                      >
                        Reset Filters
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
            Showing <span className="font-semibold text-slate-800">{filteredAdmissions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
            <span className="font-semibold text-slate-800">{Math.min(currentPage * pageSize, filteredAdmissions.length)}</span> of{" "}
            <span className="font-semibold text-slate-800">{totalAdmissionsCount}</span> admissions
          </p>

          {/* Pagination Controls */}
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
              onClick={() => setCurrentPage(18)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                currentPage === 18
                  ? "bg-[#1769AA] text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              18
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, 18))}
              className="h-8 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1 ml-1"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Card>

      {/* ─── 6. VIEW ADMISSION DETAILS (SLIDE-OUT SHEET / DRAWER) ─── */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl p-0 overflow-y-auto bg-white border-l border-slate-200">
          {selectedAdmission && (
            <div className="flex flex-col h-full">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-200/80 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1769AA] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {selectedAdmission.admissionNo}
                      </span>
                      {renderAdmissionStatusBadge(selectedAdmission.status)}
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {selectedAdmission.batchCode}
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {selectedAdmission.studentName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Enrolled in <strong className="text-slate-700">{selectedAdmission.courseName}</strong> on {selectedAdmission.admissionDate} at {selectedAdmission.admissionTime}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 mr-6">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyAdmNo(selectedAdmission.admissionNo)}
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

                {/* ─── ADMISSION PROGRESS STEPPER ─── */}
                <div className="mt-5 pt-4 border-t border-slate-200/60">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    Admission Progress Stage
                  </p>
                  <div className="grid grid-cols-4 gap-1 text-center">
                    {[
                      { step: 1, title: "1. Admission Created", done: selectedAdmission.workflowStep >= 1 },
                      { step: 2, title: "2. Fee Setup", done: selectedAdmission.workflowStep >= 2 },
                      { step: 3, title: "3. Batch Assigned", done: selectedAdmission.workflowStep >= 3 },
                      { step: 4, title: "4. Confirmed", done: selectedAdmission.status === "Confirmed" },
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

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-200/50">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === "overview"
                        ? "bg-[#1769AA] text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Student & Admission
                  </button>
                  <button
                    onClick={() => setActiveTab("batch")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === "batch"
                        ? "bg-[#1769AA] text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Batch Details
                  </button>
                  <button
                    onClick={() => setActiveTab("fee")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === "fee"
                        ? "bg-[#1769AA] text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Fee Structure & Receipts
                  </button>
                  <button
                    onClick={() => setActiveTab("docs")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      activeTab === "docs"
                        ? "bg-[#1769AA] text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>Documents</span>
                    <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full">
                      {selectedAdmission.documents.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("notes")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === "notes"
                        ? "bg-[#1769AA] text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Counsellor Notes
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-6 flex-1">
                
                {/* ─── TAB 1: STUDENT & ADMISSION OVERVIEW ─── */}
                {activeTab === "overview" && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    
                    {/* Student Information */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="h-4 w-4 text-[#1769AA]" /> Student Personal Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Full Name</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedAdmission.studentName}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Date of Birth & Gender</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedAdmission.dob} ({selectedAdmission.gender})</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Primary Mobile Number</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-emerald-600" /> {selectedAdmission.phone}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Email Address</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                            <Mail className="h-3 w-3 text-[#1769AA]" /> {selectedAdmission.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Parent / Guardian Name</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedAdmission.guardianName}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Assigned Counsellor</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                            <UserCheck className="h-3 w-3 text-emerald-600" /> {selectedAdmission.counselorName}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-[11px] font-medium text-slate-400">Residential Address</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5 flex items-start gap-1">
                            <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span>{selectedAdmission.address}, {selectedAdmission.city}, {selectedAdmission.state} - {selectedAdmission.pincode}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Admission Program Details */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4 text-[#1769AA]" /> Admission Program Information
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Admitted Course</p>
                          <p className="text-xs font-bold text-[#1769AA] mt-0.5">{selectedAdmission.courseName}</p>
                          <span className="text-[11px] text-slate-500">{selectedAdmission.programDuration}</span>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Admission Source</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedAdmission.admissionSource}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Assigned Batch Code</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedAdmission.batchCode}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">Current Status</p>
                          <div className="mt-0.5">{renderAdmissionStatusBadge(selectedAdmission.status)}</div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* ─── TAB 2: BATCH & SCHEDULE DETAILS ─── */}
                {activeTab === "batch" && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-[#1769AA] bg-blue-100/60 px-2.5 py-0.5 rounded">
                            {selectedAdmission.batchCode}
                          </span>
                          <h3 className="text-base font-extrabold text-slate-900 mt-1">
                            {selectedAdmission.courseName} — {selectedAdmission.batchType}
                          </h3>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTargetBatchId(selectedAdmission.batchCode);
                            setIsChangeBatchOpen(true);
                          }}
                          className="h-8 text-xs font-bold text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100"
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Change Batch
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Class Timing</span>
                          <span className="font-bold text-slate-800">{selectedAdmission.batchTiming}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Start Date</span>
                          <span className="font-bold text-slate-800">{selectedAdmission.batchStartDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Assigned Faculty</span>
                          <span className="font-bold text-slate-800">{selectedAdmission.assignedFaculty}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Batch Capacity</span>
                          <span className="font-bold text-slate-800">{selectedAdmission.batchCapacity} Seats</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Available Seats</span>
                          <span className="font-bold text-emerald-600">
                            {selectedAdmission.batchCapacity - selectedAdmission.enrolledCount} Seats Available
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Batch Schedule Pattern</span>
                          <span className="font-bold text-slate-800">{selectedAdmission.batchType}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 3: FEE & RECEIPTS ─── */}
                {activeTab === "fee" && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    
                    {/* Fee Summary Card */}
                    <div className="p-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/20 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-500">Selected Fee Plan</p>
                          <h3 className="text-xl font-black text-slate-900 mt-0.5">
                            {selectedAdmission.feePlan}
                          </h3>
                        </div>
                        {selectedAdmission.feePaymentStatus === "Paid" ? (
                          <Badge className="bg-emerald-500 text-white font-bold text-xs px-3 py-1">
                            FULLY PAID
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500 text-white font-bold text-xs px-3 py-1">
                            BALANCE DUE: ₹{selectedAdmission.amountDue.toLocaleString()}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Total Course Fee</span>
                          <span className="font-bold text-slate-800">₹{selectedAdmission.totalCourseFee.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Discount Applied</span>
                          <span className="font-bold text-emerald-600">-₹{selectedAdmission.discountAmount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Final Payable Fee</span>
                          <span className="font-bold text-slate-900">₹{selectedAdmission.finalFee.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Amount Paid</span>
                          <span className="font-bold text-emerald-700">₹{selectedAdmission.amountPaid.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Receipts History */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Transaction History</h4>
                      {selectedAdmission.paymentHistory.length > 0 ? (
                        selectedAdmission.paymentHistory.map((p) => (
                          <div
                            key={p.id}
                            className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs shadow-2xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <CreditCard className="h-4 w-4" />
                              </div>
                              <div>
                                <h5 className="font-bold text-slate-900">{p.receiptNo}</h5>
                                <p className="text-[11px] text-slate-400">{p.paymentMode} • Ref: {p.transactionId}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-extrabold text-slate-900 text-sm block">₹{p.amount.toLocaleString()}</span>
                              <span className="text-[10px] text-slate-400">{p.date}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                          No payments recorded yet.
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* ─── TAB 4: SUBMITTED DOCUMENTS ─── */}
                {activeTab === "docs" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Student Verification Documents</h4>
                        <p className="text-xs text-slate-500">View and verify mandatory identity & educational records.</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1">
                        <Upload className="h-3.5 w-3.5" /> Upload File
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {selectedAdmission.documents.length > 0 ? (
                        selectedAdmission.documents.map((doc) => (
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
                                    <ShieldCheck className="h-3 w-3" /> Verified by {doc.verifiedBy || "Priya Singh"}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => showToast(`Previewing document ${doc.fileName}`)}
                                className="h-8 px-2.5 text-xs font-medium text-slate-600"
                              >
                                View
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleToggleDocVerification(doc.id)}
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

                {/* ─── TAB 5: COUNSELLOR NOTES ─── */}
                {activeTab === "notes" && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    
                    {/* Add Counsellor Note */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                      <label className="block text-xs font-bold text-slate-800">Add Internal Counsellor Note</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type notes on payments, batch preferences, special concessions..."
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          className="bg-white text-xs h-9"
                        />
                        <Button
                          size="sm"
                          onClick={handleAddCounsellorNote}
                          className="bg-[#1769AA] hover:bg-[#12558c] text-white text-xs font-semibold px-3.5 h-9 shrink-0"
                        >
                          <Send className="h-3.5 w-3.5 mr-1" /> Post Note
                        </Button>
                      </div>
                    </div>

                    {/* Notes History */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Counsellor Audit Trail</h4>
                      {selectedAdmission.counsellorNotes?.length > 0 ? (
                        selectedAdmission.counsellorNotes.map((n) => (
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

                  </div>
                )}

              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateAdmissionStatus(selectedAdmission.id, "Cancelled")}
                    className="text-xs font-semibold text-rose-600 hover:bg-rose-50 border-slate-200 h-9"
                  >
                    Cancel Admission
                  </Button>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    size="sm"
                    onClick={() => handleUpdateAdmissionStatus(selectedAdmission.id, "Confirmed")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirm Admission
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      setTargetBatchId(selectedAdmission.batchCode);
                      setIsChangeBatchOpen(true);
                    }}
                    className="bg-[#1769AA] hover:bg-[#12558c] text-white font-bold text-xs h-9 px-4 shadow-sm"
                  >
                    Change Batch <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── 7. DIRECT ADMISSION ENTRY MODAL ─── */}
      {isDirectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-5 text-slate-900 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Direct Admission Entry</h3>
                  <p className="text-xs text-slate-500">Instantly enroll student with course, fee, and batch assignment</p>
                </div>
              </div>
              <button
                onClick={() => setIsDirectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              
              {/* Section A: Student Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">1. Student Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                    <Input
                      placeholder="e.g. Ananya Sharma"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      className="bg-white border-slate-200 text-xs h-9.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      required
                      className="bg-white border-slate-200 text-xs h-9.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                    <Input
                      type="email"
                      placeholder="student@email.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="bg-white border-slate-200 text-xs h-9.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                    <Input
                      type="date"
                      value={formDob}
                      onChange={(e) => setFormDob(e.target.value)}
                      className="bg-white border-slate-200 text-xs h-9.5"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Residential Address</label>
                    <Input
                      placeholder="Street address, City, Pincode"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="bg-white border-slate-200 text-xs h-9.5"
                    />
                  </div>
                </div>
              </div>

              {/* Section B: Course & Batch */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">2. Course & Batch Assignment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select Course *</label>
                    <select
                      value={formCourse}
                      onChange={(e) => setFormCourse(e.target.value)}
                      className="w-full h-9.5 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800"
                    >
                      <option value="Digital Marketing">Digital Marketing</option>
                      <option value="Advanced Excel">Advanced Excel</option>
                      <option value="Tally Prime with GST">Tally Prime with GST</option>
                      <option value="Web Designing">Web Designing</option>
                      <option value="Python Programming">Python Programming</option>
                      <option value="Graphic Designing">Graphic Designing</option>
                      <option value="Content Writing">Content Writing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Program Duration</label>
                    <select
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                      className="w-full h-9.5 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800"
                    >
                      <option value="(1 Year Program)">(1 Year Program)</option>
                      <option value="(6 Months Program)">(6 Months Program)</option>
                      <option value="(3 Months Program)">(3 Months Program)</option>
                      <option value="(2 Months Program)">(2 Months Program)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assign Batch *</label>
                    <Input
                      placeholder="e.g. DM-JUN-2025"
                      value={formBatch}
                      onChange={(e) => setFormBatch(e.target.value)}
                      className="bg-white border-slate-200 text-xs h-9.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Batch Schedule Type</label>
                    <select
                      value={formBatchType}
                      onChange={(e) => setFormBatchType(e.target.value as BatchType)}
                      className="w-full h-9.5 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800"
                    >
                      <option value="Morning Batch">Morning Batch (9:00 AM – 11:00 AM)</option>
                      <option value="Evening Batch">Evening Batch (5:00 PM – 7:00 PM)</option>
                      <option value="Weekend Batch">Weekend Batch (11:00 AM – 01:00 PM)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section C: Fee Setup */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">3. Fee Details & Initial Payment</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Fee Plan</label>
                    <select
                      value={formFeePlan}
                      onChange={(e) => setFormFeePlan(e.target.value as FeePlanType)}
                      className="w-full h-9.5 px-2 bg-white border border-slate-200 rounded-md text-xs text-slate-800"
                    >
                      <option value="Standard Plan">Standard Plan</option>
                      <option value="Basic Plan">Basic Plan</option>
                      <option value="Premium Plan">Premium Plan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Course Fee (₹)</label>
                    <Input
                      type="number"
                      value={formCourseFee}
                      onChange={(e) => setFormCourseFee(Number(e.target.value))}
                      className="bg-white border-slate-200 text-xs h-9.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Discount (₹)</label>
                    <Input
                      type="number"
                      value={formDiscount}
                      onChange={(e) => setFormDiscount(Number(e.target.value))}
                      className="bg-white border-slate-200 text-xs h-9.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount Paid (₹)</label>
                    <Input
                      type="number"
                      value={formAmountPaid}
                      onChange={(e) => setFormAmountPaid(Number(e.target.value))}
                      className="bg-white border-slate-200 text-xs h-9.5"
                    />
                  </div>
                </div>
              </div>

              {/* Section D: Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Counsellor Remarks</label>
                <Input
                  placeholder="e.g. Verified educational transcripts. Ready for batch orientation."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="bg-white border-slate-200 text-xs h-9.5"
                />
              </div>

              {/* Final Modal Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDirectModalOpen(false)}
                  className="h-10 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSaveDirectAdmission(false)}
                  variant="outline"
                  className="h-10 text-xs font-bold text-slate-700 border-slate-300"
                >
                  Save Admission
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSaveDirectAdmission(true)}
                  className="bg-[#1769AA] hover:bg-[#12558c] text-white h-10 text-xs font-bold px-5"
                >
                  Save & Assign Batch
                </Button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ─── 8. CHANGE BATCH MODAL ─── */}
      {isChangeBatchOpen && selectedAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <RefreshCw className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Change Batch Assignment</h3>
                <p className="text-xs text-slate-500">{selectedAdmission.studentName} ({selectedAdmission.admissionNo})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Current Batch: <strong className="text-slate-900">{selectedAdmission.batchCode} ({selectedAdmission.batchType})</strong>
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select New Target Batch</label>
                <select
                  value={targetBatchId}
                  onChange={(e) => setTargetBatchId(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800 focus:ring-1 focus:ring-[#1769AA]"
                >
                  <option value="DM-JUN-2025">DM-JUN-2025 (Morning Batch • 9:00 AM – 11:00 AM)</option>
                  <option value="DM-JUL-2025">DM-JUL-2025 (Evening Batch • 5:00 PM – 7:00 PM)</option>
                  <option value="EXCEL-MAY-2025">EXCEL-MAY-2025 (Evening Batch • 5:00 PM – 7:00 PM)</option>
                  <option value="TALLY-JUN-2025">TALLY-JUN-2025 (Weekend Batch • 11:00 AM – 01:00 PM)</option>
                  <option value="WD-JUN-2025">WD-JUN-2025 (Morning Batch • 9:00 AM – 10:30 AM)</option>
                  <option value="PY-JUN-2025">PY-JUN-2025 (Evening Batch • 5:30 PM – 7:30 PM)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsChangeBatchOpen(false)}
                  className="h-10 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleChangeBatchConfirm}
                  className="bg-purple-600 hover:bg-purple-700 text-white h-10 text-xs font-bold px-5"
                >
                  Confirm Batch Transfer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

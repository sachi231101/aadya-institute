import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  Filter,
  Loader2,
  PieChart as PieChartIcon,
  Printer,
  RotateCcw,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import { useFinancialReport } from "@/hooks/useReports";
import { useBranches } from "@/hooks/useBranches";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { downloadCsv } from "@/utils/csvExporter";
import { getPortalBasePath } from "@/utils/portal-path";
import type {
  FinancialAttentionItem,
  FinancialReportParams,
} from "@/services/reports.api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { FilterToolbar, METRIC_GRID_COLUMNS, MetricGrid, PageContainer, PageHeader } from "@/components/layout";

const PAGE_SIZE = 10;
const SELECT_CLASS =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:border-primary";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const toYmd = (d: Date) => d.toISOString().slice(0, 10);

function dateShortcutRange(key: string): { from: string; to: string } | null {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  if (key === "today") {
    const t = startOfDay(now);
    return { from: toYmd(t), to: toYmd(t) };
  }
  if (key === "week") {
    const t = startOfDay(now);
    const day = t.getUTCDay() || 7;
    const from = new Date(t);
    from.setUTCDate(t.getUTCDate() - day + 1);
    return { from: toYmd(from), to: toYmd(t) };
  }
  if (key === "month") {
    const from = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    return { from: toYmd(from), to: toYmd(startOfDay(now)) };
  }
  if (key === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const from = new Date(Date.UTC(now.getFullYear(), q * 3, 1));
    return { from: toYmd(from), to: toYmd(startOfDay(now)) };
  }
  if (key === "year") {
    const from = new Date(Date.UTC(now.getFullYear(), 0, 1));
    return { from: toYmd(from), to: toYmd(startOfDay(now)) };
  }
  return null;
}

const AttentionCard = ({
  title,
  items,
  icon: Icon,
  tone,
}: {
  title: string;
  items: FinancialAttentionItem[];
  icon: React.ElementType;
  tone: string;
}) => (
  <Card className="border-border/60 shadow-sm">
    <CardContent className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`rounded-md p-1.5 ${tone}`}>
            <Icon className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {items.length}
        </Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">No items.</p>
      ) : (
        <ul className="space-y-2 max-h-40 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border border-slate-100 bg-slate-50/80 px-2.5 py-2">
              <p className="text-xs font-semibold text-slate-800 truncate">{item.label}</p>
              {item.meta && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{item.meta}</p>}
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);

export const FinancialReports: React.FC = () => {
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const { user } = useAuthStore();
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = useMemo(() => branchesResponse?.data || [], [branchesResponse?.data]);
  const isAdmin = user?.roles?.includes("ADMIN") || user?.role === "ADMIN";

  const [dateShortcut, setDateShortcut] = useState("all");
  const [academicYear, setAcademicYear] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [feeHeadMasterId, setFeeHeadMasterId] = useState("");
  const [paymentModeMasterId, setPaymentModeMasterId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [counsellorId, setCounsellorId] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [outstandingFilter, setOutstandingFilter] = useState("");
  const [trendMode, setTrendMode] = useState<"monthly" | "yearly">("monthly");
  const [searchTerm, setSearchTerm] = useState("");
  const [txnPage, setTxnPage] = useState(1);
  const [duePage, setDuePage] = useState(1);

  const branchFilter =
    isAdmin && selectedBranchId !== "ALL" ? selectedBranchId : undefined;

  const effectiveDates = useMemo(() => {
    if (dateShortcut === "custom" || dateShortcut === "all") {
      return { from: dateFrom, to: dateTo };
    }
    const range = dateShortcutRange(dateShortcut);
    return { from: range?.from || "", to: range?.to || "" };
  }, [dateShortcut, dateFrom, dateTo]);

  const reportParams: FinancialReportParams = useMemo(
    () => ({
      ...(branchFilter ? { branchId: branchFilter } : {}),
      ...(academicYear ? { academicYear } : {}),
      ...(effectiveDates.from ? { dateFrom: effectiveDates.from } : {}),
      ...(effectiveDates.to ? { dateTo: effectiveDates.to } : {}),
      ...(courseId ? { courseId } : {}),
      ...(batchId ? { batchId } : {}),
      ...(feeHeadMasterId ? { feeHeadMasterId } : {}),
      ...(paymentModeMasterId ? { paymentModeMasterId } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(counsellorId ? { counsellorId } : {}),
      ...(transactionType ? { transactionType } : {}),
      ...(outstandingFilter ? { outstandingFilter } : {}),
      trendGranularity: trendMode,
    }),
    [
      branchFilter,
      academicYear,
      effectiveDates,
      courseId,
      batchId,
      feeHeadMasterId,
      paymentModeMasterId,
      paymentStatus,
      counsellorId,
      transactionType,
      outstandingFilter,
      trendMode,
    ]
  );

  const { data, isLoading, isError, refetch } = useFinancialReport(reportParams);

  const summary = data?.summary || {
    totalFeeDemand: 0,
    totalCollected: 0,
    totalPending: 0,
    collectionRate: 0,
    totalConcession: 0,
    totalRefunds: 0,
    netRevenue: 0,
    projectedRevenue: 0,
    voidedAmount: 0,
    failedAmount: 0,
  };

  const options = data?.filterOptions || {
    courses: [],
    batches: [],
    feeHeads: [],
    paymentModes: [],
    counsellors: [],
    academicYears: [],
  };

  const chartData =
    trendMode === "yearly"
      ? (data?.yearlyTrend || []).map((y) => ({
          month: y.year,
          collected: y.collected,
          pending: y.pending,
          demand: y.demand,
        }))
      : data?.monthlyTrend || [];

  const transactions = useMemo(() => {
    const rows = data?.recentPayments || [];
    const q = searchTerm.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.receiptNo.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        r.admissionNo.toLowerCase().includes(q) ||
        r.courseName.toLowerCase().includes(q) ||
        (r.method || "").toLowerCase().includes(q)
    );
  }, [data?.recentPayments, searchTerm]);

  const dues = data?.outstandingStudents || [];
  const txnPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const safeTxnPage = Math.min(txnPage, txnPages);
  const paginatedTxn = transactions.slice((safeTxnPage - 1) * PAGE_SIZE, safeTxnPage * PAGE_SIZE);
  const duePages = Math.max(1, Math.ceil(dues.length / PAGE_SIZE));
  const safeDuePage = Math.min(duePage, duePages);
  const paginatedDues = dues.slice((safeDuePage - 1) * PAGE_SIZE, safeDuePage * PAGE_SIZE);

  const resetFilters = () => {
    if (isAdmin) setSelectedBranchId("ALL");
    setDateShortcut("all");
    setAcademicYear("");
    setDateFrom("");
    setDateTo("");
    setCourseId("");
    setBatchId("");
    setFeeHeadMasterId("");
    setPaymentModeMasterId("");
    setPaymentStatus("");
    setCounsellorId("");
    setTransactionType("");
    setOutstandingFilter("");
    setSearchTerm("");
    setTxnPage(1);
    setDuePage(1);
  };

  const handleExportSummary = () => {
    const rows = data?.monthlyBreakdown || [];
    if (!rows.length) {
      alert("No financial summary to export.");
      return;
    }
    downloadCsv(
      "Financial_Summary",
      rows.map((r) => ({
        Period: r.month,
        Demand: r.demand ?? "",
        Collected: r.collected,
        Pending: r.pending,
        Concession: r.concession ?? "",
        Refund: r.refunds ?? 0,
        "Net Collection": r.netCollection ?? r.collected,
        "Collection Rate %": r.collectionRate ?? "",
      }))
    );
  };

  const handleExportTransactions = () => {
    if (!transactions.length) {
      alert("No transactions to export.");
      return;
    }
    downloadCsv(
      "Financial_Transactions",
      transactions.map((r) => ({
        "Receipt No": r.receiptNo,
        Student: r.studentName,
        "Admission No": r.admissionNo,
        Course: r.courseName,
        Branch: r.branchName || "",
        "Fee Head": r.feeHead || "",
        Amount: r.amount,
        Mode: r.method,
        Gateway: r.gateway || "",
        Reference: r.transactionRef || "",
        Date: r.date,
        Status: r.status,
      }))
    );
  };

  const handleExportOutstanding = () => {
    if (!dues.length) {
      alert("No outstanding dues to export.");
      return;
    }
    downloadCsv(
      "Financial_Outstanding",
      dues.map((d) => ({
        Student: d.studentName,
        Admission: d.admissionNo,
        Course: d.courseName,
        Batch: d.batchName || "",
        "Total Fee": d.totalFee,
        Paid: d.paid,
        Pending: d.pending,
        "Due Date": d.dueDate,
        Status: d.status,
        "Overdue Days": d.overdueDays,
      }))
    );
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="py-20 flex flex-col justify-center items-center text-muted-foreground space-y-3">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <p className="text-sm font-medium">Calculating revenue, outstanding balances, and financial health...</p>
        </div>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <div className="p-8 bg-destructive/10 border border-destructive/20 rounded-xl text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="text-lg font-bold text-foreground">Failed to load financial reports</h3>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry Loading
          </Button>
        </div>
      </PageContainer>
    );
  }

  const needs = data?.needsAttention || {
    overdueFees: [],
    highOutstanding: [],
    failedPayments: [],
    voidedPayments: [],
    partiallyPaid: [],
    unreconciled: [],
    refundsAwaiting: [],
    expiredLinks: [],
  };

  return (
    <PageContainer className="print:space-y-3">
      <PageHeader
        className="print:hidden"
        title="Revenue & Finance Reports"
        description="Fee demand, collections, outstanding dues, concessions, and payment audit trails."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportSummary}>
              <Download className="mr-2 h-4 w-4" /> Summary CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportTransactions}>
              <Download className="mr-2 h-4 w-4" /> Transactions CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportOutstanding}>
              <Download className="mr-2 h-4 w-4" /> Outstanding CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        }
      />

      <FilterToolbar className="flex-col items-stretch gap-3 print:hidden">
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "All Time"],
              ["today", "Today"],
              ["week", "This Week"],
              ["month", "This Month"],
              ["quarter", "This Quarter"],
              ["year", "This Year"],
              ["custom", "Custom"],
            ].map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={dateShortcut === key ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => {
                  setDateShortcut(key);
                  if (key !== "custom") {
                    setDateFrom("");
                    setDateTo("");
                  }
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {isAdmin && (
              <select
                className={SELECT_CLASS}
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setBatchId("");
                  setTxnPage(1);
                  setDuePage(1);
                }}
              >
                <option value="ALL">All Branches</option>
                {branches.map((b: { id: string; name: string }) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <select className={SELECT_CLASS} value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
              <option value="">Academic Year</option>
              {options.academicYears.map((y) => (
                <option key={y.id} value={y.name}>
                  {y.name}
                </option>
              ))}
            </select>
            {dateShortcut === "custom" && (
              <>
                <Input type="date" className="h-9 text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <Input type="date" className="h-9 text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </>
            )}
            <select
              className={SELECT_CLASS}
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                setBatchId("");
                setTxnPage(1);
                setDuePage(1);
              }}
            >
              <option value="">All Courses</option>
              {options.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} — ${c.name}` : c.name}
                </option>
              ))}
            </select>
            <select
              className={SELECT_CLASS}
              value={batchId}
              onChange={(e) => {
                setBatchId(e.target.value);
                setTxnPage(1);
                setDuePage(1);
              }}
            >
              <option value="">All Batches</option>
              {options.batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select className={SELECT_CLASS} value={feeHeadMasterId} onChange={(e) => setFeeHeadMasterId(e.target.value)}>
              <option value="">All Fee Heads</option>
              {options.feeHeads.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <select
              className={SELECT_CLASS}
              value={paymentModeMasterId}
              onChange={(e) => setPaymentModeMasterId(e.target.value)}
            >
              <option value="">All Payment Modes</option>
              {options.paymentModes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select className={SELECT_CLASS} value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              <option value="">Payment Status (Success)</option>
              {["SUCCESS", "PENDING", "FAILED", "VOID"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select className={SELECT_CLASS} value={transactionType} onChange={(e) => setTransactionType(e.target.value)}>
              <option value="">Transaction Type</option>
              <option value="COLLECTION">Collection</option>
              <option value="PENDING">Pending Payment</option>
              <option value="FAILED">Failed</option>
              <option value="VOID">Voided</option>
            </select>
            <select className={SELECT_CLASS} value={counsellorId} onChange={(e) => setCounsellorId(e.target.value)}>
              <option value="">All Counsellors</option>
              {options.counsellors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className={SELECT_CLASS}
              value={outstandingFilter}
              onChange={(e) => {
                setOutstandingFilter(e.target.value);
                setDuePage(1);
              }}
            >
              <option value="">Outstanding: All Open</option>
              <option value="OVERDUE">Overdue</option>
              <option value="DUE_SOON">Due Soon</option>
              <option value="PENDING">Pending</option>
              <option value="PARTIAL">Partially Paid</option>
            </select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-9 pl-8 text-xs"
                placeholder="Search receipt / student..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setTxnPage(1);
                }}
              />
              {searchTerm && (
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearchTerm("")}>
                  <X className="h-3.5 w-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFilters}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
      </FilterToolbar>

      <MetricGrid columns={METRIC_GRID_COLUMNS[4]} density="compact">
        {[
          { label: "Collected", value: inr(summary.totalCollected), tone: "text-emerald-600" },
          { label: "Outstanding", value: inr(summary.totalPending), tone: "text-amber-600" },
          { label: "Collection Rate", value: `${summary.collectionRate}%`, tone: "text-blue-600" },
          { label: "Net Revenue", value: inr(summary.netRevenue ?? summary.totalCollected), tone: "text-emerald-700" },
        ].map((m) => (
          <Card key={m.label} size="compact" className="border-border/50 shadow-sm">
            <CardContent size="compact">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{m.label}</p>
              <h3 className={`text-lg font-bold mt-1 ${m.tone}`}>{m.value}</h3>
            </CardContent>
          </Card>
        ))}
      </MetricGrid>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 print:hidden">
        <AttentionCard title="Overdue Fees" items={needs.overdueFees} icon={AlertTriangle} tone="bg-red-50 text-red-700" />
        <AttentionCard title="High Outstanding" items={needs.highOutstanding} icon={DollarSign} tone="bg-amber-50 text-amber-700" />
        <AttentionCard title="Failed Payments" items={needs.failedPayments} icon={AlertCircle} tone="bg-rose-50 text-rose-700" />
        <AttentionCard title="Partially Paid" items={needs.partiallyPaid} icon={CreditCard} tone="bg-slate-100 text-slate-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="p-5 pb-2 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Collection Trend
              </CardTitle>
              <CardDescription className="text-xs">Demand vs collected vs pending</CardDescription>
            </div>
            <div className="flex gap-1 print:hidden">
              <Button size="sm" variant={trendMode === "monthly" ? "default" : "outline"} className="h-8 text-xs" onClick={() => setTrendMode("monthly")}>
                Monthly
              </Button>
              <Button size="sm" variant={trendMode === "yearly" ? "default" : "outline"} className="h-8 text-xs" onClick={() => setTrendMode("yearly")}>
                Yearly
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-4 h-72">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(val: number) => inr(Number(val))} />
                  <Legend />
                  <Bar dataKey="demand" fill="#94a3b8" name="Demand" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="collected" fill="#10b981" name="Collected" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No trend data.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="p-5 pb-2 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-purple-600" /> Payment Mode Share
            </CardTitle>
            <CardDescription className="text-xs">
              Online gateway vs offline from payment modes master
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="h-56 w-full md:w-1/2">
              {(data?.paymentMethodShare || []).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data?.paymentMethodShare} dataKey="value" nameKey="name" innerRadius={35} outerRadius={70} paddingAngle={3}>
                      {(data?.paymentMethodShare || []).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => inr(Number(val))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No payment mode data.</div>
              )}
            </div>
            <div className="w-full md:w-1/2 space-y-2 text-xs">
              {(data?.paymentMethodShare || []).map((item) => (
                <div key={item.name} className="flex justify-between gap-2 border rounded-md px-2 py-1.5 bg-muted/20">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    {item.name}
                    <Badge variant="secondary" className="text-[9px]">{item.channel || "—"}</Badge>
                  </span>
                  <span className="font-mono font-semibold">
                    {inr(item.value)} ({item.percentage ?? 0}%) · {item.count ?? 0} txn
                  </span>
                </div>
              ))}
              {(data?.channelShare || []).length > 0 && (
                <div className="pt-2 border-t text-[11px] text-slate-600 space-y-1">
                  {data?.channelShare?.map((c) => (
                    <div key={c.channel} className="flex justify-between">
                      <span>{c.channel}</span>
                      <span className="font-semibold">
                        {inr(c.amount)} ({c.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="p-5 pb-2 border-b">
          <CardTitle className="text-base font-bold">Daily Collection Report</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Refunds</TableHead>
                <TableHead>Net Collection</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.dailyCollection || []).length > 0 ? (
                (data?.dailyCollection || []).map((d) => (
                  <TableRow key={d.date}>
                    <TableCell className="text-xs font-medium">{d.date}</TableCell>
                    <TableCell className="text-xs">{d.transactions}</TableCell>
                    <TableCell className="text-xs font-mono text-emerald-600">{inr(d.collected)}</TableCell>
                    <TableCell className="text-xs font-mono">{inr(d.refunds)}</TableCell>
                    <TableCell className="text-xs font-mono font-semibold">{inr(d.netCollection)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-xs text-slate-400">
                    No daily collections in range.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="p-5 pb-2 border-b">
            <CardTitle className="text-base font-bold">Fee Head-wise Collection</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Fee Head</TableHead>
                  <TableHead>Demand</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.feeHeadBreakdown || []).map((h) => (
                  <TableRow key={h.feeHeadMasterId || h.feeHead}>
                    <TableCell className="text-xs font-medium">{h.feeHead}</TableCell>
                    <TableCell className="text-xs font-mono">{inr(h.demand)}</TableCell>
                    <TableCell className="text-xs font-mono text-emerald-600">{inr(h.collected)}</TableCell>
                    <TableCell className="text-xs font-mono text-amber-600">{inr(h.pending)}</TableCell>
                  </TableRow>
                ))}
                {(data?.feeHeadBreakdown || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-16 text-center text-xs text-slate-400">
                      No fee head data.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="p-5 pb-2 border-b">
            <CardTitle className="text-base font-bold">Outstanding Aging</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-3">
              {(data?.agingBuckets || []).map((b) => (
                <div key={b.bucket} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold">{b.bucket}</p>
                    <p className="text-[10px] text-slate-500">{b.count} dues</p>
                  </div>
                  <p className="text-sm font-mono font-bold text-amber-700">{inr(b.amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-sm xl:col-span-1">
          <CardHeader className="p-5 pb-2 border-b">
            <CardTitle className="text-base font-bold">Branch-wise</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.branchBreakdown || []).map((b) => (
                  <TableRow key={b.branchId}>
                    <TableCell className="text-xs font-medium">{b.branchName || b.branchId}</TableCell>
                    <TableCell className="text-xs font-mono text-emerald-600">{inr(b.collected)}</TableCell>
                    <TableCell className="text-xs font-mono text-amber-600">{inr(b.pending)}</TableCell>
                    <TableCell className="text-xs font-semibold">{b.collectionRate ?? 0}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm xl:col-span-1">
          <CardHeader className="p-5 pb-2 border-b">
            <CardTitle className="text-base font-bold">Course-wise</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.courseBreakdown || []).slice(0, 15).map((c) => (
                  <TableRow key={c.courseId || c.courseName}>
                    <TableCell className="text-xs font-medium">{c.courseName}</TableCell>
                    <TableCell className="text-xs">{c.students}</TableCell>
                    <TableCell className="text-xs font-mono text-emerald-600">{inr(c.collected)}</TableCell>
                    <TableCell className="text-xs font-semibold">{c.collectionRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm xl:col-span-1">
          <CardHeader className="p-5 pb-2 border-b">
            <CardTitle className="text-base font-bold">Batch-wise</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.batchBreakdown || []).slice(0, 15).map((b) => (
                  <TableRow key={b.batchId || b.batchName}>
                    <TableCell className="text-xs font-medium">{b.batchName}</TableCell>
                    <TableCell className="text-xs">{b.students}</TableCell>
                    <TableCell className="text-xs font-mono text-amber-600">{inr(b.pending)}</TableCell>
                    <TableCell className="text-xs font-semibold">{b.collectionRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="p-5 pb-2 border-b">
            <CardTitle className="text-base font-bold">Concession / Discount</CardTitle>
            <CardDescription className="text-xs">
              Estimated from concession head % on admissions (not a separate ledger yet). Total:{" "}
              {inr(data?.concessionBreakdown?.total || 0)}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Concession Head</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.concessionBreakdown?.byHead || []).length > 0 ? (
                  data?.concessionBreakdown?.byHead.map((h) => (
                    <TableRow key={h.head}>
                      <TableCell className="text-xs">{h.head}</TableCell>
                      <TableCell className="text-xs font-mono">{inr(h.amount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-16 text-center text-xs text-slate-400">
                      No concession estimates available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="p-5 pb-2 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Payment Reconciliation
            </CardTitle>
            <CardDescription className="text-xs">{data?.reconciliation?.note}</CardDescription>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-2 gap-3 text-xs">
            {[
              ["Gateway (online methods)", data?.reconciliation?.gatewayAmount],
              ["ERP Collection", data?.reconciliation?.erpAmount],
              ["Matched (approx)", data?.reconciliation?.matched],
              ["Unmatched", data?.reconciliation?.unmatched],
              ["Failed", data?.reconciliation?.failed],
              ["Pending payments", data?.reconciliation?.pending],
              ["Voided", data?.reconciliation?.voided],
            ].map(([label, value]) => (
              <div key={String(label)} className="border rounded-md p-3">
                <p className="text-slate-500">{label}</p>
                <p className="font-mono font-bold mt-1">{inr(Number(value || 0))}</p>
              </div>
            ))}
            <div className="col-span-2 text-[11px] text-slate-500 border rounded-md p-3 bg-slate-50">
              Refunds: {data?.refundReport?.note || "Not enabled."}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="p-5 pb-2 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold">Outstanding / Due Report</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {dues.length} open
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDues.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-xs">
                    {d.studentId ? (
                      <Link
                        to={`${basePath}/fees/students/${d.studentId}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {d.studentName}
                      </Link>
                    ) : (
                      <div className="font-semibold">{d.studentName}</div>
                    )}
                    <div className="text-[10px] text-slate-500 font-mono">{d.admissionNo}</div>
                  </TableCell>
                  <TableCell className="text-xs">{d.courseName}</TableCell>
                  <TableCell className="text-xs">{d.batchName || "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{inr(d.totalFee)}</TableCell>
                  <TableCell className="text-xs font-mono text-emerald-600">{inr(d.paid)}</TableCell>
                  <TableCell className="text-xs font-mono text-amber-600">{inr(d.pending)}</TableCell>
                  <TableCell className="text-xs">{d.dueDate.slice(0, 10)}</TableCell>
                  <TableCell>
                    <Badge variant={d.status === "OVERDUE" ? "destructive" : "secondary"}>{d.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedDues.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-20 text-center text-xs text-slate-400">
                    No outstanding dues for filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {dues.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t px-4 py-3 print:hidden">
              <p className="text-xs text-slate-500">
                Page {safeDuePage} of {duePages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" disabled={safeDuePage <= 1} onClick={() => setDuePage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safeDuePage >= duePages}
                  onClick={() => setDuePage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="p-5 pb-2 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Payment Transaction / Receipt Report
            </CardTitle>
            <CardDescription className="text-xs">Financial audit table — open receipt from Fees module</CardDescription>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {transactions.length} rows
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Fee Head</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Collected By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTxn.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs font-mono font-semibold text-primary">{r.receiptNo}</TableCell>
                  <TableCell className="text-xs">
                    {r.studentId ? (
                      <Link
                        to={`${basePath}/fees/students/${r.studentId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {r.studentName}
                      </Link>
                    ) : (
                      <div className="font-medium">{r.studentName}</div>
                    )}
                    <div className="text-[10px] text-slate-500">{r.admissionNo}</div>
                  </TableCell>
                  <TableCell className="text-xs">{r.courseName}</TableCell>
                  <TableCell className="text-xs">{r.branchName || "—"}</TableCell>
                  <TableCell className="text-xs">{r.feeHead || "—"}</TableCell>
                  <TableCell className="text-xs font-mono font-bold">{inr(r.amount)}</TableCell>
                  <TableCell className="text-xs">{r.method}</TableCell>
                  <TableCell className="text-xs text-slate-600">{r.collectedBy || "—"}</TableCell>
                  <TableCell className="text-xs">{r.date.slice(0, 10)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "SUCCESS" ? "success" : "secondary"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="print:hidden">
                    <div className="flex flex-col gap-0.5">
                      <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                        <Link to={`${basePath}/fees/receipts/${r.id}`}>Receipt</Link>
                      </Button>
                      {r.studentId && (
                        <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs text-slate-500">
                          <Link to={`${basePath}/fees/students/${r.studentId}`}>Fees</Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedTxn.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="h-20 text-center text-xs text-slate-400">
                    No transactions for filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {transactions.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t px-4 py-3 print:hidden">
              <p className="text-xs text-slate-500">
                Page {safeTxnPage} of {txnPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" disabled={safeTxnPage <= 1} onClick={() => setTxnPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safeTxnPage >= txnPages}
                  onClick={() => setTxnPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="p-5 pb-2 border-b">
          <CardTitle className="text-base font-bold">Financial Summary Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Demand</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Concession</TableHead>
                <TableHead>Refund</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.monthlyBreakdown || []).map((row) => {
                const rate =
                  row.collectionRate ??
                  Math.round((row.collected / (row.collected + row.pending || 1)) * 100);
                return (
                  <TableRow key={row.month}>
                    <TableCell className="text-xs font-semibold">{row.month}</TableCell>
                    <TableCell className="text-xs font-mono">{inr(row.demand || 0)}</TableCell>
                    <TableCell className="text-xs font-mono text-emerald-600">{inr(row.collected)}</TableCell>
                    <TableCell className="text-xs font-mono text-amber-600">{inr(row.pending)}</TableCell>
                    <TableCell className="text-xs font-mono">{inr(row.concession || 0)}</TableCell>
                    <TableCell className="text-xs font-mono">{inr(row.refunds || 0)}</TableCell>
                    <TableCell className="text-xs font-mono font-semibold">{inr(row.netCollection ?? row.collected)}</TableCell>
                    <TableCell className="text-xs font-bold">{rate}%</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          rate >= 70
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                        }
                      >
                        {rate >= 70 ? "Healthy" : "Attention"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

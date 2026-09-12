import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Download,
  Loader2,
  AlertCircle,
  Clock,
  AlertTriangle,
  CalendarDays,
  Wallet,
} from "lucide-react";
import { useFeeReports } from "../../../hooks/useFees";
import { useFormatCurrency } from "@/hooks/useOrganizationFormat";
import { getPortalBasePath } from "@/utils/portal-path";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "recharts";

export const FeeReports: React.FC = () => {
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const formatMoney = useFormatCurrency();
  const { data: reportsData, isLoading, isError, refetch } = useFeeReports();
  const reports = reportsData?.data;

  const handleExportReport = () => {
    if (!reports) return;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Metric,Value\n" +
      `Total Revenue Collected,₹${reports.totalCollected}\n` +
      `Outstanding Dues,₹${reports.outstandingDues ?? 0}\n` +
      `Overdue Dues,₹${reports.overdueDues ?? 0}\n` +
      `Due This Week,₹${reports.dueThisWeek ?? 0}\n` +
      `Expected Book (Collected + Open Dues),₹${reports.targetRevenue}\n` +
      `Collection Progress,${reports.targetAchievedPercent}%\n\n` +
      "Month,Revenue\n" +
      reports.monthlyRevenue.map((m) => `${m.month},${m.revenue}`).join("\n") +
      "\n\n" +
      "Course,Revenue\n" +
      reports.courseRevenue.map((c) => `${c.name},${c.value}`).join("\n") +
      "\n\n" +
      "Payment Mode,Count,Amount\n" +
      (reports.paymentModeDistribution || [])
        .map((m) => `${m.mode},${m.count},${m.amount}`)
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Fee_Financial_Report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            Fee Financial Reports
          </h2>
          <p className="text-sm text-text-secondary">
            SUCCESS payments only (VOID excluded). Outstanding from open installment dues.
          </p>
        </div>

        <Button
          variant="outline"
          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          onClick={handleExportReport}
          disabled={!reports}
        >
          <Download className="mr-2 h-4 w-4 text-[#2563EB]" />
          Export Financial Report (CSV)
        </Button>
      </div>

      {isLoading ? (
        <Card className="border-border/50 bg-white p-12 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-600">
            <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
            Loading financial reports & analytics...
          </div>
        </Card>
      ) : isError ? (
        <Card className="border-border/50 bg-white p-12 text-center text-red-600">
          <AlertCircle className="w-6 h-6 inline mr-2" />
          Failed to load fee reports.
          <Button variant="link" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      ) : !reports ||
        (reports.totalCollected === 0 &&
          reports.targetRevenue === 0 &&
          reports.monthlyRevenue.length === 0) ? (
        <Card className="border-border/50 bg-white p-12 text-center text-text-secondary">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No fee collection data yet. Record payments to see reports.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{formatMoney(reports.totalCollected)}</p>
                  <p className="text-xs text-text-secondary">Collected</p>
                </div>
              </CardContent>
            </Card>
            <Link
              to={`${basePath}/fees/students?tab=pending`}
              className="block hover:opacity-95"
            >
              <Card className="border-border/50 h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">
                      {formatMoney(reports.outstandingDues ?? 0)}
                    </p>
                    <p className="text-xs text-text-secondary">Outstanding · view dues</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link
              to={`${basePath}/fees/students?tab=pending`}
              className="block hover:opacity-95"
            >
              <Card className="border-border/50 h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{formatMoney(reports.overdueDues ?? 0)}</p>
                    <p className="text-xs text-text-secondary">
                      Overdue
                      {(reports.overdueCount ?? 0) > 0 ? ` · ${reports.overdueCount}` : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link
              to={`${basePath}/fees/students?tab=pending&dueWithinDays=7`}
              className="block hover:opacity-95"
            >
              <Card className="border-border/50 h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-sky-50 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{formatMoney(reports.dueThisWeek ?? 0)}</p>
                    <p className="text-xs text-text-secondary">
                      Due this week
                      {(reports.dueThisWeekCount ?? 0) > 0
                        ? ` · ${reports.dueThisWeekCount}`
                        : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          <Card className="border-border/50 bg-white shadow-sm p-6 space-y-3">
            <div className="flex justify-between items-center text-sm font-semibold">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#2563EB]" />
                <span className="text-slate-900">Collected vs Expected Book</span>
              </div>
              <span className="text-[#2563EB] font-bold text-base">
                {formatMoney(reports.totalCollected)} / {formatMoney(reports.targetRevenue)} (
                {reports.targetAchievedPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
                style={{ width: `${reports.targetAchievedPercent}%` }}
              />
            </div>
            <p className="text-xs text-text-secondary">
              Expected book = SUCCESS collections + open installment dues (VOID payments excluded).
            </p>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/50 bg-white shadow-sm">
              <CardHeader className="p-5 pb-2 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#2563EB]" />
                  Monthly Revenue Collection Trend
                </CardTitle>
                <CardDescription className="text-xs">
                  Month-on-month fee collection history
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 h-72">
                {reports.monthlyRevenue.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-text-secondary">
                    No monthly revenue series yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reports.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12, fill: "currentColor" }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "currentColor" }}
                        className="text-muted-foreground"
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(val: number) => [
                          `₹${Number(val).toLocaleString("en-IN")}`,
                          "Revenue",
                        ]}
                      />
                      <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="p-5 pb-2 border-b border-border">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-emerald-600" />
                  Course Revenue Breakdown
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Revenue generated per course program
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 h-72 flex items-center justify-center">
                {reports.courseRevenue.length === 0 ? (
                  <div className="text-sm text-text-secondary">No course revenue yet.</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reports.courseRevenue}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {reports.courseRevenue.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: number) => [
                            `₹${Number(val).toLocaleString("en-IN")}`,
                            "Revenue",
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 pl-4 max-w-[180px]">
                      {reports.courseRevenue.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="truncate text-slate-700 font-medium">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(reports.paymentModeDistribution?.length ?? 0) > 0 && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Payment modes
                  </CardTitle>
                  <CardDescription>SUCCESS payments by method</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reports.paymentModeDistribution.map((m) => (
                    <div
                      key={m.mode}
                      className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
                    >
                      <span className="font-medium">
                        {m.mode} · {m.count}
                      </span>
                      <span className="text-text-secondary">{formatMoney(m.amount)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {(reports.dueStatusSummary?.length ?? 0) > 0 && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Open dues by status</CardTitle>
                  <CardDescription>Installments with remaining balance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reports.dueStatusSummary.map((s) => (
                    <div
                      key={s.status}
                      className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
                    >
                      <span className="font-medium">
                        {s.status} · {s.count}
                      </span>
                      <span className="text-text-secondary">{formatMoney(s.totalAmount)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {(reports.byFeeHead?.length ?? 0) > 0 && (
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">By fee head</CardTitle>
                <CardDescription>
                  Collected vs pending across tuition, book, exam, and other heads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {reports.byFeeHead!.map((h) => (
                  <div
                    key={h.feeHeadMasterId || h.feeHead}
                    className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
                  >
                    <span className="font-medium">{h.feeHead}</span>
                    <span className="text-text-secondary">
                      Collected {formatMoney(Number(h.collected))} · Pending{" "}
                      {formatMoney(Number(h.pending))}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

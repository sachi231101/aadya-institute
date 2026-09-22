import { FileCheck2, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApplicationListItem } from "@/utils/map-application";
import { renderApplicationStatusBadge } from "./application-status-badges";

interface ApplicationsTableProps {
  rows: ApplicationListItem[];
  isLoading: boolean;
  currentPage: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onRowClick: (app: ApplicationListItem) => void;
}

export function ApplicationsTable({
  rows,
  isLoading,
  currentPage,
  total,
  pageSize,
  onPageChange,
  onRowClick,
}: ApplicationsTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  return (
    <Card className="border border-border shadow-xs rounded-xl overflow-hidden bg-card">
      <div
        className={
          "min-w-0 overflow-x-auto " +
          "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm " +
          "[&_thead]:bg-muted/50 " +
          "[&_th]:h-9 [&_th]:px-3 [&_th]:py-2 [&_th]:text-[11px] [&_th]:font-semibold " +
          "[&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground " +
          "[&_th]:border [&_th]:border-border [&_th]:whitespace-nowrap " +
          "[&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_td]:border [&_td]:border-border " +
          "[&_tbody_tr]:hover:bg-muted/30 [&_tbody_tr]:transition-colors"
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="hidden sm:table-cell">Fee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                  Loading applications...
                </TableCell>
              </TableRow>
            ) : rows.length > 0 ? (
              rows.map((app) => (
                <TableRow
                  key={app.id}
                  onClick={() => onRowClick(app)}
                  className="cursor-pointer group"
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-8 w-8 border border-border shrink-0">
                        <AvatarImage src={app.avatar} alt={app.applicantName} />
                        <AvatarFallback className="text-[10px] font-semibold">
                          {app.applicantName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {app.applicantName}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">
                          {app.applicationNo}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium text-foreground truncate max-w-[140px]">
                      {app.courseName}
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span
                      className={`text-xs font-medium ${
                        app.feeStatus === "PAID" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {app.feeStatus === "PAID" ? "Paid" : "Due"}
                      {app.feeStatus === "PAID" && app.applicationFee != null && (
                        <span className="text-foreground font-semibold">
                          {" "}
                          · ₹{Number(app.applicationFee).toLocaleString("en-IN")}
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    {renderApplicationStatusBadge(app.status, app.feeStatus)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p className="text-xs text-muted-foreground">{app.submittedDate}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary inline-block" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground py-6">
                    <FileCheck2 className="h-7 w-7 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-foreground">No applications found</p>
                    <p className="text-xs">Try adjusting search or filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {from}–{to} of {total}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          </Button>
          <span className="text-foreground font-medium">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

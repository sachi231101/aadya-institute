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
    <Card className="border border-border shadow-xs rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40 border-b border-border">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pl-5">
                Applicant
              </TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Course
              </TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                Fee
              </TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                Date
              </TableHead>
              <TableHead className="py-2.5 px-4 w-10" />
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
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
                  className="hover:bg-muted/30 transition-colors cursor-pointer group border-border"
                >
                  <TableCell className="py-3 px-4 pl-5 align-middle">
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
                  <TableCell className="py-3 px-4 align-middle">
                    <p className="text-xs font-medium text-foreground truncate max-w-[140px]">
                      {app.courseName}
                    </p>
                  </TableCell>
                  <TableCell className="py-3 px-4 align-middle hidden sm:table-cell">
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
                  <TableCell className="py-3 px-4 align-middle">
                    {renderApplicationStatusBadge(app.status, app.feeStatus)}
                  </TableCell>
                  <TableCell className="py-3 px-4 align-middle hidden md:table-cell">
                    <p className="text-xs text-muted-foreground">{app.submittedDate}</p>
                  </TableCell>
                  <TableCell className="py-3 px-4 pr-4 align-middle text-right">
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

import React, { useEffect, useMemo, useState } from "react";
import {
  Megaphone,
  Search,
  CheckCheck,
  Calendar,
  Briefcase,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudentAcademicAccess } from "@/hooks/useStudentAcademicAccess";
import {
  useAnnouncements,
  useMarkAnnouncementRead,
  useMarkAllAnnouncementsRead,
} from "@/hooks/useAnnouncements";
import type { Announcement } from "@/services/announcements.api";
import { PageContainer, PageHeader, FilterToolbar, PageSection } from "@/components/layout";

const formatWhen = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const authorName = (item: Announcement) =>
  item.createdBy?.name || item.faculty?.user?.name || "Institute";

const authorTitle = (item: Announcement) =>
  item.faculty?.designation || item.authorRole || "Staff";

export const StudentAnnouncements: React.FC = () => {
  const academic = useStudentAcademicAccess();
  const [selectedBatchId, setSelectedBatchId] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, isError } = useAnnouncements({
    status: "PUBLISHED",
    view: "inbox",
    limit: 50,
    search: debouncedSearch || undefined,
    batchId: selectedBatchId === "ALL" ? undefined : selectedBatchId,
  });
  const markRead = useMarkAnnouncementRead();
  const markAllRead = useMarkAllAnnouncementsRead();

  const items = data?.data || [];

  useEffect(() => {
    if (items.length === 0) {
      setSelectedAnnouncementId("");
      return;
    }
    if (!items.some((item) => item.id === selectedAnnouncementId)) {
      setSelectedAnnouncementId(items[0].id);
    }
  }, [items, selectedAnnouncementId]);

  const selected = items.find((item) => item.id === selectedAnnouncementId) || null;

  useEffect(() => {
    if (selected && !selected.isRead && !markRead.isPending) {
      markRead.mutate(selected.id);
    }
  }, [selected?.id, selected?.isRead]);

  return (
    <PageContainer className="animate-in fade-in duration-300">
      <PageHeader
        title="Announcements"
        description="Stay updated with important announcements from your Faculty, Counsellor, and Admin."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              markAllRead.mutate(selectedBatchId === "ALL" ? undefined : selectedBatchId)
            }
            className="h-9 px-3.5 text-xs font-bold gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5 text-primary" />
            Mark all as read
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[760px] items-start">
        <PageSection title="Inbox" className="lg:col-span-5 h-full min-h-0 flex flex-col">
          <div className="bg-card border border-border/80 rounded-xl shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-5 border-b border-border/80 bg-card">
              <FilterToolbar>
                <div className="relative flex-1 min-w-[140px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search announcements..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="h-9 pl-9 pr-3 text-xs"
                  />
                </div>
                <select
                  value={selectedBatchId}
                  onChange={(event) => setSelectedBatchId(event.target.value)}
                  className="h-9 px-3 text-xs font-semibold bg-muted/30 border border-border rounded-lg outline-none cursor-pointer shrink-0"
                >
                  <option value="ALL">All My Batches</option>
                  {academic.assignedBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
              </FilterToolbar>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/80">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading announcements...</div>
              ) : isError ? (
                <div className="p-8 text-center text-xs text-destructive">Could not load announcements.</div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center h-64">
                  <Megaphone className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-600">No announcements found</p>
                  <p className="text-[11px] text-slate-400 mt-1">You're all caught up with your updates!</p>
                </div>
              ) : (
                items.map((item) => {
                  const isSelected = item.id === selected?.id;
                  const isCounsellor = item.authorRole === "COUNSELLOR";
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedAnnouncementId(item.id)}
                      className={`p-4 flex items-start gap-3 cursor-pointer ${
                        isSelected ? "bg-blue-50/70 border-l-4 border-l-[#1D4ED8]" : "border-l-4 border-l-transparent hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="relative shrink-0 mt-0.5">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${isCounsellor ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-primary"}`}>
                          {isCounsellor ? <Briefcase className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                        </div>
                        {!item.isRead && (
                          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="text-xs font-semibold truncate">{item.title}</h3>
                          <span className="text-[10px] text-slate-400 shrink-0">{formatWhen(item.publishedAt).split(",")[1]}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{item.body}</p>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span className={`px-1.5 rounded-md text-[9px] font-semibold ${isCounsellor ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"}`}>
                            {item.authorRole || "Faculty"}
                          </span>
                          <span className="font-bold text-slate-700">{authorName(item)}</span>
                          <span className="text-primary font-bold">{item.batch?.name || item.branch?.name || "Institute"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 border-t border-border/80 bg-muted/30 text-[11px] text-muted-foreground">
              Showing {items.length} announcement{items.length === 1 ? "" : "s"}
            </div>
          </div>
        </PageSection>

        <PageSection title="Details" className="lg:col-span-7 h-full min-h-0 flex flex-col">
          <div className="bg-card border border-border/80 rounded-xl shadow-xs p-5 flex-1 min-h-0 overflow-y-auto">
            {selected ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/80">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-blue-50 text-primary border border-blue-200">
                      {selected.type}
                    </span>
                    {selected.type === "URGENT" && (
                      <Badge className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">Important</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatWhen(selected.publishedAt)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold leading-tight">{selected.title}</h2>
                  <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Posted by {selected.authorRole || "Staff"}
                    </span>
                    <h4 className="text-xs font-semibold">{authorName(selected)}</h4>
                    <span className="text-[11px] font-bold text-indigo-600">{authorTitle(selected)}</span>
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-slate-50/50 border border-slate-200/70 text-xs leading-relaxed whitespace-pre-line">
                  {selected.body}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Audience</span>
                    <span className="font-bold text-xs mt-0.5 block">
                      {selected.batch?.name || selected.branch?.name || "All students"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Date and time</span>
                    <span className="font-bold text-xs mt-0.5 block">{formatWhen(selected.publishedAt)}</span>
                  </div>
                </div>
                {selected.isRead && selected.readAt && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 w-fit">
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>You read this at {formatWhen(selected.readAt)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Megaphone className="h-12 w-12 text-slate-200 mb-2" />
                <p className="text-sm font-bold text-slate-600">Select an announcement to read</p>
              </div>
            )}
          </div>
        </PageSection>
      </div>
    </PageContainer>
  );
};

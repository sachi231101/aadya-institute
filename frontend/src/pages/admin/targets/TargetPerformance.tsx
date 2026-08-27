import React, { useState } from "react";
import {
  TrendingUp,
  Award,
  Trophy,
  Users,
  Target as TargetIcon,
  AlertTriangle,
  Sparkles,
  Building2,
  DollarSign,
  UserCheck,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  usePerformanceSummary,
  useLeaderboard,
} from "../../../hooks/useTargets";
import { useAuthStore } from "../../../store/auth.store";

export const TargetPerformance: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"leaderboard" | "counselors">("leaderboard");

  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = usePerformanceSummary(selectedBranch || undefined);

  const {
    data: leaderboard,
    isLoading: leaderboardLoading,
    refetch: refetchLeaderboard,
  } = useLeaderboard(selectedBranch || undefined);

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  };

  const counselorStats = summary?.counselorStats || [];
  const filteredCounselors = counselorStats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLeaderboard = (leaderboard || []).filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl text-white">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-xl">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Academy Performance & Leaderboard
            </h1>
          </div>
          <p className="text-slate-300 text-sm">
            Live analytics of counselor target achievements, team rankings, and incentive rewards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchSummary();
              refetchLeaderboard();
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            Refresh Analytics
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Targets
            </span>
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <TargetIcon className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {summary?.totalTargets || 0}
          </div>
          <p className="text-xs text-slate-400">Assigned active goals</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Avg Achievement
            </span>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-400 mb-1">
            {summary?.averageAchievementRate || 0}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${Math.min(summary?.averageAchievementRate || 0, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Top Performer 🥇
            </span>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Award className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="text-lg font-bold text-white mb-1 truncate">
            {summary?.topPerformer?.name || "Evaluating..."}
          </div>
          <p className="text-xs text-amber-400 font-semibold">
            {summary?.topPerformer
              ? `${summary.topPerformer.achievementRate}% achievement rate`
              : "No data yet"}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Needs Attention
            </span>
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-rose-400 mb-1">
            {summary?.needsAttentionCount || 0}
          </div>
          <p className="text-xs text-slate-400">Goals under 70% rate</p>
        </div>
      </div>

      {/* Tabs and Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("leaderboard")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              viewMode === "leaderboard"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            Live Leaderboard
          </button>
          <button
            onClick={() => setViewMode("counselors")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              viewMode === "counselors"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            Counselor Breakdown
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search counselor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* ─── LEADERBOARD VIEW ─── */}
      {viewMode === "leaderboard" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Counselor Rankings
              </h2>
              <p className="text-xs text-slate-400">
                Ranked by overall target completion percentage and sales drive.
              </p>
            </div>
          </div>

          {leaderboardLoading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-3" />
              <p>Loading leaderboard...</p>
            </div>
          ) : filteredLeaderboard.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white">No Counselors Ranked Yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredLeaderboard.map((c) => {
                const isGold = c.rank === 1;
                const isSilver = c.rank === 2;
                const isBronze = c.rank === 3;

                return (
                  <div
                    key={c.userId}
                    className={`relative p-5 rounded-2xl border transition-all ${
                      isGold
                        ? "bg-gradient-to-b from-amber-500/10 to-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/10"
                        : isSilver
                        ? "bg-gradient-to-b from-slate-400/10 to-slate-900/90 border-slate-400/40"
                        : isBronze
                        ? "bg-gradient-to-b from-orange-500/10 to-slate-900/90 border-orange-500/40"
                        : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm shadow-md ${
                          isGold
                            ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950"
                            : isSilver
                            ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950"
                            : isBronze
                            ? "bg-gradient-to-br from-orange-400 to-amber-700 text-white"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        #{c.rank}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {c.branchName}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-base truncate mb-1">{c.name}</h3>

                    {/* Progress */}
                    <div className="space-y-1.5 my-4">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400">Achievement Rate</span>
                        <span
                          className={
                            c.achievementPercentage >= 100
                              ? "text-emerald-400 font-extrabold"
                              : c.achievementPercentage >= 70
                              ? "text-amber-400"
                              : "text-rose-400"
                          }
                        >
                          {c.achievementPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            c.achievementPercentage >= 100
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                              : c.achievementPercentage >= 70
                              ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                              : "bg-gradient-to-r from-rose-500 to-pink-500"
                          }`}
                          style={{ width: `${Math.min(c.achievementPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── COUNSELOR COMPARISON TABLE ─── */}
      {viewMode === "counselors" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800">
            <h3 className="text-base font-bold text-white">Counselor Target Breakdown</h3>
            <p className="text-xs text-slate-400">
              Aggregated statistics across all assigned targets and potential reward totals.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-4 px-4">Counselor</th>
                  <th className="py-4 px-4">Branch</th>
                  <th className="py-4 px-4">Target Count</th>
                  <th className="py-4 px-4">Total Goal</th>
                  <th className="py-4 px-4">Total Achieved</th>
                  <th className="py-4 px-4">Overall %</th>
                  <th className="py-4 px-4">Potential Incentive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCounselors.map((c) => (
                  <tr key={c.userId} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4 font-semibold text-white">{c.name}</td>
                    <td className="py-4 px-4 text-xs text-slate-400">{c.branchName}</td>
                    <td className="py-4 px-4 font-medium text-white">{c.targetCount} Goals</td>
                    <td className="py-4 px-4 font-medium text-slate-300">
                      {c.totalTarget.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 font-bold text-emerald-400">
                      {c.totalAchieved.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          c.achievementRate >= 100
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : c.achievementRate >= 70
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {c.achievementRate}%
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-amber-400">
                      {formatCurrency(c.potentialIncentive)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

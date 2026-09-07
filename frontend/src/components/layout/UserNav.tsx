import React from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth.store";
import { User, Settings, LogOut, Shield, ChevronDown, Building2 } from "lucide-react";

interface UserNavProps {
  className?: string;
}

export const UserNav: React.FC<UserNavProps> = ({ className = "" }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const name = user?.name || "System Admin";
  const email = user?.email || "admin@aadya.in";
  const role = (user?.roles?.[0] || user?.role || "ADMIN").toUpperCase();
  const branch = user?.branchId ? user.branchId.replace("branch-", "").toUpperCase() : null;
  const initial = (name.charAt(0) || "A").toUpperCase();

  // Role-based profile link
  const getProfilePath = () => {
    if (role.includes("STUDENT")) return "/student/profile";
    if (role.includes("FACULTY")) return "/faculty/home";
    if (role.includes("COUNSELLOR")) return "/counselor/home";
    if (role.includes("CENTER_MANAGER")) return "/center/home";
    return "/admin/settings";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all duration-200 cursor-pointer outline-none focus:ring-2 focus:ring-white/30 select-none ${className}`}
          title={`${name} (${role})`}
        >
          {/* Avatar circle */}
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0 ring-1 ring-white/30">
            {initial}
          </div>

          {/* Name & Role (hidden on small mobile screens) */}
          <div className="hidden md:flex flex-col text-left leading-tight min-w-0 max-w-[145px]">
            <span className="text-xs font-semibold text-white truncate">{name}</span>
            <span className="text-[10px] text-blue-200 font-medium tracking-wide truncate">
              {role.replace("_", " ")}
            </span>
          </div>

          <ChevronDown size={13} className="text-white/70 hidden sm:block shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-56 mt-1 rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md shadow-xl p-1.5 text-popover-foreground z-50"
        align="end"
        sideOffset={6}
      >
        <DropdownMenuLabel className="p-2 font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold leading-none text-foreground truncate">{name}</p>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                {role.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-none truncate">{email}</p>
            {branch && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80 pt-1">
                <Building2 size={11} className="shrink-0" />
                <span className="truncate">Center: {branch}</span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="my-1 bg-border/60" />

        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => navigate(getProfilePath())}
            className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-accent focus:bg-accent transition-colors"
          >
            <User size={14} className="text-muted-foreground" />
            <span>Profile & Account</span>
          </DropdownMenuItem>

          {role.includes("ADMIN") && (
            <DropdownMenuItem
              onClick={() => navigate("/admin/settings")}
              className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-accent focus:bg-accent transition-colors"
            >
              <Settings size={14} className="text-muted-foreground" />
              <span>Platform Settings</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-1 bg-border/60" />

        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium rounded-lg cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus:bg-red-50 dark:focus:bg-red-950/30 transition-colors"
        >
          <LogOut size={14} />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

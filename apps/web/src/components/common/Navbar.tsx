import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Activity, LayoutDashboard, Settings as SettingsIcon, LogOut } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 text-blue-600 font-bold text-xl tracking-tight">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Activity className="h-5 w-5" />
            </div>
            <span>PingBoard</span>
          </Link>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/")
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              to="/settings"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/settings")
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <SettingsIcon className="h-4 w-4" />
              Settings
            </Link>
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-900">Signed in</span>
            <span className="text-xs text-slate-500">{user?.email}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

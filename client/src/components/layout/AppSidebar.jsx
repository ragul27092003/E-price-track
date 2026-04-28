import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ClipboardCheck,
  Settings,
  ChevronLeft,
  Rss,
  Trophy,
  LucideHistory,
  BarChartBigIcon,
  MonitorSpeakerIcon,
  ComponentIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mixComplex } from "framer-motion";

const navItems = [
  
  { title: "Dashboard",          icon: LayoutDashboard, path: "/" },
  { title: "Manage Feed Setup",  icon: Rss,        path: "/manage-feed-setup" },
  { title: "Product History",    icon: LucideHistory,      path: "/product-history"},
  { title: "Competitors",        icon: Trophy,             path: "/competitors" },
  { title: "Products",           icon: Package,         path: "/products" },
  { title: "Notifications",      icon: ClipboardCheck,  path: "/notifications" },
  {title : "Market Competitor", icon: ComponentIcon, path: "/market"},
  { title:"Smart Reports",       icon: BarChartBigIcon,      path: "/smart-reports"},
  { title: "Settings",           icon: Settings,        path: "/settings"},
  
];

export function AppSidebar({ open, onToggle }) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 shrink-0",
        open ? "w-64" : "w-[70px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Rss className="h-5 w-5 text-primary-foreground" />
          </div>
          {open && (
            <span className="text-lg font-semibold text-foreground truncate">
              E-Price Track
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className={cn(
            "ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
            !open && "ml-0 mx-auto mt-2"
          )}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              !open && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-all duration-150",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {open && <span className="truncate">{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>    
    </aside>
  );       
}
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ClipboardCheck,
  Settings,
  Rss,
  Trophy,
  LucideHistory,
  BarChartBigIcon,
  ComponentIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard",         icon: LayoutDashboard, path: "/" },
  { title: "Manage Feed Setup", icon: Rss,             path: "/manage-feed-setup" },
  { title: "Competitors",       icon: Trophy,          path: "/competitors" },
  { title: "Products",          icon: Package,         path: "/products" },
  { title: "Notifications",     icon: ClipboardCheck,  path: "/notifications" },
  { title: "Product History",   icon: LucideHistory,   path: "/product-history" },
  { title: "Market Competitor", icon: ComponentIcon,   path: "/market" },
  { title: "Smart Reports",     icon: BarChartBigIcon, path: "/smart-reports" },
  { title: "Settings",          icon: Settings,        path: "/settings" },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="flex flex-col border-r border-sidebar-border bg-sidebar shrink-0 w-[70px] h-screen">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-sidebar-border px-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Rss className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>

      {/* Main Nav - Scroll removed */}
      <nav className="flex-1 py-4 px-2 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <div key={item.path} className="relative group flex justify-center">
              <NavLink
                to={item.path}
                className={cn(
                  "flex items-center justify-center rounded-lg p-2.5 transition-all duration-150",
                  isActive
                    ? "bg-[#00a884] text-white" // Matching the teal/green color in your screenshot
                    : "text-sidebar-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
              </NavLink>

              {/* Hover Tooltip - Appears like the example image */}
              <div className="invisible group-hover:visible absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50">
                <div className="relative flex items-center">
                  {/* Arrow */}
                  <div className="w-0 h-0 border-y-[6px] border-y-transparent border-r-[6px] border-r-[#00a884]" />
                  {/* Label */}
                  <div className="whitespace-nowrap rounded-md bg-[#00a884] px-3 py-1.5 text-sm font-medium text-white shadow-lg">
                    {item.title}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
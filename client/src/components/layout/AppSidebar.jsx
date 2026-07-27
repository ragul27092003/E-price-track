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
  ComponentIcon,
  Share2Icon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useStore, selectIsSuperAdmin, selectPrimaryColor } from "../../store";
import { ROUTE } from "@/utils/urls";

const navItems = [
  { title: "Dashboard",         icon: LayoutDashboard, path: ROUTE.dashboard },
  { title: "Manage Feed Setup", icon: Rss,             path: ROUTE.manageFeedSetup },
  { title: "Competitors",       icon: Trophy,          path: ROUTE.competitors },
  { title: "Products",          icon: Package,         path: ROUTE.products },
  { title: "Notifications",     icon: ClipboardCheck,  path: ROUTE.notifications },
  { title: "Product History",   icon: LucideHistory,   path: ROUTE.productHistory },
  { title: "Market Competitor", icon: ComponentIcon,   path: ROUTE.market },
  { title: "Smart Reports",     icon: BarChartBigIcon, path: ROUTE.smartReports },
  { title: "Product Mapping",   icon: Share2Icon,      path: ROUTE.productMapping, activePaths: [
      ROUTE.productMapping,
      ROUTE.fullsiteRemapping,
    ],superAdminOnly: true },
  { title: "Settings",          icon: Settings,        path: ROUTE.settings },
];

export function AppSidebar() {
  const location = useLocation();
  const isSuperAdmin = useStore(selectIsSuperAdmin);
  const primaryColor = useStore(selectPrimaryColor);

  // Only keep items that either have no restriction, or are marked
  // superAdminOnly and the logged-in user IS a super admin.
  const visibleNavItems = navItems.filter(
    (item) => !item.superAdminOnly || isSuperAdmin
  );

  return (
    <aside className="flex flex-col border-r border-sidebar-border bg-sidebar shrink-0 w-[70px] h-screen">
      <nav className="flex-1 py-4 px-2 space-y-2">
        {visibleNavItems.map((item) => {

          //const isActive = location.pathname === item.path;

          const isActive = item.activePaths
          ? item.activePaths.includes(location.pathname)
          : location.pathname === item.path;

          return (
            <div key={item.path} className="relative group flex justify-center">
              <NavLink
                to={item.path}
                className={cn(
                  "flex items-center justify-center rounded-lg p-2.5 transition-all duration-150",
                  !isActive && "text-sidebar-foreground hover:bg-accent hover:text-foreground"
                )}
                style={isActive ? { backgroundColor: primaryColor, color: '#fff' } : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
              </NavLink>

              <div className="invisible group-hover:visible absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50">
                <div className="relative flex items-center">
                  <div
                    className="w-0 h-0 border-y-[6px] border-y-transparent border-r-[6px]"
                    style={{ borderRightColor: primaryColor }}
                  />
                  <div
                    className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-white shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
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

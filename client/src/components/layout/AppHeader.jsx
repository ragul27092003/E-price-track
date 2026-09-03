import { Moon, Sun, LogOut, ChevronDown, Bell, Clock, CreditCard, ShieldAlert, Gift, Search, } from "lucide-react";
import logo from "../../services/assets/main-logo.png";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStore, selectIsSuperAdmin, selectPrimaryColor } from "@/store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchProfile } from "@/services/settingsService";
import { fetchAllStores } from "@/services/authService";
import { fetchProducts } from "@/services/productsService";
import { fetchCompetitors } from "@/services/competitorsService";
import { ROUTE } from "../../utils/urls";
import API from "@/hooks/useApi";

export function AppHeader() {
  const user = useStore((s) => s.user);
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const logout = useStore((s) => s.logout);
  const switchStore = useStore((s) => s.switchStore);
  const activeShopName = useStore((s) => s.activeShopName);
  const activeStoreId = useStore((s) => s.activeStoreId);
  const isSuperAdmin = useStore(selectIsSuperAdmin);
  const setProducts = useStore((s) => s.setProducts);
  const setProductsLoading = useStore((s) => s.setProductsLoading);
  const setProductsError = useStore((s) => s.setProductsError);
  const setCompetitors = useStore((s) => s.setCompetitors);
  const setCompetitorsLoading = useStore((s) => s.setCompetitorsLoading);
  const setCompetitorsError = useStore((s) => s.setCompetitorsError);
  const storeLogoMap = useStore((s) => s.storeLogoMap);
  const fetchSapUpdateStatus = useStore((s) => s.fetchSapUpdateStatus);
  const fetchOverallStatistics = useStore((s) => s.fetchOverallStatistics);
  const fetchRankAnalysis = useStore((s) => s.fetchRankAnalysis);
  const fetchBrandAnalyticsBrands = useStore(
    (s) => s.fetchBrandAnalyticsBrands,
  );
  const overallStatistics = useStore((s) => s.overallStatistics);
  const overallStatisticsLoading = useStore((s) => s.overallStatisticsLoading);
  const primaryColor = useStore(selectPrimaryColor);

  const notificationCount =
    Number(overallStatistics?.varNotificationCounts) || 0;
  const badgeText =
    notificationCount > 99
      ? "99+"
      : notificationCount > 0
        ? String(notificationCount)
        : null;
  const tooltipText = `${notificationCount} Price Notifications`;

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("darkMode") === "true",
  );
  const [stores, setStores] = useState([]);
  const [storeSearch, setStoreSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  // fetch profile on login / user change
  useEffect(() => {
    if (!user?.user_id) return;
    fetchProfile().then(setProfile).catch(console.error);
  }, [user?.user_id]);

  // fetch all stores for super_admin
  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchAllStores()
      .then((data) => {
        const active = data.filter((s) => s.archived === 0);
        setStores(active);
        if (!activeShopName && active.length > 0) {
          const defaultStore =
            active.find((s) => s.companyId === "sathya") || active[0];
          switchStore(defaultStore.companyId, defaultStore.companyName);
        }
      })
      .catch(console.error);
  }, [isSuperAdmin]);

  // refresh all data when active store switches
  useEffect(() => {
    if (!activeStoreId) return;

    setProductsLoading(true);
    setProductsError(null);
    fetchProducts()
      .then(setProducts)
      .catch((err) =>
        setProductsError(err.response?.data?.message || err.message),
      )
      .finally(() => setProductsLoading(false));

    setCompetitorsLoading(true);
    setCompetitorsError(null);
    fetchCompetitors()
      .then(setCompetitors)
      .catch((err) =>
        setCompetitorsError(err.response?.data?.message || err.message),
      )
      .finally(() => setCompetitorsLoading(false));

    fetchProfile().then(setProfile).catch(console.error);
    fetchSapUpdateStatus();
    fetchOverallStatistics();
    fetchRankAnalysis();
    fetchBrandAnalyticsBrands();
  }, [activeStoreId]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("darkMode", String(next));
  };

  // ── derived display values ────────────────────────────────────────────────
  // user_type from JWT → req.user.user_type
  const isStoreAdmin = user?.user_type === "store_admin";
  const isUserRole = user?.user_type === "user";

  const roleLabel = isSuperAdmin
    ? "Super Admin"
    : isStoreAdmin
      ? "Store Admin"
      : "User";

  // Store logo: company logo from DB (logoUrl) is source of truth
  const currentStoreKey =
    (user?.user_type === "super_admin" ? activeStoreId : user?.cmpid) ||
    "default";
  const storeLogo = profile?.logoUrl || storeLogoMap?.[currentStoreKey] || null;

  // Profile picture: user's own picture (profile_picture_location from plm_admin_users)
  const profilePicture = profile?.profile_picture_location || null;

  // Display name shown in header badge and dropdown header
  const displayName = isSuperAdmin
    ? activeShopName || "Select Store"
    : profile?.companyName || profile?.website || profile?.email_address || "";

  // Name shown inside dropdown for the logged-in user
  const displayUserName =
    profile?.user_name || profile?.email_address || user?.email_address || "";

  // Avatar initials fallback
  const initials = displayName
    ? displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (profile?.email_address || user?.email_address || "U")
        .slice(0, 2)
        .toUpperCase();

  const handleLogout = () => {
    logout();
    navigate(ROUTE.login);
  };

  const handleStoreSelect = (store) => {
    switchStore(store.companyId, store.companyName);
    setDropdownOpen(false);
    window.location.reload();
  };

  const [alertNotifications, setAlertNotifications] = useState(null);

  useEffect(() => {
  if (!activeStoreId) {
    setAlertNotifications(null);
    return;
  }

  const loadNotifications = async () => {

    try {
      
      const response = await API.get(`/settings/get-notification/${activeStoreId}`);
      setAlertNotifications(response.data?.data || response.data || null);
    } catch (error) {
      console.error("Failed to load alert notifications:", error);
      setAlertNotifications(null);
    }
  };

  loadNotifications();
}, [activeStoreId]);

const notificationTypes = alertNotifications?.types || {};

const notificationConfig = [
  {
    key: "payment",
    label: "Payment Reminder :",
    icon: CreditCard,
    color: "amber",
    enabled: notificationTypes.payment?.enabled === true,
    message: notificationTypes.payment?.message?.trim(),
  },
  {
    key: "admin",
    label: "Admin Message :",
    icon: ShieldAlert,
    color: "violet",
    enabled: notificationTypes.admin?.enabled === true,
    message: notificationTypes.admin?.message?.trim(),
  },
  {
    key: "festival",
    label: "Festival Wishes :",
    icon: Gift,
    color: "emerald",
    enabled: notificationTypes.festival?.enabled === true,
    message: notificationTypes.festival?.message?.trim(),
  },
];

const activeNotifications = notificationConfig.filter(
  (notification) =>
    notification.enabled && notification.message
);

  // ── Monthly Payment Reminder Logic ──────────────────────────────────────────

  {/* const currentDay = new Date().getDate();
  const isDayInRange = currentDay >= 1 && currentDay <= 7;
  const daysRemaining = 7 - currentDay;
  const daysText = daysRemaining === 1 ? "1 day" : `${daysRemaining} days`;

  // Check if current user or tenant belongs to Sathya: never show for Sathya tenant or any Sathya user/role
  const activeTenantIdentifier = String(
    currentStoreKey ||
      activeStoreId ||
      user?.cmpid ||
      profile?.cmpid ||
      profile?.companyId ||
      "",
  ).toLowerCase();

  const loggedInUserIdentifier = (
    profile?.user_name ||
    profile?.email_address ||
    user?.email_address ||
    user?.cmpid ||
    ""
  ).toLowerCase();

  const isSathyaUser =
    activeTenantIdentifier.includes("sathya") ||
    String(profile?.companyName || "")
      .toLowerCase()
      .includes("sathya") ||
    String(activeShopName || "")
      .toLowerCase()
      .includes("sathya") ||
    loggedInUserIdentifier.includes("sathya");

  // Check existing payment status if available in profile
  const isPaymentCompleted =
    profile?.paymentCompleted === true ||
    profile?.isPaid === true ||
    String(profile?.paymentStatus).toLowerCase() === "completed" ||
    String(profile?.paymentStatus).toLowerCase() === "paid" ||
    String(profile?.payment).toLowerCase() === "completed" ||
    String(profile?.payment).toLowerCase() === "paid";

  const showPaymentReminder =
    isDayInRange && !isSathyaUser && !isPaymentCompleted; */}

  const filteredStores = stores
    .filter((store) =>
      (store.companyName || "")
        .toLowerCase()
        .includes(storeSearch.toLowerCase().trim()),
    )
    .sort((a, b) => {
      const isASelected =
        a.companyId === activeStoreId || a.companyName === activeShopName;
      const isBSelected =
        b.companyId === activeStoreId || b.companyName === activeShopName;
      if (isASelected && !isBSelected) return -1;
      if (!isASelected && isBSelected) return 1;
      return 0;
    });

  return (

    <header className="flex items-center h-16 px-6 border-b border-border bg-card shrink-0">
      <div className="shrink-0 flex items-center ml-4">
        <img src={logo} alt="Logo" className="block h-6 w-auto shrink-0" />
      </div>


      {/* Smooth Running Payment Reminder Ticker */}


       {activeNotifications.length > 0 && (
  <div className="flex-1 mr-4 relative overflow-hidden h-10">
    <div className="notification-ticker">
      <div className="notification-ticker-track">
        {[...activeNotifications, ...activeNotifications].map(
          (notification, index) => {
            const Icon = notification.icon;

            const colorStyles = {
              amber: {
                wrapper:
                  "bg-amber-50 border-amber-200 text-amber-900",
                icon:
                  "bg-amber-100 text-amber-600",
                label:
                  "text-amber-800",
                glow:
                  "shadow-[0_0_15px_rgba(245,158,11,0.12)]",
              },

              violet: {
                wrapper:
                  "bg-violet-50 border-violet-200 text-violet-900",
                icon:
                  "bg-violet-100 text-violet-600",
                label:
                  "text-violet-800",
                glow:
                  "shadow-[0_0_15px_rgba(139,92,246,0.12)]",
              },

              emerald: {
                wrapper:
                  "bg-emerald-50 border-emerald-200 text-emerald-900",
                icon:
                  "bg-emerald-100 text-emerald-600",
                label:
                  "text-emerald-800",
                glow:
                  "shadow-[0_0_15px_rgba(16,185,129,0.12)]",
              },
            };

            const colors =
              colorStyles[notification.color] ||
              colorStyles.amber;

            return (
              <div
                key={`${notification.key}-${index}`}
                className={`
                  notification-item
                  ${colors.wrapper}
                  ${colors.glow}
                `}
              >
                {/* Icon */}
                <div
                  className={`
                    notification-icon
                    ${colors.icon}
                  `}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`
                      text-[12px]
                      font-bold
                      uppercase
                      tracking-wide
                      ${colors.label}
                    `}
                  >
                    {notification.label}
                  </span>

                  <span className="text-[13px] font-medium">
                    {notification.message}
                  </span>
                </div>

                {/* Small status indicator */}
                <span className="notification-dot" />
              </div>
            );
          }
        )}
      </div>
    </div>

    <style>{`
      .notification-ticker {
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
        align-items: center;
        position: relative;
      }

      .notification-ticker-track {
        display: flex;
        align-items: center;
        gap: 14px;
        width: max-content;
        animation: notificationTicker 35s linear infinite;
        will-change: transform;
      }

      .notification-ticker:hover
      .notification-ticker-track {
        animation-play-state: paused;
      }

      .notification-item {
        height: 34px;
        min-width: max-content;
        display: inline-flex;
        align-items: center;
        gap: 9px;
        padding: 0 14px 0 6px;
        border-width: 1px;
        border-style: solid;
        border-radius: 999px;
        flex-shrink: 0;
        white-space: nowrap;
        transition: all 0.3s ease;
      }

      .notification-item:hover {
        transform: translateY(-1px);
      }

      .notification-icon {
        width: 26px;
        height: 26px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .notification-dot {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: currentColor;
        opacity: 0.55;
        flex-shrink: 0;
      }

      @keyframes notificationTicker {
        from {
          transform: translateX(0);
        }

        to {
          transform: translateX(-50%);
        }
      }
    `}</style>
  </div>
)}






      {/* <div
        className={`payment-ticker-container flex-1 mr-4 relative flex items-center overflow-hidden h-8 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[13px] font-medium shadow-sm select-none transition-opacity duration-200 ${
          showPaymentReminder ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <style>{`
    .payment-ticker-track {
      display: flex;
      width: max-content;
      animation: paymentTicker 25s linear infinite;
      will-change: transform;
    }
    .payment-ticker-item {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      white-space: nowrap;
      padding-right: 100px; 
      flex-shrink: 0;
    }
    @keyframes paymentTicker {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }
    .payment-ticker-container:hover .payment-ticker-track {
      animation-play-state: paused;
    }
  `}</style>

        <div className="payment-ticker-track">
        
          <div className="payment-ticker-item">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="leading-none">
              <strong className="font-bold text-amber-800">
                Payment Reminder:
              </strong>{" "}
              {daysRemaining === 0 ? (
                <>
                  Today is the last day to complete your subscription payment to
                  avoid any service interruption. Thank you for your continued
                  support.
                </>
              ) : (
                <>
                  Your monthly subscription payment is due. Please complete your
                  payment within{" "}
                  <span className="font-bold underline decoration-amber-500/50 underline-offset-4">
                    {daysText}
                  </span>{" "}
                  to avoid any service interruption. Thank you for your
                  continued support.
                </>
              )}
            </span>
          </div>

    
          <div className="payment-ticker-item">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="leading-none">
              <strong className="font-bold text-amber-800">
                Payment Reminder:
              </strong>{" "}
              {daysRemaining === 0 ? (
                <>
                  Today is the last day to complete your subscription payment to
                  avoid any service interruption. Thank you for your continued
                  support.
                </>
              ) : (
                <>
                  Your monthly subscription payment is due. Please complete your
                  payment within{" "}
                  <span className="font-bold underline decoration-amber-500/50 underline-offset-4">
                    {daysText}
                  </span>{" "}
                  to avoid any service interruption. Thank you for your
                  continued support.
                </>
              )}
            </span>
          </div>
        </div>
      </div> */}

      <div className="ml-auto flex items-center gap-2">
        {/* Bell Notification */}
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => navigate(ROUTE.notifications)}
                aria-label={tooltipText}
                className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {!overallStatisticsLoading && badgeText && (
                  <span
                    style={{ backgroundColor: primaryColor }}
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full flex items-center justify-center shadow-sm leading-none border-2 border-card select-none"
                  >
                    {badgeText}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="center"
              className="font-medium text-xs shadow-md"
            >
              {tooltipText}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Store name + logo badge */}
        {displayName && (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted/60 border border-border mr-1">
            {storeLogo ? (
              <img
                src={storeLogo}
                alt="Store"
                className="h-5 w-5 rounded object-contain shrink-0"
              />
            ) : (
              <div className="h-5 w-5 rounded bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground shrink-0">
                {initials.slice(0, 1)}
              </div>
            )}
            <span className="text-xs font-semibold text-foreground max-w-[120px] truncate leading-none">
              {displayName}
            </span>
          </div>
        )}

        {/* Avatar + dropdown */}
        <div className="ml-2 relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            {storeLogo ? (
              <img
                src={storeLogo}
                alt="Profile"
                className="h-10 w-10 rounded-3xl object-contain border-2 border-border"
              />
            ) : (
              <div className="h-10 w-10 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                {initials}
              </div>
            )}
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => {
                  setDropdownOpen(false);
                  setStoreSearch("");
                }}
              />
              <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-card shadow-lg z-50 py-1">
                {/* User info header */}
                <div className="px-3 py-2.5 border-b">
                  <div className="flex items-center gap-2.5">
                    {storeLogo && (
                      <img
                        src={storeLogo}
                        alt="Store Logo"
                        className="h-8 w-8 rounded object-contain shrink-0 border border-border bg-white dark:bg-slate-800"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {displayName || displayUserName}
                      </p>
                      {displayUserName && displayUserName !== displayName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {displayUserName}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* email_address from plm_admin_users */}
                  {(profile?.email_address || user?.email_address) && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 truncate">
                      {profile?.email_address || user?.email_address}
                    </p>
                  )}
                  <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wide">
                    {roleLabel}
                  </span>
                </div>

                {/* Store switcher for super_admin */}
                {isSuperAdmin && (
                  <>
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-1">
                      Switch Store
                    </div>

                    {/* Search Store input */}
                    <div className="px-2.5 pb-1.5">
                      <div className="relative flex items-center">
                        <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search Store..."
                          value={storeSearch}
                          onChange={(e) => setStoreSearch(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1 text-xs rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {filteredStores.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground text-center">
                        {stores.length === 0 ? "No stores yet" : "No stores found"}
                      </p>
                    ) : (
                      <div className="max-h-[170px] overflow-y-auto px-1.5 space-y-0.5">
                        {filteredStores.map((store) => {
                          const isSelected =
                            store.companyId === activeStoreId ||
                            store.companyName === activeShopName;
                          return (
                            <button
                              key={store._id || store.companyId}
                              onClick={() => {
                                handleStoreSelect(store);
                                setStoreSearch("");
                              }}
                              className={`w-full text-left px-2.5 py-1.5 text-sm transition-all rounded-md flex items-center justify-between ${
                                isSelected
                                  ? "bg-primary/10 text-primary font-semibold shadow-sm border border-primary/25 dark:bg-primary/20 dark:border-primary/30"
                                  : "hover:bg-accent/60 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span className="truncate">{store.companyName}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="my-1 border-t" />
                  </>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

    </header>
  );
}

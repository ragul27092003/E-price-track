import { Moon, Sun, LogOut, ChevronDown } from "lucide-react";
import logo from "../../services/assets/logo.png";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStore, selectIsSuperAdmin } from "@/store";
import { fetchProfile } from "@/services/settingsService";
import { fetchAllStores } from "@/services/authService";
import { fetchProducts } from "@/services/productsService";
import { fetchCompetitors } from "@/services/competitorsService";

export function AppHeader() {
  const user                  = useStore((s) => s.user);
  const profile               = useStore((s) => s.profile);
  const setProfile            = useStore((s) => s.setProfile);
  const logout                = useStore((s) => s.logout);
  const switchStore           = useStore((s) => s.switchStore);
  const activeShopName        = useStore((s) => s.activeShopName);
  const activeStoreId         = useStore((s) => s.activeStoreId);
  const isSuperAdmin          = useStore(selectIsSuperAdmin);
  const setProducts           = useStore((s) => s.setProducts);
  const setProductsLoading    = useStore((s) => s.setProductsLoading);
  const setProductsError      = useStore((s) => s.setProductsError);
  const setCompetitors        = useStore((s) => s.setCompetitors);
  const setCompetitorsLoading = useStore((s) => s.setCompetitorsLoading);
  const setCompetitorsError   = useStore((s) => s.setCompetitorsError);
  const storeLogoMap               = useStore((s) => s.storeLogoMap);
  const fetchSapUpdateStatus       = useStore((s) => s.fetchSapUpdateStatus);
  const fetchOverallStatistics     = useStore((s) => s.fetchOverallStatistics);
  const fetchRankAnalysis          = useStore((s) => s.fetchRankAnalysis);
  const fetchBrandAnalyticsBrands  = useStore((s) => s.fetchBrandAnalyticsBrands);

  const [darkMode,     setDarkMode]     = useState(() => localStorage.getItem("darkMode") === "true");
  const [stores,       setStores]       = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  // ── fetch profile on login / user change ──────────────────────────────────
  useEffect(() => {
    if (!user?.user_id) return;
    fetchProfile().then(setProfile).catch(console.error);
  }, [user?.user_id]);

  // ── fetch all stores for super_admin ──────────────────────────────────────
  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchAllStores()
      .then((data) => {
        const active = data.filter((s) => s.archived === 0);
        setStores(active);
        if (!activeShopName && active.length > 0) {
          const defaultStore =
            active.find((s) => s.companyId === 'sathya') || active[0];
          switchStore(defaultStore.companyId, defaultStore.companyName);
        }
      })
      .catch(console.error);
  }, [isSuperAdmin]);

  // ── refresh all data when active store switches ───────────────────────────
  useEffect(() => {
    if (!activeStoreId) return;

    setProductsLoading(true);
    setProductsError(null);
    fetchProducts()
      .then(setProducts)
      .catch((err) => setProductsError(err.response?.data?.message || err.message))
      .finally(() => setProductsLoading(false));

    setCompetitorsLoading(true);
    setCompetitorsError(null);
    fetchCompetitors()
      .then(setCompetitors)
      .catch((err) => setCompetitorsError(err.response?.data?.message || err.message))
      .finally(() => setCompetitorsLoading(false));

    fetchProfile().then(setProfile).catch(console.error);
    fetchSapUpdateStatus();
    fetchOverallStatistics();
    fetchRankAnalysis();
    fetchBrandAnalyticsBrands();
  }, [activeStoreId]);

  // ── dark mode ─────────────────────────────────────────────────────────────
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
  const isUserRole   = user?.user_type === "user";

  const roleLabel = isSuperAdmin ? "Super Admin"
    : isStoreAdmin ? "Store Admin"
    : "User";

  // Store logo: company logo from DB (logoUrl) is source of truth
  const currentStoreKey = (user?.user_type === "super_admin" ? activeStoreId : user?.cmpid) || "default";
  const storeLogo = profile?.logoUrl || storeLogoMap?.[currentStoreKey] || null;

  // Profile picture: user's own picture (profile_picture_location from plm_admin_users)
  const profilePicture = profile?.profile_picture_location || null;

  // Display name shown in header badge and dropdown header
  const displayName = isSuperAdmin
    ? (activeShopName || "Select Store")
    : (profile?.companyName || profile?.website || profile?.email_address || "");

  // Name shown inside dropdown for the logged-in user
  const displayUserName = profile?.user_name || profile?.email_address || user?.email_address || "";

  // Avatar initials fallback
  const initials = displayName
    ? displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : (profile?.email_address || user?.email_address || "U").slice(0, 2).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleStoreSelect = (store) => {
    switchStore(store.companyId, store.companyName);
    setDropdownOpen(false);
  };

  return (
    <header className="flex items-center h-16 pl-1 pr-9 border-b border-border bg-card shrink-0">
      <img src={logo} alt="Logo" className="h-14 w-auto object-contain" />

      <div className="ml-auto flex items-center gap-2">

        {/* Store name + logo badge */}
        {displayName && (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted/60 border border-border mr-1">
            {storeLogo ? (
              <img src={storeLogo} alt="Store" className="h-5 w-5 rounded object-contain shrink-0" />
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

        {/* Dark mode toggle */}
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="text-muted-foreground hover:text-foreground">
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Avatar + dropdown */}
        <div className="ml-2 relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            {profilePicture ? (
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
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-60 rounded-lg border bg-card shadow-lg z-50 py-1">

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
                        <p className="text-xs text-muted-foreground truncate">{displayUserName}</p>
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
                    {stores.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No stores yet</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto">
                        {stores.map((store) => (
                          <button
                            key={store._id}
                            onClick={() => handleStoreSelect(store)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                              activeShopName === store.companyName ? "bg-accent font-medium" : ""
                            }`}
                          >
                            {store.companyName}
                          </button>
                        ))}
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

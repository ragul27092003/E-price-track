import { Moon, Sun, LogOut } from "lucide-react";
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
  const user                 = useStore((s) => s.user);
  const profile              = useStore((s) => s.profile);
  const setProfile           = useStore((s) => s.setProfile);
  const logout               = useStore((s) => s.logout);
  const switchStore          = useStore((s) => s.switchStore);
  const activeShopName       = useStore((s) => s.activeShopName);
  const activeStoreId        = useStore((s) => s.activeStoreId);
  const isSuperAdmin         = useStore(selectIsSuperAdmin);
  const setProducts          = useStore((s) => s.setProducts);
  const setProductsLoading   = useStore((s) => s.setProductsLoading);
  const setProductsError     = useStore((s) => s.setProductsError);
  const setCompetitors       = useStore((s) => s.setCompetitors);
  const setCompetitorsLoading = useStore((s) => s.setCompetitorsLoading);
  const setCompetitorsError  = useStore((s) => s.setCompetitorsError);
  const storeLogoMap              = useStore((s) => s.storeLogoMap);
  const fetchSapUpdateStatus      = useStore((s) => s.fetchSapUpdateStatus);
  const fetchOverallStatistics    = useStore((s) => s.fetchOverallStatistics);
  const fetchRankAnalysis         = useStore((s) => s.fetchRankAnalysis);
  const fetchBrandAnalyticsBrands = useStore((s) => s.fetchBrandAnalyticsBrands);

  const [darkMode,     setDarkMode]     = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true";
  });
  const [stores,       setStores]       = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.userId) return;
    fetchProfile()
      .then(setProfile)
      .catch(console.error);
  }, [user?.userId]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchAllStores()
      .then((data) => {
        setStores(data);
        if (!activeShopName && data.length > 0) {
          switchStore(data[0].companyId, data[0].companyName);
        }
      })
      .catch(console.error);
  }, [isSuperAdmin]);

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

    fetchProfile()
      .then(setProfile)
      .catch(console.error);

    // Refresh dashboard KPI data for the newly selected store
    fetchSapUpdateStatus();
    fetchOverallStatistics();
    fetchRankAnalysis();
    fetchBrandAnalyticsBrands();
  }, [activeStoreId]);

  // Apply/remove dark class whenever darkMode changes (including on first render)
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("darkMode", String(next));
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleStoreSelect = (store) => {
    switchStore(store.companyId, store.companyName);
    setDropdownOpen(false);
  };

  const initials = profile?.companyName
    ? profile.companyName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : profile?.companyUrl
      ? profile.companyUrl.slice(0, 2).toUpperCase()
      : profile?.email
        ? profile.email.slice(0, 2).toUpperCase()
        : "U";

  const isStoreAdmin = user?.userType === "store_admin";
  const displayName  = isSuperAdmin
    ? (activeShopName || "Select Store")
    : (profile?.companyName || profile?.companyUrl || profile?.email || "");
  const roleLabel    = isSuperAdmin ? "Super Admin" : isStoreAdmin ? "Store Admin" : "User";

  // Resolve logo: profile.logoUrl (from DB) is source of truth; storeLogoMap is a fast cache
  const currentStoreKey = (user?.userType === 'super_admin' ? activeStoreId : user?.companyId) || "default";
  const storeLogo = profile?.logoUrl || storeLogoMap?.[currentStoreKey] || null;

  return (
    <header className="flex items-center h-16 px-6 border-b border-border bg-card shrink-0">
      <img src={logo} alt="Logo" className="h-14 w-auto object-contain" />
      <div className="ml-auto flex items-center gap-2">

        {/* Store name + logo badge near dark mode toggle */}
        {displayName && (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted/60 border border-border mr-1">
            {storeLogo ? (
              <img
                src={storeLogo}
                alt="Store Logo"
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

        <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="text-muted-foreground hover:text-foreground">
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <div className="ml-2 relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {initials}
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-card shadow-lg z-50 py-1">
                <div className="px-3 py-2 border-b flex items-center gap-2.5">
                  {storeLogo && (
                    <img src={storeLogo} alt="Store Logo" className="h-7 w-7 rounded object-contain shrink-0 border border-border bg-white dark:bg-slate-800" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel}</p>
                  </div>
                </div>

                {isSuperAdmin && (
                  <>
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-1">
                      Switch Store
                    </div>
                    {stores.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No stores yet</p>
                    ) : (
                      stores.map((store) => (
                        <button
                          key={store._id}
                          onClick={() => handleStoreSelect(store)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                            activeShopName === store.companyName ? "bg-accent font-medium" : ""
                          }`}
                        >
                          {store.companyName}
                        </button>
                      ))
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
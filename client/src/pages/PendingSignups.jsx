import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import API from "@/hooks/useApi";

const BRAND_COLORS = ["#2B86C5", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2"];
const colorFor = (str = "") => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff;
  return BRAND_COLORS[h % BRAND_COLORS.length];
};

const Avatar = ({ name }) => (
  <div
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
    style={{ backgroundColor: colorFor(name) }}
  >
    {(name || "?").slice(0, 2).toUpperCase()}
  </div>
);

const PendingSignups = () => {
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [pending, setPending] = useState([]);
  const [activated, setActivated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const loadPending = async () => {
    const { data } = await API.get("/auth/pending-signups");
    setPending(data || []);
  };

  const loadActivated = async () => {
    const { data } = await API.get("/auth/activated-companies");
    setActivated(data || []);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadPending(), loadActivated()]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleRequestActivate = (company) => setConfirmTarget(company);
  const handleCancelActivate = () => setConfirmTarget(null);

  const handleConfirmActivate = async () => {
    if (!confirmTarget) return;
    const { companyId } = confirmTarget;
    setActivatingId(companyId);
    try {
      await API.post(`/auth/provision-tenant/${companyId}`);
      await loadAll();
      setConfirmTarget(null);
    } catch (err) {
      alert(err?.response?.data?.message || "Activation failed");
    } finally {
      setActivatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-[#2B86C5]" />
      </div>
    );
  }

  const list = activeTab === "pending" ? pending : activated;

  return (
    <div className="p-4 sm:p-6">
      {/* ── Header ── */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Company Signups</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review new signups and activate their tenant workspace.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setActiveTab("pending")}
          className={`text-left rounded-xl border p-4 transition-all ${
            activeTab === "pending"
              ? "border-[#2B86C5] bg-[#2B86C5]/5 shadow-sm"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151a2a] hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending Approval
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-800 dark:text-white">{pending.length}</div>
        </button>

        <button
          onClick={() => setActiveTab("activated")}
          className={`text-left rounded-xl border p-4 transition-all ${
            activeTab === "activated"
              ? "border-emerald-500 bg-emerald-500/5 shadow-sm"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151a2a] hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Activated
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-800 dark:text-white">{activated.length}</div>
        </button>
      </div>

      {/* ── Table card ── */}
      <div className="bg-white dark:bg-[#151a2a] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            {activeTab === "pending" ? "Awaiting Activation" : "Activated Companies"}
          </h3>
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${
              activeTab === "pending"
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {list.length} {list.length === 1 ? "company" : "companies"}
          </span>
        </div>

        {list.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-center">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300 dark:text-slate-600">
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M3 7l9-4 9 4M8 12h8" />
            </svg>
            <p className="text-sm text-slate-400">
              {activeTab === "pending" ? "No pending signups right now." : "No companies activated yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0b101e]/50">
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Company ID</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {activeTab === "pending" ? "Signed up" : "Activated on"}
                  </th>
                  {activeTab === "pending" && (
                    <th className="text-right px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {list.map((c) => (
                  <tr key={c.companyId} className="hover:bg-slate-50 dark:hover:bg-[#1a2033] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.companyName} />
                        <span className="font-semibold text-slate-800 dark:text-white">{c.companyName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <code className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                        {c.companyId}
                      </code>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{c.email || "—"}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                      {new Date(activeTab === "pending" ? c.createdAt : c.provisionedAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                      <span className="text-slate-400 dark:text-slate-500">
                        {" · "}
                        {new Date(activeTab === "pending" ? c.createdAt : c.provisionedAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </td>
                    {activeTab === "pending" && (
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleRequestActivate(c)}
                          disabled={activatingId === c.companyId}
                          className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          {activatingId === c.companyId ? (
                            <>
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" className="animate-spin">
                                <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
                                <path d="M21 12a9 9 0 0 0-9-9" />
                              </svg>
                              Activating
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                              Activate
                            </>
                          )}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Confirm Activation Modal ── */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#151a2a] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-6 py-6 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Activate Company</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to activate{" "}
                <span className="font-semibold text-gray-700 dark:text-slate-200">{confirmTarget.companyName}</span>?
                This will create their tenant database and grant them full access.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-[#0f1624] flex justify-center gap-3 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={handleCancelActivate}
                disabled={activatingId === confirmTarget.companyId}
                className="px-5 py-2.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmActivate}
                disabled={activatingId === confirmTarget.companyId}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-colors ${
                  activatingId === confirmTarget.companyId
                    ? "bg-emerald-300 cursor-wait"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {activatingId === confirmTarget.companyId ? "Activating..." : "Yes, Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingSignups;

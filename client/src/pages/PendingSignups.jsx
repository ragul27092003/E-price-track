import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import API from "@/hooks/useApi";

const PendingSignups = () => {
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [pending, setPending] = useState([]);
  const [activated, setActivated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const loadPending = async () => {
    const { data } = await API.get("/auth/admin/pending-signups");
    setPending(data || []);
  };

  const loadActivated = async () => {
    const { data } = await API.get("/auth/admin/activated-companies");
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
      await API.post(`/auth/admin/provision-tenant/${companyId}`);
      await loadAll();
      setConfirmTarget(null);
    } catch (err) {
      alert(err?.response?.data?.message || "Activation failed");
    } finally {
      setActivatingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-sm text-slate-400">Loading...</div>;

  const list = activeTab === "pending" ? pending : activated;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Signups</h2>

      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 mb-4">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "pending"
              ? "border-[#2B86C5] text-[#2B86C5]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setActiveTab("activated")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "activated"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Activated ({activated.length})
        </button>
      </div>

      {list.length === 0 ? (
        <p className="text-slate-400 text-sm">
          {activeTab === "pending" ? "No pending signups." : "No activated companies yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-[#0b101e]/50">
                <th className="text-left p-3 text-xs font-semibold text-slate-500">Company</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-500">Company ID</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-500">Email</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-500">
                  {activeTab === "pending" ? "Signed up" : "Activated on"}
                </th>
                {activeTab === "pending" && (
                  <th className="text-right p-3 text-xs font-semibold text-slate-500">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {list.map((c) => (
                <tr key={c.companyId} className="hover:bg-slate-50 dark:hover:bg-[#151a2a]/80">
                  <td className="p-3 font-medium text-slate-800 dark:text-white">{c.companyName}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{c.companyId}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{c.email || "—"}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">
                    {new Date(activeTab === "pending" ? c.createdAt : c.provisionedAt).toLocaleString("en-IN")}
                  </td>
                  {activeTab === "pending" && (
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleRequestActivate(c)}
                        disabled={activatingId === c.companyId}
                        className="bg-emerald-600 text-white px-4 py-1.5 rounded text-xs font-semibold disabled:opacity-50 hover:bg-emerald-700 transition-colors"
                      >
                        {activatingId === c.companyId ? "Activating..." : "Activate"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-[#151a2a] rounded-lg w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-6 py-5 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-gray-800 dark:text-white">Activate Company</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Are you sure you want to activate{" "}
                <span className="font-semibold text-gray-700 dark:text-slate-200">{confirmTarget.companyName}</span>?
                This will create their tenant database.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-[#0f1624] flex justify-center gap-3 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={handleCancelActivate}
                disabled={activatingId === confirmTarget.companyId}
                className="px-5 py-2 bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmActivate}
                disabled={activatingId === confirmTarget.companyId}
                className={`px-5 py-2 rounded text-sm font-medium text-white ${
                  activatingId === confirmTarget.companyId
                    ? "bg-emerald-300 cursor-wait"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {activatingId === confirmTarget.companyId ? "Activating..." : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingSignups;

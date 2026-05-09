import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Lock, Eye, EyeOff, Trash2, UserPlus,
  X, Check, AlertCircle, Users, FileText, ChevronDown, Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/store";
import { toast } from "sonner";
import {
  fetchProfile,
  updateProfile,
  updatePassword,
  updateLogo,
  fetchUsers,
  addUser,
  removeUser,
  fetchUsersLog,
} from "@/services/settingsService";

const TABS = [
  { id: "account", label: "My Account", icon: User },
  { id: "users", label: "Manage Users", icon: Users },
  { id: "log", label: "Users Log", icon: FileText },
];

function Avatar({ size = "lg", primaryColor, companyName = "", photoUrl = null }) {
  const sizeClass = size === "lg" ? "h-[60px] w-[60px] md:h-[72px] md:w-[72px] text-sm" : "h-9 w-9 text-xs";
  const firstLetter = companyName.trim().charAt(0).toUpperCase() || "?";
  const subLabel = companyName.trim().split(/\s+/).slice(1).join(" ").toUpperCase();
  
  if (photoUrl) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden shadow-sm shrink-0`}>
        <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${sizeClass} rounded-full flex flex-col items-center justify-center text-white font-bold shadow-sm tracking-widest leading-none shrink-0`}
      style={{ backgroundColor: primaryColor }}>
      <span>{firstLetter}</span>
      {size === "lg" && subLabel && (
        <span className="text-[6px] font-normal tracking-normal mt-0.5 hidden md:block">{subLabel}</span>
      )}
    </div>
  );
}

// ── MyAccountTab ────────────────────────────────────────────────────────────
function MyAccountTab({ primaryColor, setPrimaryColor, photoUrl, setPhotoUrl }) {
  const user = useStore((s) => s.user);
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const activeStoreId = useStore((s) => s.activeStoreId);
  const storeLogoMap = useStore((s) => s.storeLogoMap);
  const setStoreLogo = useStore((s) => s.setStoreLogo);

  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [userType, setUserType] = useState("");
  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const isUser = user?.userType === "user";

  // Current store key for logo map
  const currentStoreKey = (user?.userType === 'super_admin' ? activeStoreId : user?.companyId) || "default";
  const savedLogo = storeLogoMap?.[currentStoreKey] || null;

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProfile();
        setProfile(data);
        setEmail(data.email || "");
        setCompanyUrl(data.companyUrl || "");
        setUserType(data.userType || "store_admin");
        setPhone(data.phone || "");
        setCompanyName(data.companyName || data.companyId || "");
        setUserName(data.userName || "");
        setCurrentPassword(data.plainPassword || "");
        // Load logo from DB and sync to store
        const dbLogo = data.logoUrl || null;
        setPhotoUrl(dbLogo);
        if (dbLogo) setStoreLogo(currentStoreKey, dbLogo);
        else setStoreLogo(currentStoreKey, null);
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };
    setProfile(null);
    load();
  }, [user?.userId, activeStoreId]);

  // Sync photoUrl from global store on store switch (before DB fetch completes)
  useEffect(() => {
    const cached = storeLogoMap?.[currentStoreKey] || null;
    setPhotoUrl(cached);
  }, [currentStoreKey]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await updateProfile(phone);
      setProfile({ ...profile, phone });
      toast.success("Account updated successfully!");
    } catch {
      toast.error("Failed to update account");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setPhotoUrl(dataUrl);
      setStoreLogo(currentStoreKey, dataUrl);
      try {
        await updateLogo(dataUrl);
        toast.success("Store logo saved!");
      } catch {
        toast.error("Failed to save logo to server");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    setPhotoUrl(null);
    setStoreLogo(currentStoreKey, null);
    try {
      await updateLogo(null);
      toast.success("Store logo removed");
    } catch {
      toast.error("Failed to remove logo from server");
    }
  };

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPass) { toast.error("Passwords do not match"); return; }
    setSavingPass(true);
    try {
      await updatePassword(newPassword);
      toast.success("Password updated successfully!");
      setCurrentPassword(newPassword);
      setNewPassword("");
      setConfirmPass("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password");
    } finally {
      setSavingPass(false);
    }
  };

  const ValidatedInput = ({ value, readOnly, onChange }) => (
    <div className="relative">
      <Input value={value} readOnly={readOnly} onChange={onChange}
        className={`bg-white dark:bg-slate-800 border-gray-300  dark:border-slate-700 text-gray-900 dark:text-white pr-10 focus-visible:ring-blue-500 ${readOnly ? "cursor-default text-gray-700 dark:text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-[#151a2a]" : ""}`} />
      {readOnly && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500 pointer-events-none" />}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-full pb-10 pt-2">
      {/* Branding Section */}
      <div className="bg-slate-50 dark:bg-[#151a2a] border border-gray-200  dark:border-slate-700 rounded-xl p-4 md:p-6">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Company Branding</h3>
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          {/* Logo Upload */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 block">Store Logo</label>
            <div className="flex items-center gap-4">
              {/* Logo preview / placeholder */}
              <div className="relative group shrink-0">
                {photoUrl ? (
                  <div className="h-[72px] w-[72px] rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                    <img src={photoUrl} alt="Store Logo" className="w-full h-full object-contain p-1" />
                  </div>
                ) : (
                  <div className="h-[72px] w-[72px] rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 flex flex-col items-center justify-center gap-1 shadow-sm">
                    <Camera className="h-6 w-6 text-gray-400 dark:text-slate-500" />
                    <span className="text-[9px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Logo</span>
                  </div>
                )}
              </div>
              {/* Upload / Remove buttons */}
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer select-none">
                    <Camera className="h-3.5 w-3.5" />
                    {photoUrl ? "Change Logo" : "Upload Logo"}
                  </span>
                </label>
                {photoUrl && (
                  <button onClick={handleRemoveLogo} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors">
                    <X className="h-3.5 w-3.5" />
                    Remove Logo
                  </button>
                )}
                <p className="text-[10px] text-gray-400 dark:text-slate-500">PNG, JPG, SVG · Shown in header</p>
              </div>
            </div>
          </div>

          {/* Brand preview */}
          <div className="flex items-center gap-4 sm:pt-6">
            <div className="flex flex-col leading-none">
              <span className="text-red-600 font-extrabold text-xl md:text-2xl tracking-tighter uppercase">
                {companyName.trim().split(/\s+/)[0] || "BRAND"}
              </span>
              <span className="text-[9px] font-bold tracking-wide mt-0.5" style={{ color: primaryColor }}>
                {companyName.trim().split(/\s+/).slice(1).join(" ").toUpperCase() || "STORE"}
              </span>
            </div>
          </div>

          <div className="sm:ml-auto">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 dark:text-slate-500 block mb-1.5">Primary Brand Color</label>
            <div className="relative flex items-center gap-2 border border-gray-300  dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-1.5 cursor-pointer hover:bg-gray-100  dark:hover:bg-slate-700/60 w-fit">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <div className="w-5 h-5 rounded-sm shadow-inner" style={{ backgroundColor: primaryColor }} />
              <span className="text-sm text-gray-700 dark:text-slate-300 dark:text-slate-600 mx-1">{primaryColor}</span>
              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-slate-50 dark:bg-[#151a2a] border border-gray-200  dark:border-slate-700 rounded-xl p-4 md:p-6">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-5">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 md:gap-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-white block">Email Address</label>
            <ValidatedInput value={email} readOnly />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-white block">Website URL</label>
            <ValidatedInput value={companyUrl} readOnly />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-white block">Username</label>
            <ValidatedInput value={isUser ? userName : companyName} readOnly />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-white block">Phone Number</label>
            <ValidatedInput value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setPhone("")} className="order-2 sm:order-1 border-gray-300  dark:border-slate-700 text-gray-700 dark:text-slate-300 dark:text-slate-600 font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-[#151a2a]">Cancel</Button>
          <Button onClick={handleUpdate} disabled={saving} style={{ backgroundColor: primaryColor }} className="order-1 sm:order-2 text-white font-semibold hover:bg-opacity-90">
            {saving ? "Updating..." : "Update Account"}
          </Button>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-slate-50 dark:bg-[#151a2a] border border-gray-200  dark:border-slate-700 rounded-xl p-4 md:p-6">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-5">Security</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-gray-800 dark:text-white block mb-1.5">Current Password</label>
            <div className="relative max-w-full md:max-w-sm">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                readOnly
                autoComplete="current-password"
                className="border-gray-300 dark:border-slate-700 pr-10 bg-slate-50 dark:bg-[#151a2a] text-gray-700 dark:text-slate-300 cursor-default select-none"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-white block">New Password</label>
            <div className="relative">
              <Input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password" ring-color={primaryColor} className="border-gray-300  dark:border-slate-700 pr-10 bg-white dark:bg-slate-800" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-white block">Confirm New Password</label>
            <div className="relative">
              <Input type={showConfirm ? "text" : "password"} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Confirm New Password" className="border-gray-300  dark:border-slate-700 pr-10 bg-white dark:bg-slate-800" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-start gap-3 mt-6">
          <Button onClick={handlePasswordUpdate} disabled={savingPass} style={{ backgroundColor: primaryColor }} className="text-white font-semibold px-6 hover:bg-opacity-90">
            {savingPass ? "Updating..." : "Update Password"}
          </Button>
          <Button variant="outline" onClick={() => { setNewPassword(""); setConfirmPass(""); }} className="border-gray-300  dark:border-slate-700 text-gray-700 dark:text-slate-300 dark:text-slate-600 font-semibold px-6 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-[#151a2a]">Cancel</Button>
        </div>
      </div>
    </motion.div>
  );
}

// ── ManageUsersTab ──────────────────────────────────────────────────────────
function ManageUsersTab() {
  const user = useStore((s) => s.user);
  const storeUsers = useStore((s) => s.storeUsers);
  const setStoreUsers = useStore((s) => s.setStoreUsers);
  const removeStoreUser = useStore((s) => s.removeStoreUser);

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [removing, setRemoving] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setStoreUsers(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRemove = async (userId) => {
    setRemoving(userId);
    try {
      await removeUser(userId);
      removeStoreUser(userId);
      toast.success("User removed");
    } catch {
      toast.error("Failed to remove user");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Team Members</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">{storeUsers.length} users in your company</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm" className="gap-2 bg-[#1864ab] hover:bg-blue-800 text-white w-full sm:w-fit">
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="bg-slate-50 dark:bg-[#151a2a] border border-gray-200  dark:border-slate-700 rounded-xl overflow-hidden">
        {/* Table Container for horizontal scrolling on mobile */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px] md:min-w-full">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 dark:bg-[#151a2a] border-b border-gray-200  dark:border-slate-700 text-xs font-bold text-gray-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <div className="col-span-4">Email</div>
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            {loading ? (
              <div className="py-12 flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-[#1864ab] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : storeUsers.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Users className="h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500 dark:text-slate-400 dark:text-slate-500">No users yet</p>
              </div>
            ) : (
              <AnimatePresence>
                {storeUsers.map((u, i) => (
                  <motion.div key={u.userId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ delay: i * 0.05 }}
                    className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-gray-200  dark:border-slate-700 last:border-0 hover:bg-gray-100  dark:hover:bg-slate-700/60 transition-colors items-center">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-xs font-bold text-[#1864ab] shrink-0">
                        {u.email.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.email}</span>
                    </div>
                    <div className="col-span-3 text-sm text-gray-600 dark:text-slate-400 dark:text-slate-500 truncate">{u.userName || "-"}</div>
                    <div className="col-span-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${u.userType === "store_admin" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 dark:text-slate-400 dark:text-slate-500"}`}>
                        {u.userType === "store_admin" ? "Admin" : "User"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {u.status}
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button size="sm" variant="ghost" onClick={() => handleRemove(u.userId)}
                        disabled={removing === u.userId || u.userId === user?.userId}
                        className="h-8 w-8 p-0 text-gray-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50">
                        {removing === u.userId ? <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showModal && <AddUserModal onClose={() => setShowModal(false)} onSuccess={loadUsers} companyName={user?.companyName} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ── UsersLogTab ─────────────────────────────────────────────────────────────
function UsersLogTab() {
  const usersLog = useStore((s) => s.usersLog);
  const setUsersLog = useStore((s) => s.setUsersLog);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchUsersLog();
        setUsersLog(data);
      } catch {
        toast.error("Failed to load logs");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
      <div className="bg-slate-50 dark:bg-[#151a2a] border border-gray-200  dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px] md:min-w-full">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 dark:bg-[#151a2a] border-b border-gray-200  dark:border-slate-700 text-xs font-bold text-gray-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <div className="col-span-4">Email</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Company</div>
              <div className="col-span-4">Date</div>
            </div>

            {loading ? (
              <div className="py-12 flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-[#1864ab] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : usersLog.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <FileText className="h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500 dark:text-slate-400 dark:text-slate-500">No logs yet</p>
              </div>
            ) : (
              usersLog.map((log, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-gray-200  dark:border-slate-700 last:border-0 text-sm hover:bg-gray-100  dark:hover:bg-slate-700/60 items-center">
                  <div className="col-span-4 text-gray-900 dark:text-white font-medium truncate">{log.email}</div>
                  <div className="col-span-2 text-gray-600 dark:text-slate-400 dark:text-slate-500 capitalize">{log.userType}</div>
                  <div className="col-span-2 text-gray-600 dark:text-slate-400 dark:text-slate-500 truncate">{log.companyId}</div>
                  <div className="col-span-4 text-gray-500 dark:text-slate-400 dark:text-slate-500 text-xs">{new Date(log.loginAt).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Settings Page ───────────────────────────────────────────────────────────
export default function Settings() {
  const user = useStore((s) => s.user);
  const [activeTab, setActiveTab] = useState("account");
  const [primaryColor, setPrimaryColor] = useState("#1864ab");
  const [photoUrl, setPhotoUrl] = useState(null);

  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === "users" || tab.id === "log")
      return user?.userType === "store_admin" || user?.userType === "super_admin";
    return true;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b101e] p-4 md:p-10 font-sans transition-colors duration-200">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full max-w-[1200px] mx-auto">
        <div className="flex items-center gap-4 md:gap-5 mb-8 pt-2">
          <Avatar primaryColor={primaryColor} companyName={user?.companyName || ""} photoUrl={photoUrl} />
          <div>
            <h1 className="text-xl md:text-[22px] font-bold text-gray-900 dark:text-white leading-tight">Settings</h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 dark:text-slate-500 mt-0.5 capitalize">{user?.userType?.replace('_', ' ')}</p>
          </div>
        </div>

        {/* Tab Navigation - Scrollable on Mobile */}
        <div className="flex items-center gap-4 md:gap-6 border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-scrollbar">
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 pb-3 text-sm font-bold transition-colors border-b-2 -mb-[1.5px] whitespace-nowrap ${
                activeTab === id ? "text-[#1864ab] border-[#1864ab]" : "border-transparent text-gray-500 dark:text-slate-400 dark:text-slate-500 hover:text-gray-900 dark:text-gray-400 dark:text-slate-500"
              }`}
              style={activeTab === id ? { color: primaryColor, borderColor: primaryColor } : {}}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        <div className="pt-2">
          <AnimatePresence mode="wait">
            {activeTab === "account" && <MyAccountTab key="account" primaryColor={primaryColor} setPrimaryColor={setPrimaryColor} photoUrl={photoUrl} setPhotoUrl={setPhotoUrl} />}
            {activeTab === "users" && <ManageUsersTab key="users" />}
            {activeTab === "log" && <UsersLogTab key="log" />}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
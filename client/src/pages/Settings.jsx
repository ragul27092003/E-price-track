import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfToday, endOfToday, subDays, startOfMonth, endOfMonth } from "date-fns";
import {User, Mail, Lock, Eye, EyeOff, Trash2, UserPlus,X, Check, AlertCircle, Users, FileText, ChevronDown, Camera, Calendar as CalendarIcon,UserRoundPlus, BellDot, Gift, Bell, CreditCard, Sparkles, Clock} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, selectCurrentStoreId } from "@/store";
import { toast } from "sonner";
import {
  fetchProfile,
  updateProfile,
  updatePassword,
  uploadStoreLogo,
  updateLogo,
  updateColor,
  fetchUsers,
  addUser,
  removeUser,
  fetchUsersLog,
  fetchLogFilterUsers,
} from "@/services/settingsService";

import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import API from "@/hooks/useApi";

const TABS = [
  { id: "account", label: "My Account", icon: User },
  { id: "users", label: "Manage Users", icon: Users },
  { id: "log", label: "Users Log", icon: FileText },
  { id: "pendingsignup", label: "Pending Signup", icon: UserRoundPlus },
  { id: "alertnotification", label: "Alert Notification", icon: BellDot },
];

function Avatar({ size = "lg", primaryColor, companyName = "", photoUrl = null }) {
  const sizeClass = size === "lg" ? "h-[60px] w-[60px] md:h-[72px] md:w-[72px] text-sm" : "h-9 w-9 text-xs";
  const firstLetter = companyName.trim().charAt(0).toUpperCase() || "?";
  const subLabel = companyName.trim().split(/\s+/).slice(1).join(" ").toUpperCase();

  if (photoUrl) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden shadow-sm shrink-0`}>
        <img src={photoUrl} alt="Profile" className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full flex flex-col items-center justify-center text-white font-bold shadow-sm tracking-widest leading-none shrink-0`}
      style={{ backgroundColor: primaryColor }}
    >
      <span>{firstLetter}</span>
      {size === "lg" && subLabel && (
        <span className="text-[6px] font-normal tracking-normal mt-0.5 hidden md:block">{subLabel}</span>
      )}
    </div>
  );
}

function MyAccountTab({ primaryColor, onColorChange, photoUrl, setPhotoUrl }) {
  const user = useStore((s) => s.user);
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const activeStoreId = useStore((s) => s.activeStoreId);
  const storeLogoMap = useStore((s) => s.storeLogoMap);
  const setStoreLogo = useStore((s) => s.setStoreLogo);
  const setStoreColor = useStore((s) => s.setStoreColor);

  const [email_address, setEmailAddress] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [user_type, setUserType] = useState("");
  const [user_name, setUserName] = useState("");
  const [mobile_number, setMobileNumber] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const isUser = user?.user_type === "user";

  const currentStoreKey = (user?.user_type === 'super_admin' ? activeStoreId : user?.cmpid) || "default";
  const savedLogo = storeLogoMap?.[currentStoreKey] || null;

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProfile();
        setProfile(data);
        setEmailAddress(data.email_address || "");
        setWebsite(data.website || "");
        setUserType(data.user_type || "store_admin");
        setMobileNumber(data.mobile_number || "");
        setCompanyName(data.companyName || data.cmpid || "");
        setUserName(data.user_name || "");
        setCurrentPassword(data.password_new || "");
        const dbLogo = data.logoUrl || null;
        setPhotoUrl(dbLogo);
        if (dbLogo) setStoreLogo(currentStoreKey, dbLogo);
        else setStoreLogo(currentStoreKey, null);
        // Sync the saved brand color into the store so Settings + Sidebar agree
        setStoreColor(currentStoreKey, data.primaryColor || "#1864ab");
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };
    setProfile(null);
    load();
  }, [user?.user_id, activeStoreId]);

  useEffect(() => {
    const cached = storeLogoMap?.[currentStoreKey] || null;
    setPhotoUrl(cached);
  }, [currentStoreKey]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await updateProfile(mobile_number);
      setProfile({ ...profile, mobile_number });
      toast.success("Account updated successfully!");
    } catch {
      toast.error("Failed to update account");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPhotoUrl(previewUrl);

    try {
      const result = await uploadStoreLogo(file);
      const cloudinaryUrl = result.logoUrl;
      setPhotoUrl(cloudinaryUrl);
      setStoreLogo(currentStoreKey, cloudinaryUrl);
      toast.success("Store logo saved!");
    } catch {
      setPhotoUrl(savedLogo || null);
      toast.error("Failed to save logo to server");
    } finally {
      e.target.value = '';
    }
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
      <Input
        value={value}
        readOnly={readOnly}
        onChange={onChange}
        className={`bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white pr-10 focus-visible:ring-blue-500 ${
          readOnly ? "cursor-default text-gray-700 dark:text-slate-300 bg-slate-50 dark:bg-[#151a2a]" : ""
        }`}
      />
      {readOnly && (
        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500 pointer-events-none" />
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-full pb-10 pt-2">
      {/* Branding Section */}
      <div className="bg-slate-50 dark:bg-[#151a2a] border border-gray-200 dark:border-slate-700 rounded-xl p-4 md:p-6">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Company Branding</h3>
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          {/* Logo Upload */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 block">Store Logo</label>
            <div className="flex items-center gap-4">
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
              {!isUser && (
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer select-none">
                      <Camera className="h-3.5 w-3.5" />
                      {photoUrl ? "Change Logo" : "Upload Logo"}
                    </span>
                  </label>
                  {photoUrl && (
                    <button
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove Logo
                    </button>
                  )}
                  <p className="text-[10px] text-gray-400 dark:text-slate-500">PNG, JPG, SVG · Shown in header</p>
                </div>
              )}
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

          {!isUser && (
            <div className="sm:ml-auto">
              <label className="text-xs font-bold text-gray-600 dark:text-slate-400 block mb-1.5">Primary Brand Color</label>
              <div className="relative flex items-center gap-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/60 w-fit">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => onColorChange(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-5 h-5 rounded-sm shadow-inner" style={{ backgroundColor: primaryColor }} />
                <span className="text-sm text-gray-700 dark:text-slate-300 mx-1">{primaryColor}</span>
                <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-500" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-slate-50 dark:bg-[#151a2a] border border-gray-200 dark:border-slate-700 rounded-xl p-4 md:p-6">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-5">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 md:gap-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-white block">Email Address</label>
            <ValidatedInput value={email_address} readOnly />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-white block">Website URL</label>
            <ValidatedInput value={website} readOnly />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-white block">Username</label>
            <ValidatedInput value={isUser ? user_name : companyName} readOnly />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-white block">Phone Number</label>
            <ValidatedInput value={mobile_number} onChange={(e) => setMobileNumber(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setMobileNumber(profile?.mobile_number || "")}
            className="order-2 sm:order-1 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-[#151a2a]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={saving}
            style={{ backgroundColor: primaryColor }}
            className="order-1 sm:order-2 text-white font-semibold hover:bg-opacity-90"
          >
            {saving ? "Updating..." : "Update Account"}
          </Button>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-slate-50 dark:bg-[#151a2a] border border-gray-200 dark:border-slate-700 rounded-xl p-4 md:p-6">
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
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="border-gray-300 dark:border-slate-700 pr-10 bg-white dark:bg-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-white block">Confirm New Password</label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Confirm New Password"
                className="border-gray-300 dark:border-slate-700 pr-10 bg-white dark:bg-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-start gap-3 mt-6">
          <Button
            onClick={handlePasswordUpdate}
            disabled={savingPass}
            style={{ backgroundColor: primaryColor }}
            className="text-white font-semibold px-6 hover:bg-opacity-90"
          >
            {savingPass ? "Updating..." : "Update Password"}
          </Button>
          <Button
            variant="outline"
            onClick={() => { setNewPassword(""); setConfirmPass(""); }}
            className="border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-semibold px-6 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-[#151a2a]"
          >
            Cancel
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ── AddUserModal ─────────────────────────────────────────────────────────────
function AddUserModal({ onClose, onSuccess, companyName }) {
  const [email_address, setEmailAddress] = useState("");
  const [user_name, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [email_notify, setEmailNotify] = useState("");
  const [export_option, setExportOption] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!email_address || !password) { toast.error("Email and password are required"); return; }
    setSaving(true);
    try {
      await addUser({ email_address, user_name, password, email_notify, export_option });
      toast.success("User added successfully");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add user");
    } finally {
      setSaving(false);
    }
  };

  const selectClass =
    "w-full h-9 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white dark:bg-[#151a2a] border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
          {/* Decoy fields — absorb Chrome's autofill so it doesn't land on Name/Password below */}
          <input type="text" name="username" autoComplete="username" style={{ display: 'none' }} />
          <input type="password" name="password" autoComplete="current-password" style={{ display: 'none' }} />
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Add User</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-white block">Email Address</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={email_address}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-white block">
                Name <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <Input
                placeholder="Full name"
                value={user_name}
                onChange={(e) => setUserName(e.target.value)}
                autoComplete="off"
                name="new_user_display_name"
                className="border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-white block">Password</label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  name="new_user_password"
                  className="border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-white block">Email Notification</label>
                <div className="relative">
                  <select
                    value={email_notify}
                    onChange={(e) => setEmailNotify(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">-- Select --</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-white block">Export Option</label>
                <div className="relative">
                  <select
                    value={export_option}
                    onChange={(e) => setExportOption(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">-- Select --</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800"
            >
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving} className="flex-1 bg-[#1864ab] hover:bg-blue-800 text-white">
              {saving ? "Adding..." : "Add User"}
            </Button>
          </div>
        </div>
      </motion.div>
    </>
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
      // ✅ FIX 1: Deduplicate by _id (MongoDB ObjectId — guaranteed unique)
      const seen = new Set();
      const unique = data.filter((u) => {
        if (seen.has(u._id)) return false;
        seen.add(u._id);
        return true;
      });
      setStoreUsers(unique);
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
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{storeUsers.length} users in your company</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm" className="gap-2 bg-[#1864ab] hover:bg-blue-800 text-white w-full sm:w-fit">
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="bg-slate-50 dark:bg-[#151a2a] border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px] md:min-w-full">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 dark:bg-[#151a2a] border-b border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
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
                <p className="text-sm text-gray-500 dark:text-slate-400">No users yet</p>
              </div>
            ) : (
              <AnimatePresence>
                {storeUsers.map((u, i) => (
                  // ✅ FIX 2: Use _id as key — MongoDB ObjectId, always unique
                  <motion.div
                    key={u._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.05 }}
                    className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-gray-200 dark:border-slate-700 last:border-0 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors items-center"
                  >
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-xs font-bold text-[#1864ab] shrink-0">
                        {u.email_address.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.email_address}</span>
                    </div>
                    <div className="col-span-3 text-sm text-gray-600 dark:text-slate-400 truncate">{u.user_name || "-"}</div>
                    <div className="col-span-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${
                        u.user_type === "store_admin" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {u.user_type === "store_admin" ? "Admin" : "User"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${
                        u.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {u.status}
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemove(u.user_id)}
                        disabled={removing === u.user_id || u.user_id === user?.user_id}
                        className="h-8 w-8 p-0 text-gray-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50"
                      >
                        {removing === u.user_id
                          ? <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
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
        {showModal && (
          <AddUserModal
            onClose={() => setShowModal(false)}
            onSuccess={loadUsers}
            companyName={user?.companyName}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── UsersLogTab ─────────────────────────────────────────────────────────────
const DATE_PRESETS = [
  { id: "today",     label: "Today" },
  { id: "last7",     label: "Last 7 Days" },
  { id: "last10",    label: "Last 10 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "custom",    label: "Date Range" },
];

const PAGE_SIZE = 20;

function presetToRange(presetId) {
  const today = new Date();
  switch (presetId) {
    case "today":     return { from: startOfToday(), to: endOfToday() };
    case "last7":     return { from: subDays(startOfToday(), 6), to: endOfToday() };
    case "last10":    return { from: subDays(startOfToday(), 9), to: endOfToday() };
    case "thisMonth": return { from: startOfMonth(today), to: endOfMonth(today) };
    default:          return undefined;
  }
}

function UsersLogTab() {
  const usersLog = useStore((s) => s.usersLog);
  const setUsersLog = useStore((s) => s.setUsersLog);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [filterUsers, setFilterUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [preset, setPreset] = useState("");           // "" = no date filter
  const [customRange, setCustomRange] = useState();   // { from, to } for the "Date Range" popover
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Applied filters — only these trigger a fetch, so changing the dropdown
  // or picking dates doesn't reload until "Submit" is pressed.
  const [appliedUserId, setAppliedUserId] = useState("all");
  const [appliedRange, setAppliedRange] = useState(undefined);

  useEffect(() => {
    fetchLogFilterUsers()
      .then(setFilterUsers)
      .catch(() => setFilterUsers([]));
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { total, logs } = await fetchUsersLog({
          userId: appliedUserId,
          start: appliedRange?.from ? format(appliedRange.from, "yyyy-MM-dd") : undefined,
          end: appliedRange?.to ? format(appliedRange.to, "yyyy-MM-dd") : undefined,
          page,
          limit: PAGE_SIZE,
        });
        setUsersLog(logs);
        setTotal(total);
      } catch {
        toast.error("Failed to load logs");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [appliedUserId, appliedRange, page]);

  const handlePresetChange = (id) => {
    setPreset(id);
    if (id === "custom") {
      setDatePopoverOpen(true);
    } else {
      setCustomRange(undefined);
    }
  };

  const handleSubmit = () => {
    setAppliedUserId(selectedUserId);
    setAppliedRange(preset === "custom" ? customRange : presetToRange(preset));
    setPage(1); // reset to first page on any new filter
  };

  const dateLabel = preset === "custom"
    ? customRange?.from
      ? customRange.to
        ? `${format(customRange.from, "dd/MM/yyyy")} - ${format(customRange.to, "dd/MM/yyyy")}`
        : format(customRange.from, "dd/MM/yyyy")
      : "Pick a range"
    : DATE_PRESETS.find((p) => p.id === preset)?.label || "All Dates";

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const pageNumbers = React.useMemo(() => {
    const nums = [];
    const windowSize = 2;
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - windowSize && p <= page + windowSize)) {
        nums.push(p);
      } else if (nums[nums.length - 1] !== "…") {
        nums.push("…");
      }
    }
    return nums;
  }, [page, totalPages]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-2 space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="w-full sm:w-[220px] bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {filterUsers.map((u) => (
              <SelectItem key={u.user_id} value={u.user_id}>
                {u.user_name || u.email_address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700">
            <SelectValue placeholder="All Dates" />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {preset === "custom" && (
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-[260px] justify-start text-left font-normal bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700"
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-slate-300">{dateLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={setCustomRange}
                numberOfMonths={2}
                initialFocus
              />
              {customRange?.from && (
                <div className="flex justify-end gap-2 p-3 border-t border-gray-200 dark:border-slate-700">
                  <Button size="sm" variant="ghost" onClick={() => setCustomRange(undefined)}>Clear</Button>
                  <Button size="sm" onClick={() => setDatePopoverOpen(false)}>Done</Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}

        <Button onClick={handleSubmit} className="bg-[#1864ab] hover:bg-[#14538a] text-white">
          Submit
        </Button>
      </div>

      <p className="text-xs text-gray-500 dark:text-slate-400">
        {loading ? "Loading…" : `Showing ${rangeStart}-${rangeEnd} of ${total} items`}
      </p>

      <div className="bg-slate-50 dark:bg-[#151a2a] border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px] md:min-w-full">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 dark:bg-[#151a2a] border-b border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              <div className="col-span-3">User Name</div>
              <div className="col-span-3">Email Address</div>
              <div className="col-span-3">Action</div>
              <div className="col-span-3">Log At</div>
            </div>

            {loading ? (
              <div className="py-12 flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-[#1864ab] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : usersLog.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <FileText className="h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500 dark:text-slate-400">No logs yet</p>
              </div>
            ) : (
              usersLog.map((log, i) => {
                const isFailedLogin = (log.action || '').includes('invalid');
                const isLogout = log.action === 'logout';
                return (
                  <div
                    key={log._id || i}
                    className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-gray-200 dark:border-slate-700 last:border-0 text-sm hover:bg-gray-100 dark:hover:bg-slate-700/60 items-center"
                  >
                    <div className="col-span-3 text-gray-900 dark:text-white font-medium truncate">
                      {log.user_name || '-'}
                    </div>
                    <div className="col-span-3 text-gray-600 dark:text-slate-400 truncate">
                      {log.email_address || log.email_addr || '-'}
                    </div>
                    <div className="col-span-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${
                        isFailedLogin ? "bg-red-100 text-red-700"
                        : isLogout ? "bg-gray-100 text-gray-600"
                        : "bg-green-100 text-green-700"
                      }`}>
                        {log.action || (isLogout ? "logout" : "manual login")}
                      </span>
                    </div>
                    <div className="col-span-3 text-gray-500 dark:text-slate-400 text-xs">
                      {log.log_at || (log.loginAt && new Date(log.loginAt).toLocaleString()) || '-'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-200 dark:border-slate-700 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="h-8 px-3"
              >
                Prev
              </Button>
              {pageNumbers.map((p, idx) =>
                p === "…" ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-xs text-gray-400">…</span>
                ) : (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === page ? "default" : "outline"}
                    onClick={() => setPage(p)}
                    className={`h-8 w-8 p-0 ${p === page ? "bg-[#1864ab] hover:bg-[#14538a] text-white" : ""}`}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="h-8 px-3"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// __ Pending SignUp Part ______________________________________________________

const BRAND_COLORS = ["#2B86C5", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2"];
const colorFor = (str = "") => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff;
  return BRAND_COLORS[h % BRAND_COLORS.length];
};
const SignupAvatar = ({ name }) => (
  <div
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
    style={{ backgroundColor: colorFor(name) }}
  >
    {(name || "?").slice(0, 2).toUpperCase()}
  </div>
);
function PendingSignupTab() {

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
                          <SignupAvatar name={c.companyName} />
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

   
}


function AlertNotification() {

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notification types state
  const [notificationTypes, setNotificationTypes] = useState({

    payment: {
      enabled: false,
      message: '',
      aiMessage: '',
      icon: <CreditCard className="w-6 h-6" />,
      title: 'Payment Reminder',
      color: 'blue',
      badge: 'URGENT',
      defaultMessage: 'Your monthly subscription payment of $49.99 is due in {days} days. Please complete your payment to avoid service interruption.'
    },
    admin: {
      enabled: false,
      message: '',
      aiMessage: '',
      icon: <Bell className="w-6 h-6" />,
      title: 'Admin Message',
      color: 'purple',
      badge: 'IMPORTANT',
      defaultMessage: 'Important system update: Please review the latest changes to ensure smooth operations.'
    },
    festival: {
      enabled: false,
      message: '',
      aiMessage: '',
      icon: <Gift className="w-6 h-6" />,
      title: 'Festival Wishes',
      color: 'amber',
      badge: 'CELEBRATION',
      defaultMessage: 'Happy Festival Season! May your celebrations be filled with joy and prosperity. Special offers await!'
    }
  });
  const [activeType, setActiveType] = useState('payment');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const storeId = useStore(selectCurrentStoreId);
  const user = useStore((s) => s.user);
  const userId = useStore((s) => s.user.user_id);
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  

  // Load notification settings from MongoDB

  useEffect(() => {
    const loadNotificationSettings = async () => {
      if (!storeId || !user?.user_id) return;
      
      setLoading(true);
      try {

        const response = await API.get(`/settings/get-notification/${storeId}`);
        if (response.data.status && response.data.data) {

          const settings = response.data.data;

          // Update state with loaded settings
          setNotificationTypes(prev => ({
            payment: {
              ...prev.payment,
              enabled: settings.types?.payment?.enabled || false,
              message: settings.types?.payment?.message || '',
              aiMessage: settings.types?.payment?.aiMessage || ''
            },
            admin: {
              ...prev.admin,
              enabled: settings.types?.admin?.enabled || false,
              message: settings.types?.admin?.message || '',
              aiMessage: settings.types?.admin?.aiMessage || ''
            },
            festival: {
              ...prev.festival,
              enabled: settings.types?.festival?.enabled || false,
              message: settings.types?.festival?.message || '',
              aiMessage: settings.types?.festival?.aiMessage || ''
            }
          }));
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
        toast.error('Failed to load notification settings');
      } finally {
        setLoading(false);
      }
    };

    loadNotificationSettings();
  }, [storeId, user?.user_id]);

  
  // Generate AI message for specific type
  const generateAIMessage = async (type) => {
    setIsGeneratingAI(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const aiMessages = {

        payment: [
          `Your ePrice Track subscription payment is due. Please complete your payment to continue using our services without interruption.`,
          `Keep your ePrice Track subscription active and continue tracking prices and competitors. Please complete your payment at your earliest convenience.`,
          `Your ePrice Track subscription needs to be renewed. Complete your payment to enjoy uninterrupted price tracking, competitor monitoring, and product insights.`
        ],
        
        admin: [
          `We're rolling out new features to enhance your experience. Check out the latest improvements!`,
          `Platform maintenance scheduled for this weekend. Minimal downtime expected.`,
          `Important update available. Please check your ePrice Track account settings.`
        ],
        festival: [
          `Wishing you and your business a joyful and successful festival! May this festive season bring you new opportunities, better sales, and greater success with ePrice Track.`,
          `Happy Festive Season! May your business grow with smarter pricing, better insights, and greater success with ePrice Track.`,
          `Wishing you a successful festive season! Stay ahead of competitors, track prices smarter, and maximize your sales with ePrice Track.`
        ]
      };
      
      const randomIndex = Math.floor(Math.random() * aiMessages[type].length);
      const generated = aiMessages[type][randomIndex];
      
      setNotificationTypes(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          aiMessage: generated
        }
      }));
      
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} AI message generated!`);
    } catch (error) {
      toast.error('Failed to generate message');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Save notification settings to MongoDB
  const saveNotificationSettings = async () => {

    if (!storeId || !user?.user_id) {
      toast.error('Company ID or user not available');
      return;
    }

    // Validate message
    const emptyMessageType = Object.keys(notificationTypes).find(
      type =>
        notificationTypes[type].enabled &&
        !notificationTypes[type].message?.trim()
    );

    if (emptyMessageType) {
      toast.error(
        `Please enter a message for ${
          emptyMessageType.charAt(0).toUpperCase() + emptyMessageType.slice(1)
        } notification`
      );
      return;
    }

    setSaving(true);

    try {
      
      const payload = {
        types: {
          payment: {
            enabled: notificationTypes.payment.enabled,
            message: notificationTypes.payment.message,
            aiMessage: notificationTypes.payment.aiMessage
          },
          admin: {
            enabled: notificationTypes.admin.enabled,
            message: notificationTypes.admin.message,
            aiMessage: notificationTypes.admin.aiMessage
          },
          festival: {
            enabled: notificationTypes.festival.enabled,
            message: notificationTypes.festival.message,
            aiMessage: notificationTypes.festival.aiMessage
          }
        },
        enabledNotifications: Object.keys(notificationTypes).filter(
          key => notificationTypes[key].enabled
        )
      };

      const response = await API.put(`/settings/put-notification/${storeId}/${userId}`, payload);
      
      if (response.data.success) {
        toast.success('Notification settings saved successfully!');
        
        // Update profile with new settings
        setProfile({
          ...profile,
          notificationTypes: notificationTypes,
          enabledNotifications: payload.enabledNotifications
        });

        // Dispatch event for TopBar
        window.dispatchEvent(new CustomEvent('notificationUpdate', {
          detail: {
            types: notificationTypes,
            enabledTypes: payload.enabledNotifications,
            timestamp: new Date().toISOString()
          }
        }));
      } else {
        toast.error(response.data.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  // Toggle notification type
  const toggleNotification = async (type) => {
    setNotificationTypes(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        enabled: !prev[type].enabled
      }
    }));
  };

  // Update message for specific type
  const updateMessage = (type, value) => {
    setNotificationTypes(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        message: value
      }
    }));
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        border: 'border-l-4 border-blue-500',
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
        badgeBg: 'bg-blue-100 dark:bg-blue-900/30',
        badgeText: 'text-blue-700 dark:text-blue-300',
        hover: 'hover:shadow-blue-100/50 dark:hover:shadow-blue-900/20'
      },
      amber: {
        bg: 'bg-amber-50 dark:bg-amber-950/20',
        border: 'border-l-4 border-amber-500',
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        iconColor: 'text-amber-600 dark:text-amber-400',
        badgeBg: 'bg-amber-100 dark:bg-amber-900/30',
        badgeText: 'text-amber-700 dark:text-amber-300',
        hover: 'hover:shadow-amber-100/50 dark:hover:shadow-amber-900/20'
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-950/20',
        border: 'border-l-4 border-purple-500',
        iconBg: 'bg-purple-100 dark:bg-purple-900/30',
        iconColor: 'text-purple-600 dark:text-purple-400',
        badgeBg: 'bg-purple-100 dark:bg-purple-900/30',
        badgeText: 'text-purple-700 dark:text-purple-300',
        hover: 'hover:shadow-purple-100/50 dark:hover:shadow-purple-900/20'
      }
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400 font-medium">Loading notification settings...</p>
        </div>
      </div>
    );
  }

  const currentType = notificationTypes[activeType];

  
  const getDisplayMessage = (type) => {
    const data = notificationTypes[type];
    if (!data) return '';
    
    let message = data.message || data.aiMessage || data.defaultMessage || '';
    return message;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pt-2"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Alert Notifications</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Configure notification messages for your store (Tenant: {storeId})
          </p>
        </div>
        <button
          onClick={saveNotificationSettings}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent inline-block mr-2" />
              Saving...
            </>
          ) : (
            'Save All Settings'
          )}
        </button>
      </div>

      {/* Notification Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['payment', 'admin', 'festival'].map((type) => {

          const data = notificationTypes[type];
          const isActive = activeType === type;
          const colors = getColorClasses(data.color);
            
          
          return (
            <div
              key={type}
              onClick={() => setActiveType(type)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                isActive 
                  ? `${colors.border} ${colors.bg} shadow-md` 
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-[#151a2a] hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colors.iconBg} ${colors.iconColor}`}>
                    {data.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white text-sm">
                      {data.title}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${data.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {data.enabled ? '✅ Active' : '⏸️ Disabled'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNotification(type);
                  }}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                    data.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      data.enabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Type Configuration */}
      <div className="bg-white dark:bg-[#151a2a] border border-gray-200 dark:border-slate-700 rounded-xl p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


          {/* Left Column - Configuration */}
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${getColorClasses(notificationTypes[activeType].color).iconBg} ${getColorClasses(notificationTypes[activeType].color).iconColor}`}>
                {notificationTypes[activeType].icon}
              </div>
              <h4 className="text-lg font-bold text-gray-800 dark:text-white capitalize">
                {activeType === 'payment' ? 'Payment Reminder' : 
                 activeType === 'admin' ? 'Admin Message' : 
                 'Festival Wishes'}
              </h4>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${currentType.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {currentType.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>

            {/* {activeType === 'payment' && (
              <div>
                <label className="text-sm font-bold text-gray-800 dark:text-white block mb-2">
                  Days Before Due Date
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="15"
                    value={notificationTypes.payment.daysRemaining}
                    onChange={(e) => updateDays(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm font-semibold text-gray-800 dark:text-white min-w-[50px] text-center">
                    {notificationTypes.payment.daysRemaining} {notificationTypes.payment.daysRemaining === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </div>
            )} */}
 
            <div>
              <label className="text-sm font-bold text-gray-800 dark:text-white block mb-2">
                Custom Message
              </label>
              <div className="relative">
                <textarea
                  value={currentType.message || ''}
                  onChange={(e) => updateMessage(activeType, e.target.value)}
                  placeholder={`Enter custom ${activeType === 'payment' ? 'payment reminder' : activeType === 'admin' ? 'admin' : 'festival'} message...`}
                  rows="3"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                {currentType.message && (
                  <button
                    onClick={() => updateMessage(activeType, '')}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-800 dark:text-white">
                  AI Generated Message
                </label>
                <button
                  onClick={() => generateAIMessage(activeType)}
                  disabled={isGeneratingAI}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isGeneratingAI ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Message
                    </>
                  )}
                </button>
              </div>
              {currentType.aiMessage && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">
                    {currentType.aiMessage}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">AI Generated</span>
                    <button
                      onClick={() => {
                        updateMessage(activeType, currentType.aiMessage);
                        toast.success('AI message copied to custom message!');
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Use this message
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          

          {/* Right Column - Preview */}
          <div className="bg-gray-50 dark:bg-[#0f1624] rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-800 dark:text-white">Live Preview</h4>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                currentType.enabled 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
              }`}>
                {currentType.enabled ? '✅ Active' : '⏸️ Disabled'}
              </span>
            </div>
            
            <div className={`rounded-xl p-4 transition-all ${
              currentType.enabled 
                ? 'bg-white dark:bg-[#151a2a] border border-gray-200 dark:border-slate-700 shadow-sm' 
                : 'bg-gray-100 dark:bg-slate-800/50 opacity-50'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getColorClasses(currentType.color).iconBg} ${getColorClasses(currentType.color).iconColor}`}>
                  {currentType.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-gray-800 dark:text-white text-sm">
                      {currentType.title}
                    </h5>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getColorClasses(currentType.color).badgeBg} ${getColorClasses(currentType.color).badgeText}`}>
                      {currentType.badge}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-slate-300 text-sm mt-1.5 leading-relaxed">
                    {getDisplayMessage(activeType) || 'Configure a message above to preview'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Just now
                  </p>
                </div>
              </div>
            </div>
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
  const [photoUrl, setPhotoUrl] = useState(null);

  const storeId = useStore(selectCurrentStoreId);
  const setStoreColor = useStore((s) => s.setStoreColor);
  const primaryColor = useStore((s) => s.primaryColorMap?.[storeId] || "#1864ab");

  // Update instantly in UI (store) + persist to backend so it survives refresh
  // and the sidebar (which reads the same store value) updates immediately.
  const handleColorChange = async (newColor) => {
    setStoreColor(storeId, newColor);
    try {
      await updateColor(newColor);
    } catch {
      toast.error("Failed to save color");
    }
  };

  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === "users" || tab.id === "log") {
      return (
        user?.user_type === "store_admin" ||
        user?.user_type === "super_admin"
      );
    }

    if (tab.id === "pendingsignup" || tab.id === "alertnotification") {
      return user?.user_type === "super_admin";
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b101e] p-4 md:p-10 font-sans transition-colors duration-200">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 w-full max-w-[1200px] mx-auto"
      >
        <div className="flex items-center gap-4 md:gap-5 mb-8 pt-2">
          <Avatar primaryColor={primaryColor} companyName={user?.companyName || ""} photoUrl={photoUrl} />
          <div>
            <h1 className="text-xl md:text-[22px] font-bold text-gray-900 dark:text-white leading-tight">Settings</h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 mt-0.5 capitalize">
              {user?.user_type?.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 md:gap-6 border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-scrollbar">
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 pb-3 text-sm font-bold transition-colors border-b-2 -mb-[1.5px] whitespace-nowrap ${
                activeTab === id
                  ? "text-[#1864ab] border-[#1864ab]"
                  : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
              }`}
              style={activeTab === id ? { color: primaryColor, borderColor: primaryColor } : {}}
            >
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        <div className="pt-2">
          <AnimatePresence mode="wait">
            {activeTab === "account" && (
              <MyAccountTab
                key="account"
                primaryColor={primaryColor}
                onColorChange={handleColorChange}
                photoUrl={photoUrl}
                setPhotoUrl={setPhotoUrl}
              />
            )}
            {activeTab === "users" && <ManageUsersTab key="users" />}
            {activeTab === "log" && <UsersLogTab key="log" />}
            {activeTab === "pendingsignup" && <PendingSignupTab key="pendingsignup" />}
            {activeTab === "alertnotification" && <AlertNotification key="alertnotification" />}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
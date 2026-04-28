import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Globe,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Camera,
  Trash2,
  UserPlus,
  X,
  Check,
  AlertCircle,
  Shield,
  Users,
  FileText,
  Upload,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import API from "@/hooks/useApi";
import { toast } from "sonner";

const TABS = [
  { id: "account", label: "My Account", icon: User },
  { id: "users", label: "Manage Users", icon: Users },
  { id: "log", label: "Users Log", icon: FileText },
];

function Avatar({ companyName, companyUrl, size = "lg", primaryColor }) {
  const initials = "S";
  const sizeClass = size === "lg" ? "h-[72px] w-[72px] text-sm" : "h-9 w-9 text-xs";
  
  return (
    <div
      className={`${sizeClass} rounded-full flex flex-col items-center justify-center text-white font-bold shadow-sm tracking-widest leading-none`}
      style={{ backgroundColor: primaryColor }} 
    >
      <span>{initials}</span>
      {size === "lg" && <span className="text-[6px] font-normal tracking-normal mt-0.5">ELECTRONICS</span>}
    </div>
  );
}

function MyAccountTab({ user, primaryColor, setPrimaryColor, secondaryColor, setSecondaryColor }) {
  const [email, setEmail]             = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyUrl, setCompanyUrl]   = useState("");
  const [userType, setUserType]       = useState("");
  const [userName, setUserName]       = useState("");
  const [phone, setPhone]             = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [savingPass, setSavingPass]   = useState(false);
  const [country, setCountry] = useState("India");

  const isUser = user?.userType === 'user';

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res  = await API.get("/settings/profile");
        const data = res.data;

        setEmail(data.email         || "ragulempire2kk3@gmail.com");
        setCompanyUrl(data.companyUrl || "ragulelectronics.com");
        setUserType(data.userType   || "store_admin");
        setPhone(data.phone         || "");

        if (data.userType === 'user') {
          setUserName("Ragul Electronics");
          setCompanyName("Ragul Electronics"); 
        } else {
          setCompanyName(data.companyName || data.companyId || "Ragul Electronics");
          setUserName(data.userName || "Ragul Electronics");
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };
    loadProfile();
  }, [user?.userId]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await API.put("/settings/profile", { phone });
      toast.success("Account updated successfully!");
    } catch {
      toast.error("Failed to update account");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword) { toast.error("New password is required"); return; }
    if (newPassword.length < 8) { toast.error("Minimum 8 characters"); return; }
    if (!/[A-Z]/.test(newPassword)) { toast.error("Must contain at least one uppercase letter"); return; }
    if (!/[0-9]/.test(newPassword)) { toast.error("Must contain at least one number"); return; }
    if (newPassword !== confirmPass) { toast.error("Passwords do not match"); return; }

    setSavingPass(true);
    try {
      await API.put("/settings/password", { newPassword });
      toast.success("Password updated successfully!");
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
        className={`bg-white border-gray-300 text-gray-900 pr-10 focus-visible:ring-blue-500 ${readOnly ? 'cursor-default text-gray-700 bg-gray-50' : ''}`}
      />
      {readOnly && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />}
    </div>
  );

  const getPasswordStrength = () => {
    if (newPassword.length === 0) return { score: 0, text: "" };
    if (newPassword.length < 4) return { score: 1, text: "Very Weak" };
    if (newPassword.length < 8) return { score: 2, text: "Weak" };
    if (/[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[!@#$%^&*]/.test(newPassword)) return { score: 4, text: "Strong" };
    return { score: 3, text: "Good" };
  };

  const { score, text } = getPasswordStrength();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-full pb-10 pt-2">

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 transition-colors">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Company Branding</h3>
        <div className="flex flex-wrap items-center gap-6">
          <Button variant="outline" className="text-gray-700 font-semibold border-gray-300 bg-white hover:bg-gray-50">
            Upload Logo
          </Button>
          
          <div className="flex flex-col items-start leading-none ml-2">
              <span className="text-red-600 font-extrabold text-2xl tracking-tighter">SURYA</span>
              <span className="text-[#1864ab] font-bold text-[9px] tracking-wide mt-0.5" style={{ color: primaryColor }}>ELECTRONICS</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 ml-auto">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1.5">Primary Brand Color</label>
              <div className="relative flex items-center gap-2 border border-gray-300 bg-white rounded-md px-3 py-1.5 cursor-pointer hover:bg-gray-100">
                <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: primaryColor }}></div>
                <span className="text-sm text-gray-700 mx-1">Color</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1.5">Secondary Brand Color</label>
              <div className="relative flex items-center gap-2 border border-gray-300 bg-white rounded-md px-3 py-1.5 cursor-pointer hover:bg-gray-100">
                <input 
                    type="color" 
                    value={secondaryColor} 
                    onChange={(e) => setSecondaryColor(e.target.value)} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: secondaryColor }}></div>
                <span className="text-sm text-gray-700 mx-1">Color</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 transition-colors">
        <h3 className="text-sm font-bold text-gray-800 mb-5">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1.5">Email Address</label>
            <ValidatedInput value={email} readOnly={true} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1.5">Website URL</label>
            <ValidatedInput value={companyUrl} readOnly={true} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1.5">Username</label>
            <ValidatedInput value={isUser ? userName : companyName} readOnly={true} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1.5">Contact Person</label>
            <Input 
              value={companyName || userName} 
              readOnly={true}
              className="border-gray-300 text-gray-900 cursor-default bg-gray-50 text-gray-700"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1.5">Phone Number</label>
            <ValidatedInput value={phone} readOnly={false} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1.5">Country</label>
            <div className="relative">
              <select 
                value={country} 
                onChange={(e) => setCountry(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none appearance-none"
              >
                <option>India</option>
                <option>USA</option>
                <option>UK</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button 
            onClick={handleUpdate} 
            disabled={saving} 
            style={{ backgroundColor: primaryColor }}
            className="text-white font-semibold hover:bg-opacity-90"
          >
            {saving ? "Updating..." : "Update Account"}
          </Button>
          <Button variant="outline" onClick={() => setPhone("")} className="border-gray-300 text-gray-700 font-semibold bg-white hover:bg-gray-50">
            Cancel
          </Button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 transition-colors">
        <h3 className="text-sm font-bold text-gray-800 mb-5">Security</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1.5">Current Password</label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="border-gray-300 pr-10 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            <div className="mt-3">
              <div className="flex gap-1.5">
                <div className={`h-1.5 flex-1 rounded-full ${score > 0 ? (score === 1 ? 'bg-red-500' : (score === 2 ? 'bg-orange-500' : 'bg-green-500')) : 'bg-gray-200'}`}></div>
                <div className={`h-1.5 flex-1 rounded-full ${score > 1 ? (score === 2 ? 'bg-orange-500' : 'bg-green-500') : 'bg-gray-200'}`}></div>
                <div className={`h-1.5 flex-1 rounded-full ${score > 2 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                <div className={`h-1.5 flex-1 rounded-full ${score > 3 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
              </div>
              <div className={`text-[10px] font-bold mt-1.5 ${score === 1 ? 'text-red-500' : (score === 2 ? 'text-orange-500' : (score === 3 ? 'text-green-600' : (score === 4 ? 'text-green-700' : 'text-gray-500')))}`}>
                {text || "Strength"}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1.5">Confirm New Password</label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Confirm New Password"
                className="border-gray-300 pr-10 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-start gap-3 mt-6">
          <Button 
            onClick={handlePasswordUpdate} 
            disabled={savingPass} 
            style={{ backgroundColor: primaryColor }}
            className="text-white font-semibold px-6 hover:bg-opacity-90"
          >
            {savingPass ? "Updating..." : "Update Password"}
          </Button>
          <Button variant="outline" onClick={() => { setNewPassword(""); setConfirmPass(""); }} className="border-gray-300 text-gray-700 font-semibold px-6 bg-white hover:bg-gray-50">
            Cancel
          </Button>
        </div>
      </div>

    </motion.div>
  );
}


function AddUserModal({ onClose, onSuccess, companyName }) {
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await API.post("/settings/add-user", { email, password, userName });
      toast.success("User added successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl z-10"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add New User</h2>
            <p className="text-xs text-gray-500 mt-0.5">{companyName}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="User name" className="pl-10 h-11 border-gray-300 bg-white text-gray-900" />
          </div>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="User email" className="pl-10 h-11 border-gray-300 bg-white text-gray-900" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="pl-10 pr-10 h-11 border-gray-300 bg-white text-gray-900" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button onClick={handleAdd} disabled={loading} className="flex-1 gap-2 bg-[#1864ab] hover:bg-blue-800 text-white">
            {loading ? "Adding..." : <><UserPlus className="h-4 w-4" /> Add User</>}
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1 border-gray-300 text-gray-700 bg-white hover:bg-gray-50">Cancel</Button>
        </div>
      </motion.div>
    </div>
  );
}

function ManageUsersTab({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [removing, setRemoving] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/settings/users");
      setUsers(res.data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRemove = async (userId) => {
    setRemoving(userId);
    try {
      await API.delete(`/settings/users/${userId}`);
      toast.success("User removed");
      setUsers((prev) => prev.filter((u) => u.userId !== userId));
    } catch {
      toast.error("Failed to remove user");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h3 className="font-bold text-gray-900">Team Members</h3>
          <p className="text-xs text-gray-500 mt-0.5">{users.length} users in your company</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm" className="gap-2 bg-[#1864ab] hover:bg-blue-800 text-white">
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden transition-colors">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-100/50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
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
        ) : users.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Users className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No users yet — add your first team member</p>
          </div>
        ) : (
          <AnimatePresence>
            {users.map((u, i) => (
              <motion.div
                key={u.userId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-gray-200 last:border-0 hover:bg-gray-100 transition-colors items-center"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center text-xs font-bold text-[#1864ab] shrink-0">
                    {u.email.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-900 truncate">{u.email}</span>
                </div>
                <div className="col-span-3 text-sm text-gray-600">{u.userName || "-"}</div>
                <div className="col-span-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.userType === "store_admin" ? "bg-blue-100 text-blue-700" : "bg-white border border-gray-200 text-gray-600"}`}>
                    {u.userType === "store_admin" ? "Store Admin" : "User"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {u.status}
                  </span>
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(u.userId)}
                    disabled={removing === u.userId || u.userId === user?.userId}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 bg-white border border-gray-200"
                  >
                    {removing === u.userId ? <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {showModal && <AddUserModal onClose={() => setShowModal(false)} onSuccess={fetchUsers} companyName={user?.companyName} />}
      </AnimatePresence>
    </motion.div>
  );
}

function UsersLogTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await API.get("/settings/users-log");
        setLogs(res.data);
      } catch {
        toast.error("Failed to load logs");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-2 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden transition-colors">
      <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-100/50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
        <div className="col-span-4">Email</div>
        <div className="col-span-2">Role</div>
        <div className="col-span-2">Company</div>
        <div className="col-span-4">Date</div>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-[#1864ab] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <FileText className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No activity logs yet</p>
        </div>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-gray-200 last:border-0 text-sm hover:bg-gray-100 transition-colors">
            <div className="col-span-4 text-gray-900 font-medium truncate">{log.email}</div>
            <div className="col-span-2 text-gray-600 capitalize">{log.userType}</div>
            <div className="col-span-2 text-gray-600 truncate">{log.companyId}</div>
            <div className="col-span-4 text-gray-500">{new Date(log.loginAt).toLocaleString()}</div>
          </div>
        ))
      )}
    </motion.div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("account");
  const { user } = useAuth();
  
  const [primaryColor, setPrimaryColor] = useState("#1864ab");
  const [secondaryColor, setSecondaryColor] = useState("#228be6"); 

  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === "users" || tab.id === "log") {
      return user?.userType === "store_admin" || user?.userType === "super_admin";
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b101e] p-6 md:p-10 font-sans transition-colors duration-200">
      
      {/* Changed max-w-5xl mx-auto to w-full to align to the left sidebar */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full">
        
        {/* Header */}
        <div className="flex items-center gap-5 mb-8 pt-2">
          <Avatar companyName="Settings" primaryColor={primaryColor} />
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 dark:text-white leading-tight">
              Settings
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Administrator
            </p>
          </div>
        </div>

        {/* Tabs Row */}
        <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-800">
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 pb-3 text-sm font-bold transition-colors border-b-2 -mb-[1.5px] ${
                activeTab === id
                  ? "text-[#1864ab] border-[#1864ab]" 
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              style={activeTab === id ? { color: primaryColor, borderColor: primaryColor } : {}}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content Rendering */}
        <div className="pt-2">
          <AnimatePresence mode="wait">
            {activeTab === "account" && <MyAccountTab 
                                          key="account" 
                                          user={user}
                                          primaryColor={primaryColor}
                                          setPrimaryColor={setPrimaryColor}
                                          secondaryColor={secondaryColor}
                                          setSecondaryColor={setSecondaryColor}
                                        />}
            {activeTab === "users" && <ManageUsersTab key="users" user={user} />}
            {activeTab === "log" && <UsersLogTab key="log" />}
          </AnimatePresence>
        </div>

      </motion.div>
    </div>
  );
}
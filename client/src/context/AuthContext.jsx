import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// Decode JWT token to extract user info without extra API call
function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    // Decode token to get userType + companyId — no localStorage needed
    const decoded = decodeToken(token);
    if (!decoded) return null;

    return {
      token,
      user_id:   decoded.user_id,
      user_type: decoded.user_type,
      cmpid:     decoded.cmpid,
    };
  });

  const [activeStoreId,  setActiveStoreId]  = useState(
    () => localStorage.getItem('activeStoreId') || null
  );
  const [activeShopName, setActiveShopName] = useState(
    () => localStorage.getItem('activeShopName') || null
  );

  const login = (data) => {
    // Only token in localStorage — everything else from JWT decode
    localStorage.setItem('token', data.token);

    const decoded = decodeToken(data.token);

    setUser({
      token:     data.token,
      user_id:   decoded?.user_id,
      user_type: decoded?.user_type,
      cmpid:     decoded?.cmpid,
    });
  };

  const logout = async () => {
    try {
      const { logoutUser } = await import('../services/authService');
      await logoutUser();
    } catch {}
    const rememberedLogin = localStorage.getItem('ept_remember_login');
    localStorage.clear();
    if (rememberedLogin) {
      localStorage.setItem('ept_remember_login', rememberedLogin);
    }
    setUser(null);
    setActiveStoreId(null);
    setActiveShopName(null);
  };

  const switchStore = (companyId, companyName) => {
    setActiveStoreId(companyId);
    setActiveShopName(companyName);
    localStorage.setItem('activeStoreId',  companyId);
    localStorage.setItem('activeShopName', companyName);
  };

  // Super admin → switched store, Store admin → own cmpid
  const currentStoreId = user?.user_type === 'super_admin' ? activeStoreId : user?.cmpid;

  // Role helpers
  const isSuperAdmin = user?.user_type === 'super_admin';
  const isStoreAdmin = user?.user_type === 'store_admin';
  const canEdit      = isSuperAdmin;

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      switchStore,
      activeStoreId,
      activeShopName,
      currentStoreId,
      isSuperAdmin,
      isStoreAdmin,
      canEdit,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
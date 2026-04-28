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
      userId:    decoded.userId,
      userType:  decoded.userType,
      companyId: decoded.companyId,
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
      userId:    decoded?.userId,
      userType:  decoded?.userType,
      companyId: decoded?.companyId,
    });
  };

  const logout = () => {
    localStorage.clear();
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

  // Super admin → switched store, Store admin → own companyId
  const currentStoreId = user?.userType === 'super_admin' ? activeStoreId : user?.companyId;

  // Role helpers
  const isSuperAdmin = user?.userType === 'super_admin';
  const isStoreAdmin = user?.userType === 'store_admin';
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
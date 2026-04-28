import { createContext, useEffect, useState, useContext } from 'react';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, initializeUser);
    return () => unsubscribe();
  }, []);

  async function initializeUser(user) {
    if (user) {
      setCurrentUser(user);
      setUserLoggedIn(true);
    } else {
      setCurrentUser(null);
      setUserLoggedIn(false);
    }
    setLoading(false);
  }

  async function signOutAndWait() {
    try {
      await auth.signOut();
    } catch (e) {
      // ignore error
    }
    // wait for onAuthStateChanged to report null or timeout
    return new Promise((resolve) => {
      let done = false;
      const unsub = onAuthStateChanged(auth, (u) => {
        if (!u && !done) {
          done = true;
          unsub();
          resolve();
        }
      });
      setTimeout(() => {
        if (!done) {
          done = true;
          try { unsub(); } catch {}
          resolve();
        }
      }, 3000);
    });
  }
  const value = {
    currentUser,
    userLoggedIn,
    loading,
    initializeUser,
  signOut: signOutAndWait,
  };
  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

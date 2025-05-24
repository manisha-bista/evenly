// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../firebase/config'; 
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null); 
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    console.log("AuthContext: Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("AuthContext: onAuthStateChanged Fired. User UID:", user ? user.uid : null, "Email Verified:", user ? user.emailVerified : "N/A");
      
      // Important: Create a new user object reference if only sub-properties change
      // This helps ensure React detects a change if only, e.g., emailVerified flips.
      const newUser = user ? { ...user, emailVerified: user.emailVerified } : null;
      setCurrentUser(newUser);

      if (newUser) {
        try {
          const userDocRef = doc(db, "users", newUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserData({ uid: newUser.uid, ...userDocSnap.data() });
          } else {
            setUserData({ uid: newUser.uid, email: newUser.email, username: newUser.displayName, firstName: newUser.displayName?.split(' ')[0] || '' });
          }
        } catch (error) { console.error("AuthContext: Error fetching Firestore user data:", error); setUserData(null); }
      } else {
        setUserData(null);
      }
      setAuthLoading(false);
    });
    return () => { console.log("AuthContext: Cleaning up listener."); unsubscribe(); };
  }, []);

  const logout = () => { /* ... (keep existing logout) ... */ 
    // setAuthLoading(true); // Not strictly needed here as onAuthStateChanged will set it
    return firebaseSignOut(auth).then(() => { console.log("AuthContext: User signed out."); }).catch((e) => { throw e; });
  };

  const refreshAuthUser = async () => {
    if (auth.currentUser) {
        console.log("AuthContext: Manually reloading auth.currentUser state...");
        setAuthLoading(true); // Indicate loading
        try {
            await auth.currentUser.reload();
            const reloadedUser = auth.currentUser;
            console.log("AuthContext: auth.currentUser.reload() complete. New emailVerified:", reloadedUser?.emailVerified);
            
            // Force update context's currentUser and userData
            // Create a new object reference for currentUser to ensure React detects the change
            const newUserState = reloadedUser ? { ...reloadedUser, emailVerified: reloadedUser.emailVerified } : null;
            setCurrentUser(newUserState); 

            if (newUserState) {
                const userDocRef = doc(db, "users", newUserState.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setUserData({ uid: newUserState.uid, ...userDocSnap.data() });
                } else {
                     setUserData({ uid: newUserState.uid, email: newUserState.email, username: newUserState.displayName });
                }
            } else {
                setUserData(null);
            }

        } catch (error) {
            console.error("AuthContext: Error during manual user reload:", error);
        } finally {
            setAuthLoading(false); // Ensure loading is set to false after attempting reload
        }
    } else {
        console.log("AuthContext: No currentUser to refresh.");
        setAuthLoading(false); // If no user, auth is effectively resolved for this attempt
    }
  };

  const value = { currentUser, userData, authLoading, logout, refreshAuthUser };
  return (<AuthContext.Provider value={value}>{!authLoading && children}</AuthContext.Provider>);
  // Conditionally rendering children might be too aggressive if other parts of app need to show loading.
  // Let's render children always and App.js handles its own top-level loading screen based on authLoading.
  // return (<AuthContext.Provider value={value}>{children}</AuthContext.Provider>);
}
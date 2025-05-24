// src/services/authService.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile as updateFirebaseAuthProfile,
  sendEmailVerification, // <<< NEW IMPORT
  signOut as firebaseSignOut,
  EmailAuthProvider,      
  reauthenticateWithCredential, 
  updatePassword,               
  deleteUser as deleteFirebaseUser,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc as deleteFirestoreDoc 
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';

console.log("authService.js: (Email Verification on Signup) Module Loaded.");

export const signup = async (email, password, firstName, lastName, username) => {
  console.log("authService: Signup for", { email, username });
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  try {
    // Update Firebase Auth profile (displayName)
    await updateFirebaseAuthProfile(user, { displayName: username, photoURL: '' });
    console.log("authService: Firebase Auth profile updated.");

    // Create user document in Firestore
    const userDocData = { 
      uid: user.uid, firstName, lastName, username, 
      email: user.email, profilePicUrl: '', createdAt: new Date() 
    };
    await setDoc(doc(db, "users", user.uid), userDocData);
    console.log("authService: User document created in Firestore for", user.uid);

    // Send email verification
    await sendEmailVerification(user); // <<< SEND VERIFICATION EMAIL
    console.log("authService: Email verification sent to", user.email);

  } catch (error) {
    // If any of these post-auth-creation steps fail, it's problematic.
    // The user is created in Auth but profile/DB doc/verification email might have failed.
    // For a robust system, you might want to log this for admin review or attempt cleanup.
    console.error("authService: Error in post-signup operations (profile update, Firestore doc, or email verification):", error);
    // Re-throw the error if critical, or handle as appropriate.
    // If we don't re-throw, the UI might think signup fully succeeded.
    // Let's re-throw so the UI knows something went wrong after user creation.
    throw new Error(`User created, but post-signup setup failed: ${error.message}`);
  }
  
  return user; // Return the Firebase Auth user object
};

// ... (login, checkUsernameAvailability, reauthenticateUser, changeUserPassword, sendPasswordReset, deleteCurrentUserAccount functions remain the same)
export const login = async (email, password) => { const uc = await signInWithEmailAndPassword(auth,email,password); return uc.user; };
export const checkUsernameAvailability = async (username) => { if(!username||username.trim()==="")return true; const q=query(collection(db,"users"),where("username","==",username.trim())); const qs=await getDocs(q); return qs.empty; };
export const reauthenticateUser = async (currentPassword) => { const u=auth.currentUser; if(!u||!u.email)throw new Error("User not available/no email."); const cred=EmailAuthProvider.credential(u.email,currentPassword); await reauthenticateWithCredential(u,cred); };
export const changeUserPassword = async (newPassword) => { const u=auth.currentUser; if(!u)throw new Error("No user."); await updatePassword(u,newPassword); };
export const sendPasswordReset = async (email) => { await firebaseSendPasswordResetEmail(auth, email); };
export const deleteCurrentUserAccount = async () => { const u=auth.currentUser; if(!u)throw new Error("No user."); const ur=doc(db,"users",u.uid); await deleteFirestoreDoc(ur); await deleteFirebaseUser(u); };
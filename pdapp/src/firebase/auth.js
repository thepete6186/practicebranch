import { auth } from './firebase';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  updatePassword,
} from 'firebase/auth';

export  const doSignInWithEmailAndPassword = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password); 
};

export const doCreateUserWithEmailAndPassword = async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
};

export const doSignInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

// Backward-compatible alias while existing imports migrate.
export const doSigninwithGoogle = doSignInWithGoogle;

export const doSignout = async () => {
    return auth.signOut();
};

export const doSendEmailVerification = async () => {
    return sendEmailVerification(auth.currentUser, {url: `${window.location.origin}/home`});    
};

export const doPasswordReset = async (email) => {
    return sendPasswordResetEmail(auth, email);
}; 

export const doPasswordChange = async (password) => {
    return updatePassword(auth.currentUser, password);
};


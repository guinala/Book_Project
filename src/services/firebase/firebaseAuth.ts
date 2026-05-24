import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  fetchSignInMethodsForEmail,
  getAdditionalUserInfo,
} from "firebase/auth";
import type { User, UserCredential } from "firebase/auth";
import { OAuthProvider } from "firebase/auth";
import { auth } from "./firebaseInit";

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

export async function loginWithEmail(
  email: string,
  password: string,
  remember = false
): Promise<UserCredential> {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(auth, googleProvider);
}

export async function signInWithApple(): Promise<UserCredential> {
  return signInWithPopup(auth, appleProvider);
}

export async function logoutUser(): Promise<void> {
  return signOut(auth);
}

export async function sendVerificationEmail(user: User): Promise<void> {
  return sendEmailVerification(user);
}

export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

// fetchSignInMethodsForEmail está deprecada pero funciona. Requiere que
// "Email Enumeration Protection" esté desactivada en Firebase Console.
export async function isEmailInUse(email: string): Promise<boolean> {
  const methods = await fetchSignInMethodsForEmail(auth, email);
  return methods.length > 0;
}

export function getIsNewUser(credential: UserCredential): boolean {
  return getAdditionalUserInfo(credential)?.isNewUser ?? false;
}

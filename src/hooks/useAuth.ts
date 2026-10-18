import { useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth } from '../services/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, []);
  return {
    user,
    available: Boolean(auth),
    signIn: async () => {
      if (!auth) return;
      await signInWithPopup(auth, new GoogleAuthProvider());
    },
    signOut: async () => {
      if (auth) await signOut(auth);
    },
  };
}

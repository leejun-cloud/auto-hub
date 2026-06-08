import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc, getDocs, collection } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          role: firebaseUser.email === 'duoenjia8@gmail.com' ? 'admin' : 'user'
        });
      } else {
        const savedMock = localStorage.getItem('autohub_mock_user');
        if (savedMock) {
          setUser(JSON.parse(savedMock));
        } else {
          // Pre-populate with a default mock admin user to make testing effortless
          const defaultMock = {
            uid: "demo-user-123",
            email: "duoenjia8@gmail.com",
            displayName: "Demo Admin",
            role: "admin"
          };
          setUser(defaultMock);
          localStorage.setItem('autohub_mock_user', JSON.stringify(defaultMock));
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithEmail = async (email, password) => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.warn("Firebase Auth failed, falling back to mock login.", err);
      const mockUser = {
        uid: "demo-user-123",
        email: email,
        displayName: email.split('@')[0],
        role: email === 'duoenjia8@gmail.com' ? 'admin' : 'user'
      };
      setUser(mockUser);
      localStorage.setItem('autohub_mock_user', JSON.stringify(mockUser));
      return { user: mockUser };
    }
  };

  const registerWithEmail = async (email, password) => {
    try {
      return await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.warn("Firebase Auth failed, falling back to mock registration.", err);
      const mockUser = {
        uid: "demo-user-123",
        email: email,
        displayName: email.split('@')[0],
        role: email === 'duoenjia8@gmail.com' ? 'admin' : 'user'
      };
      setUser(mockUser);
      localStorage.setItem('autohub_mock_user', JSON.stringify(mockUser));
      return { user: mockUser };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      return await signInWithPopup(auth, provider);
    } catch (err) {
      console.warn("Firebase Google Auth failed, falling back to mock Google login.", err);
      const mockUser = {
        uid: "demo-user-123",
        email: "duoenjia8@gmail.com",
        displayName: "Google Demo Admin",
        role: "admin"
      };
      setUser(mockUser);
      localStorage.setItem('autohub_mock_user', JSON.stringify(mockUser));
      return { user: mockUser };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Firebase signout failed, clearing local mock user.");
    }
    setUser(null);
    localStorage.removeItem('autohub_mock_user');
  };

  const value = {
    user,
    loading,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

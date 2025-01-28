import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';

function App() {
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/chat" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/chat" />} />
        <Route path="/chat" element={user ? <Chat /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={user ? "/chat" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
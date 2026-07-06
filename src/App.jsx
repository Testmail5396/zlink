import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppProvider } from "./contexts/AppContext";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Designers } from "./pages/Designers";
import { AllLinks } from "./pages/AllLinks";
import { SharedLinks } from "./pages/SharedLinks";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";

/* Redirect unauthenticated users to /login */
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

/* Redirect authenticated users away from login/signup */
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

          {/* Protected app — AppProvider only mounts when authenticated */}
          <Route path="/*" element={
            <ProtectedRoute>
              <AppProvider>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/designers/*" element={<Designers />} />
                    <Route path="/links" element={<AllLinks />} />
                    <Route path="/shared" element={<SharedLinks />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Layout>
              </AppProvider>
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

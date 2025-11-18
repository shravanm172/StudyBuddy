import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import ProtectedRoute from "./auth/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import Landing from "./pages/Landing";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Default: show AuthPage. If already logged in, AuthPage redirects to /landing */}
        <Route path="/" element={<AuthPage />} />

        {/* Protected landing */}
        <Route
          path="/landing"
          element={
            <ProtectedRoute>
              <Landing />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<AuthPage />} />
      </Routes>
    </AuthProvider>
  );
}

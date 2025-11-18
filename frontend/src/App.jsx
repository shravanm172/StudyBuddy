// src/App.jsx
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import ProtectedRoute from "./auth/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import Landing from "./pages/Landing";
import ProfilePage from "./pages/ProfilePage";
import PeopleFeed from "./pages/PeopleFeed";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<AuthPage />} />

        <Route
          path="/landing"
          element={
            <ProtectedRoute>
              <Landing />
            </ProtectedRoute>
          }
        />

        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/people"
          element={
            <ProtectedRoute>
              <PeopleFeed />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<AuthPage />} />
      </Routes>
    </AuthProvider>
  );
}

// src/App.jsx
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import ProtectedRoute from "./auth/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import Landing from "./pages/Landing";
import ProfilePage from "./pages/ProfilePage";
import PeopleFeed from "./pages/PeopleFeed";
import RequestsPage from "./pages/RequestsPage";
import MyGroupsPage from "./pages/MyGroupsPage";
import GroupViewPage from "./pages/GroupViewPage";

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

        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <RequestsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <MyGroupsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/groups/:groupId"
          element={
            <ProtectedRoute>
              <GroupViewPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<AuthPage />} />
      </Routes>
    </AuthProvider>
  );
}

import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import ProtectedRoute from "./auth/ProtectedRoute";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import PeopleFeed from "./pages/PeopleFeed";
import RequestsPage from "./pages/RequestsPage";
import MyGroupsPage from "./pages/MyGroupsPage";
import GroupViewPage from "./pages/GroupViewPage";
import GroupFeedPage from "./pages/GroupFeedPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes - no layout */}
        <Route path="/" element={<AuthPage />} />

        {/* Protected routes - with layout */}
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MyGroupsPage />} />
          <Route path=":groupId" element={<GroupViewPage />} />
        </Route>

        <Route
          path="/group-feed"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<GroupFeedPage />} />
        </Route>

        <Route
          path="/people"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PeopleFeed />} />
        </Route>

        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RequestsPage />} />
        </Route>

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ProfilePage />} />
        </Route>

        <Route path="/landing" element={<Navigate to="/groups" replace />} />
        <Route path="/account" element={<Navigate to="/profile" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

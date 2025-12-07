// Base layout template with top bar header and sidebar menu
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import "./Layout.css";

export default function Layout() {
  return (
    <div className="app-layout">
      <TopBar />
      <div className="main-content">
        <Sidebar />
        <main className="page-content">
          <div className="page-content-wrapper">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

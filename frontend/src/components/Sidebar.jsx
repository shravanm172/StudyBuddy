import { NavLink } from "react-router-dom";
import { HiHome, HiSearch, HiUsers, HiInbox, HiCog } from "react-icons/hi";
import "./Sidebar.css";

export default function Sidebar() {
  const menuItems = [
    { path: "/groups", icon: HiHome, label: "My Groups" },
    { path: "/group-feed", icon: HiSearch, label: "Find Groups" },
    { path: "/people", icon: HiUsers, label: "Find Partners" },
    { path: "/requests", icon: HiInbox, label: "My Requests" },
    { path: "/profile", icon: HiCog, label: "Profile" },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">
                <Icon />
              </span>
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

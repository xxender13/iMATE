import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import AdminCoursesView from "../components/AdminCoursesView";
import AdminStudentManagerView from "../components/AdminStudentManagerView";
import sluLogo from "../assets/slu.png";
import {
  FiUser,
  FiBookOpen,
  FiLogOut,
  FiMenu,
  FiChevronRight,
} from "react-icons/fi";
import "../styles/AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("courses");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef(null);

  // Detect mobile and open/close sidebar
  useEffect(() => {
    const checkMobile = () => {
      const m = window.innerWidth < 768;
      setIsMobile(m);
      setSidebarOpen(!m);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/login");
    });
    return unsub;
  }, [navigate]);

  // Close sidebar on outside click (mobile)
  useEffect(() => {
    if (!isMobile) return;
    const onClick = (e) => {
      if (
        sidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target)
      ) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isMobile, sidebarOpen]);

  const toggleSidebar = () => {
    setSidebarOpen((o) => !o);
  };

  const handleNavItemClick = (view) => {
    setActiveView(view);
    if (isMobile) setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="admin-dashboard">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src={sluLogo} alt="SLU Logo" />
            <h2>
              iMATE<span>Admin</span>
            </h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul>
            <li className={activeView === "courses" ? "active" : ""}>
              <button onClick={() => handleNavItemClick("courses")}>
                <FiBookOpen />
                <span>Courses</span>
                <FiChevronRight className="nav-arrow" />
              </button>
            </li>
            <li className={activeView === "students" ? "active" : ""}>
              <button onClick={() => handleNavItemClick("students")}>
                <FiUser />
                <span>Students</span>
                <FiChevronRight className="nav-arrow" />
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`admin-main ${sidebarOpen ? "" : "expanded"}`}>
        <header className="admin-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <FiMenu />
            </button>
            <h1>
              {activeView === "courses" && "Course Management"}
              {activeView === "students" && "Student Management"}
            </h1>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="username">Admin User</span>
              <button
                className="logout-button-sm"
                onClick={handleLogout}
                aria-label="Logout"
              >
                <FiLogOut />
              </button>
            </div>
          </div>
        </header>

        <div className="admin-content">
          {activeView === "courses" && <AdminCoursesView />}
          {activeView === "students" && <AdminStudentManagerView />}
        </div>
      </main>
    </div>
  );
}

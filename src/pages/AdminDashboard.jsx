import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  deleteField,
} from "firebase/firestore";
import AdminCoursesView from "../components/AdminCoursesView";
import AdminStudentManagerView from "../components/AdminStudentManagerView";
import sluLogo from "../assets/slu.png";
import {
  FiUser,
  FiBookOpen,
  FiLogOut,
  FiMenu,
  FiChevronRight,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";
import "../styles/AdminDashboard.css";

/* ------------------------------------------------------------------
   ResetsPanel (focused, one-student-at-a-time UI)
-------------------------------------------------------------------*/
function ResetsPanel() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedUid, setSelectedUid] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [busyKey, setBusyKey] = useState("");

  // stream students & courses
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const onlyStudents = arr.filter(
        (u) => (u.role ?? "student").toLowerCase() === "student"
      );
      setStudents(onlyStudents);
      // keep selected student object fresh
      const found = onlyStudents.find((u) => u.id === selectedUid);
      setSelectedStudent(found || null);
    });
    const unsubCourses = onSnapshot(collection(db, "courses"), (snap) => {
      setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubUsers();
      unsubCourses();
    };
  }, [selectedUid]);

  const enrolledIds = (() => {
    const ec = selectedStudent?.enrolledCourses;
    if (!ec) return [];
    return Array.isArray(ec) ? ec : Object.keys(ec);
  })();

  const enrolledCourses = courses.filter((c) => enrolledIds.includes(c.id));
  const completedQuizzes = selectedStudent?.completedQuizzes || {};

  // --- actions ---
  const resetAllForStudent = async () => {
    if (!selectedUid) return;
    if (!window.confirm("Reset ALL progress for this student?")) return;
    const key = `all:${selectedUid}`;
    setBusyKey(key);
    try {
      await updateDoc(doc(db, "users", selectedUid), {
        completedQuizzes: deleteField(),
      });
      alert("All progress reset.");
    } catch (e) {
      console.error(e);
      alert("Failed to reset all progress.");
    } finally {
      setBusyKey("");
    }
  };

  const resetCourseForStudent = async (courseId) => {
    if (!selectedUid || !courseId) return;
    if (!window.confirm("Reset this course progress for the student?")) return;
    const key = `course:${selectedUid}:${courseId}`;
    setBusyKey(key);
    try {
      await updateDoc(doc(db, "users", selectedUid), {
        [`completedQuizzes.${courseId}`]: deleteField(),
      });
      alert("Course progress reset.");
    } catch (e) {
      console.error(e);
      alert("Failed to reset course.");
    } finally {
      setBusyKey("");
    }
  };

  const resetChapterForStudent = async (courseId, chapterIndex) => {
    if (!selectedUid || !courseId || chapterIndex < 0) return;
    if (!window.confirm(`Reset Chapter ${chapterIndex + 1}?`)) return;
    const key = `chapter:${selectedUid}:${courseId}:${chapterIndex}`;
    setBusyKey(key);
    try {
      await updateDoc(doc(db, "users", selectedUid), {
        [`completedQuizzes.${courseId}.chapter${chapterIndex}`]: deleteField(),
      });
      alert(`Chapter ${chapterIndex + 1} reset.`);
    } catch (e) {
      console.error(e);
      alert("Failed to reset chapter.");
    } finally {
      setBusyKey("");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Student picker */}
      <div className="flex flex-col md:flex-row md:items-center md:gap-3">
        <label className="text-sm text-gray-700 mb-1 md:mb-0 md:min-w-[130px]">
          Select student
        </label>
        <select
          className="border rounded px-3 py-2 w-full md:max-w-md"
          value={selectedUid}
          onChange={(e) => setSelectedUid(e.target.value)}
        >
          <option value="">— Choose a student —</option>
          {students.map((s) => {
            const name =
              s.firstName && s.lastName
                ? `${s.firstName} ${s.lastName}`
                : s.email || s.id;
            return (
              <option key={s.id} value={s.id}>
                {name}
              </option>
            );
          })}
        </select>
      </div>

      {!selectedStudent ? (
        <div className="text-gray-500 text-sm mt-6">
          Pick a student to view and reset progress.
        </div>
      ) : (
        <div className="mt-6">
          {/* Student header + Reset ALL */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-900">
                {selectedStudent.firstName && selectedStudent.lastName
                  ? `${selectedStudent.firstName} ${selectedStudent.lastName}`
                  : selectedStudent.email || selectedStudent.id}
              </div>
              {selectedStudent.email && (
                <div className="text-xs text-gray-500">
                  {selectedStudent.email}
                </div>
              )}
              <div className="text-xs text-gray-400">
                UID: {selectedStudent.id}
              </div>
            </div>
            <button
              disabled={busyKey === `all:${selectedUid}`}
              onClick={resetAllForStudent}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded text-white ${
                busyKey === `all:${selectedUid}`
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
              title="Reset ALL progress for this student"
            >
              <FiTrash2 /> Reset ALL
            </button>
          </div>

          {/* Enrolled courses */}
          <div className="mt-4 space-y-4">
            {enrolledCourses.length === 0 ? (
              <div className="text-gray-500">No enrolled courses.</div>
            ) : (
              enrolledCourses.map((course) => {
                const ch = course?.chapters || [];
                const courseProg = completedQuizzes[course.id] || {};
                const completedIdxs = Object.keys(courseProg)
                  .map((k) => Number(k.replace("chapter", "")))
                  .filter((i) => Number.isInteger(i) && ch[i]);

                return (
                  <div key={course.id} className="border rounded p-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {course.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {completedIdxs.length} / {ch.length} chapters completed
                        </div>
                      </div>
                      {/* Reset Course (second top-level reset button for the student, per course) */}
                      <button
                        disabled={busyKey === `course:${selectedUid}:${course.id}`}
                        onClick={() => resetCourseForStudent(course.id)}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded text-white ${
                          busyKey === `course:${selectedUid}:${course.id}`
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700"
                        }`}
                        title="Reset this entire course for the student"
                      >
                        <FiTrash2 /> Reset Course
                      </button>
                    </div>

                    {/* Per-chapter reset */}
                    {ch.length > 0 && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {ch.map((chapter, idx) => {
                          const completed = completedIdxs.includes(idx);
                          const k = `chapter:${selectedUid}:${course.id}:${idx}`;
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-white border rounded px-3 py-2"
                            >
                              <span className="text-sm text-gray-800">
                                {idx + 1}. {chapter?.title || "Untitled"}
                              </span>
                              <button
                                onClick={() =>
                                  resetChapterForStudent(course.id, idx)
                                }
                                disabled={busyKey === k || !completed}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded ${
                                  completed
                                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                }`}
                                title={
                                  completed
                                    ? "Reset this chapter"
                                    : "Not completed yet"
                                }
                              >
                                <FiRefreshCw /> Reset Chapter
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Admin Dashboard
-------------------------------------------------------------------*/
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

  const toggleSidebar = () => setSidebarOpen((o) => !o);
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
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
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

            {/* Resets tab */}
            <li className={activeView === "resets" ? "active" : ""}>
              <button onClick={() => handleNavItemClick("resets")}>
                <FiRefreshCw />
                <span>Resets</span>
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
              {activeView === "resets" && "Reset Progress"}
            </h1>
          </div>

          {/* Quick go-to Resets */}
          <div className="header-right">
            <button
              className={`btn-reset-quick ${
                activeView === "resets" ? "active" : ""
              }`}
              onClick={() => handleNavItemClick("resets")}
              title="Go to Reset Progress"
            >
              <FiRefreshCw />
              <span className="ml-2 hidden sm:inline">Resets</span>
            </button>

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
          {activeView === "resets" && <ResetsPanel />}
        </div>
      </main>
    </div>
  );
}

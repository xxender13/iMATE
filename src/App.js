// src/App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Pages
import Home from "./pages/Home";
import About from "./pages/About";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ModuleDetail from "./pages/ModuleDetail";

// Inner routes component to dynamically show navbar/footer
const AppRoutes = ({ user, role }) => {
  const location = useLocation();
  const hideNavbarPaths = ["/student-dashboard", "/admin-dashboard"];
  const showNavbar = !hideNavbarPaths.includes(location.pathname);

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        {/* Redirect base path to /home */}
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/iMATE" element={<Navigate to="/home" />} />
        <Route path="/home" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route
          path="/login"
          element={
            !user ? (
              <Login />
            ) : role === "admin" ? (
              <Navigate to="/admin-dashboard" />
            ) : (
              <Navigate to="/student-dashboard" />
            )
          }
        />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/student-dashboard"
          element={
            user && role === "student" ? (
              <StudentDashboard />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            user && role === "admin" ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/modules/:id"
          element={
            user && role === "student" ? (
              <ModuleDetail />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
      {showNavbar && <Footer />}
    </>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) {
          setUser(currentUser);
          setRole(docSnap.data().role);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    const handleUnload = () => {
      signOut(auth);
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      unsub();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  if (loading)
    return <div className="text-white text-center p-10">Loading...</div>;

  return (
    <Router basename="/iMATE">
      <AppRoutes user={user} role={role} />
    </Router>
  );
}

export default App;

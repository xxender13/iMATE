// src/pages/Login.jsx
import { useState } from "react";
import { auth, db } from "../firebase/firebase";
import { HashLink } from "react-router-hash-link";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/slu.png";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState("");    // ← new
  const [lastName, setLastName] = useState("");      // ← new
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        // ─── LOGIN ──────────────────────────────────────────────────────────────
        const userCred = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const uid = userCred.user.uid;
        const userDoc = await getDoc(doc(db, "users", uid));
        const userRole = userDoc.exists() ? userDoc.data().role : null;

        if (userRole === "admin") navigate("/admin");
        else if (userRole === "student") navigate("/student");
        else alert("Your role is undefined. Contact support.");
      } else {
        // ─── SIGN UP ────────────────────────────────────────────────────────────
        // require all fields
        if (!firstName.trim() || !lastName.trim()) {
          return alert("Please enter your first and last name.");
        }

        const userCred = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const uid = userCred.user.uid;

        // store full profile
        await setDoc(doc(db, "users", uid), {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase(),
          role: "student",
        });

        navigate("/student");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b-2 border-[#003DA5]">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Saint Louis University" className="h-12" />
          </Link>
          <nav>
            <ul className="flex space-x-8">
              <li>
                <HashLink
                  smooth
                  to="/#courses"
                  className="text-[#003DA5] font-semibold hover:text-[#FFC72C] transition"
                >
                  Home
                </HashLink>
              </li>
              <li>
                <HashLink
                  smooth
                  to="/#about"
                  className="text-[#003DA5] font-semibold hover:text-[#FFC72C] transition"
                >
                  About
                </HashLink>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-[#003DA5] font-semibold hover:text-[#FFC72C] transition"
                >
                  Login
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Form */}
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#003DA5] mb-2 font-serif">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-gray-600">
              {isLogin
                ? "Access your iMATE courses and resources"
                : "Join the SLU iMATE program for relocation support"}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Only on Sign Up */}
              {!isLogin && (
                <>
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] outline-none transition"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] outline-none transition"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] outline-none transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] outline-none transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Student notice */}
              {!isLogin && (
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                  <p className="text-sm text-gray-700">
                    You will be registered as a <strong>student</strong>. Admin
                    access is assigned manually.
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="w-full bg-[#003DA5] hover:bg-[#002D7A] text-white py-3 px-4 rounded-md font-semibold transition duration-200 ease-in-out transform hover:shadow-lg"
              >
                {isLogin ? "Sign In" : "Create Account"}
              </button>

              {/* Toggle */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-[#003DA5] hover:text-[#FFC72C] text-sm font-medium transition"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    // clear fields
                    setFirstName("");
                    setLastName("");
                    setEmail("");
                    setPassword("");
                  }}
                >
                  {isLogin
                    ? "Don't have an account? Sign Up"
                    : "Already have an account? Sign In"}
                </button>
              </div>
            </form>
          </div>

          {/* Help */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Need help? Contact{" "}
              <a
                href="mailto:meiling.tung@slu.edu"
                className="text-[#003DA5] hover:text-[#FFC72C]"
              >
                meiling.tung@slu.edu
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

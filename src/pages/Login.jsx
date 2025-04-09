import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.endsWith("@slu.edu")) {
      setError("Only @slu.edu emails are allowed.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        setError("User data not found in Firestore.");
        return;
      }

      const userData = userDoc.data();

      if (userData.role === "student") {
        navigate("/student-dashboard");
      } else if (userData.role === "admin") {
        navigate("/admin-dashboard");
      } else {
        setError("No valid role assigned to this user.");
      }

    } catch (err) {
      console.error(err);
      setError("Login failed. Check your email and password.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center px-6">
      <form
        onSubmit={handleLogin}
        className="bg-gray-800 p-8 rounded-xl w-full max-w-md space-y-6 shadow-xl border border-gray-700"
      >
        <h2 className="text-3xl font-bold text-center">Login to Immigration Portal</h2>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <input
          type="email"
          placeholder="Email (@slu.edu)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded bg-gray-700 text-white placeholder-gray-400"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded bg-gray-700 text-white placeholder-gray-400"
          required
        />

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 transition w-full py-3 rounded-xl font-medium"
        >
          Log In
        </button>

        <p className="text-sm text-gray-400 text-center">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-blue-400 underline hover:text-blue-300">
            Sign up here
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;

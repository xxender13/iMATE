import { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!email.endsWith("@slu.edu")) {
      setError("Only @slu.edu emails are allowed");
      return;
    }
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "students", res.user.uid), {
        name,
        email,
        uid: res.user.uid,
        createdAt: new Date(),
      });
      navigate("/student-dashboard");
    } catch (err) {
      setError("Signup failed. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <form
        onSubmit={handleSignup}
        className="bg-gray-800 p-8 rounded-xl w-full max-w-md space-y-6"
      >
        <h2 className="text-3xl font-bold">Sign Up</h2>
        {error && <p className="text-red-500">{error}</p>}
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 rounded bg-gray-700 text-white"
          required
        />
        <input
          type="email"
          placeholder="Email (@slu.edu)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded bg-gray-700 text-white"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded bg-gray-700 text-white"
          required
        />
        <button type="submit" className="bg-blue-600 w-full py-3 rounded font-medium">
          Sign Up
        </button>
      </form>
    </div>
  );
};

export default Signup;

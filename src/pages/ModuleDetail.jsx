// src/pages/ModuleDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const ModuleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState(null);

  useEffect(() => {
    const fetchModule = async () => {
      try {
        const docRef = doc(db, "modules", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setModule(docSnap.data());
        } else {
          navigate("/student-dashboard"); // fallback
        }
      } catch (err) {
        console.error("Error fetching module:", err);
      }
    };
    fetchModule();
  }, [id, navigate]);

  if (!module) return <div className="text-white p-10">Loading module...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-10">
      <h1 className="text-3xl font-bold mb-4">{module.title}</h1>
      <p className="mb-6 text-gray-300">{module.description}</p>
      {/* Render MCQs or essay inputs here if needed */}
      <button
        className="bg-red-600 px-4 py-2 rounded"
        onClick={() => navigate("/student-dashboard")}
      >
        ← Back to Dashboard
      </button>
    </div>
  );
};

export default ModuleDetail;

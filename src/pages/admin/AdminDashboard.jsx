// src/pages/admin/AdminDashboard.jsx

import { useEffect, useState, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  serverTimestamp,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { Menu, PlusCircle, Trash2 } from "lucide-react";
import AddModuleForm from "../../components/admin/AddModuleForm";
import GradingModal from "./GradingModal";
import { Canvas, useFrame } from "@react-three/fiber";

function SpaceBackground() {
  const starfield = useRef();
  useFrame(() => {
    if (starfield.current) {
      starfield.current.rotation.x += 0.0002;
      starfield.current.rotation.y += 0.0004;
    }
  });
  return (
    <group ref={starfield}>
      {[...Array(1500)].map((_, i) => (
        <mesh
          key={i}
          position={[
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100,
          ]}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="white" />
        </mesh>
      ))}
    </group>
  );
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("Students");
  const [students, setStudents] = useState([]);
  const [modules, setModules] = useState([]);
  const [gradingStudent, setGradingStudent] = useState(null);
  const [docUploadModal, setDocUploadModal] = useState(null);
  const [adminDocuments, setAdminDocuments] = useState([]);
  const [docForm, setDocForm] = useState({ title: "", link: "" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddModulePopup, setShowAddModulePopup] = useState(false);
  const navigate = useNavigate();
  const sidebarRef = useRef();

  const menuTabs = ["Students", "Documents", "Modules"];

  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, "users"), (snapshot) => {
      const studentData = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => user.role === "student");
      setStudents(studentData);
    });

    const unsubModules = onSnapshot(collection(db, "modules"), (snapshot) => {
      const moduleData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      moduleData.sort((a, b) => {
        const getNum = (mod) => parseInt(mod.title.match(/\d+/)?.[0] || 0);
        return getNum(a) - getNum(b);
      });
      setModules(moduleData);
    });

    const unsubDocs = onSnapshot(collection(db, "adminDocuments"), (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAdminDocuments(docs);
    });

    return () => {
      unsubStudents();
      unsubModules();
      unsubDocs();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setSidebarOpen(false);
      }
    };
    if (sidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleUpload = async () => {
    if (!docUploadModal || !docForm.title || !docForm.link) return;
    const student = students.find((s) => s.id === docUploadModal);
    if (!student) return;

    const docRef = doc(collection(db, `users/${student.id}/documents`));
    await setDoc(docRef, {
      title: docForm.title,
      link: docForm.link,
      uploadedAt: serverTimestamp(),
    });

    await addDoc(collection(db, "adminDocuments"), {
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      title: docForm.title,
      link: docForm.link,
      uploadedAt: serverTimestamp(),
    });

    setDocUploadModal(null);
    setDocForm({ title: "", link: "" });
  };

  const handleDeleteModule = async (modId) => {
    await deleteDoc(doc(db, "modules", modId));
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 20] }}>
          <ambientLight intensity={1} />
          <SpaceBackground />
        </Canvas>
      </div>

      <div className="md:hidden fixed top-4 left-4 z-[999]">
        <Menu
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-8 h-8 cursor-pointer text-white"
        />
      </div>

      {sidebarOpen && (
        <div
          ref={sidebarRef}
          className="fixed top-0 left-0 h-full w-3/4 z-[998] p-6 rounded-r-3xl shadow-2xl bg-gradient-to-b from-[#1c0d33] to-[#3a2177] backdrop-blur-md bg-opacity-90"
        >
          {menuTabs.map((tab) => (
            <div
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSidebarOpen(false);
              }}
              className={`cursor-pointer py-3 px-6 mb-4 rounded-xl font-semibold text-lg shadow-md hover:bg-purple-700 transition ${
                activeTab === tab ? "bg-purple-700" : "bg-purple-600"
              }`}
            >
              {tab}
            </div>
          ))}
          <button
            onClick={handleLogout}
            className="mt-8 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-full font-bold shadow-md"
          >
            Logout
          </button>
        </div>
      )}

      <div className="relative z-10 p-6">
        <div className="hidden md:flex justify-between items-center flex-wrap mb-10">
          <div className="flex gap-6 flex-wrap">
            {menuTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-full text-lg font-semibold shadow-md transition ${
                  activeTab === tab ? "bg-purple-600" : "bg-purple-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <button className="bg-purple-500 px-6 py-3 rounded-full font-bold shadow-md">
              Hi Admin
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-full font-bold shadow-md"
            >
              Logout
            </button>
          </div>
        </div>

        {activeTab === "Students" && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-6 self-start mt-14 md:mt-0">Student Overview</h2>
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {students.map((student) => {
                const completed = student.completedModules?.length || 0;
                const total = modules.length || 1;
                const progress = Math.min((completed / total) * 100, 100);
                return (
                  <div
                    key={student.id}
                    className="bg-white text-black p-4 rounded-xl shadow-lg hover:shadow-xl relative group"
                  >
                    <p className="font-bold">Name: {student.name}</p>
                    <p>Email: {student.email}</p>
                    <p>Progress:</p>
                    <div className="bg-gray-300 rounded-full h-2 mt-1 mb-3">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-80 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-xl">
                      <button
                        className="mb-2 bg-purple-600 px-3 py-1 rounded text-sm"
                        onClick={() => setGradingStudent(student)}
                      >
                        Evaluate Modules
                      </button>
                      <button
                        className="bg-green-600 px-3 py-1 rounded text-sm"
                        onClick={() => setDocUploadModal(student.id)}
                      >
                        Upload Document
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="w-full max-w-5xl bg-white/10 text-white p-8 rounded-3xl shadow-md mt-6">
              <h2 className="text-2xl font-bold text-center mb-4">Add Modules Section</h2>
              <AddModuleForm />
            </div>
          </div>
        )}

        {activeTab === "Modules" && (
          <div>
            <div className="flex justify-between items-center mb-6 mt-14 md:mt-0">
              <h2 className="text-2xl font-bold">All Modules</h2>
              <button
                onClick={() => setShowAddModulePopup(true)}
                className="flex items-center gap-2 bg-green-600 px-4 py-2 rounded-full text-sm font-semibold hover:bg-green-700 transition"
              >
                <PlusCircle size={18} /> Add Module
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((mod) => (
                <div key={mod.id} className="bg-white text-black p-4 rounded-xl shadow-md relative">
                  <h3 className="font-bold text-lg mb-1">{mod.title}</h3>
                  <p className="text-sm mb-2">{mod.description}</p>
                  {mod.video && (
                    <a href={mod.video} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline">
                      YouTube Video
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteModule(mod.id)}
                    className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "Documents" && (
          <div>
            <h2 className="text-2xl font-bold mb-4 mt-14 md:mt-0">All Uploaded Documents</h2>
            {adminDocuments.length === 0 ? (
              <p className="text-gray-400">No documents uploaded yet.</p>
            ) : (
              <ul className="space-y-3">
                {adminDocuments.map((doc) => (
                  <li key={doc.id} className="bg-white/10 p-4 rounded-xl">
                    <p>
                      <strong>{doc.title}</strong> — {doc.studentName} ({doc.studentEmail})
                    </p>
                    <a href={doc.link} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline text-sm">
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {gradingStudent && (
          <GradingModal student={gradingStudent} onClose={() => setGradingStudent(null)} />
        )}

        {docUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-white text-black p-6 rounded-xl shadow-lg w-96">
              <h3 className="text-lg font-bold mb-4">Upload Document (Paste Link)</h3>
              <input
                type="text"
                placeholder="Title"
                value={docForm.title}
                onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                className="w-full border px-3 py-2 rounded mb-3 text-black"
              />
              <input
                type="text"
                placeholder="Document Link"
                value={docForm.link}
                onChange={(e) => setDocForm({ ...docForm, link: e.target.value })}
                className="w-full border px-3 py-2 rounded mb-4 text-black"
              />
              <div className="flex justify-end gap-4">
                <button className="bg-gray-400 px-4 py-1 rounded" onClick={() => setDocUploadModal(null)}>
                  Cancel
                </button>
                <button className="bg-green-600 text-white px-4 py-1 rounded" onClick={handleUpload}>
                  Upload
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddModulePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white/10 text-white p-8 rounded-3xl shadow-xl border border-white/20">
              <button
                onClick={() => setShowAddModulePopup(false)}
                className="absolute top-4 right-6 text-white text-2xl font-bold hover:text-red-400 z-50"
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold text-center mb-4">Add Modules Section</h2>
              <div className="space-y-6">
                <AddModuleForm />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

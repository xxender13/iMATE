import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { motion } from "framer-motion";
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

const StudentDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState("My Progress");
  const [modules, setModules] = useState([]);
  const [responses, setResponses] = useState({});
  const [documents, setDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [answers, setAnswers] = useState({});
  const navigate = useNavigate();
  const notifRef = useRef();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const docRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData({ id: docSnap.id, ...docSnap.data() });
      }
    });

    const unsubModules = onSnapshot(query(collection(db, "modules")), (snap) => {
      const moduleList = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const getNum = (title) => parseInt(title?.match(/\d+/)?.[0] || 0);
          return getNum(a.title) - getNum(b.title);
        });
      setModules(moduleList);
    });

    const fetchResponses = async () => {
      const resRef = collection(db, `users/${user.uid}/responses`);
      const resSnap = await getDocs(resRef);
      const resData = {};
      for (const docSnap of resSnap.docs) {
        const gradingRef = doc(
          db,
          `users/${user.uid}/responses/${docSnap.id}/grading/result`
        );
        const gradingSnap = await getDoc(gradingRef);
        resData[docSnap.id] = {
          ...docSnap.data(),
          grading: gradingSnap.exists() ? gradingSnap.data() : null,
        };
      }
      setResponses(resData);
    };

    const unsubDocs = onSnapshot(collection(db, `users/${user.uid}/documents`), (snap) => {
      const docList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDocuments(docList);
    });

    const unsubNotifications = onSnapshot(
      collection(db, `users/${user.uid}/notifications`),
      (snap) => {
        const notifList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setNotifications(notifList.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      }
    );

    fetchResponses();

    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      unsubUser();
      unsubModules();
      unsubDocs();
      unsubNotifications();
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleModuleAttempt = (mod) => setSelectedModule(mod);
  const handleTabClick = (tab) => setActiveTab(tab);

  const handleAnswerChange = (field, value) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitResponse = async () => {
    const user = auth.currentUser;
    if (!user || !selectedModule) return;
    const alreadySubmitted = responses[selectedModule.id];
    if (alreadySubmitted) return;
    const responseRef = doc(db, `users/${user.uid}/responses/${selectedModule.id}`);
    await setDoc(responseRef, {
      ...answers,
      submittedAt: new Date(),
    });
    setSelectedModule(null);
    setAnswers({});
  };

  const completedCount = Object.values(responses).filter((r) => r.grading).length;
  const totalModules = modules.length;
  const progressPercent = totalModules ? (completedCount / totalModules) * 100 : 0;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 20] }}>
          <ambientLight intensity={1} />
          <SpaceBackground />
        </Canvas>
      </div>

      <div className="relative z-10 px-6 py-10 md:px-12">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
          <h1 className="text-2xl font-bold">Hey, {userData?.name || "Student"} 👋</h1>
          <div className="flex items-center gap-4">
            <div onClick={() => setNotifOpen(!notifOpen)} className="relative cursor-pointer">
              <Bell className="w-7 h-7 text-white" />
              {notifications.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-xs px-2 rounded-full">
                  {notifications.length}
                </span>
              )}
            </div>
            <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">
              Logout
            </button>
          </div>
        </div>

        {notifOpen && (
          <div ref={notifRef} className="absolute top-20 right-10 bg-white text-black w-72 rounded shadow-lg z-50 p-4">
            <h3 className="font-semibold text-lg mb-2">Notifications</h3>
            <ul className="max-h-60 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className="text-sm py-1 border-b border-gray-300">
                  {n.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-8 mt-10">
          <div className="relative w-72 h-72 md:w-96 md:h-96 mx-auto sm:mx-0">
            <div className="absolute inset-0 rounded-full border-4 border-white bg-purple-600 overflow-hidden">
              <div className="absolute inset-0 flex flex-wrap">
                {["Modules", "My Progress", "Profile", "My Documents"].map((label) => (
                  <div
                    key={label}
                    onClick={() => handleTabClick(label)}
                    className={`w-1/2 h-1/2 flex items-center justify-center cursor-pointer transition-colors ${
                      activeTab === label ? "bg-purple-900" : "bg-purple-500"
                    }`}
                  >
                    <span className="font-semibold text-sm text-white">{label}</span>
                  </div>
                ))}
              </div>
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white transform -translate-y-1/2" />
              <div className="absolute left-1/2 top-0 h-full w-[2px] bg-white transform -translate-x-1/2" />
            </div>
            <div className="absolute top-1/2 left-1/2 w-[50%] h-[50%] rounded-full bg-black transform -translate-x-1/2 -translate-y-1/2 z-10" />
          </div>

          <div className="flex-1">
            {activeTab === "My Progress" && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Your Progress</h2>
                <div className="w-full bg-white/30 rounded-full h-6">
                  <div className="bg-green-500 h-6 rounded-full" style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="mt-2 text-sm text-gray-300">{completedCount} of {totalModules} modules completed</p>
              </div>
            )}

            {activeTab === "Modules" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modules.map((mod, i) => {
                  const res = responses[mod.id];
                  const isFirst = i === 0;
                  const prevCompleted = responses[modules[i - 1]?.id]?.grading;
                  const isLocked = !isFirst && !prevCompleted;

                  return (
                    <div
                      key={mod.id}
                      className="relative bg-white/10 text-white p-4 rounded-xl shadow-md hover:scale-105 transition cursor-pointer"
                      onClick={() => !isLocked && handleModuleAttempt(mod)}
                    >
                      {isLocked && (
                        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-10 rounded-xl">
                          <span className="text-3xl">🔒</span>
                        </div>
                      )}
                      <h3 className="text-xl font-semibold mb-1">{mod.title}</h3>
                      <p className="text-sm text-gray-300 mb-2">{mod.description}</p>
                      {res ? (
                        res.grading ? (
                          <p className="text-green-400">✅ Graded: {res.grading.score}</p>
                        ) : (
                          <p className="text-yellow-300">⏳ Grader will grade your submission soon</p>
                        )
                      ) : (
                        <p className="text-gray-400">You haven't submitted this module yet.</p>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}

            {activeTab === "My Documents" && (
              <div>
                <h3 className="text-2xl font-bold mb-4">My Documents</h3>
                {documents.length === 0 ? (
                  <p className="text-gray-300">No documents uploaded yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {documents.map((doc) => (
                      <li key={doc.id} className="bg-white/10 p-3 rounded flex justify-between items-center">
                        <span>{doc.title}</span>
                        <a href={doc.link} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline text-sm">
                          Download
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === "Profile" && (
              <div>
                <h3 className="text-2xl font-bold mb-4">My Profile</h3>
                <p><strong>Name:</strong> {userData?.name}</p>
                <p><strong>Email:</strong> {auth.currentUser?.email}</p>
                <p className="text-gray-400 mt-2">Edit Profile coming soon...</p>
              </div>
            )}
          </div>
        </div>

        {selectedModule && (
          <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white text-black p-6 rounded-xl max-w-lg w-full relative">
              <button
                className="absolute top-4 right-5 text-red-600 font-bold text-xl"
                onClick={() => setSelectedModule(null)}
              >
                ✕
              </button>
              <h2 className="text-xl font-bold mb-4">{selectedModule.title}</h2>

              {selectedModule.video && (
                <div className="mb-4">
                  <p className="font-semibold mb-1">Watch:</p>
                  <a href={selectedModule.video} className="text-blue-600 underline" target="_blank" rel="noreferrer">
                    {selectedModule.video}
                  </a>
                </div>
              )}

              {selectedModule.image && (
                <img src={selectedModule.image} alt="module" className="w-full h-auto rounded-lg mb-4" />
              )}

              {responses[selectedModule.id] ? (
                <div>
                  {responses[selectedModule.id].mcqAnswer && (
                    <p><strong>Your MCQ Answer:</strong> {responses[selectedModule.id].mcqAnswer}</p>
                  )}
                  {responses[selectedModule.id].essayAnswer && (
                    <p className="mt-2"><strong>Your Essay:</strong><br />{responses[selectedModule.id].essayAnswer}</p>
                  )}
                  {!responses[selectedModule.id].grading && (
                    <p className="text-yellow-500 mt-4">Grader will grade your submission soon</p>
                  )}
                </div>
              ) : (
                <>
                  {selectedModule.mcq && (
                    <div className="mb-4">
                      <p className="font-semibold">{selectedModule.mcq.question}</p>
                      {selectedModule.mcq.options.map((opt, idx) => (
                        <div key={idx} className="flex gap-2 mt-2">
                          <input
                            type="radio"
                            id={`opt-${idx}`}
                            name="mcqAnswer"
                            value={opt}
                            onChange={(e) => handleAnswerChange("mcqAnswer", e.target.value)}
                          />
                          <label htmlFor={`opt-${idx}`}>{opt}</label>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedModule.essay && (
                    <div className="mb-4">
                      <p className="font-semibold mb-2">Essay:</p>
                      <textarea
                        rows="4"
                        className="w-full border p-2 rounded"
                        placeholder="Write your essay answer here..."
                        onChange={(e) => handleAnswerChange("essayAnswer", e.target.value)}
                      />
                    </div>
                  )}
                  <button
                    className="bg-green-600 text-white px-4 py-2 rounded mt-4"
                    onClick={handleSubmitResponse}
                  >
                    Submit
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;

// GradingModal.jsx
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../../firebase";

const GradingModal = ({ student, onClose }) => {
  const [responses, setResponses] = useState([]);
  const [grades, setGrades] = useState({});
  const [gradedModules, setGradedModules] = useState({});

  useEffect(() => {
    if (!student?.id) return;

    const fetchResponses = async () => {
      const resRef = collection(db, `users/${student.id}/responses`);
      const resSnap = await getDocs(resRef);

      const resWithModuleData = await Promise.all(
        resSnap.docs.map(async (docSnap) => {
          const moduleId = docSnap.id;
          const response = { id: moduleId, ...docSnap.data() };

          const [modSnap, gradeSnap] = await Promise.all([
            getDoc(doc(db, "modules", moduleId)),
            getDoc(doc(db, `users/${student.id}/responses/${moduleId}/grading/result`)),
          ]);

          return {
            ...response,
            module: modSnap.exists() ? modSnap.data() : null,
            grading: gradeSnap.exists() ? gradeSnap.data() : null,
          };
        })
      );

      // Sort by module number extracted from title (e.g., Module 1, Module 2...)
      const sorted = resWithModuleData.sort((a, b) => {
        const getNum = (title) => parseInt(title?.match(/\d+/)?.[0] || 0);
        return getNum(a.module?.title) - getNum(b.module?.title);
      });

      const alreadyGraded = {};
      sorted.forEach((res) => {
        if (res.grading) alreadyGraded[res.id] = res.grading;
      });

      setResponses(sorted);
      setGradedModules(alreadyGraded);
    };

    fetchResponses();
  }, [student]);

  const handleGradeSubmit = async (moduleId) => {
    const gradeData = grades[moduleId];
    if (!gradeData?.score) return alert("Enter score to submit");

    // Prevent regrading
    if (gradedModules[moduleId]) {
      return alert("This module has already been graded.");
    }

    await setDoc(
      doc(db, `users/${student.id}/responses/${moduleId}/grading/result`),
      {
        ...gradeData,
        gradedAt: new Date(),
      }
    );

    await updateDoc(doc(db, "users", student.id), {
      completedModules: arrayUnion(moduleId),
    });

    alert("Graded successfully!");
    setGradedModules((prev) => ({ ...prev, [moduleId]: gradeData }));
  };

  const handleChange = (moduleId, field, value) => {
    setGrades((prev) => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [field]: value,
      },
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-white text-black p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
        <h2 className="text-xl font-bold mb-4">Grading: {student.name}</h2>
        <button
          className="absolute top-4 right-6 text-red-500 font-bold"
          onClick={onClose}
        >
          ✕
        </button>

        {responses.length === 0 && <p>No responses submitted yet.</p>}

        {responses.map((res) => (
          <div key={res.id} className="border border-gray-300 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-lg mb-2">
              {res.module?.title || `Module ID: ${res.id}`}
            </h3>

            {res.module?.mcq?.question && (
              <p className="text-sm mb-1 font-medium text-gray-700">
                MCQ Question: {res.module.mcq.question}
              </p>
            )}

            {res.mcqAnswer && (
              <p className="mb-2 font-medium">MCQ Answer: {res.mcqAnswer}</p>
            )}

            {res.module?.essay && (
              <p className="text-sm mb-1 font-medium text-gray-700">
                Essay Prompt: {res.module.essay}
              </p>
            )}

            {res.essayAnswer && (
              <p className="mb-2 font-medium">Essay: {res.essayAnswer}</p>
            )}

            {res.grading ? (
              <div className="bg-green-100 p-3 rounded-lg mt-2">
                <p className="text-green-800 font-semibold">✅ Already Graded</p>
                <p><strong>Score:</strong> {res.grading.score}</p>
                <p><strong>Feedback:</strong> {res.grading.feedback || "N/A"}</p>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  className="border p-2 w-full mb-2"
                  placeholder="Score (e.g. 8/10)"
                  value={grades[res.id]?.score || ""}
                  onChange={(e) =>
                    handleChange(res.id, "score", e.target.value)
                  }
                />

                <textarea
                  className="border p-2 w-full mb-2"
                  placeholder="Feedback (optional)"
                  rows={2}
                  value={grades[res.id]?.feedback || ""}
                  onChange={(e) =>
                    handleChange(res.id, "feedback", e.target.value)
                  }
                />

                <button
                  className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
                  onClick={() => handleGradeSubmit(res.id)}
                >
                  Submit Grade
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GradingModal;

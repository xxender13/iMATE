import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import {
  FiEdit,
  FiTrash,
  FiPlus,
  FiBookOpen,
  FiYoutube,
  FiFileText,
  FiFile,
} from "react-icons/fi";

function MaterialForm({ onSave, onCancel }) {
  const [type, setType] = useState("youtube");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("Material title required");
    if (type === "youtube" || type === "pdf") {
      if (!url.trim()) return alert("URL required");
      onSave({ id: Date.now() + "", type, title, url });
    } else {
      if (!content.trim()) return alert("Content required");
      onSave({ id: Date.now() + "", type, title, content });
    }
  };

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={handleSubmit}>
        <h3>Add Material</h3>
        <label>
          Type:
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="youtube">YouTube</option>
            <option value="pdf">PDF</option>
            <option value="text">Text</option>
          </select>
        </label>
        <label>
          Title:
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        {type === "youtube" && (
          <label>
            YouTube Embed URL:
            <input value={url} onChange={(e) => setUrl(e.target.value)} required />
          </label>
        )}
        {type === "pdf" && (
          <label>
            PDF URL:
            <input value={url} onChange={(e) => setUrl(e.target.value)} required />
          </label>
        )}
        {type === "text" && (
          <label>
            Content:
            <textarea value={content} onChange={(e) => setContent(e.target.value)} required />
          </label>
        )}
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary">Save</button>
        </div>
      </form>
    </div>
  );
}

function QuizForm({ onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([
    { question: "", options: ["", "", "", ""], correct: 0 },
  ]);

  const handleQChange = (idx, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === idx ? { ...q, [field]: value } : q
      )
    );
  };

  const handleOptionChange = (qIdx, oIdx, value) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o, oi) => (oi === oIdx ? value : o)) }
          : q
      )
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { question: "", options: ["", "", "", ""], correct: 0 },
    ]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("Quiz title required");
    onSave({
      id: Date.now() + "",
      title,
      questions,
    });
  };

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={handleSubmit}>
        <h3>Add Quiz</h3>
        <label>
          Quiz Title:
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        {questions.map((q, idx) => (
          <div key={idx} className="quiz-question-block">
            <label>
              Question {idx + 1}:
              <input
                value={q.question}
                onChange={(e) => handleQChange(idx, "question", e.target.value)}
                required
              />
            </label>
            {q.options.map((opt, oIdx) => (
              <label key={oIdx}>
                Option {oIdx + 1}:
                <input
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, oIdx, e.target.value)}
                  required
                />
              </label>
            ))}
            <label>
              Correct Option:
              <select
                value={q.correct}
                onChange={(e) => handleQChange(idx, "correct", Number(e.target.value))}
              >
                {[0, 1, 2, 3].map((i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
        <button type="button" onClick={addQuestion}>Add Question</button>
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary">Save</button>
        </div>
      </form>
    </div>
  );
}

export default function AdminCoursesView() {
  const [courses, setCourses] = useState([]);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: "", description: "" });
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [newChapter, setNewChapter] = useState({ title: "", description: "" });
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);

  // Fetch courses
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "courses"));
      setCourses(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    })();
  }, []);

  // Add course
  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.title.trim()) return;
    const courseRef = await addDoc(collection(db, "courses"), {
      ...newCourse,
      chapters: [],
      createdAt: new Date(),
    });
    setCourses([
      ...courses,
      { id: courseRef.id, ...newCourse, chapters: [] },
    ]);
    setShowCourseForm(false);
    setNewCourse({ title: "", description: "" });
  };

  // Add chapter
  const handleAddChapter = async (e) => {
    e.preventDefault();
    if (!newChapter.title.trim() || !selectedCourse) return;
    const courseRef = doc(db, "courses", selectedCourse.id);
    const updatedChapters = [
      ...(selectedCourse.chapters || []),
      { ...newChapter, id: Date.now() + "", materials: [], quizzes: [] },
    ];
    await updateDoc(courseRef, { chapters: updatedChapters });
    setCourses((prev) =>
      prev.map((c) =>
        c.id === selectedCourse.id ? { ...c, chapters: updatedChapters } : c
      )
    );
    setShowChapterForm(false);
    setNewChapter({ title: "", description: "" });
  };

  // Add material
  const handleAddMaterial = (material) => {
    if (!selectedCourse || !selectedChapter) return;
    const courseRef = doc(db, "courses", selectedCourse.id);
    const chapters = selectedCourse.chapters.map((ch) =>
      ch.id === selectedChapter.id
        ? { ...ch, materials: [...(ch.materials || []), material] }
        : ch
    );
    updateDoc(courseRef, { chapters });
    setCourses((prev) =>
      prev.map((c) =>
        c.id === selectedCourse.id ? { ...c, chapters } : c
      )
    );
    setShowMaterialForm(false);
  };

  // Add quiz
  const handleAddQuiz = (quiz) => {
    if (!selectedCourse || !selectedChapter) return;
    const courseRef = doc(db, "courses", selectedCourse.id);
    const chapters = selectedCourse.chapters.map((ch) =>
      ch.id === selectedChapter.id
        ? { ...ch, quizzes: [...(ch.quizzes || []), quiz] }
        : ch
    );
    updateDoc(courseRef, { chapters });
    setCourses((prev) =>
      prev.map((c) =>
        c.id === selectedCourse.id ? { ...c, chapters } : c
      )
    );
    setShowQuizForm(false);
  };

  // Delete course
  const handleDeleteCourse = async (id) => {
    if (!window.confirm("Delete this course?")) return;
    await deleteDoc(doc(db, "courses", id));
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };
  // Delete chapter
  const handleDeleteChapter = async (courseId, chapterId) => {
    if (!window.confirm("Delete this chapter?")) return;
    const courseRef = doc(db, "courses", courseId);

    const updatedChapters = courses
      .find((c) => c.id === courseId)
      .chapters.filter((ch) => ch.id !== chapterId);

    await updateDoc(courseRef, { chapters: updatedChapters });

    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId ? { ...c, chapters: updatedChapters } : c
      )
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#003DA5]">Course Management</h1>
        <button
          onClick={() => setShowCourseForm(true)}
          className="bg-[#003DA5] text-white px-4 py-2 rounded"
        >
          <FiPlus /> Add New Course
        </button>
      </div>

      {/* Add Course Modal */}
      {showCourseForm && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={handleAddCourse}>
            <h3>Add New Course</h3>
            <label>
              Title:
              <input
                value={newCourse.title}
                onChange={(e) =>
                  setNewCourse((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </label>
            <label>
              Description:
              <textarea
                value={newCourse.description}
                onChange={(e) =>
                  setNewCourse((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowCourseForm(false)}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Chapter Modal */}
      {showChapterForm && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={handleAddChapter}>
            <h3>Add Chapter</h3>
            <label>
              Title:
              <input
                value={newChapter.title}
                onChange={(e) =>
                  setNewChapter((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </label>
            <label>
              Description:
              <textarea
                value={newChapter.description}
                onChange={(e) =>
                  setNewChapter((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowChapterForm(false)}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {showMaterialForm && (
        <MaterialForm
          onSave={handleAddMaterial}
          onCancel={() => setShowMaterialForm(false)}
        />
      )}

      {showQuizForm && (
        <QuizForm
          onSave={handleAddQuiz}
          onCancel={() => setShowQuizForm(false)}
        />
      )}

      {/* Course List */}
      <div className="grid grid-cols-1 gap-6">
        {courses.length > 0 ? (
          courses.map((course) => (
            <div key={course.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-[#003DA5]">{course.title}</h2>
                <div className="flex gap-2">
                  <button className="text-blue-600 hover:text-blue-800">
                    <FiEdit size={18} />
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => handleDeleteCourse(course.id)}
                  >
                    <FiTrash size={18} />
                  </button>
                </div>
              </div>
              <p className="text-gray-600 mb-4">{course.description}</p>
              {/* Chapters */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">Chapters</h3>
                  <button
                    onClick={() => {
                      setSelectedCourse(course);
                      setShowChapterForm(true);
                    }}
                    className="text-sm bg-[#003DA5] text-white px-3 py-1 rounded flex items-center gap-1"
                  >
                    <FiPlus size={14} /> Add Chapter
                  </button>
                </div>
                {course.chapters && course.chapters.length > 0 ? (
                  <div className="space-y-3">
                    {course.chapters.map((chapter) => (
                      <div key={chapter.id} className="bg-gray-50 p-4 rounded-md">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">{chapter.title}</h4>
                          <div className="flex gap-2 flex-wrap">
  <button
    onClick={() => {
      setSelectedCourse(course);
      setSelectedChapter(chapter);
      setShowMaterialForm(true);
    }}
    className="text-xs bg-green-600 text-white px-2 py-1 rounded"
  >
    Add Material
  </button>
  <button
    onClick={() => {
      setSelectedCourse(course);
      setSelectedChapter(chapter);
      setShowQuizForm(true);
    }}
    className="text-xs bg-amber-600 text-white px-2 py-1 rounded"
  >
    Add Quiz
  </button>
  <button
    onClick={() => handleDeleteChapter(course.id, chapter.id)}
    className="text-xs bg-red-600 text-white px-2 py-1 rounded"
  >
    Delete Chapter
  </button>
</div>

                        </div>
                        {/* Materials */}
                        {chapter.materials && chapter.materials.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium mb-2">Materials:</h5>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {chapter.materials.map((material) => (
                                <li key={material.id}>
                                  {material.type === "youtube" && <FiYoutube className="inline" />}
                                  {material.type === "pdf" && <FiFileText className="inline" />}
                                  {material.type === "text" && <FiFile className="inline" />}
                                  <span className="ml-2">{material.title}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Quizzes */}
                        {chapter.quizzes && chapter.quizzes.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium mb-2">Quizzes:</h5>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {chapter.quizzes.map((quiz) => (
                                <li key={quiz.id}>{quiz.title}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">No chapters yet</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <FiBookOpen className="mx-auto text-4xl text-gray-400 mb-2" />
            <p className="text-gray-500">
              No courses found. Click "Add New Course" to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

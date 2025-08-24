// src/pages/StudentDashboard.jsx
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import SluLogo from "../assets/slu.png";
import {
  FiHome,
  FiBook,
  FiLogOut,
  FiImage,
  FiCheckCircle,
  FiAward,
  FiClock,
  FiArrowLeft,
  FiChevronRight,
} from "react-icons/fi";

/* -------------------------------- Helpers -------------------------------- */

// Convert arrays OR {0:...,1:...} objects into arrays (stable numeric order)
function toArray(x) {
  if (Array.isArray(x)) return x;
  if (x && typeof x === "object") {
    return Object.keys(x)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => x[k]);
  }
  return [];
}

// YouTube helper
function getYoutubeEmbed(url) {
  if (!url) return "";
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/i;
  const match = url.match(regExp);
  const id = match && match[2]?.length === 11 ? match[2] : null;
  return id ? `https://www.youtube.com/embed/${id}` : "";
}

// Normalize quizzes from Firestore into canonical shape:
// [{ title?, id?, questions: [{ question, options: [...], correct: number }]}]
function normalizeQuizzes(chapter) {
  const raw = chapter?.quizzes ?? chapter?.quiz ?? chapter?.mcqs ?? [];
  const quizzes = toArray(raw);

  return quizzes
    .map((q) => {
      // questions may be an array or object; also support single-question shape
      let qs = [];
      if (q?.questions) {
        qs = toArray(q.questions).map((qq) => ({
          question: String(qq?.question ?? ""),
          options: toArray(qq?.options).map((o) => String(o)),
          correct: Number(qq?.correct ?? 0),
        }));
      } else if (q?.question && (q?.options || q?.options === 0)) {
        qs = [
          {
            question: String(q.question),
            options: toArray(q.options).map((o) => String(o)),
            correct: Number(q?.correct ?? 0),
          },
        ];
      }
      return { ...q, questions: qs };
    })
    .filter((q) => (q.questions?.length ?? 0) > 0);
}

// Normalize materials list (array or object)
function normalizeMaterials(chapter) {
  const mats = toArray(chapter?.materials);
  return mats
    .map((m) => ({
      ...m,
      type: m?.type || "",
      title: m?.title || "",
      url: m?.url || "",
      content: m?.content || "",
    }))
    .filter(Boolean);
}

// Background gradient
const SluBackground = () => (
  <div className="fixed inset-0 -z-10 bg-gradient-to-br from-[#003DA5] to-[#002254]">
    <div className="absolute inset-0 bg-pattern opacity-10" />
  </div>
);

// PDF preview
const PDFViewer = ({ url }) =>
  url ? (
    <div className="w-full h-[500px] md:h-[600px] rounded-md overflow-hidden shadow-md border border-gray-200">
      <iframe
        src={url}
        width="100%"
        height="100%"
        style={{ border: "none" }}
        title="PDF Viewer"
        className="bg-white"
      />
    </div>
  ) : (
    <div className="text-center p-4">No PDF available</div>
  );

// YouTube preview
const YouTubeViewer = ({ url }) => {
  const embedUrl = getYoutubeEmbed(url);
  return embedUrl ? (
    <div className="w-full rounded-md overflow-hidden shadow-md relative pb-[56.25%]">
      <iframe
        src={embedUrl}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  ) : (
    <div className="text-center p-4">Invalid YouTube URL</div>
  );
};

/* --------------------------- Student Dashboard --------------------------- */

export default function StudentDashboard() {
  const navigate = useNavigate();

  // UI state
  const [activeTab, setActiveTab] = useState("home");
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);

  // quiz state (supports multi-question)
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { qIdx: optionIdx }
  const [submitted, setSubmitted] = useState(false);

  // user + load state
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ---------------------------- Auth redirect ---------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/login");
    });
    return () => unsub();
  }, [navigate]);

  const uid = auth.currentUser?.uid;

  /* -------------------------- Fetch user & courses ----------------------- */
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const unsubUser = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        setUserData(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Could not load your profile.");
        setLoading(false);
      }
    );

    const unsubCourses = onSnapshot(
      collection(db, "courses"),
      (snap) => {
        setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Could not load courses.");
        setLoading(false);
      }
    );

    return () => {
      unsubUser();
      unsubCourses();
    };
  }, [uid]);

  /* --------------------------- Enrolled courses -------------------------- */
  const enrolledIds = userData?.enrolledCourses
    ? Array.isArray(userData.enrolledCourses)
      ? userData.enrolledCourses
      : Object.keys(userData.enrolledCourses)
    : [];

  const myCourses = courses.filter((c) => enrolledIds.includes(c.id));

  /* --------------------------- Progress helpers -------------------------- */
  const getCourseDoneCountSafe = useCallback(
    (courseId, chapters = []) => {
      if (!userData?.completedQuizzes) return 0;
      const keys = Object.keys(userData.completedQuizzes[courseId] || {});
      return keys.filter((k) => {
        const idx = Number(k.replace("chapter", ""));
        return Number.isInteger(idx) && chapters[idx];
      }).length;
    },
    [userData]
  );

  const getOverallProgress = useCallback(() => {
    if (!myCourses.length) return 0;
    let total = 0,
      done = 0;
    myCourses.forEach((course) => {
      const ch = course.chapters || [];
      total += ch.length;
      done += getCourseDoneCountSafe(course.id, ch);
    });
    return total ? Math.floor((done / total) * 100) : 0;
  }, [myCourses, getCourseDoneCountSafe]);

  const getCourseProgress = useCallback(
    (courseId, chapters = []) => {
      const done = getCourseDoneCountSafe(courseId, chapters);
      return chapters.length ? Math.floor((done / chapters.length) * 100) : 0;
    },
    [getCourseDoneCountSafe]
  );

  /* -------------------------------- Actions ------------------------------ */
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      alert("Failed to sign out.");
    }
  };

  // Auto-grade & persist a quiz attempt for the whole quiz (all questions)
  const submitQuiz = async () => {
    if (!selectedCourse || !selectedChapter) {
      alert("Missing course or chapter.");
      return;
    }

    const quizzes = normalizeQuizzes(selectedChapter);
    const quiz = quizzes?.[quizIndex];
    const questions = quiz?.questions || [];

    if (!questions.length) {
      alert("No questions found.");
      return;
    }

    // Ensure each question was answered
    const unanswered = questions.findIndex(
      (_q, i) => selectedAnswers[i] === undefined
    );
    if (unanswered !== -1) {
      alert(`Please answer question ${unanswered + 1}.`);
      return;
    }

    // Score: % correct
    let correctCount = 0;
    const answersPayload = questions.map((q, i) => {
      const sel = Number(selectedAnswers[i]);
      const correctIndex = Number(q.correct ?? 0);
      const isCorrect = sel === correctIndex;
      if (isCorrect) correctCount += 1;
      return {
        question: q.question,
        selected: q.options?.[sel],
        correct: q.options?.[correctIndex],
        selectedIndex: sel,
        correctIndex,
        isCorrect,
      };
    });
    const score = Math.round((correctCount / questions.length) * 100);

    // Persist under chapter index key (chapter0, chapter1, ...)
    const chapterIndex = Math.max(
      0,
      (toArray(selectedCourse.chapters) || []).findIndex(
        (c) => c?.title === selectedChapter?.title
      )
    );
    const chapterKey = `chapter${chapterIndex}`;

    const payload = {
      completedQuizzes: {
        [selectedCourse.id]: {
          ...userData?.completedQuizzes?.[selectedCourse.id],
          [chapterKey]: {
            score,
            answers: answersPayload,
            completedAt: new Date().toISOString(),
          },
        },
      },
    };

    try {
      await setDoc(doc(db, "users", uid), payload, { merge: true });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert("Failed to submit quiz.");
    }
  };

  /* ------------------------------ Header UI ------------------------------ */
  const DashboardHeader = () => (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center h-16 px-4">
        <div className="flex items-center">
          <Link to="/student">
            <img src={SluLogo} alt="SLU Logo" className="h-10" />
          </Link>
          <nav className="hidden md:flex ml-8 space-x-6">
            {[
              { key: "home", label: "Home", icon: <FiHome className="mr-1" /> },
              { key: "courses", label: "My Courses", icon: <FiBook className="mr-1" /> },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  setSelectedCourse(null);
                  setSelectedChapter(null);
                }}
                className={`pb-1 border-b-2 text-sm font-medium ${
                  activeTab === key
                    ? "border-[#FFC72C] text-[#003DA5]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center">
          <span className="hidden md:inline text-[#003DA5] mr-4 font-medium">
            {userData?.firstName && userData?.lastName
              ? `${userData.firstName} ${userData.lastName}`
              : auth.currentUser?.email?.split("@")[0]}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center bg-[#003DA5] text-white px-3 py-2 rounded-md text-sm"
          >
            <FiLogOut className="mr-1" /> Sign Out
          </button>
        </div>
      </div>
    </header>
  );

  /* ------------------------------- HOME TAB ------------------------------- */
  const renderHome = () => {
    const overall = getOverallProgress();

    const recent = [];
    if (userData?.completedQuizzes) {
      Object.entries(userData.completedQuizzes).forEach(([courseId, chapters]) => {
        const course = courses.find((c) => c.id === courseId);
        if (!course) return;
        Object.entries(chapters).forEach(([ckey, data]) => {
          if (!data?.completedAt) return;
          const idx = parseInt(ckey.replace("chapter", ""), 10);
          const chap = course.chapters?.[idx];
          if (!chap) return;
          recent.push({
            courseTitle: course.title,
            chapterTitle: chap.title || `Chapter ${idx + 1}`,
            score: data.score,
            date: new Date(data.completedAt),
          });
        });
      });
    }
    recent.sort((a, b) => b.date - a.date);

    return (
      <div className="flex-grow py-6 md:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome */}
          <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
            <div className="px-4 py-6 bg-gradient-to-r from-[#003DA5] to-[#0056E0]">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                    Welcome back,{" "}
                    {userData?.firstName && userData?.lastName
                      ? `${userData.firstName} ${userData.lastName}`
                      : auth.currentUser?.email?.split("@")[0]}
                    !
                  </h2>
                  <p className="mt-2 text-blue-100">
                    Continue your learning journey with iMATE
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("courses")}
                  className="mt-4 md:mt-0 bg-[#FFC72C] text-[#003DA5] px-5 py-2 rounded-md font-medium hover:bg-[#FFD75C]"
                >
                  Continue Learning
                </button>
              </div>
            </div>

            {/* Progress */}
            <div className="px-4 py-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Your Overall Progress
              </h3>
              <div className="bg-gray-100 h-4 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-[#003DA5] to-[#00A3FF]"
                  style={{ width: `${overall}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{overall}% Complete</span>
                <span>
                  {myCourses.length} Course{myCourses.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="px-4 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <FiBook className="h-6 w-6 text-[#003DA5]" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Enrolled Courses</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {myCourses.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <FiCheckCircle className="h-6 w-6 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Completed Chapters</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {myCourses.reduce(
                        (acc, c) => acc + getCourseDoneCountSafe(c.id, c.chapters || []),
                        0
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <FiAward className="h-6 w-6 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Average Score</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {(() => {
                        let total = 0,
                          count = 0;
                        Object.values(userData?.completedQuizzes || {}).forEach(
                          (course) =>
                            Object.values(course).forEach((chap) => {
                              if (typeof chap?.score === "number") {
                                total += chap.score;
                                count++;
                              }
                            })
                        );
                        return count ? `${Math.round(total / count)}%` : "N/A";
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow mb-8 p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Recent Activity
            </h3>
            {recent.length ? (
              <ul className="space-y-3">
                {recent.slice(0, 5).map((act, i) => (
                  <li
                    key={i}
                    className="flex justify-between items-center p-3 rounded hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-[#003DA5]">{act.courseTitle}</p>
                      <p className="text-sm text-gray-500">{act.chapterTitle}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          act.score >= 70
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {act.score}%
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {act.date.toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FiClock className="mx-auto h-10 w-10 mb-2" />
                No recent activity
              </div>
            )}
          </div>

          {/* Continue Learning */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Continue Learning
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCourses.slice(0, 3).map((course) => (
                <div
                  key={course.id}
                  className="border rounded-lg p-4 flex flex-col shadow hover:shadow-md transition"
                >
                  <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
                  <p className="text-sm text-gray-500 flex-grow">{course.description}</p>
                  <div className="mt-4">
                    <div className="text-xs text-gray-500 mb-1">
                      {getCourseProgress(course.id, course.chapters || [])}% Complete
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full">
                      <div
                        className="h-2 rounded-full bg-[#003DA5]"
                        style={{
                          width: `${getCourseProgress(
                            course.id,
                            course.chapters || []
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCourse(course);
                      setActiveTab("coursesDetail");
                    }}
                    className="mt-4 bg-[#003DA5] text-white py-2 rounded-md font-medium"
                  >
                    Continue
                  </button>
                </div>
              ))}
            </div>
            {myCourses.length > 3 && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setActiveTab("courses")}
                  className="text-[#003DA5] underline"
                >
                  View All Courses
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ----------------------------- COURSES LIST ---------------------------- */
  const renderCourses = () => (
    <div className="flex-grow py-6">
      <div className="max-w-7xl mx-auto px-4">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
          <p className="mt-2 text-gray-500">
            Select a course below to continue your learning journey
          </p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {myCourses.length ? (
            myCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition"
              >
                <div className="h-2 bg-[#003DA5] rounded-t" />
                <h2 className="mt-4 text-lg font-semibold text-gray-900">
                  {course.title}
                </h2>
                <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                  {course.description}
                </p>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Progress</span>
                    <span>
                      {getCourseProgress(course.id, course.chapters || [])}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full mt-1">
                    <div
                      className="h-2 rounded-full bg-[#FFC72C]"
                      style={{
                        width: `${getCourseProgress(
                          course.id,
                          course.chapters || []
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCourse(course);
                    setActiveTab("coursesDetail");
                  }}
                  className="w-full bg-[#003DA5] text-white py-2 rounded-md"
                >
                  View Course
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-10 text-gray-500">
              <FiBook className="mx-auto h-10 w-10 mb-2" />
              You have no courses enrolled.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ---------------------------- COURSE DETAIL ---------------------------- */
  const renderCourseDetail = () => {
    if (!selectedCourse) {
      return (
        <div className="flex-grow py-10 text-center text-gray-700">
          No course selected.{" "}
          <button onClick={() => setActiveTab("courses")} className="underline">
            Back to My Courses
          </button>
        </div>
      );
    }
    return (
      <div className="flex-grow py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => setActiveTab("courses")}
            className="flex items-center text-[#003DA5] mb-4"
          >
            <FiArrowLeft className="mr-1" /> Back to My Courses
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {selectedCourse.title}
          </h1>
          <p className="text-gray-500 mb-6">{selectedCourse.description}</p>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Chapters</h3>
          <ul className="space-y-4">
            {toArray(selectedCourse.chapters).map((chap, idx) => {
              const key = `chapter${idx}`;
              const done = !!userData?.completedQuizzes?.[selectedCourse.id]?.[key];
              return (
                <li
                  key={idx}
                  className="flex justify-between items-center p-4 bg-white rounded shadow hover:shadow-md transition"
                >
                  <div className="flex items-center">
                    <div
                      className={`h-8 w-8 flex items-center justify-center rounded-full ${
                        done ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {done ? <FiCheckCircle /> : idx + 1}
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-900">
                        {chap?.title || `Chapter ${idx + 1}`}
                      </p>
                      <p className="text-sm text-gray-500">{chap?.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCourse((prev) => prev); // keep
                      setSelectedChapter({ ...chap, __chapterIndex: idx }); // store index explicitly
                      setQuizIndex(0);
                      setSelectedAnswers({});
                      setSubmitted(false);
                      setActiveTab("chapterView");
                    }}
                    className="bg-[#003DA5] text-white px-3 py-1 rounded"
                  >
                    {done ? "Review" : "Start"} <FiChevronRight className="inline ml-1" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  };

  /* ----------------------------- CHAPTER VIEW ---------------------------- */
  const renderChapterView = () => {
    if (!selectedCourse || !selectedChapter) {
      return (
        <div className="flex-grow py-10 text-center text-gray-700">
          No chapter selected.{" "}
          <button onClick={() => setActiveTab("coursesDetail")} className="underline">
            Back
          </button>
        </div>
      );
    }

    const ci =
      typeof selectedChapter.__chapterIndex === "number"
        ? selectedChapter.__chapterIndex
        : Math.max(
            0,
            toArray(selectedCourse.chapters).findIndex(
              (c) => c?.title === selectedChapter?.title
            )
          );
    const chapterKey = `chapter${ci}`;
    const result = userData?.completedQuizzes?.[selectedCourse.id]?.[chapterKey];

    // Materials (normalized)
    const mats = normalizeMaterials(selectedChapter);
    const mediaYouTube = mats.find((m) => m?.type === "youtube")?.url;
    const mediaPdf = mats.find((m) => m?.type === "pdf")?.url;
    const mediaImg = mats.find((m) => m?.type === "image")?.url;
    const textBlocks = mats.filter((m) => m?.type === "text");

    // Quizzes (normalized)
    const quizzes = normalizeQuizzes(selectedChapter);
    const hasQuizzes = (quizzes?.length ?? 0) > 0;
    const activeQuiz = quizzes?.[quizIndex];
    const questions = activeQuiz?.questions || [];

    return (
      <div className="flex-grow py-6">
        <div className="max-w-3xl mx-auto px-4">
          <button
            onClick={() => setActiveTab("coursesDetail")}
            className="flex items-center text-[#003DA5] mb-4"
          >
            <FiArrowLeft className="mr-1" /> Back to Chapters
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {selectedChapter.title}
          </h1>
          <p className="text-gray-500 mb-6">{selectedCourse.title}</p>

          {/* Media */}
          {mediaYouTube && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Video Lecture</h3>
              <YouTubeViewer url={mediaYouTube} />
            </div>
          )}
          {mediaPdf && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">PDF</h3>
              <PDFViewer url={mediaPdf} />
            </div>
          )}
          {mediaImg && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Image</h3>
              <img src={mediaImg} alt="" className="rounded shadow w-full" />
            </div>
          )}

          {/* Text blocks */}
          {textBlocks.map((m, i) => (
            <div key={i} className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">{m.title}</h3>
              <div className="p-4 bg-gray-100 rounded shadow text-gray-700 whitespace-pre-wrap">
                {m.content}
              </div>
            </div>
          ))}

          {!mediaYouTube && !mediaPdf && !mediaImg && textBlocks.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <FiImage className="mx-auto h-10 w-10 mb-2" />
              No media available
            </div>
          )}

          {/* Quiz */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Chapter Quiz</h3>

            {/* Completed */}
            {result || submitted ? (
              <div className="bg-green-50 p-4 rounded shadow">
                <p className="font-medium text-green-800 flex items-center">
                  <FiCheckCircle className="mr-2" /> Chapter Completed
                </p>
                <p className="mt-2 text-gray-700">
                  {typeof (result?.score ?? null) === "number" ? (
                    <>
                      Your score:{" "}
                      <span className="font-semibold text-green-900">
                        {result?.score}%</span>
                    </>
                  ) : (
                    <>Marked complete</>
                  )}
                </p>
                {(result?.answers || []).map((ans, i) => (
                  <div key={i} className="mt-3 p-3 bg-white rounded shadow">
                    <p className="font-medium">{ans.question}</p>
                    <p>Your answer: {ans.selected}</p>
                    <p>Correct: {ans.correct}</p>
                  </div>
                ))}
                <button
                  onClick={() => setActiveTab("coursesDetail")}
                  className="mt-4 bg-[#003DA5] text-white px-4 py-2 rounded"
                >
                  Return to Course
                </button>
              </div>
            ) : hasQuizzes && questions.length > 0 ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitQuiz();
                }}
                className="space-y-6"
              >
                {activeQuiz?.title && (
                  <p className="text-sm text-gray-500">Quiz: {activeQuiz.title}</p>
                )}

                {questions.map((q, qi) => (
                  <div key={qi} className="space-y-3">
                    <p className="font-medium text-gray-900">
                      {qi + 1}. {q.question}
                    </p>
                    <div className="space-y-2">
                      {(q.options || []).map((opt, oi) => {
                        const isSelected = Number(selectedAnswers[qi]) === oi;
                        return (
                          <label
                            key={oi}
                            className={`block p-3 border rounded cursor-pointer ${
                              isSelected
                                ? "bg-blue-50 border-blue-300"
                                : "border-gray-200"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q-${qi}`}
                              value={oi}
                              checked={isSelected}
                              onChange={() =>
                                setSelectedAnswers((prev) => ({ ...prev, [qi]: oi }))
                              }
                              className="mr-2"
                            />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <button
                  type="submit"
                  className="w-full bg-[#003DA5] text-white py-2 rounded"
                >
                  Submit Answers
                </button>
              </form>
            ) : (
              // No quiz present -> allow mark complete
              <div className="text-center py-10">
                <p className="text-gray-700 mb-4">
                  No quiz for this chapter — mark it as complete to continue.
                </p>
                <button
                  onClick={async () => {
                    try {
                      await setDoc(
                        doc(db, "users", uid),
                        {
                          completedQuizzes: {
                            [selectedCourse.id]: {
                              ...userData?.completedQuizzes?.[selectedCourse.id],
                              [chapterKey]: {
                                score: 100,
                                answers: [],
                                completedAt: new Date().toISOString(),
                              },
                            },
                          },
                        },
                        { merge: true }
                      );
                      setSubmitted(true);
                    } catch {
                      alert("Failed to mark complete.");
                    }
                  }}
                  className="bg-[#003DA5] text-white px-4 py-2 rounded"
                >
                  Mark Complete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ------------------------------ Main render ---------------------------- */
  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <DashboardHeader />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#003DA5] border-t-[#FFC72C] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-700">Loading your dashboard…</p>
          </div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <DashboardHeader />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center p-6 bg-white rounded shadow">
            <p className="text-red-600 mb-4">⚠️ {error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#003DA5] text-white px-4 py-2 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SluBackground />
      <DashboardHeader />
      {activeTab === "home" && renderHome()}
      {activeTab === "courses" && renderCourses()}
      {activeTab === "coursesDetail" && renderCourseDetail()}
      {activeTab === "chapterView" && renderChapterView()}
    </div>
  );
}

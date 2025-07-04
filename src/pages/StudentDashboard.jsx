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
  FiBarChart2,
  FiChevronRight,
} from "react-icons/fi";

// YouTube helper
function getYoutubeEmbed(url) {
  if (!url) return "";
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const id = match && match[2].length === 11 ? match[2] : null;
  return id ? `https://www.youtube.com/embed/${id}` : "";
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

export default function StudentDashboard() {
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState("home");
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [userData, setUserData] = useState(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redirect if logged out
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/login");
    });
    return () => unsub();
  }, [navigate]);

  const uid = auth.currentUser?.uid;

  // Fetch user & all courses
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

  // ─── Enrolled‐Courses Logic ───────────────────────────────────────────────────
  // Convert whatever form you're storing to an array of IDs
  const enrolledIds = userData?.enrolledCourses
    ? Array.isArray(userData.enrolledCourses)
      ? userData.enrolledCourses
      : Object.keys(userData.enrolledCourses)
    : [];
  // Filter only those courses
  const myCourses = courses.filter((c) => enrolledIds.includes(c.id));

  // ─── Progress Calculations ─────────────────────────────────────────────────────
  const getOverallProgress = useCallback(() => {
    if (!myCourses.length || !userData?.completedQuizzes) return 0;
    let total = 0,
      done = 0;
    myCourses.forEach((course) => {
      const ch = course.chapters || [];
      total += ch.length;
      done += Object.keys(userData.completedQuizzes[course.id] || {}).length;
    });
    return total ? Math.floor((done / total) * 100) : 0;
  }, [myCourses, userData]);

  const getCourseProgress = useCallback(
    (courseId, chapters = []) => {
      if (!userData?.completedQuizzes) return 0;
      const done = Object.keys(userData.completedQuizzes[courseId] || {}).length;
      return chapters.length ? Math.floor((done / chapters.length) * 100) : 0;
    },
    [userData]
  );

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      alert("Failed to sign out.");
    }
  };

  const submitQuiz = async () => {
    if (!selectedAnswer) return alert("Please select an answer.");
    if (!selectedCourse || !selectedChapter)
      return alert("Missing course or chapter.");

    const chapterIndex = selectedCourse.chapters.findIndex(
      (c) => c.title === selectedChapter.title
    );
    const chapterKey = `chapter${chapterIndex}`;
    const quiz = selectedChapter.quizzes[quizIndex];
    const question = quiz?.questions?.[0];
    if (!question) return alert("Bad quiz data.");

    const isCorrect = parseInt(selectedAnswer) === question.correct;
    const payload = {
      completedQuizzes: {
        [selectedCourse.id]: {
          ...userData.completedQuizzes?.[selectedCourse.id],
          [chapterKey]: {
            score: isCorrect ? 100 : 0,
            answers: [
              {
                question: question.question,
                selected: question.options[parseInt(selectedAnswer)],
                correct: question.options[question.correct],
                isCorrect,
              },
            ],
            completedAt: new Date().toISOString(),
          },
        },
      },
    };

    try {
      await setDoc(doc(db, "users", uid), payload, { merge: true });
      setSubmitted(true);
    } catch {
      alert("Failed to submit quiz.");
    }
  };

  // ─── Header ────────────────────────────────────────────────────────────────────
  const DashboardHeader = () => (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center h-16 px-4">
        <div className="flex items-center">
          <Link to="/student">
            <img src={SluLogo} alt="SLU Logo" className="h-10" />
          </Link>
          <nav className="hidden md:flex ml-8 space-x-6">
            {[
              { key: "home", icon: <FiHome className="mr-1" />, label: "Home" },
              {
                key: "courses",
                icon: <FiBook className="mr-1" />,
                label: "My Courses",
              },
            ].map(({ key, icon, label }) => (
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
              : auth.currentUser?.email.split("@")[0]}
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

  // ─── renderHome ────────────────────────────────────────────────────────────────
  const renderHome = () => {
    const overall = getOverallProgress();
    const recent = [];

    if (userData?.completedQuizzes) {
      Object.entries(userData.completedQuizzes).forEach(
        ([courseId, chapters]) => {
          const course = courses.find((c) => c.id === courseId);
          if (!course) return;
          Object.entries(chapters).forEach(([ckey, data]) => {
            if (!data.completedAt) return;
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
        }
      );
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
                      : auth.currentUser?.email.split("@")[0]}
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
                  {myCourses.length} Course
                  {myCourses.length !== 1 ? "s" : ""}
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
                      {Object.values(userData?.completedQuizzes || {}).reduce(
                        (a, c) => a + Object.keys(c).length,
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
                              total += chap.score || 0;
                              count++;
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
                      <p className="font-medium text-[#003DA5]">
                        {act.courseTitle}
                      </p>
                      <p className="text-sm text-gray-500">
                        {act.chapterTitle}
                      </p>
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
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {course.title}
                  </h4>
                  <p className="text-sm text-gray-500 flex-grow">
                    {course.description}
                  </p>
                  <div className="mt-4">
                    <div className="text-xs text-gray-500 mb-1">
                      {getCourseProgress(
                        course.id,
                        course.chapters || []
                      )}
                      % Complete
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

  // ─── renderCourses ────────────────────────────────────────────────────────────
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

  // ─── renderCourseDetail ───────────────────────────────────────────────────────
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
          <p className="text-gray-500 mb-6">
            {selectedCourse.description}
          </p>
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Chapters
          </h3>
          <ul className="space-y-4">
            {selectedCourse.chapters?.map((chap, idx) => {
              const key = `chapter${idx}`;
              const done =
                !!userData?.completedQuizzes?.[selectedCourse.id]?.[key];
              return (
                <li
                  key={idx}
                  className="flex justify-between items-center p-4 bg-white rounded shadow hover:shadow-md transition"
                >
                  <div className="flex items-center">
                    <div
                      className={`h-8 w-8 flex items-center justify-center rounded-full ${
                        done
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {done ? <FiCheckCircle /> : idx + 1}
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-900">
                        {chap.title || `Chapter ${idx + 1}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {chap.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedChapter(chap);
                      setQuizIndex(0);
                      setSelectedAnswer("");
                      setSubmitted(false);
                      setActiveTab("chapterView");
                    }}
                    className="bg-[#003DA5] text-white px-3 py-1 rounded"
                  >
                    {done ? "Review" : "Start"}{" "}
                    <FiChevronRight className="inline ml-1" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  };

  // ─── renderChapterView ────────────────────────────────────────────────────────
 const renderChapterView = () => {
  if (!selectedCourse || !selectedChapter) {
    return (
      <div className="flex-grow py-10 text-center text-gray-700">
        No chapter selected.{" "}
        <button
          onClick={() => setActiveTab("coursesDetail")}
          className="underline"
        >
          Back
        </button>
      </div>
    );
  }

  const ci = selectedCourse.chapters.findIndex(
    (c) => c.title === selectedChapter.title
  );
  const key = `chapter${ci}`;
  const result = userData?.completedQuizzes?.[selectedCourse.id]?.[key];
  const mediaYouTube = selectedChapter.materials?.find(
    (m) => m.type === "youtube"
  )?.url;
  const mediaPdf = selectedChapter.materials?.find(
    (m) => m.type === "pdf"
  )?.url;
  const mediaImg = selectedChapter.materials?.find(
    (m) => m.type === "image"
  )?.url;

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
        {!mediaYouTube && !mediaPdf && !mediaImg && (
          <div className="text-center py-10 text-gray-500">
            <FiImage className="mx-auto h-10 w-10 mb-2" />
            No media available
          </div>
        )}

        {/* Quiz */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Chapter Quiz
          </h3>

          {result || submitted ? (
            <div className="bg-green-50 p-4 rounded shadow">
              <p className="font-medium text-green-800 flex items-center">
                <FiCheckCircle className="mr-2" /> Chapter Completed
              </p>
              <p className="mt-2 text-gray-700">
                {result?.score ? (
                  <>
                    Your score:{" "}
                    <span className="font-semibold text-green-900">
                      {result?.score}%
                    </span>
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
          ) : selectedChapter.quizzes?.length &&
            !selectedChapter.quizzes[quizIndex]?.questions?.length ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitQuiz();
              }}
              className="space-y-4"
            >
              <p className="font-medium text-gray-900">
                {selectedChapter.quizzes[quizIndex].questions[0].question}
              </p>
              <div className="space-y-2">
                {selectedChapter.quizzes[quizIndex].questions[0].options.map(
                  (opt, i) => (
                    <label
                      key={i}
                      className={`block p-3 border rounded cursor-pointer ${
                        selectedAnswer === String(i)
                          ? "bg-blue-50 border-blue-300"
                          : "border-gray-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={i}
                        checked={selectedAnswer === String(i)}
                        onChange={() => setSelectedAnswer(String(i))}
                        className="mr-2"
                      />
                      {opt}
                    </label>
                  )
                )}
              </div>
              <button
                type="submit"
                disabled={!selectedAnswer}
                className="w-full bg-[#003DA5] text-white py-2 rounded"
              >
                Submit Answer
              </button>
            </form>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-700 mb-4">
                No quiz for this chapter — mark it as complete to continue.
              </p>
              <button
                onClick={async () => {
                  if (!selectedCourse || !selectedChapter) return;
                  const chapterIndex = selectedCourse.chapters.findIndex(
                    (c) => c.title === selectedChapter.title
                  );
                  const chapterKey = `chapter${chapterIndex}`;

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
                    alert("Marked as complete!");
                    setSubmitted(true);
                  } catch {
                    alert("Failed to mark complete.");
                  }
                }}
                className="bg-[#003DA5] text-white px-4 py-2 rounded"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


  // ─── Main render ──────────────────────────────────────────────────────────────
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
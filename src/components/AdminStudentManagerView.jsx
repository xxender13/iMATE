// src/components/AdminStudentManagerView.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { FiSearch, FiUser, FiCheck, FiMail } from "react-icons/fi";

export default function AdminStudentManagerView() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);

  // Fetch courses + students
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1) courses
        const courseSnap = await getDocs(collection(db, "courses"));
        const coursesData = courseSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCourses(coursesData);

        // 2) students
        const q = query(collection(db, "users"), where("role", "==", "student"));
        const studentSnap = await getDocs(q);
        const studentsData = studentSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setStudents(studentsData);
      } catch (err) {
        console.error(err);
        setError("Failed to load student data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Toggle enrollment
  const toggleEnrollment = async (studentId, courseId, isEnrolled) => {
    const ref = doc(db, "users", studentId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return alert("Student not found");

    const enrolled = snap.data().enrolledCourses || {};
    if (isEnrolled) delete enrolled[courseId];
    else enrolled[courseId] = true;

    await updateDoc(ref, { enrolledCourses: enrolled });

    // reflect locally
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, enrolledCourses: { ...enrolled } }
          : s
      )
    );
  };

  // Combined name for display & search
  const nameOf = (s) => {
    const fn = s.firstName?.trim() || "";
    const ln = s.lastName?.trim() || "";
    return fn || ln ? `${fn} ${ln}`.trim() : "Unnamed Student";
  };

  const filtered = students.filter((s) => {
    const name = nameOf(s).toLowerCase();
    return (
      name.includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading) return <div className="loading-container">Loading student data...</div>;
  if (error) return <div className="error-container">{error}</div>;

  return (
    <div className="students-view">
      <div className="students-header">
        <div className="search-container">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="students-table-container">
        {filtered.length > 0 ? (
          <table className="students-table">
            <thead>
              <tr>
                <th className="student-col">Student</th>
                {courses.map((c) => (
                  <th key={c.id} className="course-col">
                    {c.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => {
                const enrolledCourses = student.enrolledCourses || {};
                return (
                  <tr key={student.id}>
                    <td className="student-cell">
                      <div className="student-info">
                        <div className="student-avatar">
                          <FiUser />
                        </div>
                        <div className="student-details">
                          <div className="student-name">{nameOf(student)}</div>
                          <div className="student-email">
                            <FiMail size={12} /> {student.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {courses.map((course) => {
                      const isEnrolled = !!enrolledCourses[course.id];
                      return (
                        <td key={course.id} className="enrollment-cell">
                          <button
                            className={`enrollment-toggle ${isEnrolled ? "enrolled" : ""}`}
                            onClick={() =>
                              toggleEnrollment(student.id, course.id, isEnrolled)
                            }
                          >
                            {isEnrolled ? <><FiCheck /> Enrolled</> : "Enroll"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <FiUser />
            </div>
            <h3>No Students Found</h3>
            <p>There are no students registered in the system yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

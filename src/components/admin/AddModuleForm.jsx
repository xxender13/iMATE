import { useState } from "react";
import { db, storage } from "../../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const AddModuleForm = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [video, setVideo] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [mcq, setMcq] = useState({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: "",
  });

  const [essayQuestion, setEssayQuestion] = useState("");

  const handleImageUpload = async () => {
    if (!imageFile) return "";

    const imageRef = ref(storage, `moduleImages/${Date.now()}_${imageFile.name}`);
    const snapshot = await uploadBytes(imageRef, imageFile);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !description) {
      alert("Title and description are required.");
      return;
    }

    const imageUrl = await handleImageUpload();

    const moduleData = {
      title,
      description,
      video: video || null,
      image: imageUrl || null,
      mcq: mcq.question ? mcq : null,
      essay: essayQuestion || null,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "modules"), moduleData);
      alert("Module added successfully!");
      // Reset form
      setTitle("");
      setDescription("");
      setVideo("");
      setImageFile(null);
      
      setMcq({ question: "", options: ["", "", "", ""], correctAnswer: "" });
      setEssayQuestion("");
    } catch (err) {
      console.error("Error adding module:", err);
      alert("Failed to add module.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
      <input
        className="p-2 rounded text-black"
        type="text"
        placeholder="Module Title *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <textarea
        className="p-2 rounded text-black"
        placeholder="Module Description *"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />

      <input
        className="p-2 rounded text-black"
        type="url"
        placeholder="YouTube Video Link (optional)"
        value={video}
        onChange={(e) => setVideo(e.target.value)}
      />

      <input
        className="p-2 rounded bg-white text-black"
        type="file"
        accept="image/*"
        onChange={(e) => setImageFile(e.target.files[0])}
      />

      {/* MCQ Section */}
      <div className="bg-white/10 p-4 rounded">
        <h3 className="font-bold mb-2 text-white">MCQ (optional)</h3>
        <input
          className="p-2 rounded mb-2 w-full text-black"
          type="text"
          placeholder="Question"
          value={mcq.question}
          onChange={(e) => setMcq({ ...mcq, question: e.target.value })}
        />
        {mcq.options.map((opt, i) => (
          <input
            key={i}
            className="p-2 rounded mb-1 w-full text-black"
            type="text"
            placeholder={`Option ${i + 1}`}
            value={opt}
            onChange={(e) =>
              setMcq({
                ...mcq,
                options: mcq.options.map((o, idx) => (idx === i ? e.target.value : o)),
              })
            }
          />
        ))}
        <input
          className="p-2 rounded mt-2 w-full text-black"
          type="text"
          placeholder="Correct Answer"
          value={mcq.correctAnswer}
          onChange={(e) => setMcq({ ...mcq, correctAnswer: e.target.value })}
        />
      </div>

      {/* Essay Section */}
      <textarea
        className="p-2 rounded text-black"
        placeholder="Essay Question (optional)"
        value={essayQuestion}
        onChange={(e) => setEssayQuestion(e.target.value)}
      />

      <button
        type="submit"
        className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-full font-bold text-white"
      >
        Add Module
      </button>
    </form>
  );
};

export default AddModuleForm;

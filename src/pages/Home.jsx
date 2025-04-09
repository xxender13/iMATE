import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import HeroSection from "../components/HeroSection";

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0 },
};

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen font-sans relative text-white overflow-hidden">
      {/* BACKGROUND LAYER */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]" />

      {/* HERO SECTION */}
      <section className="h-screen flex flex-col items-center justify-center text-center px-6 relative z-20">
        <motion.h1
          className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.6 }}
        >
          Your Journey to the U.S. Starts Here ✈️
        </motion.h1>
        <motion.p
          className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Empowering first-generation international students with the tools,
          knowledge, and guidance they need to thrive.
        </motion.p>
        <motion.div
          className="mt-8"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <button
            onClick={() => navigate("/iMATE/about")}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-medium transition-all shadow-lg"
          >
            Get to Know Us More
          </button>
        </motion.div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-24 px-6 max-w-7xl mx-auto relative z-20">
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-center mb-12"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Why Choose Us?
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            {
              title: "Course-based Learning",
              desc: "Interactive modules on U.S. travel, culture, visas, and campus life.",
            },
            {
              title: "Step-by-step Planning",
              desc: "Checklists, timelines, and tools for stress-free preparation.",
            },
            {
              title: "Student & Admin Support",
              desc: "Dual login, track progress, and personalize documents.",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              className="bg-white/10 backdrop-blur-md p-8 rounded-xl shadow-md hover:scale-105 transition border border-white/10"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 * i }}
            >
              <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
              <p className="text-gray-300">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CALL TO ACTION */}
      <motion.section
        className="py-16 bg-blue-700 text-center relative z-20"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Join the Portal Today</h2>
        <p className="text-gray-100 mb-6 max-w-xl mx-auto">
          Whether you're a new student or an admin looking to support them — we’ve got the tools you need.
        </p>
        <button
          onClick={() => navigate("/iMATE/login")}
          className="bg-black hover:bg-gray-900 px-6 py-3 rounded-xl font-medium transition"
        >
          Log In
        </button>
      </motion.section>

      {/* HERO 3D BACKGROUND */}
      <div className="absolute inset-0 z-10 opacity-20 pointer-events-none">
        <HeroSection />
      </div>
    </div>
  );
};

export default Home;

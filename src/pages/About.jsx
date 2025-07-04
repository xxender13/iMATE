import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0 },
};

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white px-6 py-16">
      <div className="max-w-5xl mx-auto">
        
        <motion.h1
          className="text-4xl md:text-5xl font-bold text-center mb-10"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          transition={{ duration: 0.6 }}
        >
          About <span className="text-blue-500">Immigration Portal</span>
        </motion.h1>

        {/* Mission */}
        <motion.section
          className="mb-16"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-2xl font-semibold mb-4 text-blue-400">🌍 Our Mission</h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            We are building the future of global student onboarding...
          </p>
        </motion.section>

        {/* Why It Matters */}
        <motion.section
          className="mb-16"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-2xl font-semibold mb-4 text-blue-400">💡 Why It Matters</h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            Moving to a new country for education is exciting — and overwhelming...
          </p>
        </motion.section>

        {/* What Makes Us Different */}
        <motion.section
          className="mb-16"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="text-2xl font-semibold mb-4 text-blue-400">🚀 What Makes Us Different</h2>
          <ul className="list-disc list-inside text-gray-300 text-lg space-y-2">
            <li>Modular onboarding</li>
            <li>Smart checklists</li>
            <li>Dual dashboards</li>
            <li>Document center</li>
            <li>Built by international students</li>
          </ul>
        </motion.section>

        {/* Closing */}
        <motion.section
          className="text-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-2xl font-semibold mb-4 text-blue-400">✨ Built for the Brave</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Immigration Portal is more than software — it’s your onboarding ally...
          </p>
        </motion.section>
      </div>
    </div>
  );
};

export default About;

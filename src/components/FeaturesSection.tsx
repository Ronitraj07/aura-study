import { motion } from "framer-motion";
import {
  Presentation,
  FileText,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Presentation,
    title: "PPT Generator",
    description: "Create stunning presentations instantly — basic or high-quality, your choice.",
  },
  {
    icon: Zap,
    title: "HQ Presentations",
    description: "Premium slide decks with polished layouts, charts, and professional design.",
  },
  {
    icon: FileText,
    title: "Assignment Generator",
    description: "Auto-generate well-structured assignments from topics or prompts.",
  },
  {
    icon: BookOpen,
    title: "Notes Generator",
    description: "Turn lectures and topics into concise, study-ready notes in seconds.",
  },
  {
    icon: CalendarDays,
    title: "Timetable Builder",
    description: "Organize your week with a smart, drag-and-drop timetable planner.",
  },
  {
    icon: CheckSquare,
    title: "Checklist Manager",
    description: "Track tasks, deadlines, and goals with an intuitive checklist system.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="relative py-32">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Everything you <span className="gradient-text">need</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Powerful AI tools designed to supercharge your academic workflow.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card rounded-2xl p-6 group glow-hover cursor-default"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300"
                style={{ background: "var(--gradient-subtle)" }}
              >
                <feature.icon className="w-6 h-6 text-primary group-hover:text-accent transition-colors duration-300" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

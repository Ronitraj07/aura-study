import { motion } from "framer-motion";
import { Presentation, FileText, BookOpen, CalendarDays, ArrowRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const quickActions = [
  {
    title: "Generate PPT",
    description: "Create stunning presentations with AI",
    icon: Presentation,
    to: "/dashboard/ppt",
    gradient: "linear-gradient(135deg, hsl(262, 80%, 60%), hsl(280, 70%, 50%))",
  },
  {
    title: "Write Assignment",
    description: "Auto-generate structured assignments",
    icon: FileText,
    to: "/dashboard/assignments",
    gradient: "linear-gradient(135deg, hsl(220, 85%, 60%), hsl(200, 80%, 50%))",
  },
  {
    title: "Create Notes",
    description: "Turn topics into study-ready notes",
    icon: BookOpen,
    to: "/dashboard/notes",
    gradient: "linear-gradient(135deg, hsl(160, 70%, 45%), hsl(180, 60%, 40%))",
  },
  {
    title: "Build Timetable",
    description: "Organize your weekly schedule",
    icon: CalendarDays,
    to: "/dashboard/timetable",
    gradient: "linear-gradient(135deg, hsl(30, 80%, 55%), hsl(15, 75%, 50%))",
  },
];

const recentActivity = [
  { action: "Generated PPT", subject: "Data Structures - Linked Lists", time: "2 hours ago" },
  { action: "Created Notes", subject: "Operating Systems - Process Scheduling", time: "5 hours ago" },
  { action: "Completed Assignment", subject: "DBMS - Normalization", time: "1 day ago" },
  { action: "Updated Timetable", subject: "Added Thursday lab session", time: "2 days ago" },
  { action: "Checked off", subject: "Submit ML Project Report", time: "3 days ago" },
];

const Dashboard = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-display text-3xl md:text-4xl font-bold">
          Welcome back, <span className="gradient-text">Ronit</span>
        </h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your academic workflow.</p>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + index * 0.08 }}
          >
            <Link
              to={action.to}
              className="block glass-card rounded-2xl p-5 group glow-hover transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: action.gradient }}
              >
                <action.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1">{action.title}</h3>
              <p className="text-xs text-muted-foreground mb-3">{action.description}</p>
              <span className="inline-flex items-center gap-1 text-xs text-primary font-medium group-hover:gap-2 transition-all">
                Open <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="glass-card rounded-2xl p-6"
      >
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Recent Activity
        </h2>
        <div className="space-y-1">
          {recentActivity.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm text-foreground font-medium truncate">
                  {item.action}
                </p>
                <p className="text-xs text-muted-foreground truncate">{item.subject}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{item.time}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;

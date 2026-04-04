import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldX, Mail, ArrowRight, Chrome } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [isRestricted, setIsRestricted] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-6">
      <div className="hero-glow bg-primary/20 top-1/4 left-1/4 animate-pulse-glow" />
      <div className="hero-glow bg-accent/15 bottom-1/4 right-1/4 animate-pulse-glow" style={{ animationDelay: "2s" }} />

      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <AnimatePresence mode="wait">
        {!isRestricted ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 glass-card rounded-2xl p-8 w-full max-w-md"
          >
            {/* Glow border accent */}
            <div className="absolute -inset-[1px] rounded-2xl opacity-50 pointer-events-none" style={{ background: "var(--gradient-primary)", mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", maskComposite: "exclude", WebkitMaskComposite: "xor", padding: "1px" }} />

            <div className="text-center mb-8">
              <h1 className="font-display text-3xl font-bold gradient-text mb-2">Welcome Back</h1>
              <p className="text-sm text-muted-foreground">Sign in to continue</p>
            </div>

            {/* Google Sign-In */}
            <button
              type="button"
              onClick={() => setEmail("student@university.edu")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm font-medium hover:bg-secondary/80 hover:border-primary/30 transition-all duration-300 group mb-6"
            >
              <Chrome className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              Sign in with Google
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or continue with email</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Email field */}
            <div className="mb-4">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="mb-6">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all"
              />
            </div>

            {/* Continue button */}
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-display font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_hsl(262,80%,60%,0.3)] group"
              style={{ background: "var(--gradient-primary)" }}
            >
              Continue
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="text-xs text-muted-foreground text-center mt-6">
              Don't have an account?{" "}
              <span className="text-primary cursor-pointer hover:underline">Sign up</span>
            </p>

            {/* Dev toggle for restricted state */}
            <button
              type="button"
              onClick={() => setIsRestricted(true)}
              className="absolute top-3 right-3 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
              title="Toggle restricted state"
            >
              <ShieldX className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="restricted"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 glass-card rounded-2xl p-8 w-full max-w-md text-center"
          >
            <div className="absolute -inset-[1px] rounded-2xl opacity-40 pointer-events-none" style={{ background: "linear-gradient(135deg, hsl(0, 70%, 55%), hsl(30, 80%, 55%))", mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", maskComposite: "exclude", WebkitMaskComposite: "xor", padding: "1px" }} />

            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-destructive/10 border border-destructive/20">
              <ShieldX className="w-8 h-8 text-destructive" />
            </div>

            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Access Restricted</h1>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              Your account does not have permission to access this resource. Please contact your administrator.
            </p>

            <button
              type="button"
              onClick={() => setIsRestricted(false)}
              className="px-6 py-3 rounded-xl font-display font-medium text-sm bg-secondary border border-border text-foreground hover:bg-secondary/80 hover:border-primary/30 transition-all duration-300"
            >
              Back to Sign In
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;

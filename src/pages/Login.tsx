const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="hero-glow bg-primary/20 top-1/3 left-1/3 animate-pulse-glow" />
      <div className="hero-glow bg-accent/15 bottom-1/3 right-1/3 animate-pulse-glow" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 glass-card rounded-2xl p-8 w-full max-w-md mx-6">
        <h1 className="font-display text-2xl font-bold text-center mb-2 gradient-text">Welcome Back</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">Sign in to your StudyAI account</p>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
            <input
              type="email"
              placeholder="you@university.edu"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg font-display font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.02]"
            style={{ background: "var(--gradient-primary)" }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

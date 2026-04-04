import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, User } from "lucide-react";

const TopBar = () => {
  return (
    <header className="h-14 flex items-center justify-between border-b border-border/50 px-4 glass-card">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
      </div>

      <div className="flex items-center gap-3">
        <button className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-secondary border border-border hover:bg-secondary/80 transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
        </button>

        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-secondary border border-border">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <User className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-none">Ronit</p>
            <p className="text-xs text-muted-foreground">Student</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, List, Calendar, LogIn, Users, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState } from "react";

interface NavbarProps {
  user: any;
}

export const Navbar = ({ user }: NavbarProps) => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const { data, error } = await (supabase as any).rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        if (!error && data) {
          setIsAdmin(true);
        }
      } else {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [user]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      navigate("/auth");
      toast.success("Signed out successfully");
    }
  };

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-accent">
            StageTracker
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/browse">
              <Button variant="ghost" size="sm" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Browse
              </Button>
            </Link>
            {user ? (
              <>
                <Link to="/feed">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Users className="h-4 w-4" />
                    Feed
                  </Button>
                </Link>
                <Link to="/my-shows">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <List className="h-4 w-4" />
                    My Shows
                  </Button>
                </Link>
                <Link to="/diary">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    Diary
                  </Button>
                </Link>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Shield className="h-4 w-4" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

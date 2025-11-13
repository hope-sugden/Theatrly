import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { BookOpen, List, Calendar, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import heroStage from "@/assets/hero-stage.jpeg";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <main>
        <section 
          className="relative py-32 px-4"
          style={{
            backgroundImage: `url(${heroStage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" />
          
          <div className="container mx-auto text-center relative z-10">
            <h1 className="text-6xl md:text-7xl font-bold mb-6 text-accent">
              Theatrly
            </h1> 
            <p className="text-xl md:text-2xl text-foreground/90 mb-8 max-w-2xl mx-auto">
              Track every theatrical moment. Your personal diary for live performances.
            </p>
            
            {user ? (
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/browse">
                  <Button size="lg" className="gap-2">
                    <BookOpen className="h-5 w-5" />
                    Browse Shows
                  </Button>
                </Link>
                <Link to="/my-shows">
                  <Button size="lg" variant="outline" className="gap-2">
                    <List className="h-5 w-5" />
                    My Shows
                  </Button>
                </Link>
              </div>
            ) : (
              <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
                Get Started
              </Button>
            )}
          </div>
        </section>

        <section className="py-20 px-4 bg-card/30">
          <div className="container mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
              Features
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6 rounded-lg bg-card hover:shadow-[var(--shadow-dramatic)] transition-all">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-accent" />
                <h3 className="text-xl font-semibold mb-2">Browse Catalog</h3>
                <p className="text-muted-foreground">
                  Explore shows or add new ones to the growing catalog
                </p>
              </div>
              
              <div className="text-center p-6 rounded-lg bg-card hover:shadow-[var(--shadow-dramatic)] transition-all">
                <List className="h-12 w-12 mx-auto mb-4 text-accent" />
                <h3 className="text-xl font-semibold mb-2">Track Your Shows</h3>
                <p className="text-muted-foreground">
                  Mark shows as seen or add them to your want-to-see list
                </p>
              </div>
              
              <div className="text-center p-6 rounded-lg bg-card hover:shadow-[var(--shadow-dramatic)] transition-all">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-accent" />
                <h3 className="text-xl font-semibold mb-2">Theatre Diary</h3>
                <p className="text-muted-foreground">
                  View your theatrical journey on a beautiful calendar
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;

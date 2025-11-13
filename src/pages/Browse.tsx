import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { ShowCard } from "@/components/ShowCard";
import { AddShowDialog } from "@/components/AddShowDialog";
import { ShowDetailsModal } from "@/components/ShowDetailsModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const Browse = () => {
  const [user, setUser] = useState<any>(null);
  const [shows, setShows] = useState<any[]>([]);
  const [filteredShows, setFilteredShows] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedShow, setSelectedShow] = useState<any>(null);
  const [showDetailsOpen, setShowDetailsOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchShows();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredShows(shows);
    } else {
      setFilteredShows(
        shows.filter((show) =>
          show.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, shows]);

  const fetchShows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shows')
      .select('*')
      .order('title', { ascending: true }); 

    if (error) {
      toast.error("Error fetching shows");
      console.error(error);
    } else {
      setShows(data || []);
      setFilteredShows(data || []);
    }
    setLoading(false);
  };

  const handleShowClick = (show: any) => {
    setSelectedShow(show);
    setShowDetailsOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-foreground">Browse Shows</h1>
            <p className="text-muted-foreground">Discover and track theatre performances</p>
          </div>
          <AddShowDialog onShowAdded={fetchShows} />
        </div>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading shows...</p>
        ) : filteredShows.length === 0 ? (
          <p className="text-center text-muted-foreground">
            {searchQuery ? "No shows found matching your search" : "No shows yet. Add the first one!"}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredShows.map((show) => (
              <div key={show.id} onClick={() => handleShowClick(show)} className="cursor-pointer">
                <ShowCard 
                  show={show} 
                  showActions={false}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <ShowDetailsModal
        show={selectedShow}
        open={showDetailsOpen}
        onOpenChange={setShowDetailsOpen}
      />
    </div>
  );
};

export default Browse;

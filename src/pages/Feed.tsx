import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ActivityFeedItem } from "@/components/ActivityFeedItem";
import { FriendsList } from "@/components/FriendsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

const Feed = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchActivities(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchActivities(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchActivities = async (userId: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from('activities')
      .select(`
        id,
        activity_type,
        created_at,
        user_id,
        show_id,
        user_show_id,
        shows (
          id,
          title,
          photo_url
        ),
        profiles!activities_user_id_fkey (
          username
        ),
        user_shows (
          rating,
          review,
          city,
          date_seen
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      toast.error("Error fetching activity feed");
      console.error(error);
    } else {
      setActivities(data || []);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Feed</h1>

        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="feed">Activity Feed</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
          </TabsList>

          <TabsContent value="feed">
            {loading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No activities yet</p>
                <p className="text-sm text-muted-foreground">Add friends to see their activities here!</p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-6">
                {activities.map((activity) => (
                  <ActivityFeedItem
                    key={activity.id}
                    activity={activity}
                    currentUserId={user?.id}
                    onUpdate={() => fetchActivities(user.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="friends">
            <FriendsList userId={user?.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Feed;
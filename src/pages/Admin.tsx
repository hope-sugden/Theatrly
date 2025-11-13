import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PendingShow {
  id: string;
  title: string;
  photo_url: string;
  description: string | null;
  submitter_email: string | null;
  created_at: string;
}

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingShows, setPendingShows] = useState<PendingShow[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user is admin
    const { data: roleData } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleData) {
      setIsAdmin(true);
      fetchPendingShows();
    } else {
      toast.error("You do not have admin permissions");
      navigate("/");
    }
    setLoading(false);
  };

  const fetchPendingShows = async () => {
    const { data, error } = await (supabase as any)
      .from("shows")
      .select("id,title,photo_url,description,submitter_email,created_at")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending shows:", error);
      toast.error("Failed to load pending shows");
    } else {
      setPendingShows(data || []);
    }
  };

  const handleApprove = async (show: PendingShow) => {
    const { error } = await supabase
      .from("shows")
      .update({ approval_status: "approved" } as any)
      .eq("id", show.id);

    if (error) {
      toast.error("Failed to approve show");
      console.error(error);
      return;
    }

    // Send approval email to submitter
    if (show.submitter_email) {
      try {
        await supabase.functions.invoke("send-show-notification", {
          body: {
            type: "show_approved",
            showTitle: show.title,
            submitterEmail: show.submitter_email,
          },
        });
      } catch (error) {
        console.error("Failed to send approval email:", error);
      }
    }

    toast.success("Show approved!");
    fetchPendingShows();
  };

  const handleReject = async (showId: string) => {
    const { error } = await supabase
      .from("shows")
      .update({ approval_status: "rejected" } as any)
      .eq("id", showId);

    if (error) {
      toast.error("Failed to reject show");
      console.error(error);
      return;
    }

    toast.success("Show rejected");
    fetchPendingShows();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Pending Show Approvals ({pendingShows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingShows.length === 0 ? (
              <p className="text-muted-foreground">No pending shows to approve</p>
            ) : (
              <div className="space-y-4">
                {pendingShows.map((show) => (
                  <Card key={show.id}>
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <img
                          src={show.photo_url}
                          alt={show.title}
                          className="w-32 h-48 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-2">{show.title}</h3>
                          {show.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {show.description}
                            </p>
                          )}
                          {show.submitter_email && (
                            <p className="text-sm text-muted-foreground mb-2">
                              Submitted by: {show.submitter_email}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mb-4">
                            Submitted: {new Date(show.created_at).toLocaleDateString()}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleApprove(show)}
                              className="gap-2"
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReject(show.id)}
                              variant="destructive"
                              className="gap-2"
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;

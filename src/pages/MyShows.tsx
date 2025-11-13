import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { ShowCard } from "@/components/ShowCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { z } from "zod";
import { StarRating } from "@/components/StarRating";

const MyShows = () => {
  const [user, setUser] = useState<any>(null);
  const [seenShows, setSeenShows] = useState<any[]>([]);
  const [wantToSeeShows, setWantToSeeShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShow, setSelectedShow] = useState<any>(null);
  const [showDetailsOpen, setShowDetailsOpen] = useState(false);
  const [editRating, setEditRating] = useState(0);
  const [editReview, setEditReview] = useState("");
  const [editPrivateNotes, setEditPrivateNotes] = useState("");
  const [editContainsSpoilers, setEditContainsSpoilers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserShows(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserShows(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserShows = async (userId: string) => {
    setLoading(true);

    const { data: seenData, error: seenError } = await supabase
      .from('user_shows')
      .select(`
        id,
        date_seen,
        rating,
        review,
        city,
        private_notes,
        contains_spoilers,
        shows (
          id,
          title,
          photo_url,
          description
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'seen')
      .order('date_seen', { ascending: false });

    const { data: wantData, error: wantError } = await supabase
      .from('user_shows')
      .select(`
        id,
        shows (
          id,
          title,
          photo_url
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'want_to_see')
      .order('created_at', { ascending: false });

    if (seenError || wantError) {
      toast.error("Error fetching your shows");
    } else {
      setSeenShows(seenData || []);
      setWantToSeeShows(wantData || []);
    }

    setLoading(false);
  };

  const handleRemove = async (userShowId: string) => {
    const { error } = await supabase
      .from('user_shows')
      .delete()
      .eq('id', userShowId);

    if (error) {
      toast.error("Error removing show");
    } else {
      toast.success("Show removed from list");
      if (user) fetchUserShows(user.id);
    }
  };

  const handleShowClick = (userShow: any) => {
    setSelectedShow(userShow);
    setEditRating(userShow.rating || 0);
    setEditReview(userShow.review || "");
    setEditPrivateNotes(userShow.private_notes || "");
    setEditContainsSpoilers(userShow.contains_spoilers || false);
    setShowDetailsOpen(true);
  };

  const reviewSchema = z.object({
    rating: z.number().min(0).max(5),
    review: z.string().max(2000, { message: "Review must be less than 2000 characters" }),
    private_notes: z.string().max(1000, { message: "Private notes must be less than 1000 characters" })
  });

  const handleSave = async () => {
    if (!selectedShow) return;

    try {
      // Validate input
      reviewSchema.parse({
        rating: editRating,
        review: editReview,
        private_notes: editPrivateNotes
      });

      setSaving(true);

      const { error } = await supabase
        .from('user_shows')
        .update({
          rating: editRating > 0 ? editRating : null,
          review: editReview.trim() || null,
          private_notes: editPrivateNotes.trim() || null,
          contains_spoilers: editContainsSpoilers
        })
        .eq('id', selectedShow.id);

      if (error) {
        toast.error("Error updating show details");
        console.error(error);
      } else {
        toast.success("Show details updated successfully!");
        setShowDetailsOpen(false);
        if (user) fetchUserShows(user.id);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Error updating show details");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!selectedShow) return;

    const { error } = await supabase
      .from('user_shows')
      .delete()
      .eq('id', selectedShow.id);

    if (error) {
      toast.error("Error deleting entry");
      console.error(error);
    } else {
      toast.success("Entry deleted successfully!");
      setShowDetailsOpen(false);
      setDeleteDialogOpen(false);
      if (user) fetchUserShows(user.id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-foreground">My Shows</h1>

        <Tabs defaultValue="seen" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="seen">Seen ({seenShows.length})</TabsTrigger>
            <TabsTrigger value="want">Want to See ({wantToSeeShows.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="seen" className="mt-6">
            {loading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : seenShows.length === 0 ? (
              <p className="text-center text-muted-foreground">No shows in your seen list yet</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {seenShows.map((userShow) => (
                  <div key={userShow.id} onClick={() => handleShowClick(userShow)}>
                    <ShowCard 
                      show={userShow.shows}
                      onRemove={() => handleRemove(userShow.id)}
                      showActions={false}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="want" className="mt-6">
            {loading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : wantToSeeShows.length === 0 ? (
              <p className="text-center text-muted-foreground">No shows in your want to see list yet</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {wantToSeeShows.map((userShow) => (
                  <ShowCard 
                    key={userShow.id} 
                    show={userShow.shows}
                    onRemove={() => handleRemove(userShow.id)}
                    showActions={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showDetailsOpen} onOpenChange={setShowDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedShow?.shows?.title}</DialogTitle>
          </DialogHeader>

          {selectedShow && (
            <div className="space-y-6">
              <img 
                src={selectedShow.shows.photo_url} 
                alt={selectedShow.shows.title}
                className="w-full h-64 object-cover rounded-lg"
              />

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">Date Seen</h3>
                  <p className="text-muted-foreground">
                    {selectedShow.date_seen ? new Date(selectedShow.date_seen + 'T00:00:00').toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Not specified'}
                  </p>
                </div>

                {selectedShow.city && (
                  <div>
                    <h3 className="font-semibold mb-1">City</h3>
                    <p className="text-muted-foreground">{selectedShow.city}</p>
                  </div>
                )}

                <div>
                  <Label className="font-semibold mb-2 block">Your Rating</Label>
                  <div className="flex items-center gap-2">
                    <StarRating rating={editRating} onRatingChange={setEditRating} />
                    {editRating > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditRating(0)}
                        className="ml-2 h-6 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="review" className="font-semibold mb-2 block">Your Review (Public)</Label>
                  <Textarea
                    id="review"
                    value={editReview}
                    onChange={(e) => setEditReview(e.target.value)}
                    placeholder="Share your thoughts about this show..."
                    className="min-h-[100px]"
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{editReview.length}/2000</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      id="spoilers"
                      checked={editContainsSpoilers}
                      onCheckedChange={(checked) => setEditContainsSpoilers(checked as boolean)}
                    />
                    <Label htmlFor="spoilers" className="text-sm cursor-pointer">
                      Contains spoilers
                    </Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="private-notes" className="font-semibold mb-2 block">Private Notes</Label>
                  <Textarea
                    id="private-notes"
                    value={editPrivateNotes}
                    onChange={(e) => setEditPrivateNotes(e.target.value)}
                    placeholder="Personal notes (only visible to you)..."
                    className="min-h-[100px]"
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{editPrivateNotes.length}/1000</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="destructive" 
              onClick={() => setDeleteDialogOpen(true)} 
              disabled={saving}
              className="sm:mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Entry
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDetailsOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Diary Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this diary entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyShows;

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { z } from "zod";
import { StarRating } from "@/components/StarRating";

const Diary = () => {
  const [user, setUser] = useState<any>(null);
  const [seenShows, setSeenShows] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showsOnDate, setShowsOnDate] = useState<any[]>([]);
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
        fetchSeenShows(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchSeenShows(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      filterShowsByDate(selectedDate);
    }
  }, [selectedDate, seenShows]);

  const fetchSeenShows = async (userId: string) => {
    const { data, error } = await supabase
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
      .not('date_seen', 'is', null)
      .order('date_seen', { ascending: false });

    if (error) {
      toast.error("Error fetching your diary");
      console.error(error);
    } else {
      setSeenShows(data || []);
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
        toast.error("Error updating entry");
        console.error(error);
      } else {
        toast.success("Entry updated successfully!");
        setShowDetailsOpen(false);
        if (user) fetchSeenShows(user.id);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Error updating entry");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
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
      if (user) fetchSeenShows(user.id);
    }
  };

  const filterShowsByDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const filtered = seenShows.filter(show => show.date_seen === dateStr);
    setShowsOnDate(filtered);
  };

  const getDatesWithShows = () => {
    return seenShows.map(show => new Date(show.date_seen + 'T00:00:00'));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-foreground">My Theatre Diary</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={{
                  hasShow: getDatesWithShows(),
                }}
                modifiersStyles={{
                  hasShow: {
                    fontWeight: 'bold',
                    backgroundColor: 'hsl(var(--accent))',
                    color: 'hsl(var(--accent-foreground))',
                  },
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate ? selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Select a date'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showsOnDate.length === 0 ? (
                <p className="text-muted-foreground">No shows seen on this date</p>
              ) : (
                <div className="space-y-4">
                  {showsOnDate.map((userShow) => (
                    <div 
                      key={userShow.id} 
                      className="flex gap-4 items-start cursor-pointer hover:bg-accent/10 p-2 rounded transition-colors"
                      onClick={() => handleShowClick(userShow)}
                    >
                      <img 
                        src={userShow.shows.photo_url} 
                        alt={userShow.shows.title}
                        className="w-20 h-28 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{userShow.shows.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Seen on {new Date(userShow.date_seen + 'T00:00:00').toLocaleDateString()}
                        </p>
                        {userShow.rating && (
                          <div className="mt-1">
                            <StarRating rating={userShow.rating} readonly size="sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">All Seen Shows</h2>
          <div className="space-y-2">
            {seenShows.map((userShow) => (
              <div 
                key={userShow.id} 
                className="flex gap-4 items-center p-4 rounded-lg bg-card hover:bg-accent/10 transition-colors cursor-pointer"
                onClick={() => handleShowClick(userShow)}
              >
                <img 
                  src={userShow.shows.photo_url} 
                  alt={userShow.shows.title}
                  className="w-16 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{userShow.shows.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(userShow.date_seen + 'T00:00:00').toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  {userShow.rating && (
                    <div className="mt-1">
                      <StarRating rating={userShow.rating} readonly size="sm" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
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
                    {new Date(selectedShow.date_seen + 'T00:00:00').toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Diary;

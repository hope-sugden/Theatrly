import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { StarRating } from "@/components/StarRating";
import { AddDiaryEntryDialog } from "@/components/AddDiaryEntryDialog";

interface Review {
  id: string;
  rating: number | null;
  review: string | null;
  city: string | null;
  date_seen: string | null;
  is_anonymous: boolean;
  contains_spoilers: boolean;
  username: string | null;
}

interface Show {
  id: string;
  title: string;
  photo_url: string;
  description?: string | null;
}

export default function ShowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [show, setShow] = useState<Show | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    if (id) {
      fetchShowData();
    }
  }, [id]);

  const fetchShowData = async () => {
    if (!id) return;

    setLoading(true);
    
    // Fetch show details
    const { data: showData, error: showError } = await supabase
      .from('shows')
      .select('*')
      .eq('id', id)
      .single();

    if (showError || !showData) {
      toast.error("Show not found");
      navigate('/browse');
      return;
    }

    setShow(showData);

    // Fetch reviews
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('public_reviews')
      .select('*')
      .eq('show_id', id)
      .order('date_seen', { ascending: false });

    if (!reviewsError) {
      setReviews(reviewsData || []);
      const uniqueCities = [...new Set((reviewsData || []).map(r => r.city).filter(Boolean))] as string[];
      setCities(uniqueCities);
    }

    setLoading(false);
  };

  const handleAddToWantToSee = async () => {
    if (!user) {
      toast.error("Please log in to add shows to your list");
      navigate('/auth');
      return;
    }

    const { data: userShowData, error } = await supabase
      .from('user_shows')
      .insert({
        show_id: id,
        user_id: user.id,
        status: 'want_to_see',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error("You've already added this show");
      } else {
        toast.error("Error adding show to your list");
        console.error(error);
      }
    } else {
      await supabase.from('activities').insert({
        user_id: user.id,
        show_id: id,
        activity_type: 'want_to_see',
        user_show_id: userShowData.id
      });
      toast.success("Added to Want to See list!");
    }
  };

  const toggleSpoiler = (reviewId: string) => {
    setRevealedSpoilers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="container mx-auto p-6">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="container mx-auto p-6">
          <p>Show not found</p>
        </div>
      </div>
    );
  }

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.filter(r => r.rating).length
    : 0;

  const filteredReviews = (selectedCity === "all" 
    ? reviews 
    : reviews.filter(r => r.city === selectedCity)).filter(r => r.review && r.review.trim().length > 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <div className="container mx-auto p-6 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/browse')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Browse
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-4">{show.title}</h1>
            <img 
              src={show.photo_url} 
              alt={show.title}
              className="w-full h-64 object-cover rounded-lg"
            />
          </div>

          {show.description && (
            <div>
              <h2 className="text-xl font-semibold mb-2">About</h2>
              <p className="text-muted-foreground">{show.description}</p>
            </div>
          )}

          {user && (
            <div className="flex gap-2">
              <Button onClick={handleAddToWantToSee} variant="outline" className="flex-1 gap-2">
                <Plus className="h-4 w-4" />
                Want to See
              </Button>
              <Button onClick={() => setShowAddDialog(true)} className="flex-1 gap-2">
                <Plus className="h-4 w-4" />
                Add to My Diary
              </Button>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Reviews</h2>
              {cities.length > 0 && (
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {reviews.filter(r => r.rating).length > 0 && (
              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <StarRating rating={averageRating} readonly size="sm" />
                <span className="font-semibold">{averageRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">
                  ({reviews.filter(r => r.rating).length} {reviews.filter(r => r.rating).length === 1 ? 'rating' : 'ratings'})
                </span>
              </div>
            )}

            {filteredReviews.length === 0 ? (
              <p className="text-muted-foreground">No reviews yet for this show{selectedCity !== "all" ? ` in ${selectedCity}` : ""}.</p>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">
                            {review.is_anonymous ? "Anonymous" : review.username || "User"}
                          </p>
                          {review.city && (
                            <p className="text-sm text-muted-foreground">{review.city}</p>
                          )}
                          {review.date_seen && (
                            <p className="text-sm text-muted-foreground">
                              {new Date(review.date_seen).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {review.rating && (
                          <StarRating rating={review.rating} readonly size="sm" />
                        )}
                      </div>

                      {review.contains_spoilers ? (
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSpoiler(review.id)}
                            className="gap-2"
                          >
                            {revealedSpoilers.has(review.id) ? (
                              <>
                                <EyeOff className="h-4 w-4" />
                                Hide Spoilers
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4" />
                                Reveal Spoilers
                              </>
                            )}
                          </Button>
                          {revealedSpoilers.has(review.id) && (
                            <p className="text-sm">{review.review}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm">{review.review}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {show && (
        <AddDiaryEntryDialog
          show={{ id: show.id, title: show.title }}
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onEntryAdded={fetchShowData}
        />
      )}
    </div>
  );
}

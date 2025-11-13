import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/StarRating";

interface AddDiaryEntryDialogProps {
  show: {
    id: string;
    title: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryAdded?: () => void;
}

export const AddDiaryEntryDialog = ({ show, open, onOpenChange, onEntryAdded }: AddDiaryEntryDialogProps) => {
  const [date, setDate] = useState<Date>();
  const [city, setCity] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(0);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to add diary entries");
      setLoading(false);
      return;
    }

    if (!date || !city) {
      toast.error("Please fill in all required fields");
      setLoading(false);
      return;
    }

    const { data: userShowData, error } = await supabase
      .from('user_shows')
      .insert({
        show_id: show.id,
        user_id: user.id,
        status: 'seen',
        date_seen: format(date, 'yyyy-MM-dd'),
        city,
        private_notes: privateNotes || null,
        review: review || null,
        rating: rating > 0 ? rating : null,
        is_anonymous: isAnonymous,
        contains_spoilers: containsSpoilers
      })
      .select()
      .single();

    if (error) {
      toast.error("Error adding diary entry");
      console.error(error);
    } else {
      // Create activity for this action
      const activityType = review ? 'review' : 'seen';
      await supabase.from('activities').insert({
        user_id: user.id,
        show_id: show.id,
        activity_type: activityType,
        user_show_id: userShowData.id
      });

      toast.success("Diary entry added successfully!");
      setDate(undefined);
      setCity("");
      setPrivateNotes("");
      setReview("");
      setRating(0);
      setIsAnonymous(false);
      setContainsSpoilers(false);
      onOpenChange(false);
      onEntryAdded?.();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add "{show.title}" to Diary</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">Date Seen *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., New York, London, Sydney"
              required
            />
          </div>

          <div>
            <Label htmlFor="privateNotes">Private Notes</Label>
            <Textarea
              id="privateNotes"
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              placeholder="Your personal notes (only you can see these)"
              rows={3}
            />
          </div>

          <div>
            <Label>Rating</Label>
            <div className="mt-2">
              <StarRating 
                rating={rating} 
                onRatingChange={setRating}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="review">Public Review (Optional)</Label>
            <Textarea
              id="review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your thoughts about the show..."
              rows={4}
            />
            <p className="text-sm text-muted-foreground mt-1">
              ⚠️ Anything written in the review will be made public on the app
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
            />
            <Label htmlFor="anonymous" className="cursor-pointer">
              Post review anonymously (your username won't be shown)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="spoilers"
              checked={containsSpoilers}
              onCheckedChange={(checked) => setContainsSpoilers(checked as boolean)}
            />
            <Label htmlFor="spoilers" className="cursor-pointer">
              This review contains spoilers
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add to Diary"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddShowDialogProps {
  onShowAdded?: () => void;
}

export const AddShowDialog = ({ onShowAdded }: AddShowDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to add shows");
      setLoading(false);
      return;
    }

    // Get user email
    const userEmail = user.email || "";

    const { data: showData, error } = await supabase
      .from('shows')
      .insert({
        title,
        photo_url: photoUrl,
        description,
        created_by: user.id,
        submitter_email: userEmail,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error("A show with this title already exists");
      } else {
        toast.error("Error adding show");
        console.error(error);
      }
    } else {
      // Send notification to admin (edge function will fetch admin email)
      try {
        await supabase.functions.invoke("send-show-notification", {
          body: {
            type: "new_show",
            showTitle: title,
          },
        });
      } catch (error) {
        console.error("Failed to send admin notification:", error);
      }

      toast.success("Show submitted for approval!");
      setTitle("");
      setPhotoUrl("");
      setDescription("");
      setOpen(false);
      onShowAdded?.();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Show
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Show to Catalog</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Show Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter show title"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter show description"
            />
          </div>
          <div>
            <Label htmlFor="photo">Photo URL</Label>
            <Input
              id="photo"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="Enter photo URL"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Show"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

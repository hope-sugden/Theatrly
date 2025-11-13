import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Sparkles, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ActivityFeedItemProps {
  activity: any;
  currentUserId: string;
  onUpdate: () => void;
}

export const ActivityFeedItem = ({ activity, currentUserId, onUpdate }: ActivityFeedItemProps) => {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [reactions, setReactions] = useState<any[]>([]);
  const [userReaction, setUserReaction] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
    fetchReactions();
  }, [activity.id]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        comment_text,
        created_at,
        user_id,
        profiles!comments_user_id_fkey (
          username
        )
      `)
      .eq('activity_id', activity.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(data);
    }
  };

  const fetchReactions = async () => {
    const { data, error } = await supabase
      .from('reactions')
      .select('id, reaction_type, user_id')
      .eq('activity_id', activity.id);

    if (!error && data) {
      setReactions(data);
      const myReaction = data.find(r => r.user_id === currentUserId);
      setUserReaction(myReaction?.reaction_type || null);
    }
  };

  const handleReaction = async (reactionType: string) => {
    if (userReaction === reactionType) {
      // Remove reaction
      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('activity_id', activity.id)
        .eq('user_id', currentUserId);

      if (error) {
        toast.error("Error removing reaction");
      } else {
        fetchReactions();
      }
    } else {
      // Add or update reaction
      if (userReaction) {
        await supabase
          .from('reactions')
          .delete()
          .eq('activity_id', activity.id)
          .eq('user_id', currentUserId);
      }

      const { error } = await supabase
        .from('reactions')
        .insert({
          activity_id: activity.id,
          user_id: currentUserId,
          reaction_type: reactionType
        });

      if (error) {
        toast.error("Error adding reaction");
      } else {
        fetchReactions();
      }
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;

    const { error } = await supabase
      .from('comments')
      .insert({
        activity_id: activity.id,
        user_id: currentUserId,
        comment_text: comment.trim()
      });

    if (error) {
      toast.error("Error adding comment");
    } else {
      setComment("");
      fetchComments();
    }
  };

  const getActivityText = () => {
    const username = activity.profiles?.username || "Someone";
    switch (activity.activity_type) {
      case 'seen':
        return `${username} watched "${activity.shows?.title}"`;
      case 'review':
        return `${username} reviewed "${activity.shows?.title}"`;
      case 'want_to_see':
        return `${username} wants to see "${activity.shows?.title}"`;
      default:
        return `${username} updated "${activity.shows?.title}"`;
    }
  };

  const reactionCounts = {
    like: reactions.filter(r => r.reaction_type === 'like').length,
    love: reactions.filter(r => r.reaction_type === 'love').length,
    clap: reactions.filter(r => r.reaction_type === 'clap').length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <Avatar>
            <AvatarFallback>
              {activity.profiles?.username?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{getActivityText()}</p>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      </CardHeader>

      {activity.user_shows && (
        <CardContent>
          {activity.user_shows.rating && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Rating:</span>
              <span className="text-yellow-400">{"★".repeat(activity.user_shows.rating)}</span>
            </div>
          )}
          {activity.user_shows.review && (
            <p className="text-sm mt-2 p-3 bg-muted rounded-lg">{activity.user_shows.review}</p>
          )}
          {activity.user_shows.city && (
            <p className="text-sm text-muted-foreground mt-2">
              📍 {activity.user_shows.city}
            </p>
          )}
        </CardContent>
      )}

      <CardFooter className="flex-col items-stretch gap-3">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReaction('like')}
            className={userReaction === 'like' ? 'text-blue-500' : ''}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            {reactionCounts.like > 0 && reactionCounts.like}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReaction('love')}
            className={userReaction === 'love' ? 'text-red-500' : ''}
          >
            <Heart className="h-4 w-4 mr-1" />
            {reactionCounts.love > 0 && reactionCounts.love}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReaction('clap')}
            className={userReaction === 'clap' ? 'text-yellow-500' : ''}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            {reactionCounts.clap > 0 && reactionCounts.clap}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            {comments.length > 0 && comments.length}
          </Button>
        </div>

        {showComments && (
          <div className="space-y-3 pt-3 border-t">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {c.profiles?.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-muted p-2 rounded-lg">
                  <p className="text-sm font-semibold">{c.profiles?.username}</p>
                  <p className="text-sm">{c.comment_text}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment..."
                className="min-h-[60px]"
              />
              <Button onClick={handleComment} disabled={!comment.trim()}>
                Post
              </Button>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, UserCheck, X, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FriendsListProps {
  userId: string;
}

export const FriendsList = ({ userId }: FriendsListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      fetchFriends();
      fetchPendingRequests();
      fetchSentRequests();
    }
  }, [userId]);

  const fetchFriends = async () => {
    // Fetch friendships where user is the sender
    const { data: sentFriendships, error: sentError } = await supabase
      .from('friendships')
      .select(`
        id,
        friend_id
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');

    // Fetch friendships where user is the receiver
    const { data: receivedFriendships, error: receivedError } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id
      `)
      .eq('friend_id', userId)
      .eq('status', 'accepted');

    if (!sentError && !receivedError) {
      const allFriendIds = [
        ...(sentFriendships || []).map(f => ({ id: f.id, friendId: f.friend_id })),
        ...(receivedFriendships || []).map(f => ({ id: f.id, friendId: f.user_id }))
      ];

      // Fetch profiles for all friends
      const friendIds = allFriendIds.map(f => f.friendId);
      if (friendIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', friendIds);

        if (!profilesError && profiles) {
          const friendsList = allFriendIds.map(f => ({
            id: f.id,
            friendId: f.friendId,
            username: profiles.find(p => p.id === f.friendId)?.username || "Unknown"
          }));
          setFriends(friendsList);
        }
      }
    }
  };

  const fetchPendingRequests = async () => {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        profiles!friendships_user_id_fkey (
          id,
          username
        )
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending');

    if (!error && data) {
      setPendingRequests(data);
    }
  };

  const fetchSentRequests = async () => {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        friend_id,
        profiles!friendships_friend_id_fkey (
          id,
          username
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (!error && data) {
      setSentRequests(data);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', `%${searchQuery}%`)
      .neq('id', userId)
      .limit(10);

    if (error) {
      toast.error("Error searching users");
    } else {
      setSearchResults(data || []);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: userId,
        friend_id: friendId,
        status: 'pending'
      });

    if (error) {
      if (error.code === '23505') {
        toast.error("Friend request already sent");
      } else {
        toast.error("Error sending friend request");
      }
    } else {
      toast.success("Friend request sent!");
      fetchSentRequests();
      setSearchResults([]);
      setSearchQuery("");
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) {
      toast.error("Error accepting friend request");
    } else {
      toast.success("Friend request accepted!");
      fetchFriends();
      fetchPendingRequests();
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId);

    if (error) {
      toast.error("Error rejecting friend request");
    } else {
      toast.success("Friend request rejected");
      fetchPendingRequests();
    }
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      toast.error("Error removing friend");
    } else {
      toast.success("Friend removed");
      fetchFriends();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch}>Search</Button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarFallback>{result.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>{result.username}</span>
                  </div>
                  <Button size="sm" onClick={() => sendFriendRequest(result.id)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Friend
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
          <TabsTrigger value="pending">Requests ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sentRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-4 space-y-2">
          {friends.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No friends yet</p>
          ) : (
            friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarFallback>{friend.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>{friend.username}</span>
                </div>
                <Button size="sm" variant="destructive" onClick={() => removeFriend(friend.id)}>
                  Remove
                </Button>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-2">
          {pendingRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No pending requests</p>
          ) : (
            pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarFallback>{request.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>{request.profiles?.username}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => acceptFriendRequest(request.id)}>
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => rejectFriendRequest(request.id)}>
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4 space-y-2">
          {sentRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No sent requests</p>
          ) : (
            sentRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarFallback>{request.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>{request.profiles?.username}</span>
                </div>
                <span className="text-sm text-muted-foreground">Pending...</span>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
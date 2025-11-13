import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ShowCardProps {
  show: {
    id: string;
    title: string;
    photo_url: string;
  };
  onAddToList?: (showId: string, status: 'seen' | 'want_to_see') => void;
  onRemove?: (showId: string) => void;
  showActions?: boolean;
  status?: 'seen' | 'want_to_see';
}

export const ShowCard = ({ show, onAddToList, onRemove, showActions = true, status }: ShowCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-[var(--shadow-dramatic)] transition-all duration-300 group h-full flex flex-col">
      <div className="aspect-[2/3] overflow-hidden flex-shrink-0">
        <img 
          src={show.photo_url} 
          alt={show.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardContent className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2 flex-1">{show.title}</h3>
        {showActions && onAddToList && (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 gap-2"
              onClick={() => onAddToList(show.id, 'seen')}
            >
              <Eye className="h-4 w-4" />
              Seen
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => onAddToList(show.id, 'want_to_see')}
            >
              <Heart className="h-4 w-4" />
              Want to See
            </Button>
          </div>
        )}
        {onRemove && (
          <Button 
            size="sm" 
            variant="destructive"
            className="w-full gap-2"
            onClick={() => onRemove(show.id)}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

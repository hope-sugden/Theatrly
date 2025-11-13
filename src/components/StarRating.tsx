import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export const StarRating = ({ 
  rating, 
  onRatingChange, 
  readonly = false,
  size = "md"
}: StarRatingProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-10 w-10"
  };

  const handleClick = (starIndex: number, isHalf: boolean) => {
    if (readonly || !onRatingChange) return;
    const newRating = starIndex + (isHalf ? 0.5 : 1);
    onRatingChange(newRating);
  };

  const renderStar = (index: number) => {
    const starValue = index + 1;
    const fillPercentage = Math.min(Math.max((rating - index) * 100, 0), 100);
    
    return (
      <div 
        key={index} 
        className="relative inline-block"
        style={{ cursor: readonly ? "default" : "pointer" }}
      >
        {/* Background star (unfilled) */}
        <Star 
          className={cn(
            sizeClasses[size],
            "text-gray-300 transition-colors"
          )}
        />
        
        {/* Filled portion */}
        <div 
          className="absolute top-0 left-0 overflow-hidden"
          style={{ width: `${fillPercentage}%` }}
        >
          <Star 
            className={cn(
              sizeClasses[size],
              "fill-yellow-400 text-yellow-400"
            )}
          />
        </div>
        
        {/* Click areas for half and full stars */}
        {!readonly && onRatingChange && (
          <>
            <div 
              className="absolute top-0 left-0 w-1/2 h-full"
              onClick={() => handleClick(index, true)}
            />
            <div 
              className="absolute top-0 right-0 w-1/2 h-full"
              onClick={() => handleClick(index, false)}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3, 4].map(renderStar)}
    </div>
  );
};

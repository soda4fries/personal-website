import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MessageSquare, Reply, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PublicMessage, PublicMessagesApiResponse } from '../type';

interface PublicMessagesDisplayProps {
  baseUrl?: string;
  autoRotateInterval?: number; // in milliseconds, default 6000 (6 seconds)
  showNavigation?: boolean; // whether to show prev/next buttons
  showHeader?: boolean; // whether to show the header with title
}

export function PublicMessagesDisplay({
  baseUrl = '',
  autoRotateInterval = 6000,
  showNavigation = true,
  showHeader = true
}: PublicMessagesDisplayProps) {
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Fetch public messages
  const fetchPublicMessages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${baseUrl}/api/contact/public-messages`);
      const result: PublicMessagesApiResponse = await response.json();

      if (result.status === 'success') {
        setMessages(result.messages);
        setError(null);
        if (result.messages.length > 0) {
          setCurrentIndex(0);
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to load public messages');
      console.error('Error fetching public messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
    } catch {
      return 'Unknown date';
    }
  };

  // Navigation functions
  const goToNext = () => {
    if (messages.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }
  };

  const goToPrevious = () => {
    if (messages.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + messages.length) % messages.length);
    }
  };

  // Auto-rotation effect
  useEffect(() => {
    if (!isAutoPlaying || messages.length <= 1) return;

    const interval = setInterval(goToNext, autoRotateInterval);
    return () => clearInterval(interval);
  }, [isAutoPlaying, messages.length, autoRotateInterval, currentIndex]);

  // Fetch messages on component mount
  useEffect(() => {
    fetchPublicMessages();
  }, [baseUrl]);

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Public Messages Yet</h3>
          <p className="text-muted-foreground">
            Be the first to send a public message and share your feedback!
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentMessage = messages[currentIndex];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Public Messages</h3>
            <Badge variant="secondary" className="ml-2">
              {currentIndex + 1} of {messages.length}
            </Badge>
          </div>
          
          {messages.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isAutoPlaying ? (
                <>
                  <Clock className="w-4 h-4 mr-1" />
                  Auto
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-1" />
                  Manual
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Message Card */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-start gap-3 text-base">
            <MessageSquare className="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words">
                {currentMessage.message}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Received {formatDate(currentMessage.timestamp)}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-0">
          {currentMessage.replied && currentMessage.reply ? (
            <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-4">
              <Reply className="w-5 h-5 mt-0.5 text-green-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {currentMessage.reply}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Replied {formatDate(currentMessage.reply_timestamp!)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <Clock className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-blue-800 dark:text-blue-200 font-medium">
                  Haven't gotten to reply yet...
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Check back soon!
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {showNavigation && messages.length > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevious}
            className="w-10 h-10 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          {/* Dots indicator */}
          <div className="flex items-center gap-1 px-3">
            {messages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex 
                    ? 'bg-primary' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToNext}
            className="w-10 h-10 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
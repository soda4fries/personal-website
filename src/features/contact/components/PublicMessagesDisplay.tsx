import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Reply, Clock } from 'lucide-react';
import type { PublicMessage, PublicMessagesApiResponse } from '../type';

interface PublicMessagesDisplayProps {
  baseUrl?: string;
  popupInterval?: number; // in milliseconds, default 4000 (4 seconds)
  maxVisibleCards?: number; // maximum cards visible at once, default 3
  containerHeight?: string; // height of the container, default "400px"
}

interface VisibleMessage extends PublicMessage {
  id: string;
  x: number;
  y: number;
  animationType:
    | 'slideUp'
    | 'fadeIn'
    | 'bounceIn'
    | 'slideLeft'
    | 'slideRight'
    | 'zoomIn';
  isExiting: boolean;
}

export function PublicMessagesDisplay({
  baseUrl = '',
  popupInterval = 4000,
  maxVisibleCards = 3,
  containerHeight = '400px',
}: PublicMessagesDisplayProps) {
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [visibleMessages, setVisibleMessages] = useState<VisibleMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch public messages
  const fetchPublicMessages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${baseUrl}/api/contact/public-messages`);
      const result: PublicMessagesApiResponse = await response.json();

      if (result.status === 'success') {
        setMessages(result.messages || []);
        setError(null);
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
        year:
          date.getFullYear() !== new Date().getFullYear()
            ? 'numeric'
            : undefined,
      });
    } catch {
      return 'Unknown date';
    }
  };

  // Animation types array
  const animationTypes: VisibleMessage['animationType'][] = [
    'slideUp',
    'fadeIn',
    'bounceIn',
    'slideLeft',
    'slideRight',
    'zoomIn',
  ];

  // Add a new random message
  const addRandomMessage = () => {
    if (messages.length === 0) return;

    // Pick a random message
    const randomIndex = Math.floor(Math.random() * messages.length);
    const message = messages[randomIndex];

    // Generate smart position based on screen size
    const viewportWidth = window.innerWidth;
    const viewportHeight =
      containerHeight === '100vh'
        ? window.innerHeight
        : parseInt(containerHeight);
    const isSmallLandscape = viewportWidth >= 768 && viewportHeight < 600;
    // Use smaller cards for small landscape screens to be less intrusive
    const cardWidth = isSmallLandscape ? 240 : 300;
    const cardHeight = isSmallLandscape ? 140 : 180;
    const margin = 20;

    let x, y;

    // Desktop: avoid center form area, use side zones
    if (viewportWidth >= 768) {
      const formCenterWidth = 600; // approximate form width
      const leftZoneEnd = (viewportWidth - formCenterWidth) / 2 - margin;
      const rightZoneStart = (viewportWidth + formCenterWidth) / 2 + margin;

      // Check if this is a small landscape screen (low height) or cramped layout
      const isSmallLandscape = viewportHeight < 600;
      const hasEnoughSideSpace =
        leftZoneEnd > cardWidth + margin ||
        rightZoneStart + cardWidth < viewportWidth - margin;
      const hasEnoughVerticalSpace = viewportHeight > cardHeight + 200; // Need at least 200px buffer for header/footer

      // If conditions are too cramped, fall back to mobile-style positioning
      if (isSmallLandscape || !hasEnoughSideSpace || !hasEnoughVerticalSpace) {
        // Use mobile-style corner positioning for cramped desktop screens
        const cornerPositions = [
          // Top corners with more margin
          { x: margin, y: margin },
          {
            x: Math.max(margin, viewportWidth - cardWidth - margin),
            y: margin,
          },
          // Bottom corners
          {
            x: margin,
            y: Math.max(margin, viewportHeight - cardHeight - margin),
          },
          {
            x: Math.max(margin, viewportWidth - cardWidth - margin),
            y: Math.max(margin, viewportHeight - cardHeight - margin),
          },
        ];

        // Filter valid positions that don't overlap with form center
        const validCorners = cornerPositions.filter(
          (pos) =>
            pos.x >= margin &&
            pos.x + cardWidth <= viewportWidth - margin &&
            pos.y >= margin &&
            pos.y + cardHeight <= viewportHeight - margin &&
            (pos.x + cardWidth < leftZoneEnd || pos.x > rightZoneStart) // Don't overlap form center
        );

        if (validCorners.length > 0) {
          const selectedCorner =
            validCorners[Math.floor(Math.random() * validCorners.length)];
          x = selectedCorner.x;
          y = selectedCorner.y;
        } else {
          // Ultra fallback - disable animations by placing off-screen
          x = -cardWidth;
          y = -cardHeight;
        }
      } else {
        // Normal desktop logic for spacious screens
        // Choose left or right zone
        if (leftZoneEnd > cardWidth + margin && Math.random() > 0.5) {
          // Left zone
          x = Math.random() * (leftZoneEnd - cardWidth) + margin;
        } else if (rightZoneStart + cardWidth < viewportWidth - margin) {
          // Right zone
          x =
            Math.random() *
              (viewportWidth - rightZoneStart - cardWidth - margin) +
            rightZoneStart;
        } else {
          // Fallback to top/bottom areas if sides too narrow
          x =
            Math.random() *
              Math.max(0, viewportWidth - cardWidth - margin * 2) +
            margin;
        }

        // Avoid header and footer areas
        const headerHeight = 100;
        const footerHeight = 100;
        const availableHeight =
          viewportHeight - headerHeight - footerHeight - cardHeight;
        y =
          Math.random() * Math.max(cardHeight, availableHeight) + headerHeight;
      }
    } else {
      // Mobile: use corners and edges, smaller cards
      const positions = [
        // Top corners
        { x: margin, y: margin },
        { x: viewportWidth - cardWidth - margin, y: margin },
        // Bottom corners
        { x: margin, y: viewportHeight - cardHeight - margin },
        {
          x: viewportWidth - cardWidth - margin,
          y: viewportHeight - cardHeight - margin,
        },
        // Side centers
        { x: margin, y: (viewportHeight - cardHeight) / 2 },
        {
          x: viewportWidth - cardWidth - margin,
          y: (viewportHeight - cardHeight) / 2,
        },
      ];

      const validPositions = positions.filter(
        (pos) =>
          pos.x >= margin &&
          pos.x + cardWidth <= viewportWidth - margin &&
          pos.y >= margin &&
          pos.y + cardHeight <= viewportHeight - margin
      );

      if (validPositions.length > 0) {
        const pos =
          validPositions[Math.floor(Math.random() * validPositions.length)];
        x = pos.x;
        y = pos.y;
      } else {
        // Fallback
        x = margin;
        y = margin;
      }
    }

    const animationType =
      animationTypes[Math.floor(Math.random() * animationTypes.length)];

    const newVisibleMessage: VisibleMessage = {
      ...message,
      id: `${randomIndex}-${Date.now()}-${Math.random()}`,
      x,
      y,
      animationType,
      isExiting: false,
    };

    setVisibleMessages((prev) => [...prev, newVisibleMessage]);

    // Auto-remove the message after a delay
    setTimeout(
      () => {
        setVisibleMessages((prev) =>
          prev.map((msg) =>
            msg.id === newVisibleMessage.id ? { ...msg, isExiting: true } : msg
          )
        );

        // Remove from DOM after exit animation
        setTimeout(() => {
          setVisibleMessages((prev) =>
            prev.filter((msg) => msg.id !== newVisibleMessage.id)
          );
        }, 500);
      },
      5000 + Math.random() * 3000
    );
  };

  // Random popup effect
  useEffect(() => {
    if (messages.length === 0 || isLoading) return;

    const interval = setInterval(
      () => {
        setVisibleMessages((currentVisible) => {
          // Dynamically adjust max cards based on screen constraints
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const isConstrainedSpace =
            (viewportWidth >= 768 && viewportHeight < 600) ||
            viewportWidth < 1200;
          const dynamicMaxCards = isConstrainedSpace
            ? Math.min(1, maxVisibleCards)
            : maxVisibleCards;

          if (currentVisible.length < dynamicMaxCards) {
            addRandomMessage();
          }
          return currentVisible;
        });
      },
      popupInterval + Math.random() * 2000
    );

    return () => clearInterval(interval);
  }, [messages.length, isLoading, popupInterval, maxVisibleCards]);

  // Add initial message when messages are loaded
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      setTimeout(() => addRandomMessage(), 1000);
    }
  }, [messages.length, isLoading]);

  // Fetch messages on component mount
  useEffect(() => {
    fetchPublicMessages();
  }, [baseUrl]);

  // Handle resize to clear animations if space becomes too constrained
  useEffect(() => {
    const handleResize = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isVeryConstrained =
        (viewportWidth >= 768 && viewportHeight < 500) ||
        (viewportWidth >= 768 && viewportWidth < 1000);

      // Clear all animations if space becomes too cramped
      if (isVeryConstrained && visibleMessages.length > 0) {
        setVisibleMessages([]);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [visibleMessages.length]);

  // Animation CSS classes
  const getAnimationClass = (
    animationType: VisibleMessage['animationType'],
    isExiting: boolean
  ) => {
    if (isExiting) {
      return 'animate-out fade-out zoom-out-95 duration-500';
    }

    switch (animationType) {
      case 'slideUp':
        return 'animate-in slide-in-from-bottom-8 duration-700 ease-out';
      case 'fadeIn':
        return 'animate-in fade-in duration-1000 ease-out';
      case 'bounceIn':
        return 'animate-in zoom-in-50 duration-700 ease-out bounce';
      case 'slideLeft':
        return 'animate-in slide-in-from-right-8 duration-700 ease-out';
      case 'slideRight':
        return 'animate-in slide-in-from-left-8 duration-700 ease-out';
      case 'zoomIn':
        return 'animate-in zoom-in-95 duration-500 ease-out';
      default:
        return 'animate-in fade-in duration-700 ease-out';
    }
  };

  // Error state - don't show error visually, just return empty container
  if (error) {
    console.warn('Public messages failed to load:', error);
    return (
      <div
        className="relative w-full bg-gradient-to-br from-background/20 via-muted/5 to-muted/10 rounded-lg overflow-hidden pointer-events-none"
        style={{ height: containerHeight }}
      />
    );
  }

  return (
    <div
      className="relative w-full bg-gradient-to-br from-background/20 via-muted/5 to-muted/10 rounded-lg overflow-hidden pointer-events-none"
      style={{ height: containerHeight }}
    >
      {/* Small loading indicator in corner - hide on mobile */}
      {isLoading && (
        <div className="absolute top-4 right-4 z-0 hidden md:flex items-center gap-2 bg-background/60 backdrop-blur-sm px-3 py-2 rounded-full border border-muted/30">
          <div className="w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground/60">
            Loading messages...
          </span>
        </div>
      )}

      {/* Header - only show when there are visible messages on desktop */}
      {visibleMessages.length > 0 && (
        <div className="absolute top-4 left-4 z-0 hidden md:flex items-center gap-2 bg-background/40 backdrop-blur-sm px-3 py-2 rounded-full border border-muted/30">
          <MessageSquare className="w-4 h-4 text-muted-foreground/60" />
          <span className="text-sm font-medium text-muted-foreground/80">
            Public Messages
          </span>
          <span className="text-xs text-muted-foreground/60 bg-muted/30 px-2 py-0.5 rounded-full">
            {visibleMessages.length}
          </span>
        </div>
      )}

      {/* Random Message Cards */}
      {visibleMessages.map((message) => (
        <Card
          key={message.id}
          className={`absolute shadow-lg hover:shadow-xl transition-all duration-300 pointer-events-none opacity-100 ${window.innerWidth >= 768 && window.innerHeight < 600 ? 'w-60' : 'md:w-72 w-64'} ${getAnimationClass(message.animationType, message.isExiting)}`}
          style={{
            left: `${message.x}px`,
            top: `${message.y}px`,
            zIndex: -1,
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-start gap-3 text-sm">
              <MessageSquare className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words text-sm">
                  {message.message.length > (window.innerWidth < 768 ? 80 : 120)
                    ? `${message.message.slice(0, window.innerWidth < 768 ? 80 : 120)}...`
                    : message.message}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDate(message.timestamp)}
                </p>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-0">
            {message.replied && message.reply ? (
              <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
                <Reply className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words text-sm">
                    {message.reply.length > (window.innerWidth < 768 ? 60 : 100)
                      ? `${message.reply.slice(0, window.innerWidth < 768 ? 60 : 100)}...`
                      : message.reply}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(message.reply_timestamp!)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <Clock className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-blue-800 dark:text-blue-200 font-medium text-sm">
                    Pending reply...
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Check back soon!
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Floating info message when no cards are visible */}
      {visibleMessages.length === 0 && messages.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <div className="text-center animate-pulse">
            <MessageSquare className="w-6 h-6 mx-auto text-muted-foreground/60 mb-2" />
            <p className="text-muted-foreground/60 text-xs">
              Messages will appear randomly...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

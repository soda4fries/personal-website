'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Clock, Search } from 'lucide-react';
import { highlightSearchTerm, getSearchMatches, type SearchMatch } from '@/utils/searchHighlight';
import { getRelativeLocaleUrl } from '@/utils/i18nUtils';
import type { PostDataForFilter } from './FilteredPostsList';

type BlogPostCardWithHighlightProps = {
  post: PostDataForFilter;
  searchTerm: string;
  lang: string;
  texts: {
    publishedOn: string;
    readingTimeSuffix: string;
    readMore: string;
    matchesIn: string;
  };
};

export function BlogPostCardWithHighlight({
  post,
  searchTerm,
  lang,
  texts
}: BlogPostCardWithHighlightProps) {
  const matches = getSearchMatches(post, searchTerm);
  const hasMatches = matches.length > 0;
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(lang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };
  
  return (
    <a
      href={getRelativeLocaleUrl(lang as any, `/blog/${post.id}`)}
      className="block group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="rounded-lg shadow-md hover:shadow-xl transition-all duration-300 pt-0 h-full flex flex-col relative">
        {hasMatches && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Search className="h-3 w-3" />
              {matches.length}
            </div>
          </div>
        )}
        
        {/* Hero Image */}
        {post.heroImage ? (
          <div className="w-full h-48 overflow-hidden rounded-t-lg flex-shrink-0">
            <img
              src={post.heroImage.url.src}
              srcset={post.heroImage.url.srcset}
              sizes="(max-width: 768px) 100vw, 33vw"
              alt={post.heroImage.alt}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              width={post.heroImage.url.width}
              height={post.heroImage.url.height}
            />
          </div>
        ) : (
          <div className="w-full h-12 bg-muted" />
        )}
        
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-xl font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {searchTerm ? highlightSearchTerm(post.title, searchTerm) : post.title}
          </CardTitle>
          <CardDescription className="space-y-1">
            <p className="text-xs">
              {texts.publishedOn} {formatDate(post.pubDate)}
            </p>
            {post.readingTimeMinutes != null && (
              <p className="flex items-center text-xs">
                <Clock className="mr-1 size-3 flex-shrink-0" />
                {post.readingTimeMinutes} {texts.readingTimeSuffix}
              </p>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-grow space-y-2 flex-shrink-0">
          {post.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {searchTerm ? highlightSearchTerm(post.description, searchTerm) : post.description}
            </p>
          )}
          
          {/* Search Matches Preview */}
          {hasMatches && searchTerm && (
            <div className="mt-2 space-y-1">
              {matches.slice(0, 2).map((match, index) => (
                <div key={index} className="text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <span className="capitalize">{match.field === 'body' ? 'content' : match.field}:</span>
                  </div>
                  <p className="text-muted-foreground line-clamp-1 bg-muted/50 px-2 py-1 rounded text-xs">
                    {highlightSearchTerm(match.snippet, searchTerm)}
                  </p>
                </div>
              ))}
              {matches.length > 2 && (
                <p className="text-xs text-muted-foreground">
                  +{matches.length - 2} more matches
                </p>
              )}
            </div>
          )}
          
          {post.tags && post.tags.length > 0 && (
            <div className="flex gap-2 pt-2 line-clamp-1">
              {post.tags.slice(0, 3).map((tag: string) => (
                <Badge variant="secondary" key={tag} className="text-xs">
                  {tag}
                </Badge>
              ))}
              {post.tags.length > 3 && (
                <Badge variant="secondary" key="more" className="text-xs">
                  +{post.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="mt-auto flex-shrink-0">
          <span className="text-sm text-primary font-medium group-hover:underline">
            {texts.readMore} &rarr;
          </span>
        </CardFooter>
      </Card>
    </a>
  );
}
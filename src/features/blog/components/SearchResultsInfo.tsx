'use client';

import React from 'react';
import { Search, Tag } from 'lucide-react';

type SearchResultsInfoProps = {
  totalPosts: number;
  filteredPosts: number;
  searchTerm: string;
  selectedTag: string;
  texts: {
    showingAll: string;
    found: string;
    of: string;
    posts: string;
    matching: string;
    noPostsFound: string;
  };
};

export function SearchResultsInfo({
  totalPosts,
  filteredPosts,
  searchTerm,
  selectedTag,
  texts
}: SearchResultsInfoProps) {
  const hasFilters = searchTerm || selectedTag;
  
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      {hasFilters && (
        <>
          <Search className="h-4 w-4" />
          {filteredPosts === 0 ? (
            <span className="text-destructive font-medium">{texts.noPostsFound}</span>
          ) : (
            <span>
              {texts.found} <span className="font-medium text-foreground">{filteredPosts}</span> {texts.of} {totalPosts} {texts.posts}
              {(searchTerm || selectedTag) && (
                <span className="ml-1">
                  {texts.matching}
                  {searchTerm && (
                    <span className="ml-1 inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md font-mono text-xs">
                      <Search className="h-3 w-3" />
                      "{searchTerm}"
                    </span>
                  )}
                  {selectedTag && (
                    <span className="ml-1 inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs">
                      <Tag className="h-3 w-3" />
                      {selectedTag}
                    </span>
                  )}
                </span>
              )}
            </span>
          )}
        </>
      )}
      
      {!hasFilters && (
        <span>{texts.showingAll} {totalPosts} {texts.posts}</span>
      )}
    </div>
  );
}
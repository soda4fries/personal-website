import React from 'react';

export type SearchMatch = {
  field: 'title' | 'description' | 'body';
  snippet: string;
  startIndex: number;
  endIndex: number;
};

export function highlightSearchTerm(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm.trim()) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    const isMatch = regex.test(part);
    regex.lastIndex = 0; // Reset regex for next test
    
    return isMatch ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded text-black dark:text-yellow-100">
        {part}
      </mark>
    ) : (
      part
    );
  });
}

export function getSearchMatches(
  post: { title: string; description: string; body: string },
  searchTerm: string
): SearchMatch[] {
  if (!searchTerm.trim()) return [];
  
  const matches: SearchMatch[] = [];
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  // Check title matches
  const titleIndex = post.title.toLowerCase().indexOf(lowerSearchTerm);
  if (titleIndex !== -1) {
    matches.push({
      field: 'title',
      snippet: post.title,
      startIndex: titleIndex,
      endIndex: titleIndex + searchTerm.length
    });
  }
  
  // Check description matches
  const descIndex = post.description.toLowerCase().indexOf(lowerSearchTerm);
  if (descIndex !== -1) {
    matches.push({
      field: 'description',
      snippet: post.description,
      startIndex: descIndex,
      endIndex: descIndex + searchTerm.length
    });
  }
  
  // Check body matches - get a snippet around the match
  const bodyIndex = post.body.toLowerCase().indexOf(lowerSearchTerm);
  if (bodyIndex !== -1) {
    const snippetStart = Math.max(0, bodyIndex - 50);
    const snippetEnd = Math.min(post.body.length, bodyIndex + searchTerm.length + 50);
    const snippet = post.body.slice(snippetStart, snippetEnd);
    
    matches.push({
      field: 'body',
      snippet: snippetStart > 0 ? '...' + snippet : snippet,
      startIndex: bodyIndex - snippetStart + (snippetStart > 0 ? 3 : 0),
      endIndex: bodyIndex - snippetStart + (snippetStart > 0 ? 3 : 0) + searchTerm.length
    });
  }
  
  return matches;
}

export function getSearchStats(
  totalPosts: number,
  filteredPosts: number,
  searchTerm: string,
  selectedTag: string
): string {
  if (!searchTerm && !selectedTag) {
    return `Showing all ${totalPosts} posts`;
  }
  
  if (filteredPosts === 0) {
    return 'No posts found';
  }
  
  const searchPart = searchTerm ? `"${searchTerm}"` : '';
  const tagPart = selectedTag ? `tag: ${selectedTag}` : '';
  const filterText = [searchPart, tagPart].filter(Boolean).join(' + ');
  
  return `Found ${filteredPosts} of ${totalPosts} posts${filterText ? ` matching ${filterText}` : ''}`;
}
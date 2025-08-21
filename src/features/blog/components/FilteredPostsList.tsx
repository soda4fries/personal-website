'use client';

import * as React from 'react';
import { BlogFilters, type BlogFiltersProps } from './BlogFilters';
import { SearchResultsInfo } from './SearchResultsInfo';
import { BlogPostCardWithHighlight } from './BlogPostCardWithHighlight';
// Tu devras créer ou ajuster l'import pour BlogPostCard si tu veux le rendre depuis React
// Pour l'instant, nous allons supposer que BlogPostCard est un composant Astro et que nous devons passer les données filtrées à Astro.
// Cela signifie que FilteredPostsList ne rendra que les filtres, et passera les posts filtrés à un slot ou à un autre composant.
// OU, nous transformons BlogPostCard en un composant React.

// For a full client approach, it is simpler if BlogPostCard is also React.
// If BlogPostCard must remain Astro, the logic of rendering filtered posts will remain in AllBlogPostsScreen.astro,
// and this component will only calculate and return filtered posts via a callback.

// Option 1: BlogPostCard becomes React (simpler for full client filtering)
// Supposons que tu aies une version React de BlogPostCard
// import BlogPostCardReact from './BlogPostCardReact';

// Option 2: This component only filters and returns data (more complex to integrate with Astro for rendering)

// Allons avec l'idée que ce composant gère l'affichage, donc BlogPostCard devrait être utilisable ici.
// Si BlogPostCard est .astro, il ne peut pas être utilisé directement dans .tsx comme ça.
// Pour l'instant, je vais simuler le rendu des posts.

// Let's redefine PostData to be more explicit about what FilteredPostsList expects.
// It expects data that was originally in frontmatter (title, description, tags)
// and also the body for searching, plus slug and id.
export type PostDataForFilter = {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags?: Array<string>;
  body: string; // For searching in content
  pubDate: Date;
  heroImage?: {
    url: {
      src: string;
      width: number;
      height: number;
      format: string;
      srcset: string;
    };
    alt: string;
  };
  readingTimeMinutes?: number;
};

export type FilteredPostsListProps = {
  allPosts: Array<PostDataForFilter>;
  texts: BlogFiltersProps['texts'] & {
    noPostsFound: string;
    showingAll: string;
    found: string;
    of: string;
    posts: string;
    matching: string;
    publishedOn: string;
    readingTimeSuffix: string;
    readMore: string;
    matchesIn: string;
  };
  lang: string;
  initialSearchQuery?: string;
  initialTag?: string;
};

export function FilteredPostsList({
  allPosts,
  texts,
  lang,
  initialSearchQuery = '',
  initialTag = '',
}: FilteredPostsListProps) {
  const [searchQuery, setSearchQuery] = React.useState(initialSearchQuery);
  const [selectedTag, setSelectedTag] = React.useState(initialTag);

  // Fallback to URL params if no initial props (for client-only scenarios)
  React.useEffect(() => {
    if (!initialSearchQuery && !initialTag && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get('q') || '';
      const urlTag = params.get('tag') || '';
      if (urlQuery) setSearchQuery(urlQuery);
      if (urlTag) setSelectedTag(urlTag);
    }
  }, [initialSearchQuery, initialTag]);

  // Update URL when filters change
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedTag) params.set('tag', selectedTag);

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    if (newUrl !== window.location.href.split('#')[0]) {
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchQuery, selectedTag]);

  const filteredPosts = React.useMemo(() => {
    let posts = allPosts;

    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      posts = posts.filter(
        (post) =>
          post.title.toLowerCase().includes(lowerCaseQuery) ||
          post.description.toLowerCase().includes(lowerCaseQuery) ||
          post.body.toLowerCase().includes(lowerCaseQuery)
      );
    }

    if (selectedTag) {
      posts = posts.filter((post) => post.tags?.includes(selectedTag));
    }

    return posts;
  }, [allPosts, searchQuery, selectedTag]);

  // No longer need DOM manipulation - everything is handled in React

  // Extract unique tags for the BlogFilters component
  const uniqueTagsForFilter = React.useMemo(() => {
    const allTagsRaw = allPosts.flatMap((post) => post.tags || []);
    return [...new Set(allTagsRaw)].sort().map((tag) => ({
      value: tag,
      label: tag.charAt(0).toUpperCase() + tag.slice(1),
    }));
  }, [allPosts]);

  const handleSearchChange = React.useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleTagChange = React.useCallback((tag: string) => {
    setSelectedTag(tag);
  }, []);

  return (
    <div>
      <BlogFilters
        allTags={uniqueTagsForFilter}
        currentSearchQuery={searchQuery}
        currentTag={selectedTag}
        texts={texts}
        onSearchChange={handleSearchChange}
        onTagChange={handleTagChange}
      />

      <SearchResultsInfo
        totalPosts={allPosts.length}
        filteredPosts={filteredPosts.length}
        searchTerm={searchQuery}
        selectedTag={selectedTag}
        texts={{
          showingAll: texts.showingAll,
          found: texts.found,
          of: texts.of,
          posts: texts.posts,
          matching: texts.matching,
          noPostsFound: texts.noPostsFound,
        }}
      />

      {/* Enhanced Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {filteredPosts.map((post) => (
          <BlogPostCardWithHighlight
            key={post.id}
            post={post}
            searchTerm={searchQuery}
            lang={lang}
            texts={{
              publishedOn: texts.publishedOn,
              readingTimeSuffix: texts.readingTimeSuffix,
              readMore: texts.readMore,
              matchesIn: texts.matchesIn,
            }}
          />
        ))}
      </div>

      {filteredPosts.length === 0 && (searchQuery || selectedTag) && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">{texts.noPostsFound}</p>
        </div>
      )}
    </div>
  );
}

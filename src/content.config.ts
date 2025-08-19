import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blogCollection = defineCollection({
  loader: glob({
    pattern: '**/*.mdx',
    base: './src/features/blog/content',
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: z.object({
        url: image(),
        alt: z.string(),
      }),
      tags: z.array(z.string()).optional(),
      relatedPosts: z.array(reference('blog')),
      readingTimeMinutes: z.number().optional(), // Added by remark plugin
      isDraft: z.boolean(),
      featured: z.boolean().optional(),
      lang: z.enum(['fr', 'en']).optional().default('fr'),
    }),
});

const aboutMeCollection = defineCollection({
  loader: glob({
    pattern: '**/*.mdx',
    base: './src/features/about-me/content',
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      tags: z.array(z.string()).optional(),
      isDraft: z.boolean().default(false),
      heroImage: z
        .object({
          url: image(),
          alt: z.string(),
        })
        .optional(),
      lang: z.enum(['fr', 'en']).optional().default('fr'),
      relatedContent: z.array(reference('about-me')).optional(),
      featured: z.boolean().optional(),
      category: z.enum(['personal', 'professional', 'skills', 'experience']).optional(),
    }),
});

const projectsCollection = defineCollection({
  loader: glob({
    pattern: '**/*.mdx',
    base: './src/features/projects/content',
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      imageUrl: image().optional(),
      imageAltText: z.string(),
      categoryText: z.string(),
      dateText: z.string(),
      tags: z.array(z.string()),
      keyFeatures: z.array(z.object({
        title: z.string(),
        description: z.string(),
      })),
      projectUrl: z.string().optional(),
      codeUrl: z.string().optional(),
      technologies: z.array(z.string()).optional(),
      isDraft: z.boolean().default(false),
      featured: z.boolean().optional(),
      lang: z.enum(['fr', 'en']).optional().default('en'),
    }),
});

export const collections = {
  blog: blogCollection,
  'about-me': aboutMeCollection,
  projects: projectsCollection,
};

// Import content collections
import { getCollection } from 'astro:content';
import { defaultLanguage, type LanguageCode } from '@/i18n/ui';
import type {
  SkillData,
  TranslatedSkill,
} from './type';

// Import project-related types from Astro content
type ProjectEntry = Awaited<ReturnType<typeof getCollection<'projects'>>>[0];

export async function getProjectsList() {
  const projects = await getCollection('projects', ({ data }) => {
    return data.isDraft !== true;
  });
  
  // Sort by date, most recent first
  return projects.sort((a, b) => {
    // Since dateText is a string, we'll use it for sorting
    // You might want to add a proper date field later for better sorting
    return a.data.dateText.localeCompare(b.data.dateText) * -1;
  });
}

// Function to get a single project by its ID
export async function getProjectBySlug(slug: string): Promise<ProjectEntry | undefined> {
  const projects = await getProjectsList();
  return projects.find((project) => project.id === slug);
}

// Function to get projects filtered by language if needed
export async function getProjectsByLanguage(lang: LanguageCode = defaultLanguage) {
  const projects = await getCollection('projects', ({ data }) => {
    return data.isDraft !== true && (data.lang === lang || !data.lang);
  });
  
  return projects.sort((a, b) => {
    return a.data.dateText.localeCompare(b.data.dateText) * -1;
  });
}

// For backward compatibility - convert ProjectEntry to something similar to old TranslatedProject
export function convertProjectEntry(project: ProjectEntry) {
  return {
    id: project.id,
    slug: project.id,
    title: project.data.title,
    description: project.data.description,
    imageUrl: project.data.imageUrl,
    imageAltText: project.data.imageAltText,
    categoryText: project.data.categoryText,
    dateText: project.data.dateText,
    tags: project.data.tags,
    keyFeatures: project.data.keyFeatures,
    projectUrl: project.data.projectUrl,
    codeUrl: project.data.codeUrl,
    technologies: project.data.technologies,
    body: project.body,
    collection: project.collection,
  };
}

// Skills
export const skillsList: Array<SkillData> = [
  {
    id: 'frontendDevelopment',
    iconName: 'MonitorSmartphone',
    technologies: [
      { id: 'html', name: 'HTML' },
      { id: 'css', name: 'CSS' },
      { id: 'javascript', name: 'JavaScript' },
      { id: 'typescript', name: 'TypeScript' },
    ],
  },
  {
    id: 'backendDevelopment',
    iconName: 'ServerCog',
    technologies: [
      { id: 'nodejs', name: 'Node.js' },
      { id: 'restapi', name: 'REST APIs' },
    ],
  },
  {
    id: 'uiUxDesign',
    iconName: 'PenTool',
    technologies: [
      { id: 'figma', name: 'Figma' },
      { id: 'responsiveDesign', name: 'Responsive Design' },
    ],
  },
  {
    id: 'devOps',
    iconName: 'Network',
    technologies: [
      { id: 'git', name: 'Git' },
      { id: 'docker', name: 'Docker' },
    ],
  },
];

// Function to get skills with translated content
export function getTranslatedSkills(): Array<TranslatedSkill> {
  // For now, return basic skill data without translations
  // You can add i18n support later if needed
  return skillsList.map((skill) => ({
    ...skill,
    title: skill.id, // Fallback title - you can improve this later
    description: 'Skill description', // Fallback description
  }));
}

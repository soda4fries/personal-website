# Personal Website

A simple portfolio website built with Astro, React, and Tailwind CSS.

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+

### Installation

```bash
# Install dependencies
bun install
# or npm install
```

### Development

```bash
# Start development server
bun run dev

# Open http://localhost:4321 in your browser
```

### Build & Deploy

```bash
# Build for production
bun run build

# Deploy to Cloudflare Workers
bun run deploy
```

## ✨ Features

### 📚 Blog System with MDX
- MDX support with embedded React components
- Auto tagging and featured posts
- Rich content with images and code blocks

### 🔍 Full-Text Search
- Real-time search with highlighting
- Tag filtering and search analytics

### 💬 Anonymous Contact Form
- Backend to view message (Very simple)
- Public message display with animations
- Backend message management

### 🏠 Auto Homepage Compilation
- Recent posts automatically displayed
- Featured content with hero images

### 📱 Asset Management
- Auto image optimization in `src/assets/`
- WebP conversion and responsive sizing
- Lazy loading optimization

## 📝 Adding Content

### Blog Posts

Create new blog posts in `src/features/blog/content/en/` as `.mdx` files:

```markdown
---
title: "Your Post Title"
description: "Brief description"
pubDate: 2025-01-01
tags: ['tag1', 'tag2']
featured: true
---

Your blog content with React components...
```

### About Me

Edit your about section in `src/features/about-me/content/en/about-me.mdx`.

## 🏃‍♂️ Contact Form Backend

The contact form uses a Python Flask backend (`contact-me.py`) with SQLite database storage. Run the setup script to configure:

```bash
# Linux/Mac
./setup-contact.sh

# Windows
setup-contact.bat
```

The backend handles form submissions, stores messages in `contact_messages.db`, and can send email notifications.

## ⚡ Performance

This website is very fast and lightweight, achieving perfect 100/100 PageSpeed scores on both desktop and mobile.

| Desktop | Mobile |
|---------|--------|
| ![Desktop PageSpeed](pagespeed/image.png) | ![Mobile PageSpeed](pagespeed/mobile.png) |

## 🛠️ Available Scripts

- `bun run dev` - Start development server  
- `bun run build` - Build for production
- `bun run preview` - Preview production build
- `bun run deploy` - Deploy to Cloudflare Workers
- `bun run format` - Format code with Prettier

## ☁️ Deployment

This website is configured for deployment to Cloudflare Workers using Wrangler. The `wrangler.json` configuration file handles static asset serving from the `dist` folder.

To deploy:
1. Build the project: `bun run build`
2. Deploy to Cloudflare: `bun run deploy`

On first deployment, you'll be prompted to authenticate with Cloudflare and create a new Workers project.
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
```

## 📝 Adding Content

### Blog Posts

Create new blog posts in `src/features/blog/content/en/` as `.mdx` files:

```markdown
---
title: "Your Post Title"
description: "Brief description"
pubDate: 2025-01-01
---

Your blog content here...
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
- `bun run format` - Format code with Prettier
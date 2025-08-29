# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

LessonsHub is a custom lesson platform for teaching built with Next.js 15. The main application is located in the `lessonhub-app/` directory and uses modern React features with TypeScript and Tailwind CSS.

## Development Commands

All commands should be run from the `lessonhub-app/` directory:

### Development Server
```bash
cd lessonhub-app
npm run dev          # Start development server with Turbopack (http://localhost:3000)
```

### Build & Production
```bash
npm run build        # Build for production with Turbopack
npm start           # Start production server
```

### Code Quality
```bash
npm run lint        # Run ESLint with Next.js config
```

### Package Management
```bash
npm install         # Install dependencies
```

## Project Architecture

### Technology Stack
- **Next.js 15.5.2** with App Router
- **React 19.1.0** with React DOM
- **TypeScript 5** for type safety
- **Tailwind CSS 4** with PostCSS integration
- **ESLint 9** with Next.js configuration
- **Turbopack** for faster builds and development

### Directory Structure
```
lessonhub-app/
├── src/
│   └── app/                 # App Router pages and layouts
│       ├── layout.tsx       # Root layout with Geist fonts
│       ├── page.tsx         # Home page component
│       ├── globals.css      # Global styles with Tailwind
│       └── favicon.ico      # App favicon
├── public/                  # Static assets (SVG icons, etc.)
├── node_modules/            # Dependencies
├── package.json             # Project configuration and scripts
├── tsconfig.json           # TypeScript configuration with path aliases
├── next.config.ts          # Next.js configuration
├── eslint.config.mjs       # ESLint flat config
├── postcss.config.mjs      # PostCSS with Tailwind plugin
└── README.md               # Standard Next.js documentation
```

### Key Configuration Details
- **Path Aliases**: `@/*` maps to `./src/*` for clean imports
- **Font Optimization**: Uses Geist Sans and Geist Mono fonts via `next/font/google`
- **Styling**: Tailwind CSS 4 with custom CSS variables and dark mode support
- **TypeScript**: Strict mode enabled with modern ES2017 target
- **Turbopack**: Enabled for both development and build processes

### App Router Structure
This project uses Next.js App Router (not Pages Router):
- `src/app/layout.tsx` - Root layout component
- `src/app/page.tsx` - Home page component
- `src/app/globals.css` - Global styles with Tailwind imports

## Environment Configuration

The project supports environment variables:
- `.env*.local` and `.env` files are ignored by git
- Use for database connections, API keys, and external service integrations

## Development Workflow

1. Navigate to the app directory: `cd lessonhub-app`
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Edit files in `src/app/` and see changes instantly
5. Run linting before commits: `npm run lint`

## Git Workflow

- Repository: `git@github.com:GINNOV/lessonshub.git`
- Main branch as primary branch
- MIT License

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Turbopack (runs on http://localhost:3000)
- `npm run build` - Build the application for production using Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint to check for code issues

### Dependencies
- Install dependencies: `npm install` (or `pnpm install` if pnpm is available)

## Architecture

This is a Next.js 15 application using the App Router with React 19 and TypeScript.

### Project Structure
- `/app` - Next.js App Router pages and layouts
  - `layout.tsx` - Root layout with Geist fonts
  - `page.tsx` - Home page component
  - `globals.css` - Global styles with Tailwind CSS
- `/components` - React components
  - `/ui` - shadcn/ui components
- `/lib` - Utility functions
  - `utils.ts` - Contains `cn()` utility for class name merging

### Key Technologies
- **Framework**: Next.js 15 with App Router and Turbopack
- **UI Components**: shadcn/ui (configured in components.json)
- **Styling**: Tailwind CSS v4 with CSS variables
- **Fonts**: Geist Sans and Geist Mono from Google Fonts
- **Icons**: Lucide React
- **Utilities**: clsx and tailwind-merge for className handling

### Configuration
- **TypeScript**: Strict mode enabled, using path alias `@/*` for imports
- **shadcn/ui**: Configured with New York style, gray base color, CSS variables enabled
- **ESLint**: Next.js Core Web Vitals and TypeScript rules

### Development Notes
- The project uses npm scripts but was initialized with pnpm (see pnpm-lock.yaml)
- React Server Components (RSC) are enabled
- Components use the `cn()` utility from `@/lib/utils` for conditional styling

### Testing
- **Framework**: Jest with Testing Library for React components
- **Commands**:
  - `npm test` - Run all tests
  - `npm run test:watch` - Run tests in watch mode
  - `npm run test:coverage` - Run tests with coverage report
- **Test Files**: Located in `__tests__/` directory
  - API endpoint tests: `__tests__/api/subscribe.test.ts`
  - Component tests: `__tests__/components/email-signup-form.test.tsx`

### Email List System
- Email subscription API at `/api/subscribe` using Firebase/Firestore
- Form component `EmailSignupForm` with validation using react-hook-form and Zod
- Environment setup required: copy `.env.local.example` to `.env.local` and configure Firebase credentials
- Setup guide available in `/docs/EMAIL_LIST_SETUP.md`

### Known Issues
- The animated shader hero component has ESLint type issues (use of `any` types)
- These are inherited from the original component and should be refactored if time permits
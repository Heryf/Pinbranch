# Pinbranch

<div align="center">

**Version 1.0.0**

[English](./README.md) | [简体中文](./docs/README-zh.md)

<h3>Pinbranch - Turn Your Browser Bookmarks into a Directory Website</h3>
<p>A refined bookmark navigation site with file-explorer style browsing, built on Pintree.</p>

</div>

---

## Origin & License

> **This project (Pinbranch) is a secondary development based on the [Pintree](https://github.com/Pintree-io/pintree) project.**

| Item | Details |
|------|---------|
| **Original Project** | [Pintree](https://github.com/Pintree-io/pintree) |
| **Original Author** | Pintree.io |
| **Original License** | MIT License |
| **Original Copyright** | Copyright (c) 2024 Pintree.io |
| **This Project License** | MIT License (inherited) |
| **Attribution Notice** | See [NOTICE.md](./docs/NOTICE.md) |

The original Pintree project is licensed under the MIT License, which permits modification
and redistribution. Pinbranch complies with all MIT License terms, including preservation
of the original copyright notice in the [LICENSE](./LICENSE) file.

---

## Key Modifications

Pinbranch introduces the following improvements over the original Pintree:

### File-Explorer Style Browsing
- Left sidebar with collection list + expandable/collapsible folder tree
- Right main area: subfolder cards on top + bookmark list below
- Breadcrumb navigation for quick parent-level access

### Refined Visual Design
- Redesigned folder cards with gradient colors and hover paper-unfolding animation
- Enhanced bookmark cards with lift, shadow, and icon-scale hover effects
- Deep gray-blue dark mode (#1a2332) for a softer, more readable experience

### Unified Theme System
- All hardcoded colors replaced with CSS variables
- Consistent light/dark mode across frontend and admin panel

### Performance & UX
- Optimized API to return only current-level data
- React.memo to prevent unnecessary re-renders
- Delayed loading state to eliminate flickering on folder switch
- Fixed SVG gradient ID collision bug

### Deployment Ready
- Prisma migration files for reliable Vercel deployment
- Smart build script with automatic migration recovery

> See [CHANGELOG.md](./docs/CHANGELOG.md) for a complete list of modified files.

---

## Features

### Basic Version (Free)
- Unlimited bookmark import/export
- Bookmark management with drag-and-drop
- File-explorer style hierarchical browsing
- Basic theme customization (light/dark mode)
- Bookmark search
- Multiple collection switching

### Admin Panel
- Collection management
- Bookmark management with data table
- SEO settings
- Basic settings (site name, logo, footer, social media)
- Image management

---

## Tech Stack

- **Frontend & Backend**: Next.js 14
- **Database**: PostgreSQL (recommended: [Neon](https://neon.tech))
- **ORM**: Prisma
- **Deployment**: Vercel
- **Styling**: Tailwind CSS + shadcn/ui

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Vercel account (for deployment)

### Local Development

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your database URL and secrets

# 3. Generate Prisma client
npx prisma generate

# 4. Push database schema
npx prisma db push

# 5. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Deploy to Vercel

1. Push this project to your GitHub repository
2. Import the repository in Vercel
3. Configure environment variables (see `.env.example`)
4. Deploy

> See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed deployment instructions.

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_SECRET` | NextAuth.js secret key | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXT_PUBLIC_APP_URL` | Public application URL | Yes |
| `ADMIN_EMAIL` | Admin account email | Yes |
| `ADMIN_PASSWORD` | Admin account password | Yes |

---

## Project Structure

```
pinbranch/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── api/          # API routes
│   │   ├── admin/        # Admin panel pages
│   │   └── page.tsx      # Homepage
│   ├── components/       # React components
│   │   ├── bookmark/     # Bookmark components
│   │   ├── website/      # Website layout components
│   │   ├── admin/        # Admin components
│   │   ├── search/       # Search components
│   │   └── ui/           # shadcn/ui components
│   └── lib/              # Utilities
├── prisma/               # Database schema & migrations
├── public/               # Static assets
├── scripts/              # Build & deploy scripts (vercel-build.sh, deploy.sh, deploy.ps1, ecosystem.config.cjs)
├── docs/                 # Documentation (README-zh, CHANGELOG, NOTICE, DEPLOYMENT, etc.)
├── LICENSE               # MIT License (original copyright preserved)
└── vercel.json           # Vercel configuration
```

---

## Acknowledgments

- **[Pintree](https://github.com/Pintree-io/pintree)** - The original project that Pinbranch is built upon
- All open-source dependencies that make this project possible

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Pintree.io

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Disclaimer

Pinbranch is an independent derivative work based on Pintree. The original Pintree
project and its authors are not responsible for any modifications made in this derivative.
This software is provided "AS IS" without warranty of any kind.

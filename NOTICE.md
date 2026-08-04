# Pinbranch - Open Source Notice

## Project Information

- **Project Name**: Pinbranch
- **Version**: 1.0.0
- **License**: MIT License
- **Repository**: https://github.com/Pintree-io/pintree (original)

---

## Derivative Work Declaration

This project (Pinbranch) is a secondary development based on the **Pintree** project.

- **Original Project**: Pintree
- **Original Repository**: https://github.com/Pintree-io/pintree
- **Original Author**: Pintree.io
- **Original License**: MIT License
- **Original Copyright**: Copyright (c) 2024 Pintree.io

Pintree is an open-source project licensed under the MIT License, which permits
modification, redistribution, and sublicensing. Pinbranch is developed in
compliance with the MIT License terms.

---

## Modifications Summary

The following major modifications have been made to the original Pintree project:

### 1. Directory Tree Restructuring
- Implemented a "file explorer" style hierarchical browsing experience
- Left sidebar: collection list + expandable/collapsible folder tree
- Right main area: subfolder cards on top + bookmark list below
- Added breadcrumb navigation for quick parent-level navigation

### 2. Visual Design Optimization
- Redesigned folder card SVG icons with classic folder tab styling
- Added gradient colors and hover animations (three-layer paper unfolding effect)
- Enhanced bookmark card hover interactions (lift, shadow, icon scale)
- Refined dark mode color scheme (deep gray-blue: #1a2332)

### 3. Theme System Unification
- Replaced all hardcoded colors with CSS variables across the entire project
- Ensured consistent light/dark mode adaptation for both frontend and admin panels
- Removed top banner; separated logo icon from site title text

### 4. Performance & Interaction Improvements
- Optimized API to return only current-level data (reduced payload)
- Added React.memo to prevent unnecessary re-renders
- Implemented delayed loading state to eliminate flickering on folder switch
- Fixed SVG gradient ID collision causing hover state linkage bugs

### 5. Deployment Configuration
- Added Prisma migration files for reliable Vercel deployment
- Created smart build script with fallback for migration recovery
- Fixed TypeScript Buffer type compatibility issues

For a complete list of modified files, see [CHANGELOG.md](./CHANGELOG.md).

---

## Third-Party Licenses

This project includes third-party open-source software components. Below are the
key dependencies and their licenses:

| Dependency | License | Purpose |
|-----------|---------|---------|
| Next.js | MIT | React framework |
| React | MIT | UI library |
| Prisma | Apache-2.0 | ORM |
| Tailwind CSS | MIT | CSS framework |
| Radix UI | MIT | Headless UI components |
| NextAuth.js | ISC | Authentication |
| Lucide React | ISC | Icon library |
| bcryptjs | MIT | Password hashing |

The full list of dependencies and their licenses can be found in `package.json`
and the respective `node_modules` packages.

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file
for details.

The MIT License requires that the original copyright notice and permission notice
be included in all copies or substantial portions of the software. The original
Pintree copyright notice is preserved in the [LICENSE](./LICENSE) file as required.

---

## Disclaimer

This software is provided "AS IS", without warranty of any kind, express or
implied. In no event shall the authors or copyright holders be liable for any
claim, damages or other liability arising from the use of this software.

Pinbranch is an independent derivative work. The original Pintree project and its
authors are not responsible for any modifications made in this derivative.

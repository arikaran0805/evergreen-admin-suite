# Role-Based Routing & Sidebar Architecture

## Overview
This document describes the strictly role-separated routing and sidebar system.

## Core Principles
1. **One Role = One Route File = One Sidebar Config = One Layout**
2. **No shared routes or conditional role logic**
3. **1:1 mapping between routes and sidebar items**

## File Structure

```
/src
├── guards/
│   ├── index.ts                    # Exports all guards
│   ├── AdminGuard.tsx              # Admin role enforcement
│   ├── SeniorModeratorGuard.tsx    # Senior Moderator enforcement
│   └── ModeratorGuard.tsx          # Moderator enforcement
│
├── routes/
│   ├── index.ts                    # Exports all route components
│   ├── admin.routes.tsx            # /admin/* routes
│   ├── seniorModerator.routes.tsx  # /senior-moderator/* routes
│   ├── moderator.routes.tsx        # /moderator/* routes
│   └── public.routes.tsx           # Public routes
│
├── sidebar/
│   ├── index.ts                    # Exports all sidebar configs
│   ├── types.ts                    # Shared type definitions
│   ├── admin.sidebar.ts            # Admin sidebar config
│   ├── seniorModerator.sidebar.ts  # Senior Moderator sidebar config
│   └── moderator.sidebar.ts        # Moderator sidebar config
│
├── components/
│   ├── RoleSidebar.tsx             # Shared sidebar component
│   ├── AdminSidebar.tsx            # Admin-specific sidebar wrapper
│   ├── SeniorModeratorSidebar.tsx  # Senior Mod sidebar wrapper
│   ├── ModeratorSidebar.tsx        # Moderator sidebar wrapper
│   └── layouts/
│       ├── index.ts                # Exports all layouts
│       ├── AdminLayout.tsx         # Admin layout
│       ├── SeniorModeratorLayout.tsx # Senior Mod layout
│       └── ModeratorLayout.tsx     # Moderator layout
│
└── App.tsx                         # Main router composition
```

## URL Prefixes

| Role | URL Prefix |
|------|------------|
| Admin | `/admin/*` |
| Senior Moderator | `/senior-moderator/*` |
| Moderator | `/moderator/*` |

## Adding a New Role

1. Create `src/guards/NewRoleGuard.tsx`
2. Create `src/sidebar/newRole.sidebar.ts`
3. Create `src/routes/newRole.routes.tsx`
4. Create `src/components/layouts/NewRoleLayout.tsx`
5. Create `src/components/NewRoleSidebar.tsx`
6. Update index files to export new components
7. Add routes to `App.tsx`

## Sync Guarantee

- Every route in `*.routes.tsx` MUST have a matching sidebar item
- Every sidebar item in `*.sidebar.ts` MUST have a matching route
- No orphan menu items
- No hidden routes

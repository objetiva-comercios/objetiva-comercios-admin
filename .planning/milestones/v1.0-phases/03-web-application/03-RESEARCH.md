# Phase 3: Web Application - Research

**Researched:** 2026-01-24
**Domain:** Next.js 14 App Router with Supabase Auth, shadcn/ui, and TanStack Table
**Confidence:** HIGH

## Summary

This phase builds a complete Next.js 14 admin dashboard with authentication, navigation, and operational data sections. The standard stack combines Next.js App Router for Server Components and routing, Supabase Auth with @supabase/ssr for authentication, shadcn/ui + TanStack Table for UI components, and React Hook Form + Zod for form validation.

The research confirms that Next.js 14 App Router requires specific patterns for authentication (cookie-based with middleware), data fetching (Server Components with parallel patterns), and state management (avoiding global state in RSCs). shadcn/ui provides a headless, copy-paste component approach that gives full control over markup while maintaining accessibility.

Key architectural decisions: Use Server Components for data fetching by default, implement authentication via middleware with Supabase's cookie-based pattern, use TanStack Table for dense admin tables with sorting/filtering/pagination, and implement real-time updates via polling (WebSockets require separate persistent server).

**Primary recommendation:** Follow Next.js Server Component patterns for data fetching, use Supabase's @supabase/ssr package with proper client types (browser vs server), implement shadcn/ui components via copy-paste for maximum flexibility, and use TanStack Table for all operational data tables.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library               | Version | Purpose                           | Why Standard                                                       |
| --------------------- | ------- | --------------------------------- | ------------------------------------------------------------------ |
| Next.js               | 14.x    | React framework with App Router   | Industry standard for React SSR, Server Components, and routing    |
| @supabase/supabase-js | Latest  | Supabase client library           | Official Supabase SDK for auth and data operations                 |
| @supabase/ssr         | Latest  | SSR auth helpers for Next.js      | Official package for cookie-based auth in App Router               |
| @tanstack/react-table | Latest  | Headless table library            | De facto standard for complex data tables, flexible and performant |
| react-hook-form       | Latest  | Form state management             | Most popular form library, minimal re-renders, excellent DX        |
| zod                   | Latest  | TypeScript-first validation       | Type-safe validation, shares schemas between client/server         |
| next-themes           | Latest  | Theme management for Next.js      | Simplest solution for dark mode with App Router                    |
| shadcn/ui             | N/A     | Component collection (copy-paste) | Not a package - provides accessible, customizable components       |

### Supporting

| Library                  | Version                 | Purpose                          | When to Use                                          |
| ------------------------ | ----------------------- | -------------------------------- | ---------------------------------------------------- |
| @hookform/resolvers      | Latest                  | Validation integration for RHF   | Always use with react-hook-form + zod                |
| date-fns                 | Latest                  | Date formatting and manipulation | For date pickers and dashboard date ranges           |
| react-day-picker         | Latest                  | Calendar/date picker component   | Official date picker used by shadcn/ui               |
| recharts                 | Latest                  | Chart library for React          | For dashboard visualizations (moderate data volumes) |
| lucide-react             | Latest                  | Icon library                     | Default icon set for shadcn/ui components            |
| tailwind-merge           | Already in @objetiva/ui | Merge Tailwind classes           | Core utility for shadcn/ui cn() function             |
| class-variance-authority | Already in @objetiva/ui | Component variants               | For building variant-based components                |
| clsx                     | Already in @objetiva/ui | Conditional classNames           | Part of cn() utility function                        |

### Alternatives Considered

| Instead of      | Could Use               | Tradeoff                                                                  |
| --------------- | ----------------------- | ------------------------------------------------------------------------- |
| TanStack Table  | AG Grid / MUI Data Grid | Commercial licenses required, less flexible but more batteries-included   |
| Recharts        | Chart.js / ApexCharts   | Chart.js is lower-level, ApexCharts has different API style               |
| React Hook Form | Formik                  | Formik has more re-renders, less performant for large forms               |
| @supabase/ssr   | NextAuth.js / Auth.js   | NextAuth is more complex setup, Supabase integrated with backend          |
| Polling         | WebSockets              | WebSockets require separate persistent server (not serverless-compatible) |

**Installation:**

```bash
# Authentication
pnpm add @supabase/supabase-js @supabase/ssr

# Data tables
pnpm add @tanstack/react-table

# Forms and validation
pnpm add react-hook-form zod @hookform/resolvers

# Date handling
pnpm add date-fns react-day-picker

# Charts
pnpm add recharts

# Theming
pnpm add next-themes

# Icons
pnpm add lucide-react

# shadcn/ui components are added via CLI:
npx shadcn@latest add button input label form table sheet dialog popover calendar select
```

## Architecture Patterns

### Recommended Project Structure

```
apps/web/
├── app/
│   ├── (auth)/              # Auth route group (no sidebar)
│   │   ├── login/           # Login page
│   │   └── signup/          # Signup page
│   ├── (dashboard)/         # Dashboard route group (with sidebar layout)
│   │   ├── layout.tsx       # Sidebar + header layout
│   │   ├── dashboard/       # Dashboard page
│   │   ├── articles/        # Products/Articles section
│   │   ├── purchases/       # Purchases section
│   │   ├── sales/           # Sales section
│   │   ├── orders/          # Orders section
│   │   ├── inventory/       # Inventory section
│   │   └── settings/        # Settings section
│   ├── auth/
│   │   └── callback/        # Supabase auth callback route
│   ├── layout.tsx           # Root layout with ThemeProvider
│   └── middleware.ts        # Auth middleware (renamed from proxy.js in future)
├── components/
│   ├── ui/                  # shadcn/ui components (copy-pasted)
│   ├── layout/              # Layout components (Sidebar, Header, etc.)
│   ├── tables/              # Reusable table components
│   ├── forms/               # Form components
│   └── providers/           # Context providers (ThemeProvider, etc.)
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser client
│   │   └── server.ts        # Server client
│   └── utils.ts             # Utility functions (cn, etc.)
└── types/                   # TypeScript types
```

### Pattern 1: Supabase Authentication with Cookie-Based Sessions

**What:** Implement authentication using Supabase's @supabase/ssr package with separate client types for browser and server environments.

**When to use:** All authenticated routes in Next.js App Router applications with Supabase.

**Key principles:**

- Use `createBrowserClient()` for Client Components
- Use `createServerClient()` for Server Components, Server Actions, and Route Handlers
- Implement middleware to refresh tokens and update cookies
- Never use `getSession()` in server code - always use `getClaims()` for security

**Example:**

```typescript
// lib/supabase/client.ts (Browser Client)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts (Server Client)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )
}

// middleware.ts (Token refresh)
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session and validate JWT
  const {
    data: { claims },
  } = await supabase.auth.getClaims()

  // Redirect to login if not authenticated
  if (!claims && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

**Sources:**

- [Supabase Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Auth Common Pitfalls](https://hrekov.com/blog/supabase-common-mistakes)

### Pattern 2: Next.js Server Component Data Fetching

**What:** Fetch data on the server using Server Components with parallel fetching to avoid waterfalls.

**When to use:** All data fetching for initial page loads and authenticated routes.

**Key principles:**

- Fetch data in Server Components by default
- Use Promise.all() for parallel fetching to avoid waterfalls
- Use Suspense boundaries for sequential dependencies
- Use React.cache() for request memoization
- Never use global state (Redux, Zustand) in Server Components

**Example:**

```typescript
// Source: https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns

// app/(dashboard)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'

// Parallel data fetching
async function getDashboardStats() {
  const supabase = await createClient()
  const { data } = await supabase.from('stats').select('*')
  return data
}

async function getRecentOrders() {
  const supabase = await createClient()
  const { data } = await supabase.from('orders').select('*').limit(10)
  return data
}

export default async function DashboardPage() {
  // Initiate both requests in parallel
  const statsPromise = getDashboardStats()
  const ordersPromise = getRecentOrders()

  // Wait for both to resolve
  const [stats, orders] = await Promise.all([statsPromise, ordersPromise])

  return (
    <div>
      <DashboardStats stats={stats} />
      <RecentOrders orders={orders} />
    </div>
  )
}
```

**Sources:**

- [Next.js Data Fetching Patterns](https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns)

### Pattern 3: TanStack Table for Admin Data Tables

**What:** Build headless data tables with sorting, filtering, pagination, and row selection using TanStack Table.

**When to use:** All operational data displays (products, orders, inventory, sales, purchases).

**Key principles:**

- Define columns in separate file for reusability
- Use memoization (useMemo) for data and columns to prevent re-renders
- Implement progressive enhancement: basic table → sorting → filtering → pagination → selection
- Combine with shadcn/ui Sheet component for row details side panel
- Keep table logic in DataTable component, pass data from Server Component

**Example:**

```typescript
// Source: https://ui.shadcn.com/docs/components/data-table

// components/tables/products/columns.tsx
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Product } from "@/types"

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("price"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "status",
    header: "Status",
  },
]

// components/tables/products/data-table.tsx
"use client"

import { useState } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <div>
      {/* Filter */}
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter by name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

// app/(dashboard)/articles/page.tsx (Server Component)
import { DataTable } from "@/components/tables/products/data-table"
import { columns } from "@/components/tables/products/columns"

async function getProducts() {
  const response = await fetch('http://localhost:3001/products')
  return response.json()
}

export default async function ArticlesPage() {
  const products = await getProducts()

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={products} />
    </div>
  )
}
```

**Sources:**

- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table)
- [TanStack Table Guide](https://www.contentful.com/blog/tanstack-table-react-table/)

### Pattern 4: React Hook Form + Zod for Forms

**What:** Type-safe form validation using Zod schemas with React Hook Form for state management.

**When to use:** All forms (login, signup, settings, create/edit operations).

**Key principles:**

- Define Zod schema once, share between client and server
- Use zodResolver to integrate with React Hook Form
- Validate on blur for text fields, on submit for complex rules
- Use Controller component for custom shadcn/ui form fields
- Display field-level errors with proper accessibility (aria-invalid)

**Example:**

```typescript
// Source: https://ui.shadcn.com/docs/forms/react-hook-form

"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

// Define schema
const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
})

export function LoginForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Server-side validation would use the same schema
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

**Sources:**

- [shadcn/ui React Hook Form](https://ui.shadcn.com/docs/forms/react-hook-form)
- [React Hook Form + Zod Guide](https://www.freecodecamp.org/news/react-form-validation-zod-react-hook-form/)

### Pattern 5: Responsive Sidebar with Layout Groups

**What:** Implement auto-responsive sidebar navigation using Next.js route groups and layout nesting.

**When to use:** Dashboard layout with persistent navigation that adapts to screen sizes.

**Key principles:**

- Use route groups (dashboard) for layouts without affecting URL structure
- Full sidebar on desktop, collapsed on tablet, hidden on mobile (hamburger)
- Use Tailwind responsive utilities for automatic adaptation
- Use shadcn/ui Sheet component for mobile drawer
- Layout doesn't remount on navigation (persistent state)

**Example:**

```typescript
// app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - hidden on mobile, visible on tablet+ */}
      <Sidebar className="hidden md:flex" />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with mobile menu toggle */}
        <Header />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

// components/layout/sidebar.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  ClipboardList,
  Warehouse,
  Settings,
} from "lucide-react"

const routes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Articles", icon: Package, href: "/articles" },
  { label: "Purchases", icon: ShoppingCart, href: "/purchases" },
  { label: "Sales", icon: ShoppingBag, href: "/sales" },
  { label: "Orders", icon: ClipboardList, href: "/orders" },
  { label: "Inventory", icon: Warehouse, href: "/inventory" },
  { label: "Settings", icon: Settings, href: "/settings" },
]

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <div className={cn("flex w-64 flex-col border-r bg-background", className)}>
      <div className="flex h-14 items-center border-b px-4">
        <h1 className="text-xl font-bold">Objetiva Admin</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === route.href
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            <route.icon className="h-5 w-5" />
            {route.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
```

**Sources:**

- [Next.js App Router Best Practices](https://thiraphat-ps-dev.medium.com/mastering-next-js-app-router-best-practices-for-structuring-your-application-3f8cf0c76580)
- [shadcn/ui Sidebar Template](https://www.shadcn.io/template/salimi-my-shadcn-ui-sidebar)

### Pattern 6: Dark Mode with next-themes

**What:** Implement system-aware dark mode using next-themes package.

**When to use:** All applications with dark theme requirements.

**Key principles:**

- Wrap app in ThemeProvider at root layout
- Add suppressHydrationWarning to html tag to prevent warnings
- Use useTheme hook in client components to toggle theme
- Use attribute="class" for Tailwind CSS integration
- Enable system theme detection by default

**Example:**

```typescript
// Source: https://ui.shadcn.com/docs/dark-mode/next

// components/providers/theme-provider.tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// app/layout.tsx
import { ThemeProvider } from "@/components/providers/theme-provider"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

// components/layout/theme-toggle.tsx
"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

**Sources:**

- [shadcn/ui Dark Mode for Next.js](https://ui.shadcn.com/docs/dark-mode/next)

### Pattern 7: Loading States with Suspense and Skeletons

**What:** Show loading states during data fetching using Next.js loading.js convention and React Suspense.

**When to use:** All async data fetching routes and components.

**Key principles:**

- Use loading.js for route-level loading states
- Use Suspense for component-level loading states
- Design skeletons that match final content structure
- Wrap only the dynamic parts in Suspense (keep static UI visible)

**Example:**

```typescript
// Source: https://nextjs.org/docs/14/app/building-your-application/routing/loading-ui-and-streaming

// app/(dashboard)/articles/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container mx-auto py-10">
      <Skeleton className="h-10 w-64 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}

// Or use Suspense for granular control
import { Suspense } from "react"

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Static content loads immediately */}
      <div className="grid grid-cols-3 gap-4">
        <Suspense fallback={<StatsCardSkeleton />}>
          <StatsCard />
        </Suspense>

        <Suspense fallback={<StatsCardSkeleton />}>
          <RecentOrders />
        </Suspense>
      </div>
    </div>
  )
}
```

**Sources:**

- [Next.js Loading UI and Streaming](https://nextjs.org/docs/14/app/building-your-application/routing/loading-ui-and-streaming)
- [Loading States Best Practices](https://www.getfishtank.com/insights/best-practices-for-loading-states-in-nextjs)

### Anti-Patterns to Avoid

**1. Using Context or Global State in Server Components**

- Server Components cannot use React Context or global state managers (Redux, Zustand)
- Global variables in Server Components are shared across requests (security risk)
- Solution: Use Server Components for data fetching, pass data as props to Client Components

**2. Using getSession() in Server Code**

- Supabase's getSession() doesn't revalidate JWT tokens
- Solution: Always use getClaims() for server-side authentication checks

**3. Dynamic Environment Variable Access**

- `process.env[varName]` doesn't work with NEXT*PUBLIC* inlining
- Solution: Use direct property access: `process.env.NEXT_PUBLIC_API_URL`

**4. Putting Sensitive Data in NEXT*PUBLIC* Variables**

- NEXT*PUBLIC* variables are inlined in client bundle
- Solution: Keep API keys and secrets in server-only environment variables

**5. Using Templates Instead of Layouts for Persistent UI**

- Templates re-render on every navigation (resets state)
- Solution: Use layouts for persistent sidebar/header that maintains state

**6. Not Memoizing Table Data and Columns**

- Causes TanStack Table to re-initialize on every render
- Solution: Wrap data and columns in useMemo hook

**Sources:**

- [Common Next.js App Router Mistakes](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)
- [NEXT_PUBLIC Environment Variable Pitfalls](https://dev.to/koyablue/the-pitfalls-of-nextpublic-environment-variables-96c)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem               | Don't Build                         | Use Instead                                   | Why                                                                                                                         |
| --------------------- | ----------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Data tables           | Custom table with sort/filter logic | TanStack Table + shadcn/ui Table              | Handles edge cases: sorting multiple columns, column visibility, row selection state, pagination state management           |
| Form validation       | Custom validation logic             | React Hook Form + Zod                         | Manages re-render optimization, field registration, error state, touched/dirty tracking, async validation                   |
| Date pickers          | Custom calendar UI                  | react-day-picker + shadcn/ui                  | Handles keyboard navigation, accessibility (aria attributes), localization, timezone complexity, range selection edge cases |
| Authentication state  | Custom auth hooks                   | Supabase Auth + @supabase/ssr                 | Handles token refresh, cookie management, SSR hydration, middleware integration, security best practices                    |
| Theme switching       | Custom localStorage theme logic     | next-themes                                   | Handles SSR/hydration issues, system theme detection, FOUC prevention, cookie persistence                                   |
| Dark mode CSS         | Custom CSS variables                | Tailwind dark: variant + next-themes          | Handles class-based theming, no flash of unstyled content, automatic system detection                                       |
| Charts                | Custom SVG/Canvas charts            | Recharts                                      | Handles responsive sizing, legend generation, axis calculations, tooltip positioning, animation                             |
| Loading skeletons     | Custom pulse animations             | shadcn/ui Skeleton                            | Handles animation timing, screen reader hiding, proper semantic HTML                                                        |
| Responsive navigation | Custom media query logic            | Tailwind responsive classes + shadcn/ui Sheet | Handles breakpoint consistency, touch targets, focus management, keyboard navigation                                        |
| Side panels           | Custom drawer implementation        | shadcn/ui Sheet                               | Handles focus trapping, scroll locking, escape key, backdrop clicks, animation timing                                       |

**Key insight:** Modern React admin applications have well-established patterns. The combination of Next.js App Router + Supabase Auth + shadcn/ui + TanStack Table covers 90% of admin dashboard needs. Custom solutions introduce bugs around accessibility, performance, and edge cases that these libraries have already solved.

## Common Pitfalls

### Pitfall 1: Server Component State Contamination

**What goes wrong:** Using global state (Redux store, module-level variables) in Server Components causes data to leak between different users' requests.

**Why it happens:** Developers assume Server Components work like Client Components. Server Components run once per request and global variables persist across requests in the same process.

**How to avoid:**

- Never use Redux, Zustand, or other global state managers in Server Components
- Never declare module-level variables that change per request
- Always fetch data fresh in each Server Component using async/await
- Pass data down as props to Client Components that need interactivity

**Warning signs:**

- Seeing other users' data occasionally appear
- Inconsistent data between page loads
- State "bleeding" across requests in development

**Sources:**

- [Redux in Next.js App Router](https://redux.js.org/usage/nextjs)
- [Common Next.js Mistakes](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)

### Pitfall 2: Supabase Auth Security Issues

**What goes wrong:** Using `getSession()` instead of `getClaims()` in server code allows attackers to forge sessions by manipulating cookies.

**Why it happens:** `getSession()` reads cookies directly without validating JWT signatures. Developers assume session data from cookies is trusted.

**How to avoid:**

- Always use `supabase.auth.getClaims()` for authentication checks in Server Components, Server Actions, and Route Handlers
- Use `getSession()` only in Client Components where it's safe
- Implement middleware to refresh tokens automatically
- Never trust session data without validation

**Warning signs:**

- Authentication checks that only read cookies
- No JWT signature validation in server code
- Middleware that doesn't call `getClaims()`

**Sources:**

- [Supabase Server-Side Auth](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Common Pitfalls](https://hrekov.com/blog/supabase-common-mistakes)

### Pitfall 3: NEXT*PUBLIC* Environment Variable Misuse

**What goes wrong:** Developers expose sensitive API keys or backend URLs by prefixing them with `NEXT_PUBLIC_`, making them visible in the client-side JavaScript bundle.

**Why it happens:** Misunderstanding that `NEXT_PUBLIC_` makes variables accessible to client code and are inlined at build time.

**How to avoid:**

- Only use `NEXT_PUBLIC_` for truly public values (Supabase anon key, public API URLs)
- Keep secret keys (database URLs, service role keys, third-party API keys) without the prefix
- Remember that `NEXT_PUBLIC_` variables are evaluated at build time (restart server after changes)
- Don't use dynamic access: `process.env[key]` won't work with inlined variables

**Warning signs:**

- API keys visible in browser DevTools
- Backend URLs exposed in client bundle
- Environment variables not updating after changes without rebuild

**Sources:**

- [NEXT_PUBLIC Pitfalls](https://dev.to/koyablue/the-pitfalls-of-nextpublic-environment-variables-96c)
- [Next.js Environment Variables](https://nextjs.org/docs/pages/guides/environment-variables)

### Pitfall 4: TanStack Table Performance Issues

**What goes wrong:** Tables re-render constantly or become sluggish with moderate amounts of data (100+ rows).

**Why it happens:** Not memoizing data and columns, causing useReactTable to reinitialize on every parent component render.

**How to avoid:**

- Always wrap table data in `useMemo(() => data, [data])`
- Always wrap column definitions in `useMemo(() => columns, [])`
- For large datasets (5000+ rows), consider pagination or virtualization
- Use React.memo on table row components if needed
- Avoid inline functions in column definitions

**Warning signs:**

- Table UI feels sluggish or laggy
- Page scrolling is janky
- DevTools showing many unnecessary re-renders
- CPU usage spikes when interacting with table

**Sources:**

- [Recharts Performance Optimization](https://recharts.github.io/en-US/guide/performance/)
- [TanStack Table Best Practices](https://www.contentful.com/blog/tanstack-table-react-table/)

### Pitfall 5: Middleware Authentication Logic Errors

**What goes wrong:** Authentication middleware blocks too many routes (including static assets) or doesn't refresh tokens properly, causing unexpected logouts.

**Why it happens:** Incorrect matcher configuration runs middleware on every request including images, or middleware doesn't properly update response cookies after token refresh.

**How to avoid:**

- Use proper matcher pattern to exclude static assets, Next.js internal routes, and public files
- Always update both request and response cookies in middleware
- Call `supabase.auth.getClaims()` to trigger token refresh
- Return the modified response object

**Warning signs:**

- Users logged out unexpectedly
- Static assets return 401 errors
- Infinite redirect loops between login and dashboard
- Middleware runs on every file request

**Sources:**

- [Supabase Auth Troubleshooting](https://supabase.com/docs/guides/troubleshooting/how-do-you-troubleshoot-nextjs---supabase-auth-issues-riMCZV)
- [Next.js Middleware Best Practices](https://medium.com/@narayanansundar02/middleware-in-next-js-authentication-redirects-and-more-5b6a59c81291)

### Pitfall 6: Hydration Mismatches with Dark Mode

**What goes wrong:** Flash of unstyled content (FOUC) or React hydration errors when implementing dark mode.

**Why it happens:** Server doesn't know the user's theme preference, so initial HTML doesn't match client-side theme.

**How to avoid:**

- Add `suppressHydrationWarning` to `<html>` tag
- Use next-themes with `attribute="class"` for Tailwind integration
- Set `enableSystem` and `defaultTheme="system"` for proper system detection
- Wrap ThemeProvider in root layout, not in client component

**Warning signs:**

- Flash of light theme before dark theme loads
- React hydration warnings in console
- Theme toggle doesn't work on first click
- Theme resets on page navigation

**Sources:**

- [shadcn/ui Dark Mode](https://ui.shadcn.com/docs/dark-mode/next)
- [Dark Mode with next-themes](https://medium.com/@elhamrani.omar23/dark-mode-using-shadcn-with-nextjs-2b3f7163a4cb)

### Pitfall 7: Real-Time Updates with WebSockets

**What goes wrong:** Attempting to implement WebSockets in Next.js serverless environment (Vercel) fails because serverless functions can't maintain persistent connections.

**Why it happens:** Developers assume Next.js server can handle WebSocket connections like a traditional Node server. Serverless platforms have connection time limits.

**How to avoid:**

- Use polling for real-time updates in serverless environments (every 30-60 seconds)
- If WebSockets are required, deploy separate persistent WebSocket server
- Consider Server-Sent Events (SSE) for one-way updates
- Use TanStack Query with refetchInterval for automatic polling
- For Vercel deployments, accept that real-time = frequent polling

**Warning signs:**

- WebSocket connections fail after deployment
- Errors about "serverless function timeout"
- Connections work locally but not in production
- "Connection closed" errors in production logs

**Sources:**

- [WebSockets with Next.js](https://dev.to/brinobruno/real-time-web-communication-longshort-polling-websockets-and-sse-explained-nextjs-code-1l43)
- [Next.js WebSocket Discussion](https://github.com/vercel/next.js/discussions/14950)

## Code Examples

Verified patterns from official sources:

### Parallel Data Fetching for Dashboard

```typescript
// Source: https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns

export default async function DashboardPage() {
  // Initiate all requests in parallel
  const statsPromise = fetch('http://localhost:3001/dashboard/stats')
  const lowStockPromise = fetch('http://localhost:3001/dashboard/low-stock')
  const recentOrdersPromise = fetch('http://localhost:3001/dashboard/recent-orders')

  // Wait for all to resolve
  const [statsRes, lowStockRes, ordersRes] = await Promise.all([
    statsPromise,
    lowStockPromise,
    recentOrdersPromise,
  ])

  const stats = await statsRes.json()
  const lowStock = await lowStockRes.json()
  const orders = await ordersRes.json()

  return (
    <div className="space-y-6">
      <DashboardStats stats={stats} />
      <LowStockAlerts items={lowStock} />
      <RecentOrders orders={orders} />
    </div>
  )
}
```

### Side Panel with Sheet for Row Details

```typescript
// Source: https://ui.shadcn.com/docs/components/sheet

"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useState } from "react"

export function ProductsTable({ products }) {
  const [selectedProduct, setSelectedProduct] = useState(null)

  return (
    <>
      <Table>
        <TableBody>
          {products.map((product) => (
            <TableRow
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="cursor-pointer hover:bg-accent"
            >
              <TableCell>{product.name}</TableCell>
              <TableCell>{product.price}</TableCell>
              <TableCell>{product.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedProduct?.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="font-semibold">Price</h3>
              <p>{selectedProduct?.price}</p>
            </div>
            <div>
              <h3 className="font-semibold">Status</h3>
              <p>{selectedProduct?.status}</p>
            </div>
            {/* Edit form would go here */}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
```

### Date Range Picker for Dashboard Filters

```typescript
// Source: https://ui.shadcn.com/docs/components/date-picker

"use client"

import { addDays, format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useState } from "react"

export function DateRangePicker({ className }: { className?: string }) {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
```

### Dashboard Chart with Recharts

```typescript
// Source: Recharts documentation + shadcn/ui patterns

"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SalesData {
  date: string
  sales: number
}

export function SalesChart({ data }: { data: SalesData[] }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          className="text-xs"
          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis className="text-xs" />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
          labelFormatter={(value) => new Date(value).toLocaleDateString()}
        />
        <Line
          type="monotone"
          dataKey="sales"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

## State of the Art

| Old Approach                    | Current Approach         | When Changed       | Impact                                                  |
| ------------------------------- | ------------------------ | ------------------ | ------------------------------------------------------- |
| Next.js Pages Router            | Next.js App Router       | Next.js 13+ (2023) | Server Components by default, nested layouts, streaming |
| @supabase/auth-helpers          | @supabase/ssr            | 2024               | Simpler cookie management, better SSR support           |
| React Table v7                  | TanStack Table v8        | 2022               | Framework-agnostic, better TypeScript, tree-shakeable   |
| Custom form libraries           | React Hook Form + Zod    | 2020-2023          | Type-safe validation, shared schemas, less boilerplate  |
| CSS Modules / styled-components | Tailwind CSS + shadcn/ui | 2022-2024          | Utility-first styling, copy-paste components            |
| SWR / React Query v3            | TanStack Query v5        | 2023               | Better SSR integration, streaming support               |
| Express middleware              | Next.js middleware       | Next.js 12+ (2021) | Edge runtime, automatic optimization                    |
| manual dark mode                | next-themes              | 2020+              | System detection, no FOUC, SSR-safe                     |

**Deprecated/outdated:**

- **@supabase/auth-helpers-nextjs**: Replaced by @supabase/ssr for better cookie handling and App Router support
- **next/legacy/image**: Use next/image (current) with automatic optimization
- **middleware.js**: Being renamed to proxy.js (not deprecated yet but convention changing)
- **getServerSideProps / getStaticProps**: Use Server Components and fetch directly in App Router
- **Redux for all state**: Use Server Components for server state, React Hook Form for form state, URL params for filters

## Open Questions

Things that couldn't be fully resolved:

1. **Real-time updates implementation strategy**
   - What we know: WebSockets don't work in serverless (Vercel), polling works but isn't true real-time
   - What's unclear: Whether the backend will be deployed to serverless or persistent server
   - Recommendation: Start with polling (TanStack Query refetchInterval: 30000), migrate to WebSockets if backend deployment supports it in Phase 5

2. **Chart library final selection**
   - What we know: Recharts is easy but limited to <100 data points, Tremor provides pre-built dashboard components, Chart.js is more performant
   - What's unclear: Expected data volume for dashboard charts (10 points vs 1000 points)
   - Recommendation: Start with Recharts for simplicity, switch to Chart.js if performance becomes an issue

3. **TanStack Query vs native fetch in Server Components**
   - What we know: Server Components can fetch directly, TanStack Query adds caching/refetching for Client Components
   - What's unclear: Whether complex client-side data synchronization will be needed
   - Recommendation: Start with native fetch in Server Components, add TanStack Query only if needed for polling or complex client state

## Sources

### Primary (HIGH confidence)

- [Supabase Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) - Official Supabase documentation
- [Next.js Data Fetching Patterns](https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns) - Official Next.js documentation
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table) - Official shadcn/ui documentation
- [shadcn/ui React Hook Form](https://ui.shadcn.com/docs/forms/react-hook-form) - Official shadcn/ui documentation
- [shadcn/ui Dark Mode](https://ui.shadcn.com/docs/dark-mode/next) - Official shadcn/ui documentation
- [Next.js Loading UI and Streaming](https://nextjs.org/docs/14/app/building-your-application/routing/loading-ui-and-streaming) - Official Next.js documentation

### Secondary (MEDIUM confidence)

- [TanStack Table Guide](https://www.contentful.com/blog/tanstack-table-react-table/) - Comprehensive third-party guide
- [React Hook Form + Zod Guide](https://www.freecodecamp.org/news/react-form-validation-zod-react-hook-form/) - freeCodeCamp tutorial
- [Supabase Common Pitfalls](https://hrekov.com/blog/supabase-common-mistakes) - Third-party blog post
- [Common Next.js App Router Mistakes](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) - Official Vercel blog
- [NEXT_PUBLIC Environment Variable Pitfalls](https://dev.to/koyablue/the-pitfalls-of-nextpublic-environment-variables-96c) - DEV Community
- [Recharts Performance](https://recharts.github.io/en-US/guide/performance/) - Official Recharts documentation
- [Next.js in 2026 Overview](https://www.nucamp.co/blog/next.js-in-2026-the-full-stack-react-framework-that-dominates-the-industry) - Industry overview
- [Loading States Best Practices](https://www.getfishtank.com/insights/best-practices-for-loading-states-in-nextjs) - Third-party best practices

### Tertiary (LOW confidence - marked for validation)

- [WebSockets with Next.js](https://dev.to/brinobruno/real-time-web-communication-longshort-polling-websockets-and-sse-explained-nextjs-code-1l43) - DEV Community tutorial
- [Next.js WebSocket Discussion](https://github.com/vercel/next.js/discussions/14950) - GitHub discussion (2021, may be outdated)
- [shadcn/ui Dashboard Templates](https://www.shadcnblocks.com/admin-dashboard) - Third-party template showcase
- [TanStack Query + Next.js 14 Integration](https://dev.to/krish_kakadiya_5f0eaf6342/react-server-components-tanstack-query-the-2026-data-fetching-power-duo-you-cant-ignore-21fj) - DEV Community article
- [Best React Chart Libraries 2026](https://embeddable.com/blog/react-chart-libraries) - Third-party comparison

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Verified through official documentation (Next.js, Supabase, shadcn/ui all have official docs confirming these patterns)
- Architecture: HIGH - Patterns verified in Next.js and Supabase official documentation with code examples
- Pitfalls: MEDIUM-HIGH - Combination of official sources (Vercel blog, Supabase docs) and verified community experiences
- Real-time updates: LOW - WebSocket limitations confirmed but polling implementation details need validation in Phase 5
- Chart library selection: MEDIUM - Recharts is well-documented but performance limits are estimates, not measured

**Research date:** 2026-01-24
**Valid until:** 30 days (2026-02-23) - Next.js and React ecosystem is relatively stable, but auth and component libraries receive frequent updates

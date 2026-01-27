# PDS Diary

A comprehensive **Plan / Do / See** diary for tracking your entire year, locally in your browser.

## Core Framework

- **Plan**: what you intend to do
- **Do**: what you actually did
- **See**: what you observed / learned

## Features

### 📝 Daily Journaling
- Create daily entries with Plan/Do/See sections
- **Do section with 3 numbered action items** for structured tracking
- **24-hour time tracking with hourly block granularity**
- Tag entries for easy organization and searching
- Full-text search across all entries

### 📅 Calendar & Year View
- **Monthly calendar view on home page** for quick navigation
- Interactive calendar to navigate your entire year
- Visual indicators for days with entries
- Quick date selection and entry creation
- Monthly and yearly overview displays

### 📊 Statistics & Analytics
- Track your current and longest journaling streaks
- Monthly distribution charts
- Tag frequency analysis
- Plan/Do/See completion rates
- Time block utilization statistics

### 🎯 Goals & Milestones
- Set yearly, quarterly, and monthly goals
- Break down goals into trackable milestones
- Visual progress tracking (0-100%)
- Organize goals by status (active/completed/archived)

### 📖 Reflection Templates
- **Daily**: Standard daily reflection
- **Weekly**: Review your week with structured prompts
- **Monthly**: Deep dive into monthly patterns and insights
- **Yearly**: Annual review with vision and achievements

### 💾 Data Management
- All data stored locally in your browser (LocalStorage)
- Export entries as JSON for backup
- Import entries to sync across devices
- Generate year-end summary reports (Markdown)

### 🎨 Modern UI
- Clean, intuitive interface built with React & Tailwind CSS
- Responsive design works on desktop and mobile
- Fast and lightweight - runs entirely in your browser
- No server required, complete privacy

## Getting Started

### Run locally

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal (usually `http://localhost:5173`).

## Google Calendar sync (optional, read-only)

This app can **read events from a Google Calendar** and show them on the Entry page (no writing back to Google).
It also supports **Google login** (required to use the app once enabled).

### Setup

1. Create a Google Cloud project and **enable “Google Calendar API”**
2. Create an **OAuth Client ID** for a **Web application**
3. Add your local dev origin and production origin as **Authorized JavaScript origins**:
   - `http://localhost:5173`
   - `https://pds-diary.vercel.app`
4. Create a `.env.local` file in the project root:

```bash
VITE_GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
```

### Use

1. Sign in with Google
2. Open any entry
3. In **Google Calendar (read-only)** panel, click **Connect**
4. Paste your calendar ID (example family calendar: `family00142091226312618231@group.calendar.google.com`)
5. Click **Load events**

## Supabase sync (automatic, recommended)

This enables **automatic cross‑device sync** (entries + goals) per Google account.

### Setup

1. Create a Supabase project
2. Create a table:

```sql
create table if not exists pds_data (
  user_id text primary key,
  entries jsonb not null,
  goals jsonb not null,
  updated_at timestamptz not null
);
```

3. Add Row Level Security policy (optional but recommended):

```sql
alter table pds_data enable row level security;
create policy "user can access own data" on pds_data
  for all using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);
```

4. Set env vars:

```bash
VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
```

### Notes
- Sign‑in uses your Google ID token to authenticate with Supabase.
- Sync happens automatically after login and on changes.

### Build for production

```bash
npm run build
npm run preview
```

## Tech Stack

- **React** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **React Router** for navigation
- **LocalStorage** for data persistence

## Privacy

All your data stays on your device. There are no servers, no tracking, no accounts. When Google login is enabled, data is stored per Google account (scoped by your Google user ID) in LocalStorage. Export your data anytime to keep backups or move between devices.

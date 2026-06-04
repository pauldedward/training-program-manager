# Training Program Manager

A small PWA to plan periodized training programs and run workouts. Two pages:

- **Plan** — build a full hierarchy: Macrocycle → Mesocycle → Microcycle → Workout → Exercise, with inline edit/delete at every level. Captures sets, reps, load/intensity, RPE, tempo, **rest**, how-to instructions and notes. Terminology follows standard periodization sources (Wikipedia *Sports Periodization*, TrainingPeaks, NSCA).
- **Run** — iPhone-first execution. Pick a session, step through exercises, mark each set **done** or **missed**, log actual reps/load and a short comment when something falls short. Progress bar + optional rest timer.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run preview  # preview the build
```

Add to your iPhone home screen (Share → Add to Home Screen) for a full-screen app.

## Storage

By default everything is saved in the browser (`localStorage`) — works offline, no setup.

### Optional cloud sync (write on desktop, run on iPhone)

1. Create a free Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env` and fill in:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
4. Restart `npm run dev`. The header shows **Synced** when cloud mode is active.

> Single-user app with no login: the schema allows the anon key to read/write one shared row. Data is low-sensitivity training plans. Add auth + per-user rows later if you ever need it.

## Tech

Vite · React · TypeScript · Tailwind CSS · vite-plugin-pwa · Supabase (optional).

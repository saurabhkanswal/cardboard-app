# CLAUDE.md — project constraints

Bare React Native (CLI, New Architecture + Hermes), TypeScript strict. This repo is a
boilerplate template: **consistency and clear layer boundaries matter more than cleverness.**
Add only what a feature needs. See `ARCHITECTURE.md` for the full rationale.

## Layered MVVM — one-way dependencies

```
View  →  ViewController  →  ViewModel  →  Model
```

| Layer | Folder | Role | May import |
| --- | --- | --- | --- |
| Model | `src/model/` | Data + I/O only, no business rules | *(nothing app-internal)* |
| ViewModel | `src/viewmodel/<feature>/` | Business logic, DTO→domain, the only caller of RTK Query hooks | `model/` |
| ViewController | `src/screens/<s>/use<S>Controller.ts` | Screen-specific UI state/handlers | `viewmodel/`, `components/`, `theme/` — **not** `model/` |
| View | `src/screens/<s>/<S>.tsx`, `src/components/` | Pure presentation | screens → viewmodel/components/theme; components → components/theme only |

`src/theme/` = design tokens. `src/app/` = composition root (Redux Provider, navigation).

These rules are **enforced by ESLint** (`eslint-plugin-boundaries` in `.eslintrc.js`). A
forbidden import fails `npm run lint`. Do not weaken the rules to make an import pass — move
the code to the correct layer instead.

## Hard constraints

- **Business logic never goes in components.** Deciding where logic lives:
  *"Would another screen need this rule?"* → ViewModel. *"Is it this screen's UI?"* → ViewController.
- **RTK Query hooks are called only inside `use<Feature>ViewModel.ts`.** Nowhere else.
- **Screens/ViewControllers must not import `src/model/`.** Go through the ViewModel.
- **Do not add libraries** beyond the approved stack without asking first.
- **No base classes, no DI containers.** Prefer explicit wiring over magic. No path aliases —
  use relative imports.

## Stack

Redux Toolkit + RTK Query (`fakeBaseQuery` for now) · React Navigation (native stack) +
react-native-screens + react-native-safe-area-context · `expo-video` (installed via
`npx install-expo-modules`, Expo SDK 58) with built-in caching (`{ uri, useCaching: true }`).
Export: `expo-file-system` (cache files) + `expo-media-library` (save to Photos), used only from
`src/model/export/`.

## Adding a feature

Model (DTO + endpoint) → ViewModel (mappers/rules/`use…ViewModel`) → ViewController →
View + components → register route in `src/app/navigation.tsx`. Then run `npx tsc --noEmit`
and `npm run lint`. Full checklist in `ARCHITECTURE.md`.

## Video tiles

`expo-video` player: `muted`, `loop`, no controls, `contentFit="cover"`. A tile only plays
when its id is in `playingIds` (visibility + screen focus + app foreground, limited to a
3×3 window — top 3 on-screen rails × 3 tiles — via `getActiveGridIds`). Pause on blur/background. Tiles are `React.memo`, fixed-size
with `getItemLayout`, keyed by `sectionId + videoId` (URLs repeat).

## Performance

Per the global guideline, follow **Measure → Optimize → Re-measure → Validate** for any
performance work. Don't add memoization, atomic state, or compiler changes without measured
profiler evidence.

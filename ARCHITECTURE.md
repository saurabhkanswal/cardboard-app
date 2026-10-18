# Architecture

This app uses a strict, layered **MVVM** architecture with one-way dependencies.
Boundaries are enforced by ESLint (`eslint-plugin-boundaries`) — a forbidden import
fails `npm run lint`, so the structure cannot silently rot.

```
View  →  ViewController  →  ViewModel  →  Model
```

Each arrow is a dependency: a layer may only know about the layer(s) to its right.

## The four layers

### 1. Model — `src/model/`
Raw data and I/O only. **No business rules.**
- `store.ts` — `configureStore` with the RTK Query middleware; exports typed
  `RootState` / `AppDispatch`.
- `api/baseApi.ts` — the root RTK Query `createApi` using `fakeBaseQuery`. Feature
  endpoints attach via `injectEndpoints`.
- `showcase/showcaseApi.ts`, `showcase/types.ts` — the `getShowcase` endpoint
  (currently a local mock inside `queryFn`) and its DTO types. Moving to a real
  backend changes only this file.

### 2. ViewModel — `src/viewmodel/<feature>/`
Business logic and domain shaping. Screen-agnostic; no UI concerns.
- `<feature>Mappers.ts` — pure DTO → domain mapping.
- `<feature>Rules.ts` — pure business-rule functions (no React, no Redux). e.g.
  `getPlayableIds(visibleIds, max)` caps concurrent video playback.
- `use<Feature>ViewModel.ts` — **the only place RTK Query hooks are called.**
  Returns domain data plus loading/error state and actions.

### 3. ViewController — `src/screens/<screen>/use<Screen>Controller.ts`
Screen-specific glue. One per screen.
- Local UI state, event handlers, screen focus (`useIsFocused`), `AppState`.
- Calls ViewModel hooks and formats data for this one View.
- **Must not import from `src/model/`.**

### 4. View — `src/screens/<screen>/<Screen>.tsx` and `src/components/`
Pure presentation.
- The screen file calls its controller hook and passes props down. No other logic.
- `src/components/` are stateless and prop-driven; they never import `model/` or
  `viewmodel/`. (A component may own its own `expo-video` player instance — a
  rendering concern — but only obeys its `uri` / `shouldPlay` props.)

`src/theme/` holds design tokens and may be imported by components and screens.
`src/app/` is the composition root (providers + navigation) and may wire everything.

## Dependency rules (enforced)

| From | May import |
| --- | --- |
| `components/` | `components/`, `theme/` |
| `screens/` | `viewmodel/`, `components/`, `theme/` (**not** `model/`) |
| `viewmodel/` | `model/` |
| `model/` | *(nothing app-internal)* |
| `theme/` | *(nothing app-internal)* |
| `app/` | `app/`, `model/`, `screens/`, `theme/` (composition root) |

External packages (React, React Native, Redux, React Navigation, expo-video) are
unrestricted. Rules live in `.eslintrc.js` under `boundaries/dependencies`.

### Example violation

Importing the store (Model) into a component is rejected:

```tsx
// src/components/VideoTile.tsx
import {store} from '../model/store'; // ❌
```

```
error  There is no policy allowing dependencies from elements of type
       "components" to elements of type "model"   boundaries/dependencies
```

## Decision rule: where does logic go?

> **"Would another screen need this rule?"** → ViewModel.
> **"Is it about this screen's UI?"** → ViewController.

Business logic never lives in components.

## How to add a new feature

1. **Model** — add `src/model/<feature>/types.ts` (DTOs) and
   `<feature>Api.ts` (`baseApi.injectEndpoints`, a `queryFn` or real request).
   Import the new api file in `store.ts` so its endpoints register.
2. **ViewModel** — add `src/viewmodel/<feature>/`: `types.ts` (domain model),
   `<feature>Mappers.ts`, any `<feature>Rules.ts`, and
   `use<Feature>ViewModel.ts` (the sole caller of the RTK Query hook).
3. **ViewController** — add `src/screens/<screen>/use<Screen>Controller.ts` with
   the screen's UI state and handlers. No `model/` imports.
4. **View** — add `src/screens/<screen>/<Screen>.tsx` (calls the controller) and
   any stateless `src/components/` it needs.
5. **Navigation** — register the screen in `src/app/navigation.tsx` and extend
   `RootStackParamList`.
6. **Verify** — `npx tsc --noEmit` and `npm run lint` must pass (lint will reject
   any cross-layer import you got wrong).

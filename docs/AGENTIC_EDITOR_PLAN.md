# Agentic video editor (talking-head POC) — phased plan

## Progress

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Plan saved, bridge skeleton, pairing | ✅ Done (2026-10-19) |
| 1 | Workspace, transcription, parse loop, agent turns (bridge only) | ✅ Done (2026-10-19) |
| 2 | Skia compositor (footage), Remix → Editor | ✅ Done (2026-10-19) |
| 3 | Captions `<code>` layer (JSX → Skia) | ✅ Done (2026-10-19) |
| 4 | Full agent loop in the app (chat, undo) | ⏳ Next |
| 5 | Jump cuts, punch-ins, music bed | Not started |
| 6 | Colour-grade shader | Not started |

## Context
Cardboard (desktop) ships "recipes": a kit (RECIPE.md + `captions.jsx` + music bed) that an AI
director applies by editing a declarative `timeline.tsx`. A WebGL compositor redraws
`model + t → frame` every frame, so edits show up live (see
`../cardboard-webgl-theory.html`, `../cardboard-ugc-demo.html`). We want the same loop on mobile:
the phone holds the preview and renders live with Skia, and a bridge server on the laptop runs
Claude Code (Agent SDK). Claude edits files in a per-project workspace, the bridge parses them
into a JSON model, and the phone hot-swaps it. The POC covers only talking-head videos, starts on
iOS, and stops at live preview (no export yet).

## Decisions
- **Kit:** Cardboard's **Simple UGC** recipe, vendored at `cardboard-bridge/kits/simple-ugc/`:
  `RECIPE.md`, `templates/captions.jsx`, `guide.jpg` and `assets/soft-bed.m4a`, all sha256-verified
  against Cardboard's manifest, plus our own `kit.json`. Private POC only.
- **Renderer:** `@shopify/react-native-skia`. The kit's `captions.jsx` runs unmodified: it returns
  a JSX div/span tree, which a small JSX → Skia renderer lays out and draws (Phase 3). Shaders are
  SkSL `RuntimeEffect`s.
- **Why Skia alone:** it covers 2D layer compositing, video frames as images, SkSL shaders, text,
  and offscreen surfaces for a later export. expo-gl or expo-three only matter for 3D scenes.
- **Bridge:** a separate repo (`assignment/cardboard-bridge`), Node 22 + TS, Claude Agent SDK, own
  workspace format (no dependency on `cb` or the Cardboard app).
- **Transcription:** whisper.cpp on the laptop (`brew install whisper-cpp`, model
  `cardboard-bridge/models/ggml-small.en.bin`, not committed). Word timings go to
  `analysis/<stem>.transcript.json` as `[[word, start, end]]`, the shape RECIPE.md expects. These are
  Claude's "ears".
- **Parsing:** on the bridge with `@babel/parser` (TypeScript 7 has no JS compiler API). The file is
  parsed, never evaluated, and attributes must be literals, the same as Cardboard.
- **Network:** same Wi-Fi. The bridge prints a QR code (LAN URL + token) and the app scans it
  (expo-camera) or takes a pasted code (simulator). HTTP for uploads and files, one WebSocket for
  events.
- **UX:** Remix is the entry point: picked video = footage, prompt = first instruction. Then the
  Editor screen: 9:16 Skia preview + transport + (Phase 4) chat sheet.
- **Undo:** one git commit per finished agent turn in each project workspace (one undo step).
- **Clock:** media is the master. While a clip plays, its player drives the timeline playhead, so
  everything drawn from the playhead stays in sync with picture and sound.
- **Edit scope:** captions, silence/jump cuts, colour-grade shader, music bed + punch-ins.

**Approved libraries:** `expo-camera` (Phase 0); `@shopify/react-native-skia`,
`react-native-reanimated`, `react-native-worklets` (Phase 2). Anything else needs approval first.

## Architecture

```
Phone (RN)                                         Laptop bridge (Node)
Remix ─XHR multipart: video+kitId+prompt──▶ POST /projects → projects/<id>/ (own git repo)
                                                  ├ media/<video>, media/soft-bed.m4a
                                                  ├ analysis/media.json (ffprobe), <stem>.transcript.json (whisper)
                                                  ├ recipe/ (kit + inputs.json), CLAUDE.md, tools/{check,frame,loudness}
                                                  └ timeline.tsx  ◀── Claude Agent SDK turn
Editor ◀──WS timeline {rev, draft, model, diagnostics}── fs.watch → babel parse → validate
       ◀──WS agent {text | tool | done} · project · job── Agent SDK stream; turn end → ids + git commit
       ──POST /projects/:id/messages | /undo | /cancel──▶
       ──GET /projects/:id/media/* (Range) · /kits/:id/compiled/* · /kits/:id/files/*──▶
```

The wire protocol (`src/protocol.ts`, currently **v3**) lives in the bridge repo and is **copied**
into `cardboard-app/src/model/bridge/protocol.ts`. It defines pairing, `TimelineModel`
(tracks → `clip | image | audio | code | shader`, plus the kit's `fonts`), snapshots, events and
requests.

## Bridge repo (`cardboard-bridge/`) — as built
- `src/server.ts`: http routes + `ws`, bearer/`?token=` auth, QR code on boot.
- `src/kits.ts`: kit discovery (`kits/<id>/kit.json`), `kitFonts` (added to every snapshot);
  compiles templates with esbuild into a factory `(h, Fragment, props) => Graphic` for the phone
  (cached by file + mtime). The phone loads the workspace's copy from
  `GET /projects/:id/compiled/<template>`.
- `kits/simple-ugc/fonts/InterDisplay-Bold.ttf` (Inter 4.1, OFL): `captions.jsx`'s ADVANCE table
  is exactly Inter Display Bold's (browsers pick the display optical size at these sizes), not
  Inter Bold's.
- `src/projects.ts`: workspace creation, media probe + transcription job, watcher → snapshot
  push, `commitTurn` (writes ids back, then commits), `undo` (`reset --hard HEAD~1`, never past the
  `base` tag), reload after restart.
- `src/media.ts`: ffprobe, ffmpeg 16 kHz wav, whisper `-ml 1 -sow` → words.
- `src/timeline/parse.ts`, `validate.ts`, `workspace.ts`, `checkCli.ts`: parser, semantic and
  recipe checks (caption block shape, star count, times), `tools/check`.
- `src/agent.ts`: Agent SDK `query()` with `cwd` = workspace, `settingSources: ['project']`,
  tools Read/Edit/Write/Glob/Grep + Bash limited to `tools/*`, `permissionMode: 'dontAsk'`,
  session resumed per project, phone-friendly tool summaries.
- `src/hub.ts`, `src/http.ts`, `src/git.ts`: socket fan-out, upload/Range helpers, git.
- `workspace-template/`: the director's `CLAUDE.md` (maps RECIPE.md's `cb` commands to our
  tools) and `tools/check | frame | loudness`.

## RN app (MVVM, boundaries enforced by lint) — as built
- **Model** `src/model/bridge/`: `protocol.ts` (copy), `pairingSlice.ts` (in memory),
  `bridgeApi.ts` (health check via fetch; `createProject` upload via **XMLHttpRequest**),
  `bridgeSocket.ts` (WS client with backoff), `bridgeConnection.ts` (the app's single socket,
  project subscriptions re-sent on reconnect; wired to pairing in `store.ts`).
- **ViewModel**
  - `viewmodel/pairing/`: `pairingRules.ts` (parse code, smart-quote tolerant),
    `usePairingViewModel.ts`, `useBridgeConnection.ts`, `useCameraPermission.ts`.
  - `viewmodel/remix/`: `useRemixViewModel.ts` (`remix()` → createProject → `RemixResult`);
    `remixRules.ts` (`canRemix` requires a video, `kitForRemix`, `videoMimeType`).
  - `viewmodel/editor/`: `timeline.ts` (EditorTimeline domain + mapper: back-to-front `layers`
    of clips and `<code>` layers, media/font → bridge URLs), `composition.ts` (evaluates a
    compiled template with `new Function`, `h` builds plain data nodes, binds props →
    `graphic({time,width,height})`), `useEditorViewModel.ts` (follows one project: status, live
    timeline, activity line; fetches compiled templates via `getCompiledTemplates`).
- **ViewControllers**: `screens/pairing/usePairingScreenController.ts`,
  `screens/remix/useRemixScreenController.ts` (replaces the modal with `Editor`, prompts to pair
  if needed), `screens/editor/useEditorScreenController.ts` (transport, sizing, dev HUD).
- **Components**
  - `components/compositor/`: `Compositor.tsx` (Skia Canvas, back-to-front layers keyed by
    media + occurrence), `ClipLayer.tsx` (Skia `useVideo`, cover + transform + orientation,
    drives the clock while playing), `CodeLayer.tsx` + `jsxSkiaRenderer.ts` (`<code>` layers, see
    Phase 3), `usePlaybackClock.ts` (shared clock, end detection, stats),
    `scene.ts` (structural `Scene` type + worklet render maths), `playbackStats.ts`.
    The compositor owns per-frame maths because components may not import the ViewModel.
  - `QrScanner.tsx`, `Scrubber.tsx`.
- **Routes:** `Pairing` (modal, from the header "Bridge" button), `Remix` (modal), `Editor`.

## Phases

**Phase 0: Save the plan, bridge skeleton, pairing.** ✅ **DONE (2026-10-19).**
Bridge repo, token, QR code, `/health`, protocol; Pairing screen (QR or paste) and a connected
socket. Verified on the iPhone 15 Pro simulator: health check, connected, auto-reconnect after a
bridge restart.

**Phase 1: Workspace, transcription, parse loop (bridge only).** ✅ **DONE (2026-10-19).**
Verified with a synthetic 12.7 s talking clip: whisper gave 33 timed words. The agent fixed
"Glow Bury" → `Glowberry` from `names` and built Captions (8 blocks), Footage and Music, passing
`tools/check`. The draft streamed mid-turn and was committed as rev 1 with ids. "Make the captions
pink" resumed the session (rev 2). Undo goes 2 → 1 → 0 and stops at `base`. A busy project
answers 409. A project reloads after a restart.

**Phase 2: Skia compositor (footage), Remix → Editor.** ✅ **DONE (2026-10-19).**
Remix → XHR upload → transcribe → director → Editor shows the footage live from the bridge
(Range-streamed): drafts first, then the committed rev. Play/pause and scrubbing work, and the
final frame holds at the end.
Baseline (dev HUD, iPhone 15 Pro simulator, debug build, 12.6 s clip):
- First version (free-running clock + drift-correcting seeks): 0 slow frames, but 367 ms max
  drift and 36 correction seeks.
- Media-master clock (shipped): **0 seeks, 17 ms start latency, 1 slow frame of 762 (worst
  37 ms)**. Burned-in timecode = playhead while playing (6.000 s) and after scrubbing (6.300 s).
Fixed along the way: Expo SDK 58's global `fetch` can't upload FormData here (no
`ReadableStream`, and it would buffer the video in JS), so uploads use XHR. Skia's iOS player gives
no frame for a no-op seek, so seeks are ≥ 1 ms and are re-sent once the player loads.
*Carried forward* (not blocking): a release-build baseline on a real iPhone, and confirming footage
audio by ear (the simulator run couldn't be heard).

**Phase 3: Captions `<code>` layer.** ✅ **DONE (2026-10-19).**
The kit's `captions.jsx` runs unmodified on Hermes (the `\p{L}` regex and `new Function` both work).
- Bridge: protocol **v3** (`TimelineModel.fonts`), Inter Display Bold in the kit,
  `GET /projects/:id/compiled/<template>` (the workspace copy, recompiled when it changes).
- `jsxSkiaRenderer.ts` lays out the CSS subset the template uses (absolute boxes, flex rows with
  justify/baseline, margins, translate, inherited fontSize/color/letterSpacing/lineHeight,
  opacity) into positioned text runs, drawn with `drawGlyphs`. Checked against headless
  Chrome rendering the same template with the same font: vertical positions identical, x
  within ≤ 3 px of 1080 (Chrome kerns; we don't).
- **Baking:** a template is plain JS and can't run on the UI thread, so on each props change
  `CodeLayer` samples it at 30 Hz on the JS thread, bisects every change to 1 ms, and records one
  `SkPicture` per distinct frame. The UI thread picks the picture for the playhead (binary
  search), so word changes land on the right frame with no JS work during playback.
Measured (iPhone 15 Pro simulator, debug, 12.6 s clip, 8 blocks):
- Bake: 32 distinct frames from 564 samples in **198 ms** (JS thread, once per rev/draft).
- Playback with captions: **763 frames, 0 slow (worst 17 ms), start 17 ms, 0 seeks**, no worse
  than the Phase 2 baseline, so no optimisation was needed.
- A block edit in `timeline.tsx` shows on the phone in **≤ 0.6 s**, with the video still mounted.
*Known limits:* one font per kit (the renderer draws everything with the first one); no
kerning; no text wrapping; a template edited by the agent is refetched only when the set of
templates changes (RTK Query cache); a template that throws at some time draws nothing there
(dev warning only, not yet a diagnostic sent to the bridge). Bake cost scales with
duration × changes, so re-measure on long videos.

**Phase 4: Full agent loop in the app.** ChatSheet streaming agent text/tool/status, follow-up
messages (`POST /messages`), Undo, diagnostics banner, transcription progress. Also persisted
pairing and recent projects, so a relaunch doesn't need a new Remix (needs a storage library:
ask first).
✅ On the phone: Remix → captions appear → "make captions pink" → preview updates → Undo goes back.

**Phase 5: Jump cuts, punch-ins, music bed.** `tools/silence` (silencedetect + whisper word gaps →
keep ranges) and recipe guidance. Multiple clips of one source: the clip being played drives the
clock, and the next clip is pre-seeked before its boundary (measure the stall at each cut;
fallback: two alternating players). Transform punch-ins. `AudioBed` (volume, fades) following the
clock.
✅ "Remove dead air and punch in on key words, add the soft bed": cuts play without visible
hitching, and the music fades out at the end.

**Phase 6: Colour-grade shader.** `ShaderLayer` with an SkSL RuntimeEffect, uniforms for
`amount`/params/fades, and SkSL rules in the workspace `CLAUDE.md`. Compile errors go back to the
bridge as diagnostics so the agent can fix them.
✅ "Warm cinematic grade" applies live, and a deliberately broken shader shows up as a diagnostic
that the agent then fixes.

**Later:** Android parity, on-device MP4 export (offscreen Skia → AVAssetWriter/MediaCodec,
sharing the compositor), subject-matte effects, other recipes (the Talking-head recipes add
`structure.json` + panel templates).

## Risks to watch
- Seek stall at jump cuts (Phase 5). Fallback: two pre-seeked players that alternate.
- Cardboard's `cb look` (frame renders for the agent) has no equivalent yet, since the compositor
  lives on the phone. Checks are structural (`tools/check`); later the phone could upload frames.
- Cardboard kit shaders are GLSL, but Skia needs SkSL. The workspace `CLAUDE.md` must say so.
- Dev loop: pairing is in memory, so every relaunch costs a new Remix and agent turn (fixed by
  Phase 4 persistence).
- Licensing: the Cardboard kit is vendored, so keep the bridge repo private.

## Verification (each phase)
RN app: `npx tsc --noEmit` + `npm run lint` (boundaries), run on the iOS simulator/device.
Bridge: `npx tsc --noEmit`, `npm run test:ws [-- <projectId>]`, curl uploads with a sample clip.
Performance work follows Measure → Optimize → Re-measure → Validate, with no memoization unless
profiling shows the need.

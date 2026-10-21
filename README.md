# Cardboard

Make viral reels in minutes. Pick a recipe, remix it with your own clips, edit it by chatting
with an AI director, and export it to Photos.

> **Note:** Supported and tested on **iOS only**.

## Features

- **Recipes**: rails of trending reel formats with auto-playing previews.
- **Remix**: start from a recipe with your own videos and a prompt.
- **AI editor**: chat with the director ("make the captions yellow"), with a live Skia preview, scrubbing and undo.
- **Export**: rendered to MP4 and saved to Photos.
- **Your projects**: your exports, kept on the device to watch again.

**Flow:** Showcase → Remix → Editor (chat + live preview) → Export → Your projects

## Requirements

- macOS with Xcode, plus Ruby/Bundler for CocoaPods
- Node ≥ 22.11
- The **bridge** running on a laptop on the same Wi-Fi as the phone (see below)

## Install & run (iOS)

```sh
npm install
bundle install                              # first time only: installs CocoaPods
cd ios && bundle exec pod install && cd ..  # after cloning or native dependency changes
npm start                                   # Metro
npm run ios                                 # in a second terminal: build and launch the simulator
```

To run on an iPhone, open `ios/CardboardApp.xcworkspace` in Xcode, set your signing team and run.
QR scanning needs a real device. In the simulator, paste the pairing code instead.

## Connecting to the laptop (bridge)

The editor's AI runs on your laptop, not the phone. The bridge is a separate repo:
**[cardboard-bridge](https://github.com/saurabhkanswal/cardboard-bridge)**.

```sh
# in the bridge repo
brew install ffmpeg whisper-cpp   # plus the Whisper model at models/ggml-small.en.bin
npm install
npm run dev                       # prints a pairing QR code + pasteable code
```

The bridge runs Claude through the Agent SDK with the laptop's Claude login. In the app, tap the
**connect** button (top-right of the home screen), then scan the QR code or paste the code.

```
Phone (this app)  ── HTTP + WebSocket, same Wi-Fi ──▶  Laptop bridge (Node)  ──▶  Claude Agent SDK
```

- **Pairing:** the QR code holds the bridge's LAN URL and a token. Every request sends the token.
- **Remix:** uploads your video to `POST /projects`. The bridge transcribes it and runs the first edit.
- **Editor:**
  - Timeline and agent updates stream over the `/events` WebSocket.
  - Chat messages go to `POST /projects/:id/messages`, with `/undo` and `/cancel` alongside.
  - Media streams from the bridge.
- **Export:** the phone renders the captions to PNGs and uploads them. The bridge renders the MP4,
  and the phone downloads it to Photos and Your projects.
- **Protocol:** `src/protocol.ts` in the bridge is the source of truth. It's copied to `src/model/bridge/protocol.ts`.

If pairing fails, check that both devices are on the same Wi-Fi. If the bridge picks the wrong
network interface, set `BRIDGE_HOST` (and `PORT`, default 8787) on the bridge.

## Architecture (MVVM)

```
View  →  ViewController  →  ViewModel  →  Model
```

| Layer | Folder | Role |
| --- | --- | --- |
| Model | `src/model/` | Data + I/O only: RTK Query endpoints, bridge client, storage, files |
| ViewModel | `src/viewmodel/<feature>/` | Business logic, mapping, the only caller of RTK Query hooks |
| ViewController | `src/screens/<s>/use<S>Controller.ts` | Screen-specific UI state and handlers |
| View | `src/screens/<s>/<S>.tsx`, `src/components/` | Pure presentation |

Dependencies point one way only, and ESLint (`eslint-plugin-boundaries`) enforces this:
`npm run lint` fails on a forbidden import. `src/app/` is the composition root (store provider,
navigation) and `src/theme/` holds design tokens. `src/components/compositor/` is the live Skia
preview. Details are in [ARCHITECTURE.md](ARCHITECTURE.md) and [docs/AGENTIC_EDITOR_PLAN.md](docs/AGENTIC_EDITOR_PLAN.md).

## Tech stack

React Native 0.88 (New Architecture, Hermes) · TypeScript · Redux Toolkit + RTK Query ·
React Navigation · Skia + Reanimated · expo-video · expo-file-system / media-library / sqlite

## Checks

```sh
npx tsc --noEmit
npm run lint
```

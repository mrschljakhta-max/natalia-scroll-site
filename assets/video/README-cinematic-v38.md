# Cinematic Film Lab v38 — Production Asset

**Status:** Video source not yet rendered. This folder contains the production contract, NOT a generated AAA clip.

## The shot (single continuous 10-second master)

A premium minimalist accountant-brand scene, 16:9, ideally 1920×1080 or better, 24–30 fps, steady fully locked camera.

- Background: warm ivory architectural studio with the sea from the preceding four-scene origami story physically pouring over the TOP of the frame into a sculptural **front-facing brass waterwheel CENTER**; waterwheel foot is flush with the bottom of the viewport.
- Left: clear negative space for live HTML headline "Для кожної справи — свій підхід." No words baked into the video.
- Right: dark teal crystal-clear water rises as **one continuous physical fluid body from bottom to top** with naturally refracted, volumetric depth, gentle glints, convincing edges and distinct surface normals. No straight cutoff mask, horizontal reservoirs, laboratory flasks, repeated diagonal neon streaks, or floating bowls.
- Sculpture: brushed brass, deep curved catch paddles, realistic thickness, subtle casting imperfections, physically convincing specular PBR, contact shadows, high quality caustics. Not a round graphic/icon. The metal rotates **CLOCKWISE**, increasing steadily as the clip advances.
- Waterfall: turbulent clear semi-transparent flow with variable thickness, coherent gravity, believable collision, sprays, droplets and foam at the uppermost paddles.
- Lock camera; no zooms, cuts, text overlays or logo. Stable framing so HTML overlay remains aligned.

## Time structure

| Film time | Physical story | HTML interaction |
|---|---|---|
| 0–1.9s | Sea spills down and starts the wheel | Headline visible |
| 1.9–4.0s | Water impacts the wheel, speed ramps clockwise | Intro |
| 4.0–6.2s | Right body begins to visibly fill bottom-up | Category 1 appears 62% |
| 6.2–7.5s | Water rises with realistic fluid surface | Category 2 appears 75% |
| 7.5–8.7s | Final water level nears its ceiling | Category 3 appears 87% |
| 8.7–10s | Settle into serene stable scene | All categories clickable |

For non-linear scroll scrubbing, the picture at any timestamp should be an independently convincing scene. Avoid rapid cuts and inconsistent objects. The generated film is **not looping**; users may scrub back and forth. Smooth motion needs short GOP / densely spaced keyframes.

## Video deliverable

Name: `assets/video/watermill-cinematic-v38.mp4`

Preferred: H.264, 1920×1080, yuv420p, 30fps, 10 seconds, video-only, browser-decodable with seek every 200–400ms. Since this is a website, optimize for decoding and loading; avoid generating an enormous all-I 4K file.

Recommended transcode from a high-quality source:

```bash
ffmpeg -i cinematic-master.mov -an -vf "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 18 -g 12 -keyint_min 12 -sc_threshold 0 \
  -movflags +faststart assets/video/watermill-cinematic-v38.mp4
```

A suitable 1080p WebM can be an additional source later. No fake-video fallback: without this render, the experimental page openly says it is still awaiting real film.

## Publishing checklist

1. Inspect the film alone first. Do **not** publish it if the wheel, falling water, or water level looks distorted, changes shape incoherently, or reads as plastic CGI.
2. Commit the actual binary `assets/video/watermill-cinematic-v38.mp4` to the repo. A copy hosted on the same origin is required for scrub performance.
3. Change `assets/data/watermill-cinematic-v38.json`:

```json
"videoSrc": "./assets/video/watermill-cinematic-v38.mp4"
```

4. Open `cinematic-video-v38.html`, scroll forward and backward, test touchscreen and reduced-motion, click all three categories.
5. Consider replacing v35 only after the entire sequence passes visual review at 100% desktop size.

**Render generation blocker (2026-10-26):** the connected Runway workspace is on Free and exposes no usable video models. The video itself cannot be generated with that connection until paid video access is enabled or another independent video render is provided. No paid upgrade was performed.

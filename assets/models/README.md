# Sculptural waterwheel asset — scene 05

- `studio-waterwheel-v35.gltf`: bespoke glTF 2.0 scene authored specifically for «Наталія & Анна», with 9 reused sculptural meshes and 46 scene nodes. Curved water-catching paddles, machined front/rear rim profiles, forged hub, radial spokes and metallic fastening details. Contains embedded binary mesh data and glTF PBR material definitions; no external binary buffers.
- Loaded with Three.js `GLTFLoader` only when scene 05 approaches the viewport, replacing the old primitive-built rotor once complete. If fetching/parsing fails, the previous 3D rotor remains usable.
- Studio lighting: Poly Haven *Studio Small 09*, by Sergej Majboroda, CC0. The browser loads its official 1K Radiance HDR file lazily:
  `https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr`
  Source: `https://polyhaven.com/a/studio_small_09`.
- If HDRI loading fails or the client is offline, the previously authored procedural environment remains active.
- Water uses a custom GPU-shaded volume and an additional moving physical sheet (ior 1.333); the original sea-to-stream-to-wheel scroll narrative and existing text remain unchanged.

Avoid replacing this model with a stock rustic watermill or redirecting visitors to any external asset viewer.

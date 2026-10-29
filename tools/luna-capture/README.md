# Luna capture scripts

How the videos and screenshots in `luna/` were made. They record the **real Luna (TickUp) interface** from the ValueGram repository, fed with demo data for an industrial-parts factory (profit) and an industrial-equipment seller (CRM). Nothing connects to a real workspace.

1. In `ValueGram/tickup-main/tickup-main`: `npm install`, then copy `lunaCrmShowcaseHarness.tsx` to `tests/local/fixtures/` and start the dev server with `npx vite --port 3010`.
2. From this folder (Playwright installed): `node profit.mjs`, `node crmvideo.mjs`, `node stills.mjs`. For the knowledge graph: `python3 factory_brain.py <ValueGram>/tickup-main/tickup-main/features/brain/tests/brainOrgSnapshot.fixture.json factory-brain.json`, then `node brain.mjs`.
3. Output goes to `media/` (or `OUT=...`). Trim and encode the `.webm` recordings to MP4 (H.264, `-movflags +faststart`) using the start offset and length written to `*-timing.json`, and save the screenshots as WebP into `luna/`.

To change what Luna says or the numbers, edit the visuals and captions at the top of `profit.mjs` or the deal list in `lunaCrmShowcaseHarness.tsx`. If the profit captions change, update the spoken lines in `../luna_voice.py` too.

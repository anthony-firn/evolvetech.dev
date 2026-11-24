# Proof v2 reference build validation

The reference video is `public/play/proof/media/2026-11-24.mp4` (about 77 seconds). It uses the
shared style v1, Kokoro `af_heart`, the shared proper-name pronunciations, constant 30 fps,
1920×1080 H.264/yuv420p, AAC and matching WebVTT. Renderer, exporter, font, model and engine
hashes are recorded in its sidecar manifest. Missing or stale media blocks episode publication.

Checked locally on 2026-11-24:

- Daily and weekly browser flows pass under the production Content Security Policy. This includes
  ordered stages, references hidden until submission, coach availability after original work,
  Python execution, infinite-loop termination/recovery, saved hints and progress, and completion.
- The completed daily page and each interactive briefing scene fit a 360px viewport.
- Eight state tests cover one-time skill awards, invalid awards, daily/weekly completion, recall
  scheduling, streaks, note constraints and storage failures.
- Ten exercise cases pass for the reference and the starter fails behavioral cases. Additional
  checks cover 150 generated workloads and sustained arrivals without moving the head reservation.
- The mission gate checks both content entries, the actual MP4 format, caption text/timing,
  provenance hashes and source availability. The portfolio verification command passes.
- Visual contact-sheet inspection covers every briefing scene, and the poster/mobile screenshots
  were inspected. No avatar, stock footage, music or agent-specific branding is used.
- Full-video local Whisper transcription matches the narration at 98.7% by normalized word-sequence
  similarity. This checked spoken coverage and caught/fixed a name-spelling issue; it is not a
  subjective human listening review. Browser video playback/metadata and captions load without CSP errors.

The optional coach's GPU inference was not rerun here. Its SDK integration was inspected, and its
submission gating is covered by the browser tests. The video exporter uses Evolve Voice's actual local
WebGPU engine, rather than browser speech, and requires no Deno installation.

The existing Claude daily routine was paused by the previous session. Its replacement prompt is
`docs/proof-daily-prompt.md`; this Codex session has no tool for updating or enabling that Claude routine.
No duplicate schedule or Fairground account was created.

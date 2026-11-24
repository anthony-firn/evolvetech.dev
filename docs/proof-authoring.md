# Proof authoring contract (Codex and Claude)

Read this file before researching, writing or rendering a Proof mission. Both agents use the same files,
commands and acceptance checks. The daily creator changes the subject, examples and diagrams; the versioned
renderer owns presentation. Keep the existing hosting pipeline; do not create a second site.

## Learning goals

A daily mission follows briefing → problem choice and cost → primary-source reading → original design →
review of a flawed agent proposal → implementation by hand → a two-line ship note. Budget 60 minutes.
A weekly project has its own `kind: project` entry and takes about two hours; it must not block daily completion.
XP records practice. It does not estimate employability, salary, moral worth or engineering proficiency.

Choose useful problems at the intersection of the learner's backend/platform interests, positive impact,
and genuine new technical developments. Rotate security, computing, math and interfaces rather than chasing
announcements. Tie unfamiliar ideas to a small implementation or a falsifiable experiment. Ask who benefits,
who could be harmed, what it costs and whether doing less would solve the problem.

The three founding sources were read in full from saved transcripts on 2026-11-24:

- https://www.youtube.com/watch?v=i1IbHVstmH4 (Prime: manifesto reaction)
- https://www.youtube.com/watch?v=z8Up6gLL3k8 (Prime: Hoff reaction)
- https://www.youtube.com/watch?v=gIvVjepvdMg (Hoff: original)

They motivate reading, judgment, review and visibility. They are viewpoints, not evidence that a daily routine
will maximize earnings or guarantee a job. Keep the pleasure of building alongside supervision practice.

## Research and mission schema

1. Read the actual primary documents or complete transcripts before designing the mission. A title, abstract,
   search snippet or agent summary is insufficient. If access fails, choose a readable source or leave a draft;
   do not imply you read missing material. Save research notes under `docs/proof-research/` in a normal PR.
2. Use at least two relevant primary sources. Check current technical claims against current documentation.
   Give precise reading sections, with questions the learner must answer from the source. Reference answers
   and self-assessment rubrics appear only after submission. Distinguish the exercise's assumptions from the
   source's real implementation. Keep quotations short and attributed.
3. Copy the shape of `public/play/proof/episodes/2026-11-24.json`, not its wording. IDs are `YYYY-MM-DD` for
   daily missions and `YYYY-MM-DD-project` for weekly projects. Add matching metadata to `episodes/index.json`.
   Daily entries need all seven stages, recall questions and `<id>.solution.py`. Weekly entries need a project
   brief, deliverable, suggestions, sources and disclosure.
4. The review artifact must have real flaws and at least one defensible choice. Explain false alarms as well as
   misses. The build must be stdlib Python, runnable in Pyodide, with at least four behavioral tests. Include
   boundaries, failure cases and input preservation where meaningful. The starter must run but fail a test;
   the reference must pass all tests. Export actual state when visibility is part of the problem.
5. Write plainly. No stock praise or repeated template paragraphs. Short notes should give a reviewer a
   concrete behavior and a reproduction. Never use a small model to disguise machine authorship. The optional
   local coach critiques a submitted design/note and may be wrong; it does not supply the learner's answer.

The skills panel is a dated, curated sample, not a market ranking. Regenerate it only from local job data with
`tools/build_proof_demand.py --jobs … --ranks … --as-of YYYY-MM-DD`. Only aggregate counts are public. Do not
commit applicant records, company review notes, tokens, browser sessions or raw job-search exports.

## Shared daily video

The production contract is `public/play/proof/video-style.json` (version 1). Both agents must use:

- Evolve Voice's Kokoro-82M engine, voice `af_heart`, speed 1, seed 1. Do not silently substitute browser speech,
  another voice provider or a different model. Keep the shared pronunciation dictionary for proper names. Browser speech is an explicitly labeled interactive fallback.
- 1920×1080, 30 fps, H.264/yuv420p MP4 and AAC mono audio; normalize toward -16 LUFS and -1.5 dB true peak.
- Space Grotesk headings, Inter prose, JetBrains Mono code; charcoal background, orange accents and cyan links.
- The existing six scene types. `scene.js` is shared by the player and the exporter. `video.html`, `video.css`
  and `video.js` define the export frame. Content stays within the safe areas. No avatars, stock footage,
  background music, dramatic zooms, or per-agent branding.
- Three to eight scenes, at most 420 narration words, 60–210 seconds. Begin with a concrete problem and end
  with a question or check to try. The briefing creates a reason to read; it must not answer the research task.
- Sentence captions burned into the frame and a matching WebVTT file, timed from the generated audio.

Run from the selected checkout (no Deno needed):

```sh
python3 tools/render_proof_video.py YYYY-MM-DD --voice-site /path/to/evolve-voice/dist
python3 tools/check_proof.py --require-video YYYY-MM-DD
```

Requirements: Python Playwright, Google Chrome with WebGPU, FFmpeg/FFprobe, a built Evolve Voice checkout,
and Kokoro files cached in `~/.cache/evolve-voice/kokoro` (or `--model-cache PATH`). The renderer serves these
locally. It fails clearly if assets are missing; it does not install tools, download models or switch voices.
If the machine cannot run this pipeline, hand the same command and files to the other agent or keep the
mission in draft. Do not call a scene player a rendered video.

Outputs go in `public/play/proof/media/<id>.{mp4,vtt,poster.png,manifest.json}` and the renderer sets
`briefing.video` in the mission. Audio cache stays ignored in `.cache/proof-video/`. The manifest records the
script, style, renderer, engine and model hashes. Editing the narration or renderer requires rerendering.
Listen to the complete video, inspect captions and pronunciation, and inspect at least the title, diagram
and any code frames before publishing. Automated format checks cannot replace this review. Change the look or
voice only through an intentional style-version change and a reviewed reference video, never ad hoc per day.

## Verification and publication

```sh
python3 tools/check_proof.py
node --test tools/test_proof_state.mjs
python3 tools/test_proof.py YYYY-MM-DD
python3 tools/test_proof.py YYYY-MM-DD-project  # when a weekly project changes
python3 tools/check_proof.py --online --require-video YYYY-MM-DD
```

Do not report a blocked browser run, unavailable source or missing MP4 as passed. The source checker treats
unreadable sources as failures, not proof that their contents were reviewed. The existing episode publishing
workflow accepts content and the rendered media, then runs the gates before merging and deploying.
Implementation changes go through a normal PR. Keep the daily creator disabled until v2 is merged, a complete
video has passed review, and its prompt has been updated from `docs/proof-daily-prompt.md`.

The Claude cloud routine is `trig_01PtVHv4e1j2BK76GqQWgpTt`, originally 13:00 UTC daily. Only a tool that can
read and update that existing routine should reactivate it. Do not create a duplicate schedule. Check its
current state and replace its prompt using the shared authoring contract. Posting to Fairground is a separate
step after the video is reviewed; it must use the approved dedicated Proof account and the real MP4.

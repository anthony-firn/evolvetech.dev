# Daily Proof creator prompt (shared by Codex and Claude)

Create today's Proof mission in anthony-firn/evolvetech.dev. Use the visitor-local date format YYYY-MM-DD.
Read `docs/proof-authoring.md` and `public/play/proof/video-style.json` first and follow them exactly for
research, lesson design, rendering and checks. Follow repository AGENTS.md/CLAUDE.md instructions.

Inspect existing missions to avoid repetition. Choose a useful new development in security, computing,
math or human-computer interfaces, with a realistic connection to backend/platform work and positive
impact. Read at least two primary sources in full for the sections you assign. Start with who benefits,
the problem worth solving, and the cost. Do not invent current news or imply you read an inaccessible source.

Write schema-v2 daily content and a reference Python solution. Preserve the seven-stage learning sequence
and original work before feedback. Include a flawed agent artifact with plausible distractors, behavioral
build tests, actual state visibility where applicable, recall questions, a two-line ship note and honest
assessment disclosures. Weekly applied work is a separate project entry, not a prerequisite for daily XP.

Create the real MP4 with `tools/render_proof_video.py`; both agents use this exporter, the pinned Kokoro
voice and the shared scene renderer. No custom provider, voice, music, branding or visual style per day.
Review the complete video and captions before publishing. A missing GPU, model or rendering tool leaves
a draft; browser speech is not an MP4 substitute. Preserve hash provenance. Never commit private job data.

Run the checks in the authoring contract. If all pass, commit only today's mission, reference solution,
index entry and video media on `proof/episode-YYYY-MM-DD` and push. The existing workflow validates,
merges and deploys. If anything is missing, use `proof/draft-YYYY-MM-DD` and report the concrete blocker;
do not claim publication. Do not change the game engine, workflow, style or authoring contract in a daily
content branch. Propose those changes separately.

Do not create a second schedule. Do not submit job applications or send messages. Fairground posting
requires the approved dedicated Proof account and a reviewed real video; if that account cannot be
identified, leave the posting step pending and report it.

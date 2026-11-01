# California probate companion helpers

Site-owned, buildless helpers for DE-226, DE-120 and DE-135, plus the `/play/probate/` filing guide.
The existing petition sources remain in `~/Dev/de221` and `~/Dev/de111`; their built outputs are committed to this site.
No personal family data belongs in fixtures, source code or public artifacts.

Run `python3 demos/probate/build.py` after editing `web/`. This produces `/play/probate/` and the three form entry pages.
Run `node --test demos/probate/tests/*.test.mjs`. For browser integration, serve `public/` on port 8230 and run
`python3 demos/probate/tests/ui_check.py`; it exercises production CSP, local imports, saved state, uploads, generated
PDFs and phone width. Generated tests use fictional data and write outside the published tree.

Official forms downloaded October 31, 2026 from
`https://courts.ca.gov/sites/default/files/courts/default/2024-11/<form>.pdf`:

| Form | Revision | Official SHA-256 |
| --- | --- | --- |
| DE-120 | January 1, 2020 | 29ee23d8904a278b1f1aa85a94e917f0e419830482fad8cf8942eb091f2c5bb8 |
| DE-135 | January 1, 1998 | ef12767a723bd89af67c4f3668947950ea07fb2c2481c5a74224e7b69710b57a |
| DE-226 | January 1, 2015 | 2a3523baac599bdf12457ef7dc4aca41ebfacaf7c70af6950fc0307fe52bb318 |

`prepare.py` removes encryption, XFA, document scripts and interactive buttons from the public templates, preserving
ordinary fillable fields and page content. Checked source PDFs live in `forms/`; metadata files record surviving field
names, labels and positions. If forms change, regenerate and review every mapping and its visual position.

DE-226 deliberately takes editable final property lists, rather than deriving them from older browser answers.
Petition 7a -> order 5a, petition 7b -> order 7a. Judicial date and signature are never filled. Item 6 business-creditor
protections require individual completion beyond this helper. DE-120 is scoped to decedent estate hearings, especially
DE-221; it does not implement the separate trust caption workflow or the DE-111 opening notice (DE-121). Only explicitly
confirmed actual service fills its proof, and future/contradictory dates are rejected. Extra recipients get a continuation
attachment. DE-135 allows PDF/JPEG/PNG instrument copies appended locally, preserving PDF pages. Attorney certification
is never filled. The instrument description appears on an Attachment 4 cover page; all uploaded pages follow unchanged. Witnesses must personally read and truthfully identify the complete attached instrument.

Common fields can be copied with an explicit click from saved DE-221 answers or imported JSON. Property conclusions,
mailing declarations and handwriting assertions are excluded. No upload leaves the browser; files remain in memory,
not localStorage or saved JSON. Text fields that cannot fit fail explicitly instead of silently clipping. Unsupported
characters also require correction before generation. None of these checks is legal approval.

Sources: Judicial Council forms; Alameda Superior Court simplified probate instructions; California Probate Code
§§ 13650–13656, 1220, 8200, 8222; San Luis Obispo local rules 11.109, 11.501 and 11.1302. County fee and submission
requirements must be checked individually. No court or attorney has reviewed these tools.

## Shared interface

All five helpers use the shared shell defined in `layout.py` and the canonical stylesheet in `web/style.css`.
The three companion forms have the same welcome, step sidebar, mobile step menu, review and download flow as the
petitions. The guide's two route buttons explain how the forms fit together without deciding eligibility.
A homepage project card and navigation link lead into the guide.

When changing shared chrome or styling, update the petition source copies before rebuilding them:

```sh
python3 demos/probate/sync_petitions.py --sources /home/anthony/Dev
python3 tools/build_demos.py de111 --local-source /home/anthony/Dev/de111
python3 tools/build_demos.py de221 --local-source /home/anthony/Dev/de221
python3 demos/probate/build.py
```

Commit the petition source changes as well as the site outputs. Local standalone petition previews keep their own
synchronized stylesheet and theme script. The theme setting is shared with the main website. Existing answer keys are
preserved; companion step position is separate. Navigating away from a petition flushes its pending autosave.

With `public/` served at port 8250, run `python3 demos/probate/tests/navigation_check.py` to exercise homepage entry,
route filtering, all five shared menus, current-form indicators, themes, phone step menus and immediate cross-form
answer persistence. The PDF walkthrough accepts that same base URL via
`python3 demos/probate/tests/ui_check.py http://localhost:8250/play/`.

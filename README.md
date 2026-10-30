# ichotaku.com

Local, additive consolidation of the ichoTaKu / CHOTAKU creative sites.

- Open `Start ichotaku.command` to launch the local atlas.
- The atlas contains 62 cards. Each card keeps its visual preview and now opens its working consolidated page.
- Every source family is retained under its own namespace in `sites/`.
- Similar-looking folders were not treated as duplicates.
- Symbolic links were preserved rather than expanded or replaced.
- `consolidation-manifest.json` records source-to-destination provenance.

The launcher serves the folder on <http://127.0.0.1:4174/> so pages that load sibling scripts, styles, data, or media work consistently.

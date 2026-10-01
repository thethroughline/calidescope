# The Outcomes Opportunity — deck generator

`build.py` + `data.py` render the 14-stage deck served at `/dev/landscape.html`. Run through
`next/build.py` (which calls this and `next/record/build.py`), or directly:

    python3 next/deck/build.py dev/landscape.html

`data.py` holds every figure and sentence; `build.py` holds the markup and CSS. Figures were
recomputed 30 September 2026 from the record's CSVs (`dev/record/data/`) and the two research
notes (`next/record/notes/`).

What differs from the deck as supplied on 1 October 2026, and nothing else:

- Google Fonts replaced by the site's local fonts (`/assets/fonts/fonts.css`, which now carries
  IBM Plex Mono 600 so the bold figures are the real weight), plus the site favicon.
- Slide 14's four record rows are links into `/dev/record/`; the printed claude.ai hub URL is gone.
- "138" where the text counts companies read (cover footnote, slide 6 headline, "137 of 138",
  the method line). Netflix Ads and Reddit for Business blocked capture, so 138 of the 140 in the
  sample were read. "140" stays where the text names the sample.

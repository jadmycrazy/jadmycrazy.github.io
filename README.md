# jadmycrazy.github.io

Source for my personal site: three project write-ups with interactive figures, built from plain HTML, CSS and a small SVG chart library.

- `src/` page sources (`{{HEAD}}`, `{{BAR}}`, `{{FOOT}}` are filled from the `_*.html` partials)
- `assets/` stylesheet, chart helpers, kidney-pool renderer
- `data/` figure data exported by the project repos

Build with `python build.py`, then copy `netlify/*.html` to the repo root. GitHub Pages serves the root at https://jadmycrazy.github.io.

Projects: [kidney-exchange-optimizer](https://github.com/jadmycrazy/kidney-exchange-optimizer) · [antibiotic-immune-dosing](https://github.com/jadmycrazy/antibiotic-immune-dosing) · [radiotherapy-fractionation](https://github.com/jadmycrazy/radiotherapy-fractionation)

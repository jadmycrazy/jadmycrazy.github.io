"""Build the site from src/.

Each page in src/ has {{HEAD}}, {{BAR}} and {{FOOT}} filled in from the _*.html
partials. Two copies are written:

  dist/     a variant of the pages for embedded previews
  netlify/  the public pages, which are also copied to the repo root,
            where GitHub Pages serves them

Usage: python build.py
"""
import os
import shutil

root = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(root, "src")


def part(name):
    with open(os.path.join(src, name)) as handle:
        return handle.read()


HEAD, BAR, FOOT = part("_head.html"), part("_bar.html"), part("_foot.html")
VIEWPORT = (
    '<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
)
PREVIEW_ONLY = '<meta name="claude:viewport-fit-sides" content="cover">\n'

for target, preview in (("dist", True), ("netlify", False)):
    out = os.path.join(root, target)
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    shutil.copytree(os.path.join(root, "assets"), os.path.join(out, "assets"))
    shutil.copytree(os.path.join(root, "data"), os.path.join(out, "data"))
    for name in sorted(os.listdir(src)):
        if name.startswith("_") or not name.endswith(".html"):
            continue
        page = part(name).replace("{{HEAD}}", HEAD).replace("{{BAR}}", BAR).replace("{{FOOT}}", FOOT)
        if name == "index.html" and preview:
            page = page.replace("</head><body>", "").replace("</body></html>", "")
            page = page.replace(VIEWPORT, "")
        else:
            page = '<!doctype html>\n<html lang="en"><head>\n' + page
        if not preview:
            page = page.replace(PREVIEW_ONLY, "")
        if name == "404.html":
            # GitHub Pages serves this page at any missing address, so its links must be absolute.
            for prefix in ('href="assets/', 'src="assets/', 'href="index.html'):
                page = page.replace(prefix, prefix.replace('="', '="/'))
        with open(os.path.join(out, name), "w") as handle:
            handle.write(page)
        if not preview:
            shutil.copyfile(os.path.join(out, name), os.path.join(root, name))
print("built")

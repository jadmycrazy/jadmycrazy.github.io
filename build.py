import os, re, shutil, sys
root = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(root, "src")
part = lambda n: open(os.path.join(src, n)).read()
HEAD, BAR, FOOT = part("_head.html"), part("_bar.html"), part("_foot.html")
for target, artifact in (("dist", True), ("netlify", False)):
    out = os.path.join(root, target)
    shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    shutil.copytree(os.path.join(root, "assets"), os.path.join(out, "assets"))
    shutil.copytree(os.path.join(root, "data"), os.path.join(out, "data"))
    for f in os.listdir(src):
        if f.startswith("_") or not f.endswith(".html"): continue
        s = part(f).replace("{{HEAD}}", HEAD).replace("{{BAR}}", BAR).replace("{{FOOT}}", FOOT)
        if f == "index.html" and artifact:
            s = s.replace("</head><body>", "").replace("</body></html>", "")
            s = s.replace('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n', "")
        else:
            s = '<!doctype html>\n<html lang="en"><head>\n' + s
        open(os.path.join(out, f), "w").write(s)
print("built")

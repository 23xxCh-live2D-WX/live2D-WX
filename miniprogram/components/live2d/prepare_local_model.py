"""Stage the user's Sweet Rabbit model for local Mini Program testing only."""
from pathlib import Path
import base64
import json
import sys

from PIL import Image


root = Path(sys.argv[1] if len(sys.argv) > 1 else r"E:\software\airi\q652")
manifest = next(root.rglob("甜兔.model3.json"), None)
if manifest is None:
    raise SystemExit("甜兔.model3.json not found")
source = manifest.parent
settings = json.loads(manifest.read_text(encoding="utf-8"))
refs = settings["FileReferences"]
output = Path(__file__).resolve().parent / "local_model"
output.mkdir(exist_ok=True)
(output / "model.moc3.json").write_text(
    json.dumps({"base64": base64.b64encode((source / refs["Moc"]).read_bytes()).decode("ascii")}),
    encoding="utf-8",
)
(output / "model.moc3").unlink(missing_ok=True)
textures = []
for number, name in enumerate(refs["Textures"]):
    target = f"texture_{number}.png"
    with Image.open(source / name) as image:
        image.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
        image.save(output / target, optimize=True)
    textures.append(target)
refs.clear()
refs.update({"Moc": "model.moc3.json", "Textures": textures})
(output / "model3.json").write_text(json.dumps(settings, ensure_ascii=False), encoding="utf-8")
print("Local model staged:", output)
print("Bytes:", sum(path.stat().st_size for path in output.iterdir()))

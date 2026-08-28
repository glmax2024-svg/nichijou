#!/usr/bin/env python3
"""Download huaban character art and export avatar + gallery PNGs."""

from __future__ import annotations

import io
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "characters"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
AUTH = "auth_key=1783512000-3f104d2cb1384cbcac46f58df4c47a93"


def hb_url(key: str, suffix: str = "db03a812eb332136cfc9390a9991bdea") -> str:
    return f"https://gd-hbimg-edge.huaban.com/{key}_fw1200webp?{AUTH}-0-{suffix}"


ASSETS = {
    "aoi": {
        "sources": {
            "live-1.gif": (
                "https://gd-hbimg-edge.huaban.com/15f1f183434c5d0d621b18976a3363a56563f44e9c1fd6-4521JR_fw1200"
                f"?{AUTH}-0-71c201aa81d5805625bb1d994ba71eb1"
            ),
            "gallery-1.png": hb_url("e3abda3c084655c8a500b95b3d154f0f237dbdb2c8246-9TyB1k"),
            "gallery-2.png": hb_url(
                "93dded6a2d5a8f9b5368c3988dd0aa15c450e565e33d4-xXxLf8",
                "4f618b67308898de028dc03acce77e75",
            ),
            "gallery-3.png": hb_url(
                "41feea6c6cdfc8d1bceb2223b126f5250da1784eaecc5-FNSMgt",
                "4fdc49195c5823928e901c236efe1906",
            ),
        },
        "avatar_from": "gallery-1.png",
    },
    "mio": {
        "sources": {
            "gallery-1.png": hb_url(
                "f47677d5d0d5cd5ddb5d28fb5b92b7420b61464fae217b-OlIaL0",
                "ee9e0819041ff2d48ca0d2e213e4a7bb",
            ),
            "gallery-2.png": hb_url(
                "c9c16f4e5b972b3ee18978e374b4a16586b0e6ef2174b-gy6OeS",
                "99b1967cfdef73a429cc5e7870a549f7",
            ),
            "gallery-3.png": hb_url(
                "9a942eb64008e3da7f203e3cd0fa546de579aaa73109c-g2GhFO",
                "cd2473a8e440a63e6e1f434ad6900932",
            ),
        },
        "avatar_from": "gallery-1.png",
    },
}


def fetch_bytes(url: str, retries: int = 4) -> bytes:
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": UA, "Referer": "https://huaban.com/"}
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read()
        except Exception as err:  # noqa: BLE001
            last_err = err
            time.sleep(1.5 * (attempt + 1))
    raise last_err  # type: ignore[misc]


def fetch(url: str, retries: int = 4) -> Image.Image:
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": UA, "Referer": "https://huaban.com/"}
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
            img = Image.open(io.BytesIO(data)).convert("RGBA")
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[3])
            return bg
        except Exception as err:  # noqa: BLE001
            last_err = err
            time.sleep(1.5 * (attempt + 1))
    raise last_err  # type: ignore[misc]


def save_live_gif(data: bytes, dest: Path, target_w: int = 480) -> None:
    im = Image.open(io.BytesIO(data))
    frames = []
    durations = []
    frame_idx = 0
    try:
        while True:
            dur = im.info.get("duration", 80)
            if frame_idx % 2 == 0:
                frame = im.copy().convert("RGBA")
                w, h = frame.size
                nh = int(h * target_w / w)
                frame = frame.resize((target_w, nh), Image.Resampling.LANCZOS)
                frames.append(frame.convert("P", palette=Image.ADAPTIVE, colors=96))
                durations.append(max(dur * 2, 60))
            frame_idx += 1
            im.seek(im.tell() + 1)
    except EOFError:
        pass

    frames[0].save(
        dest,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
    )


def save_gallery(img: Image.Image, dest: Path, max_width: int = 900) -> None:
    w, h = img.size
    if w > max_width:
        nh = int(h * max_width / w)
        img = img.resize((max_width, nh), Image.Resampling.LANCZOS)
    img.save(dest, "PNG", optimize=True)


def save_avatar(img: Image.Image, dest: Path, size: int = 512) -> None:
    w, h = img.size
    side = int(min(w, h) * 0.52)
    left = max(0, (w - side) // 2)
    top = int(h * 0.03)
    crop = img.crop((left, top, left + side, min(h, top + side)))
    crop = crop.resize((size, size), Image.Resampling.LANCZOS)
    crop.save(dest, "PNG", optimize=True)


def main() -> None:
    only = sys.argv[1:] if len(sys.argv) > 1 else list(ASSETS.keys())
    for slug in only:
        cfg = ASSETS[slug]
        out_dir = ROOT / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        cache: dict[str, Image.Image] = {}

        for filename, url in cfg["sources"].items():
            print(f"Downloading {slug}/{filename} ...")
            if filename.endswith(".gif"):
                save_live_gif(fetch_bytes(url), out_dir / filename)
            else:
                img = fetch(url)
                cache[filename] = img
                save_gallery(img, out_dir / filename)
            time.sleep(0.8)

        avatar_src = cfg["avatar_from"]
        save_avatar(cache[avatar_src], out_dir / "avatar.png")
        print(f"Saved {slug}/avatar.png from {avatar_src}")

    print("Done.")


if __name__ == "__main__":
    main()

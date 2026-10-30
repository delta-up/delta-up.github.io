# DeltaUp | دلتا آپ

**Improving performance through technology; delivering measurable results.**

| Address | Content |
|---|---|
| `/` | Presentation (English / فارسی), works on phone and desktop |
| `/site/` | Full DeltaUp page |
| `/files/` | PDF versions of the page and the presentation |
| `/luna/` | Luna videos and screenshots on the home page (real product screens, demo data) |
| `/tools/` | `luna_voice.py` adds Luna's Persian voice to the profit video; `luna-capture/` re-records the media |

Live at: https://delta-up.github.io · Website: [deltaup.ir](https://deltaup.ir) · Phone: 0912 836 1573 · Social media: 0930 695 2808

These files are built from the DeltaUp source repository (`tools/build.py`, `tools/pdf.js`). Edit there and republish; do not edit these files by hand.

## Homepage launch film

`luna/launch/` contains the approved voiced storyboard preview, poster, Persian
captions, and click-to-play dialog. The preview uses illustrative storyboard
images, not a recording of the running product. After regenerating `index.html`,
run `python tools/install_launch_hero.py` to restore this homepage customization.
The video is loaded only after a visitor chooses to play it. No API credentials
or external media-generation calls are needed in production.

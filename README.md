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

## Visitor notifications in Telegram

`track.js` (loaded on `/`, `/site/`, `/deck/`, `/form/`) reports every visit to the
same Cloudflare Worker as the lead form (`tools/lead-worker.js`, path `/visit`).
Each visit sends **one** Telegram message on arrival, with no later updates. It shows:
new or returning visitor (and the name from a form they sent earlier), entry time
(Tehran), city, country and ISP, where they came from (search, Telegram, a UTM
campaign, a direct visit…), the landing page and the device.

* **Deploy:** paste the new `tools/lead-worker.js` into the existing Worker
  (`deltaup-lead`). You don't need new secrets.
* **Exclude yourself:** open `https://karnil.ir/?notrack` once on each of your own
  browsers. `?track` turns tracking back on.
* Returning visitors are recognised by the browser (localStorage). A different
  device, private mode or cleared data counts as a new visitor. A visitor's
  location comes from their IP, so it shows the VPN's location when they use one.
* After regenerating `index.html`, `python tools/install_launch_hero.py` also adds the tracking script back.

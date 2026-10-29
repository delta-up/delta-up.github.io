"""Adds Luna's Persian voice to luna/profit.mp4 (the profit-key demo on the home page).

Run once on your own computer, with your Gemini key (it is only read from the environment, never saved):

    pip install imageio-ffmpeg
    set GEMINI_API_KEY=...        (PowerShell: $env:GEMINI_API_KEY="...")   (macOS/Linux: export GEMINI_API_KEY=...)
    python tools/luna_voice.py

It keeps the silent original as luna/profit-silent.mp4, writes the voiced video to luna/profit.mp4,
and the page then shows a 🔊 button on that video. Commit and push the two files afterwards.
Luna speaks with the Kore voice and the CEO with Charon, the same voices as the Luna landing film.
"""
import base64
import io
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import wave

import imageio_ffmpeg

MODEL = 'gemini-3.8-flash-tts'
STYLE = ('Native Iranian Persian, fluent modern conversational Farsi with a natural Tehran accent. '
         'Warm, confident, clear, professional. No exaggerated acting. No English accent. ')
# (start second in the video, window length, voice, text). Each line must finish inside its window.
LINES = [
    (2.0, 3.3, 'Kore', 'کلید سود فعال شد. حالا هر جواب، به تومان است.'),
    (5.4, 3.5, 'Charon', 'لونا، سه ماه آینده پول را کجا خرج کنیم که بیشترین سود را بدهد؟'),
    (10.6, 5.1, 'Kore', 'گلوگاه شما فروش نیست؛ خط رنگ‌کاری است. رفع آن ماهانه حدود یک میلیارد و هشتصد میلیون تومان سود می‌آورد.'),
    (15.8, 4.9, 'Kore', 'هر هفته که خط دوم رنگ‌کاری دیر راه بیفتد، حدود چهارصد و سی میلیون تومان سود روی میز می‌ماند.'),
    (20.8, 5.1, 'Kore', 'پیشنهاد من: اول گلوگاه رنگ‌کاری، بعد فروشنده.'),
]
ROOT = pathlib.Path(__file__).resolve().parent.parent
VIDEO = ROOT / 'luna' / 'profit.mp4'
SILENT = ROOT / 'luna' / 'profit-silent.mp4'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def speak(key, voice, text, path):
    payload = {'contents': [{'role': 'user', 'parts': [{'text': text, 'speech_metadata': {'style': STYLE}}]}],
               'generationConfig': {'responseModalities': ['AUDIO'], 'speechConfig': {'voiceConfig': {'voice': voice}}}}
    request = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent',
                                     data=json.dumps(payload, ensure_ascii=False).encode(),
                                     headers={'x-goog-api-key': key, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=150) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        sys.exit(f'Gemini refused the request ({error.code}): {error.read().decode(errors="replace")[:400]}\n'
                 'Check that this key is active and has credit, or try another key.')
    part = result['candidates'][0]['content']['parts'][0]['inlineData']
    rate = int(part.get('mimeType', '').split('rate=')[-1]) if 'rate=' in part.get('mimeType', '') else 24000
    with wave.open(str(path), 'wb') as out:
        out.setnchannels(1); out.setsampwidth(2); out.setframerate(rate)
        out.writeframes(base64.b64decode(part['data']))
    with wave.open(str(path)) as clip:
        return clip.getnframes() / clip.getframerate()


def main():
    key = os.environ.get('GEMINI_API_KEY', '').strip()
    if not key:
        sys.exit('Set GEMINI_API_KEY first (see the top of this file).')
    if not SILENT.exists():
        shutil.copyfile(VIDEO, SILENT)
    with tempfile.TemporaryDirectory() as tmp:
        inputs, filters = [], []
        for i, (start, window, voice, text) in enumerate(LINES):
            path = pathlib.Path(tmp) / f'{i}.wav'
            length = speak(key, voice, text, path)
            tempo = min(max(length / window, 1.0), 1.3)
            print(f'line {i + 1}: {length:.1f}s for a {window:.1f}s window' + (f', sped up x{tempo:.2f}' if tempo > 1 else ''))
            if length / tempo > window + 0.3:
                print(f'  warning: line {i + 1} still runs {length / tempo - window:.1f}s past its window; shorten its text in LINES')
            inputs += ['-i', str(path)]
            filters.append(f'[{i + 1}:a]atempo={tempo:.3f},adelay={int(start * 1000)}|{int(start * 1000)}[a{i}]')
        mix = ''.join(f'[a{i}]' for i in range(len(LINES))) + f'amix=inputs={len(LINES)}:normalize=0,apad[voice]'
        seconds = imageio_ffmpeg.count_frames_and_secs(str(SILENT))[1]
        subprocess.run([FFMPEG, '-y', '-v', 'error', '-i', str(SILENT), *inputs, '-filter_complex', ';'.join(filters + [mix]),
                        '-map', '0:v', '-map', '[voice]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k', '-t', f'{seconds:.3f}',
                        '-movflags', '+faststart', str(VIDEO)], check=True)
    print(f'Done: {VIDEO.relative_to(ROOT)} now has Luna\'s voice. Commit luna/profit.mp4 and luna/profit-silent.mp4.')


if __name__ == '__main__':
    main()

"""Reapply the launch-film hero after regenerating the static homepage."""
from pathlib import Path
import re
root=Path(__file__).resolve().parent.parent
p=root/'index.html'
s=p.read_text()
def tr(fa,en,de,fr,ar):
 return ''.join(f'<span class="{k}">{v}</span>' for k,v in zip(['fa','en','de','fr','ar'],[fa,en,de,fr,ar]))
watch=tr('تماشای گفتگو','Watch the conversation','Gespräch ansehen','Voir la conversation','شاهد المحادثة')
title=tr('از یک سؤال، تا قدم بعدی.','One question. A clear next step.','Eine Frage. Ein klarer nächster Schritt.','Une question. Une prochaine étape claire.','سؤال واحد. خطوة تالية واضحة.')
hero='''<figure class="launch-film">
<a class="launch-film__poster" href="luna/launch/film.mp4" data-launch-film aria-label="تماشای گفتگو · Watch the conversation"><img src="luna/launch/poster.jpg" width="1280" height="720" alt="مدیر در حال گفتگو با لونا روی موبایل · A manager speaking with Luna on his phone" fetchpriority="high"><span class="launch-film__play" aria-hidden="true"><svg width="25" height="29" viewBox="0 0 25 29" fill="currentColor"><path d="M4 2L23 14.5L4 27Z"/></svg></span><span class="launch-film__time">00:49 · فارسی</span></a>
<figcaption><p class="launch-film__eyebrow">'''+tr('لونا · سازمان شما، در یک گفتگو','LUNA · YOUR ORGANIZATION, ONE CONVERSATION','LUNA · IHRE ORGANISATION IM GESPRÄCH','LUNA · VOTRE ORGANISATION EN UNE CONVERSATION','لونا · مؤسستك في محادثة واحدة')+'</p><h2>'+title+'</h2><p class="launch-film__description">'+tr('«چطور زودتر محصولمون رو عرضه کنیم؟»','“What would help us launch sooner?”','„Wie können wir früher starten?“','« Comment lancer notre produit plus tôt ? »','«كيف نطلق منتجنا أسرع؟»')+'</p><a class="launch-film__watch" href="luna/launch/film.mp4" data-launch-film>'+watch+' ↗︎</a></figcaption></figure>'
if 'class="launch-film"' not in s:
 s,n=re.subn(r'<div class="card big">.*?</div>\s*</section>',hero+'\n</section>',s,count=1,flags=re.S)
 if n!=1: raise SystemExit('Hero card not found; refusing to change another section')
 s=s.replace('</head>','<link rel="stylesheet" href="luna/launch/player.css">\n</head>')
 modal='<dialog id="launch-film-dialog" class="launch-film-dialog" aria-labelledby="launch-film-title"><div class="launch-film-dialog__bar"><h2 id="launch-film-title">'+watch+'</h2><button type="button" aria-label="بستن · Close">×</button></div><video controls playsinline preload="none" poster="luna/launch/poster.jpg"><track kind="captions" src="luna/launch/captions.fa.vtt" srclang="fa" label="فارسی">'+watch+'</video><p class="launch-film-dialog__note">'+tr('سناریوی نمایشی · صدا به زبان فارسی','Illustrative scenario · Persian audio','Beispielszenario · Persischer Ton','Scénario illustratif · Audio en persan','سيناريو توضيحي · صوت بالفارسية')+'</p></dialog><script src="luna/launch/player.js" defer></script>'
 s=s.replace('</body>',modal+'\n</body>')
 p.write_text(s)
 print('Hero video installed')
else: print('Hero video already installed')

# Visitor tracking (track.js -> Telegram); the page generator does not add it.
s=p.read_text()
if 'src="/track.js"' not in s:
 p.write_text(s.replace('</body>','<script src="/track.js" defer></script>\n</body>'))
 print('Visitor tracking installed')

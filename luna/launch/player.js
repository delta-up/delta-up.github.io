(()=>{
const dialog=document.querySelector('#launch-film-dialog');
if(!dialog||typeof dialog.showModal!=='function')return;
const video=dialog.querySelector('video');let trigger,oldOverflow;
function close(){video.pause();dialog.close();}
document.querySelectorAll('[data-launch-film]').forEach(link=>link.addEventListener('click',event=>{
event.preventDefault();trigger=link;oldOverflow=document.body.style.overflow;
if(!video.getAttribute('src')){video.src=link.href;video.load();}
dialog.showModal();document.body.style.overflow='hidden';video.play().catch(()=>{});
}));
dialog.querySelector('button').addEventListener('click',close);
dialog.addEventListener('close',()=>{video.pause();document.body.style.overflow=oldOverflow||'';trigger?.focus();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
})();

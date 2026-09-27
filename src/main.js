import './style.css';
import { runTool } from './engine.js';
const tools = [
  ['Images','compress','Compress photo','Reduce file size, optionally downscale'],
  ['Images','convert','Convert image','Make JPG, PNG or WebP'],
  ['Images','resize','Resize image','Choose width and height'],
  ['Images','crop','Crop image','Crop from the top-left corner'],
  ['Images','rotate-image','Rotate / flip image','Turn and mirror pictures'],
  ['Images','image-pdf','Images to PDF','One image per page'],
  ['Images','grayscale','Grayscale images','Remove colors from images'],
  ['Images','image-watermark','Watermark images','Add centered text to an image'],
  ['PDF','pdf-images','PDF to images','Export pages as PNG or JPG'],
  ['PDF','merge','Merge PDFs','Combine in upload order'],
  ['PDF','split','Split PDF','Download each page separately'],
  ['PDF','extract','Extract PDF pages','Choose a page range'],
  ['PDF','reorder','Reorder PDF pages','List pages in new order'],
  ['PDF','rotate-pdf','Rotate PDF pages','Turn all or selected pages'],
  ['PDF','protect','Password protect PDF','AES-256 encryption'],
  ['PDF','unlock','Remove PDF password','Requires current password'],
  ['PDF','change-password','Change PDF password','Requires current password'],
  ['PDF','delete-pages','Delete PDF pages','Remove selected pages'],
  ['PDF','reverse-pdf','Reverse PDF pages','Put the last page first'],
  ['PDF','duplicate-page','Duplicate PDF page','Copy a selected page'],
  ['PDF','pdf-watermark','Watermark PDF','Add centered text to each page'],
  ['PDF','page-numbers','Number PDF pages','Add page numbers at the bottom'],
  ['PDF','pdf-text','Extract PDF text','Text layer only, not scanned OCR'],
  ['PDF','pdf-metadata','Edit PDF metadata','Change title, author and subject'],
  ['Text','text-stats','Word counter','Words, characters and lines'],
  ['Text','case','Change text case','Upper, lower, title or trim'],
  ['Text','json','JSON formatter','Pretty print or minify JSON'],
  ['Text','password','Password generator','Create a random password'],
  ['Text','duplicate-lines','Remove duplicate lines','Keep the first occurrence'],
  ['Text','url-encode','URL text encode / decode','Handle special URL characters']
];
const description = Object.fromEntries(tools.map(x=>[x[1],x]));
const $ = s=>document.querySelector(s);
const escape = value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const input = (name,label,value,type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" value="${escape(value)}" ${extra}></label>`;
const select = (name,label,items)=>`<label>${label}<select name="${name}">${items.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>`;
function fields(id) {
  const width = input('width',id==='compress'?'Maximum width (px)':id==='crop'?'Crop width (px)':'Width (px)',id==='compress'?1920:800,'number','min="1" max="20000"');
  const height = input('height',id==='crop'?'Crop height (px)':'Height (px)',600,'number','min="1" max="20000"');
  const quality = input('quality','Quality (%)',75,'number','min="1" max="100"');
  const angle = select('angle','Turn by',[['90','90°'],['180','180°'],['270','270°']]);
  const pages = input('pages','Pages (e.g. 1-3,5)','1','text','placeholder="1-3,5"');
  const formats = select('format','Output format',[['image/jpeg','JPG'],['image/png','PNG'],['image/webp','WebP']]);
  const imageTypes= ['compress','convert','resize','crop','rotate-image','image-pdf','grayscale','image-watermark'];
  const pdfTypes= ['pdf-images','merge','split','extract','rotate-pdf','protect','unlock','change-password','reorder','delete-pages','reverse-pdf','duplicate-page','pdf-watermark','page-numbers','pdf-text','pdf-metadata'];
  const fileField = imageTypes.includes(id)||pdfTypes.includes(id) ? `<label class="drop"><span>Choose ${imageTypes.includes(id)?'image':'PDF'} ${['merge','image-pdf'].includes(id)?'files':'file'}${['compress','convert','resize','crop','rotate-image'].includes(id)?' (one or more)':''}</span><input name="files" type="file" accept="${imageTypes.includes(id)?'image/*':'.pdf,application/pdf'}" ${['merge','image-pdf','compress','convert','resize','crop','rotate-image'].includes(id)?'multiple':''} required><small id="files-hint">Nothing selected</small></label>` : '';
  const textBox = '<label>Text<textarea name="text" rows="8" placeholder="Paste your text here"></textarea></label>';
  const map = {
    compress:width+quality, convert:formats+quality, resize:width+height+'<label class="check"><input type="checkbox" name="keepRatio" checked> Keep original proportions</label>'+quality,
    crop:width+height, 'rotate-image':angle+'<label class="check"><input type="checkbox" name="flip"> Flip horizontally</label>',
    grayscale:'<p class="hint">Output keeps the original image format where supported.</p>',
    'image-watermark':input('text','Watermark text',''),
    'image-pdf':'<p class="hint">Images are added in the order shown by your file picker. Large images may create a large PDF.</p>',
    'pdf-images':input('pages','Pages (leave blank for all)','')+select('format','Output format',[['image/png','PNG'],['image/jpeg','JPG']])+select('scale','Resolution',[['1','Standard'],['1.5','Sharp'],['2','High']]),
    merge:'<p class="hint">PDFs are joined in the order shown by your file picker.</p>', split:'<p class="hint">Each PDF page becomes a separate file in a ZIP.</p>', extract:pages,reorder:pages,
    'rotate-pdf':angle+input('pages','Pages (blank means all)',''),
    'delete-pages':pages, 'reverse-pdf':'<p class="hint">Reverses all pages.</p>',
    'duplicate-page':input('page','Page number',1,'number','min="1"'),
    'pdf-watermark':input('text','Watermark text','DRAFT'),
    'page-numbers':'<p class="hint">Page numbers are added to the bottom of every page. Check for overlap on existing page content.</p>',
    'pdf-text':'<p class="hint">Scanned images do not contain text. This tool does not perform OCR.</p>',
    'pdf-metadata':input('title','Title','')+input('author','Author','')+input('subject','Subject',''),
    protect:input('newPassword','New password','','password','required autocomplete="new-password"'),
    unlock:input('password','Current password','','password','required autocomplete="off"'),
    'change-password':input('password','Current password','','password','required autocomplete="off"')+input('newPassword','New password','','password','required autocomplete="new-password"'),
    'text-stats':textBox, case:textBox+select('case','Transform',[['upper','UPPERCASE'],['lower','lowercase'],['title','Title Case'],['trim','Trim extra spaces']]),
    json:textBox+select('format','Output',[['pretty','Pretty print'],['minify','Minify']]),
    password:input('length','Password length',20,'number','min="8" max="128"'),
    'duplicate-lines':textBox, 'url-encode':textBox+select('format','Action',[['encode','Encode'],['decode','Decode']])
  };
  return fileField + `<div class="fields">${map[id]||''}</div>`;
}
let current='compress', category='All', search='';
function renderCards(){
  const cards=tools.filter(t=>(category==='All'||t[0]===category)&&(`${t[2]} ${t[3]}`.toLowerCase().includes(search)));
  $('#cards').innerHTML=cards.map(t=>`<button class="tool-card ${current===t[1]?'selected':''}" data-id="${t[1]}"><span class="tool-label">${t[0]}</span><strong>${t[2]}</strong><span>${t[3]}</span><span class="arrow" aria-hidden="true">↗</span></button>`).join('') || '<p class="empty">No matching tools. Try another search.</p>';
}
function open(id){
  current=id; const tool=description[id];
  $('#tool-category').textContent=tool[0]; $('#tool-title').textContent=tool[2]; $('#tool-desc').textContent=tool[3];
  $('#tool-form').innerHTML=fields(id)+`<button id="run" type="submit">${id==='text-stats'?'Count':id==='case'||id==='password'?'Copy result':'Make and download'} <span>→</span></button>`;
  $('#status').textContent=''; $('#status').className='status';
  $('#tool-form [name=files]')?.addEventListener('change',e=>$('#files-hint').textContent=Array.from(e.target.files).map(f=>f.name).join(', ') || 'Nothing selected');
  const ratio=$('#tool-form [name=keepRatio]'), height=$('#tool-form [name=height]');
  if(ratio&&height){height.disabled=true;ratio.onchange=()=>height.disabled=ratio.checked;}
  renderCards(); if(window.innerWidth<900) $('#workspace').scrollIntoView({behavior:'smooth',block:'start'});
}
$('#app').innerHTML=`<header class="site-header"><div class="brand"><span class="brand-mark">◩</span> everyday<span>tools</span></div><div class="header-note"><span class="green-dot"></span> Works in your browser · No file upload</div></header><main><section class="hero"><div class="eyebrow">ONE PLACE FOR SMALL TASKS</div><h1>Get the little things done.</h1><p>Compress a photo, edit a PDF, tidy text and more. Files stay on your device; processing happens in your browser.</p><div class="hero-count"><b>30</b> ready-to-use tools <span>·</span> Images, PDFs and text</div></section><div class="app-grid"><section class="catalog" aria-label="Tool catalog"><div class="catalog-heading"><div><p class="eyebrow">YOUR TOOLBOX</p><h2>Find a tool</h2></div><span class="count">30 tools</span></div><input class="search" id="search" type="search" placeholder="Search tools..." aria-label="Search tools"><div class="filters" role="group" aria-label="Filter tools">${['All','Images','PDF','Text'].map(x=>`<button data-category="${x}" class="${x==='All'?'active':''}">${x}</button>`).join('')}</div><div id="cards" class="cards"></div></section><section id="workspace" class="workspace" aria-label="Selected tool"><div class="workspace-top"><span id="tool-category" class="eyebrow"></span><span class="local-badge">⌁ LOCAL PROCESSING</span></div><h2 id="tool-title"></h2><p id="tool-desc"></p><form id="tool-form"></form><div id="status" class="status" role="status" aria-live="polite"></div><div class="privacy">🔒 Your files are processed locally. Passwords are never sent to a server. Keep the original until you check the downloaded result.</div></section></div></main><footer><span>Everyday Tools</span><span>Built for quick jobs, right in your browser.</span></footer>`;
$('#cards').addEventListener('click',e=>{const card=e.target.closest('[data-id]');if(card)open(card.dataset.id)});
$('#search').addEventListener('input',e=>{search=e.target.value.trim().toLowerCase();renderCards()});
$('.filters').addEventListener('click',e=>{const btn=e.target.closest('[data-category]');if(!btn)return;category=btn.dataset.category;document.querySelectorAll('.filters button').forEach(b=>b.classList.toggle('active',b===btn));renderCards()});
$('#tool-form').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget,btn=$('#run'), status=$('#status');
  const data=new FormData(form),opts=Object.fromEntries(data.entries());opts.keepRatio=!!form.elements.keepRatio?.checked; opts.flip=!!form.elements.flip?.checked;
  const files=Array.from(form.elements.files?.files||[]);
  btn.disabled=true; status.className='status';status.textContent='Working on your device...';
  try {const result=await runTool(current,files,opts);status.className='status success';status.textContent=result;}
  catch(error){status.className='status error';status.textContent=error.message||'Something went wrong. Check your file and try again.';console.error(error);}
  finally{btn.disabled=false;}
});
open(current);

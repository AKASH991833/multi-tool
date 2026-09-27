import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import JSZip from 'jszip';
import { createQpdfRunner } from 'qpdf-run';
import qpdfWorkerUrl from 'qpdf-run/worker?url';
import qpdfJsUrl from 'qpdf-run/qpdf.js?url';
import wasmUrl from 'qpdf-run/qpdf.wasm?url';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
const bytes = async file => new Uint8Array(await file.arrayBuffer());
const pdf = async file => PDFDocument.load(await bytes(file));
const stem = name => name.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').slice(0, 80) || 'file';
export const save = (data, name, type) => {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
const canvasBlob = (canvas, type, quality) => new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Your browser cannot export this format.')), type, quality));
const loadImage = file => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); }; img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image. Try JPG, PNG or WebP.')); }; img.src = url;
});
const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const imageOutput = async (canvas, type, quality, filename) => {
  const blob = await canvasBlob(canvas, type, quality); save(blob, filename, type);
  return `${(blob.size / 1024).toFixed(0)} KB downloaded`;
};
const zipDownload = async (items, name) => {
  const zip = new JSZip(); items.forEach(([filename, data]) => zip.file(filename, data));
  save(await zip.generateAsync({ type: 'blob' }), name, 'application/zip');
  return `${items.length} files downloaded in a ZIP`;
};
function parsePages(text, count, { unique = false } = {}) {
  if (!text.trim()) throw new Error('Enter page numbers, for example 1-3,5.');
  const out = [];
  for (const part of text.split(',')) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error(`Invalid page range: ${part.trim()}`);
    const from = Number(match[1]), to = Number(match[2] || match[1]);
    if (from < 1 || to > count || from > to) throw new Error(`Pages must be between 1 and ${count}.`);
    for (let i = from; i <= to; i++) if (!unique || !out.includes(i - 1)) out.push(i - 1);
  }
  if (!out.length) throw new Error('Choose at least one page.');
  return out;
}
async function embedImage(doc, file) {
  const img = await loadImage(file), canvas = makeCanvas(img.naturalWidth, img.naturalHeight);
  canvas.getContext('2d').drawImage(img, 0, 0);
  const png = new Uint8Array(await (await canvasBlob(canvas, 'image/png')).arrayBuffer());
  return doc.embedPng(png);
}
let qpdfRunner;
async function qpdf(file, args, password, outputName) {
  if (!qpdfRunner) qpdfRunner = await createQpdfRunner({ workerUrl: qpdfWorkerUrl, qpdfJsUrl, wasmUrl, timeoutMs: 60000 });
  try {
    const input = await bytes(file);
    const out = await qpdfRunner.runOne({ input, inputName: 'input.pdf', outputName, args });
    save(out, `${stem(file.name)}-${outputName}`, 'application/pdf');
    return 'PDF downloaded';
  } catch (error) {
    throw new Error(error.code === 'QPDF_EXEC_FAILED' ? 'PDF password was incorrect, file is damaged, or this security mode is unsupported.' : error.message);
  }
}
const int = (value, label, min = 1, max = 20000) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${label} must be an integer from ${min} to ${max}.`);
  return n;
};
export async function runTool(id, files, opts) {
  const file = files[0];
  if (['compress','convert','resize','crop','rotate-image','image-pdf','grayscale','image-watermark'].includes(id)) {
    if (!files.length) throw new Error('Choose at least one image.');
    if (files.some(f => !f.type.startsWith('image/'))) throw new Error('Please select image files only.');
    if (id === 'image-pdf') {
      const doc = await PDFDocument.create();
      for (const f of files) { const image = await embedImage(doc, f); const fit = Math.min(595 / image.width, 842 / image.height, 1); const w = image.width * fit, h = image.height * fit; const page = doc.addPage([Math.max(w, 72), Math.max(h, 72)]); page.drawImage(image, { x: (page.getWidth()-w)/2, y: (page.getHeight()-h)/2, width:w, height:h }); }
      save(await doc.save(), 'images.pdf', 'application/pdf'); return `${files.length} image(s) added to PDF`;
    }
    const outputs = [];
    for (const f of files) {
      const img = await loadImage(f); let w = img.naturalWidth, h = img.naturalHeight;
      let type = id === 'convert' ? opts.format : (id === 'compress' ? 'image/jpeg' : (['image/png','image/jpeg','image/webp'].includes(f.type) ? f.type : 'image/png'));
      const ext = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp' }[type];
      if (!ext) throw new Error('Pick JPG, PNG or WebP.');
      if (id === 'resize') { const target = int(opts.width, 'Width'); const ratio = target / w; w = target; h = opts.keepRatio ? Math.max(1, Math.round(h*ratio)) : int(opts.height, 'Height'); }
      if (id === 'compress') { const max = int(opts.width, 'Maximum width', 100, 20000); if (w > max) { h = Math.max(1, Math.round(h*max/w)); w = max; } }
      if (id === 'crop') { w = int(opts.width, 'Crop width'); h = int(opts.height, 'Crop height'); if (w > img.naturalWidth || h > img.naturalHeight) throw new Error('Crop dimensions exceed the image.'); }
      const turn = id === 'rotate-image' ? Number(opts.angle) : 0;
      const c = makeCanvas(turn === 90 || turn === 270 ? h : w, turn === 90 || turn === 270 ? w : h), ctx = c.getContext('2d');
      if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
      if (id === 'rotate-image') { ctx.translate(c.width/2,c.height/2); ctx.rotate(turn*Math.PI/180); if (opts.flip) ctx.scale(-1,1); ctx.drawImage(img,-w/2,-h/2,w,h); }
      else if (id === 'crop') ctx.drawImage(img, 0, 0, w, h, 0, 0, w, h);
      else ctx.drawImage(img,0,0,w,h);
      if (id === 'grayscale') { const pixels=ctx.getImageData(0,0,w,h); for(let j=0;j<pixels.data.length;j+=4){const avg=Math.round(pixels.data[j]*.299+pixels.data[j+1]*.587+pixels.data[j+2]*.114);pixels.data[j]=pixels.data[j+1]=pixels.data[j+2]=avg;}ctx.putImageData(pixels,0,0); }
      if (id === 'image-watermark') {if (!opts.text.trim()) throw new Error('Enter watermark text.');ctx.save();ctx.globalAlpha=.55;ctx.fillStyle='#fff';ctx.strokeStyle='#242424';ctx.lineWidth=Math.max(2,w/400);ctx.font=`bold ${Math.max(18,Math.round(w/20))}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeText(opts.text.slice(0,80),w/2,h/2);ctx.fillText(opts.text.slice(0,80),w/2,h/2);ctx.restore();}
      const blob = await canvasBlob(c, type, Number(opts.quality)/100);
      outputs.push([`${stem(f.name)}-${id}.${ext}`, blob]);
    }
    if (outputs.length === 1) { save(outputs[0][1],outputs[0][0],outputs[0][1].type); return `${(outputs[0][1].size/1024).toFixed(0)} KB downloaded`; }
    return zipDownload(outputs, `${id}-images.zip`);
  }
  if (['pdf-images','merge','split','extract','rotate-pdf','reorder','protect','unlock','change-password','delete-pages','reverse-pdf','duplicate-page','pdf-watermark','page-numbers','pdf-text','pdf-metadata'].includes(id)) {
    if (!files.length || files.some(f => !/\.pdf$/i.test(f.name) && f.type !== 'application/pdf')) throw new Error('Choose PDF files only.');
    if (id === 'protect' || id === 'unlock' || id === 'change-password') {
      const old = opts.password || '', next = opts.newPassword || '';
      if (id !== 'protect' && !old) throw new Error('Enter the current PDF password.');
      if (id !== 'unlock' && !next) throw new Error('Enter the new PDF password.');
      if (id === 'protect') return qpdf(file, ['--encrypt', next, next, '256', '--', 'input.pdf', 'protected.pdf'], '', 'protected.pdf');
      if (id === 'unlock') return qpdf(file, [`--password=${old}`, '--decrypt', '--', 'input.pdf', 'unlocked.pdf'], old, 'unlocked.pdf');
      return qpdf(file, [`--password=${old}`, '--encrypt', next, next, '256', '--', 'input.pdf', 'new-password.pdf'], old, 'new-password.pdf');
    }
    if (id === 'pdf-text') { const source=await pdfjs.getDocument({data:await bytes(file),useSystemFonts:true}).promise; const parts=[]; try{for(let n=1;n<=source.numPages;n++){const content=await (await source.getPage(n)).getTextContent();parts.push(`--- Page ${n} ---\n`+content.items.map(i=>i.str).join(' '));}}finally{await source.destroy();}save(new Blob([parts.join('\n\n')],{type:'text/plain'}),`${stem(file.name)}.txt`,'text/plain');return `${parts.length} page(s) exported as text (OCR not included)`; }
    if (id === 'pdf-images') {
      const source = await pdfjs.getDocument({ data: await bytes(file), useSystemFonts:true }).promise;
      const selected = opts.pages.trim() ? parsePages(opts.pages, source.numPages, {unique:true}).map(x => x+1) : Array.from({length:source.numPages},(_,i)=>i+1);
      const result=[];
      try { for (const n of selected) { const page=await source.getPage(n), viewport=page.getViewport({scale:Number(opts.scale)||1.5}), canvas=makeCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height)); await page.render({canvasContext:canvas.getContext('2d'), viewport, canvas}).promise; result.push([`page-${n}.${opts.format === 'image/jpeg' ? 'jpg' : 'png'}`, await canvasBlob(canvas, opts.format, 0.9)]); canvas.width=0; canvas.height=0; } }
      finally { await source.destroy(); }
      if(result.length===1){ save(result[0][1],result[0][0],opts.format); return 'Page image downloaded'; }
      return zipDownload(result, `${stem(file.name)}-pages.zip`);
    }
    if (id === 'merge') { if (files.length < 2) throw new Error('Choose two or more PDFs.'); const out=await PDFDocument.create(); for (const f of files) {const input=await pdf(f); const pages=await out.copyPages(input,input.getPageIndices()); pages.forEach(page=>out.addPage(page)); } save(await out.save(),'merged.pdf','application/pdf'); return `${files.length} PDFs merged`; }
    const input=await pdf(file), count=input.getPageCount();
    if (id==='reverse-pdf') {const out=await PDFDocument.create();(await out.copyPages(input,input.getPageIndices().reverse())).forEach(p=>out.addPage(p));save(await out.save(),`${stem(file.name)}-reversed.pdf`,'application/pdf');return `${count} pages reversed`;}
    if (id==='delete-pages') {const indices=parsePages(opts.pages,count,{unique:true});if(indices.length>=count)throw new Error('At least one page must remain.');indices.sort((a,b)=>b-a).forEach(i=>input.removePage(i));save(await input.save(),`${stem(file.name)}-deleted.pdf`,'application/pdf');return `${indices.length} page(s) removed`;}
    if (id==='duplicate-page') {const n=int(opts.page,'Page',1,count)-1;const out=await PDFDocument.create();const indices=input.getPageIndices().flatMap(i=>i===n?[i,i]:[i]);(await out.copyPages(input,indices)).forEach(p=>out.addPage(p));save(await out.save(),`${stem(file.name)}-duplicated.pdf`,'application/pdf');return `Page ${n+1} duplicated`;}
    if (id==='pdf-metadata') {input.setTitle(opts.title||'');input.setAuthor(opts.author||'');input.setSubject(opts.subject||'');save(await input.save(),`${stem(file.name)}-metadata.pdf`,'application/pdf');return 'PDF metadata updated';}
    if (id==='pdf-watermark'||id==='page-numbers') {if(id==='pdf-watermark'&&!opts.text.trim())throw new Error('Enter watermark text.');const font=await input.embedFont(StandardFonts.Helvetica);input.getPages().forEach((page,i)=>{const {width,height}=page.getSize();if(id==='page-numbers'){const label=`${i+1} / ${count}`;page.drawText(label,{x:width/2-font.widthOfTextAtSize(label,10)/2,y:20,size:10,font,color:rgb(.4,.4,.4)});}else{const label=opts.text.slice(0,80).replace(/[^\x20-\x7E]/g,'');if(!label)throw new Error('Use basic Latin characters for the PDF watermark.');const size=Math.min(42,Math.max(12,width/(label.length*.6)));page.drawText(label,{x:Math.max(20,(width-font.widthOfTextAtSize(label,size))/2),y:height/2,size,font,rotate:degrees(0),color:rgb(.5,.5,.5),opacity:.35});}});save(await input.save(),`${stem(file.name)}-${id}.pdf`,'application/pdf');return `${count} page(s) updated`;}
    if (id==='split') { const chunks=[]; for(let i=0;i<count;i++){const out=await PDFDocument.create();out.addPage((await out.copyPages(input,[i]))[0]);chunks.push([`page-${i+1}.pdf`,await out.save()]);} return zipDownload(chunks,`${stem(file.name)}-split.zip`); }
    if (id==='extract'||id==='reorder') {const indices=parsePages(opts.pages,count,{unique:id==='extract'}); if(id==='reorder' && indices.length!==count) throw new Error(`List all ${count} pages in the order you want, exactly once.`); if(id==='reorder' && new Set(indices).size!==count) throw new Error('Each page must appear exactly once.'); const out=await PDFDocument.create(); (await out.copyPages(input,indices)).forEach(p=>out.addPage(p));save(await out.save(),`${stem(file.name)}-${id}.pdf`,'application/pdf');return `${indices.length} pages downloaded`;}
    if (id==='rotate-pdf') {const indices=opts.pages.trim()?parsePages(opts.pages,count,{unique:true}):input.getPageIndices(); indices.forEach(i=>{const p=input.getPage(i);p.setRotation(degrees((p.getRotation().angle + Number(opts.angle))%360));}); save(await input.save(),`${stem(file.name)}-rotated.pdf`,'application/pdf');return `${indices.length} pages rotated`;}
  }
  if (id==='text-stats') { const text=opts.text||''; return `${text.trim()?text.trim().split(/\s+/).length:0} words · ${Array.from(text).length} characters · ${text.split(/\r\n|\r|\n/).length} lines`; }
  if (id==='case') { const text=opts.text||''; const value=opts.case==='upper'?text.toUpperCase():opts.case==='lower'?text.toLowerCase():opts.case==='title'?text.toLowerCase().replace(/\b\p{L}/gu,c=>c.toUpperCase()):text.replace(/\s+/g,' ').trim(); await navigator.clipboard.writeText(value); return 'Transformed text copied to clipboard'; }
  if (id==='json') {const text=opts.text||''; const value=opts.format==='minify'?JSON.stringify(JSON.parse(text)):JSON.stringify(JSON.parse(text),null,2); save(new Blob([value],{type:'application/json'}),'formatted.json','application/json');return 'JSON downloaded';}
  if (id==='duplicate-lines') {const seen=new Set(), lines=(opts.text||'').split(/\r?\n/).filter(line=>{if(seen.has(line))return false;seen.add(line);return true;});save(new Blob([lines.join('\n')],{type:'text/plain'}),'unique-lines.txt','text/plain');return `${lines.length} unique line(s) downloaded`;}
  if (id==='url-encode') {const value=opts.format==='encode'?encodeURIComponent(opts.text||''):decodeURIComponent(opts.text||'');save(new Blob([value],{type:'text/plain'}),'url-text.txt','text/plain');return 'Result downloaded';}
  if (id==='password') {const len=int(opts.length,'Length',8,128), alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';let output='';const random=new Uint32Array(len);crypto.getRandomValues(random);for(const n of random)output+=alphabet[n%alphabet.length];await navigator.clipboard.writeText(output);return 'Random password copied to clipboard';}
  throw new Error('Tool not found.');
}

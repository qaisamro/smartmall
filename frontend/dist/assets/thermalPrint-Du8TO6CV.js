var e=`
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    /* 72mm keeps ALL text inside the printable area of 80mm rolls (real printable
       area is ~72-76mm depending on model). Content wider than that gets its edge
       characters physically clipped by the printer — e.g. RTL labels on the right
       side like "المجموع النهائي". */
    html, body { width: 72mm; background: #fff !important; margin: 0 !important; padding: 0 !important; border: 0 !important; }
    body {
        font-family: Tahoma, Arial, 'Segoe UI', sans-serif;
        direction: rtl;
        color: #000;
        font-size: 12px;
        line-height: 1.35;
        overflow: visible;
        height: auto;
        min-height: 0;
    }
    img, svg { max-width: 100%; }
    .receipt { width: 72mm; padding: 3mm; }
    .header { text-align: center; margin-bottom: 3mm; padding-bottom: 2mm; border-bottom: 1px dashed #000; page-break-inside: avoid; break-inside: avoid; }
    .header .meta { font-size: 10px; color: #000; text-align: center; }
    .header .meta span { display: block; padding: 0.4mm 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th { padding: 1.5mm 0.5mm; text-align: center; font-size: 10px; color: #000; border-bottom: 1px solid #000; font-weight: bold; }
    th:first-child { text-align: right; }
    th:last-child { text-align: right; }
    td { padding: 1.2mm 0.5mm; text-align: center; vertical-align: top; border-bottom: 1px solid #ccc; color: #000; }
    td:first-child { text-align: right; font-weight: bold; }
    td:last-child { text-align: right; font-weight: bold; }
    .item-notes { font-size: 9px; display: block; color: #333; font-weight: normal; }
    .totals { margin-top: 1.5mm; padding-top: 1.5mm; border-top: 1px solid #000; page-break-inside: avoid; break-inside: avoid; }
    .totals .row { display: flex; justify-content: space-between; padding: 0.8mm 0; font-size: 11px; color: #000; }
    .totals .row span:last-child { font-weight: bold; }
    .totals .grand { font-size: 14px; font-weight: bold; padding-top: 1.5mm; border-top: 1px solid #000; margin-top: 1mm; }
    .footer { text-align: center; margin-top: 3mm; padding-top: 1.5mm; border-top: 1px dashed #000; font-size: 9px; color: #000; page-break-before: avoid; page-break-after: avoid; }
    .footer .brand { font-weight: bold; font-size: 11px; letter-spacing: 1px; margin-bottom: 0.5mm; color: #000; }
    .footer p { color: #000; }
    .barcode { text-align: center; margin: 1.5mm 0; font-family: 'Courier New', monospace; font-size: 13px; letter-spacing: 1px; color: #000; font-weight: bold; page-break-before: avoid; }
    /* Critical: cap the document to exactly its content height — any extra height
       becomes trailing blank pages on continuous-roll thermal printers. */
    @media print {
        html, body { width: 72mm; height: auto !important; min-height: 0 !important; overflow: visible !important; display: block !important; position: static !important; }
        body > *:not(.receipt) { display: none !important; }
        .receipt { margin: 0 auto; float: none !important; position: static !important; page-break-after: auto; }
    }
`;function t({bodyHtml:t,title:n=`فاتورة`,css:r=``,extraHeadHtml:i=``,printDelay:a=350}){let o=String(t||``).trim(),s=document.createElement(`iframe`);s.setAttribute(`aria-hidden`,`true`),s.style.cssText=`position:absolute;left:-9999px;top:0;width:302px;min-height:200px;border:0;overflow:visible;pointer-events:none;`,s.title=n,document.body.appendChild(s);let c=s.contentWindow.document;c.open(),c.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${n}</title>${i}<style>${e}${r}</style></head><body>${o}</body></html>`),c.close();let l=!1,u=!1,d=()=>{if(!l){l=!0;try{s.contentWindow.removeEventListener(`afterprint`,f)}catch{}try{window.removeEventListener(`afterprint`,f)}catch{}setTimeout(()=>{try{s.remove()}catch{}},6e4),setTimeout(()=>{try{s.parentNode&&s.remove()}catch{}},1200)}},f=()=>d(),p=()=>{try{let t=window.open(``,`_blank`);return t?(t.document.open(),t.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${n}</title><style>${e}${r}</style>${i}</head><body>${o}<script>setTimeout(function(){ window.focus(); window.print(); }, 400);<\/script></body></html>`),t.document.close(),t.focus(),setTimeout(()=>{try{t.close()}catch{}},6e4),!0):(d(),!1)}catch{return!1}},m=()=>{if(u)return;u=!0;let e=s.contentWindow;try{let t=()=>{try{e.focus();try{e.addEventListener(`afterprint`,f)}catch{}try{window.addEventListener(`afterprint`,f)}catch{}e.requestAnimationFrame(()=>{e.requestAnimationFrame(()=>{e.print(),setTimeout(()=>{},1500)})}),setTimeout(()=>{l||d()},4e3)}catch{p()||d()}},n=e.document.fonts?e.document.fonts.ready.catch(()=>{}):Promise.resolve(),r=!1,i=new Promise(e=>setTimeout(()=>{r=!0,e()},Math.max(a,700)));Promise.race([n,i]).then(()=>{setTimeout(t,r?0:Math.min(a,600))})}catch{p()||d()}},h=!1,g=()=>{h||(h=!0,m())};try{c.readyState===`complete`&&setTimeout(g,80)}catch{}s.onload=g,setTimeout(g,Math.max(a+100,800))}export{t};
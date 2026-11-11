const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const menu=$('.menu-button'),nav=$('#navigation');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open menu');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';nav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close menu':'Open menu');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('.header'))closeMenu();});
window.matchMedia('(min-width:761px)').addEventListener('change',closeMenu);
function announce(el,message,error=false){el.textContent=message;el.classList.toggle('error',error);}
function reveal(el){el.scrollIntoView({block:'start',behavior:'instant'});}
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
async function post(url,body,controller=new AbortController()){
 let timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},15000);
 try{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
  const data=await response.json().catch(()=>{throw new Error('The server returned an unexpected response. Please try again.');});
  if(!response.ok)throw new Error(data.error||'Unable to complete this request. Please try again.');return data;
 }catch(error){if(timedOut)throw new Error('The request took too long. Please try again.');if(error.name==='TypeError')throw new Error('Unable to reach the server. Check your connection and try again.');throw error;}finally{clearTimeout(timer);}
}
if($('.filter-bar')){
 const cards=$$('.services-grid .service-card'),filters=$$('[data-filter]');
 function filter(category){if(!filters.some(b=>b.dataset.filter===category))category='All';let count=0;cards.forEach(card=>{card.hidden=category!=='All'&&card.dataset.category!==category;if(!card.hidden)count++;});filters.forEach(b=>{b.classList.toggle('active',b.dataset.filter===category);b.setAttribute('aria-pressed',String(b.dataset.filter===category));});$('#filter-count').textContent=`Showing ${count} services`;const url=new URL(location.href);category==='All'?url.searchParams.delete('category'):url.searchParams.set('category',category);history.replaceState(null,'',url);}
 filters.forEach(button=>button.addEventListener('click',()=>filter(button.dataset.filter)));
 filter(new URLSearchParams(location.search).get('category')||'All');
}
if($('#document-text')){
 const workflow=import('/workflow.mjs');
 const samples={design:'Supplier: Northfield Studio\nInvoice: INV-1042\nDate: 12 October 2026\n\nDescription: Design services\nSubtotal: GBP 1000.00\nTax: GBP 200.00\nTotal: GBP 1200.00\n\nFictional example for demonstration.',consulting:'Supplier: Westbridge Consulting\nInvoice: WC-2026-081\nDate: 12 October 2026\n\nDescription: Process consulting\nTotal: USD 2450.50\n\nFictional example for demonstration.',incomplete:'Supplier: Example Services\nInvoice: ES-091\nDate: 12 October 2026\n\nDescription: Advisory workshop\nTotal: To be confirmed\n\nFictional example with missing information.'};
 const source=$('#document-text'),sample=$('#sample'),extract=$('#extract-button'),review=$('#review-form'),empty=$('#review-empty'),result=$('#record-result'),message=$('#demo-message'),status=$('#record-status');
 const submit=$('button[type="submit"]',review);
 let revision=0,record=null;
 const extractLabel=extract.innerHTML,submitLabel=submit.innerHTML;
 function stage(n,finished=false){$$('[data-stage]').forEach(el=>{const index=Number(el.dataset.stage),complete=index<n||(finished&&index===n);el.classList.toggle('active',index===n);el.classList.toggle('complete',complete);index===n?el.setAttribute('aria-current','step'):el.removeAttribute('aria-current');$('.stage-marker',el).textContent=complete?'✓':String(index+1).padStart(2,'0');el.setAttribute('aria-label',`${$('.stage-name',el).textContent}: ${complete?'complete':index===n?'current step':'upcoming'}`);});}
 function panelState(state,busy=false){const panel=$('.review-panel');panel.dataset.state=state;panel.setAttribute('aria-busy',String(busy));}
 function clearInvalid(){$$('[aria-invalid]',review).forEach(el=>{el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby');});}
 function enable(){extract.disabled=false;extract.innerHTML=extractLabel;submit.disabled=false;submit.innerHTML=submitLabel;source.disabled=false;sample.disabled=false;$$('input,select',review).forEach(el=>el.disabled=false);}
 function clearReview(){revision++;record=null;review.reset();clearInvalid();review.hidden=true;result.hidden=true;empty.hidden=false;enable();stage(0);panelState('input');status.textContent='WAITING FOR INPUT';announce(message,'');}
 function reset(){clearReview();sample.value='design';source.value=samples.design;}
 source.addEventListener('input',clearReview);
 sample.addEventListener('change',()=>{clearReview();source.value=samples[sample.value];});
 $('#reset-demo').addEventListener('click',()=>{reset();source.focus({preventScroll:true});});
 extract.addEventListener('click',async()=>{
  clearReview();const current=revision;extract.disabled=true;extract.textContent='Extracting…';source.disabled=true;sample.disabled=true;stage(1);panelState('processing',true);status.textContent='PROCESSING';announce(message,'Reading the labelled fields…');
  try{await new Promise(requestAnimationFrame);const data=(await workflow).extractDocument(source.value);if(current!==revision)return;
   Object.entries(data.fields).forEach(([key,value])=>{review.elements[key].value=value;});data.missing.forEach(key=>{review.elements[key].setAttribute('aria-invalid','true');review.elements[key].setAttribute('aria-describedby','demo-message');});empty.hidden=true;review.hidden=false;stage(2);panelState(data.missing.length?'attention':'review');status.textContent=data.missing.length?'NEEDS YOUR ATTENTION':'READY TO REVIEW';announce(message,data.message);
  }catch(error){if(current!==revision)return;stage(0);panelState('attention');status.textContent='TRY AGAIN';announce(message,error.message,true);}finally{if(current===revision){enable();if(!review.hidden){review.elements.supplier.focus({preventScroll:true});if(innerWidth<=760)reveal(review);}else if(message.classList.contains('error')){source.focus({preventScroll:true});if(innerWidth<=760)reveal(source);}}}
 });
 review.addEventListener('input',event=>{if(event.target.name!=='approved'){review.elements.approved.checked=false;event.target.removeAttribute('aria-invalid');event.target.removeAttribute('aria-describedby');}});
 review.addEventListener('submit',async event=>{
  event.preventDefault();if(!review.reportValidity())return;const current=++revision;
  const fields=Object.fromEntries(['supplier','invoice','amount','currency'].map(key=>[key,review.elements[key].value]));
  const approved=review.elements.approved.checked;
  $$('input,select',review).forEach(el=>el.disabled=true);source.disabled=true;sample.disabled=true;extract.disabled=true;submit.disabled=true;submit.textContent='Validating…';stage(3);panelState('processing',true);status.textContent='VALIDATING';announce(message,'Checking the reviewed record…');
  try{await new Promise(requestAnimationFrame);const data=(await workflow).validateRecord(fields,approved);if(current!==revision)return;record=data.record;$('#record-json').textContent=JSON.stringify(record,null,2);review.hidden=true;result.hidden=false;stage(3,true);panelState('complete');status.textContent='REVIEW COMPLETE';announce(message,'Record validated. No external system was updated.');$('#download-record').focus({preventScroll:true});if(innerWidth<=760)reveal(result);
  }catch(error){if(current!==revision)return;stage(2);panelState('attention');status.textContent='NEEDS YOUR ATTENTION';announce(message,error.message,true);}finally{if(current===revision){enable();$('.review-panel').setAttribute('aria-busy','false');}}
 });
 $('#edit-record').addEventListener('click',()=>{record=null;result.hidden=true;review.hidden=false;review.elements.approved.checked=false;stage(2);panelState('review');status.textContent='READY TO REVIEW';announce(message,'Review your changes and approve again.');review.elements.supplier.focus({preventScroll:true});if(innerWidth<=760)reveal(review);});
 $('#download-record').addEventListener('click',()=>{if(record)download(JSON.stringify(record,null,2),'izn-reviewed-record.json','application/json');});
 reset();
}
if($('#enquiry-form')){
 const form=$('#enquiry-form'),result=$('#brief-result'),button=$('#brief-button'),status=$('#form-status');
 const original=button.innerHTML;let brief='';
 const service=new URLSearchParams(location.search).get('service');
 if([...form.elements.service.options].some(option=>option.value===service))form.elements.service.value=service;
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(button.disabled||!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form));data.consent=form.elements.consent.checked;
  button.disabled=true;button.textContent='Preparing your brief…';announce(status,'');
  $$('input,select,textarea',form).forEach(el=>el.disabled=true);
  try{const response=await post('/api/brief',data);brief=response.brief;$('#brief-summary').textContent=`Prepared for ${response.name} at ${response.company}. Save it as a starting point for a discovery conversation.`;
   const list=$('#brief-recommendations');list.replaceChildren(...response.recommendations.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));form.hidden=true;result.hidden=false;result.focus({preventScroll:true});reveal(result);
  }catch(error){announce(status,error.message,true);}finally{button.disabled=false;button.innerHTML=original;$$('input,select,textarea',form).forEach(el=>el.disabled=false);}
 });
 $('#download-brief').addEventListener('click',()=>{if(brief)download(brief,'izn-partnership-brief.txt','text/plain;charset=utf-8');});
 $('#edit-brief').addEventListener('click',()=>{result.hidden=true;form.hidden=false;brief='';form.elements.name.focus({preventScroll:true});reveal(form);});
}

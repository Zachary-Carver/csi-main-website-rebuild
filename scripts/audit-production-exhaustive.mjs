import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE=(process.argv[2]||'https://cleansceneinvestigators.com').replace(/\/$/,'');
const ROOT=path.resolve(import.meta.dirname,'..');
const OUT=path.join(ROOT,'production-exhaustive-audit.json');
const SKIP=new Set(['.git','_site','node_modules','output','outputs']);
const issues=[]; const pages=[]; const internal=new Set(); const externalButtons=new Set();
const add=(severity,route,type,detail)=>issues.push({severity,route,type,detail});

function files(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(SKIP.has(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())files(p,out);else if(e.name.endsWith('.html'))out.push(p)}return out}
function routeFor(file){const rel=path.relative(ROOT,file).replaceAll('\\','/');if(rel==='index.html')return '/';if(rel==='404.html')return '/__csi_missing_probe__';return '/'+rel.replace(/index\.html$/,'')}
const routes=[...new Set(files(ROOT).map(routeFor))].sort();

async function check(url){let current=url;const chain=[];for(let i=0;i<6;i++){try{const r=await fetch(current,{redirect:'manual',headers:{'user-agent':'CSI-Production-Audit/2.0'}});chain.push({url:current,status:r.status,location:r.headers.get('location')||''});if(r.status>=300&&r.status<400&&r.headers.get('location')){current=new URL(r.headers.get('location'),current).href;continue}return{ok:r.status<400,status:r.status,final:current,chain}}catch(e){return{ok:false,final:current,chain,error:String(e)}}}return{ok:false,final:current,chain,error:'too many redirects'}}

const browser=await chromium.launch({headless:true});
try{
 for(const route of routes){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});const page=await context.newPage();const resourceErrors=[];
  page.on('response',r=>{try{const u=new URL(r.url());if(u.hostname.endsWith('cleansceneinvestigators.com')&&r.status()>=400)resourceErrors.push({url:r.url(),status:r.status(),type:r.request().resourceType()})}catch{}});
  let nav;try{nav=await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(300)}catch(e){add('critical',route,'page-load',String(e));await context.close();continue}
  const d=await page.evaluate(()=>{
   const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&+s.opacity>0&&r.width>0&&r.height>0};
   const name=e=>{const direct=(e.getAttribute('aria-label')||e.getAttribute('title')||e.innerText||e.textContent||'').replace(/\s+/g,' ').trim();if(direct)return direct;const img=e.querySelector('img[alt]');if(img?.alt.trim())return img.alt.trim();const svgTitle=e.querySelector('svg title');return(svgTitle?.textContent||'').trim()};
   const links=[...document.querySelectorAll('a')].map(e=>{const href=e.getAttribute('href')||'';let fragmentOK=true;if(href.startsWith('#')&&href.length>1){let id=href.slice(1);try{id=decodeURIComponent(id)}catch{}fragmentOK=!!document.getElementById(id)}return{name:name(e),href,absolute:e.href||'',visible:visible(e),buttonLike:/button|btn|cta/i.test(String(e.className))||e.getAttribute('role')==='button',fragmentOK}});
   const buttons=[...document.querySelectorAll('button,[role="button"]')].map(e=>({name:name(e),visible:visible(e),type:(e.getAttribute('type')||'').toLowerCase(),inForm:!!e.closest('form'),expanded:e.getAttribute('aria-expanded'),controls:e.getAttribute('aria-controls')}));
   const forms=[...document.querySelectorAll('form')].map(e=>({id:e.id||'',action:e.getAttribute('action')||'',method:(e.getAttribute('method')||'get').toLowerCase(),visible:visible(e),submits:e.querySelectorAll('button[type="submit"],input[type="submit"]').length}));
   const ids=[...document.querySelectorAll('[id]')].map(e=>e.id).filter(Boolean);const dup=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];
   return{links,buttons,forms,dup,h1:document.querySelectorAll('h1').length,canonical:document.querySelector('link[rel="canonical"]')?.href||'',overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,final:location.href,title:document.title,summaries:[...document.querySelectorAll('summary')].filter(visible).length};
  });
  const status=nav?.status()||0, probe=route==='/__csi_missing_probe__';if(probe?status!==404:status>=400)add('critical',route,'http-status',String(status));
  if(!probe&&d.h1!==1)add('high',route,'h1-count',String(d.h1));if(!probe&&!d.canonical)add('high',route,'canonical','missing');if(d.dup.length)add('high',route,'duplicate-ids',d.dup.join(', '));if(d.overflow)add('high',route,'desktop-overflow','1440px');
  for(const a of d.links){if(!a.visible)continue;if(!a.name)add('high',route,'unnamed-link',a.href||'(empty)');const h=a.href.trim();if(!h||h==='#'||/^javascript:/i.test(h)){add('high',route,'dead-link',`${a.name} -> ${h||'(empty)'}`);continue}if(h.startsWith('#')){if(h.length>1&&!a.fragmentOK)add('high',route,'missing-fragment',`${a.name} -> ${h}`);continue}if(/^mailto:/i.test(h)){if(a.buttonLike&&!/email|e-mail|@/i.test(a.name))add('medium',route,'button-mailto',`${a.name} -> ${h}`);continue}if(/^tel:/i.test(h)){const digits=(h.match(/\d/g)||[]).join('');if(!['911','988'].includes(digits)&&digits.length<10)add('high',route,'invalid-tel',`${a.name} -> ${h}`);continue}if(/^sms:/i.test(h))continue;let u;try{u=new URL(a.absolute||h,BASE+'/')}catch{add('high',route,'invalid-url',`${a.name} -> ${h}`);continue}if(['cleansceneinvestigators.com','www.cleansceneinvestigators.com'].includes(u.hostname))internal.add(u.href);else if(a.buttonLike)externalButtons.add(u.href)}
  for(const b of d.buttons){if(!b.visible)continue;if(!b.name)add('high',route,'unnamed-button','visible button');if(b.type==='submit'&&!b.inForm)add('critical',route,'orphan-submit',b.name)}
  for(const f of d.forms){if(!f.visible)continue;if(!f.action)add('critical',route,'form-action',f.id||'form');if(f.action==='/api/contact'&&f.method!=='post')add('critical',route,'contact-method',f.id);if(!f.submits)add('high',route,'form-submit',f.id||'form')}
  if(route==='/'){const f=d.forms.find(x=>x.id==='csi-combined-email-form');if(!f||f.action!=='/api/contact'||f.method!=='post')add('critical',route,'homepage-form',JSON.stringify(f||null))}
  if(route==='/contact-us/'){const f=d.forms.find(x=>x.id==='csi-dedicated-inquiry-form');if(!f||f.action!=='/api/contact'||f.method!=='post')add('critical',route,'contact-form',JSON.stringify(f||null))}
  await page.setViewportSize({width:390,height:844});await page.reload({waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(180);if(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1))add('high',route,'mobile-overflow','390px');
  const toggles=page.locator('button[aria-controls][aria-expanded]');for(let i=0;i<await toggles.count();i++){const t=toggles.nth(i);if(!await t.isVisible())continue;const before=await t.getAttribute('aria-expanded');try{await t.click({timeout:4000});if(before===await t.getAttribute('aria-expanded'))add('high',route,'dead-toggle',await t.innerText())}catch(e){add('high',route,'toggle-failed',String(e))}}
  const realResourceErrors=resourceErrors.filter(x=>!(probe&&x.url.includes('__csi_missing_probe__')));for(const e of realResourceErrors)add('medium',route,'resource-http-error',`${e.status} ${e.type} ${e.url}`);
  pages.push({route,status,title:d.title,final:d.final,links:d.links.length,visibleLinks:d.links.filter(x=>x.visible).length,buttonLinks:d.links.filter(x=>x.visible&&x.buttonLike).length,buttons:d.buttons.filter(x=>x.visible).length,summaries:d.summaries,forms:d.forms.length});await context.close();
 }
 const internalChecks=[];for(const url of [...internal].sort()){const r=await check(url);internalChecks.push({url,...r});if(!r.ok)add('critical','GLOBAL','broken-internal',`${url} :: ${r.status||r.error}`);if(r.chain.filter(x=>x.status>=300&&x.status<400).length>1)add('medium','GLOBAL','multi-hop-redirect',JSON.stringify(r.chain))}
 const externalChecks=[];for(const url of [...externalButtons].sort()){const r=await check(url);externalChecks.push({url,...r});if(!r.ok&&![401,403,429].includes(r.status))add('medium','GLOBAL','external-button-target',`${url} :: ${r.status||r.error}`)}
 const counts={htmlFiles:files(ROOT).length,liveRoutesAudited:routes.length,anchorsInspected:pages.reduce((s,p)=>s+p.links,0),visibleAnchorsInspected:pages.reduce((s,p)=>s+p.visibleLinks,0),buttonLikeAnchorsInspected:pages.reduce((s,p)=>s+p.buttonLinks,0),visibleButtonsInspected:pages.reduce((s,p)=>s+p.buttons,0),disclosureControlsInspected:pages.reduce((s,p)=>s+p.summaries,0),formsInspected:pages.reduce((s,p)=>s+p.forms,0),uniqueInternalTargetsChecked:internalChecks.length,uniqueExternalButtonTargetsChecked:externalChecks.length,critical:issues.filter(x=>x.severity==='critical').length,high:issues.filter(x=>x.severity==='high').length,medium:issues.filter(x=>x.severity==='medium').length};
 fs.writeFileSync(OUT,JSON.stringify({generatedAt:new Date().toISOString(),base:BASE,counts,issues,pages,internalChecks,externalChecks},null,2));console.log('CSI CORRECTED EXHAUSTIVE AUDIT');console.log(JSON.stringify(counts,null,2));for(const x of issues)console.log(`[${x.severity.toUpperCase()}] ${x.route} :: ${x.type} :: ${x.detail}`);if(counts.critical||counts.high)process.exitCode=2;
}finally{await browser.close()}

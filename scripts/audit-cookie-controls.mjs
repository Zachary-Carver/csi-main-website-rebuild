import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE=(process.argv[2]||'https://cleansceneinvestigators.com').replace(/\/$/,'');
const ROOT=path.resolve(import.meta.dirname,'..');
const SKIP=new Set(['.git','_site','node_modules','output','outputs']);
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(SKIP.has(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(e.name.endsWith('.html'))out.push(p)}return out}
function routeFor(file){const rel=path.relative(ROOT,file).replaceAll('\\','/');if(rel==='index.html')return '/';if(rel==='404.html')return '/__csi_cookie_missing_probe__';return '/'+rel.replace(/index\.html$/,'')}
const routes=[...new Set(walk(ROOT).map(routeFor))].sort();
const problems=[];let acceptTested=0,declineTested=0;
const browser=await chromium.launch({headless:true});
try{
 for(const route of routes){
  for(const [aid,expected] of [['FOOTER_COOKIE_CLOSE_RENDERED','accepted'],['FOOTER_COOKIE_DECLINE_RENDERED','declined']]){
   const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();
   await page.addInitScript(()=>localStorage.removeItem('csi-cookie-consent'));
   try{await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(120)}catch(e){problems.push({route,control:expected,error:'load: '+String(e)});await context.close();continue}
   const button=page.locator(`[data-aid="${aid}"]`).first();
   if(!(await button.count())||!(await button.isVisible())){problems.push({route,control:expected,error:'button missing or not visible'});await context.close();continue}
   try{await button.click({timeout:4000});const state=await page.evaluate(()=>({choice:localStorage.getItem('csi-cookie-consent'),bannerVisible:(()=>{const b=document.querySelector('[data-aid="FOOTER_COOKIE_BANNER_RENDERED"]');if(!b)return null;const s=getComputedStyle(b),r=b.getBoundingClientRect();return !b.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0})()}));if(state.choice!==expected||state.bannerVisible!==false)problems.push({route,control:expected,error:`choice=${state.choice}; bannerVisible=${state.bannerVisible}`});else if(expected==='accepted')acceptTested++;else declineTested++}catch(e){problems.push({route,control:expected,error:'click: '+String(e)})}
   await context.close();
  }
 }
 console.log('CSI COOKIE BUTTON AUDIT');console.log(JSON.stringify({routes:routes.length,acceptButtonsTested:acceptTested,declineButtonsTested:declineTested,problems:problems.length},null,2));for(const p of problems)console.log(`[FAIL] ${p.route} :: ${p.control} :: ${p.error}`);if(problems.length)process.exitCode=2;
}finally{await browser.close()}

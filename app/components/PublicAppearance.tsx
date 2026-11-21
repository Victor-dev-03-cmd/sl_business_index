'use client';
import {useEffect,useLayoutEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import BrandIcon from './BrandIcon';
import './header-appearance.css';

type Appearance='light'|'dark'|'system';
const key='slbi-appearance-v1', changeEvent='slbi-appearance-change', query='(prefers-color-scheme: dark)';
let preference:Appearance|undefined;
let media:MediaQueryList|undefined;
let switchFrame=0;
let releaseFrame=0;
let releaseTimer=0;
function getMedia(){return media??=window.matchMedia(query)}
function parseMode(value:string|null):Appearance{
  return value==='dark'||value==='system'?value:'light';
}
function releaseSwitch(){
  window.cancelAnimationFrame(switchFrame);
  window.cancelAnimationFrame(releaseFrame);
  window.clearTimeout(releaseTimer);
  document.documentElement.removeAttribute('data-slbi-theme-switching');
}
function suppressSwitchTransitions(){
  const root=document.documentElement;
  window.cancelAnimationFrame(switchFrame);
  window.cancelAnimationFrame(releaseFrame);
  window.clearTimeout(releaseTimer);
  root.setAttribute('data-slbi-theme-switching','');
  // No forced layout or computed-style read; let the browser paint once
  // with the new colors before normal interaction transitions resume.
  switchFrame=window.requestAnimationFrame(()=>{
    releaseFrame=window.requestAnimationFrame(releaseSwitch);
  });
  releaseTimer=window.setTimeout(releaseSwitch,160);
}
function readMode():Appearance {
  if(preference!==undefined)return preference;
  try{preference=parseMode(localStorage.getItem(key))}catch{preference='light'}
  return preference;
}
function applyMode(mode:Appearance,path:string){
  const section=path.split('/')[1];
  const dark=section!=='admin'&&section!=='vendor'&&(mode==='dark'||(mode==='system'&&getMedia().matches));
  const root=document.documentElement;
  const next=dark?'dark':'light';
  if(root.dataset.slbiAppearance!==mode)root.dataset.slbiAppearance=mode;
  if(root.dataset.slbiTheme===next)return false;
  suppressSwitchTransitions();
  root.dataset.slbiTheme=next;
  const meta=document.querySelector('meta[data-slbi-theme-color]');
  const color=dark?'#101010':'#FCFAF6';
  if(meta?.getAttribute('content')!==color)meta?.setAttribute('content',color);
  return true;
}
function saveMode(next:Appearance){
  preference=next;
  applyMode(next,window.location.pathname);
  window.dispatchEvent(new Event(changeEvent));
  try{localStorage.setItem(key,next)}catch{}
}
function resolvedDark():boolean {
  const mode=readMode();
  return mode==='dark'||(mode==='system'&&getMedia().matches);
}
export function HeaderThemeToggle(){
  const [dark,setDark]=useState(false);
  useLayoutEffect(()=>{
    const sync=()=>setDark(resolvedDark());
    sync();
    window.addEventListener(changeEvent,sync);
    return()=>window.removeEventListener(changeEvent,sync);
  },[]);
  const label=dark?'Switch to light mode':'Switch to dark mode';
  return <button type="button" className="slbi-header-theme-toggle" aria-label={label} title={label}
    onClick={()=>saveMode(resolvedDark()?'light':'dark')}>
    <span className="slbi-theme-moon"><BrandIcon name="moon" size={20}/></span>
    <span className="slbi-theme-sun"><BrandIcon name="sun-1" size={20}/></span>
  </button>;
}
export function AppearanceController(){
  const path=usePathname()||'/';
  useLayoutEffect(()=>{
    const update=()=>{if(applyMode(readMode(),path))window.dispatchEvent(new Event(changeEvent))};
    const onStorage=(event:StorageEvent)=>{
      if(event.key!==key&&event.key!==null)return;
      preference=parseMode(event.newValue);
      applyMode(preference,path);
      window.dispatchEvent(new Event(changeEvent));
    };
    update();
    const system=getMedia();
    if(system.addEventListener)system.addEventListener('change',update);else system.addListener(update);
    window.addEventListener('storage',onStorage);
    return()=>{
      if(system.removeEventListener)system.removeEventListener('change',update);else system.removeListener(update);
      window.removeEventListener('storage',onStorage);
    };
  },[path]);
  return null;
}
export function AppearanceControl(){
  const [mode,setMode]=useState<Appearance>('light');
  useEffect(()=>{
    const sync=()=>setMode(readMode());sync();
    window.addEventListener(changeEvent,sync);
    return()=>window.removeEventListener(changeEvent,sync);
  },[]);
  function change(next:Appearance){
    saveMode(next);
  }
  return <label className="slbi-appearance-control">
    <span><BrandIcon name={mode==='dark'?'moon':mode==='system'?'monitor':'sun-1'} size={17}/> Appearance</span>
    <select aria-label="Appearance" value={mode} onChange={e=>change(e.target.value as Appearance)}>
      <option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option>
    </select>
  </label>;
}

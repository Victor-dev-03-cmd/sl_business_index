'use client';
import {useEffect,useLayoutEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import BrandIcon from './BrandIcon';
import './header-appearance.css';

type Appearance='light'|'dark'|'system';
const key='slbi-appearance-v1', changeEvent='slbi-appearance-change', query='(prefers-color-scheme: dark)';
let fallback:Appearance='light';
function readMode():Appearance {
  try {const v=localStorage.getItem(key);return v==='dark'||v==='system'?v:'light'} catch{return fallback}
}
function applyMode(mode:Appearance,path:string){
  const section=path.split('/')[1];
  const dark=section!=='admin'&&section!=='vendor'&&(mode==='dark'||(mode==='system'&&window.matchMedia(query).matches));
  document.documentElement.dataset.slbiAppearance=mode;
  document.documentElement.dataset.slbiTheme=dark?'dark':'light';
  document.querySelector('meta[data-slbi-theme-color]')?.setAttribute('content',dark?'#101010':'#FCFAF6');
}
function saveMode(next:Appearance){
  fallback=next;
  try{localStorage.setItem(key,next)}catch{}
  applyMode(next,window.location.pathname);
  window.dispatchEvent(new Event(changeEvent));
}
function resolvedDark():boolean {
  const mode=readMode();
  return mode==='dark'||(mode==='system'&&window.matchMedia(query).matches);
}
export function HeaderThemeToggle(){
  const [dark,setDark]=useState(false);
  useLayoutEffect(()=>{
    const sync=()=>setDark(resolvedDark());
    const media=window.matchMedia(query);
    sync();
    if(media.addEventListener)media.addEventListener('change',sync);else media.addListener(sync);
    window.addEventListener('storage',sync);
    window.addEventListener(changeEvent,sync);
    return()=>{
      if(media.removeEventListener)media.removeEventListener('change',sync);else media.removeListener(sync);
      window.removeEventListener('storage',sync);
      window.removeEventListener(changeEvent,sync);
    };
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
    const update=()=>applyMode(readMode(),path);
    update();
    const media=window.matchMedia(query);
    if(media.addEventListener)media.addEventListener('change',update);else media.addListener(update);
    window.addEventListener('storage',update);
    window.addEventListener(changeEvent,update);
    return()=>{
      if(media.removeEventListener)media.removeEventListener('change',update);else media.removeListener(update);
      window.removeEventListener('storage',update);
      window.removeEventListener(changeEvent,update);
    };
  },[path]);
  return null;
}
export function AppearanceControl(){
  const [mode,setMode]=useState<Appearance>('light');
  useEffect(()=>{
    const sync=()=>setMode(readMode());sync();
    window.addEventListener('storage',sync);window.addEventListener(changeEvent,sync);
    return()=>{window.removeEventListener('storage',sync);window.removeEventListener(changeEvent,sync)};
  },[]);
  function change(next:Appearance){
    setMode(next);
    saveMode(next);
  }
  return <label className="slbi-appearance-control">
    <span><BrandIcon name={mode==='dark'?'moon':mode==='system'?'monitor':'sun-1'} size={17}/> Appearance</span>
    <select aria-label="Appearance" value={mode} onChange={e=>change(e.target.value as Appearance)}>
      <option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option>
    </select>
  </label>;
}

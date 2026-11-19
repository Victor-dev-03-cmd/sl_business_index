'use client';

import {useCallback,useEffect,useState} from 'react';

/** Browser-only bookmarks: no database migration, login dependency or external share. */
export type SavedBusiness={
  id:string;slug:string;name:string;category:string;city:string;
};
const KEY='slbi-public-saved-businesses-v1';
const CHANGED='slbi:public-saved-changed';
const MAX=100;

const clean=(value:unknown,max=120)=>typeof value==='string'?value.trim().slice(0,max):'';
export function readSavedBusinesses():SavedBusiness[]{
  if(typeof window==='undefined')return [];
  try{
    const raw=window.localStorage.getItem(KEY);
    if(!raw||raw.length>45000)return [];
    const decoded:unknown=JSON.parse(raw);
    if(!Array.isArray(decoded))return [];
    const used=new Set<string>();
    return decoded.slice(0,MAX).flatMap((item):SavedBusiness[]=>{
      if(!item||typeof item!=='object')return [];
      const row=item as Record<string,unknown>;
      const id=clean(row.id,80),slug=clean(row.slug,140),name=clean(row.name,160);
      if(!/^[\da-f-]{36}$/i.test(id)||!name||used.has(id))return [];
      used.add(id);
      return [{id,slug:slug||id,name,category:clean(row.category,100),
        city:clean(row.city,100)}];
    });
  }catch{return [];}
}
export function saveBusinessLocally(item:SavedBusiness):boolean{
  if(typeof window==='undefined'||!/^[\da-f-]{36}$/i.test(item.id))return false;
  const current=readSavedBusinesses();
  const exists=current.some(x=>x.id===item.id);
  const next=exists?current.filter(x=>x.id!==item.id):[item,...current].slice(0,MAX);
  try{
    window.localStorage.setItem(KEY,JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGED));
    return !exists;
  }catch{return exists;}
}
export function useSavedBusinesses(){
  const [items,setItems]=useState<SavedBusiness[]>([]);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const refresh=()=>{setItems(readSavedBusinesses());setReady(true);};
    refresh();
    window.addEventListener('storage',refresh);
    window.addEventListener(CHANGED,refresh);
    return()=>{window.removeEventListener('storage',refresh);window.removeEventListener(CHANGED,refresh);};
  },[]);
  const toggle=useCallback((entry:SavedBusiness)=>saveBusinessLocally(entry),[]);
  return {items,ready,toggle};
}

import {Hono} from 'hono';

type Snapshot={rows:unknown[];fetchedAt:number};
type Loader=()=>Promise<Snapshot>;

// Dependency injection permits identical synthetic workloads on Node and Bun.
// No account data, provider keys or database writes enter this route.
export function createCategoryApi(load:Loader){
 const app=new Hono();
 app.get('/api/public/categories',async c=>{
  c.header('Cache-Control','no-store');
  try{return c.json(await load());}
  catch{return c.json({error:'Categories unavailable'},503);}
 });
 return app;
}

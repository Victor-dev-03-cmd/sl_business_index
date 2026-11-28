import {getPublicCategories} from '@/lib/discovery/public-cache';
import {createCategoryApi} from '@/lib/discovery/category-http';
export const dynamic='force-dynamic';
const api=createCategoryApi(getPublicCategories);
export const GET=(request:Request)=>api.fetch(request);

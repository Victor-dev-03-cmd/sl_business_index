export const publicCategoryKey=['public-categories-v1'] as const;
export type PublicCategory={id:string;name:string;icon:string|null;parent_id:string|null;image_url?:string|null};
export type PublicCategorySnapshot={rows:PublicCategory[];fetchedAt:number};
export async function fetchPublicCategories():Promise<PublicCategorySnapshot>{
 const response=await fetch('/api/public/categories',{cache:'no-store'});
 if(!response.ok)throw new Error('Categories unavailable');
 return response.json();
}
export const publicCategoryQuery={queryKey:publicCategoryKey,queryFn:fetchPublicCategories,staleTime:120000,refetchOnWindowFocus:true} as const;

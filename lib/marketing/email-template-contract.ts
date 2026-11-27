/** Email Studio layouts. Custom HTML is NEVER passed to Gmail or a public page. */
export type EmailTemplateLayout='minimal'|'hero'|'offers'|'custom';
export const EMAIL_TEMPLATE_LAYOUTS=[
  {id:'minimal',label:'Minimal Update',description:'Clean, text-first business message'},
  {id:'hero',label:'Hero Poster Spotlight',description:'Large visual with supporting offer'},
  {id:'offers',label:'2-Column Offer Grid',description:'Two services or offers side-by-side'},
  {id:'custom',label:'Custom HTML / Brand Template',description:'Owner-edited, isolated HTML preview'},
] as const;

export function safeCustomPreviewDocument(source:string):string{
  // No scripts, forms, embeds, network requests, cookies, access to SLBI origin,
  // same-origin permission or navigation. The iframe also has sandbox="".
  const max=source.slice(0,12000);
  return '<!doctype html><html><head><meta charset="utf-8">'+
    '<meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; '+
    'script-src &apos;none&apos;; connect-src &apos;none&apos;; form-action &apos;none&apos;; '+
    'frame-src &apos;none&apos;; object-src &apos;none&apos;; base-uri &apos;none&apos;; '+
    'img-src data:; style-src &apos;unsafe-inline&apos;">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<style>html,body{margin:0;padding:12px;font-family:Arial,sans-serif;color:#242126;background:white;overflow-wrap:anywhere}</style>'+
    '</head><body>'+max+'</body></html>';
}
export function isTemplateLayout(v:unknown):v is EmailTemplateLayout{
  return typeof v==='string'&&EMAIL_TEMPLATE_LAYOUTS.some(x=>x.id===v);
}
export function defaultOfferCards(name:string):[string,string]{
  return ['Explore '+name,'Contact us for more details'];
}

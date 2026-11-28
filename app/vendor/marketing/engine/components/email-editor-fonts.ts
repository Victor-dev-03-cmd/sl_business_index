// Fixed, allowlisted font stylesheets. No campaign content is sent to the font service.
// Load only when an editor draft actually uses the font; never on the public site.
export const EMAIL_FONT_STYLESHEETS={
  poppins:'https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap',
  outfit:'https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap',
} as const;
export type RemoteEditorFont=keyof typeof EMAIL_FONT_STYLESHEETS;
export function loadEditorFont(font:RemoteEditorFont){
  const id='slbi-email-font-'+font;
  if(document.getElementById(id))return;
  const link=document.createElement('link');
  link.id=id;
  link.rel='stylesheet';
  link.href=EMAIL_FONT_STYLESHEETS[font];
  link.referrerPolicy='no-referrer';
  link.addEventListener('error',()=>link.remove(),{once:true});
  document.head.appendChild(link);
}

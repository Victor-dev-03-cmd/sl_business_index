import {randomBytes} from 'node:crypto';
import type {LocalEmailCampaign} from './email-hub-contract.ts';
import {isSafeEmailCta,emailTypographyCss,emailBlockTypography,validEmailCanvasWidth} from './email-hub-contract.ts';
export type EmailRenderIdentity={name:string;logoUrl?:string|null;address?:string|null;city?:string|null;accentColor?:string|null};
export type EmailRenderOptions={mode:'self_test'|'marketing';unsubscribeUrl?:string;posterPublicUrl?:string};
export type EmailRenderResult={html:string;text:string;warnings:string[]};
const email=/^[a-z0-9][a-z0-9._%+\-]{0,63}@[a-z0-9](?:[a-z0-9.-]{0,180}[a-z0-9])?\.[a-z]{2,30}$/i;
export const isSafeSenderAddress=(v:string)=>v.length<=220&&email.test(v)&&!/\s/.test(v);
export const escapeEmailText=(v:unknown)=>String(v??'')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;')
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'');
const txt=(v:string)=>v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,3200);
const lines=(v:string)=>escapeEmailText(txt(v)).replace(/\n/g,'<br>');
const color=(v?:string|null)=>v&&/^#[0-9a-f]{6}$/i.test(v)?v:'#F97316';
export function renderEmailMarkup(
  campaign:LocalEmailCampaign,brand:EmailRenderIdentity,options:EmailRenderOptions,
):EmailRenderResult{
  if(!isSafeEmailCta(campaign.ctaUrl))throw Error('CTA must be an HTTPS URL');
  if(options.mode==='marketing'&&(!options.unsubscribeUrl||!isSafeEmailCta(options.unsubscribeUrl)))
    throw Error('Marketing email requires a working HTTPS unsubscribe link');
  const accent=color(campaign.buttonColor||brand.accentColor);
  const canvasWidth=validEmailCanvasWidth(campaign.canvasWidth)?campaign.canvasWidth:600;
  const logoSize=typeof campaign.logoSize==='number'&&Number.isFinite(campaign.logoSize)&&campaign.logoSize>=40&&campaign.logoSize<=100?Math.round(campaign.logoSize):56;
  const name=txt(brand.name).slice(0,120)||'Your business';
  const address=[brand.address,brand.city].filter(Boolean).join(', ').slice(0,320);
  const logo=brand.logoUrl&&isSafeEmailCta(brand.logoUrl)?brand.logoUrl:null;
  const logoHtml=logo?'<img src="'+escapeEmailText(logo)+'" alt="'+escapeEmailText(name)+' logo" width="'+logoSize+'" height="'+logoSize+'" style="display:block;width:'+logoSize+'px;height:'+logoSize+'px;border-radius:50%;border:2px solid #FED7AA">':
    '<span style="display:block;width:'+logoSize+'px;height:'+logoSize+'px;line-height:'+logoSize+'px;text-align:center;border-radius:50%;background:#FFF7ED;color:#C2410C;font-size:20px;font-weight:bold">'+escapeEmailText(name[0])+'</span>';
  const out:string[]=[];const text:string[]=[];const warnings:string[]=[];
  for(const block of campaign.blocks.slice(0,20)){
    const value=txt(block.text);
    const typography=emailTypographyCss(block);
    const align=emailBlockTypography(block).align;
    if(block.type==='headline'){
      out.push('<tr><td style="padding:14px 28px 6px;'+typography+'">'+lines(value)+'</td></tr>');
      text.push(value);
    }else if(block.type==='body'){
      out.push('<tr><td style="padding:13px 28px;'+typography+'">'+lines(value)+'</td></tr>');
      text.push(value);
    }else if(block.type==='offers'){
      const second=txt(block.secondText||'');
      out.push('<tr><td style="padding:12px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="4"><tr>'+
        '<td width="50%" valign="top" style="padding:12px;background:#FFF7ED;border:1px solid #FED7AA;'+typography+'">'+lines(value)+'</td>'+
        '<td width="50%" valign="top" style="padding:12px;background:#FFF7ED;border:1px solid #FED7AA;'+typography+'">'+lines(second)+'</td>'+
        '</tr></table></td></tr>');
      text.push(value,second);
    }else if(block.type==='button'){
      out.push('<tr><td align="'+(align==='justify'?'left':align)+'" style="padding:18px 28px"><a href="'+escapeEmailText(campaign.ctaUrl)+
        '" rel="noopener noreferrer" style="display:inline-block;padding:13px 25px;border-radius:8px;background:'+accent+
        ';'+typography+'">'+escapeEmailText(value||'View offer')+'</a></td></tr>');
      text.push((value||'View offer')+': '+campaign.ctaUrl);
    }else if(block.type==='divider'){
      out.push('<tr><td style="padding:10px 28px"><div style="border-top:1px solid #E5E7EB"></div></td></tr>');
    }else if(block.type==='poster'){
      if(options.posterPublicUrl&&isSafeEmailCta(options.posterPublicUrl)){
        out.push('<tr><td style="padding:8px 28px"><img src="'+escapeEmailText(options.posterPublicUrl)+
          '" alt="Approved campaign poster" width="540" style="display:block;width:100%;max-width:540px;height:auto"></td></tr>');
      }else{
        warnings.push('Private poster not included; public approved asset required for actual sending.');
        out.push('<tr><td style="padding:18px 28px;background:#FFF7ED;color:#9A3412;font-size:12px">Poster preview is private and is not included in this email test.</td></tr>');
      }
    }
  }
  const compliance=options.mode==='self_test'?
    '<p style="color:#9A3412;font-size:11px">TEST EMAIL TO YOUR OWN CONNECTED MAILBOX. No campaign was sent.</p>':
    '<p><a style="color:#C2410C" href="'+escapeEmailText(options.unsubscribeUrl)+'">Unsubscribe</a></p>';
  const html='<!doctype html><html lang="'+(campaign.language==='ta'?'ta':campaign.language==='si'?'si':'en')+
    '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'+
    '<body style="margin:0;padding:24px;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif">'+
    '<table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:'+canvasWidth+'px;margin:auto;border-collapse:collapse;background:#fff;border:1px solid #E5E7EB">'+
    '<tr><td style="padding:24px 28px;border-top:5px solid '+accent+
    ';border-bottom:1px solid #E5E7EB"><table role="presentation"><tr><td style="padding-right:15px">'+logoHtml+'</td>'+
    '<td><strong style="color:#111827;font-size:18px">'+escapeEmailText(name)+'</strong><br><span style="color:#6B7280;font-size:11px">'+
    escapeEmailText(brand.city||'Business update')+'</span></td></tr></table></td></tr>'+
    out.join('')+'<tr><td align="center" style="padding:24px 28px;background:#F9FAFB;border-top:1px solid #E5E7EB;color:#6B7280;font-size:11px;line-height:1.8">'+
    escapeEmailText(address||name)+compliance+'</td></tr></table></body></html>';
  const plain=[name,'',...text.filter(Boolean),'',address,
    options.mode==='self_test'?'TEST TO YOUR OWN CONNECTED MAILBOX.':'Unsubscribe: '+options.unsubscribeUrl]
    .join('\n').slice(0,12000);
  return {html,text:plain,warnings};
}
const fold64=(value:string)=>Buffer.from(value,'utf8').toString('base64').replace(/.{1,76}/g,'$&\r\n').trim();
export function makeGmailSelfTestRaw(sender:string,subject:string,html:string,plain:string):string{
  if(!isSafeSenderAddress(sender))throw Error('Invalid connected mailbox');
  const safeSubject=subject.replace(/[\r\n\u0000-\u001f\u007f]/g,' ').slice(0,130);
  if(!safeSubject.trim()||html.length>40000||plain.length>14000)throw Error('Invalid test content');
  const boundary='slbi_'+randomBytes(15).toString('hex');
  const parts=[
    'From: <'+sender+'>','To: <'+sender+'>',
    'Subject: =?UTF-8?B?'+Buffer.from('[SLBI TEST] '+safeSubject).toString('base64')+'?=',
    'MIME-Version: 1.0','Auto-Submitted: auto-generated','X-SLBI-Test-Only: true',
    'Content-Type: multipart/alternative; boundary="'+boundary+'"','',
    '--'+boundary,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',fold64(plain),
    '--'+boundary,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',fold64(html),
    '--'+boundary+'--',''
  ];
  return Buffer.from(parts.join('\r\n'),'utf8').toString('base64url');
}

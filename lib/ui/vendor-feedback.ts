'use client';
import {toast} from 'sonner';

/** The vendor portal has one compact, dismissible top-right toaster.
 * Pages should report actionable feedback here instead of wide banners. */
const opts={toasterId:'vendor-portal',duration:4300,closeButton:true} as const;

export const vendorFeedback={
  error:(message:string)=>toast.error(message,{...opts,duration:5500,id:'vendor-feedback-error'}),
  warning:(message:string)=>toast.warning(message,{...opts,duration:5200,id:'vendor-feedback-warning'}),
  success:(message:string)=>toast.success(message,{...opts,id:'vendor-feedback-success'}),
  info:(message:string)=>toast.info(message,{...opts,id:'vendor-feedback-info'}),
};

'use client'
import {Toaster} from 'sonner'
import {usePathname} from 'next/navigation'
import {CircleCheck, CircleX, AlertTriangle, Info, LoaderCircle} from 'lucide-react'

export default function SiteToaster(){
  const path=usePathname()||'/'
  const dashboard=/^\/(?:admin|vendor|auth|login|signup)(?:\/|$)/.test(path)
  return <Toaster theme="light" position="bottom-right" closeButton visibleToasts={3} duration={5000}
    gap={10} offset={24} mobileOffset={{bottom:dashboard?'calc(16px + env(safe-area-inset-bottom))':'calc(98px + env(safe-area-inset-bottom))',left:12,right:12}}
    icons={{success:<CircleCheck size={21}/>,error:<CircleX size={21}/>,warning:<AlertTriangle size={21}/>,info:<Info size={21}/>,loading:<LoaderCircle size={20} className="animate-spin"/>}}
    toastOptions={{classNames:{toast:'slbi-toast',title:'slbi-toast-title',description:'slbi-toast-description',closeButton:'slbi-toast-close'}}}/>
}

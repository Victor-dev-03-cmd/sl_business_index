import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { QrCode, ArrowLeft, Building2 } from "lucide-react";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function QRRedirectPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Check if the QR exists in our inventory
  const { data: qr, error } = await supabase
    .from("qr_inventory")
    .select("business_id, status")
    .eq("serial_id", id)
    .single();

  if (error || !qr) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-[6px] shadow-sm overflow-hidden text-center">
          <div className="p-6">
            <div className="mx-auto bg-red-50 p-3 rounded-full w-fit mb-4 text-red-500">
              <QrCode className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Invalid QR Code</h2>
            <p className="text-gray-500 mt-2">
              This QR code does not belong to our system or is no longer valid.
            </p>
          </div>
          <div className="p-6 pt-0">
            <Link 
              href="/" 
              className="w-full flex items-center justify-center bg-brand-dark text-white px-4 py-2 rounded-[6px] text-sm font-bold hover:bg-brand-dark/90 transition-all"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. If it's linked to a business, redirect there
  if (qr.status === "assigned" && qr.business_id) {
    redirect(`/business/${qr.business_id}`);
  }

  // 3. Otherwise, show a message that it's unassigned
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-[6px] shadow-xl overflow-hidden text-center">
        <div className="bg-brand-dark py-12 flex flex-col items-center space-y-4">
          <div className="relative w-20 h-20">
            <img src="/logo.png" alt="Logo" className="object-contain w-full h-full brightness-0 invert" />
          </div>
          <h1 className="text-white font-bold text-xl tracking-wider">SL BUSINESS INDEX</h1>
        </div>
        
        <div className="p-6 pt-10 pb-12 space-y-6">
          <div className="bg-blue-50 p-4 rounded-[6px] inline-flex items-center justify-center mb-2">
            <Building2 className="h-10 w-10 text-brand-dark" />
          </div>
          
          <div className="space-y-2 px-6">
            <h2 className="text-2xl font-bold text-gray-900">QR Not Assigned</h2>
            <p className="text-gray-500 leading-relaxed">
              This QR code is authentic but hasn&apos;t been linked to a business yet. Please contact the administrator.
            </p>
          </div>

          <div className="px-6 space-y-3 pt-4">
            <Link 
              href="/" 
              className="w-full flex items-center justify-center border border-gray-300 bg-white text-gray-700 px-4 py-3 rounded-[6px] text-sm font-bold hover:bg-gray-50 transition-all"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

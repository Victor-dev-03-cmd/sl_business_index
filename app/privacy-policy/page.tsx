import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Mail, MapPin, ShieldCheck } from "lucide-react";
import LegalPageShell, { LegalSection, legalBody, legalList, legalStrong, type LegalSectionRef } from "@/app/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy | SLBI 2.0 Trust Center | SL Business Index",
  description: "Read the SL Business Index privacy policy covering business listings, searches, analytics, cookies, data sharing, account controls and the SLBI 2.0 roadmap.",
  alternates: { canonical: "https://www.slbusinessindex.com/privacy-policy" },
  openGraph: {
    title: "Privacy Policy | SL Business Index",
    description: "How SL Business Index handles public business information, account data and visitor interactions.",
    url: "https://www.slbusinessindex.com/privacy-policy",
    type: "website",
  },
};

const sections: LegalSectionRef[] = [
  {id:"information-we-collect", label:"Information we collect"},
  {id:"how-we-use-information", label:"How information is used"},
  {id:"sharing-disclosure", label:"Sharing & disclosure"},
  {id:"cookies-tracking", label:"Cookies & tracking"},
  {id:"data-security", label:"Data security"},
  {id:"your-controls", label:"Your choices & requests"},
  {id:"policy-updates", label:"Changes to this policy"},
  {id:"privacy-contact", label:"Contact information"},
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell kind="privacy" eyebrow="Trust & privacy"
      title="Privacy Policy."
      summary="Understand what information SL Business Index uses to make business discovery possible, where public listings differ from private account data, and how to contact us about your information."
      effectiveDate="March 25, 2026" sections={sections}>
      <div className="rounded-[14px] border border-[#dbe9dc] bg-[#f2f8f0] p-5 sm:p-6">
        <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-[#397858]">
          <ShieldCheck size={17}/> Our approach
        </p>
        <p className={"mt-3 " + legalBody}>
          SL Business Index (SLBI) provides a Sri Lankan business directory and business-owner services.
          We aim to protect your information while making the business details you choose to publish accessible to people searching for local services.
          This is the platform privacy policy; the <Link className="font-bold text-[#28764d] underline" href="/about">Growth &amp; Security OS roadmap</Link> describes planned development, not additional data collection already activated.
        </p>
      </div>

      <LegalSection id="information-we-collect" number={1} heading="Information we collect">
        <p className={legalBody}>We collect information used to provide our directory and connected services. Depending on how you use SLBI, this may include:</p>
        <ul className={legalList}>
          <li><strong className={legalStrong}>Business owners:</strong> Your name, business name, address, contact numbers, email address and business location or GPS coordinates when you register or manage a business profile.</li>
          <li><strong className={legalStrong}>Visitors:</strong> Site interactions such as search queries, viewed listings, device details, IP address and browser type where collected for site operation and improvement.</li>
          <li><strong className={legalStrong}>QR code activity:</strong> The time of a scan and the relevant business profile accessed, where that feature is used.</li>
          <li><strong className={legalStrong}>Support enquiries:</strong> Information you choose to provide when contacting SLBI, including your name, email and message.</li>
        </ul>
      </LegalSection>

      <LegalSection id="how-we-use-information" number={2} heading="How we use information">
        <p className={legalBody}>We use the information described above to operate and improve SL Business Index, including:</p>
        <ul className={legalList}>
          <li>Maintaining and displaying public business listings, business descriptions, locations and contact information.</li>
          <li>Enabling local and Nearby Search features where you provide or select location information.</li>
          <li>Showing business owners activity signals such as listing views and contact-button clicks.</li>
          <li>Keeping accounts functional, handling support requests and improving platform performance and user experience.</li>
          <li>Communicating important service messages and, where appropriate, promotional updates.</li>
        </ul>
        <p className={legalBody}>A listing view, click or enquiry is an interaction signal, <strong className={legalStrong}>not evidence of a completed sale</strong>. The SLBI 2.0 roadmap calls for stronger consent-aware analytics and separation of operational security events from business-growth analytics. Those are design objectives; this policy does not claim that every proposed capability is already deployed.</p>
      </LegalSection>

      <LegalSection id="sharing-disclosure" number={3} heading="Data sharing & disclosure">
        <p className={legalBody}><strong className={legalStrong}>We do not sell your personal data.</strong> Some information must be available or processed so our services can work:</p>
        <ul className={legalList}>
          <li><strong className={legalStrong}>Public business profiles:</strong> Information you submit for a public listing, such as a business phone number or address, is intended to be visible to visitors.</li>
          <li><strong className={legalStrong}>Technology providers:</strong> We may use trusted infrastructure, authentication, database, mapping and communication providers to operate the platform.</li>
          <li><strong className={legalStrong}>Legal and safety requests:</strong> Information may be disclosed when required by applicable Sri Lankan law or to protect legitimate rights and safety.</li>
        </ul>
      </LegalSection>

      <LegalSection id="cookies-tracking" number={4} heading="Cookies & tracking">
        <p className={legalBody}>Cookies and related technologies may support account sessions, preferences, security and site analytics. You can control or disable cookies using your browser settings, but some login, security or personalization features may not function as intended.</p>
        <p className={legalBody}>For GrowthOS work, we intend to evaluate the purpose, permissions and retention of analytics separately from operational and security logs before activating new uses.</p>
      </LegalSection>

      <LegalSection id="data-security" number={5} heading="Data security">
        <p className={legalBody}>We use measures such as encrypted connections, access controls and secure database protocols to help protect information against unauthorized access, alteration or disclosure. No internet service can promise absolute security.</p>
        <p className={legalBody}>SLBI 2.0's longer-term security roadmap includes reviewed permissions, auditability and authorized domain-security checks. Features that require new data, credentials or third-party connections should be introduced with appropriate access and user authorization rather than assumed to be active now.</p>
      </LegalSection>

      <LegalSection id="your-controls" number={6} heading="Your choices & requests">
        <p className={legalBody}>You can:</p>
        <ul className={legalList}>
          <li>Access and edit supported business details from your Vendor Dashboard.</li>
          <li>Contact SLBI to request correction, access or deletion of personal information, subject to applicable law and necessary verification.</li>
          <li>Opt out of marketing communications where applicable.</li>
          <li>Ask for a copy of personal information held about you, where available and legally required.</li>
        </ul>
        <p className={legalBody}>Some operational, security or transaction records may need to be retained where necessary for legitimate purposes or legal obligations. Requests are reviewed according to the applicable rules; dashboard changes may not instantly erase every retained record.</p>
        <p className="text-[12px] leading-[1.8] text-[#89968a]">Sri Lankan data-protection legislation has staged commencement and may change over time. This page does not describe an unavailable statutory remedy as already enforceable; for the official current framework, see the <a className="inline-flex items-center gap-1 font-semibold text-[#377858] underline" href="https://www.dpa.gov.lk/guidelines" target="_blank" rel="noopener noreferrer">Sri Lanka Data Protection Authority <ExternalLink size={12}/></a>.</p>
      </LegalSection>

      <LegalSection id="policy-updates" number={7} heading="Changes to this policy">
        <p className={legalBody}>We may update this policy as our service develops or legal requirements change. Changes will be published on this page with the applicable effective date. Significant changes to how information is handled should be clearly communicated where required.</p>
        <p className={legalBody}>The design and navigation of this page have been refreshed for the introduction of <strong className={legalStrong}>SLBI 2.0</strong>. The original policy effective date remains March 25, 2026; a product roadmap announcement is not a statement that all future processing is already operational.</p>
      </LegalSection>

      <LegalSection id="privacy-contact" number={8} heading="Contact us about privacy">
        <p className={legalBody}>For questions or requests about the way SL Business Index handles information, use these SLBI channels:</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <a className="flex min-w-0 items-start gap-3 rounded-[13px] border border-[#e1eae0] bg-[#f9fbf7] p-4 text-[12px] font-semibold text-[#326445] hover:bg-[#f0f7ef]" href="mailto:slbusinessindex@gmail.com"><Mail size={18} className="shrink-0"/> <span className="break-all">slbusinessindex@gmail.com</span></a>
          <Link className="flex min-w-0 items-start gap-3 rounded-[13px] border border-[#e1eae0] bg-[#f9fbf7] p-4 text-[12px] font-semibold text-[#326445] hover:bg-[#f0f7ef]" href="/contact"><MapPin size={18} className="shrink-0"/> SLBI Contact Us · Sri Lanka</Link>
        </div>
      </LegalSection>
    </LegalPageShell>
  );
}

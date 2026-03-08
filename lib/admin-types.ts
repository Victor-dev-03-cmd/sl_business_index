import { Business } from "./types";

export interface Verification {
    id: string;
    business_id: string;
    br_document_url?: string;
    nic_passport_url?: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

export interface VerificationWithBusiness extends Verification {
    businesses: {
        name: string;
        logo_url?: string;
        owner_name: string;
        email: string;
        phone: string;
    };
}

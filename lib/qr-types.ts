export type QRStatus = 'unassigned' | 'assigned';

export interface QRInventory {
  id: string;
  serial_id: string;
  short_link: string;
  business_id: string | null;
  status: QRStatus;
  batch_name: string;
  created_at: string;
  updated_at: string;
  businesses?: {
    name: string;
  };
}

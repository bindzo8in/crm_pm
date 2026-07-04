import { LineItem } from "./line-items-table";

export interface PricingServiceSection {
  id: string;
  entityId: string;
  serviceId?: string | null;
  serviceName: string;
  packageId?: string | null;
  packageName?: string | null;
  description?: string | null;
  notes?: string | null;
  items: LineItem[];
}

export interface PricingData {
  id: string;
  title: string;
  status: string;
  currency: string;
  validUntil?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  roundOff?: number;
  grandTotal: number;
  customer?: {
    id: string;
    displayName: string;
    companyName?: string | null;
  };
  services: PricingServiceSection[];
}

export interface PricingApi {
  getPricing: (entityId: string) => Promise<{ success: boolean; data?: any; message?: string }>;
  reorderServices: (entityId: string, payload: { id: string; sortOrder: number }[]) => Promise<{ success: boolean }>;
  updateLineItem: (itemId: string, payload: any) => Promise<{ success: boolean; message?: string }>;
  deleteLineItem: (itemId: string) => Promise<{ success: boolean; message?: string }>;
  createCustomItem: (entityId: string, payload: any) => Promise<{ success: boolean; message?: string }>;
  importPackage: (payload: { entityId: string; packageId: string; serviceId?: string | null; customName?: string | null; }) => Promise<{ success: boolean; message?: string }>;
}

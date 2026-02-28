
export interface User {
    id: number;
    email: string;
    full_name: string;
    phone?: string | null;
    role: "ADMIN" | "MANAGER" | "OPERATOR" | "OWNER";
    is_active: boolean;
}

export interface Operator {
    id: number;
    full_name: string | null;
    phone: string | null;
    email: string;
    is_active: boolean;
    created_at: string | null;
}

export interface Manager {
    id: number;
    full_name: string | null;
    phone: string | null;
    email: string;
    is_active: boolean;
    created_at: string | null;
}

export type DeliveryStatus = "BOOKED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

export interface ShipmentFile {
    id: number;
    file_type: string;
    created_at: string;
}

export interface Shipment {
    id: string;
    lr_no: string;
    branch_name?: string;
    inv_no?: string;
    invoice_value?: number;
    boxes?: number;
    weight?: number;
    shipment_type?: string;
    consignor_name?: string;
    consignor_address?: string;
    consignor_gstin?: string;
    consignee_name?: string;
    consignee_address?: string;
    consignee_gstin?: string;
    source?: string;
    destination?: string;
    vehicle_no?: string;
    booking_date?: string;
    ship_date?: string;
    expected_delivery_date?: string;
    eta?: string;
    actual_delivery_date?: string;
    delivery_status: DeliveryStatus;
    remarks?: string;
    created_at: string;
    files?: ShipmentFile[];
    owner_id?: number | null;
}

export interface ScanJob {
    id: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    extracted_data?: string; // JSON string
    confidence_scores?: string; // JSON string
    created_at: string;
}

export interface ExtractedData {
    [key: string]: string | number;
}

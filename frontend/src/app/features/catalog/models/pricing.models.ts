export interface PriceQuote {
  presentation_id: string;
  presentation_type: 'UNIDAD' | 'CAJA';
  segmento: 'B2C' | 'B2B';
  base_amount: string | null;
  promotion_id: string | null;
  promotion_name: string | null;
  discount_amount: string;
  final_amount: string | null;
  configured: boolean;
  currency: 'USD';
}

export interface PriceQuoteResponse {
  items: PriceQuote[];
}

export interface PriceQuoteStatus {
  loading: boolean;
  error: string;
}

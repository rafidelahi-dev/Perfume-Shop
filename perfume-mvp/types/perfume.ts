export type SellerProfile = {
  display_name: string | null;
  avatar_url?: string | null;
  username: string | null;
};

export type PerfumeListing = {
  id: string;
  perfume_id?: string | null;
  brand: string | null;
  perfume_name: string | null; // <-- matches your table
  sub_brand?: string | null;
  price: number | null;        // price/min_price are numeric in DB
  min_price?: number | null;
  type?: string | null;        // intact/full/partial/decant
  bottle_type?: string | null;
  decant_ml?: number | null;
  bottle_size_ml?: number | null;
  partial_left_ml?: number | null;
  decant_options?: unknown;    // jsonb if you use it
  images?: string[] | null;    // text[]
  profiles?: SellerProfile | null;
};
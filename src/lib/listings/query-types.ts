export type ListingCategory = "cycle" | "calculator" | "books" | "electronics" | "other";
export type ListingCondition = "like_new" | "good" | "fair" | "poor";
export type ListingSort = "newest" | "ending" | "price";

export type MarketplaceFilters = {
  search: string;
  category: ListingCategory | "all";
  condition: ListingCondition | "all";
  minPrice: string;
  maxPrice: string;
  closingSoon: boolean;
  sort: ListingSort;
  page: number;
};

export type MarketplaceListing = {
  id: string;
  title: string;
  category: ListingCategory;
  description: string;
  condition: ListingCondition;
  seller_id: string;
  seller_name: string;
  starting_price_paise: string;
  min_increment_paise: string;
  current_price_paise: string;
  bid_count: number;
  ends_at: string;
  created_at: string;
  images: Array<{ storage_path: string; url: string }>;
  sample_image?: string;
  is_sample?: boolean;
};

export type MarketplaceResult = {
  listings: MarketplaceListing[];
  total: number;
  page: number;
  isSample: boolean;
  unavailable: boolean;
};
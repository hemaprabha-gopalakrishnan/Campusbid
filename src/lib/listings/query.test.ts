import { describe, expect, it } from "vitest";
import { filterSampleListings, parseMarketplaceFilters, sanitizeSearchTerm, shouldUseSampleFallback } from "./filters";

describe("marketplace filter parsing", () => {
  it("ignores invalid filter values and clamps page numbers", () => {
    expect(parseMarketplaceFilters({
      category: "unexpected",
      condition: "like_new",
      sort: "price",
      page: "999999",
      minPrice: "0",
      maxPrice: "650.00",
    })).toMatchObject({
      category: "all",
      condition: "like_new",
      sort: "price",
      page: 1000,
      minPrice: "",
      maxPrice: "650.00",
    });
  });

  it("removes PostgREST filter syntax from keyword searches", () => {
    expect(sanitizeSearchTerm("bike),seller_id.eq.anything%" )).toBe("bike seller id eq anything");
  });

  it("filters sample listings using category, price, condition, and closing window", () => {
    const filters = parseMarketplaceFilters({
      category: "books",
      minPrice: "2000",
      closingSoon: "24h",
    });
    const filtered = filterSampleListings(filters, new Date(Date.now()));

    expect(filtered).toHaveLength(0);
    expect(filterSampleListings(parseMarketplaceFilters({ category: "books" }))).toHaveLength(1);
  });

  it("sorts sample listings by ending time and current price", () => {
    const ending = filterSampleListings(parseMarketplaceFilters({ sort: "ending" }));
    const price = filterSampleListings(parseMarketplaceFilters({ sort: "price" }));

    expect(ending[0].id).toBe("sample-cycle");
    expect(price[0].id).toBe("sample-laptop-stand");
  });

  it("only uses sample fallback when the unfiltered marketplace is empty in development", () => {
    expect(shouldUseSampleFallback(true, 0)).toBe(true);
    expect(shouldUseSampleFallback(true, 3)).toBe(false);
    expect(shouldUseSampleFallback(false, 0)).toBe(false);
  });
});
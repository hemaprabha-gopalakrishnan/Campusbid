import { Search } from "lucide-react";
import type { MarketplaceFilters } from "@/lib/listings/query-types";

const selectClassName =
  "h-10 w-full rounded-md border border-[#dedbe3] bg-white px-3 text-sm text-[#393641] outline-none focus:border-[#655c89] focus:ring-2 focus:ring-[#655c89]/15";

type MarketplaceFiltersProps = {
  filters: MarketplaceFilters;
};

export function MarketplaceFiltersForm({ filters }: MarketplaceFiltersProps) {
  return (
    <form action="/" method="get" className="mt-5 grid gap-3 rounded-md border border-[#e6e3dd] bg-[#fbfaf7] p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(190px,1.5fr)_repeat(3,minmax(120px,0.8fr))_repeat(2,minmax(110px,0.7fr))_auto]">
      <label className="relative sm:col-span-2 lg:col-span-1">
        <span className="sr-only">Search listings</span>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#898591]" size={16} aria-hidden="true" />
        <input
          className={`${selectClassName} pl-9`}
          defaultValue={filters.search}
          maxLength={80}
          name="q"
          placeholder="Search items"
          type="search"
        />
      </label>

      <label>
        <span className="sr-only">Category</span>
        <select className={selectClassName} defaultValue={filters.category} name="category">
          <option value="all">All categories</option>
          <option value="cycle">Cycle</option>
          <option value="calculator">Calculator</option>
          <option value="books">Books</option>
          <option value="electronics">Electronics</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label>
        <span className="sr-only">Condition</span>
        <select className={selectClassName} defaultValue={filters.condition} name="condition">
          <option value="all">Any condition</option>
          <option value="like_new">Like new</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </select>
      </label>

      <label>
        <span className="sr-only">Minimum current bid in rupees</span>
        <input className={selectClassName} defaultValue={filters.minPrice} inputMode="decimal" min="0.01" name="minPrice" placeholder="Min ₹" step="0.01" type="number" />
      </label>

      <label>
        <span className="sr-only">Maximum current bid in rupees</span>
        <input className={selectClassName} defaultValue={filters.maxPrice} inputMode="decimal" min="0.01" name="maxPrice" placeholder="Max ₹" step="0.01" type="number" />
      </label>

      <label>
        <span className="sr-only">Sort listings</span>
        <select className={selectClassName} defaultValue={filters.sort} name="sort">
          <option value="newest">Newest</option>
          <option value="ending">Ending soon</option>
          <option value="price">Price: low to high</option>
        </select>
      </label>

      <div className="flex items-center justify-between gap-3 sm:col-span-2 lg:col-span-1 lg:flex-col lg:items-stretch">
        <label className="flex min-h-10 items-center gap-2 whitespace-nowrap text-xs font-medium text-[#625e69]">
          <input
            className="size-4 accent-[#514879]"
            defaultChecked={filters.closingSoon}
            name="closingSoon"
            type="checkbox"
            value="24h"
          />
          Closes in 24h
        </label>
        <button className="h-10 rounded-md bg-[#514879] px-4 text-sm font-semibold text-white transition hover:bg-[#40385f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514879]" type="submit">
          Apply
        </button>
      </div>
    </form>
  );
}
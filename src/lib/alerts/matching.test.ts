import { describe, expect, it } from "vitest";
import { isListingMatchingAlert } from "./matching";

describe("isListingMatchingAlert", () => {
  const alert = {
    id: "alert-1",
    user_id: "user-1",
    title: "scientific calculator",
    category: "calculator",
    max_price_paise: BigInt(40000), // ₹400
  };

  it("matches a listing meeting title, category, and price criteria", () => {
    const listing = {
      id: "list-1",
      title: "Casio fx-991EX scientific calculator",
      description: "Used for engineering exams, pristine condition",
      category: "calculator",
      starting_price_paise: BigInt(35000), // ₹350
    };

    expect(isListingMatchingAlert(listing, alert)).toBe(true);
  });

  it("does not match if starting price exceeds the user's max budget", () => {
    const listing = {
      id: "list-2",
      title: "Casio fx-991EX scientific calculator",
      description: "Prism scientific calculator",
      category: "calculator",
      starting_price_paise: BigInt(50000), // ₹500 > ₹400
    };

    expect(isListingMatchingAlert(listing, alert)).toBe(false);
  });

  it("does not match if category differs", () => {
    const listing = {
      id: "list-3",
      title: "Scientific calculator programming guide",
      description: "Textbook about scientific calculators",
      category: "books",
      starting_price_paise: BigInt(20000),
    };

    expect(isListingMatchingAlert(listing, alert)).toBe(false);
  });

  it("matches when alert category is not specified or other", () => {
    const genericAlert = {
      id: "alert-2",
      user_id: "user-2",
      title: "cycle",
      category: null,
      max_price_paise: BigInt(200000), // ₹2000
    };

    const cycleListing = {
      id: "list-4",
      title: "Hero mountain cycle with gear",
      description: "Selling as semester ended",
      category: "cycle",
      starting_price_paise: BigInt(180000), // ₹1800
    };

    expect(isListingMatchingAlert(cycleListing, genericAlert)).toBe(true);
  });
});

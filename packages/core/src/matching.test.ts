import { describe, it, expect } from "vitest";
import {
  titleMatches,
  titleExcluded,
  locationMatches,
  experienceOk,
  isIndiaLocation,
} from "./matching";

describe("titleMatches", () => {
  it("matches a keyword case-insensitively", () => {
    expect(titleMatches("Senior Node.js Developer", ["node"])).toBe(true);
  });
  it("returns false when no keyword is present", () => {
    expect(titleMatches("Data Scientist", ["node", "react"])).toBe(false);
  });
});

describe("titleExcluded", () => {
  it("flags seniority noise", () => {
    expect(titleExcluded("Staff Software Engineer", ["staff"])).toBe(true);
  });
  it("leaves an in-band title alone", () => {
    expect(titleExcluded("Software Engineer", ["staff", "principal"])).toBe(
      false,
    );
  });
});

describe("locationMatches", () => {
  it("accepts an India city", () => {
    expect(locationMatches("Bengaluru, India", ["India", "Bengaluru"])).toBe(
      true,
    );
  });
  it("rejects an explicitly-excluded region", () => {
    expect(locationMatches("Toronto, Canada", ["India"])).toBe(false);
  });
  it("accepts a country-less remote role", () => {
    expect(locationMatches("Remote", ["India"])).toBe(true);
  });
  it("does not let generic remote rescue an excluded region", () => {
    expect(locationMatches("Remote - Canada", ["India"])).toBe(false);
  });
  it("accepts US via the short-code regex", () => {
    expect(locationMatches("Remote (US)", ["India"])).toBe(true);
  });
});

describe("experienceOk", () => {
  it("passes when no experience is stated", () => {
    expect(experienceOk("Software Engineer", 4)).toBe(true);
  });
  it("rejects a minimum above the cap", () => {
    expect(experienceOk("Backend Engineer, 6+ years", 4)).toBe(false);
  });
  it("accepts a minimum within the cap", () => {
    expect(experienceOk("Engineer with 3+ years experience", 4)).toBe(true);
  });
});

describe("isIndiaLocation", () => {
  it("is true for an India city", () => {
    expect(isIndiaLocation("Pune, India")).toBe(true);
  });
  it("is true for a country-less remote role", () => {
    expect(isIndiaLocation("Remote")).toBe(true);
  });
  it("is false for a US city", () => {
    expect(isIndiaLocation("San Francisco, CA")).toBe(false);
  });
});

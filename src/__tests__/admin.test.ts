import { describe, expect, it } from "bun:test";
import { isAdmin, parseAdminEmails } from "@/lib/admin";

describe("parseAdminEmails", () => {
  it("returns an empty list for undefined or empty input", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
  });

  it("splits a comma-separated list and trims whitespace", () => {
    expect(parseAdminEmails("a@x.com, b@x.com ,c@x.com")).toEqual([
      "a@x.com",
      "b@x.com",
      "c@x.com",
    ]);
  });

  it("lowercases addresses for case-insensitive matching", () => {
    expect(parseAdminEmails("Admin@Example.com")).toEqual(["admin@example.com"]);
  });

  it("drops empty entries from trailing or duplicate commas", () => {
    expect(parseAdminEmails("a@x.com,,b@x.com,")).toEqual(["a@x.com", "b@x.com"]);
  });
});

describe("isAdmin", () => {
  const admins = ["admin@example.com", "boss@example.com"];

  it("returns true when the email matches an admin (case-insensitive)", () => {
    expect(isAdmin("admin@example.com", admins)).toBe(true);
    expect(isAdmin("ADMIN@EXAMPLE.COM", admins)).toBe(true);
  });

  it("returns false for non-admin emails", () => {
    expect(isAdmin("user@example.com", admins)).toBe(false);
  });

  it("returns false when email is missing", () => {
    expect(isAdmin(undefined, admins)).toBe(false);
  });

  it("returns false when admin list is empty", () => {
    expect(isAdmin("admin@example.com", [])).toBe(false);
  });
});

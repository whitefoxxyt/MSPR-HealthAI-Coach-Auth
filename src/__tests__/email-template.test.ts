import { describe, expect, it } from "bun:test";
import { getVerificationEmailTemplate } from "@/lib/email/template";

describe("getVerificationEmailTemplate", () => {
  const url = "https://example.com/verify?token=abc123";
  const name = "Arthur";

  it("returns an HTML string", () => {
    const html = getVerificationEmailTemplate(url, name);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  it("includes the user name in the greeting", () => {
    const html = getVerificationEmailTemplate(url, name);
    expect(html).toContain(`Bonjour ${name}`);
  });

  it("includes the verification URL in the button and fallback link", () => {
    const html = getVerificationEmailTemplate(url, name);
    // Button href
    expect(html).toContain(`href="${url}"`);
    // Fallback link text
    expect(html).toContain(`>${url}</a>`);
  });

  it("contains the brand name HealthAI Coach", () => {
    const html = getVerificationEmailTemplate(url, name);
    expect(html).toContain("HealthAI");
    expect(html).toContain("Coach");
  });

  it("escapes special characters in name within the template", () => {
    const html = getVerificationEmailTemplate(url, "Jean-Pierre");
    expect(html).toContain("Bonjour Jean-Pierre");
  });

  it("includes key features list", () => {
    const html = getVerificationEmailTemplate(url, name);
    expect(html).toContain("Suivi nutritionnel");
    expect(html).toContain("Catalogue d'exercices");
    expect(html).toContain("Tableau de bord");
    expect(html).toContain("indicateurs biométriques");
  });

  it("mentions the 24-hour expiry", () => {
    const html = getVerificationEmailTemplate(url, name);
    expect(html).toContain("24 heures");
  });

  it("includes the current year in the footer", () => {
    const html = getVerificationEmailTemplate(url, name);
    const currentYear = new Date().getFullYear().toString();
    expect(html).toContain(`© ${currentYear}`);
  });
});

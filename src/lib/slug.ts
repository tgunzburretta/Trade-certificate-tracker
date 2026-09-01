import { customAlphabet } from "nanoid";

const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"; // no ambiguous chars
const randomSuffix = customAlphabet(alphabet, 6);

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function makeShareSlug(companyName: string): string {
  const base = slugify(companyName) || "company";
  return `${base}-${randomSuffix()}`;
}

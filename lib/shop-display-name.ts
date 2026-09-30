import { commerceCategoryGroups } from "@/lib/commerce-categories";

const genericTrailingDescriptors = new Set(["boutique"]);
const trailingQualifiers = new Set(["official", "us", "usa"]);
const shopNameOverrides: Record<string, string> = {
  "chips rips sports cards": "Chips Rips"
};

export function displayShopName(name: string | null, category?: string) {
  if (!name) return "Unknown Shop";
  const override = shopNameOverrides[name.trim().toLowerCase()];
  if (override) return override;

  const tokens = name.trim().split(/\s+/).filter(Boolean);
  const descriptors = descriptorsFor(category);
  let removedDescriptor = false;

  while (tokens.length > 1) {
    const last = normalizeToken(tokens[tokens.length - 1]);
    const previous = normalizeToken(tokens[tokens.length - 2]);

    if (descriptors.has(last) || genericTrailingDescriptors.has(last)) {
      tokens.pop();
      removedDescriptor = true;
      continue;
    }

    if (trailingQualifiers.has(last) && (descriptors.has(previous) || genericTrailingDescriptors.has(previous))) {
      tokens.pop();
      continue;
    }

    if (removedDescriptor && (last === "and" || last === "")) {
      tokens.pop();
      continue;
    }

    break;
  }

  return tokens.join(" ");
}

function descriptorsFor(category?: string) {
  const descriptors = new Set<string>();
  const group = commerceCategoryGroups.find((item) => item.name === category);
  if (!group) return descriptors;

  words(group.name).forEach((word) => descriptors.add(word));
  group.children.forEach((child) => words(child).forEach((word) => descriptors.add(word)));
  return descriptors;
}

function words(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word && word !== "and")
    .map(normalizeToken);
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

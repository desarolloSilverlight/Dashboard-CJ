import type { CategoryL1, CategoryL2 } from "./types";

export type CategorySubValue =
  | { kind: "all" }
  | { kind: "l2"; secondName: string }
  | { kind: "l3"; categoryId: string };

export function parentKeyFromName(name: string): string {
  return encodeURIComponent(name.trim());
}

export function parseSubValue(raw: string): CategorySubValue {
  if (!raw || raw === "all") return { kind: "all" };
  if (raw.startsWith("l2:")) return { kind: "l2", secondName: decodeURIComponent(raw.slice(3)) };
  if (raw.startsWith("l3:")) return { kind: "l3", categoryId: raw.slice(3) };
  return { kind: "all" };
}

export function formatSubValue(sub: CategorySubValue): string {
  if (sub.kind === "all") return "all";
  if (sub.kind === "l2") return `l2:${encodeURIComponent(sub.secondName)}`;
  return `l3:${sub.categoryId}`;
}

export function collectL3IdsFromL1(l1: CategoryL1): string[] {
  const ids: string[] = [];
  for (const l2 of l1.categoryFirstList ?? []) {
    for (const l3 of l2.categorySecondList ?? []) {
      if (l3.categoryId) ids.push(l3.categoryId);
    }
  }
  return ids;
}

export function collectL3IdsFromL2(l2: CategoryL2): string[] {
  return (l2.categorySecondList ?? [])
    .map((l3) => l3.categoryId)
    .filter(Boolean);
}

export function findL2(l1: CategoryL1, secondName: string): CategoryL2 | undefined {
  return (l1.categoryFirstList ?? []).find(
    (l2) => l2.categorySecondName === secondName,
  );
}

export function resolveCategoryQuery(
  l1: CategoryL1,
  sub: CategorySubValue,
): { categoryId?: string; lv3categoryList?: string[] } {
  if (sub.kind === "l3") {
    return { categoryId: sub.categoryId };
  }
  if (sub.kind === "l2") {
    const l2 = findL2(l1, sub.secondName);
    const ids = l2 ? collectL3IdsFromL2(l2) : [];
    return ids.length ? { lv3categoryList: ids } : {};
  }
  const ids = collectL3IdsFromL1(l1);
  return ids.length ? { lv3categoryList: ids } : {};
}

export type SubCategoryOption = {
  value: string;
  label: string;
  group?: string;
};

/** 2º select: toda la padre o una sección (nivel 2). */
export function buildSubCategoryOptions(l1: CategoryL1): SubCategoryOption[] {
  const options: SubCategoryOption[] = [
    { value: "all", label: "Toda la categoría padre" },
  ];
  for (const l2 of l1.categoryFirstList ?? []) {
    options.push({
      value: formatSubValue({ kind: "l2", secondName: l2.categorySecondName }),
      label: l2.categorySecondName,
    });
  }
  return options;
}

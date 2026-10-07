"use client";

import type { CategoryL1 } from "@/core/products/types";
import {
  buildSubCategoryOptions,
  parentKeyFromName,
} from "@/core/products/category-tree";

type Props = {
  categories: CategoryL1[];
  parentKey: string;
  subKey: string;
  onParentChange: (parentKey: string) => void;
  onSubChange: (subKey: string) => void;
  disabled?: boolean;
};

export function CategoryHierarchySelect({
  categories,
  parentKey,
  subKey,
  onParentChange,
  onSubChange,
  disabled,
}: Props) {
  const selectedL1 = categories.find(
    (c) => parentKeyFromName(c.categoryFirstName) === parentKey,
  );
  const subOptions = selectedL1 ? buildSubCategoryOptions(selectedL1) : [];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-[11px] text-slate-500">
          Categoría padre
        </span>
        <select
          value={parentKey}
          disabled={disabled}
          onChange={(e) => onParentChange(e.target.value)}
          className="select-field"
        >
          <option value="">Selecciona…</option>
          {categories.map((l1) => {
            const key = parentKeyFromName(l1.categoryFirstName);
            return (
              <option key={key} value={key}>
                {l1.categoryFirstName}
              </option>
            );
          })}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] text-slate-500">
          Subcategoría (opcional)
        </span>
        <select
          value={subKey || "all"}
          disabled={disabled || !parentKey}
          onChange={(e) => onSubChange(e.target.value)}
          className="select-field"
        >
          {subOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {parentKey && (
          <p className="mt-1 text-[10px] text-slate-600">
            Deja &quot;Toda la categoría padre&quot; para buscar en todas sus
            subcategorías.
          </p>
        )}
      </label>
    </div>
  );
}

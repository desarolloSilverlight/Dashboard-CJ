import Link from "next/link";
import { Input } from "@/components/ui/input";
import { TrmNote } from "@/features/fx/cop-amount";

type Props = {
  benefitPercent: number;
  onBenefit: (value: number) => void;
};

function readNumber(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function CatalogParameters({ benefitPercent, onBenefit }: Props) {
  return (
    <section className="mb-4 rounded-xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[var(--color-cj-text)]">Parámetros de precio</h2>
        <p className="mt-1 text-xs text-[var(--color-cj-muted)]">
          El envío es la cotización más barata a Bogotá. El beneficio es el mismo de{" "}
          <Link href="/sincronizar" className="font-semibold text-[var(--color-cj-navy)] hover:underline">
            Sincronizar
          </Link>{" "}
          y solo vive en este navegador.
        </p>
      </div>
      <label className="block max-w-xs text-[11px] text-[var(--color-cj-faint)]">
        Beneficio sobre el precio con envío (%)
        <Input
          className="mt-1"
          type="number"
          min={0}
          step="1"
          value={benefitPercent}
          onChange={(e) => onBenefit(readNumber(e.target.value))}
        />
      </label>
      <p className="mt-3 text-xs text-[var(--color-cj-muted)]">
        Precio final = (precio del producto + envío a Bogotá) × (1 + beneficio). Con 100 % ese precio se duplica.
        Cada búsqueda pide el detalle y el flete de hasta 20 productos.
      </p>
      <TrmNote />
    </section>
  );
}

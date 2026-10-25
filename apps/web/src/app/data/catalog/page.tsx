import Link from "next/link";
import {
  getCatalogExplorer,
  getExplorerUniversities,
} from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  university?: string;
  page?: string;
}>;

function buildUrl(q: string, university: string, page: number) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (university) params.set("university", university);
  params.set("page", String(page));

  return `/data/catalog?${params.toString()}`;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const [catalog, universities] = await Promise.all([
    getCatalogExplorer({
      q: params.q,
      university: params.university,
      page: Number(params.page ?? 1),
    }),
    getExplorerUniversities(),
  ]);

  const { filters, data, total, page, pages, pageSize } = catalog;

  return (
    <main className="space-y-8 pb-16">
      <header className="space-y-4">
        <Link
          href="/data"
          className="text-sm text-zinc-500 hover:underline"
        >
          ← Volver al laboratorio de datos
        </Link>

        <h1 className="text-4xl font-bold tracking-tight">
          Explora tus posibilidades
        </h1>

        <p className="max-w-3xl text-zinc-600 dark:text-zinc-400">
          Busca titulaciones y descubre en qué universidades y centros
          se ofrecen. Los resultados proceden de PostgreSQL.
        </p>
      </header>

      <form
        action="/data/catalog"
        method="GET"
        className="grid gap-3 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800 md:grid-cols-[1fr_1fr_auto]"
      >
        <input
          name="q"
          type="search"
          maxLength={100}
          defaultValue={filters.q}
          placeholder="Buscar titulación, universidad o centro..."
          className="min-w-0 rounded-lg border border-zinc-300 bg-transparent px-4 py-3 dark:border-zinc-700"
        />

        <select
          name="university"
          defaultValue={filters.university}
          className="min-w-0 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        >
          <option value="">Todas las universidades</option>
          {universities.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-6 py-3 font-semibold text-white dark:bg-white dark:text-zinc-900"
        >
          Buscar
        </button>
      </form>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            <strong className="text-zinc-900 dark:text-white">
              {total.toLocaleString("es-ES")}
            </strong>{" "}
            ofertas encontradas
          </p>

          <span className="text-sm text-zinc-500">
            Página {page} de {pages}
          </span>
        </div>

        {data.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 p-8 dark:border-zinc-800">
            No se han encontrado resultados. Prueba otra búsqueda.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {item.academicLevel}
                  </span>

                  <h2 className="text-lg font-bold">
                    {item.degreeName}
                  </h2>

                  <p className="font-medium text-zinc-700 dark:text-zinc-300">
                    {item.universityName}
                  </p>
                </div>

                <div className="space-y-1 text-sm text-zinc-500">
                  {item.centerName && <p>Centro: {item.centerName}</p>}
                  {item.city && <p>Ciudad: {item.city}</p>}
                  {item.modality && <p>Modalidad: {item.modality}</p>}
                </div>

                {item.sourceUrl?.startsWith("https://") && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto text-sm font-semibold underline underline-offset-4"
                  >
                    Consultar fuente ↗
                  </a>
                )}
              </article>
            ))}
          </div>
        )}

        <nav className="flex items-center justify-between pt-4">
          {page > 1 ? (
            <Link
              href={buildUrl(filters.q, filters.university, page - 1)}
              className="rounded-lg border border-zinc-300 px-5 py-3 text-sm dark:border-zinc-700"
            >
              ← Anterior
            </Link>
          ) : (
            <span />
          )}

          <span className="text-sm text-zinc-500">
            {total === 0 ? 0 : (page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} de {total}
          </span>

          {page < pages ? (
            <Link
              href={buildUrl(filters.q, filters.university, page + 1)}
              className="rounded-lg border border-zinc-300 px-5 py-3 text-sm dark:border-zinc-700"
            >
              Siguiente →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </section>

      <p className="text-xs text-zinc-500">
        Catálogo importado de ISTAC y QEDU. Puede contener registros
        provisionales y de demostración. La presencia de una oferta
        no garantiza plazas ni disponibilidad de matrícula.
      </p>
    </main>
  );
}

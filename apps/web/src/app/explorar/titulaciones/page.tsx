import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type SearchParams = Promise<{
  q?: string;
  pagina?: string;
}>;

type Offering = {
  id: string;
  degreeName: string;
  universityName: string;
  centerName: string | null;
  academicLevel: string | null;
  modality: string | null;
  sourceUrl: string | null;
};

function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function pageHref(query: string, page: number) {
  const params = new URLSearchParams();

  if (query) params.set("q", query);
  params.set("pagina", String(page));

  return `/explorar/titulaciones?${params.toString()}`;
}

export default async function ExploreDegreesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const query = (params.q ?? "").trim().slice(0, 120);
  const requestedPage = Number(params.pagina);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  let offerings: Offering[] = [];
  let total: number | null = null;
  let currentPage = page;

  try {
    const pattern = `%${query}%`;

    const condition = query
      ? sql`WHERE (
          d.name ILIKE ${pattern}
          OR u.official_name ILIKE ${pattern}
          OR c.official_name ILIKE ${pattern}
        )`
      : sql``;

    const countRows = await db.execute(sql`
      SELECT COUNT(*) AS total
      FROM degree_offerings o
      JOIN degrees d ON d.id = o.degree_id
      JOIN universities u ON u.id = o.university_id
      LEFT JOIN academic_centers c ON c.id = o.academic_center_id
      ${condition}
    `);

    total = Number(countRows[0]?.total ?? 0);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    currentPage = Math.min(page, totalPages);

    const rows = await db.execute(sql`
      SELECT
        o.id,
        d.name AS degree_name,
        d.academic_level,
        u.official_name AS university_name,
        c.official_name AS center_name,
        o.modality,
        o.source_url
      FROM degree_offerings o
      JOIN degrees d ON d.id = o.degree_id
      JOIN universities u ON u.id = o.university_id
      LEFT JOIN academic_centers c ON c.id = o.academic_center_id
      ${condition}
      ORDER BY d.name, u.official_name, o.id
      LIMIT ${PAGE_SIZE}
      OFFSET ${(currentPage - 1) * PAGE_SIZE}
    `);

    offerings = rows.map((row) => ({
      id: String(row.id),
      degreeName: String(row.degree_name),
      universityName: String(row.university_name),
      centerName: row.center_name ? String(row.center_name) : null,
      academicLevel: row.academic_level
        ? String(row.academic_level)
        : null,
      modality: row.modality ? String(row.modality) : null,
      sourceUrl: safeUrl(row.source_url),
    }));
  } catch {
    // No sustituimos errores de conexión por estadísticas ficticias.
    total = null;
  }

  const totalPages =
    total === null ? 1 : Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="bg-textured min-h-screen">
      <div className="mx-auto max-w-[1600px] px-6 py-16 lg:px-10">
        <Link
          href="/"
          className="nav-link inline-block mb-10"
        >
          ← AAAhoraQue
        </Link>

        <header className="mb-12 max-w-4xl">
          <div className="section-marker mb-6">
            EXPLORACIÓN ACADÉMICA
          </div>

          <h1 className="font-display text-5xl leading-tight tracking-tight md:text-7xl">
            DESCUBRE TU
            <span className="block text-[var(--color-degree)]">
              PRÓXIMO CAMINO.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-[var(--color-fg-dim)]">
            Explora las titulaciones y universidades de nuestro
            catálogo académico. Consulta las alternativas
            disponibles antes de comenzar tu decisión personal.
          </p>
        </header>

        <form
          action="/explorar/titulaciones"
          method="GET"
          className="mb-10 flex flex-col gap-4 md:flex-row"
        >
          <label className="flex-1">
            <span className="mb-2 block text-sm text-[var(--color-fg-dim)]">
              Buscar titulación, universidad o centro
            </span>

            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="¿Qué quieres estudiar?"
              className="w-full border border-[var(--color-border-light)] bg-[var(--color-bg-card)] px-5 py-4 text-[var(--color-fg)] outline-none focus:border-[var(--color-degree)]"
            />
          </label>

          <button
            type="submit"
            className="self-end bg-[var(--color-degree)] px-8 py-4 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Buscar
          </button>
        </form>

        {total === null ? (
          <div className="info-card p-8">
            <h2 className="text-xl font-semibold">
              El catálogo no está disponible temporalmente.
            </h2>

            <p className="mt-3 text-[var(--color-fg-dim)]">
              No hemos podido consultar PostgreSQL. No se muestran
              resultados ni cifras que no hayan podido verificarse.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-5">
              <p className="text-[var(--color-fg-dim)]">
                <strong className="text-[var(--color-fg)]">
                  {total.toLocaleString("es-ES")}
                </strong>{" "}
                ofertas académicas encontradas
              </p>

              <span className="font-mono text-xs text-[var(--color-muted)]">
                PÁGINA {currentPage} / {totalPages}
              </span>
            </div>

            {offerings.length === 0 ? (
              <p className="py-14 text-[var(--color-fg-dim)]">
                No hemos encontrado titulaciones que coincidan con
                tu búsqueda.
              </p>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {offerings.map((offering) => (
                  <article
                    key={offering.id}
                    className="info-card info-card-degree flex flex-col gap-5 p-7"
                  >
                    <div className="flex flex-wrap gap-2 font-mono text-xs text-[var(--color-degree)]">
                      {offering.academicLevel && (
                        <span>{offering.academicLevel}</span>
                      )}
                      {offering.modality && (
                        <span>· {offering.modality}</span>
                      )}
                    </div>

                    <h2 className="font-display text-2xl leading-tight">
                      {offering.degreeName}
                    </h2>

                    <div className="flex-1 space-y-2 text-sm text-[var(--color-fg-dim)]">
                      <p className="font-medium">
                        {offering.universityName}
                      </p>

                      {offering.centerName && (
                        <p>{offering.centerName}</p>
                      )}
                    </div>

                    {offering.sourceUrl && (
                      <a
                        href={offering.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-underline link-underline-degree self-start text-sm font-semibold"
                      >
                        Consultar fuente ↗
                      </a>
                    )}
                  </article>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <nav
                aria-label="Paginación"
                className="mt-12 flex items-center justify-between gap-4"
              >
                {currentPage > 1 ? (
                  <Link
                    href={pageHref(query, currentPage - 1)}
                    className="nav-link"
                  >
                    ← Anterior
                  </Link>
                ) : (
                  <span />
                )}

                {currentPage < totalPages && (
                  <Link
                    href={pageHref(query, currentPage + 1)}
                    className="nav-link"
                  >
                    Siguiente →
                  </Link>
                )}
              </nav>
            )}
          </>
        )}

        <p className="mt-12 max-w-3xl text-sm text-[var(--color-muted)]">
          Catálogo importado de fuentes académicas. La oferta
          puede variar por curso y universidad; comprueba siempre
          su vigencia en las fuentes oficiales correspondientes.
          Los resultados académicos simulados no se utilizan
          en esta página.
        </p>
      </div>
    </main>
  );
}

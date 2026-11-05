import Link from 'next/link'

/** Página sencilla para los enlaces del boletín (confirmar, darse de baja). */
export function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-eg-bg px-5 py-16 text-eg-ink">
      <div className="w-full max-w-[520px] text-center">
        <Link href="/" className="font-serif text-[40px] leading-none font-semibold tracking-[-.02em]">
          El Global
        </Link>
        <div className="mx-auto mt-6 mb-8 h-px w-16 bg-eg-rule" />
        <h1 className="m-0 font-serif text-[clamp(26px,4vw,34px)] leading-[1.15] font-medium">{title}</h1>
        <div className="mt-3 font-serif text-[18px] leading-[1.55] text-eg-muted">{children}</div>
        <Link href="/" className="mt-8 inline-flex min-h-11 items-center rounded bg-eg-ink px-5 font-semibold text-eg-bg hover:opacity-90">
          Ir a la portada
        </Link>
      </div>
    </main>
  )
}

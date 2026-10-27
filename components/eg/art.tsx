import { artUri } from '@/lib/art'
import { cn } from '@/lib/utils'

/** Imagen (ilustración o URL) que llena su contenedor. */
export function ArtImg({ src, alt = '', className }: { src: string; alt?: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={artUri(src)} alt={alt} decoding="async" className={cn('block size-full object-cover', className)} />
}

/** Marco 16:9 con fondo de superficie y zoom suave al pasar sobre el enlace padre (.group). */
export function ArtFrame({
  src,
  alt,
  className,
  children,
}: {
  src: string
  alt?: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn('eg-photo relative aspect-video overflow-hidden rounded-[2px] bg-eg-surface', className)}>
      <ArtImg
        src={src}
        alt={alt}
        className="absolute inset-0 transition-transform duration-[600ms] ease-[ease] group-hover:scale-[1.04]"
      />
      {children}
    </div>
  )
}

/** Cronología de "en directo" (guía §5.8). */
export function Timeline({ items }: { items: { time: string; text: string; topic?: string }[] }) {
  return (
    <ol className="m-0 list-none border-l-2 border-eg-rule p-0 pl-[18px]">
      {items.map((it, i) => (
        <li
          key={it.time + it.text + i}
          className="relative pb-[22px] pl-[18px] before:absolute before:top-1.5 before:-left-[25px] before:size-2.5 before:rounded-full before:border-2 before:border-eg-accent before:bg-eg-bg before:content-[''] first:before:bg-eg-accent"
        >
          <time className="text-xs font-semibold text-eg-accent">{it.time}</time>
          <p className="mt-0.5 font-serif text-[19px] leading-[1.3] font-medium">{it.text}</p>
          {it.topic && <small className="text-xs text-eg-muted">{it.topic}</small>}
        </li>
      ))}
    </ol>
  )
}

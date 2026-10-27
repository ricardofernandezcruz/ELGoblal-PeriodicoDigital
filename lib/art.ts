/* Ilustraciones editoriales en SVG (las mismas del prototipo).
   Son deterministas, así que se renderizan igual en servidor y cliente.
   Para usar fotos reales, pasa una URL en lugar del nombre de la ilustración. */

const rs = (s: number) => () => (s = (s * 16807) % 2147483647) / 2147483647
const S = (b: string, d = '') =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice"><defs>' + d + '</defs>' + b + '</svg>'
const LG = (id: string, s: string[], h?: boolean) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${h ? 1 : 0}" y2="1">${s
    .map((c, i) => `<stop offset="${i / (s.length - 1)}" stop-color="${c}"/>`)
    .join('')}</linearGradient>`
const AV = (bg: string, sk: string, hr: string) => () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/><path d="M8 64c2-16 14-22 24-22s22 6 24 22z" fill="#14202b"/><circle cx="32" cy="27" r="12" fill="${sk}"/><path d="M19 26c0-12 9-16 15-15s11 6 11 15c-3-5-8-8-13-8s-10 3-13 8z" fill="${hr}"/></svg>`

const ART = {
  skyline() {
    const r = rs(7)
    let b = '<rect width="640" height="360" fill="url(#g)"/><g fill="#fff" opacity=".7">'
    for (let i = 0; i < 46; i++) b += `<circle cx="${(r() * 640) | 0}" cy="${(r() * 150) | 0}" r="${(r() * 1.1 + 0.4).toFixed(1)}"/>`
    b += '</g><circle cx="540" cy="78" r="26" fill="#f6e7c6"/><circle cx="540" cy="78" r="44" fill="#f6e7c6" opacity=".12"/>'
    for (let x = -10; x < 650; x += 30) {
      const h = 50 + r() * 70
      b += `<rect x="${x}" y="${(255 - h) | 0}" width="29" height="${(h + 40) | 0}" fill="#18395d"/>`
    }
    for (let x = -8; x < 650; ) {
      const w = 22 + r() * 22,
        h = 50 + r() * 120,
        p = r() > 0.5 ? 'w' : 'v'
      b += `<rect x="${x | 0}" y="${(280 - h) | 0}" width="${w | 0}" height="${(h + 30) | 0}" fill="#0a1626"/><rect x="${x | 0}" y="${(280 - h) | 0}" width="${w | 0}" height="${(h + 30) | 0}" fill="url(#${p})"/>`
      if (r() > 0.7) b += `<rect x="${(x + w / 2 - 1) | 0}" y="${(253 - h) | 0}" width="2" height="22" fill="#0a1626"/>`
      x += w + 2 + r() * 8
    }
    b += '<rect y="282" width="640" height="78" fill="url(#r)"/>'
    for (let i = 0; i < 46; i++)
      b += `<rect x="${(r() * 640) | 0}" y="${(286 + r() * 8) | 0}" width="2" height="${(8 + r() * 46) | 0}" fill="#ffd27a" opacity="${(0.12 + r() * 0.2).toFixed(2)}"/>`
    b += '<path d="M0 300Q160 270 320 292T640 284" stroke="#fff" stroke-opacity=".12" fill="none"/>'
    return S(
      b,
      LG('g', ['#081526', '#1d4068', '#e29b55']) +
        '<pattern id="w" width="9" height="12" patternUnits="userSpaceOnUse"><rect x="2" y="3" width="3" height="5" fill="#ffd27a" opacity=".85"/></pattern><pattern id="v" width="12" height="9" patternUnits="userSpaceOnUse"><rect x="3" y="2" width="5" height="3" fill="#ffe3a3" opacity=".7"/></pattern>' +
        LG('r', ['#0e2338', '#060f1b']),
    )
  },
  ciudades() {
    const r = rs(3)
    let b = '<rect width="640" height="360" fill="url(#g)"/><circle cx="110" cy="80" r="34" fill="#fff3c9"/>'
    for (let x = 10; x < 640; x += 70) {
      const h = 90 + r() * 120,
        c = ['#d9cbb4', '#c9d6cf', '#e3d5c0', '#b9c9d1'][(r() * 4) | 0]
      b += `<rect x="${x}" y="${(300 - h) | 0}" width="54" height="${h | 0}" fill="${c}"/><rect x="${x}" y="${(300 - h) | 0}" width="54" height="8" fill="#5c8a63"/>`
      for (let k = 0; k < 3; k++) b += `<circle cx="${x + 10 + k * 17}" cy="${(298 - h) | 0}" r="${(7 + r() * 5) | 0}" fill="#4f8a5b"/>`
      for (let y = 300 - h + 20; y < 285; y += 24)
        b += `<rect x="${x + 8}" y="${y | 0}" width="12" height="12" fill="#fff" opacity=".7"/><rect x="${x + 32}" y="${y | 0}" width="12" height="12" fill="#fff" opacity=".7"/>`
    }
    b +=
      '<rect y="300" width="640" height="60" fill="#3d4a54"/><path d="M0 338H640" stroke="#fff" stroke-width="3" stroke-dasharray="28 20" opacity=".6"/><rect x="240" y="284" width="160" height="30" rx="9" fill="#b3261e"/><g fill="#f5efe3"><rect x="252" y="291" width="22" height="12" rx="2"/><rect x="282" y="291" width="22" height="12" rx="2"/><rect x="312" y="291" width="22" height="12" rx="2"/><rect x="342" y="291" width="22" height="12" rx="2"/></g><path d="M270 284V268H370" stroke="#222" stroke-width="2" fill="none"/>'
    return S(b, LG('g', ['#cfe6e0', '#f6efe0']))
  },
  trabajo() {
    return S(
      '<rect width="640" height="360" fill="#eadfcb"/><rect x="40" y="36" width="190" height="150" rx="6" fill="#bfd8e3"/><path d="M135 36V186M40 111H230" stroke="#eadfcb" stroke-width="6"/><circle cx="170" cy="82" r="18" fill="#fff6cf"/><rect x="300" y="40" width="90" height="76" rx="8" fill="#fff"/><rect x="300" y="40" width="90" height="20" rx="8" fill="#b3261e"/><g fill="#cbd3da"><rect x="312" y="72" width="14" height="10" rx="2"/><rect x="334" y="72" width="14" height="10" rx="2"/><rect x="356" y="72" width="14" height="10" rx="2"/><rect x="312" y="92" width="14" height="10" rx="2"/><rect x="334" y="92" width="14" height="10" rx="2" fill="#f2b84b"/></g><rect x="450" y="70" width="130" height="46" rx="14" fill="#fff"/><path d="M490 116l-8 15 22-15z" fill="#fff"/><rect x="466" y="84" width="76" height="7" rx="3.5" fill="#cbd3da"/><rect x="466" y="99" width="48" height="7" rx="3.5" fill="#cbd3da"/><rect y="270" width="640" height="90" fill="#8a6a4a"/><rect y="262" width="640" height="14" fill="#a8845f"/><rect x="262" y="140" width="170" height="108" rx="6" fill="#2b3a4a"/><rect x="270" y="148" width="154" height="92" rx="3" fill="#7fb0d8"/><rect x="284" y="162" width="70" height="8" rx="4" fill="#fff" opacity=".85"/><rect x="284" y="178" width="110" height="8" rx="4" fill="#fff" opacity=".6"/><rect x="284" y="194" width="90" height="8" rx="4" fill="#fff" opacity=".6"/><path d="M236 262h222l-14-14H250z" fill="#c8ced4"/><rect x="500" y="228" width="38" height="34" rx="6" fill="#fff"/><path d="M538 236q16 0 16 12t-16 12" stroke="#fff" stroke-width="6" fill="none"/><path d="M110 262l8-40h36l8 40z" fill="#b3261e"/><ellipse cx="136" cy="196" rx="10" ry="30" fill="#5c8a63" transform="rotate(-22 136 220)"/><ellipse cx="136" cy="192" rx="10" ry="32" fill="#4f8a5b"/><ellipse cx="136" cy="196" rx="10" ry="30" fill="#6fa478" transform="rotate(24 136 220)"/>',
    )
  },
  mercados() {
    const r = rs(11)
    let b = '<rect width="640" height="360" fill="url(#g)"/>'
    for (let y = 60; y < 330; y += 54) b += `<path d="M0 ${y}H640" stroke="#fff" opacity=".08"/>`
    let v = 260
    const pts: string[] = []
    for (let i = 0; i < 22; i++) {
      const x = 30 + i * 27,
        o = v,
        c = v - (r() * 40 - 11)
      v = c
      const hi = Math.min(o, c) - r() * 14,
        lo = Math.max(o, c) + r() * 14,
        up = c < o,
        col = up ? '#52c28a' : '#e0645c'
      b += `<path d="M${x} ${hi | 0}V${lo | 0}" stroke="${col}" stroke-width="2"/><rect x="${x - 7}" y="${Math.min(o, c) | 0}" width="14" height="${Math.max(8, Math.abs(o - c)) | 0}" fill="${col}"/>`
      pts.push(x + ',' + (((o + c) / 2) | 0))
    }
    b += `<polyline points="${pts.join(' ')}" fill="none" stroke="#f2c86b" stroke-width="2.5" opacity=".9" stroke-linecap="round" stroke-linejoin="round"/><text x="560" y="130" font-family="Georgia,serif" font-size="120" fill="#fff" opacity=".08" text-anchor="middle">€</text>`
    return S(b, LG('g', ['#12354a', '#0a1f2e']))
  },
  ia() {
    const r = rs(5)
    let b =
      '<rect width="640" height="360" fill="url(#g)"/><rect x="60" y="50" width="200" height="260" rx="12" fill="#fff" opacity=".95"/><rect x="82" y="78" width="110" height="12" rx="6" fill="#14202b"/>'
    for (let i = 0; i < 9; i++) b += `<rect x="82" y="${110 + i * 20}" width="${i % 3 == 2 ? 100 : 156}" height="7" rx="3.5" fill="#cfd6de"/>`
    const n: number[][] = []
    for (let i = 0; i < 14; i++) n.push([(330 + r() * 270) | 0, (50 + r() * 260) | 0])
    for (let i = 0; i < 14; i++)
      for (let j = i + 1; j < 14; j++) {
        if (Math.hypot(n[i][0] - n[j][0], n[i][1] - n[j][1]) < 130) b += `<path d="M${n[i]}L${n[j]}" stroke="#fff" stroke-opacity=".35"/>`
      }
    n.forEach((p, i) => (b += `<circle cx="${p[0]}" cy="${p[1]}" r="${i % 4 == 0 ? 9 : 5}" fill="${i % 4 == 0 ? '#ffd27a' : '#fff'}"/>`))
    b += '<path d="M262 180C290 180 300 150 322 140" stroke="#ffd27a" stroke-width="3" stroke-dasharray="6 6" fill="none"/>'
    return S(b, LG('g', ['#2b3f8f', '#6a4fb0'], true))
  },
  arte() {
    return S(
      '<rect width="640" height="360" fill="#f3dfc0"/><circle cx="430" cy="150" r="96" fill="#e0642f"/><path d="M0 360V250L110 150 220 250 300 190 400 290 520 200 640 300V360z" fill="#1f6f78"/><path d="M0 360V300L140 230 260 320 380 260 500 340 640 280V360z" fill="#143f4a"/><g fill="#f3dfc0"><rect x="40" y="40" width="26" height="26"/><rect x="76" y="40" width="26" height="26" opacity=".6"/><rect x="40" y="76" width="26" height="26" opacity=".6"/></g><path d="M90 230a60 60 0 0 1 120 0" fill="none" stroke="#b3261e" stroke-width="14"/><path d="M106 230a44 44 0 0 1 88 0" fill="none" stroke="#f2b84b" stroke-width="14"/><rect x="520" y="40" width="18" height="120" fill="#b3261e"/><rect x="548" y="70" width="18" height="90" fill="#f2b84b"/><rect x="576" y="100" width="18" height="60" fill="#1f6f78"/>',
    )
  },
  energia() {
    let b =
      '<rect width="640" height="360" fill="url(#g)"/><circle cx="520" cy="90" r="40" fill="#fff4cc"/><path d="M0 250Q160 200 320 245T640 230V360H0z" fill="#8fb98f"/><path d="M0 290Q200 250 400 290T640 275V360H0z" fill="#5f9a6d"/>'
    ;[
      [120, 215, 80],
      [300, 225, 105],
      [470, 215, 66],
    ].forEach(([x, y, h], k) => {
      b += `<path d="M${x} ${y}V${y - h}" stroke="#f7f7f2" stroke-width="5"/>`
      for (let a = 0; a < 3; a++) {
        const t = ((a * 120 + k * 25) * Math.PI) / 180
        b += `<path d="M${x} ${y - h}L${(x + Math.sin(t) * h * 0.62) | 0} ${(y - h - Math.cos(t) * h * 0.62) | 0}" stroke="#f7f7f2" stroke-width="4" stroke-linecap="round"/>`
      }
      b += `<circle cx="${x}" cy="${y - h}" r="5" fill="#e9e9e2"/>`
    })
    ;[30, 350].forEach((o) => {
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 3; j++) {
          const x = o + i * 70 + j * 14,
            y = 296 + j * 18
          b += `<path d="M${x} ${y}h62l-10 15H${x - 10}z" fill="#1f4f8f"/><path d="M${x + 20} ${y}l-6 15M${x + 41} ${y}l-6 15" stroke="#9cc3ee" stroke-width="1"/>`
        }
    })
    return S(b, LG('g', ['#cfe8f3', '#f7efe0']))
  },
  dispositivos() {
    let b =
      '<rect width="640" height="360" fill="url(#g)"/><circle cx="320" cy="180" r="120" fill="none" stroke="#14202b" stroke-opacity=".12" stroke-width="22"/>'
    for (let k = 0; k < 3; k++) {
      const t = ((k * 120 - 90) * Math.PI) / 180,
        x = 320 + Math.cos(t) * 120,
        y = 180 + Math.sin(t) * 120
      b += `<circle cx="${x | 0}" cy="${y | 0}" r="18" fill="#3f8f5f"/><path d="M${(x - 6) | 0} ${y | 0}l4 5 8-9" stroke="#fff" stroke-width="3" fill="none"/>`
    }
    b +=
      '<rect x="270" y="70" width="100" height="220" rx="16" fill="#14202b"/><rect x="278" y="86" width="84" height="188" rx="8" fill="url(#s)"/><rect x="300" y="77" width="40" height="5" rx="2.5" fill="#3a4a5a"/><rect x="296" y="120" width="48" height="24" rx="4" fill="none" stroke="#fff" stroke-width="3"/><rect x="299" y="123" width="12" height="18" fill="#e0645c"/><rect x="344" y="128" width="4" height="8" fill="#fff"/><rect x="296" y="170" width="48" height="6" rx="3" fill="#fff" opacity=".6"/><rect x="296" y="186" width="34" height="6" rx="3" fill="#fff" opacity=".4"/>'
    return S(b, LG('g', ['#dde6ea', '#c3d0d6']) + LG('s', ['#2d5a8a', '#1a3355']))
  },
  empleo() {
    let b = '<rect width="640" height="360" fill="url(#g)"/>'
    ;[70, 95, 90, 130, 160, 200].forEach((v, i) => {
      const x = 70 + i * 90
      b += `<rect x="${x}" y="${310 - v}" width="64" height="${v}" rx="6" fill="${i == 5 ? '#b3261e' : '#2b4a6b'}" opacity="${i == 5 ? 1 : 0.85}"/><circle cx="${x + 32}" cy="${310 - v - 34}" r="11" fill="#f2b84b"/><path d="M${x + 14} ${310 - v - 6}a18 18 0 0 1 36 0z" fill="#f2b84b"/>`
    })
    b +=
      '<path d="M80 250L170 220 260 232 350 176 440 140 530 96" stroke="#fff" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round" fill="none"/><path d="M0 310H640" stroke="#14202b" stroke-opacity=".2" stroke-width="2"/>'
    return S(b, LG('g', ['#e8eef2', '#cdd9e0']))
  },
  av1: AV('#cfe0e6', '#e7b998', '#3a2a22'),
  av2: AV('#e9d5c2', '#c28e6a', '#14202b'),
  av3: AV('#d8d3e6', '#f0cdb0', '#7a4b2a'),
}

export type ArtName = keyof typeof ART

const cache = new Map<string, string>()

export function isArt(name: string): name is ArtName {
  return name in ART
}

/** URI de datos de una ilustración, o la propia cadena si ya es una URL. */
export function artUri(name: string): string {
  if (!isArt(name)) return name
  let u = cache.get(name)
  if (!u) {
    u = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ART[name]())
    cache.set(name, u)
  }
  return u
}

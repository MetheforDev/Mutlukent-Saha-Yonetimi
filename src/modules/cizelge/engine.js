// Genel amaçlı adaletli çizelge motoru — şubeden bağımsız.
// Kurallar: docs/03_Cizelge_Kurallari.md
//
// Girdi:
//   staff:   [{ id, name, roles:[roleKey...], fixedOff: 0..6|null }]
//   tpl:     { [shiftKey]: { [roleKey]: slotSayisi } }   örn {gunduz:{KASA:1,...}, gece:{...}} veya {tek:{...}}
//   shifts:  ['gunduz','gece'] veya ['tek']
//   rot:     hafta indeksi (rotasyonu ilerletir)
//   counters:{ [staffId]: { g, n, tot } }   (rotasyon_sayaclari'ndan)
// Çıktı: { plan: { 'shift|roleSlot|gun': {staffId,loc,time} }, off: { [staffId]: gun } }

export function makePlan({ staff, tpl, shifts, weekend = [5, 6], rot = 0, counters = {} }) {
  const plan = {}
  const key = (sh, role, slot, d) => `${sh}|${role}${slot}|${d}`
  const cof = (id) => counters[id] || { g: 0, n: 0, tot: 0 }
  const isDay = (sh) => sh === 'gunduz' || sh === 'tek'

  // 1) İzin günleri: sabit önce, kalanlar hafta içi öncelikli ve her hafta kayan
  const off = {}, dayLoad = Array(7).fill(0)
  staff.forEach((p) => { if (p.fixedOff != null && p.fixedOff !== '') { off[p.id] = +p.fixedOff; dayLoad[+p.fixedOff]++ } })
  const rest = staff.filter((p) => off[p.id] == null).sort((a, b) => a.id - b.id)
  const start = rest.length ? rot % rest.length : 0
  rest.slice(start).concat(rest.slice(0, start)).forEach((p) => {
    const days = [0, 1, 2, 3, 4, 5, 6].sort((a, b) => {
      const wa = weekend.includes(a) ? 1 : 0, wb = weekend.includes(b) ? 1 : 0
      if (wa !== wb) return wa - wb
      if (dayLoad[a] !== dayLoad[b]) return dayLoad[a] - dayLoad[b]
      return a - b
    })
    off[p.id] = days[0]; dayLoad[days[0]]++
  })

  // 2) Mutfak haftalık döngüsü (rol varsa): kahvaltı -> sabah mutfak -> akşam
  const mut = staff.filter((p) => p.roles.includes('MUTFAK')).sort((a, b) => a.id - b.id)
  const mutRole = {}
  mut.forEach((p, i) => { const k = mut.length ? (i + rot) % mut.length : 0; mutRole[p.id] = k === 0 ? 'KAH' : k === 1 ? 'MUTG' : 'AKS' })

  // 3) Garson haftalık rotasyonu (tek görevli garsonlar): sabahçı + ara döner
  const gcore = staff.filter((p) => p.roles.length === 1 && p.roles[0] === 'GARSON').sort((a, b) => a.id - b.id)
  const gn = gcore.length
  const sabahci = gn ? gcore[rot % gn] : null
  const ara = gn > 1 ? gcore[(rot + 1) % gn] : null
  const sabahci2 = gn > 2 ? gcore[(rot + 2) % gn] : null

  const placed = {}; for (let d = 0; d < 7; d++) placed[d] = new Set()
  const pick = (role, d, sp, pref) => {
    const c = staff.filter((p) => p.roles.includes(role) && off[p.id] !== d && !placed[d].has(p.id))
    c.sort((a, b) => {
      const pa = pref ? pref(a) : 0, pb = pref ? pref(b) : 0; if (pa !== pb) return pb - pa
      if (a.roles.length !== b.roles.length) return a.roles.length - b.roles.length        // uzman önce, çok-görevli yedek
      if (sp === 'g' && cof(a.id).g !== cof(b.id).g) return cof(a.id).g - cof(b.id).g
      if (sp === 'n' && cof(a.id).n !== cof(b.id).n) return cof(a.id).n - cof(b.id).n
      if (cof(a.id).tot !== cof(b.id).tot) return cof(a.id).tot - cof(b.id).tot
      return a.id - b.id
    })
    return c[0] || null
  }
  const put = (sh, role, s, p, d, loc, time) => { plan[key(sh, role, s, d)] = { staffId: p.id, loc: loc || null, time: time || null }; placed[d].add(p.id) }
  const fill = (sh, role, n, d, sp, pref) => { for (let s = 0; s < n; s++) { const p = pick(role, d, sp, pref); if (!p) break; put(sh, role, s, p, d, role === 'GARSON' ? (s % 2 ? 'C' : 'R') : null, null) } }

  for (let d = 0; d < 7; d++) {
    shifts.forEach((sh) => {
      const sp = isDay(sh) ? 'g' : 'n'
      const t = tpl[sh] || {}
      Object.keys(t).forEach((role) => {
        if (role === 'GARSON') return // garson özel ele alınır
        let pref = null
        if (role === 'KAHVALTI') pref = (p) => (mutRole[p.id] === 'KAH' ? 2 : 0)
        if (role === 'MUTFAK') pref = (p) => (isDay(sh) ? (mutRole[p.id] === 'MUTG' ? 2 : 0) : (mutRole[p.id] === 'AKS' ? 2 : 0))
        fill(sh, role, t[role] || 0, d, sp, pref)
      })
    })
    // GARSON: gündüz/tek vardiyada sabahçı (+hafta sonu 2.) + ara; kalan gece
    const dayShift = shifts.find(isDay)
    const nightShift = shifts.find((sh) => !isDay(sh))
    if (dayShift && (tpl[dayShift] || {}).GARSON) {
      const cap = tpl[dayShift].GARSON; let gi = 0
      const pg = (p, time) => { if (p && off[p.id] !== d && !placed[d].has(p.id) && gi < cap) { put(dayShift, 'GARSON', gi, p, d, 'R', time); gi++ } }
      pg(sabahci, null); if (weekend.includes(d)) pg(sabahci2, null); pg(ara, '12:00')
      const target = (weekend.includes(d) ? 2 : 1) + 1
      while (gi < Math.min(cap, target)) { const p = pick('GARSON', d, 'g'); if (!p) break; put(dayShift, 'GARSON', gi, p, d, 'R', null); gi++ }
    }
    if (nightShift && (tpl[nightShift] || {}).GARSON) fill(nightShift, 'GARSON', tpl[nightShift].GARSON, d, 'n')
  }
  return { plan, off }
}

# Total Team – weboldal és raktár

## Mi ez
A Total Team film/produkciós cég weboldala (totalteam.hu).

## Stack és infrastruktúra
- **React (Create React App, `react-scripts`)**: `npm start`, `npm run build`; forrás: `src/`
- Hosting **Vercel**-en; szerver oldali függvények: `api/` (pl. `api/kivitel.js`)
- Supabase a kivitelek nyilvántartásához: `supabase/kivitelek.sql`
- GitHub repó: `bakibalazs84-hu/totalteam-website`
- A Vercel projekt a **bakibalazs** Vercel fiókban van (nem a filmfreekft-code fiókban)
- Domain: **totalteam.hu**, DotRoll-on. Még nincs a Vercelhez kötve.
- A régi oldal a **team5.hu**, cPanel tárhelyen (DotRoll fiókon keresztül érhető el). Az anyagai a Google Drive `TEAM5/Weblap` mappájában vannak.

## Állapot és prioritások
1. **Először csak a raktár / bérleti oldal megy élesbe.** A többi szekció még nincs kész, ezek ne legyenek publikusak.
2. A team5.hu-t nyitóoldallá kell upgradelni.
3. Logó: az eredeti Total Team logó marad, csak tisztább kivágással.

## Raktár adatforrás
- A termékfotók Google Drive-on vannak, kategóriánként mappákba rendezve (pl. `Állólámpa`), összesen 100+ fájl.
- A fájlnév tartalmazza a darabszámot, a terméknevet és a méretet, pl. `2x wood gold E27 150cm.jpg` → 2 db, "wood gold E27", 150 cm.
- A raktári tételek QR-kódos címkét kapnak.

## Belső admin felület / kivitelek
- Jelszóval védett rész a Total Team oldalon, ahol rögzíthető, melyik raktári tétel ment ki saját projektre.
- Több felhasználó lesz, mindenki más jogosultsággal.
- **A nyilvános raktár oldal emiatt nem változhat.**

## Munkaszabályok
- A kommunikáció magyarul folyik, az oldal szövegei is magyarok.
- Commit előtt futtasd a buildet, és csak akkor commitolj, ha hibátlanul lefut.
- Titkokat és kulcsokat ne commitolj; ezek a Vercel environment variable-jei közé kerülnek.
- A `main` branchre történő push azonnal élesít a Vercelen.

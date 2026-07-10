// Berekeningen voor het cao-uurloonvergelijk.
//
// Dit bestand bevat alleen pure rekenfuncties (geen DOM-code), zodat de
// berekening later stap voor stap uitgebreid kan worden (vakantiegeld,
// eindejaarsuitkering, leeftijdsdagen, keuzebudget, ...) zonder de UI-code
// in js/app.js aan te hoeven passen.

// Gemiddeld aantal weken per maand. Een jaar heeft 52 weken en 1 dag (of 2
// in een schrikkeljaar), dus het gangbare gemiddelde is 52 weken / 12
// maanden. Dit is de standaard rekenwijze om een weekurenomvang om te
// rekenen naar een gemiddeld aantal uren per maand.
const WEKEN_PER_JAAR = 52;
const MAANDEN_PER_JAAR = 12;

// Aanname voor het omrekenen van vakantiedagen naar vakantie-uren: een
// voltijd werkweek van vijf dagen.
const DAGEN_PER_WERKWEEK = 5;

/**
 * Bereken het gemiddeld aantal uren per maand op basis van het aantal
 * contractuele uren per week.
 *
 * Formule: uren per week x 52 weken / 12 maanden
 *
 * @param {number} urenPerWeek
 * @returns {number}
 */
export function berekenGemiddeldUrenPerMaand(urenPerWeek) {
  return (urenPerWeek * WEKEN_PER_JAAR) / MAANDEN_PER_JAAR;
}

/**
 * Bereken het kale bruto uurloon: het bruto maandloon gedeeld door het
 * gemiddeld aantal uren per maand.
 *
 * Formule: bruto maandloon / ((uren per week x 52) / 12)
 *
 * Dit is stap 1 van de uiteindelijke "totaal bruto uurloon"-berekening.
 * Latere stappen (vakantiegeld, feestdagen, vakantiedagen,
 * eindejaarsuitkering, leeftijdsdagen, keuzebudget) komen hier nog bij.
 *
 * @param {number} brutoMaandloon
 * @param {number} urenPerWeek
 * @returns {{ uurloon: number, urenPerMaand: number }}
 */
export function berekenKaalBrutoUurloon(brutoMaandloon, urenPerWeek) {
  const urenPerMaand = berekenGemiddeldUrenPerMaand(urenPerWeek);
  const uurloon = urenPerMaand === 0 ? 0 : brutoMaandloon / urenPerMaand;
  return { uurloon, urenPerMaand };
}

/**
 * Bepaal het kale bruto uurloon voor een schaal/trede, ongeacht of de cao
 * het uurloon al kant-en-klaar aanlevert (bijv. cao's die per 4 weken
 * uitbetalen en het uurloon zelf al in de tabel zetten) of dat het uurloon
 * berekend moet worden uit een bruto maandloon.
 *
 * - Heeft de trede een `brutoUurloon`? Dan komt dat rechtstreeks uit de
 *   cao-tabel en wordt het ongewijzigd overgenomen (bron: "cao-tabel").
 * - Anders wordt het berekend uit `trede.brutoMaandloon` en
 *   `periode.urenPerWeekVoltijd` (bron: "berekend"), zie
 *   berekenKaalBrutoUurloon.
 *
 * @param {object} trede
 * @param {object} periode
 * @returns {{ uurloon: number, bron: "cao-tabel" | "berekend", urenPerMaand?: number }}
 */
export function bepaalBrutoUurloon(trede, periode) {
  if (typeof trede.brutoUurloon === "number") {
    return { uurloon: trede.brutoUurloon, bron: "cao-tabel" };
  }
  const { uurloon, urenPerMaand } = berekenKaalBrutoUurloon(trede.brutoMaandloon, periode.urenPerWeekVoltijd);
  return { uurloon, bron: "berekend", urenPerMaand };
}

/**
 * Bereken het vakantiegeld per uur: kaal bruto uurloon x
 * vakantiegeldpercentage.
 *
 * @param {number} kaalUurloon
 * @param {number|undefined} vakantiegeldPercentage bijv. 0.0825 voor 8,25%
 * @returns {number}
 */
export function berekenVakantiegeldPerUur(kaalUurloon, vakantiegeldPercentage) {
  return kaalUurloon * (vakantiegeldPercentage ?? 0);
}

/**
 * Bereken de meerkosten van vakantiedagen per uur. Vakantiedagen worden
 * doorbetaald maar niet gewerkt; die kosten worden hier omgeslagen over de
 * uren die wél daadwerkelijk gewerkt worden — dezelfde methode die
 * uitzend-/detacheringsbureaus gebruiken om een kostprijs per gewerkt uur
 * te bepalen.
 *
 * Formule: uurloon x vakantie-uren / gewerkte uren, met
 *   vakantie-uren  = vakantiedagenPerJaar x (urenPerWeekVoltijd / 5)
 *   jaaruren       = urenPerWeekVoltijd x 52
 *   gewerkte uren  = jaaruren - vakantie-uren
 *
 * @param {number} uurloon het uurloon waarover de opslag wordt berekend
 * @param {number|undefined} vakantiedagenPerJaar
 * @param {number} urenPerWeekVoltijd
 * @returns {{ bedrag: number, vakantieUren: number, gewerkteUren: number }}
 */
export function berekenVakantiedagenPerUur(uurloon, vakantiedagenPerJaar, urenPerWeekVoltijd) {
  const vakantieUren = (vakantiedagenPerJaar ?? 0) * (urenPerWeekVoltijd / DAGEN_PER_WERKWEEK);
  const jaaruren = urenPerWeekVoltijd * WEKEN_PER_JAAR;
  const gewerkteUren = jaaruren - vakantieUren;
  const bedrag = gewerkteUren > 0 ? uurloon * (vakantieUren / gewerkteUren) : 0;
  return { bedrag, vakantieUren, gewerkteUren };
}

/**
 * Bouw het totaal bruto uurloon op: het kale bruto uurloon plus alle losse
 * opbouwstappen, waarbij elke volgende stap doorwerkt op het lopende
 * subtotaal (compounding) in plaats van steeds op het kale uurloon. Nu:
 * eerst vakantiedagen, dan vakantiegeld daarover (je blijft vakantiegeld
 * opbouwen tijdens vakantiedagen, dus die kosten moeten ook mee in de
 * grondslag). Latere stappen (feestdagen, eindejaarsuitkering,
 * leeftijdsdagen, keuzebudget) kunnen hier als extra entries in `stappen`
 * bijkomen, zonder de UI-code aan te passen (die loopt gewoon over
 * `stappen` heen).
 *
 * Ontbreekt een parameter in de cao-data (of staat die op 0), dan komt de
 * stap er nog steeds in met bedrag 0 en `ontbreekt: true`, zodat de UI een
 * duidelijke melding kan tonen in plaats van de stap stilzwijgend over te
 * slaan.
 *
 * @param {object} trede
 * @param {object} periode
 * @returns {{
 *   kaalUurloon: number,
 *   bron: "cao-tabel" | "berekend",
 *   urenPerMaand?: number,
 *   stappen: Array<object>,
 *   totaalUurloon: number,
 * }}
 */
export function bouwTotaalBrutoUurloon(trede, periode) {
  const basis = bepaalBrutoUurloon(trede, periode);
  const kaalUurloon = basis.uurloon;
  const stappen = [];
  let subtotaal = kaalUurloon;

  const vakantiedagen = berekenVakantiedagenPerUur(subtotaal, periode.vakantiedagenPerJaar, periode.urenPerWeekVoltijd);
  stappen.push({
    label: "Vakantiedagen",
    soort: "vakantiedagen",
    dagen: periode.vakantiedagenPerJaar ?? 0,
    vakantieUren: vakantiedagen.vakantieUren,
    gewerkteUren: vakantiedagen.gewerkteUren,
    bedrag: vakantiedagen.bedrag,
    ontbreekt: !periode.vakantiedagenPerJaar,
  });
  subtotaal += vakantiedagen.bedrag;

  const vakantiegeldBedrag = berekenVakantiegeldPerUur(subtotaal, periode.vakantiegeldPercentage);
  stappen.push({
    label: "Vakantiegeld",
    soort: "percentage",
    percentage: periode.vakantiegeldPercentage ?? 0,
    bedrag: vakantiegeldBedrag,
    ontbreekt: !periode.vakantiegeldPercentage,
  });
  subtotaal += vakantiegeldBedrag;

  return { kaalUurloon, bron: basis.bron, urenPerMaand: basis.urenPerMaand, stappen, totaalUurloon: subtotaal };
}

/**
 * Vergelijk twee bruto uurlonen.
 *
 * @param {number} uurloonA
 * @param {number} uurloonB
 * @returns {{ verschilAbsoluut: number, verschilPercentage: number }}
 *   verschilAbsoluut/Percentage zijn B ten opzichte van A (B - A, en
 *   (B - A) / A x 100).
 */
export function vergelijkUurlonen(uurloonA, uurloonB) {
  const verschilAbsoluut = uurloonB - uurloonA;
  const verschilPercentage = uurloonA === 0 ? 0 : (verschilAbsoluut / uurloonA) * 100;
  return { verschilAbsoluut, verschilPercentage };
}

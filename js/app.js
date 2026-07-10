// UI-laag voor het cao-uurloonvergelijk. Alle rekenwerk staat in
// calculations.js — dit bestand vult alleen dropdowns en toont resultaten.

import { bouwTotaalBrutoUurloon, vergelijkUurlonen } from "./calculations.js";

// Om een nieuwe cao toe te voegen: zet het JSON-bestand in data/ (zie
// data/README.md voor de structuur) en voeg hier een regel toe. Cao A staat
// altijd vast op CAO_A_ID; paneel B kiest uit alle overige cao's.
const CAO_BESTANDEN = [
  { id: "bedrijfsverzorgingsdiensten", bestand: "data/bedrijfsverzorgingsdiensten.json" },
  { id: "hoveniersbedrijf", bestand: "data/hoveniersbedrijf.json" },
];

const CAO_A_ID = "bedrijfsverzorgingsdiensten";

const geldFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const uurloonFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 4,
});

const percentageFormatter = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const urenFormatter = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const caoDataCache = new Map();

async function laadCaoData(caoId) {
  if (caoDataCache.has(caoId)) {
    return caoDataCache.get(caoId);
  }
  const info = CAO_BESTANDEN.find((c) => c.id === caoId);
  const response = await fetch(info.bestand);
  if (!response.ok) {
    throw new Error(`Kon ${info.bestand} niet laden (${response.status})`);
  }
  const data = await response.json();
  caoDataCache.set(caoId, data);
  return data;
}

function vulSelect(select, opties, { value, label }) {
  select.innerHTML = "";
  for (const optie of opties) {
    const el = document.createElement("option");
    el.value = value(optie);
    el.textContent = label(optie);
    select.appendChild(el);
  }
}

function periodesGesorteerdOpRecent(periodes) {
  return [...periodes].sort((a, b) => (a.ingangsdatum < b.ingangsdatum ? 1 : -1));
}

function formatPeriodeLabel(periode) {
  const eind = periode.einddatum ? ` t/m ${periode.einddatum}` : "";
  return `${periode.ingangsdatum}${eind}`;
}

// Vertegenwoordigt één paneel (Cao A of Cao B): houdt de dropdown-selectie
// bij, laadt de bijbehorende data en toont het berekende resultaat.
//
// Paneel A staat vast op één cao (opties.vastCaoId): er is geen cao-dropdown
// en de naam wordt alleen getoond. Paneel B kiest uit alle cao's behalve
// opties.uitgeslotenCaoIds.
class CaoPaneel {
  constructor(prefix, onChange, opties = {}) {
    this.prefix = prefix;
    this.onChange = onChange;
    this.vastCaoId = opties.vastCaoId ?? null;
    this.uitgeslotenCaoIds = opties.uitgeslotenCaoIds ?? [];
    this.leeftijdOphalen = opties.leeftijdOphalen ?? (() => null);

    this.caoSelect = document.getElementById(`${prefix}-cao`);
    this.periodeSelect = document.getElementById(`${prefix}-periode`);
    this.schaalSelect = document.getElementById(`${prefix}-schaal`);
    this.tredeSelect = document.getElementById(`${prefix}-trede`);

    const panel = document.querySelector(`[data-panel="${prefix}"]`);
    this.loonEl = panel.querySelector('[data-field="loon"]');
    this.urenEl = panel.querySelector('[data-field="uren"]');
    this.formuleEl = panel.querySelector('[data-field="formule"]');
    this.opbouwEl = panel.querySelector('[data-field="opbouw"]');

    this.huidigeCaoData = null;
    this.huidigeBerekening = null;

    if (this.caoSelect && !this.vastCaoId) {
      this.caoSelect.addEventListener("change", () => this.laadEnZetCao(this.caoSelect.value));
    }
    this.periodeSelect.addEventListener("change", () => this.opPeriodeGewijzigd());
    this.schaalSelect.addEventListener("change", () => this.opSchaalGewijzigd());
    this.tredeSelect.addEventListener("change", () => this.werkResultaatBij());
  }

  async init() {
    if (this.vastCaoId) {
      await this.laadEnZetCao(this.vastCaoId);
      return;
    }

    const opties = CAO_BESTANDEN.filter((c) => !this.uitgeslotenCaoIds.includes(c.id));
    vulSelect(this.caoSelect, opties, {
      value: (c) => c.id,
      label: (c) => c.id,
    });
    // De dropdown toont tot nu toe de technische id; zet nu voor alle
    // opties het leesbare label.
    for (const optie of this.caoSelect.options) {
      const data = await laadCaoData(optie.value);
      optie.textContent = data.caoNaam;
    }

    await this.laadEnZetCao(this.caoSelect.value);
  }

  async laadEnZetCao(caoId) {
    this.huidigeCaoData = await laadCaoData(caoId);

    if (this.vastCaoId) {
      vulSelect(this.caoSelect, [this.huidigeCaoData], {
        value: () => caoId,
        label: (data) => data.caoNaam,
      });
    }

    const periodes = periodesGesorteerdOpRecent(this.huidigeCaoData.periodes);
    vulSelect(this.periodeSelect, periodes, {
      value: (p) => p.ingangsdatum,
      label: formatPeriodeLabel,
    });

    this.opPeriodeGewijzigd();
  }

  huidigePeriode() {
    const periodes = this.huidigeCaoData.periodes;
    return periodes.find((p) => p.ingangsdatum === this.periodeSelect.value);
  }

  opPeriodeGewijzigd() {
    const periode = this.huidigePeriode();
    vulSelect(this.schaalSelect, periode.salaristabel, {
      value: (s) => s.schaal,
      label: (s) => `Schaal ${s.schaal}`,
    });
    this.opSchaalGewijzigd();
  }

  huidigeSchaal() {
    const periode = this.huidigePeriode();
    return periode.salaristabel.find((s) => s.schaal === this.schaalSelect.value);
  }

  opSchaalGewijzigd() {
    const schaal = this.huidigeSchaal();
    vulSelect(this.tredeSelect, schaal.treden, {
      value: (t) => String(t.trede),
      label: (t) => t.label,
    });
    this.werkResultaatBij();
  }

  werkResultaatBij() {
    const periode = this.huidigePeriode();
    const schaal = this.huidigeSchaal();
    const trede = schaal.treden.find((t) => String(t.trede) === this.tredeSelect.value);

    const resultaat = bouwTotaalBrutoUurloon(trede, periode, this.leeftijdOphalen());

    if (resultaat.bron === "cao-tabel") {
      this.toonCaoTabelResultaat(periode, schaal, trede, resultaat);
    } else {
      this.toonBerekendResultaat(periode, trede, resultaat);
    }

    this.renderOpbouw(resultaat);

    this.huidigeBerekening = {
      caoNaam: this.huidigeCaoData.caoNaam,
      schaal: schaal.schaal,
      trede: trede.label,
      uurloon: resultaat.totaalUurloon,
    };

    this.onChange();
  }

  // Cao's die per maand uitbetalen: het kale uurloon wordt hier berekend
  // uit het bruto maandloon en de voltijd-uren per week.
  toonBerekendResultaat(periode, trede, resultaat) {
    this.loonEl.textContent = `${geldFormatter.format(trede.brutoMaandloon)} per maand`;
    this.urenEl.textContent = `${periode.urenPerWeekVoltijd} uur per week`;
    this.formuleEl.textContent =
      `${geldFormatter.format(trede.brutoMaandloon)} / ` +
      `((${periode.urenPerWeekVoltijd} uur x 52) / 12 = ${resultaat.urenPerMaand.toFixed(2)} uur/maand) ` +
      `= ${uurloonFormatter.format(resultaat.kaalUurloon)} per uur`;
  }

  // Cao's die het bruto uurloon al rechtstreeks in de tabel zetten (in
  // plaats van een maandloon waaruit wij het kale uurloon berekenen): het
  // kale uurloon wordt hier niet berekend, alleen overgenomen en toegelicht
  // aan de hand van de referentiebedragen (bijv. loon per week/4 weken, of
  // meerdere arbeidstijd-categorieën) die de cao er zelf bij vermeldt.
  toonCaoTabelResultaat(periode, schaal, trede, resultaat) {
    const referenties = trede.referentiebedragen ?? [];

    if (trede.brutoPerMaand != null) {
      this.loonEl.textContent = `${geldFormatter.format(trede.brutoPerMaand)} per maand`;
      this.urenEl.textContent = `${periode.urenPerWeekVoltijd} uur per week`;
    } else {
      const primaire = referenties.find((r) => r.primair) ?? referenties[0];
      this.loonEl.textContent = primaire ? `${geldFormatter.format(primaire.bedrag)} (${primaire.label})` : "—";
      this.urenEl.textContent = primaire ? `${primaire.uren} uur (${primaire.label})` : "—";
    }

    const controleRegels = referenties
      .map((r) => `${geldFormatter.format(r.bedrag)} / ${r.uren} uur (${r.label}) = ${uurloonFormatter.format(r.bedrag / r.uren)}`)
      .join("; ");

    this.formuleEl.textContent =
      `Bruto uurloon rechtstreeks uit de cao-tabel (schaal ${schaal.schaal}, ${trede.label}): ` +
      `${uurloonFormatter.format(resultaat.kaalUurloon)} per uur.` +
      (controleRegels ? ` Ter controle: ${controleRegels}.` : "");
  }

  // Toont de opbouw van kaal bruto uurloon naar totaal bruto uurloon als
  // rekenregel-opstelling. Loopt generiek over resultaat.stappen heen, zodat
  // een nieuwe stap (eindejaarsuitkering, keuzebudget, ...) in
  // calculations.js hier automatisch verschijnt zonder wijziging in deze
  // functie.
  renderOpbouw(resultaat) {
    this.opbouwEl.innerHTML = "";

    const regels = [{ tekst: `Kaal bruto uurloon: ${uurloonFormatter.format(resultaat.kaalUurloon)}` }];

    for (const stap of resultaat.stappen) {
      regels.push({
        tekst: `${stap.label} (${this.toelichtingVoorStap(stap)}): + ${uurloonFormatter.format(stap.bedrag)}`,
        waarschuwing: stap.ontbreekt,
      });
    }

    regels.push({ tekst: `Totaal bruto uurloon: ${uurloonFormatter.format(resultaat.totaalUurloon)}`, totaal: true });

    for (const regel of regels) {
      const li = document.createElement("li");
      li.textContent = regel.tekst;
      if (regel.waarschuwing) li.classList.add("opbouw-waarschuwing");
      if (regel.totaal) li.classList.add("opbouw-totaal");
      this.opbouwEl.appendChild(li);
    }
  }

  // Bouwt de toelichtingstekst tussen haakjes voor één opbouwstap. Nieuwe
  // stapsoorten kunnen hier een eigen tak krijgen; calculations.js levert
  // alleen de kale getallen aan, deze functie verzorgt de opmaak/tekst.
  toelichtingVoorStap(stap) {
    if (stap.soort === "leeftijdsdagen" && stap.ontbreekt) {
      return "vul de leeftijd van de medewerker in";
    }
    if (stap.ontbreekt) {
      return "nog niet ingevuld in de cao-data";
    }
    if (stap.soort === "vrijeDagen" || stap.soort === "leeftijdsdagen") {
      return `${stap.dagen} dagen = ${urenFormatter.format(stap.vrijeUren)} uur over ${urenFormatter.format(stap.gewerkteUren)} gewerkte uren per jaar`;
    }
    if (stap.soort === "percentage") {
      return `${percentageFormatter.format(stap.percentage * 100)}%`;
    }
    return "";
  }
}

function werkVergelijkingBij(paneelA, paneelB) {
  const tekstEl = document.getElementById("comparison-text");
  const a = paneelA.huidigeBerekening;
  const b = paneelB.huidigeBerekening;

  if (!a || !b) {
    tekstEl.textContent = "Kies bij beide cao's een schaal en trede om te vergelijken.";
    return;
  }

  const { verschilAbsoluut, verschilPercentage } = vergelijkUurlonen(a.uurloon, b.uurloon);
  const richting = verschilAbsoluut === 0 ? "gelijk" : verschilAbsoluut > 0 ? "hoger" : "lager";
  const klasse = verschilAbsoluut > 0 ? "comparison-positive" : verschilAbsoluut < 0 ? "comparison-negative" : "";

  tekstEl.innerHTML =
    `Totaal bruto uurloon Cao B (${uurloonFormatter.format(b.uurloon)}/uur) is ` +
    `<span class="${klasse}">${uurloonFormatter.format(Math.abs(verschilAbsoluut))} per uur ${richting}</span> ` +
    `dan Cao A (${uurloonFormatter.format(a.uurloon)}/uur), ` +
    `oftewel <span class="${klasse}">${percentageFormatter.format(Math.abs(verschilPercentage))}% ${richting}</span>.`;
}

// Leeftijd van de medewerker, ingevuld in het leeftijdblok boven de
// vergelijking en gedeeld door beide panelen (voor de leeftijdsdagen-staffel).
let huidigeLeeftijd = null;

async function init() {
  let paneelA;
  let paneelB;
  const onChange = () => werkVergelijkingBij(paneelA, paneelB);
  const leeftijdOphalen = () => huidigeLeeftijd;

  paneelA = new CaoPaneel("a", onChange, { vastCaoId: CAO_A_ID, leeftijdOphalen });
  paneelB = new CaoPaneel("b", onChange, { uitgeslotenCaoIds: [CAO_A_ID], leeftijdOphalen });

  await paneelA.init();
  await paneelB.init();

  const leeftijdInput = document.getElementById("leeftijd-medewerker");
  leeftijdInput.addEventListener("input", () => {
    const waarde = parseInt(leeftijdInput.value, 10);
    huidigeLeeftijd = Number.isNaN(waarde) ? null : waarde;
    paneelA.werkResultaatBij();
    paneelB.werkResultaatBij();
  });
}

init();

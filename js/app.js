// UI-laag voor het cao-uurloonvergelijk. Alle rekenwerk staat in
// calculations.js — dit bestand vult alleen dropdowns en toont resultaten.

import { berekenKaalBrutoUurloon, vergelijkUurlonen } from "./calculations.js";

// Om een nieuwe cao toe te voegen: zet het JSON-bestand in data/ (zie
// data/README.md voor de structuur) en voeg hier een regel toe.
const CAO_BESTANDEN = [
  { id: "bedrijfsverzorgingsdiensten", bestand: "data/bedrijfsverzorgingsdiensten.json" },
  { id: "hoveniersbedrijf", bestand: "data/hoveniersbedrijf.json" },
];

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
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
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
class CaoPaneel {
  constructor(prefix, onChange) {
    this.prefix = prefix;
    this.onChange = onChange;

    this.caoSelect = document.getElementById(`${prefix}-cao`);
    this.periodeSelect = document.getElementById(`${prefix}-periode`);
    this.schaalSelect = document.getElementById(`${prefix}-schaal`);
    this.tredeSelect = document.getElementById(`${prefix}-trede`);

    const panel = document.querySelector(`[data-panel="${prefix}"]`);
    this.maandloonEl = panel.querySelector('[data-field="maandloon"]');
    this.urenPerWeekEl = panel.querySelector('[data-field="urenPerWeek"]');
    this.uurloonEl = panel.querySelector('[data-field="uurloon"]');
    this.formuleEl = panel.querySelector('[data-field="formule"]');

    this.huidigeCaoData = null;
    this.huidigeBerekening = null;

    this.caoSelect.addEventListener("change", () => this.opCaoGewijzigd());
    this.periodeSelect.addEventListener("change", () => this.opPeriodeGewijzigd());
    this.schaalSelect.addEventListener("change", () => this.opSchaalGewijzigd());
    this.tredeSelect.addEventListener("change", () => this.werkResultaatBij());
  }

  async init(standaardCaoId) {
    vulSelect(this.caoSelect, CAO_BESTANDEN, {
      value: (c) => c.id,
      label: (c) => c.id,
    });
    if (standaardCaoId) {
      this.caoSelect.value = standaardCaoId;
    }
    await this.opCaoGewijzigd();
  }

  async opCaoGewijzigd() {
    const caoId = this.caoSelect.value;
    this.huidigeCaoData = await laadCaoData(caoId);

    // De dropdown toonde tot nu toe de technische id; zet nu voor alle
    // opties het leesbare label.
    for (const optie of this.caoSelect.options) {
      const data = await laadCaoData(optie.value);
      optie.textContent = data.caoNaam;
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
      label: (t) => `Trede ${t.trede}`,
    });
    this.werkResultaatBij();
  }

  werkResultaatBij() {
    const periode = this.huidigePeriode();
    const schaal = this.huidigeSchaal();
    const trede = schaal.treden.find((t) => String(t.trede) === this.tredeSelect.value);

    const { uurloon, urenPerMaand } = berekenKaalBrutoUurloon(
      trede.brutoMaandloon,
      periode.urenPerWeekVoltijd
    );

    this.maandloonEl.textContent = geldFormatter.format(trede.brutoMaandloon);
    this.urenPerWeekEl.textContent = `${periode.urenPerWeekVoltijd} uur`;
    this.uurloonEl.textContent = uurloonFormatter.format(uurloon);
    this.formuleEl.textContent =
      `${geldFormatter.format(trede.brutoMaandloon)} / ` +
      `((${periode.urenPerWeekVoltijd} uur x 52) / 12 = ${urenPerMaand.toFixed(2)} uur/maand) ` +
      `= ${uurloonFormatter.format(uurloon)} per uur`;

    this.huidigeBerekening = {
      caoNaam: this.huidigeCaoData.caoNaam,
      schaal: schaal.schaal,
      trede: trede.trede,
      uurloon,
    };

    this.onChange();
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
    `Cao B (${uurloonFormatter.format(b.uurloon)}/uur) is ` +
    `<span class="${klasse}">${uurloonFormatter.format(Math.abs(verschilAbsoluut))} per uur ${richting}</span> ` +
    `dan Cao A (${uurloonFormatter.format(a.uurloon)}/uur), ` +
    `oftewel <span class="${klasse}">${percentageFormatter.format(Math.abs(verschilPercentage))}% ${richting}</span>.`;
}

async function init() {
  let paneelA;
  let paneelB;
  const onChange = () => werkVergelijkingBij(paneelA, paneelB);

  paneelA = new CaoPaneel("a", onChange);
  paneelB = new CaoPaneel("b", onChange);

  await paneelA.init();
  // Standaard Cao B op de tweede beschikbare cao zetten, zodat de twee
  // panelen niet identiek starten.
  const standaardCaoB = CAO_BESTANDEN.length > 1 ? CAO_BESTANDEN[1].id : undefined;
  await paneelB.init(standaardCaoB);
}

init();

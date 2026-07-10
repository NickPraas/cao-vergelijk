# Cao-data invullen

Elk bestand in deze map is één cao. De bestandsnaam (zonder `.json`) wordt als
`caoId` gebruikt en moet overeenkomen met het `caoId`-veld in het bestand en
met de lijst in `js/app.js` (zie onderaan dit document).

Alle bedragen en percentages staan nu op `0` of `0.00` als duidelijk
herkenbare placeholder. Zoek-en-vervang die met de echte cao-waarden.

## Bestandsstructuur

```json
{
  "caoId": "bedrijfsverzorgingsdiensten",
  "caoNaam": "Cao Bedrijfsverzorgingsdiensten",
  "periodes": [ { ... } ]
}
```

| Veld | Uitleg |
|---|---|
| `caoId` | Technische sleutel, gelijk aan de bestandsnaam zonder `.json`. Niet wijzigen tenzij je ook de bestandsnaam en de verwijzing in `js/app.js` aanpast. |
| `caoNaam` | De naam die in de dropdown op de site wordt getoond. |
| `periodes` | Lijst van geldigheidsperiodes van deze cao, zie hieronder. Nieuwste periode mag bovenaan of onderaan staan — de site kiest zelf automatisch de periode met de meest recente `ingangsdatum` als standaardkeuze. |

## Een periode toevoegen (bij een cao-wijziging)

Kopieer een bestaand periode-object binnen `periodes`, geef het de juiste
`ingangsdatum`/`einddatum` en vul de nieuwe salaristabel en parameters in.
Oude periodes laat je gewoon staan — zo blijft de vergelijking ook voor
eerdere jaren mogelijk.

### Velden per periode

| Veld | Uitleg |
|---|---|
| `ingangsdatum` | Eerste geldigheidsdag van deze periode, formaat `YYYY-MM-DD`. |
| `einddatum` | Laatste geldigheidsdag van deze periode, formaat `YYYY-MM-DD`. Gebruik een datum ver in de toekomst (bijv. `2099-12-31`) als er nog geen einddatum bekend is. |
| `urenPerWeekVoltijd` | De normale (voltijd) arbeidsduur per week volgens de cao, bijv. `38` of `40`. Dit getal wordt gebruikt om het bruto maandloon om te rekenen naar een bruto uurloon. |
| `vakantiedagenPerJaar` | Aantal wettelijke + bovenwettelijke vakantiedagen per jaar bij een voltijd dienstverband, bijv. `25`. Wordt gebruikt in de berekening (omgerekend naar vakantie-uren via `urenPerWeekVoltijd / 5`, dus uitgaand van een 5-daagse werkweek). Ontbreekt dit veld of staat het op `0`, dan toont de site de vakantiedagen-regel met € 0,00 en een melding dat de parameter nog niet is ingevuld. |
| `feestdagenPerJaar` | Aantal betaalde feestdagen per jaar volgens de cao, bijv. `6`. Wordt op dezelfde manier gebruikt als `vakantiedagenPerJaar` (zie hierboven): beide tellen mee in dezelfde gewerkte-uren-noemer, omdat ze allebei doorbetaalde, niet-gewerkte dagen zijn. Ontbreekt dit veld of staat het op `0`, dan toont de site de feestdagen-regel met € 0,00 en een melding dat de parameter nog niet is ingevuld. |
| `vakantiegeldPercentage` | Vakantietoeslag als fractie van het kale bruto uurloon, bijv. `0.08` voor 8% of `0.0825` voor 8,25%. Wordt gebruikt in de berekening: ontbreekt dit veld of staat het op `0`, dan toont de site de vakantiegeld-regel met € 0,00 en een melding dat de parameter nog niet is ingevuld. |
| `eindejaarsuitkeringPercentage` | Eindejaarsuitkering/13e maand als fractie van het jaarloon, bijv. `0.05` voor 5%. **Nog niet gebruikt.** |
| `keuzebudgetPercentage` | Keuzebudget/persoonlijk budget als fractie van het jaarloon (vaak een optelsom van meerdere cao-toeslagen). **Nog niet gebruikt.** |
| `leeftijdsdagen` | Staffel van extra vrije dagen op basis van leeftijd, zie hieronder. Wordt gebruikt zodra de bezoeker een leeftijd invult in het leeftijdblok boven de vergelijking. |
| `salaristabel` | Lijst van loonschalen, zie hieronder. |

### `leeftijdsdagen` (staffel)

Lijst van objecten, één per drempelleeftijd:

```json
{ "vanafLeeftijd": 55, "extraDagenPerJaar": 2 }
```

- `vanafLeeftijd`: leeftijd (in jaren) vanaf wanneer de extra dagen gelden.
- `extraDagenPerJaar`: aantal extra vrije dagen per jaar vanaf die leeftijd.

Voeg voor elke drempel uit de cao een apart object toe. Van toepassing is
steeds de stap met de hoogste `vanafLeeftijd` die de ingevulde leeftijd niet
overschrijdt (dus geen optelling van meerdere stappen) — bijv. bij
leeftijd 61 met drempels op 60 en 63 geldt de drempel van 60. Heeft de cao
geen leeftijdsdagen, laat dan één object staan met `extraDagenPerJaar: 0`;
de site toont dan geen leeftijdsdagen-regel in de opbouw voor deze cao,
ongeacht de ingevulde leeftijd. Heeft de cao wél een staffel maar heeft de
bezoeker nog geen leeftijd ingevuld, dan toont de site de regel met € 0,00
en een melding om de leeftijd in te vullen.

### `salaristabel` (schalen en treden)

De meeste cao's geven gewoon een bruto **maandloon** per schaal/trede — de
site berekent daaruit zelf het uurloon (zie hierboven). Sommige cao's
(bijv. Bedrijfsverzorgingsdiensten) betalen per 4 weken uit en zetten het
bruto uurloon al kant-en-klaar in hun eigen tabel. Beide vormen kunnen
naast elkaar bestaan, per trede kies je één van de twee.

#### Variant 1: maandloon (site berekent het uurloon)

```json
{
  "schaal": "4",
  "treden": [
    { "trede": 0, "label": "Trede 0", "brutoMaandloon": 2450.00 },
    { "trede": 1, "label": "Trede 1", "brutoMaandloon": 2510.00 }
  ]
}
```

- `schaal`: naam/nummer van de loonschaal zoals in de cao-tekst (mag een
  getal of letter zijn, bijv. `"4"` of `"A"`), als tekst.
- `treden`: lijst van treden binnen die schaal, oplopend.
  - `trede`: tredenummer zoals in de cao-tabel (getal; gebruik negatieve
    getallen voor aanloopschalen, zie variant 2).
  - `label`: het label dat in de dropdown op de site verschijnt, bijv.
    `"Trede 0"` of `"Aanloop -3"`.
  - `brutoMaandloon`: het bruto maandloon bij een voltijd dienstverband
    (`urenPerWeekVoltijd`) voor deze schaal/trede, in euro's met twee
    decimalen. De site berekent hieruit het uurloon met
    `brutoMaandloon / ((urenPerWeekVoltijd × 52) / 12)`.

#### Variant 2: bruto uurloon rechtstreeks uit de cao-tabel

Gebruik dit wanneer de cao zelf al een kolom met het bruto uurloon geeft, in
plaats van (alleen) een maandloon. Komt in twee smaken voor, die hetzelfde
werken:

- **Bedrijfsverzorgingsdiensten**: betaalt per 4 weken uit, in meerdere
  arbeidstijd-categorieën (A/B/C) die toevallig allemaal tot hetzelfde
  uurloon herleiden.
- **Hoveniersbedrijf**: geeft één bedrag per uur/week/4 weken/maand, waarbij
  week en 4-weken-bedrag exact tot hetzelfde uurloon herleiden.

De site rekent in beide gevallen niets uit: `brutoUurloon` wordt letterlijk
overgenomen. Per trede:

```json
{
  "trede": 0,
  "label": "Trede 0",
  "brutoUurloon": 14.90,
  "brutoPerMaand": 2451.10,
  "referentiebedragen": [
    { "label": "per week", "bedrag": 563.88, "uren": 37 },
    { "label": "per 4 weken", "bedrag": 2255.52, "uren": 148 }
  ]
}
```

- `brutoUurloon`: het bruto uurloon zoals de cao het zelf vermeldt. Zodra
  dit veld op een trede staat, gebruikt de site dit direct en negeert het
  `brutoMaandloon`/`urenPerWeekVoltijd`.
- `brutoPerMaand` *(optioneel)*: als de cao ook een maandbedrag noemt, zet
  dat hier — de site toont dit dan als hoofdcijfer bij "Loon volgens
  cao-tabel", samen met `urenPerWeekVoltijd` als "Uren behorend bij dit
  loon". Laat dit veld weg als de cao geen maandbedrag geeft (zoals
  Bedrijfsverzorgingsdiensten); de site valt dan terug op de eerste
  `referentiebedragen`-regel (of de regel met `"primair": true`, zie
  hieronder) als hoofdcijfer.
- `referentiebedragen`: lijst van `{ label, bedrag, uren }` — elk zo'n
  bedrag gedeeld door zijn eigen uren moet weer het `brutoUurloon`
  opleveren. Dit is puur voor transparantie: de site toont ze op de
  "Ter controle: ..."-regel zodat je de herleiding 1-op-1 kunt teruglezen
  naar de officiële cao-tabel. Gebruik hiervoor alleen bedragen waarvan het
  urenaantal *onafhankelijk* vaststaat (bijv. de vaste voltijd-week, of een
  door de cao genoemde arbeidstijd-categorie) — geen bedragen waarvan je de
  uren zelf zou moeten terugrekenen uit het uurloon, want dan bewijst de
  controle niets. Zet `"primair": true` op één regel om aan te geven welke
  als hoofdcijfer moet gelden wanneer `brutoPerMaand` ontbreekt.

Voeg voor elke schaal uit de officiële cao-tabel een object toe aan
`salaristabel`, en voor elke schaal alle bijbehorende treden.

## Een nieuwe cao toevoegen

1. Maak een nieuw bestand `data/<jouw-cao-id>.json` met dezelfde structuur
   als hierboven.
2. Voeg de cao toe aan de lijst `CAO_BESTANDEN` bovenaan `js/app.js`, met
   dezelfde `id` als het `caoId`-veld in je nieuwe bestand.

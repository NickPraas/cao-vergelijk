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
| `vakantiedagenPerJaar` | Aantal wettelijke + bovenwettelijke vakantiedagen per jaar bij een voltijd dienstverband. **Nog niet gebruikt in de berekening**, alvast opnemen voor een latere uitbreiding. |
| `feestdagenPerJaar` | Aantal betaalde feestdagen per jaar volgens de cao. **Nog niet gebruikt.** |
| `vakantiegeldPercentage` | Vakantietoeslag als fractie van het jaarloon, bijv. `0.08` voor 8%. **Nog niet gebruikt.** |
| `eindejaarsuitkeringPercentage` | Eindejaarsuitkering/13e maand als fractie van het jaarloon, bijv. `0.05` voor 5%. **Nog niet gebruikt.** |
| `keuzebudgetPercentage` | Keuzebudget/persoonlijk budget als fractie van het jaarloon (vaak een optelsom van meerdere cao-toeslagen). **Nog niet gebruikt.** |
| `leeftijdsdagen` | Staffel van extra vrije dagen op basis van leeftijd, zie hieronder. **Nog niet gebruikt.** |
| `salaristabel` | Lijst van loonschalen, zie hieronder. |

### `leeftijdsdagen` (staffel)

Lijst van objecten, één per drempelleeftijd:

```json
{ "vanafLeeftijd": 55, "extraDagenPerJaar": 2 }
```

- `vanafLeeftijd`: leeftijd (in jaren) vanaf wanneer de extra dagen gelden.
- `extraDagenPerJaar`: aantal extra vrije dagen per jaar vanaf die leeftijd.

Voeg voor elke drempel uit de cao een apart object toe. Heeft de cao geen
leeftijdsdagen, laat dan één object staan met `extraDagenPerJaar: 0`.

### `salaristabel` (schalen en treden)

```json
{
  "schaal": "4",
  "treden": [
    { "trede": 0, "brutoMaandloon": 2450.00 },
    { "trede": 1, "brutoMaandloon": 2510.00 }
  ]
}
```

- `schaal`: naam/nummer van de loonschaal zoals in de cao-tekst (mag een
  getal of letter zijn, bijv. `"4"` of `"A"`), als tekst.
- `treden`: lijst van treden binnen die schaal, oplopend.
  - `trede`: tredenummer zoals in de cao-tabel.
  - `brutoMaandloon`: het bruto maandloon bij een voltijd dienstverband
    (`urenPerWeekVoltijd`) voor deze schaal/trede, in euro's met twee
    decimalen.

Voeg voor elke schaal uit de officiële cao-tabel een object toe aan
`salaristabel`, en voor elke schaal alle bijbehorende treden.

## Een nieuwe cao toevoegen

1. Maak een nieuw bestand `data/<jouw-cao-id>.json` met dezelfde structuur
   als hierboven.
2. Voeg de cao toe aan de lijst `CAO_BESTANDEN` bovenaan `js/app.js`, met
   dezelfde `id` als het `caoId`-veld in je nieuwe bestand.

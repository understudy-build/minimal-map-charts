# Licences

## Code

MIT License

Copyright (c) 2026 Nicolas Toulemont

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Map geometry

The MIT licence covers the code, not the boundaries in `dist/data/`. Every sheet is simplified and re-projected from its sources and stays under their licences. Natural Earth, in the public domain, draws the world and region sheets, every country's outline, the disputed land the [borders policy](docs/data.md#borders) moves between countries, and 121 national sheets. The other 91 national sheets keep the licences in the table below.

`draw` returns a map's sources in `scene.credits`, and `cite(credit)` writes the line each source's licence asks for: the publisher and date, "simplified and re-projected", each licence with its address, and for ODbL sources where the derived data can be downloaded. `svg()` prints these lines under every map. A renderer of your own should print `scene.credits.map(cite)` next to every map it draws.

### What a map needs

- Public domain and CC0: nothing.
- CC BY 4.0, CC BY 3.0 IGO, the Open Government Licence v3.0, Licence Ouverte 2.0, KOGL Type 1, the Central Bureau of Statistics Curaçao's terms and the Estonian Land and Spatial Development Board's terms: a credit that names the source, says the shapes were changed and gives the licence's address.
- ODbL 1.0: that credit, and where the derived data can be downloaded (ODbL 4.3 and 4.6). Share-alike (ODbL 4.4) binds the data, not what is drawn from it: a map is a Produced Work and "does not create a Derivative Database" (4.5 b), so your images, values and code stay under your own terms. If you change an ODbL sheet's shapes and publish maps or data from the result, publish your changed sheet under the ODbL too.

A web app that bundles this package sends the sheets themselves to its visitors. Each sheet's credit, with its licence and that licence's address, ships in the package's code, so a bundle keeps it.

### Sheets by licence

The sheets drawn from a source other than Natural Earth, by country code. A test checks this table against each sheet's credit.

| Sheet | Country                  | Publisher                                                                                                      | Licences                           |
| ----- | ------------------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| AGO   | Angola                   | World Bank                                                                                                     | CC BY 4.0                          |
| ARE   | United Arab Emirates     | geoBoundaries / OpenStreetMap contributors                                                                     | ODbL 1.0                           |
| AZE   | Azerbaijan               | Overture / OpenStreetMap contributors                                                                          | ODbL 1.0                           |
| BDI   | Burundi                  | OCHA / Bureau de Centralisation de Géomatique (BCG)                                                            | CC BY 3.0 IGO                      |
| BFA   | Burkina Faso             | OCHA / Institut Geographique Burkina (IGB)                                                                     | CC BY 3.0 IGO                      |
| BGD   | Bangladesh               | geoBoundaries                                                                                                  | CC0                                |
| BHR   | Bahrain                  | geoBoundaries / OpenStreetMap contributors                                                                     | ODbL 1.0                           |
| BHS   | Bahamas                  | geoBoundaries                                                                                                  | CC BY 4.0                          |
| BIH   | Bosnia & Herzegovina     | geoBoundaries                                                                                                  | CC0                                |
| BWA   | Botswana                 | Overture / OpenStreetMap contributors / Esri Community Maps                                                    | ODbL 1.0; CC BY 4.0                |
| CAF   | Central African Republic | OCHA / ICASEES                                                                                                 | CC BY 3.0 IGO                      |
| CHN   | China                    | geoBoundaries                                                                                                  | CC0                                |
| CIV   | Côte d’Ivoire            | OCHA / Comité National de Télédétection et d'Information Géographique (CNTIG)                                  | CC BY 3.0 IGO                      |
| COD   | Congo - Kinshasa         | OCHA / Referenciel Géographique Commun                                                                         | CC BY 3.0 IGO                      |
| CUW   | Curaçao                  | Central Bureau of Statistics Curaçao / Overture / OpenStreetMap contributors                                   | ODbL 1.0; CBS attribution terms    |
| CYM   | Cayman Islands           | Overture / OpenStreetMap contributors                                                                          | ODbL 1.0                           |
| CYP   | Cyprus                   | geoBoundaries / OpenStreetMap contributors                                                                     | ODbL 1.0                           |
| DZA   | Algeria                  | GeoAlgeria / OpenStreetMap contributors                                                                        | ODbL 1.0                           |
| EST   | Estonia                  | Estonian Land and Spatial Development Board                                                                    | Free use with credit               |
| ETH   | Ethiopia                 | OCHA / CSA (Central Statistics Agency) + Regional Bureau of Finance and Economic Development (BoFED)           | CC BY 3.0 IGO                      |
| FIN   | Finland                  | Statistics Finland                                                                                             | CC BY 4.0                          |
| FRO   | Faroe Islands            | Overture / OpenStreetMap contributors / Esri Community Maps                                                    | ODbL 1.0; CC BY 4.0                |
| GBR   | United Kingdom           | Office for National Statistics. Contains OS data © Crown copyright and database right 2025                     | Open Government Licence v3.0       |
| GHA   | Ghana                    | OCHA / Ghana Statistical Services (GSS)                                                                        | CC BY 3.0 IGO                      |
| GNQ   | Equatorial Guinea        | Overture / OpenStreetMap contributors                                                                          | ODbL 1.0                           |
| GRL   | Greenland                | Overture / OpenStreetMap contributors / Esri Community Maps                                                    | ODbL 1.0; CC BY 4.0                |
| GUM   | Guam                     | Overture / OpenStreetMap contributors                                                                          | ODbL 1.0                           |
| IDN   | Indonesia                | Deny Herianto                                                                                                  | CC BY 4.0                          |
| IMN   | Isle of Man              | Overture / OpenStreetMap contributors                                                                          | ODbL 1.0                           |
| IRL   | Ireland                  | Tailte Éireann                                                                                                 | CC BY 4.0                          |
| IRQ   | Iraq                     | Overture / OpenStreetMap contributors / Esri Community Maps                                                    | ODbL 1.0; CC BY 4.0                |
| ISR   | Israel                   | geoBoundaries                                                                                                  | CC0                                |
| KAZ   | Kazakhstan               | OCHA / UNHCR / OpenStreetMap contributors                                                                      | ODbL 1.0                           |
| KEN   | Kenya                    | OCHA / IEBC                                                                                                    | CC BY 3.0 IGO                      |
| KGZ   | Kyrgyzstan               | OCHA / Ministry of Emergency Situations of the Kyrgyz Republic                                                 | CC BY 3.0 IGO                      |
| KHM   | Cambodia                 | OCHA / Department of Geography of the Ministry of Land Management, Urbanization and Construction in 2008, WFP  | CC BY 3.0 IGO                      |
| KIR   | Kiribati                 | geoBoundaries / OpenStreetMap contributors                                                                     | ODbL 1.0                           |
| KOR   | South Korea              | Statistics Korea SGIS / vuski/admdongkor                                                                       | CC BY 4.0; upstream KOGL Type 1    |
| LAO   | Laos                     | OCHA / National Geographic Department (NGD)                                                                    | CC BY 3.0 IGO                      |
| LBN   | Lebanon                  | geoBoundaries                                                                                                  | CC0                                |
| LCA   | St. Lucia                | geoBoundaries                                                                                                  | CC0                                |
| LUX   | Luxembourg               | Administration du cadastre et de la topographie                                                                | CC0                                |
| LVA   | Latvia                   | geoBoundaries / Geoportal of Latvia                                                                            | CC BY 4.0                          |
| MAC   | Macao SAR China          | Overture / OpenStreetMap contributors                                                                          | ODbL 1.0                           |
| MAF   | St. Martin               | IGN / Insee                                                                                                    | Licence Ouverte 2.0                |
| MAR   | Morocco                  | Overture / OpenStreetMap contributors / Esri Community Maps                                                    | ODbL 1.0; CC BY 4.0                |
| MCO   | Monaco                   | Overture / OpenStreetMap contributors                                                                          | ODbL 1.0                           |
| MDA   | Moldova                  | geoBoundaries                                                                                                  | CC BY 3.0 IGO                      |
| MDG   | Madagascar               | OCHA / Bureau National de Gestion des Risuqes et Catastrphe (BNGRC)                                            | CC BY 3.0 IGO                      |
| MDV   | Maldives                 | geoBoundaries / OpenStreetMap contributors                                                                     | ODbL 1.0                           |
| MHL   | Marshall Islands         | geoBoundaries / OpenStreetMap contributors                                                                     | ODbL 1.0                           |
| MKD   | North Macedonia          | geoBoundaries / NTES                                                                                           | CC BY 4.0                          |
| MLI   | Mali                     | OCHA / Mali Institut Géographique (IGM)                                                                        | CC BY 3.0 IGO                      |
| MLT   | Malta                    | geoBoundaries / Malta Address Registrar                                                                        | Public domain                      |
| MMR   | Myanmar (Burma)          | OCHA / Myanmar Information Management Unit (MIMU)                                                              | CC BY 3.0 IGO                      |
| MNE   | Montenegro               | Overture / OpenStreetMap contributors                                                                          | ODbL 1.0                           |
| MNP   | Northern Mariana Islands | Overture / OpenStreetMap contributors                                                                          | ODbL 1.0                           |
| MRT   | Mauritania               | OCHA / Agence Nationale de la Statistique, de l'Analyse Démographique et Economique (ANSADE)                   | CC BY 3.0 IGO                      |
| MUS   | Mauritius                | geoBoundaries / OpenStreetMap contributors                                                                     | ODbL 1.0                           |
| NAM   | Namibia                  | OCHA / Namibia Statistics Agency (NSA)                                                                         | CC BY 3.0 IGO                      |
| NOR   | Norway                   | Kartverket                                                                                                     | CC BY 4.0                          |
| NPL   | Nepal                    | OCHA / Survey Department of Nepal (http://ngiip.gov.np/index.php), UN Resident Coordinators Office in Nepal (h | CC BY 3.0 IGO                      |
| PAK   | Pakistan                 | geoBoundaries                                                                                                  | CC0                                |
| PAN   | Panama                   | Overture / OpenStreetMap contributors                                                                          | ODbL 1.0                           |
| PHL   | Philippines              | NAMRIA / PSA via bendlikeabamboo                                                                               | CC BY 3.0 IGO                      |
| PNG   | Papua New Guinea         | OCHA / Papua New Guinea National Statistics Office                                                             | CC BY 3.0 IGO                      |
| PRI   | Puerto Rico              | Overture / OpenStreetMap contributors                                                                          | ODbL 1.0                           |
| PRK   | North Korea              | Overture / OpenStreetMap contributors / Esri Community Maps                                                    | ODbL 1.0; CC BY 4.0                |
| PSE   | Palestinian Territories  | geoBoundaries                                                                                                  | CC BY 4.0                          |
| QAT   | Qatar                    | OCHA / Qatar planning and statistics authority                                                                 | CC BY 3.0 IGO                      |
| RUS   | Russia                   | Overture / OpenStreetMap contributors / Esri Community Maps / Maps Entity Variant Names                        | ODbL 1.0; CC BY 4.0                |
| SDN   | Sudan                    | OCHA / Information Management Working Group (IMWG), OCHA                                                       | CC BY 3.0 IGO                      |
| SLE   | Sierra Leone             | OCHA / Government of Sierra Leone                                                                              | CC BY 3.0 IGO                      |
| SOM   | Somalia                  | geoBoundaries / OpenStreetMap contributors                                                                     | ODbL 1.0                           |
| SSD   | South Sudan              | Overture / OpenStreetMap contributors / Esri Community Maps / OCHA / Information Management Working Group      | ODbL 1.0; CC BY 4.0; CC BY 3.0 IGO |
| STP   | São Tomé & Príncipe      | geoBoundaries / OpenStreetMap contributors                                                                     | ODbL 1.0                           |
| SVN   | Slovenia                 | Geodetska uprava Republike Slovenije                                                                           | CC BY 4.0                          |
| SYC   | Seychelles               | Overture / OpenStreetMap contributors / Esri Community Maps                                                    | ODbL 1.0; CC BY 4.0                |
| SYR   | Syria                    | geoBoundaries                                                                                                  | CC BY 3.0 IGO                      |
| TCD   | Chad                     | OCHA / Institut National de la Statistique, des Etudes Economiques et Démographiques du Tchad                  | CC BY 3.0 IGO                      |
| TKM   | Turkmenistan             | Overture / OpenStreetMap contributors / Esri Community Maps                                                    | ODbL 1.0; CC BY 4.0                |
| TLS   | Timor-Leste              | OCHA / WHO                                                                                                     | CC BY 3.0 IGO                      |
| TUN   | Tunisia                  | OCHA / Institut National de la Statistique Tunisie                                                             | CC BY 3.0 IGO                      |
| TUV   | Tuvalu                   | Overture / OpenStreetMap contributors                                                                          | ODbL 1.0                           |
| TZA   | Tanzania                 | OCHA / Tanzania National Bureau of Statistics / UN OCHA ROSA                                                   | CC BY 3.0 IGO                      |
| UGA   | Uganda                   | OCHA / Uganda Bureau of Statistics with support from WHO                                                       | CC BY 3.0 IGO                      |
| UKR   | Ukraine                  | Overture / OpenStreetMap contributors / Esri Community Maps                                                    | ODbL 1.0; CC BY 4.0                |
| VGB   | British Virgin Islands   | Overture / OpenStreetMap contributors                                                                          | ODbL 1.0                           |
| VNM   | Vietnam                  | OCHA / General Statistics Office of Vietnam (GSO)                                                              | CC BY 3.0 IGO                      |
| XKX   | Kosovo                   | Overture / OpenStreetMap contributors                                                                          | ODbL 1.0                           |
| YEM   | Yemen                    | OCHA / Central Statistical Organization (CSO)                                                                  | CC BY 3.0 IGO                      |

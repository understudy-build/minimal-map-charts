// ISO 3166-2 codes for areas whose source gives none the build can trust,
// by sheet and source code. Each was matched by name against
// iso-3166-2.json and reviewed: the comment is the sheet's name, then the
// reference's when it differs. On a sheet drawn after a reform ISO has not
// caught up with, only areas whose land the reform left alone have a code.
// The build fails if a code here is not in the reference or two areas on a
// sheet share one.
import type { Country } from "../../src/countries.ts"

export const mapped: Partial<Record<Country, Readonly<Record<string, string>>>> = {
  // france
  FRA: {
    "FR-COR": "FR-20R", // Corse
    "FR-GUA": "FR-971", // Guadeloupe
    "FR-MTQ": "FR-972", // Martinique
    "FR-GUF": "FR-973", // Guyane française: Guyane (française)
    "FR-LRE": "FR-974", // Réunion: La Réunion
    "FR-MAY": "FR-976", // Mayotte
  },
  // spain
  ESP: {
    "ES.AN": "ES-AN", // Andalucía
    "ES.AR": "ES-AR", // Aragón
    "ES.AS": "ES-AS", // Asturias: Asturias, Principado de
    "ES.CB": "ES-CB", // Cantabria
    "ES.CL": "ES-CL", // Castilla y León
    "ES.CM": "ES-CM", // Castilla-La Mancha
    "ES.CN": "ES-CN", // Canary Is.: Canarias
    "ES.CT": "ES-CT", // Cataluña: Catalunya [Cataluña]
    "ES.EX": "ES-EX", // Extremadura
    "ES.GA": "ES-GA", // Galicia: Galicia [Galicia]
    "ES.PM": "ES-IB", // Islas Baleares: Illes Balears [Islas Baleares]
    "ES.MU": "ES-MC", // Murcia: Murcia, Región de
    "ES.MD": "ES-MD", // Madrid: Madrid, Comunidad de
    "ES.NA": "ES-NC", // Foral de Navarra: Navarra, Comunidad Foral de
    "ES.PV": "ES-PV", // País Vasco
    "ES.LO": "ES-RI", // La Rioja
    "ES.VC": "ES-VC", // Valenciana: Valenciana, Comunidad
  },
  // poland
  POL: {
    "PL-DS": "PL-02", // Lower Silesian: Dolnośląskie
    "PL-KP": "PL-04", // Kuyavian-Pomeranian: Kujawsko-Pomorskie
    "PL-LU": "PL-06", // Lublin: Lubelskie
    "PL-LB": "PL-08", // Lubusz: Lubuskie
    "PL-LD": "PL-10", // Łódź: Łódzkie
    "PL-MA": "PL-12", // Lesser Poland: Małopolskie
    "PL-MZ": "PL-14", // Masovian: Mazowieckie
    "PL-OP": "PL-16", // Opole: Opolskie
    "PL-PK": "PL-18", // Subcarpathian: Podkarpackie
    "PL-PD": "PL-20", // Podlachian: Podlaskie
    "PL-PM": "PL-22", // Pomeranian: Pomorskie
    "PL-SL": "PL-24", // Silesian: Śląskie
    "PL-SK": "PL-26", // Świętokrzyskie
    "PL-WN": "PL-28", // Warmian-Masurian: Warmińsko-Mazurskie
    "PL-WP": "PL-30", // Greater Poland: Wielkopolskie
    "PL-ZP": "PL-32", // West Pomeranian: Zachodniopomorskie
  },
  // south-africa
  ZAF: {
    "ZA-GT": "ZA-GP", // Gauteng
    "ZA-NL": "ZA-KZN", // KwaZulu-Natal: Kwazulu-Natal
  },
  // czechia
  CZE: {
    "CZ-PR": "CZ-10", // Prague: Praha, Hlavní město
    "CZ-ST": "CZ-20", // Středočeský: Středočeský kraj
    "CZ-JC": "CZ-31", // Jihočeský: Jihočeský kraj
    "CZ-PL": "CZ-32", // Plzeňský: Plzeňský kraj
    "CZ-KA": "CZ-41", // Karlovarský: Karlovarský kraj
    "CZ-US": "CZ-42", // Ústecký: Ústecký kraj
    "CZ-LI": "CZ-51", // Liberecký: Liberecký kraj
    "CZ-KR": "CZ-52", // Královéhradecký: Královéhradecký kraj
    "CZ-PA": "CZ-53", // Pardubický: Pardubický kraj
    "CZ-VY": "CZ-63", // Vysočina: Kraj Vysočina
    "CZ-JM": "CZ-64", // Jihomoravský: Jihomoravský kraj
    "CZ-OL": "CZ-71", // Olomoucký: Olomoucký kraj
    "CZ-ZL": "CZ-72", // Zlínský: Zlínský kraj
    "CZ-MO": "CZ-80", // Moravskoslezský: Moravskoslezský kraj
  },
  // united-kingdom
  GBR: {
    TLN: "GB-NIR", // Northern Ireland
    TLM: "GB-SCT", // Scotland
    TLL: "GB-WLS", // Wales: Wales [Cymru GB-CYM]
  },
  // mexico
  MEX: {
    "MX-DIF": "MX-CMX", // Ciudad de México
  },
  // greece
  GRC: {
    "GR-A1": "GR-I", // Attica: Attikí
  },
  // ireland
  IRL: {
    "CLARE COUNTY COUNCIL": "IE-CE", // Clare County: Clare
    "CAVAN COUNTY COUNCIL": "IE-CN", // Cavan County: Cavan
    "CARLOW COUNTY COUNCIL": "IE-CW", // Carlow County: Carlow
    "DONEGAL COUNTY COUNCIL": "IE-DL", // Donegal County: Donegal
    "KILDARE COUNTY COUNCIL": "IE-KE", // Kildare County: Kildare
    "KILKENNY COUNTY COUNCIL": "IE-KK", // Kilkenny County: Kilkenny
    "KERRY COUNTY COUNCIL": "IE-KY", // Kerry County: Kerry
    "LONGFORD COUNTY COUNCIL": "IE-LD", // Longford County: Longford
    "LOUTH COUNTY COUNCIL": "IE-LH", // Louth County: Louth
    "LIMERICK CITY AND COUNTY COUNCIL": "IE-LK", // Limerick City and County: Limerick
    "LEITRIM COUNTY COUNCIL": "IE-LM", // Leitrim County: Leitrim
    "LAOIS COUNTY COUNCIL": "IE-LS", // Laois County: Laois
    "MEATH COUNTY COUNCIL": "IE-MH", // Meath County: Meath
    "MONAGHAN COUNTY COUNCIL": "IE-MN", // Monaghan County: Monaghan
    "MAYO COUNTY COUNCIL": "IE-MO", // Mayo County: Mayo
    "OFFALY COUNTY COUNCIL": "IE-OY", // Offaly County: Offaly
    "ROSCOMMON COUNTY COUNCIL": "IE-RN", // Roscommon County: Roscommon
    "SLIGO COUNTY COUNCIL": "IE-SO", // Sligo County: Sligo
    "TIPPERARY COUNTY COUNCIL": "IE-TA", // Tipperary County: Tipperary
    "WATERFORD CITY AND COUNTY COUNCIL": "IE-WD", // Waterford City and County: Waterford
    "WESTMEATH COUNTY COUNCIL": "IE-WH", // Westmeath County: Westmeath
    "WICKLOW COUNTY COUNCIL": "IE-WW", // Wicklow County: Wicklow
    "WEXFORD COUNTY COUNCIL": "IE-WX", // Wexford County: Wexford
  },
  // guatemala
  GTM: {
    "GT-GU": "GT-01", // Guatemala
    "GT-PR": "GT-02", // El Progreso
    "GT-SA": "GT-03", // Sacatepéquez
    "GT-CM": "GT-04", // Chimaltenango
    "GT-ES": "GT-05", // Escuintla
    "GT-SR": "GT-06", // Santa Rosa
    "GT-SO": "GT-07", // Sololá
    "GT-TO": "GT-08", // Totonicapán
    "GT-QZ": "GT-09", // Quetzaltenango
    "GT-SU": "GT-10", // Suchitepéquez
    "GT-RE": "GT-11", // Retalhuleu
    "GT-SM": "GT-12", // San Marcos
    "GT-HU": "GT-13", // Huehuetenango
    "GT-QC": "GT-14", // Quiché
    "GT-BV": "GT-15", // Baja Verapaz
    "GT-AV": "GT-16", // Alta Verapaz
    "GT-PE": "GT-17", // Petén
    "GT-IZ": "GT-18", // Izabal
    "GT-ZA": "GT-19", // Zacapa
    "GT-CQ": "GT-20", // Chiquimula
    "GT-JA": "GT-21", // Jalapa
    "GT-JU": "GT-22", // Jutiapa
  },
  // norway
  NOR: {
    "03": "NO-03", // Oslo
    "11": "NO-11", // Rogaland
    "15": "NO-15", // Møre og Romsdal
    "18": "NO-18", // Nordland
    "34": "NO-34", // Innlandet
    "42": "NO-42", // Agder
    "46": "NO-46", // Vestland
    "50": "NO-50", // Trøndelag
  },
  // finland
  FIN: {
    "21": "FI-01", // Åland: Landskapet Åland
    "09": "FI-02", // South Karelia: Etelä-Karjala
    "14": "FI-03", // South Ostrobothnia: Etelä-Pohjanmaa
    "10": "FI-04", // South Savo: Etelä-Savo
    "18": "FI-05", // Kainuu
    "05": "FI-06", // Kanta-Häme
    "16": "FI-07", // Central Ostrobothnia: Keski-Pohjanmaa
    "13": "FI-08", // Central Finland: Keski-Suomi
    "08": "FI-09", // Kymenlaakso
    "19": "FI-10", // Lapland: Lappi
    "06": "FI-11", // Pirkanmaa
    "15": "FI-12", // Ostrobothnia: Pohjanmaa
    "12": "FI-13", // North Karelia: Pohjois-Karjala
    "17": "FI-14", // North Ostrobothnia: Pohjois-Pohjanmaa
    "11": "FI-15", // North Savo: Pohjois-Savo
    "07": "FI-16", // Päijät-Häme
    "04": "FI-17", // Satakunta
    "01": "FI-18", // Uusimaa
    "02": "FI-19", // Southwest Finland: Varsinais-Suomi
  },
  // luxembourg
  LUX: {
    "01": "LU-CA", // Capellen
    "05": "LU-CL", // Clervaux
    "06": "LU-DI", // Diekirch
    "10": "LU-EC", // Echternach
    "02": "LU-ES", // Esch-sur-Alzette
    "11": "LU-GR", // Grevenmacher
    "03": "LU-LU", // Luxembourg
    "04": "LU-ME", // Mersch
    "07": "LU-RD", // Redange
    "12": "LU-RM", // Remich
    "09": "LU-VD", // Vianden
    "08": "LU-WI", // Wiltz
  },
  // latvia
  LVA: {
    "71098776B63357041229203": "LV-059", // Madonas novads
    "71098776B20667457444759": "LV-073", // Preiļu novads
    "71098776B8434036234200": "LV-077", // Rēzeknes novads
  },
  // india
  IND: {
    "IN-CT": "IN-CG", // Chhattisgarh: Chhattīsgarh
    "IN-OR": "IN-OD", // Odisha
    "IN-TG": "IN-TS", // Telangana: Telangāna
    "IN-UT": "IN-UK", // Uttarakhand: Uttarākhand
  },
  // tajikistan
  TJK: {
    "TJ-X01~": "TJ-RA", // Districts of Republican Subordination: nohiyahoi tobei jumhurí
  },
  // vietnam
  VNM: {
    VN12: "VN-01", // Lai Chau: Lai Châu
    VN04: "VN-04", // Cao Bang: Cao Bằng
    VN14: "VN-05", // Son La: Sơn La
    VN20: "VN-09", // Lang Son: Lạng Sơn
    VN22: "VN-13", // Quang Ninh: Quảng Ninh
    VN38: "VN-21", // Thanh Hoa: Thanh Hóa
    VN40: "VN-22", // Nghe An: Nghệ An
    VN42: "VN-23", // Ha Tinh: Hà Tĩnh
    VN46: "VN-26", // Hue: Thừa Thiên-Huế
    VN11: "VN-71", // Dien Bien: Điện Biên
    VN01: "VN-HN", // Ha Noi: Hà Nội
  },
  // nepal
  NPL: {
    NP01: "NP-P1", // Koshi
    NP02: "NP-P2", // Madhesh
    NP03: "NP-P3", // Bagmati
    NP04: "NP-P4", // Gandaki
    NP05: "NP-P5", // Lumbini
    NP06: "NP-P6", // Karnali
    NP07: "NP-P7", // Sudur Paschim: Sudurpashchim
  },
  // kyrgyzstan
  KGZ: {
    KG05000000000: "KG-B", // Batken
    KG08000000000: "KG-C", // Chui: Chüy
    KG11000000000: "KG-GB", // Bishkek (city): Bishkek Shaary
    KG21000000000: "KG-GO", // Osh (city): Osh Shaary
    KG03000000000: "KG-J", // Jalal-Abad
    KG04000000000: "KG-N", // Naryn
    KG06000000000: "KG-O", // Osh
    KG07000000000: "KG-T", // Talas
    KG02000000000: "KG-Y", // Issyk-Kul: Ysyk-Köl
  },
  // kenya
  KEN: {
    KE030: "KE-01", // Baringo
    KE036: "KE-02", // Bomet
    KE039: "KE-03", // Bungoma
    KE040: "KE-04", // Busia
    KE028: "KE-05", // Elgeyo-Marakwet: Elgeyo/Marakwet
    KE014: "KE-06", // Embu
    KE007: "KE-07", // Garissa
    KE043: "KE-08", // Homa Bay
    KE011: "KE-09", // Isiolo
    KE034: "KE-10", // Kajiado
    KE037: "KE-11", // Kakamega
    KE035: "KE-12", // Kericho
    KE022: "KE-13", // Kiambu
    KE003: "KE-14", // Kilifi
    KE020: "KE-15", // Kirinyaga
    KE045: "KE-16", // Kisii
    KE042: "KE-17", // Kisumu
    KE015: "KE-18", // Kitui
    KE002: "KE-19", // Kwale
    KE031: "KE-20", // Laikipia
    KE005: "KE-21", // Lamu
    KE016: "KE-22", // Machakos
    KE017: "KE-23", // Makueni
    KE009: "KE-24", // Mandera
    KE010: "KE-25", // Marsabit
    KE012: "KE-26", // Meru
    KE044: "KE-27", // Migori
    KE001: "KE-28", // Mombasa
    KE021: "KE-29", // Murang'a
    KE047: "KE-30", // Nairobi: Nairobi City
    KE032: "KE-31", // Nakuru
    KE029: "KE-32", // Nandi
    KE033: "KE-33", // Narok
    KE046: "KE-34", // Nyamira
    KE018: "KE-35", // Nyandarua
    KE019: "KE-36", // Nyeri
    KE025: "KE-37", // Samburu
    KE041: "KE-38", // Siaya
    KE006: "KE-39", // Taita Taveta: Taita/Taveta
    KE004: "KE-40", // Tana River
    KE013: "KE-41", // Tharaka-Nithi
    KE026: "KE-42", // Trans Nzoia
    KE023: "KE-43", // Turkana
    KE027: "KE-44", // Uasin Gishu
    KE038: "KE-45", // Vihiga
    KE008: "KE-46", // Wajir
    KE024: "KE-47", // West Pokot
  },
  // ghana
  GHA: {
    GH07: "GH-AA", // Greater Accra
    GH01: "GH-AF", // Ahafo
    GH02: "GH-AH", // Ashanti
    GH04: "GH-BE", // Bono East
    GH03: "GH-BO", // Bono
    GH05: "GH-CP", // Central
    GH06: "GH-EP", // Eastern
    GH09: "GH-NE", // Northern East: North East
    GH08: "GH-NP", // Northern
    GH10: "GH-OT", // Oti
    GH11: "GH-SV", // Savannah
    GH14: "GH-TV", // Volta
    GH12: "GH-UE", // Upper East
    GH13: "GH-UW", // Upper West
    GH16: "GH-WN", // Western North
    GH15: "GH-WP", // Western
  },
  // namibia
  NAM: {
    NA01: "NA-CA", // Zambezi
    NA02: "NA-ER", // Erongo
    NA03: "NA-HA", // Hardap
    NA04: "NA-KA", // Karas: //Karas
    NA05: "NA-KE", // Kavango East
    NA06: "NA-KH", // Khomas
    NA07: "NA-KU", // Kunene
    NA14: "NA-KW", // Kavango West
    NA13: "NA-OD", // Otjozondjupa
    NA09: "NA-OH", // Omaheke
    NA11: "NA-ON", // Oshana
    NA10: "NA-OS", // Omusati
    NA12: "NA-OT", // Oshikoto
    NA08: "NA-OW", // Ohangwena
  },
  // tunisia
  TUN: {
    TN11: "TN-11", // Tunis
    TN12: "TN-12", // Ariana: L'Ariana
    TN13: "TN-13", // Ben Arous
    TN14: "TN-14", // Manubah: La Manouba
    TN15: "TN-21", // Nabeul
    TN16: "TN-22", // Zaghouan
    TN17: "TN-23", // Bizerte
    TN21: "TN-31", // Béja
    TN22: "TN-32", // Jendouba
    TN23: "TN-33", // Le Kef
    TN24: "TN-34", // Siliana
    TN41: "TN-41", // Kairouan
    TN42: "TN-42", // Kassérine: Kasserine
    TN43: "TN-43", // Sidi Bou Zid: Sidi Bouzid
    TN31: "TN-51", // Sousse
    TN32: "TN-52", // Monastir
    TN33: "TN-53", // Mahdia
    TN34: "TN-61", // Sfax
    TN61: "TN-71", // Gafsa
    TN62: "TN-72", // Tozeur
    TN63: "TN-73", // Kebili: Kébili
    TN51: "TN-81", // Gabès
    TN52: "TN-82", // Médenine
    TN53: "TN-83", // Tataouine
  },
  // kazakhstan
  KAZ: {
    KAZ001: "KZ-10", // Abay Region: Abay oblysy
    KAZ002: "KZ-11", // Akmola Region: Aqmola oblysy
    KAZ003: "KZ-15", // Aktobe Region: Aqtöbe oblysy
    KAZ005: "KZ-19", // Almaty Region: Almaty oblysy
    KAZ007: "KZ-23", // Atyrau Region: Atyraū oblysy
    KAZ020: "KZ-27", // West Kazakhstan Region: Batys Qazaqstan oblysy
    KAZ009: "KZ-31", // Jambyl Region: Zhambyl oblysy
    KAZ010: "KZ-33", // Jetisu Region: Zhetisū oblysy
    KAZ011: "KZ-35", // Karaganda Region: Qaraghandy oblysy
    KAZ012: "KZ-39", // Kostanay Region: Qostanay oblysy
    KAZ013: "KZ-43", // Kyzylorda Region: Qyzylorda oblysy
    KAZ014: "KZ-47", // Mangystau Region: Mangghystaū oblysy
    KAZ016: "KZ-55", // Pavlodar Region: Pavlodar oblysy
    KAZ015: "KZ-59", // North Kazakhstan Region: Soltüstik Qazaqstan oblysy
    KAZ018: "KZ-61", // Turkistan Region: Türkistan oblysy
    KAZ019: "KZ-62", // Ulytau Region: Ulytaū oblysy
    KAZ008: "KZ-63", // East Kazakhstan Region: Shyghys Qazaqstan oblysy
    KAZ006: "KZ-71", // Astana
    KAZ004: "KZ-75", // Almaty
    KAZ017: "KZ-79", // Shymkent
  },
  // indonesia
  IDN: {
    "11": "ID-AC", // Aceh
    "51": "ID-BA", // Bali
    "19": "ID-BB", // Kepulauan Bangka Belitung
    "17": "ID-BE", // Bengkulu
    "36": "ID-BT", // Banten
    "75": "ID-GO", // Gorontalo
    "15": "ID-JA", // Jambi
    "32": "ID-JB", // Jawa Barat
    "35": "ID-JI", // Jawa Timur
    "31": "ID-JK", // Dki Jakarta: Jakarta Raya
    "33": "ID-JT", // Jawa Tengah
    "61": "ID-KB", // Kalimantan Barat
    "64": "ID-KI", // Kalimantan Timur
    "21": "ID-KR", // Kepulauan Riau
    "63": "ID-KS", // Kalimantan Selatan
    "62": "ID-KT", // Kalimantan Tengah
    "65": "ID-KU", // Kalimantan Utara
    "18": "ID-LA", // Lampung
    "81": "ID-MA", // Maluku
    "82": "ID-MU", // Maluku Utara
    "52": "ID-NB", // Nusa Tenggara Barat
    "53": "ID-NT", // Nusa Tenggara Timur
    "91": "ID-PA", // Papua
    "92": "ID-PB", // Papua Barat
    "96": "ID-PD", // Papua Barat Daya
    "95": "ID-PE", // Papua Pegunungan: Papua Pengunungan
    "93": "ID-PS", // Papua Selatan
    "94": "ID-PT", // Papua Tengah
    "14": "ID-RI", // Riau
    "71": "ID-SA", // Sulawesi Utara
    "13": "ID-SB", // Sumatera Barat
    "74": "ID-SG", // Sulawesi Tenggara
    "73": "ID-SN", // Sulawesi Selatan
    "76": "ID-SR", // Sulawesi Barat
    "16": "ID-SS", // Sumatera Selatan
    "72": "ID-ST", // Sulawesi Tengah
    "12": "ID-SU", // Sumatera Utara
    "34": "ID-YO", // Daerah Istimewa Yogyakarta: Yogyakarta
  },
  // algeria
  DZA: {
    "1": "DZ-01", // Adrar
    "2": "DZ-02", // Chlef
    "3": "DZ-03", // Laghouat
    "4": "DZ-04", // Oum El Bouaghi: Oum el Bouaghi
    "5": "DZ-05", // Batna
    "6": "DZ-06", // Béjaïa
    "7": "DZ-07", // Biskra
    "8": "DZ-08", // Béchar
    "9": "DZ-09", // Blida
    "10": "DZ-10", // Bouira
    "11": "DZ-11", // Tamanrasset
    "12": "DZ-12", // Tébessa
    "13": "DZ-13", // Tlemcen
    "14": "DZ-14", // Tiaret
    "15": "DZ-15", // Tizi Ouzou
    "16": "DZ-16", // Alger
    "17": "DZ-17", // Djelfa
    "18": "DZ-18", // Jijel
    "19": "DZ-19", // Sétif
    "20": "DZ-20", // Saïda
    "21": "DZ-21", // Skikda
    "22": "DZ-22", // Sidi Bel Abbès
    "23": "DZ-23", // Annaba
    "24": "DZ-24", // Guelma
    "25": "DZ-25", // Constantine
    "26": "DZ-26", // Médéa
    "27": "DZ-27", // Mostaganem
    "28": "DZ-28", // M'Sila: M'sila
    "29": "DZ-29", // Mascara
    "30": "DZ-30", // Ouargla
    "31": "DZ-31", // Oran
    "32": "DZ-32", // El Bayadh
    "33": "DZ-33", // Illizi
    "34": "DZ-34", // Bordj Bou Arreridj: Bordj Bou Arréridj
    "35": "DZ-35", // Boumerdès
    "36": "DZ-36", // El Tarf
    "37": "DZ-37", // Tindouf
    "38": "DZ-38", // Tissemsilt
    "39": "DZ-39", // El Oued
    "40": "DZ-40", // Khenchela
    "41": "DZ-41", // Souk Ahras
    "42": "DZ-42", // Tipaza
    "43": "DZ-43", // Mila
    "44": "DZ-44", // Aïn Defla
    "45": "DZ-45", // Naâma: Naama
    "46": "DZ-46", // Aïn Témouchent
    "47": "DZ-47", // Ghardaïa
    "48": "DZ-48", // Relizane
    "49": "DZ-49", // Timimoun
    "50": "DZ-50", // Bordj Badji Mokhtar
    "51": "DZ-51", // Ouled Djellal
    "52": "DZ-52", // Béni Abbès
    "53": "DZ-53", // In Salah
    "54": "DZ-54", // In Guezzam
    "55": "DZ-55", // Touggourt
    "56": "DZ-56", // Djanet
    "57": "DZ-57", // El M'Ghair: El Meghaier
    "58": "DZ-58", // El Meniaa
  },
  // philippines
  PHL: {
    PH14001: "PH-ABR", // Abra
    PH16002: "PH-AGN", // Agusan del Norte
    PH16003: "PH-AGS", // Agusan del Sur
    PH06004: "PH-AKL", // Aklan
    PH05005: "PH-ALB", // Albay
    PH06006: "PH-ANT", // Antique
    PH14081: "PH-APA", // Apayao
    PH03077: "PH-AUR", // Aurora
    PH03008: "PH-BAN", // Bataan
    PH19007: "PH-BAS", // Basilan
    PH14011: "PH-BEN", // Benguet
    PH08078: "PH-BIL", // Biliran
    PH07012: "PH-BOH", // Bohol
    PH04010: "PH-BTG", // Batangas
    PH02009: "PH-BTN", // Batanes
    PH10013: "PH-BUK", // Bukidnon
    PH03014: "PH-BUL", // Bulacan
    PH02015: "PH-CAG", // Cagayan
    PH10018: "PH-CAM", // Camiguin
    PH05016: "PH-CAN", // Camarines Norte
    PH06019: "PH-CAP", // Capiz
    PH05017: "PH-CAS", // Camarines Sur
    PH05020: "PH-CAT", // Catanduanes
    PH04021: "PH-CAV", // Cavite
    PH07022: "PH-CEB", // Cebu
    PH11082: "PH-COM", // Davao de Oro (Compostela Valley): Davao de Oro
    PH11025: "PH-DAO", // Davao Oriental
    PH11024: "PH-DAS", // Davao del Sur
    PH11023: "PH-DAV", // Davao del Norte
    PH16085: "PH-DIN", // Dinagat Islands
    PH11086: "PH-DVO", // Davao Occidental
    PH08026: "PH-EAS", // Eastern Samar
    PH06079: "PH-GUI", // Guimaras
    PH14027: "PH-IFU", // Ifugao
    PH06030: "PH-ILI", // Iloilo
    PH01028: "PH-ILN", // Ilocos Norte
    PH01029: "PH-ILS", // Ilocos Sur
    PH02031: "PH-ISA", // Isabela
    PH14032: "PH-KAL", // Kalinga
    PH04034: "PH-LAG", // Laguna
    PH10035: "PH-LAN", // Lanao del Norte
    PH19036: "PH-LAS", // Lanao del Sur
    PH08037: "PH-LEY", // Leyte
    PH01033: "PH-LUN", // La Union
    PH17040: "PH-MAD", // Marinduque
    PH05041: "PH-MAS", // Masbate
    PH17051: "PH-MDC", // Occidental Mindoro: Mindoro Occidental
    PH17052: "PH-MDR", // Oriental Mindoro: Mindoro Oriental
    PH19087: "PH-MGN", // Maguindanao del Norte
    PH19088: "PH-MGS", // Maguindanao del Sur
    PH14044: "PH-MOU", // Mountain Province
    PH10042: "PH-MSC", // Misamis Occidental
    PH10043: "PH-MSR", // Misamis Oriental
    PH12047: "PH-NCO", // Cotabato (North Cotabato): Cotabato
    PH06045: "PH-NEC", // Negros Occidental
    PH07046: "PH-NER", // Negros Oriental
    PH08048: "PH-NSA", // Northern Samar
    PH03049: "PH-NUE", // Nueva Ecija
    PH02050: "PH-NUV", // Nueva Vizcaya
    PH03054: "PH-PAM", // Pampanga
    PH01055: "PH-PAN", // Pangasinan
    PH17053: "PH-PLW", // Palawan
    PH04056: "PH-QUE", // Quezon
    PH02057: "PH-QUI", // Quirino
    PH04058: "PH-RIZ", // Rizal
    PH17059: "PH-ROM", // Romblon
    PH12080: "PH-SAR", // Sarangani
    PH12063: "PH-SCO", // South Cotabato
    PH07061: "PH-SIG", // Siquijor
    PH08064: "PH-SLE", // Southern Leyte
    PH19066: "PH-SLU", // Sulu
    PH05062: "PH-SOR", // Sorsogon
    PH12065: "PH-SUK", // Sultan Kudarat
    PH16067: "PH-SUN", // Surigao del Norte
    PH16068: "PH-SUR", // Surigao del Sur
    PH03069: "PH-TAR", // Tarlac
    PH19070: "PH-TAW", // Tawi-Tawi
    PH08060: "PH-WSA", // Samar (Western Samar): Samar
    PH09072: "PH-ZAN", // Zamboanga del Norte
    PH09073: "PH-ZAS", // Zamboanga del Sur
    PH03071: "PH-ZMB", // Zambales
    PH09083: "PH-ZSI", // Zamboanga Sibugay
  },
  // south-korea
  KOR: {
    "11": "KR-11", // Seoul: Seoul-teukbyeolsi
    "26": "KR-26", // Busan: Busan-gwangyeoksi
    "27": "KR-27", // Daegu: Daegu-gwangyeoksi
    "28": "KR-28", // Incheon: Incheon-gwangyeoksi
    "30": "KR-30", // Daejeon: Daejeon-gwangyeoksi
    "31": "KR-31", // Ulsan: Ulsan-gwangyeoksi
    "41": "KR-41", // Gyeonggi: Gyeonggi-do
    "51": "KR-42", // Gangwon: Gangwon-teukbyeoljachido
    "43": "KR-43", // North Chungcheong: Chungcheongbuk-do
    "44": "KR-44", // South Chungcheong: Chungcheongnam-do
    "52": "KR-45", // Jeonbuk: Jeollabuk-do
    "47": "KR-47", // North Gyeongsang: Gyeongsangbuk-do
    "48": "KR-48", // South Gyeongsang: Gyeongsangnam-do
    "50": "KR-49", // Jeju: Jeju-teukbyeoljachido
    "36": "KR-50", // Sejong
  },
  // iran
  IRN: {
    "IRN-3231": "IR-00", // Markazi: Markazī
    "IRN-3240": "IR-01", // Gilan: Gīlān
    "IRN-3214": "IR-02", // Mazandaran: Māzandarān
    "IRN-3238": "IR-03", // East Azarbaijan: Āz̄ārbāyjān-e Shārqī
    "IRN-3237": "IR-04", // West Azarbaijan: Āz̄ārbāyjān-e Ghārbī
    "IRN-3239": "IR-05", // Kermanshah: Kermānshāh
    "IRN-3219": "IR-06", // Khuzestan: Khūzestān
    "IRN-3212": "IR-07", // Fars: Fārs
    "IRN-3248": "IR-08", // Kerman: Kermān
    "IRN-3245": "IR-09", // Razavi Khorasan: Khorāsān-e Raẕavī
    "IRN-3211": "IR-10", // Esfahan: Eşfahān
    "IRN-3247": "IR-11", // Sistan and Baluchestan: Sīstān va Balūchestān
    "IRN-3241": "IR-12", // Kordestan: Kordestān
    "IRN-3233": "IR-13", // Hamadan: Hamadān
    "IRN-3218": "IR-14", // Chahar Mahall and Bakhtiari: Chahār Maḩāl va Bakhtīārī
    "IRN-3220": "IR-15", // Lorestan: Lorestān
    "IRN-3221": "IR-16", // Ilam: Īlām
    "IRN-3209": "IR-17", // Kohgiluyeh and Buyer Ahmad: Kohgīlūyeh va Bowyer Aḩmad
    "IRN-3210": "IR-18", // Bushehr: Būshehr
    "IRN-3234": "IR-19", // Zanjan: Zanjān
    "IRN-3215": "IR-20", // Semnan: Semnān
    "IRN-3217": "IR-21", // Yazd
    "IRN-3228": "IR-22", // Hormozgan: Hormozgān
    "IRN-3216": "IR-23", // Tehran: Tehrān
    "IRN-3230": "IR-24", // Ardebil: Ardabīl
    "IRN-3232": "IR-25", // Qom
    "IRN-3235": "IR-26", // Qazvin: Qazvīn
    "IRN-3213": "IR-27", // Golestan: Golestān
    "IRN-3246": "IR-28", // North Khorasan: Khorāsān-e Shomālī
    "IRN-3244": "IR-29", // South Khorasan: Khorāsān-e Jonūbī
    "IRN-5490": "IR-30", // Alborz
  },
  // saint-kitts-and-nevis
  KNA: {
    "KNA-5112": "KN-15", // Trinity Palmetto Point
  },
  // liberia
  LBR: {
    "LBR-1459": "LR-GP", // Gbapolu: Gbarpolu
    "LBR-1458": "LR-RG", // River Gee
  },
  // mozambique
  MOZ: {
    "MOZ-1927": "MZ-L", // Maputo Province: Maputo
    "MOZ-5854": "MZ-MPM", // Maputo City: Maputo
  },
  // malawi
  MWI: {
    "MWI-1873": "MW-CT", // Chitipa
    "MWI-1194": "MW-KR", // Karonga
  },
  // oman
  OMN: {
    "OMN-2424": "OM-BS", // Al Batnah North: Shamāl al Bāţinah
    "OMN-2406": "OM-SJ", // Ash Sharqiyah South: Janūb ash Sharqīyah
  },
  // solomon-islands
  SLB: {
    "SLB-3508": "SB-CH", // Choiseul
    "SLB-3507": "SB-WE", // Western
  },
  // central-african-republic
  CAF: {
    CF51: "CF-BB", // Bamingui-Bangoran
    CF71: "CF-BGF", // Bangui
    CF61: "CF-BK", // Basse-Kotto
    CF52: "CF-HK", // Haute-Kotto
    CF63: "CF-HM", // Haut-Mbomou
    CF42: "CF-KB", // Nana-Gribizi: Gribingui
    CF41: "CF-KG", // Kémo: Kémo-Gribingui
    CF12: "CF-LB", // Lobaye
    CF62: "CF-MB", // Mbomou
    CF11: "CF-MP", // Ombella M'Poko: Ombella-Mpoko
    CF23: "CF-SE", // Sangha-Mbaéré: Sangha
    CF43: "CF-UK", // Ouaka
    CF53: "CF-VK", // Vakaga
  },
  // democratic-republic-of-congo
  COD: {
    CD20: "CD-BC", // Kongo-Central: Kongo Central
    CD52: "CD-BU", // Bas-Uele: Bas-Uélé
    CD41: "CD-EQ", // Equateur: Équateur
    CD71: "CD-HK", // Haut-Katanga
    CD73: "CD-HL", // Haut-Lomami
    CD53: "CD-HU", // Haut-Uele: Haut-Uélé
    CD54: "CD-IT", // Ituri
    CD91: "CD-KC", // Kasaï-Central: Kasaï Central
    CD82: "CD-KE", // Kasaï-Oriental: Kasaï Oriental
    CD31: "CD-KG", // Kwango
    CD32: "CD-KL", // Kwilu
    CD10: "CD-KN", // Kinshasa
    CD92: "CD-KS", // Kasaï
    CD81: "CD-LO", // Lomami
    CD72: "CD-LU", // Lualaba
    CD63: "CD-MA", // Maniema
    CD33: "CD-MN", // Maï-Ndombe: Mai-Ndombe
    CD44: "CD-MO", // Mongala
    CD61: "CD-NK", // Nord-Kivu
    CD43: "CD-NU", // Nord-Ubangi
    CD83: "CD-SA", // Sankuru
    CD62: "CD-SK", // Sud-Kivu
    CD42: "CD-SU", // Sud-Ubangi
    CD74: "CD-TA", // Tanganyika
    CD51: "CD-TO", // Tshopo
    CD45: "CD-TU", // Tshuapa
  },
  // ethiopia
  ETH: {
    ET14: "ET-AA", // Addis Ababa
    ET02: "ET-AF", // Afar
    ET03: "ET-AM", // Amhara: Amara
    ET06: "ET-BE", // Benishangul-Gumuz: Benshangul-Gumaz
    ET15: "ET-DD", // Dire Dawa
    ET12: "ET-GA", // Gambela: Gambela Peoples
    ET13: "ET-HA", // Harari: Harari People
    ET04: "ET-OR", // Oromia
    ET16: "ET-SI", // Sidama
    ET05: "ET-SO", // Somali
    ET11: "ET-SW", // South West Ethiopia: Southwest Ethiopia Peoples
    ET01: "ET-TI", // Tigray: Tigrai
  },
  // cambodia
  KHM: {
    KH01: "KH-1", // Banteay Meanchey: Banteay Mean Choăy
    KH10: "KH-10", // Kratie: Kracheh
    KH11: "KH-11", // Mondul Kiri: Mondol Kiri
    KH12: "KH-12", // Phnom Penh
    KH13: "KH-13", // Preah Vihear
    KH14: "KH-14", // Prey Veng: Prey Veaeng
    KH15: "KH-15", // Pursat: Pousaat
    KH16: "KH-16", // Ratanak Kiri: Rotanak Kiri
    KH17: "KH-17", // Siemreap: Siem Reab
    KH18: "KH-18", // Preah Sihanouk
    KH19: "KH-19", // Stung Treng: Stueng Traeng
    KH02: "KH-2", // Battambang: Baat Dambang
    KH20: "KH-20", // Svay Rieng: Svaay Rieng
    KH21: "KH-21", // Takeo: Taakaev
    KH22: "KH-22", // Oddar Meanchey: Otdar Mean Chey
    KH23: "KH-23", // Kep: Kaeb
    KH24: "KH-24", // Pailin
    KH25: "KH-25", // Tboung Khmum: Tbong Khmum
    KH03: "KH-3", // Kampong Cham: Kampong Chaam
    KH04: "KH-4", // Kampong Chhnang
    KH05: "KH-5", // Kampong Speu: Kampong Spueu
    KH06: "KH-6", // Kampong Thom: Kampong Thum
    KH07: "KH-7", // Kampot
    KH08: "KH-8", // Kandal: Kandaal
    KH09: "KH-9", // Koh Kong: Kaoh Kong
  },
  // laos
  LAO: {
    LA17: "LA-AT", // Attapeu: Attapu
    LA05: "LA-BK", // Bokeo: Bokèo
    LA11: "LA-BL", // Bolikhamxai
    LA16: "LA-CH", // Champasack: Champasak
    LA07: "LA-HO", // Houaphan
    LA12: "LA-KH", // Khammouan
    LA03: "LA-LM", // Louangnamtha: Louang Namtha
    LA06: "LA-LP", // Louangphabang
    LA04: "LA-OU", // Oudomxai: Oudômxai
    LA02: "LA-PH", // Phongsaly: Phôngsali
    LA14: "LA-SL", // Salavan
    LA13: "LA-SV", // Savannakhet: Savannakhét
    LA10: "LA-VI", // Vientiane: Viangchan
    LA01: "LA-VT", // Vientiane Capital: Viangchan
    LA08: "LA-XA", // Xaignabouly: Xaignabouli
    LA15: "LA-XE", // Sekong: Xékong
    LA09: "LA-XI", // Xiengkhouang: Xiangkhouang
    LA18: "LA-XS", // Xaisomboon: Xaisômboun
  },
  // mauritania
  MRT: {
    MR01: "MR-01", // Hodh Chargui: Hodh ech Chargui
    MR02: "MR-02", // Hodh El Gharbi: Hodh el Gharbi
    MR03: "MR-03", // Assaba
    MR04: "MR-04", // Gorgol
    MR05: "MR-05", // Brakna
    MR06: "MR-06", // Trarza
    MR07: "MR-07", // Adrar
    MR08: "MR-08", // Dakhlet Nouadhibou: Dakhlet Nouâdhibou
    MR09: "MR-09", // Tagant
    MR10: "MR-10", // Guidimagha: Guidimaka
    MR11: "MR-11", // Tiris Zemmour
    MR12: "MR-12", // Inchiri
    MR13: "MR-13", // Nouakchott Ouest
    MR14: "MR-14", // Nouakchott Nord
    MR15: "MR-15", // Nouakchott Sud
  },
  // myanmar
  MMR: {
    MMR005: "MM-01", // Sagaing
    MMR007: "MM-02", // Bago
    MMR009: "MM-03", // Magway
    MMR010: "MM-04", // Mandalay
    MMR006: "MM-05", // Tanintharyi
    MMR013: "MM-06", // Yangon
    MMR017: "MM-07", // Ayeyarwady
    MMR001: "MM-11", // Kachin
    MMR002: "MM-12", // Kayah
    MMR003: "MM-13", // Kayin
    MMR004: "MM-14", // Chin
    MMR011: "MM-15", // Mon
    MMR012: "MM-16", // Rakhine
    MMR014: "MM-17", // Shan
    MMR018: "MM-18", // Nay Pyi Taw
  },
  // papua-new-guinea
  PNG: {
    PG10: "PG-CPK", // Chimbu (Simbu) Province: Chimbu
    PG03: "PG-CPM", // Central Province: Central
    PG18: "PG-EBR", // East New Britain Province: East New Britain
    PG11: "PG-EHG", // Eastern Highlands Province: Eastern Highlands
    PG08: "PG-EPW", // Enga Province: Enga
    PG14: "PG-ESW", // East Sepik Province: East Sepik
    PG02: "PG-GPK", // Gulf Province: Gulf
    PG21: "PG-HLA", // Hela Province: Hela
    PG22: "PG-JWK", // Jiwaka Province: Jiwaka
    PG05: "PG-MBA", // Milne Bay Province: Milne Bay
    PG12: "PG-MPL", // Morobe Province: Morobe
    PG13: "PG-MPM", // Madang Province: Madang
    PG16: "PG-MRL", // Manus Province: Manus
    PG04: "PG-NCD", // National Capital District: National Capital District (Port Moresby)
    PG17: "PG-NIK", // New Ireland Province: New Ireland
    PG06: "PG-NPP", // Northern (Oro) Province: Northern
    PG20: "PG-NSB", // Autonomous Region of Bougainville: Bougainville
    PG15: "PG-SAN", // West Sepik (Sandaun) Province: West Sepik
    PG07: "PG-SHM", // Southern Highlands Province: Southern Highlands
    PG19: "PG-WBK", // West New Britain Province: West New Britain
    PG09: "PG-WHM", // Western Highlands Province: Western Highlands
    PG01: "PG-WPD", // Western Province: Western
  },
  // qatar
  QAT: {
    QAT006: "QA-DA", // Doha Municipality: Ad Dawḩah
    QAT002: "QA-KH", // Al Khor and Al Thakhira Municipality: Al Khawr wa adh Dhakhīrah
    QAT004: "QA-MS", // Al Shamal Municipality: Ash Shamāl
    QAT003: "QA-RA", // Al Rayyan Municipality: Ar Rayyān
    QAT008: "QA-SH", // Al Sheehaniya Municipality: Ash Shīḩānīyah
    QAT007: "QA-US", // Umm Slal Municipality: Umm Şalāl
    QAT005: "QA-WA", // Al Wakra Municipality: Al Wakrah
    QAT001: "QA-ZA", // Al Daayen Municipality: Az̧ Z̧a‘āyin
  },
  // sudan
  SDN: {
    SD06: "SD-DC", // Central Darfur
    SD05: "SD-DE", // East Darfur
    SD02: "SD-DN", // North Darfur
    SD03: "SD-DS", // South Darfur
    SD04: "SD-DW", // West Darfur
    SD12: "SD-GD", // Gedaref
    SD18: "SD-GK", // West Kordofan
    SD15: "SD-GZ", // Aj Jazirah: Gezira
    SD11: "SD-KA", // Kassala
    SD01: "SD-KH", // Khartoum
    SD13: "SD-KN", // North Kordofan
    SD07: "SD-KS", // South Kordofan
    SD08: "SD-NB", // Blue Nile
    SD17: "SD-NO", // Northern
    SD16: "SD-NR", // River Nile
    SD09: "SD-NW", // White Nile
    SD10: "SD-RS", // Red Sea
    SD14: "SD-SI", // Sennar
  },
  // sierra-leone
  SLE: {
    SL01: "SL-E", // Eastern
    SL02: "SL-N", // Northern
    SL05: "SL-NW", // North Western
    SL03: "SL-S", // Southern
    SL04: "SL-W", // Western: Western Area (Freetown)
  },
  // chad
  TCD: {
    TCD01: "TD-BA", // BATHA: Batha
    TCD19: "TD-BG", // BARH EL GAZEL: Bahr el Ghazal
    TCD02: "TD-BO", // BORKOU: Borkou
    TCD03: "TD-CB", // CHARI BAGUIRMI: Chari-Baguirmi
    TCD20: "TD-EE", // ENNEDI EST: Ennedi-Est
    TCD23: "TD-EO", // ENNEDI OUEST: Ennedi-Ouest
    TCD04: "TD-GR", // GUÉRA: Guéra
    TCD05: "TD-HL", // HADJER LAMIS: Hadjer Lamis
    TCD06: "TD-KA", // KANEM: Kanem
    TCD07: "TD-LC", // LAC: Lac
    TCD08: "TD-LO", // LOGONE OCCIDENTAL: Logone-Occidental
    TCD09: "TD-LR", // LOGONE ORIENTAL: Logone-Oriental
    TCD10: "TD-MA", // MANDOUL: Mandoul
    TCD13: "TD-MC", // MOYEN CHARI: Moyen-Chari
    TCD11: "TD-ME", // MAYO KEBBI EST: Mayo-Kebbi-Est
    TCD12: "TD-MO", // MAYO KEBBI OUEST: Mayo-Kebbi-Ouest
    TCD18: "TD-ND", // N'DJAMENA: Ville de Ndjamena
    TCD14: "TD-OD", // OUADDAÏ: Ouaddaï
    TCD15: "TD-SA", // SALAMAT: Salamat
    TCD21: "TD-SI", // SILA: Sila
    TCD16: "TD-TA", // TANDJILÉ: Tandjilé
    TCD22: "TD-TI", // TIBESTI: Tibesti
    TCD17: "TD-WF", // WADI FIRA: Wadi Fira
  },
  // uganda
  UGA: {
    UG1: "UG-C", // Central
    UG2: "UG-E", // Eastern
    UG3: "UG-N", // Northern
    UG4: "UG-W", // Western
  },
  // yemen-rep
  YEM: {
    YE12: "YE-AB", // Abyan
    YE24: "YE-AD", // Aden: ‘Adan
    YE29: "YE-AM", // Amran: ‘Amrān
    YE14: "YE-BA", // Al Bayda: Al Bayḑā’
    YE30: "YE-DA", // Ad Dali': Aḑ Ḑāli‘
    YE20: "YE-DH", // Dhamar: Dhamār
    YE19: "YE-HD", // Hadramawt: Ḩaḑramawt
    YE17: "YE-HJ", // Hajjah: Ḩajjah
    YE18: "YE-HU", // Al Hodeidah: Al Ḩudaydah
    YE11: "YE-IB", // Ibb
    YE16: "YE-JA", // Al Jawf
    YE25: "YE-LA", // Lahj: Laḩij
    YE26: "YE-MA", // Ma'rib: Ma’rib
    YE28: "YE-MR", // Al Maharah: Al Mahrah
    YE27: "YE-MW", // Al Mahwit: Al Maḩwīt
    YE31: "YE-RA", // Raymah
    YE13: "YE-SA", // Sana'a City: Amānat al ‘Āşimah [city]
    YE22: "YE-SD", // Sa'dah: Şāʻdah
    YE21: "YE-SH", // Shabwah
    YE23: "YE-SN", // Sana'a: Şanʻā’
    YE32: "YE-SU", // Socotra: Arkhabīl Suquţrá
    YE15: "YE-TA", // Ta'iz: Tāʻizz
  },
  // tanzania
  TZA: {
    TZ02: "TZ-01", // Arusha
    TZ07: "TZ-02", // Dar-es-salaam: Dar es Salaam
    TZ01: "TZ-03", // Dodoma
    TZ11: "TZ-04", // Iringa
    TZ18: "TZ-05", // Kagera
    TZ54: "TZ-06", // Kaskazini Pemba: Pemba North
    TZ51: "TZ-07", // Kaskazini Unguja: Zanzibar North
    TZ16: "TZ-08", // Kigoma
    TZ03: "TZ-09", // Kilimanjaro
    TZ55: "TZ-10", // Kusini Pemba: Pemba South
    TZ52: "TZ-11", // Kusini Unguja: Zanzibar South
    TZ08: "TZ-12", // Lindi
    TZ20: "TZ-13", // Mara
    TZ12: "TZ-14", // Mbeya
    TZ53: "TZ-15", // Mjini Magharibi: Zanzibar West
    TZ05: "TZ-16", // Morogoro
    TZ09: "TZ-17", // Mtwara
    TZ19: "TZ-18", // Mwanza
    TZ06: "TZ-19", // Pwani: Coast
    TZ15: "TZ-20", // Rukwa
    TZ10: "TZ-21", // Ruvuma
    TZ17: "TZ-22", // Shinyanga
    TZ13: "TZ-23", // Singida
    TZ14: "TZ-24", // Tabora
    TZ04: "TZ-25", // Tanga
    TZ21: "TZ-26", // Manyara
    TZ25: "TZ-27", // Geita
    TZ23: "TZ-28", // Katavi
    TZ22: "TZ-29", // Njombe
    TZ24: "TZ-30", // Simiyu
    TZ26: "TZ-31", // Songwe
  },
  // timor-leste
  TLS: {
    TL02: "TL-AL", // Aileu
    TL01: "TL-AN", // Ainaro
    TL03: "TL-BA", // Baucau
    TL04: "TL-BO", // Bobonaro
    TL05: "TL-CO", // Covalima: Cova Lima
    TL07: "TL-ER", // Ermera
    TL09: "TL-LA", // Lautém
    TL08: "TL-LI", // Liquiçá: Liquiça
    TL10: "TL-MF", // Manufahi
    TL11: "TL-MT", // Manatuto
    TL12: "TL-OE", // Oecussi: Oé-Cusse Ambeno
    TL13: "TL-VI", // Viqueque
  },
  // bosnia-and-herzegovina
  BIH: {
    "54001226B17629474923252": "BA-BIH", // Federation of Bosnia and Herzegovina: Federacija Bosne i Hercegovine
    "54001226B82378099338701": "BA-BRC", // Brčko District: Brčko distrikt
    "54001226B66267900922909": "BA-SRP", // Republika Srpska
  },
  // china
  CHN: {
    "43563684B75549295130005": "CN-AH", // Anhui Province: Anhui Sheng
    "43563684B17418114845297": "CN-BJ", // Beijing Municipality: Beijing Shi
    "43563684B97743196909507": "CN-CQ", // Chongqing Municipality: Chongqing Shi
    "43563684B30737817496648": "CN-FJ", // Fujian Province: Fujian Sheng
    "43563684B38891657012300": "CN-GD", // Guangdong Province: Guangdong Sheng
    "43563684B11053367304830": "CN-GS", // Gansu Province: Gansu Sheng
    "43563684B59914390554750": "CN-GX", // Guangxi Zhuang Autonomous Region: Guangxi Zhuangzu Zizhiqu
    "43563684B78583622565599": "CN-GZ", // Guizhou Province: Guizhou Sheng
    "43563684B96917371447908": "CN-HA", // Henan Province: Henan Sheng
    "43563684B41908353419915": "CN-HB", // Hubei Province: Hubei Sheng
    "43563684B58229551045164": "CN-HE", // Hebei Province: Hebei Sheng
    "43563684B67556328368055": "CN-HI", // Hainan Province: Hainan Sheng
    "43563684B55920014778896": "CN-HL", // Heilongjiang Province: Heilongjiang Sheng
    "43563684B64987462919315": "CN-HN", // Hunan Province: Hunan Sheng
    "43563684B3982601277390": "CN-JL", // Jilin Province: Jilin Sheng
    "43563684B64367354813847": "CN-JS", // Jiangsu Province: Jiangsu Sheng
    "43563684B87813050901813": "CN-JX", // Jiangxi Province: Jiangxi Sheng
    "43563684B26929678147954": "CN-LN", // Liaoning Province: Liaoning Sheng
    "43563684B95381459098578": "CN-NM", // Inner Mongolia Autonomous Region: Nei Mongol Zizhiqu
    "43563684B64666899633249": "CN-NX", // Ningxia Hui Autonomous Region: Ningxia Huizu Zizhiqu
    "43563684B46172434476792": "CN-QH", // Qinghai Province: Qinghai Sheng
    "43563684B14397599951889": "CN-SC", // Sichuan Province: Sichuan Sheng
    "43563684B58995436924100": "CN-SD", // Shandong Province: Shandong Sheng
    "43563684B32591653033375": "CN-SH", // Shanghai Municipality: Shanghai Shi
    "43563684B62959128536432": "CN-SN", // Shaanxi Province: Shaanxi Sheng
    "43563684B34303967365755": "CN-SX", // Shanxi Province: Shanxi Sheng
    "43563684B84701301190484": "CN-TJ", // Tianjin Municipality: Tianjin Shi
    "43563684B50492231896073": "CN-XJ", // Xinjiang Uyghur Autonomous Region: Xinjiang Uygur Zizhiqu
    "43563684B19802372559419": "CN-XZ", // Tibet Autonomous Region: Xizang Zizhiqu
    "43563684B84540832148656": "CN-YN", // Yunnan Province: Yunnan Sheng
    "43563684B73528730180553": "CN-ZJ", // Zhejiang Province: Zhejiang Sheng
  },
  // mauritius
  MUS: {
    "65221844B53255720811613": "MU-PL", // Port Louis
  },
  // syria
  SYR: {
    "8384693B24866558579919": "SY-DI", // Damascus: Dimashq
    "8384693B23566608622518": "SY-DR", // Dar'a: Dar'ā
    "8384693B56550821124428": "SY-DY", // Deir-ez-Zor: Dayr az Zawr
    "8384693B3351094574159": "SY-HA", // Al-Hasakeh: Al Ḩasakah
    "8384693B93490606690779": "SY-HI", // Homs: Ḩimş
    "8384693B67178658489877": "SY-HL", // Aleppo: Ḩalab
    "8384693B76753285616287": "SY-HM", // Hama: Ḩamāh
    "8384693B38455082445791": "SY-ID", // Idleb: Idlib
    "8384693B20094101885952": "SY-LA", // Lattakia: Al Lādhiqīyah
    "8384693B30882548325909": "SY-QU", // Quneitra: Al Qunayţirah
    "8384693B44556209506703": "SY-RA", // Ar-Raqqa: Ar Raqqah
    "8384693B89451039606890": "SY-RD", // Rural Damascus: Rīf Dimashq
    "8384693B61807023607014": "SY-SU", // As-Sweida: As Suwaydā'
    "8384693B50697642267539": "SY-TA", // Tartous: Ţarţūs
  },
  // afghanistan
  AFG: {
    "AFG-1753": "AF-DAY", // Daykundi: Dāykundī
    "AFG-1772": "AF-PAN", // Panjshir: Panjshayr
    "AFG-1769": "AF-PAR", // Parwan: Parwān
    "AFG-1752": "AF-URU", // Uruzgan: Uruzgān
  },
  // trinidad-and-tobago
  TTO: {
    "TTO-55": "TT-MRC", // Rio Claro-Mayaro: Mayaro-Rio Claro
    "TTO-50": "TT-TOB", // Tobago
  },
  // azerbaijan
  AZE: {
    "2e8276a1-06fb-4905-bd96-ce4e5718bb9d": "AZ-BA", // Baku: Bakı
  },
  // angola
  AGO: {
    AGO001: "AO-BGO", // Bengo
    AGO002: "AO-BGU", // Benguela
    AGO003: "AO-BIE", // Bié
    AGO004: "AO-CAB", // Cabinda
    AGO008: "AO-CNN", // Cunene
    AGO006: "AO-CNO", // Cuanza Norte: Cuanza-Norte
    AGO007: "AO-CUS", // Cuanza Sul: Cuanza-Sul
    AGO009: "AO-HUA", // Huambo
    AGO010: "AO-HUI", // Huíla
    AGO012: "AO-LNO", // Lunda Norte: Lunda-Norte
    AGO013: "AO-LSU", // Lunda Sul: Lunda-Sul
    AGO014: "AO-MAL", // Malanje: Malange
    AGO016: "AO-NAM", // Namibe
    AGO017: "AO-UIG", // Uíge
    AGO018: "AO-ZAI", // Zaire
  },
}

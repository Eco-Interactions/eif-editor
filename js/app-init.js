var ECO_INT_NAMESPACE = {};
ECO_INT_NAMESPACE.regions = {       // From 
    "West & Central Asia": [
        "Afghanistan",
        "Armenia",
        "Azerbaijan",
        "Bahrain",
        "Cyprus",
        "Georgia",
        "Iran, Islamic Republic of",
        "Iraq",
        "Israel",
        "Jordan",
        "Kazakhstan",
        "Kuwait",
        "Kyrgyzstan",
        "Lebanon",
        "Oman",
        "Pakistan",
        "Palestine, State of",
        "Qatar",
        "Saudi Arabia",
        "Syrian Arab Republic",
        "Tajikistan",
        "Turkey",
        "Turkmenistan",
        "United Arab Emirates",
        "Uzbekistan",
        "Yemen [includes the island of Socotra]"
    ],
    "North Asia": [
        "Belarus",
        "Moldova",
        "Russian Federation",
        "Ukraine"
    ],
    "East Asia": [
        "China",
        "Hong Kong",
        "Japan",
        "Korea, Democratic People's Republic of",
        "Korea, Republic of",
        "Macao",
        "Mongolia",
        "Taiwan, Province of China"
    ],
    "South & Southeast Asia": [
        "Bangladesh",
        "Bhutan",
        "British Indian Ocean Territory [includes the Chagos Archipelago]",
        "Brunei Darussalam",
        "Cambodia",
        "Disputed Territory [includes the Paracel Islands and Spratly Islands]",
        "India [includes the Andaman, Laccadive and Nicobar island groups]",
        "Indonesia",
        "Lao People's Democratic Republic",
        "Malaysia",
        "Maldives",
        "Myanmar",
        "Nepal",
        "Philippines",
        "Singapore",
        "Sri Lanka",
        "Thailand",
        "Timor-Leste",
        "Viet Nam"
    ],
    "Europe": [
        "Aland Islands",
        "Albania",
        "Andorra",
        "Austria",
        "Belgium",
        "Bosnia and Herzegovina",
        "Bulgaria",
        "Croatia",
        "Czech Republic",
        "Denmark",
        "Estonia",
        "Faroe Islands",
        "Finland [excludes the \u00c5land Islands]",
        "France [includes Clipperton Island in the eastern Pacific Ocean]",
        "Germany",
        "Gibraltar",
        "Greece",
        "Greenland",
        "Guernsey",
        "Holy See (Vatican City State)",
        "Hungary",
        "Iceland",
        "Ireland",
        "Isle of Man",
        "Italy",
        "Latvia",
        "Liechtenstein",
        "Lithuania",
        "Luxembourg",
        "Macedonia, the former Yugoslav Republic of",
        "Malta",
        "Monaco",
        "Montenegro",
        "Netherlands",
        "Norway",
        "Poland",
        "Portugal [includes the Azores, Madeira and the Selvagens islands]",
        "Romania",
        "San Marino",
        "Serbia",
        "Slovakia",
        "Slovenia",
        "Spain [includes the Belearic and Canary islands and the Spanish North African Territories]",
        "Svalbard and Jan Mayen",
        "Sweden",
        "Switzerland",
        "United Kingdom [excludes Guernsey, Jersey and Isle of Man]"
    ],
    "Antarctic": [
        "Bouvet Island",
        "French Southern Territories [includes the Amsterdam-St Paul, Crozet, Kerguelen and Mozambique Channel island groups]",
        "Heard Island and McDonald Islands",
        "South Georgia and the South Sandwich Islands"
    ],
    "Caribbean Islands": [
        "Anguilla",
        "Antigua and Barbuda",
        "Aruba",
        "Bahamas",
        "Barbados",
        "Bermuda",
        "Bonaire, Sint Eustatius and Saba",
        "Borneo",                       
        "Cayman Islands",
        "Cuba",
        "Curacao",
        "Dominica",
        "Dominican Republic",
        "French Antilles",          
        "Grenada",
        "Guadeloupe",
        "Haiti",
        "Jamaica",
        "Martinique",
        "Montserrat",
        "Puerto Rico",
        "Saint Bathelemy",
        "Saint Kitts and Nevis",
        "Saint Lucia",
        "Saint Martin (French Part)",
        "Saint Vincent and the Grenadines",
        "Sint Maarten (Dutch Part)",
        "Trinidad and Tobago",
        "Turks and Caicos Islands",
        "Virgin Islands, British",
        "Virgin Islands, U.S."
    ],
    "Central America": [
            "Belize",
            "Costa Rica",
            "El Salvador",
            "Guatemala",
            "Honduras",
            "Mexico",
            "Nicaragua",
            "Panama"
    ],
    "North America": [
        "Canada",
        "Saint Pierre and Miquelon",
        "United States"
    ],
    "Sub-Saharan Africa": [
        "Angola",
        "Benin",
        "Botswana",
        "Burkina Faso",
        "Burundi",
        "Cameroon",
        "Cape Verde",
        "Central African Republic",
        "Chad",
        "Comoros",
        "Congo",
        "Congo, The Democratic Republic of the",
        "Cote d'Ivoire",
        "Ivory Coast",          //Technically Cote d'Ivoire
        "Djibouti",
        "Equatorial Guinea [includes the islands of Annob\u00f3n and Bioko]",
        "Eritrea",
        "Ethiopia",
        "Gabon",
        "Gambia",
        "Ghana",
        "Guinea",
        "Guinea-Bissau",
        "Kenya",
        "Lesotho",
        "Liberia",
        "Madagascar",
        "Malawi",
        "Mali",
        "Mauritania",
        "Mauritius [includes Rodrigues]",
        "Mayotte",
        "Mozambique",
        "Namibia",
        "Niger",
        "Nigeria",
        "Reunion",
        "Rwanda",
        "Saint Helena, Ascension and Tristan da Cunha",
        "Sao Tome and Principe",
        "Senegal",
        "Seychelles [includes the island of Aldabra]",
        "Sierra Leone",
        "Somalia",
        "South Africa [includes Marion and Prince Edward Islands]",
        "South Sudan",
        "Sudan",
        "Swaziland",
        "Tanzania, United Republic of",
        "Togo",
        "Uganda",
        "Zambia",
        "Zimbabwe"
    ],
    "North Africa": [
        "Algeria",
        "Egypt",
        "Libya",
        "Morocco",
        "Tunisia",
        "Western Sahara"
    ],
    "South America": [
        "Argentina",
        "Bolivia, Plurinational State of",
        "Brazil",
        "Chile [includes Easter Island]",
        "Colombia",
        "Ecuador [includes the Gal\u00e1pagos islands]",
        "Falkland Islands (Malvinas)",
        "French Guiana",
        "Guyana",
        "Paraguay",
        "Peru",
        "Suriname",
        "Uruguay",
        "Venezuela, Bolivarian Republic of"
    ],
    "Oceania": [
        "American Samoa",
        "Australia [includes the island groups of Ashmore-Cartier, Lord Howe and Macquarie]",
        "Christmas Island",
        "Cocos (Keeling) Islands",
        "Cook Islands",
        "Fiji",
        "French Polynesia [includes the island groups of the Marquesas, Society, Tuamotu and Tubai]",
        "Guam",
        "Kiribati [includes the Gilbert, Kiribati Line and Phoenix island groups]",
        "Marshall Islands",
        "Micronesia, Federated States of",
        "Nauru",
        "New Caledonia",
        "New Zealand [includes the Antipodean, Chatham and Kermadec island groups]",
        "Niue",
        "Norfolk Island",
        "Northern Mariana Islands",
        "Palau",
        "Papua New Guinea [includes the Bismarck Archipelago and the North Solomons]",
        "Pitcairn",
        "Samoa",
        "Solomon Islands",
        "Tokelau",
        "Tonga",
        "Tuvalu",
        "United States Minor Outlying Islands [includes the Howland-Baker, Johnston, Midway, US Line and Wake island groups]",
        "Vanuatu",
        "Wallis and Futuna"
    ]
};
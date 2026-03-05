// FIXED: Backfill auction draft values from Google Sheets (2014-2025)
// Run: node backend/scripts/backfill-draft-values.js
// League: Bro Montana Bowl (cmm47aj1w07klry65jxa29jwu)
//
// IMPORTANT: Existing draftData structure is { type: "auction", picks: [...] }
// Each pick has: { cost, pick, round, teamKey, isKeeper, playerId, ownerName, playerName }
// We update the `cost` field on existing picks, matching by ownerName + player last name

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LEAGUE_ID = 'cmm47aj1w07klry65jxa29jwu';

const DRAFT_DATA = {
  "2025": {
    "budgets": {
      "Scott": 178,
      "Spencer H": 219,
      "Eric": 218,
      "Ragen": 230,
      "Nick Trow": 179,
      "Jakob": 164,
      "Caleb": 232,
      "Tank": 226,
      "Dallas": 158,
      "Mase R": 234,
      "bradley": 162
    },
    "cash_spent": {},
    "picks": {
      "Scott": [
        {
          "player": "B. Mayfield",
          "position": "QB",
          "cost": 5
        },
        {
          "player": "M. Nabers",
          "position": "WR",
          "cost": 30
        },
        {
          "player": "D. London",
          "position": "WR",
          "cost": 26
        },
        {
          "player": "J. Connor",
          "position": "RB",
          "cost": 26
        },
        {
          "player": "B. Irving",
          "position": "RB",
          "cost": 11
        },
        {
          "player": "R. Pearsall",
          "position": "W/R/T",
          "cost": 11
        },
        {
          "player": "E. Engram",
          "position": "TE",
          "cost": 9
        },
        {
          "player": "J. Bates",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Eagles",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "T. Henderson",
          "position": null,
          "cost": 31
        },
        {
          "player": "JCM",
          "position": null,
          "cost": 9
        },
        {
          "player": "C. Skattebo",
          "position": null,
          "cost": 8
        },
        {
          "player": "D. Waller",
          "position": null,
          "cost": 1
        },
        {
          "player": "J. Mason",
          "position": null,
          "cost": 5
        },
        {
          "player": "DeMario Douglas",
          "position": null,
          "cost": 1
        }
      ],
      "Spencer H": [
        {
          "player": "J. Daniels",
          "position": "QB",
          "cost": 11
        },
        {
          "player": "T. McLaurin",
          "position": "WR",
          "cost": 16
        },
        {
          "player": "D. Adams",
          "position": "WR",
          "cost": 26
        },
        {
          "player": "S. Barkley",
          "position": "RB",
          "cost": 76
        },
        {
          "player": "J. Jacobs",
          "position": "RB",
          "cost": 49
        },
        {
          "player": "Z. Flowers",
          "position": "W/R/T",
          "cost": 8
        },
        {
          "player": "D. Goddard",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "H. Butker",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Broncos",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "J. Warren",
          "position": null,
          "cost": 8
        },
        {
          "player": "T. McMillian",
          "position": null,
          "cost": 12
        },
        {
          "player": "J. Downs",
          "position": null,
          "cost": 1
        },
        {
          "player": "T. Bigsby",
          "position": null,
          "cost": 4
        },
        {
          "player": "W. Shipley",
          "position": null,
          "cost": 1
        },
        {
          "player": "T. Allgeier",
          "position": null,
          "cost": 2
        }
      ],
      "Eric": [
        {
          "player": "L. Jackson",
          "position": "QB",
          "cost": 37
        },
        {
          "player": "N. Collins",
          "position": "WR",
          "cost": 22
        },
        {
          "player": "D. Smith",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "D. Henry",
          "position": "RB",
          "cost": 79
        },
        {
          "player": "D. Swift",
          "position": "RB",
          "cost": 25
        },
        {
          "player": "D. Montgomery",
          "position": "W/R/T",
          "cost": 16
        },
        {
          "player": "K. Pitts",
          "position": "TE",
          "cost": 3
        },
        {
          "player": "J. Elliot",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Lions",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "G. Pickens",
          "position": null,
          "cost": 17
        },
        {
          "player": "C. Tillman",
          "position": null,
          "cost": 1
        },
        {
          "player": "K. Miller",
          "position": null,
          "cost": 1
        },
        {
          "player": "M. Mims",
          "position": null,
          "cost": 1
        },
        {
          "player": "R. Bateman",
          "position": null,
          "cost": 1
        },
        {
          "player": "L. Burden",
          "position": null,
          "cost": 1
        }
      ],
      "Ragen": [
        {
          "player": "D. Prescott",
          "position": "QB",
          "cost": 2
        },
        {
          "player": "J. Chase",
          "position": "WR",
          "cost": 84
        },
        {
          "player": "DK Metcalf",
          "position": "WR",
          "cost": 18
        },
        {
          "player": "C. Hubbard",
          "position": "RB",
          "cost": 11
        },
        {
          "player": "J. Taylor",
          "position": "RB",
          "cost": 61
        },
        {
          "player": "E. Egbuka",
          "position": "W/R/T",
          "cost": 6
        },
        {
          "player": "T. McBride",
          "position": "TE",
          "cost": 20
        },
        {
          "player": "T. Bass",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Packers",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "DJ Moore",
          "position": null,
          "cost": 12
        },
        {
          "player": "J. Love",
          "position": null,
          "cost": 1
        },
        {
          "player": "T. Etienne",
          "position": null,
          "cost": 5
        },
        {
          "player": "R. Stevenson",
          "position": null,
          "cost": 5
        },
        {
          "player": "R. Dowdle",
          "position": null,
          "cost": 1
        },
        {
          "player": "D. Sampson",
          "position": null,
          "cost": 2
        }
      ],
      "Nick Trow": [
        {
          "player": "D. Maye",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "A. St. Brown",
          "position": "WR",
          "cost": 61
        },
        {
          "player": "P. Nacua",
          "position": "WR",
          "cost": 53
        },
        {
          "player": "A Jones",
          "position": "RB",
          "cost": 12
        },
        {
          "player": "T. Tracey",
          "position": "RB",
          "cost": 4
        },
        {
          "player": "C. Ridley",
          "position": "W/R/T",
          "cost": 16
        },
        {
          "player": "S. LaPorta",
          "position": "TE",
          "cost": 10
        },
        {
          "player": "T. Loop",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Bucs",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "Jav Williams",
          "position": null,
          "cost": 7
        },
        {
          "player": "C. Godwin",
          "position": null,
          "cost": 3
        },
        {
          "player": "C. Olave",
          "position": null,
          "cost": 3
        },
        {
          "player": "T. Kraft",
          "position": null,
          "cost": 2
        },
        {
          "player": "R. Shaheed",
          "position": null,
          "cost": 2
        },
        {
          "player": "J. Reed",
          "position": null,
          "cost": 3
        }
      ],
      "Jakob": [
        {
          "player": "B. Nix",
          "position": "QB",
          "cost": 4
        },
        {
          "player": "L. McConkey",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "Jam Williams",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "C. McCaffery",
          "position": "RB",
          "cost": 66
        },
        {
          "player": "B. Hall",
          "position": "RB",
          "cost": 16
        },
        {
          "player": "T. Hunter",
          "position": "W/R/T",
          "cost": 7
        },
        {
          "player": "T. Warren",
          "position": "TE",
          "cost": 7
        },
        {
          "player": "C. Dicker",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Ravens",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "J. Mixon",
          "position": null,
          "cost": 6
        },
        {
          "player": "J. Fields",
          "position": null,
          "cost": 1
        },
        {
          "player": "B. Allen",
          "position": null,
          "cost": 5
        },
        {
          "player": "B. Robinson",
          "position": null,
          "cost": 6
        },
        {
          "player": "A. Ekeler",
          "position": null,
          "cost": 7
        },
        {
          "player": "D. Samuel",
          "position": null,
          "cost": 11
        }
      ],
      "Caleb": [
        {
          "player": "J. Allen",
          "position": "QB",
          "cost": 34
        },
        {
          "player": "J. Jefferson",
          "position": "WR",
          "cost": 63
        },
        {
          "player": "M. Evans",
          "position": "WR",
          "cost": 35
        },
        {
          "player": "JK Dobbins",
          "position": "RB",
          "cost": 11
        },
        {
          "player": "RJ. Harvey",
          "position": "RB",
          "cost": 19
        },
        {
          "player": "AJ Brown",
          "position": "W/R/T",
          "cost": 45
        },
        {
          "player": "M. Andrews",
          "position": "TE",
          "cost": 5
        },
        {
          "player": "C. Little",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Bills",
          "position": "DEF",
          "cost": null
        },
        {
          "player": "Q. Judkins",
          "position": null,
          "cost": 2
        },
        {
          "player": "J. Meyers",
          "position": null,
          "cost": 3
        },
        {
          "player": "J. Jeudy",
          "position": null,
          "cost": 4
        },
        {
          "player": "N. Harris",
          "position": null,
          "cost": 1
        },
        {
          "player": "J. Jennings",
          "position": null,
          "cost": 5
        },
        {
          "player": "R. Davis",
          "position": null,
          "cost": 2
        }
      ],
      "Tank": [
        {
          "player": "C. Williams",
          "position": "QB",
          "cost": 2
        },
        {
          "player": "B Thomas Jr",
          "position": "WR",
          "cost": 14
        },
        {
          "player": "C. Sutton",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "D. Achane",
          "position": "RB",
          "cost": 32
        },
        {
          "player": "Bijan Robinson",
          "position": "RB",
          "cost": 84
        },
        {
          "player": "K. Walker III",
          "position": "W/R/T",
          "cost": 37
        },
        {
          "player": "T. Hockenson",
          "position": "TE",
          "cost": 3
        },
        {
          "player": "K. Fairbairn",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Vikings",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "G. Wilson",
          "position": null,
          "cost": 15
        },
        {
          "player": "Z. Charbonnet",
          "position": null,
          "cost": 7
        },
        {
          "player": "R. Rice",
          "position": null,
          "cost": 7
        },
        {
          "player": "Trey Benson",
          "position": null,
          "cost": 3
        },
        {
          "player": "K. Coleman",
          "position": null,
          "cost": 5
        },
        {
          "player": "C. Loveland",
          "position": null,
          "cost": 2
        }
      ],
      "Dallas": [
        {
          "player": "P. Mahomes",
          "position": "QB",
          "cost": 9
        },
        {
          "player": "T. Higgins",
          "position": "WR",
          "cost": 16
        },
        {
          "player": "T. Hill",
          "position": "WR",
          "cost": 36
        },
        {
          "player": "A. Kamara",
          "position": "RB",
          "cost": 37
        },
        {
          "player": "T. Pollard",
          "position": "RB",
          "cost": 15
        },
        {
          "player": "M. Golden",
          "position": "W/R/T",
          "cost": 10
        },
        {
          "player": "B. Bowers",
          "position": "TE",
          "cost": 11
        },
        {
          "player": "B. Aubrey",
          "position": "K",
          "cost": 3
        },
        {
          "player": "Seahwaks",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "J. Blue",
          "position": null,
          "cost": 4
        },
        {
          "player": "M. Pittman",
          "position": null,
          "cost": 5
        },
        {
          "player": "K. Allen",
          "position": null,
          "cost": 5
        },
        {
          "player": "B. Tuten",
          "position": null,
          "cost": 2
        },
        {
          "player": "N. Chubb",
          "position": null,
          "cost": 2
        },
        {
          "player": "H. Brown",
          "position": null,
          "cost": 2
        }
      ],
      "Mase R": [
        {
          "player": "J. Burrow",
          "position": "QB",
          "cost": 13
        },
        {
          "player": "CeeDee Lamb",
          "position": "WR",
          "cost": 62
        },
        {
          "player": "X. Worthy",
          "position": "WR",
          "cost": 19
        },
        {
          "player": "C. Brown",
          "position": "RB",
          "cost": 13
        },
        {
          "player": "J. Gibbs",
          "position": "RB",
          "cost": 74
        },
        {
          "player": "R. Odunze",
          "position": "W/R/T",
          "cost": 6
        },
        {
          "player": "G. Kittle",
          "position": "TE",
          "cost": 26
        },
        {
          "player": "C. McLaughlin",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Texans",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "B. Corum",
          "position": null,
          "cost": 1
        },
        {
          "player": "C. Kupp",
          "position": null,
          "cost": 7
        },
        {
          "player": "B. Purdy",
          "position": null,
          "cost": 3
        },
        {
          "player": "D. Mooney",
          "position": null,
          "cost": 4
        },
        {
          "player": "J. Ford",
          "position": null,
          "cost": 2
        },
        {
          "player": "X. Legette",
          "position": null,
          "cost": 1
        }
      ],
      "bradley": [
        {
          "player": "K. Murray",
          "position": "QB",
          "cost": 6
        },
        {
          "player": "M Harrison JR",
          "position": "WR",
          "cost": 24
        },
        {
          "player": "S. Diggs",
          "position": "WR",
          "cost": 9
        },
        {
          "player": "K. Williams",
          "position": "RB",
          "cost": 50
        },
        {
          "player": "J. Cook",
          "position": "RB",
          "cost": 42
        },
        {
          "player": "K. Johnson",
          "position": "W/R/T",
          "cost": 6
        },
        {
          "player": "D. Njoku",
          "position": "TE",
          "cost": 2
        },
        {
          "player": "Gay",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Jets",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "J. Higgins",
          "position": null,
          "cost": 1
        },
        {
          "player": "J. Addison",
          "position": null,
          "cost": 6
        },
        {
          "player": "R. White",
          "position": null,
          "cost": 5
        },
        {
          "player": "C. Kirk",
          "position": null,
          "cost": 1
        },
        {
          "player": "J. Warren",
          "position": null,
          "cost": 3
        },
        {
          "player": "D. Kincaid",
          "position": null,
          "cost": 2
        }
      ]
    }
  },
  "2024": {
    "budgets": {
      "RJ": 248,
      "Eric": 210,
      "Scott": 178,
      "Tank": 312,
      "Anthony": 33,
      "Mase R": 137,
      "bradley": 16,
      "Nick Trow": 323,
      "Jakob": 268,
      "Spencer H": 335,
      "Dallas": 206,
      "Caleb": 134
    },
    "cash_spent": {},
    "picks": {
      "RJ": [
        {
          "player": "Jalen Hurts",
          "position": "QB",
          "cost": 29
        },
        {
          "player": "Tyreek Hill",
          "position": "WR",
          "cost": 80
        },
        {
          "player": "Amari Cooper",
          "position": "WR",
          "cost": 8
        },
        {
          "player": "Breece Hall",
          "position": "RB",
          "cost": 48
        },
        {
          "player": "Josh Jacobs",
          "position": "RB",
          "cost": 41
        },
        {
          "player": "DaVonta Smith",
          "position": "W/R/T",
          "cost": 20
        },
        {
          "player": "Trey McBride",
          "position": "TE",
          "cost": 10
        },
        {
          "player": "Bates",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Raiders",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "Jaylen Warren",
          "position": null,
          "cost": 1
        },
        {
          "player": "Chuba Hubbard",
          "position": null,
          "cost": 1
        },
        {
          "player": "Jayden Reed",
          "position": null,
          "cost": 4
        },
        {
          "player": "Rico Dowdle",
          "position": null,
          "cost": 2
        },
        {
          "player": "Xavier Legette",
          "position": null,
          "cost": 1
        },
        {
          "player": "Josh Palmer",
          "position": null,
          "cost": 1
        }
      ],
      "Eric": [
        {
          "player": "Lamar Jackson",
          "position": "QB",
          "cost": 25
        },
        {
          "player": "Niko Collins",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "Cooper Kupp",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "Kyren Williams",
          "position": "RB",
          "cost": 70
        },
        {
          "player": "Joe Mixon",
          "position": "RB",
          "cost": 35
        },
        {
          "player": "Devin Singletary",
          "position": "W/R/T",
          "cost": 8
        },
        {
          "player": "Mark Andrews",
          "position": "TE",
          "cost": 18
        },
        {
          "player": "Fairbairn",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Jets",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "Blake Corum",
          "position": null,
          "cost": 14
        },
        {
          "player": "Gus Edwards",
          "position": null,
          "cost": 3
        },
        {
          "player": "Terry McLaurin",
          "position": null,
          "cost": 6
        },
        {
          "player": "Christian Watson",
          "position": null,
          "cost": 4
        },
        {
          "player": "Rashi Shaheed",
          "position": null,
          "cost": 1
        },
        {
          "player": "Jordan Addison",
          "position": null,
          "cost": 1
        }
      ],
      "Scott": [
        {
          "player": "Kyler Murray",
          "position": "QB",
          "cost": 11
        },
        {
          "player": "Marvin Harrison JR",
          "position": "WR",
          "cost": 35
        },
        {
          "player": "Puka Nacua",
          "position": "WR",
          "cost": 53
        },
        {
          "player": "James Connor",
          "position": "RB",
          "cost": 17
        },
        {
          "player": "Aaron Jones",
          "position": "RB",
          "cost": 12
        },
        {
          "player": "Xavier Worthy",
          "position": "W/R/T",
          "cost": 8
        },
        {
          "player": "Evan Engram",
          "position": "TE",
          "cost": 2
        },
        {
          "player": "Jake Moody",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Chiefs",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "Malik Nabers",
          "position": null,
          "cost": 15
        },
        {
          "player": "Nick Chubb",
          "position": null,
          "cost": 14
        },
        {
          "player": "Zay Flowers",
          "position": null,
          "cost": 4
        },
        {
          "player": "Keon Coleman",
          "position": null,
          "cost": 3
        },
        {
          "player": "Bucky Irving",
          "position": null,
          "cost": 1
        },
        {
          "player": "Brandin Cooks",
          "position": null,
          "cost": 1
        }
      ],
      "Tank": [
        {
          "player": "Josh Allen",
          "position": "QB",
          "cost": 30
        },
        {
          "player": "Chris Olave",
          "position": "WR",
          "cost": 26
        },
        {
          "player": "Drake London",
          "position": "WR",
          "cost": 13
        },
        {
          "player": "Isiah Pacheco",
          "position": "RB",
          "cost": 26
        },
        {
          "player": "De'Von Achane",
          "position": "RB",
          "cost": 16
        },
        {
          "player": "David Montgomery",
          "position": "W/R/T",
          "cost": 17
        },
        {
          "player": "Sam LaPorta",
          "position": "TE",
          "cost": 30
        },
        {
          "player": "Zuerlein",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Dolphins",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "CeeDee Lamb",
          "position": null,
          "cost": 70
        },
        {
          "player": "Travis Etienne",
          "position": null,
          "cost": 58
        },
        {
          "player": "Tyjae Spears",
          "position": null,
          "cost": 6
        },
        {
          "player": "Dak Prescott",
          "position": null,
          "cost": 3
        },
        {
          "player": "Calvin Ridley",
          "position": null,
          "cost": 11
        },
        {
          "player": "Brian Thomas JR",
          "position": null,
          "cost": 4
        }
      ],
      "Anthony": [
        {
          "player": "Caleb Williams",
          "position": "QB",
          "cost": 2
        },
        {
          "player": "Marquis Brown",
          "position": "WR",
          "cost": 2
        },
        {
          "player": "Rome Odunze",
          "position": "WR",
          "cost": 4
        },
        {
          "player": "Tony Pollard",
          "position": "RB",
          "cost": 5
        },
        {
          "player": "Raheem Mostert",
          "position": "RB",
          "cost": 6
        },
        {
          "player": "Jerome Ford",
          "position": "W/R/T",
          "cost": 3
        },
        {
          "player": "Isaiah Likely",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "Harrison Butker",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Browns",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "Justin Herbert",
          "position": null,
          "cost": 1
        },
        {
          "player": "Jaxon Smith-Njigba",
          "position": null,
          "cost": 2
        },
        {
          "player": "Jaleel McLaughlin",
          "position": null,
          "cost": 1
        },
        {
          "player": "Trey Benson",
          "position": null,
          "cost": 1
        },
        {
          "player": "Kiimani Vidal",
          "position": null,
          "cost": 1
        },
        {
          "player": "Audric Estime",
          "position": null,
          "cost": 1
        }
      ],
      "Mase R": [
        {
          "player": "Patrick Mahomes",
          "position": "QB",
          "cost": 19
        },
        {
          "player": "Garrett Wilson",
          "position": "WR",
          "cost": 24
        },
        {
          "player": "Rashee Rice",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "Brian Robinson Jr",
          "position": "RB",
          "cost": 17
        },
        {
          "player": "Rhamondre stevenson",
          "position": "RB",
          "cost": 16
        },
        {
          "player": "George Pickens",
          "position": "W/R/T",
          "cost": 15
        },
        {
          "player": "George Kittle",
          "position": "TE",
          "cost": 23
        },
        {
          "player": "Jake Elliot",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Ravens",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "Braelon Allen",
          "position": null,
          "cost": 1
        },
        {
          "player": "Chase Brown",
          "position": null,
          "cost": 3
        },
        {
          "player": "Brock Bowers",
          "position": null,
          "cost": 1
        },
        {
          "player": "Courtland Sutton",
          "position": null,
          "cost": 2
        },
        {
          "player": "Ricky Pearsall",
          "position": null,
          "cost": 1
        },
        {
          "player": "Ty Chandler",
          "position": null,
          "cost": 1
        }
      ],
      "bradley": [
        {
          "player": "Kirk Cousins",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "Tyler Lockett",
          "position": "WR",
          "cost": 1
        },
        {
          "player": "Darnell Mooney",
          "position": "WR",
          "cost": 1
        },
        {
          "player": "Khalil Herbert",
          "position": "RB",
          "cost": 1
        },
        {
          "player": "Jaylen Wright",
          "position": "RB",
          "cost": 1
        },
        {
          "player": "Romeo Doubs",
          "position": "W/R/T",
          "cost": 1
        },
        {
          "player": "TJ Hockenson",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "Koo",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Patriots",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "Bo Nix",
          "position": null,
          "cost": 1
        },
        {
          "player": "Marvin Mims JR",
          "position": null,
          "cost": 1
        },
        {
          "player": "D. Ogunbowale",
          "position": null,
          "cost": 1
        },
        {
          "player": "Cole Kmet",
          "position": null,
          "cost": 1
        },
        {
          "player": "Tua",
          "position": null,
          "cost": 1
        },
        {
          "player": "Jakobi Meyers",
          "position": null,
          "cost": 1
        }
      ],
      "Nick Trow": [
        {
          "player": "Jordan Love",
          "position": "QB",
          "cost": 4
        },
        {
          "player": "Amon Ra St Brown",
          "position": "WR",
          "cost": 72
        },
        {
          "player": "DeeBo Samuel",
          "position": "WR",
          "cost": 31
        },
        {
          "player": "James Cook",
          "position": "RB",
          "cost": 28
        },
        {
          "player": "CMC",
          "position": "RB",
          "cost": 96
        },
        {
          "player": "Rachaad White",
          "position": "W/R/T",
          "cost": 28
        },
        {
          "player": "Kyle Pitts",
          "position": "TE",
          "cost": 10
        },
        {
          "player": "Justin Tucker",
          "position": "K",
          "cost": 2
        },
        {
          "player": "49ers",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "Najee Harris",
          "position": null,
          "cost": 9
        },
        {
          "player": "Devante Adams",
          "position": null,
          "cost": 21
        },
        {
          "player": "DJ Moore",
          "position": null,
          "cost": 16
        },
        {
          "player": "Ray Davis",
          "position": null,
          "cost": 1
        },
        {
          "player": "Taysom Hill",
          "position": null,
          "cost": 2
        },
        {
          "player": "Curtis Samuel",
          "position": null,
          "cost": 1
        }
      ],
      "Jakob": [
        {
          "player": "Anthony Richardson",
          "position": "QB",
          "cost": 11
        },
        {
          "player": "Jaylen Waddle",
          "position": "WR",
          "cost": 19
        },
        {
          "player": "Michael Pittman JR",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "Derrick Henry",
          "position": "RB",
          "cost": 99
        },
        {
          "player": "Saquon Barkley",
          "position": "RB",
          "cost": 77
        },
        {
          "player": "DK Metcalf",
          "position": "W/R/T",
          "cost": 25
        },
        {
          "player": "Dalton Kincaid",
          "position": "TE",
          "cost": 11
        },
        {
          "player": "McPherson",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Saints",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "Joe Burrow",
          "position": null,
          "cost": 3
        },
        {
          "player": "Zach Charbonnet",
          "position": null,
          "cost": 2
        },
        {
          "player": "Ladd McConkey",
          "position": null,
          "cost": 2
        },
        {
          "player": "DeAndre Hopkins",
          "position": null,
          "cost": 2
        },
        {
          "player": "Jameson Williams",
          "position": null,
          "cost": 2
        },
        {
          "player": "Tyrone Tracy Jr",
          "position": null,
          "cost": 1
        }
      ],
      "Spencer H": [
        {
          "player": "Jayden Daniels",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "AJ Brown",
          "position": "WR",
          "cost": 54
        },
        {
          "player": "Justin Jefferson",
          "position": "WR",
          "cost": 69
        },
        {
          "player": "Bijan Robinson",
          "position": "RB",
          "cost": 95
        },
        {
          "player": "Jahmyr Gibbs",
          "position": "RB",
          "cost": 68
        },
        {
          "player": "Javonte Williams",
          "position": "W/R/T",
          "cost": 9
        },
        {
          "player": "Travis Kelce",
          "position": "TE",
          "cost": 26
        },
        {
          "player": "Hopkins",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Steelers",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "JK Dobbins",
          "position": null,
          "cost": 1
        },
        {
          "player": "Chris Godwin",
          "position": null,
          "cost": 2
        },
        {
          "player": "Ja'Lynn Polk",
          "position": null,
          "cost": 1
        },
        {
          "player": "Christian Kirk",
          "position": null,
          "cost": 4
        },
        {
          "player": "Tyler Allgeier",
          "position": null,
          "cost": 2
        },
        {
          "player": "Adoni Mitchell",
          "position": null,
          "cost": 1
        }
      ],
      "Dallas": [
        {
          "player": "CJ Stroud",
          "position": "QB",
          "cost": 16
        },
        {
          "player": "Jamar Chase",
          "position": "WR",
          "cost": 48
        },
        {
          "player": "Mike Evans",
          "position": "WR",
          "cost": 29
        },
        {
          "player": "Jonathan Taylor",
          "position": "RB",
          "cost": 68
        },
        {
          "player": "D'Andre Swift",
          "position": "RB",
          "cost": 10
        },
        {
          "player": "Tee Higgins",
          "position": "W/R/T",
          "cost": 6
        },
        {
          "player": "David Njoku",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "Brandon Aubrey",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Dallas",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "Austin Ekeler",
          "position": null,
          "cost": 8
        },
        {
          "player": "Tank Dell",
          "position": null,
          "cost": 8
        },
        {
          "player": "Jonathan Brooks",
          "position": null,
          "cost": 5
        },
        {
          "player": "Aaron Rodgers",
          "position": null,
          "cost": 1
        },
        {
          "player": "Gabe Davis",
          "position": null,
          "cost": 1
        },
        {
          "player": "Trey Sermon",
          "position": null,
          "cost": 1
        }
      ],
      "Caleb": [
        {
          "player": "Brock Purdy",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "Brandon Aiyuk",
          "position": "WR",
          "cost": 19
        },
        {
          "player": "Stefon Diggs",
          "position": "WR",
          "cost": 20
        },
        {
          "player": "Kenneth Walker",
          "position": "RB",
          "cost": 34
        },
        {
          "player": "Zamir White",
          "position": "RB",
          "cost": 13
        },
        {
          "player": "Alvin Kamara",
          "position": "W/R/T",
          "cost": 24
        },
        {
          "player": "Dallas Goedert",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "Dicker",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Jaguars",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "Ezekiel Elliot",
          "position": null,
          "cost": 4
        },
        {
          "player": "Zach Moss",
          "position": null,
          "cost": 6
        },
        {
          "player": "Keenan Allen",
          "position": null,
          "cost": 5
        },
        {
          "player": "Dionte Johnson",
          "position": null,
          "cost": 3
        },
        {
          "player": "Mike Williams",
          "position": null,
          "cost": 1
        },
        {
          "player": "Jerry Jeudy",
          "position": null,
          "cost": 1
        }
      ]
    }
  },
  "2023": {
    "budgets": {
      "Nick Trow": 198,
      "Caleb": 135,
      "Scott": 390,
      "Dallas": 427,
      "Spencer H": 191,
      "Mase R": 45,
      "Eric": 239,
      "Anthony": 224,
      "Tank": 132,
      "Jakob": 171,
      "bradley": 24,
      "RJ": 224
    },
    "cash_spent": {},
    "picks": {
      "Nick Trow": [
        {
          "player": "R Wilson",
          "position": "QB",
          "cost": 2
        },
        {
          "player": "A St Brown",
          "position": "WR",
          "cost": 36
        },
        {
          "player": "D Samuel",
          "position": "WR",
          "cost": 26
        },
        {
          "player": "Bijan Robinson",
          "position": "RB",
          "cost": 68
        },
        {
          "player": "D Pierce",
          "position": "RB",
          "cost": 22
        },
        {
          "player": "D Cook",
          "position": "W/R/T",
          "cost": 16
        },
        {
          "player": "G Dulcich",
          "position": "TE",
          "cost": 2
        },
        {
          "player": "G Zuerlein",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Ravens",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "JaVonte Williams",
          "position": null,
          "cost": 18
        },
        {
          "player": "C Sutton",
          "position": null,
          "cost": 1
        },
        {
          "player": "J McKinnon",
          "position": null,
          "cost": 2
        },
        {
          "player": "M Mims",
          "position": null,
          "cost": 1
        },
        {
          "player": "Curt Samuel",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Hardman",
          "position": null,
          "cost": 1
        }
      ],
      "Caleb": [
        {
          "player": "J Herbert",
          "position": "QB",
          "cost": 20
        },
        {
          "player": "C Lamb",
          "position": "WR",
          "cost": 48
        },
        {
          "player": "C Kirk",
          "position": "WR",
          "cost": 2
        },
        {
          "player": "K Walker III",
          "position": "RB",
          "cost": 17
        },
        {
          "player": "B Hall",
          "position": "RB",
          "cost": 24
        },
        {
          "player": "D Swift",
          "position": "W/R/T",
          "cost": 8
        },
        {
          "player": "TJ Hockenson",
          "position": "TE",
          "cost": 5
        },
        {
          "player": "B McManus",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Patriots",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "T Allgeier",
          "position": null,
          "cost": 2
        },
        {
          "player": "Juju Smith-",
          "position": null,
          "cost": 2
        },
        {
          "player": "R Penny",
          "position": null,
          "cost": 1
        },
        {
          "player": "Jak Meyers",
          "position": null,
          "cost": 2
        },
        {
          "player": "D Foreman",
          "position": null,
          "cost": 1
        },
        {
          "player": "T Chandler",
          "position": null,
          "cost": 1
        }
      ],
      "Scott": [
        {
          "player": "J Hurts",
          "position": "QB",
          "cost": 36
        },
        {
          "player": "AJ Brown",
          "position": "WR",
          "cost": 51
        },
        {
          "player": "T. Hill",
          "position": "WR",
          "cost": 82
        },
        {
          "player": "D Henry",
          "position": "RB",
          "cost": 86
        },
        {
          "player": "T Etienne",
          "position": "RB",
          "cost": 40
        },
        {
          "player": "T Pollard",
          "position": "W/R/T",
          "cost": 22
        },
        {
          "player": "D Waller",
          "position": "TE",
          "cost": 13
        },
        {
          "player": "D Carlson",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Cowboys",
          "position": "DEF",
          "cost": 3
        },
        {
          "player": "DK Metcalf",
          "position": null,
          "cost": 26
        },
        {
          "player": "J Conner",
          "position": null,
          "cost": 7
        },
        {
          "player": "JK Dobbins",
          "position": null,
          "cost": 10
        },
        {
          "player": "M Williams",
          "position": null,
          "cost": 7
        },
        {
          "player": "B Cooks",
          "position": null,
          "cost": 4
        },
        {
          "player": "OBJ",
          "position": null,
          "cost": 1
        }
      ],
      "Dallas": [
        {
          "player": "P Mahomes",
          "position": "QB",
          "cost": 50
        },
        {
          "player": "J Chase",
          "position": "WR",
          "cost": 24
        },
        {
          "player": "C Kupp",
          "position": "WR",
          "cost": 68
        },
        {
          "player": "J Mixon",
          "position": "RB",
          "cost": 45
        },
        {
          "player": "M Sanders",
          "position": "RB",
          "cost": 15
        },
        {
          "player": "S Diggs",
          "position": "W/R/T",
          "cost": 68
        },
        {
          "player": "T Kelce",
          "position": "TE",
          "cost": 88
        },
        {
          "player": "J Tucker",
          "position": "K",
          "cost": 5
        },
        {
          "player": "49ers",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "A Cooper",
          "position": null,
          "cost": 13
        },
        {
          "player": "K Cousins",
          "position": null,
          "cost": 1
        },
        {
          "player": "K Herbert",
          "position": null,
          "cost": 12
        },
        {
          "player": "J Taylor",
          "position": null,
          "cost": 34
        },
        {
          "player": "M Thomas",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Breida",
          "position": null,
          "cost": 1
        }
      ],
      "Spencer H": [
        {
          "player": "J Allen",
          "position": "QB",
          "cost": 35
        },
        {
          "player": "D Smith",
          "position": "WR",
          "cost": 17
        },
        {
          "player": "J Waddle",
          "position": "WR",
          "cost": 22
        },
        {
          "player": "I Pacheco",
          "position": "RB",
          "cost": 13
        },
        {
          "player": "S Barkley",
          "position": "RB",
          "cost": 66
        },
        {
          "player": "J Jeudy",
          "position": "W/R/T",
          "cost": 10
        },
        {
          "player": "Dal Kincaid",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "B Maher",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Dolphins",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "C Akers",
          "position": null,
          "cost": 13
        },
        {
          "player": "T Bigsby",
          "position": null,
          "cost": 3
        },
        {
          "player": "Sky Moore",
          "position": null,
          "cost": 2
        },
        {
          "player": "J Wilson",
          "position": null,
          "cost": 3
        },
        {
          "player": "M Pittman",
          "position": null,
          "cost": 2
        },
        {
          "player": "A Lazard",
          "position": null,
          "cost": 1
        }
      ],
      "Mase R": [
        {
          "player": "D Jones",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "G Wilson",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "G Pickens",
          "position": "WR",
          "cost": 5
        },
        {
          "player": "B Robinson Jr",
          "position": "RB",
          "cost": 7
        },
        {
          "player": "E Mitchell",
          "position": "RB",
          "cost": 3
        },
        {
          "player": "J Addison",
          "position": "W/R/T",
          "cost": 2
        },
        {
          "player": "D Njoku",
          "position": "TE",
          "cost": 3
        },
        {
          "player": "J Myers",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Bengals",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "A Rodgers",
          "position": null,
          "cost": 2
        },
        {
          "player": "Rash Rice",
          "position": null,
          "cost": 1
        },
        {
          "player": "A Thielen",
          "position": null,
          "cost": 1
        },
        {
          "player": "G Edwards",
          "position": null,
          "cost": 1
        },
        {
          "player": "C Claypool",
          "position": null,
          "cost": 1
        },
        {
          "player": "Jay Hyatt",
          "position": null,
          "cost": 1
        }
      ],
      "Eric": [
        {
          "player": "D Watson",
          "position": "QB",
          "cost": 5
        },
        {
          "player": "T Higgins",
          "position": "WR",
          "cost": 25
        },
        {
          "player": "T McLaurin",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "J Jacobs",
          "position": "RB",
          "cost": 52
        },
        {
          "player": "C McCaffery",
          "position": "RB",
          "cost": 84
        },
        {
          "player": "K Allen",
          "position": "W/R/T",
          "cost": 25
        },
        {
          "player": "G Kittle",
          "position": "TE",
          "cost": 18
        },
        {
          "player": "Y Koo",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Jets",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "T Lockett",
          "position": null,
          "cost": 4
        },
        {
          "player": "Trey Burks",
          "position": null,
          "cost": 4
        },
        {
          "player": "Jay Warren",
          "position": null,
          "cost": 5
        },
        {
          "player": "Gabe Davis",
          "position": null,
          "cost": 2
        },
        {
          "player": "Nico Collins",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Gallup",
          "position": null,
          "cost": 1
        }
      ],
      "Anthony": [
        {
          "player": "J Fields",
          "position": "QB",
          "cost": 15
        },
        {
          "player": "DJ Moore",
          "position": "WR",
          "cost": 27
        },
        {
          "player": "B Aiyuk",
          "position": "WR",
          "cost": 14
        },
        {
          "player": "J Cook",
          "position": "RB",
          "cost": 14
        },
        {
          "player": "N Chubb",
          "position": "RB",
          "cost": 80
        },
        {
          "player": "Jah Gibbs",
          "position": "W/R/T",
          "cost": 45
        },
        {
          "player": "C Kmet",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "H Butker",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Bills",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "Chri Watson",
          "position": null,
          "cost": 16
        },
        {
          "player": "Jam Williams",
          "position": null,
          "cost": 3
        },
        {
          "player": "K Gainwell",
          "position": null,
          "cost": 1
        },
        {
          "player": "Elijah Moore",
          "position": null,
          "cost": 2
        },
        {
          "player": "K Toney",
          "position": null,
          "cost": 2
        },
        {
          "player": "K Miller",
          "position": null,
          "cost": 1
        }
      ],
      "Tank": [
        {
          "player": "T Lawrence",
          "position": "QB",
          "cost": 5
        },
        {
          "player": "C Olave",
          "position": "WR",
          "cost": 13
        },
        {
          "player": "D Adams",
          "position": "WR",
          "cost": 57
        },
        {
          "player": "A Mattison",
          "position": "RB",
          "cost": 13
        },
        {
          "player": "D Achane",
          "position": "RB",
          "cost": 6
        },
        {
          "player": "M Evans",
          "position": "W/R/T",
          "cost": 14
        },
        {
          "player": "K Pitts",
          "position": "TE",
          "cost": 3
        },
        {
          "player": "T Bass",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Saints",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "D Montgomery",
          "position": null,
          "cost": 7
        },
        {
          "player": "AJ Dillon",
          "position": null,
          "cost": 4
        },
        {
          "player": "D London",
          "position": null,
          "cost": 3
        },
        {
          "player": "A Gibson",
          "position": null,
          "cost": 2
        },
        {
          "player": "Smith-Njigba",
          "position": null,
          "cost": 1
        },
        {
          "player": "Quen Johnson",
          "position": null,
          "cost": 2
        }
      ],
      "Jakob": [
        {
          "player": "L Jackson",
          "position": "QB",
          "cost": 24
        },
        {
          "player": "C Ridley",
          "position": "WR",
          "cost": 30
        },
        {
          "player": "D Hopkins",
          "position": "WR",
          "cost": 13
        },
        {
          "player": "R White",
          "position": "RB",
          "cost": 14
        },
        {
          "player": "N Harris",
          "position": "RB",
          "cost": 31
        },
        {
          "player": "Z Flowers",
          "position": "W/R/T",
          "cost": 4
        },
        {
          "player": "M Andrews",
          "position": "TE",
          "cost": 29
        },
        {
          "player": "E McPherson",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Steelers",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "A Kamara",
          "position": null,
          "cost": 19
        },
        {
          "player": "S Perine",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Ford",
          "position": null,
          "cost": 1
        },
        {
          "player": "Anth Richardson",
          "position": null,
          "cost": 1
        },
        {
          "player": "Isaiah Hodgins",
          "position": null,
          "cost": 1
        },
        {
          "player": "Tyjae Spears",
          "position": null,
          "cost": 1
        }
      ],
      "bradley": [
        {
          "player": "D Prescott",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "Peoples-Jones",
          "position": "WR",
          "cost": 1
        },
        {
          "player": "Z Jones",
          "position": "WR",
          "cost": 1
        },
        {
          "player": "Zeke Elliott",
          "position": "RB",
          "cost": 4
        },
        {
          "player": "Z Charbonnet",
          "position": "RB",
          "cost": 5
        },
        {
          "player": "D Harris",
          "position": "W/R/T",
          "cost": 2
        },
        {
          "player": "Dal Shultz",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "Gay",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Buccaneers",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "Rosch Johnson",
          "position": null,
          "cost": 2
        },
        {
          "player": "Rom Doubs",
          "position": null,
          "cost": 1
        },
        {
          "player": "T Boyd",
          "position": null,
          "cost": 1
        },
        {
          "player": "P Campbell",
          "position": null,
          "cost": 1
        },
        {
          "player": "Deuce Vaughn",
          "position": null,
          "cost": 1
        },
        {
          "player": "E Engram",
          "position": null,
          "cost": 1
        }
      ],
      "RJ": [
        {
          "player": "Joe Burrow",
          "position": "QB",
          "cost": 11
        },
        {
          "player": "J  Jefferson",
          "position": "WR",
          "cost": 48
        },
        {
          "player": "D Johnson",
          "position": "WR",
          "cost": 19
        },
        {
          "player": "R Stevenson",
          "position": "RB",
          "cost": 16
        },
        {
          "player": "A Ekeler",
          "position": "RB",
          "cost": 79
        },
        {
          "player": "A Jones",
          "position": "W/R/T",
          "cost": 30
        },
        {
          "player": "D Goedert",
          "position": "TE",
          "cost": 5
        },
        {
          "player": "J Elliott",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Packers",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "C Godwin",
          "position": null,
          "cost": 4
        },
        {
          "player": "Marq Brown",
          "position": null,
          "cost": 3
        },
        {
          "player": "Jaha Dotson",
          "position": null,
          "cost": 4
        },
        {
          "player": "R Mostert",
          "position": null,
          "cost": 1
        },
        {
          "player": "Chu Hubbard",
          "position": null,
          "cost": 1
        },
        {
          "player": "Tua",
          "position": null,
          "cost": 1
        }
      ]
    }
  },
  "2022": {
    "budgets": {
      "Anthony": 75,
      "Ragen": 198,
      "Scott": 305,
      "Mase R": 252,
      "bradley": 53,
      "Nick Trow": 303,
      "Eric": 180,
      "Tank": 276,
      "Spencer H": 154,
      "Dallas": 172,
      "Caleb": 203
    },
    "cash_spent": {},
    "picks": {
      "Anthony": [
        {
          "player": "T Lance",
          "position": "QB",
          "cost": 12
        },
        {
          "player": "Hollywood",
          "position": "WR",
          "cost": 14
        },
        {
          "player": "E Moore",
          "position": "WR",
          "cost": 4
        },
        {
          "player": "J Robinson",
          "position": "RB",
          "cost": 4
        },
        {
          "player": "R Penny",
          "position": "RB",
          "cost": 8
        },
        {
          "player": "B Aiyuk",
          "position": "W/R/T",
          "cost": 4
        },
        {
          "player": "D Shultz",
          "position": "TE",
          "cost": 5
        },
        {
          "player": "M Gay",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Saints",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "James Cook",
          "position": null,
          "cost": 4
        },
        {
          "player": "K Gainwell",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Carter",
          "position": null,
          "cost": 2
        },
        {
          "player": "B Robinson Jr",
          "position": null,
          "cost": 6
        },
        {
          "player": "D London",
          "position": null,
          "cost": 7
        },
        {
          "player": "I Spiller",
          "position": null,
          "cost": 2
        }
      ],
      "Ragen": [
        {
          "player": "A Rodgers",
          "position": "QB",
          "cost": 5
        },
        {
          "player": "J Jefferson",
          "position": "WR",
          "cost": 24
        },
        {
          "player": "T Higgins",
          "position": "WR",
          "cost": 24
        },
        {
          "player": "J Taylor",
          "position": "RB",
          "cost": 100
        },
        {
          "player": "E Mitchell",
          "position": "RB",
          "cost": 19
        },
        {
          "player": "M Pittman",
          "position": "W/R/T",
          "cost": 12
        },
        {
          "player": "C Kmet",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "G Joseph",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Steelers",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "R Stevenson",
          "position": null,
          "cost": 6
        },
        {
          "player": "J Burrow",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Valdez-S",
          "position": null,
          "cost": 1
        },
        {
          "player": "R Moore",
          "position": null,
          "cost": 2
        },
        {
          "player": "T Davis-Price",
          "position": null,
          "cost": 2
        },
        {
          "player": "D Foreman",
          "position": null,
          "cost": 1
        }
      ],
      "Scott": [
        {
          "player": "M Stafford",
          "position": "QB",
          "cost": 2
        },
        {
          "player": "M Evans",
          "position": "WR",
          "cost": 51
        },
        {
          "player": "DK Metcalf",
          "position": "WR",
          "cost": 13
        },
        {
          "player": "A Ekeler",
          "position": "RB",
          "cost": 78
        },
        {
          "player": "J Mixon",
          "position": "RB",
          "cost": 70
        },
        {
          "player": "T Etienne",
          "position": "W/R/T",
          "cost": 20
        },
        {
          "player": "D Knox",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "D Carlson",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Cowboys",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "AJ Dillon",
          "position": null,
          "cost": 23
        },
        {
          "player": "C Edmonds",
          "position": null,
          "cost": 9
        },
        {
          "player": "A Robinson",
          "position": null,
          "cost": 13
        },
        {
          "player": "D Hopkins",
          "position": null,
          "cost": 10
        },
        {
          "player": "A Lazard",
          "position": null,
          "cost": 7
        },
        {
          "player": "N Hines",
          "position": null,
          "cost": 4
        }
      ],
      "Mase R": [
        {
          "player": "J Hurts",
          "position": "QB",
          "cost": 17
        },
        {
          "player": "C Sutton",
          "position": "WR",
          "cost": 24
        },
        {
          "player": "T Hill",
          "position": "WR",
          "cost": 49
        },
        {
          "player": "D Swift",
          "position": "RB",
          "cost": 30
        },
        {
          "player": "D Singletary",
          "position": "RB",
          "cost": 13
        },
        {
          "player": "AJ Brown",
          "position": "W/R/T",
          "cost": 36
        },
        {
          "player": "T Kelce",
          "position": "TE",
          "cost": 60
        },
        {
          "player": "T Bass",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Bills",
          "position": "DEF",
          "cost": 3
        },
        {
          "player": "JK Dobbins",
          "position": null,
          "cost": 14
        },
        {
          "player": "M Hardman",
          "position": null,
          "cost": 1
        },
        {
          "player": "G Wilson",
          "position": null,
          "cost": 2
        },
        {
          "player": "J Tolbert",
          "position": null,
          "cost": 2
        },
        {
          "player": "J Williams",
          "position": null,
          "cost": 3
        },
        {
          "player": "J Dotson",
          "position": null,
          "cost": 2
        }
      ],
      "bradley": [
        {
          "player": "T Brady",
          "position": "QB",
          "cost": 5
        },
        {
          "player": "C Godwin",
          "position": "WR",
          "cost": 15
        },
        {
          "player": "A Thielen",
          "position": "WR",
          "cost": 9
        },
        {
          "player": "A Gibson",
          "position": "RB",
          "cost": 7
        },
        {
          "player": "D Harris",
          "position": "RB",
          "cost": 4
        },
        {
          "player": "C Patterson",
          "position": "W/R/T",
          "cost": 14
        },
        {
          "player": "H Henry",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "Y Koo",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Broncos",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "J Landry",
          "position": null,
          "cost": 3
        },
        {
          "player": "R Gage",
          "position": null,
          "cost": 1
        },
        {
          "player": "K Drake",
          "position": null,
          "cost": 1
        },
        {
          "player": "V Jefferson",
          "position": null,
          "cost": 1
        },
        {
          "player": "Z Ertz",
          "position": null,
          "cost": 1
        },
        {
          "player": "S Perine",
          "position": null,
          "cost": 1
        }
      ],
      "Nick Trow": [
        {
          "player": "J Allen",
          "position": "QB",
          "cost": 22
        },
        {
          "player": "D Samuel",
          "position": "WR",
          "cost": 13
        },
        {
          "player": "Dionte Johnson",
          "position": "WR",
          "cost": 9
        },
        {
          "player": "Jav Williams",
          "position": "RB",
          "cost": 22
        },
        {
          "player": "C McCaffery",
          "position": "RB",
          "cost": 81
        },
        {
          "player": "C Akers",
          "position": "W/R/T",
          "cost": 40
        },
        {
          "player": "G Kittle",
          "position": "TE",
          "cost": 29
        },
        {
          "player": "H Butker",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Ravens",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "T Pollard",
          "position": null,
          "cost": 11
        },
        {
          "player": "D Mooney",
          "position": null,
          "cost": 13
        },
        {
          "player": "B. Cooks",
          "position": null,
          "cost": 12
        },
        {
          "player": "G Davis",
          "position": null,
          "cost": 9
        },
        {
          "player": "A St Brown",
          "position": null,
          "cost": 18
        },
        {
          "player": "R Woods",
          "position": null,
          "cost": 6
        }
      ],
      "Eric": [
        {
          "player": "P Mahomes",
          "position": "QB",
          "cost": 17
        },
        {
          "player": "DJ Moore",
          "position": "WR",
          "cost": 20
        },
        {
          "player": "JuJu Smith",
          "position": "WR",
          "cost": 9
        },
        {
          "player": "A Kamara",
          "position": "RB",
          "cost": 69
        },
        {
          "player": "J Jacobs",
          "position": "RB",
          "cost": 26
        },
        {
          "player": "CEH",
          "position": "W/R/T",
          "cost": 6
        },
        {
          "player": "M Andrews",
          "position": "TE",
          "cost": 24
        },
        {
          "player": "J Elliott",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Buccaneers",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "K Hunt",
          "position": null,
          "cost": 6
        },
        {
          "player": "T Lockett",
          "position": null,
          "cost": 3
        },
        {
          "player": "J Jones",
          "position": null,
          "cost": 2
        },
        {
          "player": "M Ingram",
          "position": null,
          "cost": 1
        },
        {
          "player": "T Boyd",
          "position": null,
          "cost": 3
        },
        {
          "player": "M Gallup",
          "position": null,
          "cost": 1
        }
      ],
      "Tank": [
        {
          "player": "J Herbert",
          "position": "QB",
          "cost": 22
        },
        {
          "player": "K Allen",
          "position": "WR",
          "cost": 32
        },
        {
          "player": "J Waddle",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "A Jones",
          "position": "RB",
          "cost": 60
        },
        {
          "player": "N Harris",
          "position": "RB",
          "cost": 71
        },
        {
          "player": "J Jeudy",
          "position": "W/R/T",
          "cost": 16
        },
        {
          "player": "K Pitts",
          "position": "TE",
          "cost": 18
        },
        {
          "player": "J Tucker",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Colts",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "D Pierce",
          "position": null,
          "cost": 19
        },
        {
          "player": "Z White",
          "position": null,
          "cost": 4
        },
        {
          "player": "C Olave",
          "position": null,
          "cost": 3
        },
        {
          "player": "T Algier",
          "position": null,
          "cost": 4
        },
        {
          "player": "I Mackenzie",
          "position": null,
          "cost": 2
        },
        {
          "player": "M Mack",
          "position": null,
          "cost": 1
        }
      ],
      "Spencer H": [
        {
          "player": "R Wilson",
          "position": "QB",
          "cost": 3
        },
        {
          "player": "M Thomas",
          "position": "WR",
          "cost": 14
        },
        {
          "player": "C Kirk",
          "position": "WR",
          "cost": 1
        },
        {
          "player": "D Cook",
          "position": "RB",
          "cost": 72
        },
        {
          "player": "S Barkley",
          "position": "RB",
          "cost": 52
        },
        {
          "player": "R Mostert",
          "position": "W/R/T",
          "cost": 4
        },
        {
          "player": "A Okwuekbunam",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "M Prater",
          "position": "K",
          "cost": 1
        },
        {
          "player": "49ers",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "A Mattison",
          "position": null,
          "cost": 3
        },
        {
          "player": "C Claypool",
          "position": null,
          "cost": 2
        },
        {
          "player": "K Toney",
          "position": null,
          "cost": 3
        },
        {
          "player": "N Collins",
          "position": null,
          "cost": 1
        },
        {
          "player": "G Edwards",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Breida",
          "position": null,
          "cost": 1
        }
      ],
      "Dallas": [
        {
          "player": "D Prescott",
          "position": "QB",
          "cost": 2
        },
        {
          "player": "S Diggs",
          "position": "WR",
          "cost": 34
        },
        {
          "player": "J Chase",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "L Fournette",
          "position": "RB",
          "cost": 15
        },
        {
          "player": "D Montgomery",
          "position": "RB",
          "cost": 36
        },
        {
          "player": "M Sanders",
          "position": "W/R/T",
          "cost": 5
        },
        {
          "player": "D Waller",
          "position": "TE",
          "cost": 13
        },
        {
          "player": "E McPherson",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Packers",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "E Elliott",
          "position": null,
          "cost": 23
        },
        {
          "player": "A Cooper",
          "position": null,
          "cost": 3
        },
        {
          "player": "D Smith",
          "position": null,
          "cost": 7
        },
        {
          "player": "T Burks",
          "position": null,
          "cost": 5
        },
        {
          "player": "K Herbert",
          "position": null,
          "cost": 2
        },
        {
          "player": "Vikings",
          "position": null,
          "cost": 1
        }
      ],
      "Caleb": [
        {
          "player": "K Murray",
          "position": "QB",
          "cost": 11
        },
        {
          "player": "CeeDee Lamb",
          "position": "WR",
          "cost": 24
        },
        {
          "player": "T McLaurin",
          "position": "WR",
          "cost": 30
        },
        {
          "player": "J Conner",
          "position": "RB",
          "cost": 13
        },
        {
          "player": "D Henry",
          "position": "RB",
          "cost": 91
        },
        {
          "player": "M Williams",
          "position": "W/R/T",
          "cost": 12
        },
        {
          "player": "D Goedert",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "N Folk",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Commanders",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "H Renfrow",
          "position": null,
          "cost": 3
        },
        {
          "player": "K Walker",
          "position": null,
          "cost": 7
        },
        {
          "player": "M Gordon III",
          "position": null,
          "cost": 6
        },
        {
          "player": "K Golladay",
          "position": null,
          "cost": 2
        },
        {
          "player": "DJ Chark",
          "position": null,
          "cost": 1
        },
        {
          "player": "C Hubbard",
          "position": null,
          "cost": 1
        }
      ]
    }
  },
  "2021": {
    "budgets": {
      "Nick Trow": 238,
      "Scott": 182,
      "Dallas": 111,
      "Anthony": 240,
      "Caleb": 178,
      "Tank": 181,
      "Mase R": 238,
      "Spencer H": 206,
      "Ragen": 198,
      "Jakob": 271,
      "Eric": 185,
      "bradley": 172
    },
    "cash_spent": {},
    "picks": {
      "Nick Trow": [
        {
          "player": "R Tannehill",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "T Hill",
          "position": "WR",
          "cost": 90
        },
        {
          "player": "D Adams",
          "position": "WR",
          "cost": 79
        },
        {
          "player": "A Gibson",
          "position": "RB",
          "cost": 17
        },
        {
          "player": "Jav Williams",
          "position": "RB",
          "cost": 11
        },
        {
          "player": "C Godwin",
          "position": "W/R/T",
          "cost": 25
        },
        {
          "player": "T Hockenson",
          "position": "TE",
          "cost": 7
        },
        {
          "player": "C McLaughlin",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Dolphins",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "T Pollard",
          "position": null,
          "cost": 1
        },
        {
          "player": "JD McKissic",
          "position": null,
          "cost": 2
        },
        {
          "player": "T Coleman",
          "position": null,
          "cost": 1
        },
        {
          "player": "J. Meyers",
          "position": null,
          "cost": 1
        },
        {
          "player": "Tyrell Williams",
          "position": null,
          "cost": 1
        },
        {
          "player": "N Agholor",
          "position": null,
          "cost": 1
        }
      ],
      "Scott": [
        {
          "player": "J Winston",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "K Allen",
          "position": "WR",
          "cost": 16
        },
        {
          "player": "T Lockett",
          "position": "WR",
          "cost": 21
        },
        {
          "player": "A Ekeler",
          "position": "RB",
          "cost": 44
        },
        {
          "player": "N Chubb",
          "position": "RB",
          "cost": 59
        },
        {
          "player": "C Carson",
          "position": "W/R/T",
          "cost": 25
        },
        {
          "player": "L Thomas",
          "position": "TE",
          "cost": 7
        },
        {
          "player": "Y Koo",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Pats",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "Juju",
          "position": null,
          "cost": 3
        },
        {
          "player": "P Lindsay",
          "position": null,
          "cost": 4
        },
        {
          "player": "J White",
          "position": null,
          "cost": 2
        },
        {
          "player": "Ruggs",
          "position": null,
          "cost": 1
        },
        {
          "player": "C Beasley",
          "position": null,
          "cost": 1
        },
        {
          "player": "Jonnu Smith",
          "position": null,
          "cost": 1
        }
      ],
      "Dallas": [
        {
          "player": "M Stafford",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "S Diggs",
          "position": "WR",
          "cost": 17
        },
        {
          "player": "DK Metcalf",
          "position": "WR",
          "cost": 22
        },
        {
          "player": "D Montgomery",
          "position": "RB",
          "cost": 18
        },
        {
          "player": "L Fournette",
          "position": "RB",
          "cost": 5
        },
        {
          "player": "C Ridley",
          "position": "W/R/T",
          "cost": 36
        },
        {
          "player": "McManus",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "R Tonyan",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Steelers",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "J Chase",
          "position": null,
          "cost": 2
        },
        {
          "player": "S Michel",
          "position": null,
          "cost": 2
        },
        {
          "player": "D Johnson",
          "position": null,
          "cost": 2
        },
        {
          "player": "N Hines",
          "position": null,
          "cost": 2
        },
        {
          "player": "D Parker",
          "position": null,
          "cost": 1
        },
        {
          "player": "B Scott",
          "position": null,
          "cost": 1
        }
      ],
      "Anthony": [
        {
          "player": "R Wilson",
          "position": "QB",
          "cost": 16
        },
        {
          "player": "A Thielen",
          "position": "WR",
          "cost": 29
        },
        {
          "player": "C Claypool",
          "position": "WR",
          "cost": 15
        },
        {
          "player": "C McCaffery",
          "position": "RB",
          "cost": 95
        },
        {
          "player": "N Harris",
          "position": "RB",
          "cost": 59
        },
        {
          "player": "T Sermon",
          "position": "W/R/T",
          "cost": 8
        },
        {
          "player": "E Engram",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "G Zuerlein",
          "position": "K",
          "cost": 2
        },
        {
          "player": "San Fran",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "B Cooks",
          "position": null,
          "cost": 2
        },
        {
          "player": "TY Hilton",
          "position": null,
          "cost": 1
        },
        {
          "player": "Hollywood",
          "position": null,
          "cost": 4
        },
        {
          "player": "T Lance",
          "position": null,
          "cost": 2
        },
        {
          "player": "R Gage",
          "position": null,
          "cost": 2
        },
        {
          "player": "D Mooney",
          "position": null,
          "cost": 3
        }
      ],
      "Caleb": [
        {
          "player": "K Murray",
          "position": "QB",
          "cost": 15
        },
        {
          "player": "T McLaurin",
          "position": "WR",
          "cost": 15
        },
        {
          "player": "M Evans",
          "position": "WR",
          "cost": 49
        },
        {
          "player": "M Sanders",
          "position": "RB",
          "cost": 30
        },
        {
          "player": "M Carter",
          "position": "RB",
          "cost": 12
        },
        {
          "player": "A Robinson",
          "position": "W/R/T",
          "cost": 36
        },
        {
          "player": "K Pitts",
          "position": "TE",
          "cost": 8
        },
        {
          "player": "M Gay",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Browns",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "J Connor",
          "position": null,
          "cost": 3
        },
        {
          "player": "M Jones Jr",
          "position": null,
          "cost": 2
        },
        {
          "player": "Mike Williams",
          "position": null,
          "cost": 2
        },
        {
          "player": "M Brown",
          "position": null,
          "cost": 1
        },
        {
          "player": "T Cohen",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Landry",
          "position": null,
          "cost": 2
        }
      ],
      "Tank": [
        {
          "player": "J Allen",
          "position": "QB",
          "cost": 11
        },
        {
          "player": "AJ Green",
          "position": "WR",
          "cost": 3
        },
        {
          "player": "T Higgins",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "JK Dobbins",
          "position": "RB",
          "cost": 26
        },
        {
          "player": "Z Moss",
          "position": "RB",
          "cost": 18
        },
        {
          "player": "C Edmonds",
          "position": "W/R/T",
          "cost": 10
        },
        {
          "player": "N Fant",
          "position": "TE",
          "cost": 4
        },
        {
          "player": "H Butker",
          "position": "K",
          "cost": 3
        },
        {
          "player": "Washington",
          "position": "DEF",
          "cost": 3
        },
        {
          "player": "AJ Dillon",
          "position": null,
          "cost": 12
        },
        {
          "player": "G Edwards",
          "position": null,
          "cost": 11
        },
        {
          "player": "J Herbert",
          "position": null,
          "cost": 11
        },
        {
          "player": "K Golladay",
          "position": null,
          "cost": 7
        },
        {
          "player": "X Jones",
          "position": null,
          "cost": 4
        },
        {
          "player": "M Davis",
          "position": null,
          "cost": 19
        }
      ],
      "Mase R": [
        {
          "player": "T Lawrence",
          "position": "QB",
          "cost": 2
        },
        {
          "player": "B Aiyuk",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "D Hopkins",
          "position": "WR",
          "cost": 61
        },
        {
          "player": "A Kamara",
          "position": "RB",
          "cost": 65
        },
        {
          "player": "D Swift",
          "position": "RB",
          "cost": 15
        },
        {
          "player": "M Gaskin",
          "position": "W/R/T",
          "cost": 17
        },
        {
          "player": "G Kittle",
          "position": "TE",
          "cost": 33
        },
        {
          "player": "J Tucker",
          "position": "K",
          "cost": 4
        },
        {
          "player": "Bills",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "J Hurts",
          "position": null,
          "cost": 7
        },
        {
          "player": "W Fuller",
          "position": null,
          "cost": 4
        },
        {
          "player": "DJ Chark",
          "position": null,
          "cost": 4
        },
        {
          "player": "I Smith Jr",
          "position": null,
          "cost": 1
        },
        {
          "player": "D Singletary",
          "position": null,
          "cost": 3
        },
        {
          "player": "K Drake",
          "position": null,
          "cost": 3
        }
      ],
      "Spencer H": [
        {
          "player": "P Mahomes",
          "position": "QB",
          "cost": 38
        },
        {
          "player": "J Jefferson",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "A Cooper",
          "position": "WR",
          "cost": 25
        },
        {
          "player": "D Harris",
          "position": "RB",
          "cost": 13
        },
        {
          "player": "E Elliott",
          "position": "RB",
          "cost": 71
        },
        {
          "player": "CEH",
          "position": "W/R/T",
          "cost": 38
        },
        {
          "player": "D Goedart",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "Vikings",
          "position": "K",
          "cost": 1
        },
        {
          "player": "C Parkey",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "R Moore",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Waddle",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Ingram",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Mack",
          "position": null,
          "cost": 1
        },
        {
          "player": "D Mims",
          "position": null,
          "cost": 1
        },
        {
          "player": "KJ Hamler",
          "position": null,
          "cost": 1
        }
      ],
      "Ragen": [
        {
          "player": "D Prescott",
          "position": "QB",
          "cost": 17
        },
        {
          "player": "DJ Moore",
          "position": "WR",
          "cost": 16
        },
        {
          "player": "OBJ",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "A Jones",
          "position": "RB",
          "cost": 60
        },
        {
          "player": "J Taylor",
          "position": "RB",
          "cost": 50
        },
        {
          "player": "J Jeudy",
          "position": "W/R/T",
          "cost": 6
        },
        {
          "player": "D Waller",
          "position": "TE",
          "cost": 18
        },
        {
          "player": "J Sanders",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Rams",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "C Davis",
          "position": null,
          "cost": 4
        },
        {
          "player": "J Williams",
          "position": null,
          "cost": 4
        },
        {
          "player": "Diont Johnson",
          "position": null,
          "cost": 5
        },
        {
          "player": "M Pittman",
          "position": null,
          "cost": 2
        },
        {
          "player": "Justin Fields",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Callaway",
          "position": null,
          "cost": 2
        }
      ],
      "Jakob": [
        {
          "player": "L Jackson",
          "position": "QB",
          "cost": 8
        },
        {
          "player": "C Kupp",
          "position": "WR",
          "cost": 17
        },
        {
          "player": "J Jones",
          "position": "WR",
          "cost": 30
        },
        {
          "player": "D Cook",
          "position": "RB",
          "cost": 76
        },
        {
          "player": "J Mixon",
          "position": "RB",
          "cost": 44
        },
        {
          "player": "R Jones",
          "position": "W/R/T",
          "cost": 6
        },
        {
          "player": "T Kelce",
          "position": "TE",
          "cost": 71
        },
        {
          "player": "T Bass",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Ravens",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "A Brown",
          "position": null,
          "cost": 5
        },
        {
          "player": "De Smith",
          "position": null,
          "cost": 2
        },
        {
          "player": "D Samuel",
          "position": null,
          "cost": 3
        },
        {
          "player": "L Murray",
          "position": null,
          "cost": 4
        },
        {
          "player": "M Hardman",
          "position": null,
          "cost": 1
        },
        {
          "player": "A Mattison",
          "position": null,
          "cost": 1
        }
      ],
      "Eric": [
        {
          "player": "T Brady",
          "position": "QB",
          "cost": 6
        },
        {
          "player": "AJ Brown",
          "position": "WR",
          "cost": 19
        },
        {
          "player": "CD Lamb",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "D Henderson",
          "position": "RB",
          "cost": 11
        },
        {
          "player": "D Henry",
          "position": "RB",
          "cost": 82
        },
        {
          "player": "J Jacobs",
          "position": "W/R/T",
          "cost": 24
        },
        {
          "player": "M Andrews",
          "position": "TE",
          "cost": 12
        },
        {
          "player": "J Meyers",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Tampa",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "K Hunt",
          "position": null,
          "cost": 9
        },
        {
          "player": "T Higbee",
          "position": null,
          "cost": 2
        },
        {
          "player": "T Boyd",
          "position": null,
          "cost": 2
        },
        {
          "player": "M Gallup",
          "position": null,
          "cost": 1
        },
        {
          "player": "C Samuel",
          "position": null,
          "cost": 3
        },
        {
          "player": "L Shenault",
          "position": null,
          "cost": 1
        }
      ],
      "bradley": [
        {
          "player": "A Rodgers",
          "position": "QB",
          "cost": 20
        },
        {
          "player": "R Woods",
          "position": "WR",
          "cost": 33
        },
        {
          "player": "C Sutton",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "S Barkley",
          "position": "RB",
          "cost": 61
        },
        {
          "player": "J Robinson",
          "position": "RB",
          "cost": 32
        },
        {
          "player": "R Anderson",
          "position": "W/R/T",
          "cost": 8
        },
        {
          "player": "OJ Howard",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "M Prater",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Broncos",
          "position": "DEF",
          "cost": 3
        },
        {
          "player": "M Gordon",
          "position": null,
          "cost": 8
        },
        {
          "player": "R Mostert",
          "position": null,
          "cost": 10
        },
        {
          "player": "J Cook",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Thomas",
          "position": null,
          "cost": 4
        },
        {
          "player": "R Stevenson",
          "position": null,
          "cost": 1
        },
        {
          "player": "S Ahmed",
          "position": null,
          "cost": 1
        }
      ]
    }
  },
  "2020": {
    "budgets": {
      "Spencer H": 77,
      "Dallas": 307,
      "Mase R": 108,
      "Tank": 72,
      "bradley": 36,
      "Scott": 158,
      "Jakob": 284,
      "Caleb": 234,
      "Anthony": 134,
      "Nick Trow": 302,
      "Ragen": 246,
      "Eric": 447
    },
    "cash_spent": {},
    "picks": {
      "Spencer H": [
        {
          "player": "M Ryan",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "J Raegor",
          "position": "WR",
          "cost": 2
        },
        {
          "player": "D Parker",
          "position": "WR",
          "cost": 2
        },
        {
          "player": "D Singletary",
          "position": "RB",
          "cost": 16
        },
        {
          "player": "R Mostert",
          "position": "RB",
          "cost": 16
        },
        {
          "player": "J Connor",
          "position": "W/R/T",
          "cost": 27
        },
        {
          "player": "N Fant",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "Z Gonzalez",
          "position": "K",
          "cost": null
        },
        {
          "player": "Bears",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "J Jefferson",
          "position": null,
          "cost": 2
        },
        {
          "player": "D Harris",
          "position": null,
          "cost": 3
        },
        {
          "player": "J Jeudy",
          "position": null,
          "cost": 1
        },
        {
          "player": "R Armstead",
          "position": null,
          "cost": 1
        },
        {
          "player": "I Smith",
          "position": null,
          "cost": 2
        },
        {
          "player": "S Watkins",
          "position": null,
          "cost": 1
        }
      ],
      "Dallas": [
        {
          "player": "R Wilson",
          "position": "QB",
          "cost": 3
        },
        {
          "player": "C Ridley",
          "position": "WR",
          "cost": 18
        },
        {
          "player": "DJ Moore",
          "position": "WR",
          "cost": 24
        },
        {
          "player": "A Ekeler",
          "position": "RB",
          "cost": 22
        },
        {
          "player": "S Barkley",
          "position": "RB",
          "cost": 109
        },
        {
          "player": "DK Metcalf",
          "position": "W/R/T",
          "cost": 11
        },
        {
          "player": "T Kelce",
          "position": "TE",
          "cost": 59
        },
        {
          "player": "M Prater",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Colts",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "M Gordon",
          "position": null,
          "cost": 25
        },
        {
          "player": "S Diggs",
          "position": null,
          "cost": 7
        },
        {
          "player": "D Montgomery",
          "position": null,
          "cost": 8
        },
        {
          "player": "C Akers",
          "position": null,
          "cost": 16
        },
        {
          "player": "L Fitz",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Jackson",
          "position": null,
          "cost": 1
        }
      ],
      "Mase R": [
        {
          "player": "J Garapolo",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "OBJ",
          "position": "WR",
          "cost": 30
        },
        {
          "player": "D Samuel",
          "position": "WR",
          "cost": 5
        },
        {
          "player": "L Bell",
          "position": "RB",
          "cost": 15
        },
        {
          "player": "M Breida",
          "position": "RB",
          "cost": 5
        },
        {
          "player": "J Brown",
          "position": "W/R/T",
          "cost": 1
        },
        {
          "player": "G Kittle",
          "position": "TE",
          "cost": 40
        },
        {
          "player": "J Elliott",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Bills",
          "position": "DEF",
          "cost": 4
        },
        {
          "player": "C Hyde",
          "position": null,
          "cost": 1
        },
        {
          "player": "N Henry",
          "position": null,
          "cost": 1
        },
        {
          "player": "A Lizzard",
          "position": null,
          "cost": 1
        },
        {
          "player": "I Smith Jr",
          "position": null,
          "cost": 1
        },
        {
          "player": "B Perriman",
          "position": null,
          "cost": 1
        },
        {
          "player": "G Edwards",
          "position": null,
          "cost": 1
        }
      ],
      "Tank": [
        {
          "player": "K Murray",
          "position": "QB",
          "cost": 5
        },
        {
          "player": "D Johnson",
          "position": "WR",
          "cost": 1
        },
        {
          "player": "C Kirk",
          "position": "WR",
          "cost": 2
        },
        {
          "player": "A Mattison",
          "position": "RB",
          "cost": 11
        },
        {
          "player": "D Swift",
          "position": "RB",
          "cost": 17
        },
        {
          "player": "M Ingram",
          "position": "W/R/T",
          "cost": 11
        },
        {
          "player": "T Higbee",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "K Fairbairn",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Bears",
          "position": "DEF",
          "cost": 3
        },
        {
          "player": "T Coleman",
          "position": null,
          "cost": 7
        },
        {
          "player": "P Lindsay",
          "position": null,
          "cost": 6
        },
        {
          "player": "C Newton",
          "position": null,
          "cost": 1
        },
        {
          "player": "AJ Dillon",
          "position": null,
          "cost": 2
        },
        {
          "player": "R Anderson",
          "position": null,
          "cost": 2
        },
        {
          "player": "P Williams",
          "position": null,
          "cost": 2
        }
      ],
      "bradley": [
        {
          "player": "J Allen",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "B Cooks",
          "position": "WR",
          "cost": 4
        },
        {
          "player": "T Lockett",
          "position": "WR",
          "cost": 9
        },
        {
          "player": "N Hines",
          "position": "RB",
          "cost": 1
        },
        {
          "player": "S Michel",
          "position": "RB",
          "cost": 1
        },
        {
          "player": "K Allen",
          "position": "W/R/T",
          "cost": 6
        },
        {
          "player": "E Engram",
          "position": "TE",
          "cost": 4
        },
        {
          "player": "C Boswell",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Patriots",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "L McCoy",
          "position": null,
          "cost": 2
        },
        {
          "player": "E Ebron",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Hardman",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Pittman",
          "position": null,
          "cost": 1
        },
        {
          "player": "A Peterson",
          "position": null,
          "cost": 1
        },
        {
          "player": "D Slayton",
          "position": null,
          "cost": 1
        }
      ],
      "Scott": [
        {
          "player": "D Brees",
          "position": "QB",
          "cost": 5
        },
        {
          "player": "M Evans",
          "position": "WR",
          "cost": 52
        },
        {
          "player": "A Thielen",
          "position": "WR",
          "cost": 38
        },
        {
          "player": "L Fournette",
          "position": "RB",
          "cost": 16
        },
        {
          "player": "K Johnson",
          "position": "RB",
          "cost": 5
        },
        {
          "player": "J Landry",
          "position": "W/R/T",
          "cost": 3
        },
        {
          "player": "Gronk",
          "position": "TE",
          "cost": 13
        },
        {
          "player": "W Lutz",
          "position": "K",
          "cost": 3
        },
        {
          "player": "Titans",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "E Sanders",
          "position": null,
          "cost": 2
        },
        {
          "player": "J Howard",
          "position": null,
          "cost": 7
        },
        {
          "player": "D Prescott",
          "position": null,
          "cost": 2
        },
        {
          "player": "J Edelman",
          "position": null,
          "cost": 3
        },
        {
          "player": "T Cohen",
          "position": null,
          "cost": 5
        },
        {
          "player": "T Pollard",
          "position": null,
          "cost": 3
        }
      ],
      "Jakob": [
        {
          "player": "P Mahomes",
          "position": "QB",
          "cost": 26
        },
        {
          "player": "M Brown",
          "position": "WR",
          "cost": 14
        },
        {
          "player": "M Thomas",
          "position": "WR",
          "cost": 67
        },
        {
          "player": "K Drake",
          "position": "RB",
          "cost": 16
        },
        {
          "player": "D Cook",
          "position": "RB",
          "cost": 96
        },
        {
          "player": "T Gurley",
          "position": "W/R/T",
          "cost": 38
        },
        {
          "player": "H Henry",
          "position": "TE",
          "cost": 2
        },
        {
          "player": "J Tucker",
          "position": "K",
          "cost": 5
        },
        {
          "player": "Ravens",
          "position": "DEF",
          "cost": 3
        },
        {
          "player": "C Kupp",
          "position": null,
          "cost": 7
        },
        {
          "player": "AJ Green",
          "position": null,
          "cost": 5
        },
        {
          "player": "M Jones",
          "position": null,
          "cost": 2
        },
        {
          "player": "H Ruggs",
          "position": null,
          "cost": 1
        },
        {
          "player": "D Johnson",
          "position": null,
          "cost": 1
        },
        {
          "player": "B Love",
          "position": null,
          "cost": 1
        }
      ],
      "Caleb": [
        {
          "player": "T Brady",
          "position": "QB",
          "cost": 3
        },
        {
          "player": "K Golladay",
          "position": "WR",
          "cost": 22
        },
        {
          "player": "JuJu Smith",
          "position": "WR",
          "cost": 38
        },
        {
          "player": "N Chubb",
          "position": "RB",
          "cost": 32
        },
        {
          "player": "C Edwards-Helaire",
          "position": "RB",
          "cost": 91
        },
        {
          "player": "W Fuller",
          "position": "W/R/T",
          "cost": 13
        },
        {
          "player": "M Gesiscki",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "M Gay",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Cowboys",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "D Johnson",
          "position": null,
          "cost": 19
        },
        {
          "player": "R Jones",
          "position": null,
          "cost": 2
        },
        {
          "player": "T Boyd",
          "position": null,
          "cost": 1
        },
        {
          "player": "S Shepard",
          "position": null,
          "cost": 4
        },
        {
          "player": "T McLaurin",
          "position": null,
          "cost": 5
        },
        {
          "player": "D Ozigbo",
          "position": null,
          "cost": 1
        }
      ],
      "Anthony": [
        {
          "player": "C Wentz",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "K Allen",
          "position": "WR",
          "cost": 6
        },
        {
          "player": "DJ Chark",
          "position": "WR",
          "cost": 8
        },
        {
          "player": "M Sanders",
          "position": "RB",
          "cost": 38
        },
        {
          "player": "J Taylor",
          "position": "RB",
          "cost": 25
        },
        {
          "player": "JK Dobbins",
          "position": "W/R/T",
          "cost": 13
        },
        {
          "player": "M Andrews",
          "position": "TE",
          "cost": 11
        },
        {
          "player": "G Zuerlein",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Vikings",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "K Hunt",
          "position": null,
          "cost": 14
        },
        {
          "player": "Z Moss",
          "position": null,
          "cost": 6
        },
        {
          "player": "M Mack",
          "position": null,
          "cost": 6
        },
        {
          "player": "C Edmonds",
          "position": null,
          "cost": 2
        },
        {
          "player": "J Burrow",
          "position": null,
          "cost": 1
        },
        {
          "player": "B Aiyuk",
          "position": null,
          "cost": 1
        }
      ],
      "Nick Trow": [
        {
          "player": "D Watson",
          "position": "QB",
          "cost": 14
        },
        {
          "player": "C Godwin",
          "position": "WR",
          "cost": 22
        },
        {
          "player": "D Adams",
          "position": "WR",
          "cost": 61
        },
        {
          "player": "D Henry",
          "position": "RB",
          "cost": 76
        },
        {
          "player": "J Mixon",
          "position": "RB",
          "cost": 40
        },
        {
          "player": "T Hill",
          "position": "W/R/T",
          "cost": 45
        },
        {
          "player": "J Cook",
          "position": "TE",
          "cost": 2
        },
        {
          "player": "R Gould",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Broncos",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "A Cooper",
          "position": null,
          "cost": 14
        },
        {
          "player": "A Gibson",
          "position": null,
          "cost": 7
        },
        {
          "player": "TY Hilton",
          "position": null,
          "cost": 6
        },
        {
          "player": "J White",
          "position": null,
          "cost": 9
        },
        {
          "player": "D Jackson",
          "position": null,
          "cost": 1
        },
        {
          "player": "G Tate",
          "position": null,
          "cost": 3
        }
      ],
      "Ragen": [
        {
          "player": "A Rodgers",
          "position": "QB",
          "cost": 3
        },
        {
          "player": "A Robinson",
          "position": "WR",
          "cost": 18
        },
        {
          "player": "C Sutton",
          "position": "WR",
          "cost": 14
        },
        {
          "player": "A Jones",
          "position": "RB",
          "cost": 30
        },
        {
          "player": "E Elliott",
          "position": "RB",
          "cost": 98
        },
        {
          "player": "R Woods",
          "position": "W/R/T",
          "cost": 22
        },
        {
          "player": "D Waller",
          "position": "TE",
          "cost": 8
        },
        {
          "player": "M Crosby",
          "position": "K",
          "cost": 1
        },
        {
          "player": "49ers",
          "position": "DEF",
          "cost": 3
        },
        {
          "player": "M Gallup",
          "position": null,
          "cost": 15
        },
        {
          "player": "C Carson",
          "position": null,
          "cost": 30
        },
        {
          "player": "C Thompson",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Crowder",
          "position": null,
          "cost": 1
        },
        {
          "player": "D Williams",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Stafford",
          "position": null,
          "cost": 1
        }
      ],
      "Eric": [
        {
          "player": "L Jackson",
          "position": "QB",
          "cost": 14
        },
        {
          "player": "J Jones",
          "position": "WR",
          "cost": 60
        },
        {
          "player": "D Hopkins",
          "position": "WR",
          "cost": 58
        },
        {
          "player": "C McCaffery",
          "position": "RB",
          "cost": 116
        },
        {
          "player": "J Jacobs",
          "position": "RB",
          "cost": 62
        },
        {
          "player": "A Kamara",
          "position": "W/R/T",
          "cost": 80
        },
        {
          "player": "Z Ertz",
          "position": "TE",
          "cost": 30
        },
        {
          "player": "H Butker",
          "position": "K",
          "cost": 5
        },
        {
          "player": "Steelers",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "AJ Brown",
          "position": null,
          "cost": 9
        },
        {
          "player": "L Murray",
          "position": null,
          "cost": 4
        },
        {
          "player": "D Henderson",
          "position": null,
          "cost": 1
        },
        {
          "player": "B Scott",
          "position": null,
          "cost": 2
        },
        {
          "player": "B Snell",
          "position": null,
          "cost": 2
        },
        {
          "player": "C Lamb",
          "position": null,
          "cost": 2
        }
      ]
    }
  },
  "2019": {
    "budgets": {
      "Ragen": 215,
      "Spencer H": 201,
      "Eric": 226,
      "Dallas": 194,
      "Caleb": 202,
      "bradley": 174,
      "Scott": 230,
      "Tank": 247,
      "aric": 163,
      "Mase R": 182,
      "Nick Trow": 124
    },
    "cash_spent": {},
    "picks": {
      "Ragen": [
        {
          "player": "A Rodg",
          "position": "QB",
          "cost": 8
        },
        {
          "player": "D Adams",
          "position": "WR",
          "cost": 68
        },
        {
          "player": "A Robinson",
          "position": "WR",
          "cost": 8
        },
        {
          "player": "D Johnson",
          "position": "RB",
          "cost": 64
        },
        {
          "player": "D Montgomery",
          "position": "RB",
          "cost": 12
        },
        {
          "player": "P Lindsay",
          "position": "W/R/T",
          "cost": 7
        },
        {
          "player": "E Engram",
          "position": "TE",
          "cost": 9
        },
        {
          "player": "B Maher",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Eagles",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "T Coleman",
          "position": null,
          "cost": 6
        },
        {
          "player": "J Gordon",
          "position": null,
          "cost": 12
        },
        {
          "player": "A Green",
          "position": null,
          "cost": 11
        },
        {
          "player": "C Sutton",
          "position": null,
          "cost": 4
        },
        {
          "player": "G Tate",
          "position": null,
          "cost": 3
        },
        {
          "player": "J Goff",
          "position": null,
          "cost": 1
        }
      ],
      "Spencer H": [
        {
          "player": "C Wentz",
          "position": "QB",
          "cost": 2
        },
        {
          "player": "M Thomas",
          "position": "WR",
          "cost": 44
        },
        {
          "player": "A Brown",
          "position": "WR",
          "cost": 50
        },
        {
          "player": "A Jones",
          "position": "RB",
          "cost": 15
        },
        {
          "player": "L Bell",
          "position": "RB",
          "cost": 65
        },
        {
          "player": "T Boyd",
          "position": "W/R/T",
          "cost": 7
        },
        {
          "player": "A Hooper",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "M Prater",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Broncos",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "C Davis",
          "position": null,
          "cost": 3
        },
        {
          "player": "N Hynes",
          "position": null,
          "cost": 1
        },
        {
          "player": "T Williams",
          "position": null,
          "cost": 3
        },
        {
          "player": "Malcolm Brown",
          "position": null,
          "cost": 2
        },
        {
          "player": "Desean Hamilton",
          "position": null,
          "cost": 1
        },
        {
          "player": "CJ Anderson",
          "position": null,
          "cost": 4
        }
      ],
      "Eric": [
        {
          "player": "Big Ben",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "A Thielen",
          "position": "WR",
          "cost": 22
        },
        {
          "player": "TY Hilton",
          "position": "WR",
          "cost": 32
        },
        {
          "player": "C McCaffrey",
          "position": "RB",
          "cost": 85
        },
        {
          "player": "J Mixon",
          "position": "RB",
          "cost": 45
        },
        {
          "player": "C Kupp",
          "position": "W/R/T",
          "cost": 18
        },
        {
          "player": "OJ Howard",
          "position": "TE",
          "cost": 6
        },
        {
          "player": "K Fairburn",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Bears",
          "position": "DEF",
          "cost": 6
        },
        {
          "player": "A Mattison",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Samuels",
          "position": null,
          "cost": 4
        },
        {
          "player": "D Moncreif",
          "position": null,
          "cost": 1
        },
        {
          "player": "F Gore",
          "position": null,
          "cost": 2
        },
        {
          "player": "K Coutee",
          "position": null,
          "cost": 1
        },
        {
          "player": "Gio Bernard",
          "position": null,
          "cost": 1
        }
      ],
      "Dallas": [
        {
          "player": "C Newton",
          "position": "QB",
          "cost": 3
        },
        {
          "player": "A Jeffrey",
          "position": "WR",
          "cost": 16
        },
        {
          "player": "T Hill",
          "position": "WR",
          "cost": 62
        },
        {
          "player": "A Ekeler",
          "position": "RB",
          "cost": 11
        },
        {
          "player": "E Elliott",
          "position": "RB",
          "cost": 63
        },
        {
          "player": "D Guice",
          "position": "W/R/T",
          "cost": 17
        },
        {
          "player": "D Walker",
          "position": "TE",
          "cost": 2
        },
        {
          "player": "W Lutz",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Rams",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "S Shepherd",
          "position": null,
          "cost": 2
        },
        {
          "player": "L Fitzgerald",
          "position": null,
          "cost": 2
        },
        {
          "player": "M Jones JR",
          "position": null,
          "cost": 4
        },
        {
          "player": "P Barber",
          "position": null,
          "cost": 3
        },
        {
          "player": "DK Metcalf",
          "position": null,
          "cost": 1
        },
        {
          "player": "T Montgomery",
          "position": null,
          "cost": 4
        }
      ],
      "Caleb": [
        {
          "player": "Drew Brees",
          "position": "QB",
          "cost": 4
        },
        {
          "player": "OBJ",
          "position": "WR",
          "cost": 69
        },
        {
          "player": "M Evans",
          "position": "WR",
          "cost": 53
        },
        {
          "player": "S Michel",
          "position": "RB",
          "cost": 17
        },
        {
          "player": "M Ingram",
          "position": "RB",
          "cost": 30
        },
        {
          "player": "K Drake",
          "position": "W/R/T",
          "cost": 6
        },
        {
          "player": "V McDonald",
          "position": "TE",
          "cost": 2
        },
        {
          "player": "J Elliott",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Browns",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "J White",
          "position": null,
          "cost": 6
        },
        {
          "player": "R Freeman",
          "position": null,
          "cost": 4
        },
        {
          "player": "D Henderson",
          "position": null,
          "cost": 2
        },
        {
          "player": "G Allison",
          "position": null,
          "cost": 2
        },
        {
          "player": "W Fuller",
          "position": null,
          "cost": 3
        },
        {
          "player": "D Jackson",
          "position": null,
          "cost": 2
        }
      ],
      "bradley": [
        {
          "player": "P Rivers",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "S Diggs",
          "position": "WR",
          "cost": 24
        },
        {
          "player": "K Allen",
          "position": "WR",
          "cost": 35
        },
        {
          "player": "D Henry",
          "position": "RB",
          "cost": 36
        },
        {
          "player": "D Cook",
          "position": "RB",
          "cost": 44
        },
        {
          "player": "J Hill",
          "position": "W/R/T",
          "cost": 4
        },
        {
          "player": "D Njoku",
          "position": "TE",
          "cost": 5
        },
        {
          "player": "M Crosby",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Vikings",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "J Jackson",
          "position": null,
          "cost": 3
        },
        {
          "player": "M Gallup",
          "position": null,
          "cost": 5
        },
        {
          "player": "M Crabtree",
          "position": null,
          "cost": 1
        },
        {
          "player": "R Jones",
          "position": null,
          "cost": 2
        },
        {
          "player": "K Stills",
          "position": null,
          "cost": 1
        },
        {
          "player": "Marquise Brown",
          "position": null,
          "cost": 4
        }
      ],
      "Scott": [
        {
          "player": "D Watson",
          "position": "QB",
          "cost": 7
        },
        {
          "player": "J Edelman",
          "position": "WR",
          "cost": 18
        },
        {
          "player": "D Hopkins",
          "position": "WR",
          "cost": 66
        },
        {
          "player": "C Carson",
          "position": "RB",
          "cost": 21
        },
        {
          "player": "D Freeman",
          "position": "RB",
          "cost": 39
        },
        {
          "player": "A Cooper",
          "position": "W/R/T",
          "cost": 26
        },
        {
          "player": "H Henry",
          "position": "TE",
          "cost": 5
        },
        {
          "player": "G Tavecchio",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Patriots",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "D Williams",
          "position": null,
          "cost": 40
        },
        {
          "player": "A Humphries",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Washington",
          "position": null,
          "cost": 1
        },
        {
          "player": "D Lewis",
          "position": null,
          "cost": 1
        },
        {
          "player": "N Harry",
          "position": null,
          "cost": 1
        },
        {
          "player": "T Ginn",
          "position": null,
          "cost": 1
        }
      ],
      "Tank": [
        {
          "player": "L Jackson",
          "position": "QB",
          "cost": 4
        },
        {
          "player": "DJ Moore",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "C Godwin",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "N Chubb",
          "position": "RB",
          "cost": 16
        },
        {
          "player": "S Barkley",
          "position": "RB",
          "cost": 85
        },
        {
          "player": "K Golloday",
          "position": "W/R/T",
          "cost": 11
        },
        {
          "player": "T Kelce",
          "position": "TE",
          "cost": 43
        },
        {
          "player": "J Tucker",
          "position": "K",
          "cost": 4
        },
        {
          "player": "Ravens",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "J Jacobs",
          "position": null,
          "cost": 32
        },
        {
          "player": "J Howard",
          "position": null,
          "cost": 8
        },
        {
          "player": "R Penny",
          "position": null,
          "cost": 2
        },
        {
          "player": "D Westbrook",
          "position": null,
          "cost": 6
        },
        {
          "player": "K Murray",
          "position": null,
          "cost": 5
        },
        {
          "player": "D Singletary",
          "position": null,
          "cost": 6
        }
      ],
      "aric": [
        {
          "player": "S Darnold",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "D Prescott",
          "position": "WR",
          "cost": 1
        },
        {
          "player": "M Williams",
          "position": "WR",
          "cost": 5
        },
        {
          "player": "K Johnson",
          "position": "RB",
          "cost": 20
        },
        {
          "player": "A Kamara",
          "position": "RB",
          "cost": 85
        },
        {
          "player": "K Hunt",
          "position": "W/R/T",
          "cost": 4
        },
        {
          "player": "M Andrews",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "Butker",
          "position": "K",
          "cost": 3
        },
        {
          "player": "Chargers",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "M Sanders",
          "position": null,
          "cost": 19
        },
        {
          "player": "D Thompson",
          "position": null,
          "cost": 10
        },
        {
          "player": "M valdez-scandling",
          "position": null,
          "cost": 3
        },
        {
          "player": "Anthony Miller",
          "position": null,
          "cost": 1
        },
        {
          "player": "Damian Harris",
          "position": null,
          "cost": 3
        },
        {
          "player": "D Crockett",
          "position": null,
          "cost": 1
        }
      ],
      "Mase R": [
        {
          "player": "B Mayfield",
          "position": "QB",
          "cost": 7
        },
        {
          "player": "B Cooks",
          "position": "WR",
          "cost": 30
        },
        {
          "player": "T Lockett",
          "position": "WR",
          "cost": 28
        },
        {
          "player": "M Mack",
          "position": "RB",
          "cost": 18
        },
        {
          "player": "M Gordon",
          "position": "RB",
          "cost": 30
        },
        {
          "player": "C Ridley",
          "position": "W/R/T",
          "cost": 8
        },
        {
          "player": "G Kittle",
          "position": "TE",
          "cost": 35
        },
        {
          "player": "S Gostkowski",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Jags",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "J Landry",
          "position": null,
          "cost": 9
        },
        {
          "player": "K Bellage",
          "position": null,
          "cost": 1
        },
        {
          "player": "C Kirk",
          "position": null,
          "cost": 3
        },
        {
          "player": "C Hyde",
          "position": null,
          "cost": 1
        },
        {
          "player": "W Snead",
          "position": null,
          "cost": 1
        },
        {
          "player": "Trequan Smith",
          "position": null,
          "cost": 1
        }
      ],
      "Nick Trow": [
        {
          "player": "Matt Ryan",
          "position": "QB",
          "cost": 2
        },
        {
          "player": "JuJu",
          "position": "WR",
          "cost": 19
        },
        {
          "player": "S Watkins",
          "position": "WR",
          "cost": 3
        },
        {
          "player": "J Conner",
          "position": "RB",
          "cost": 62
        },
        {
          "player": "T Cohen",
          "position": "RB",
          "cost": 7
        },
        {
          "player": "Duke Johnson",
          "position": "W/R/T",
          "cost": 9
        },
        {
          "player": "J Cook",
          "position": "TE",
          "cost": 4
        },
        {
          "player": "R Gould",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Seahawks",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "T Pollard",
          "position": null,
          "cost": 4
        },
        {
          "player": "R Anderson",
          "position": null,
          "cost": 1
        },
        {
          "player": "C Samuel",
          "position": null,
          "cost": 1
        },
        {
          "player": "E Sanders",
          "position": null,
          "cost": 3
        },
        {
          "player": "Matt Breida",
          "position": null,
          "cost": 3
        },
        {
          "player": "D Pettis",
          "position": null,
          "cost": 4
        }
      ]
    }
  },
  "2018": {
    "budgets": {
      "Spencer H": 119,
      "bradley": 81,
      "Tank": 75,
      "Nick Trow": 173,
      "RJ": 236,
      "Kirk": 200,
      "Jakob": 253,
      "Dallas": 259,
      "Caleb": 346,
      "Eric": 220,
      "Scott": 223,
      "aric": 215
    },
    "cash_spent": {},
    "picks": {
      "Spencer H": [
        {
          "player": "M Stafford",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "M Thomas",
          "position": "WR",
          "cost": 22
        },
        {
          "player": "J Gordon",
          "position": "WR",
          "cost": 16
        },
        {
          "player": "D Henry",
          "position": "RB",
          "cost": 18
        },
        {
          "player": "C Hyde",
          "position": "RB",
          "cost": 25
        },
        {
          "player": "E Sanders",
          "position": "W/R/T",
          "cost": 5
        },
        {
          "player": "T Eifert",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "A Vinitaeri",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Broncos",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "R Penny",
          "position": null,
          "cost": 5
        },
        {
          "player": "J White",
          "position": null,
          "cost": 8
        },
        {
          "player": "M Breida",
          "position": null,
          "cost": 9
        },
        {
          "player": "A Jones",
          "position": null,
          "cost": 5
        },
        {
          "player": "M Sanu",
          "position": null,
          "cost": 1
        },
        {
          "player": "P Richardson",
          "position": null,
          "cost": 1
        }
      ],
      "bradley": [
        {
          "player": "K Cousins",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "S Watkins",
          "position": "WR",
          "cost": 3
        },
        {
          "player": "M Jones",
          "position": "WR",
          "cost": 7
        },
        {
          "player": "K Hunt",
          "position": "RB",
          "cost": 34
        },
        {
          "player": "N Chubb",
          "position": "RB",
          "cost": 6
        },
        {
          "player": "M Williams",
          "position": "W/R/T",
          "cost": 4
        },
        {
          "player": "J Reed",
          "position": "TE",
          "cost": 2
        },
        {
          "player": "R Gould",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Jags",
          "position": "DEF",
          "cost": 5
        },
        {
          "player": "A Morris",
          "position": null,
          "cost": 5
        },
        {
          "player": "E Engram",
          "position": null,
          "cost": 3
        },
        {
          "player": "J Nelson",
          "position": null,
          "cost": 3
        },
        {
          "player": "K Stills",
          "position": null,
          "cost": 2
        },
        {
          "player": "S Ware",
          "position": null,
          "cost": 3
        },
        {
          "player": "B Scott",
          "position": null,
          "cost": 1
        }
      ],
      "Tank": [
        {
          "player": "P Rivers",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "T Hill",
          "position": "WR",
          "cost": 36
        },
        {
          "player": "D Moore",
          "position": "WR",
          "cost": 2
        },
        {
          "player": "T Cohen",
          "position": "RB",
          "cost": 5
        },
        {
          "player": "R Jones",
          "position": "RB",
          "cost": 6
        },
        {
          "player": "C Clement",
          "position": "W/R/T",
          "cost": 4
        },
        {
          "player": "D Njoku",
          "position": "TE",
          "cost": 2
        },
        {
          "player": "G Gano",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Panthers",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "P Garcon",
          "position": null,
          "cost": 2
        },
        {
          "player": "C Kirk",
          "position": null,
          "cost": 4
        },
        {
          "player": "J Goff",
          "position": null,
          "cost": 3
        },
        {
          "player": "C Godwin",
          "position": null,
          "cost": 1
        },
        {
          "player": "C Anderson",
          "position": null,
          "cost": 4
        },
        {
          "player": "D Bryant",
          "position": null,
          "cost": 3
        }
      ],
      "Nick Trow": [
        {
          "player": "P Mahomes",
          "position": "QB",
          "cost": 3
        },
        {
          "player": "K Allen",
          "position": "WR",
          "cost": 42
        },
        {
          "player": "C Hogan",
          "position": "WR",
          "cost": 14
        },
        {
          "player": "J Ajayi",
          "position": "RB",
          "cost": 24
        },
        {
          "player": "L Miller",
          "position": "RB",
          "cost": 17
        },
        {
          "player": "A Robinson",
          "position": "W/R/T",
          "cost": 15
        },
        {
          "player": "T Kelce",
          "position": "TE",
          "cost": 30
        },
        {
          "player": "M Prater",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Saints",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "J Smith-Schuster",
          "position": null,
          "cost": 9
        },
        {
          "player": "P Barber",
          "position": null,
          "cost": 8
        },
        {
          "player": "C Thompson",
          "position": null,
          "cost": 4
        },
        {
          "player": "R Anderson",
          "position": null,
          "cost": 3
        },
        {
          "player": "B Powell",
          "position": null,
          "cost": 1
        },
        {
          "player": "D Booker",
          "position": null,
          "cost": 1
        }
      ],
      "RJ": [
        {
          "player": "A Rodgers",
          "position": "QB",
          "cost": 36
        },
        {
          "player": "S Diggs",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "D Adams",
          "position": "WR",
          "cost": 34
        },
        {
          "player": "D Johnson",
          "position": "RB",
          "cost": 32
        },
        {
          "player": "J Mixon",
          "position": "RB",
          "cost": 32
        },
        {
          "player": "M Evans",
          "position": "W/R/T",
          "cost": 38
        },
        {
          "player": "D Walker",
          "position": "TE",
          "cost": 17
        },
        {
          "player": "Boswell",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Vikings",
          "position": "DEF",
          "cost": 3
        },
        {
          "player": "R Burkhead",
          "position": null,
          "cost": 8
        },
        {
          "player": "D Brees",
          "position": null,
          "cost": 3
        },
        {
          "player": "M Goodwin",
          "position": null,
          "cost": 13
        },
        {
          "player": "I Crowell",
          "position": null,
          "cost": 5
        },
        {
          "player": "K Benjamin",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Doctson",
          "position": null,
          "cost": 1
        }
      ],
      "Kirk": [
        {
          "player": "B Roethlisberger",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "L Fitzgerald",
          "position": "WR",
          "cost": 15
        },
        {
          "player": "D Thomas",
          "position": "WR",
          "cost": 16
        },
        {
          "player": "L Bell",
          "position": "RB",
          "cost": 84
        },
        {
          "player": "K Drake",
          "position": "RB",
          "cost": 11
        },
        {
          "player": "R Freeman",
          "position": "W/R/T",
          "cost": 40
        },
        {
          "player": "Z Ertz",
          "position": "TE",
          "cost": 14
        },
        {
          "player": "G Zeurlein",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Rams",
          "position": "DEF",
          "cost": 3
        },
        {
          "player": "C Davis",
          "position": null,
          "cost": 4
        },
        {
          "player": "J Ross",
          "position": null,
          "cost": 2
        },
        {
          "player": "J Doyle",
          "position": null,
          "cost": 2
        },
        {
          "player": "K Ballage",
          "position": null,
          "cost": 2
        },
        {
          "player": "L Jackson",
          "position": null,
          "cost": 2
        },
        {
          "player": "D Amendola",
          "position": null,
          "cost": 3
        }
      ],
      "Jakob": [
        {
          "player": "A Luck",
          "position": "QB",
          "cost": 3
        },
        {
          "player": "J Jones",
          "position": "WR",
          "cost": 70
        },
        {
          "player": "TY Hilton",
          "position": "WR",
          "cost": 30
        },
        {
          "player": "A Kamara",
          "position": "RB",
          "cost": 55
        },
        {
          "player": "C McCaffery",
          "position": "RB",
          "cost": 52
        },
        {
          "player": "T Coleman",
          "position": "W/R/T",
          "cost": 10
        },
        {
          "player": "K Rudolph",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "J Tucker",
          "position": "K",
          "cost": 3
        },
        {
          "player": "Ravens",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "J Williams",
          "position": null,
          "cost": 19
        },
        {
          "player": "N Agholor",
          "position": null,
          "cost": 3
        },
        {
          "player": "J Brown",
          "position": null,
          "cost": 1
        },
        {
          "player": "D Martin",
          "position": null,
          "cost": 2
        },
        {
          "player": "R Woods",
          "position": null,
          "cost": 1
        },
        {
          "player": "T Montgomery",
          "position": null,
          "cost": 1
        }
      ],
      "Dallas": [
        {
          "player": "C Newton",
          "position": "QB",
          "cost": 9
        },
        {
          "player": "B Cooks",
          "position": "WR",
          "cost": 21
        },
        {
          "player": "OBJ",
          "position": "WR",
          "cost": 68
        },
        {
          "player": "L McCoy",
          "position": "RB",
          "cost": 37
        },
        {
          "player": "E Elliott",
          "position": "RB",
          "cost": 86
        },
        {
          "player": "G Bernard",
          "position": "W/R/T",
          "cost": 1
        },
        {
          "player": "J Graham",
          "position": "TE",
          "cost": 10
        },
        {
          "player": "W Lutz",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Eagles",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "A Peterson",
          "position": null,
          "cost": 2
        },
        {
          "player": "A Jeffery",
          "position": null,
          "cost": 6
        },
        {
          "player": "G Tate",
          "position": null,
          "cost": 11
        },
        {
          "player": "L Murray",
          "position": null,
          "cost": 2
        },
        {
          "player": "A Etker",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Lee",
          "position": null,
          "cost": 1
        }
      ],
      "Caleb": [
        {
          "player": "J Garappolo",
          "position": "QB",
          "cost": 4
        },
        {
          "player": "A Brown",
          "position": "WR",
          "cost": 84
        },
        {
          "player": "M Crabtree",
          "position": "WR",
          "cost": 4
        },
        {
          "player": "L Fournette",
          "position": "RB",
          "cost": 68
        },
        {
          "player": "D Freeman",
          "position": "RB",
          "cost": 50
        },
        {
          "player": "S Barkley",
          "position": "W/R/T",
          "cost": 71
        },
        {
          "player": "Gronk",
          "position": "TE",
          "cost": 38
        },
        {
          "player": "H Butker",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Chiefs",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "M Mack",
          "position": null,
          "cost": 8
        },
        {
          "player": "W Fuller",
          "position": null,
          "cost": 5
        },
        {
          "player": "D Funchess",
          "position": null,
          "cost": 4
        },
        {
          "player": "K Cole",
          "position": null,
          "cost": 5
        },
        {
          "player": "R Cobb",
          "position": null,
          "cost": 2
        },
        {
          "player": "T Riddick",
          "position": null,
          "cost": 1
        }
      ],
      "Eric": [
        {
          "player": "T Brady",
          "position": "QB",
          "cost": 12
        },
        {
          "player": "A Thielen",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "T Lockett",
          "position": "WR",
          "cost": 1
        },
        {
          "player": "T Gurley",
          "position": "RB",
          "cost": 91
        },
        {
          "player": "M Gordon",
          "position": "RB",
          "cost": 70
        },
        {
          "player": "C Kupp",
          "position": "W/R/T",
          "cost": 5
        },
        {
          "player": "T Burton",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "M Bryant",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Chargers",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "M Ingram",
          "position": null,
          "cost": 17
        },
        {
          "player": "A Hurns",
          "position": null,
          "cost": 2
        },
        {
          "player": "S Shepard",
          "position": null,
          "cost": 1
        },
        {
          "player": "D Parker",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Crowder",
          "position": null,
          "cost": 2
        },
        {
          "player": "F Gore",
          "position": null,
          "cost": 3
        }
      ],
      "Scott": [
        {
          "player": "R Wilson",
          "position": "QB",
          "cost": 5
        },
        {
          "player": "AJ Green",
          "position": "WR",
          "cost": 49
        },
        {
          "player": "D Baldwin",
          "position": "WR",
          "cost": 30
        },
        {
          "player": "A Collins",
          "position": "RB",
          "cost": 28
        },
        {
          "player": "M Lynch",
          "position": "RB",
          "cost": 12
        },
        {
          "player": "A Cooper",
          "position": "W/R/T",
          "cost": 28
        },
        {
          "player": "G Olsen",
          "position": "TE",
          "cost": 21
        },
        {
          "player": "S Gostowski",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Texans",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "D Lewis",
          "position": null,
          "cost": 11
        },
        {
          "player": "C Carson",
          "position": null,
          "cost": 11
        },
        {
          "player": "S Michel",
          "position": null,
          "cost": 7
        },
        {
          "player": "J Landry",
          "position": null,
          "cost": 6
        },
        {
          "player": "J Edelman",
          "position": null,
          "cost": 8
        },
        {
          "player": "L Blount",
          "position": null,
          "cost": 4
        }
      ],
      "aric": [
        {
          "player": "D Watson",
          "position": "QB",
          "cost": 16
        },
        {
          "player": "D Hopkins",
          "position": "WR",
          "cost": 68
        },
        {
          "player": "T Taylor",
          "position": "WR",
          "cost": 1
        },
        {
          "player": "D Cook",
          "position": "RB",
          "cost": 58
        },
        {
          "player": "J Howard",
          "position": "RB",
          "cost": 28
        },
        {
          "player": "K Johnson",
          "position": "W/R/T",
          "cost": 10
        },
        {
          "player": "OJ Howard",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "J Elliott",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Patriots",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "C Ridley",
          "position": null,
          "cost": 5
        },
        {
          "player": "C Wentz",
          "position": null,
          "cost": 5
        },
        {
          "player": "J Wilkins",
          "position": null,
          "cost": 3
        },
        {
          "player": "M Gallop",
          "position": null,
          "cost": 2
        },
        {
          "player": "C Sutton",
          "position": null,
          "cost": 9
        },
        {
          "player": "K Golliday",
          "position": null,
          "cost": 1
        }
      ]
    }
  },
  "2017": {
    "budgets": {
      "Jakob": 185,
      "Tank": 226,
      "Spencer H": 149,
      "Scott": 195,
      "Eric": 164,
      "Kirk": 213,
      "bradley": 188,
      "Caleb": 269,
      "Dallas": 190,
      "Nick Trow": 218,
      "Ragen": 193,
      "aric": 210
    },
    "cash_spent": {},
    "picks": {
      "Jakob": [
        {
          "player": "D Brees",
          "position": "QB",
          "cost": 15
        },
        {
          "player": "A Jeffery",
          "position": "WR",
          "cost": 34
        },
        {
          "player": "B Marsh",
          "position": "WR",
          "cost": 19
        },
        {
          "player": "T Coleman",
          "position": "RB",
          "cost": 16
        },
        {
          "player": "A Peterson",
          "position": "RB",
          "cost": 28
        },
        {
          "player": "D Martin",
          "position": "W/R/T",
          "cost": 22
        },
        {
          "player": "T Eifert",
          "position": "TE",
          "cost": 12
        },
        {
          "player": "J Tucker",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Ravens",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "B Powell",
          "position": null,
          "cost": 16
        },
        {
          "player": "R Wilson",
          "position": null,
          "cost": 5
        },
        {
          "player": "M Bennett",
          "position": null,
          "cost": 3
        },
        {
          "player": "J Maclin",
          "position": null,
          "cost": 3
        },
        {
          "player": "T Ginn",
          "position": null,
          "cost": 1
        },
        {
          "player": "C Coleman",
          "position": null,
          "cost": 3
        }
      ],
      "Tank": [
        {
          "player": "C Newton",
          "position": "QB",
          "cost": 9
        },
        {
          "player": "J Nelson",
          "position": "WR",
          "cost": 24
        },
        {
          "player": "O Beckham",
          "position": "WR",
          "cost": 74
        },
        {
          "player": "R Kelley",
          "position": "RB",
          "cost": 11
        },
        {
          "player": "K Hunt",
          "position": "RB",
          "cost": 17
        },
        {
          "player": "D Jackson",
          "position": "W/R/T",
          "cost": 9
        },
        {
          "player": "Gronk",
          "position": "TE",
          "cost": 32
        },
        {
          "player": "S Gostowski",
          "position": "K",
          "cost": 3
        },
        {
          "player": "Panthers",
          "position": "DEF",
          "cost": 3
        },
        {
          "player": "T West",
          "position": null,
          "cost": 6
        },
        {
          "player": "M Gillislee",
          "position": null,
          "cost": 9
        },
        {
          "player": "J Stewart",
          "position": null,
          "cost": 10
        },
        {
          "player": "K Britt",
          "position": null,
          "cost": 1
        },
        {
          "player": "S Perine",
          "position": null,
          "cost": 7
        },
        {
          "player": "J Rodgers",
          "position": null,
          "cost": 11
        }
      ],
      "Spencer H": [
        {
          "player": "M Mariota",
          "position": "QB",
          "cost": 5
        },
        {
          "player": "A Brown",
          "position": "WR",
          "cost": 42
        },
        {
          "player": "M Thomas",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "J Ajayi",
          "position": "RB",
          "cost": 18
        },
        {
          "player": "F Gore",
          "position": "RB",
          "cost": 4
        },
        {
          "player": "T Pryor",
          "position": "W/R/T",
          "cost": 26
        },
        {
          "player": "J Cook",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "W Lutz",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Broncos",
          "position": "DEF",
          "cost": 4
        },
        {
          "player": "P Perkins",
          "position": null,
          "cost": 12
        },
        {
          "player": "M Forte",
          "position": null,
          "cost": 4
        },
        {
          "player": "E Decker",
          "position": null,
          "cost": 17
        },
        {
          "player": "K Drake",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Lee",
          "position": null,
          "cost": 2
        },
        {
          "player": "JJ Nelson",
          "position": null,
          "cost": 1
        }
      ],
      "Scott": [
        {
          "player": "T Brady",
          "position": "QB",
          "cost": 16
        },
        {
          "player": "D Thomas",
          "position": "WR",
          "cost": 23
        },
        {
          "player": "J Edelman",
          "position": "WR",
          "cost": 34
        },
        {
          "player": "A Abdullah",
          "position": "RB",
          "cost": 14
        },
        {
          "player": "L Blount",
          "position": "RB",
          "cost": 22
        },
        {
          "player": "B Cooks",
          "position": "W/R/T",
          "cost": 42
        },
        {
          "player": "J Graham",
          "position": "TE",
          "cost": 17
        },
        {
          "player": "D Bailey",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Texans",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "M Crabtree",
          "position": null,
          "cost": 11
        },
        {
          "player": "D Washington",
          "position": null,
          "cost": 1
        },
        {
          "player": "C Meredith",
          "position": null,
          "cost": 9
        },
        {
          "player": "J Williams",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Connor",
          "position": null,
          "cost": 1
        },
        {
          "player": "C Beasely",
          "position": null,
          "cost": 1
        }
      ],
      "Eric": [
        {
          "player": "M Ryan",
          "position": "QB",
          "cost": 6
        },
        {
          "player": "A Cooper",
          "position": "WR",
          "cost": 38
        },
        {
          "player": "T Hill",
          "position": "WR",
          "cost": 18
        },
        {
          "player": "L Fournette",
          "position": "RB",
          "cost": 41
        },
        {
          "player": "C McCaffrey",
          "position": "RB",
          "cost": 36
        },
        {
          "player": "M Ingram",
          "position": "W/R/T",
          "cost": 14
        },
        {
          "player": "K Rudolph",
          "position": "TE",
          "cost": 2
        },
        {
          "player": "A Vinateri",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Cardinals",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "A Thielen",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Williams",
          "position": null,
          "cost": 1
        },
        {
          "player": "R Matthews",
          "position": null,
          "cost": 2
        },
        {
          "player": "J White",
          "position": null,
          "cost": 1
        },
        {
          "player": "K Dixon",
          "position": null,
          "cost": 1
        },
        {
          "player": "D Sproles",
          "position": null,
          "cost": 1
        }
      ],
      "Kirk": [
        {
          "player": "A Luck",
          "position": "QB",
          "cost": 3
        },
        {
          "player": "S Watkins",
          "position": "WR",
          "cost": 10
        },
        {
          "player": "M Evans",
          "position": "WR",
          "cost": 52
        },
        {
          "player": "L Bell",
          "position": "RB",
          "cost": 42
        },
        {
          "player": "T Gurley",
          "position": "RB",
          "cost": 54
        },
        {
          "player": "M Lynch",
          "position": "W/R/T",
          "cost": 39
        },
        {
          "player": "Z Ertz",
          "position": "TE",
          "cost": 4
        },
        {
          "player": "M Crosby",
          "position": "K",
          "cost": 1
        },
        {
          "player": "New England",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "OJ Howard",
          "position": null,
          "cost": 2
        },
        {
          "player": "K Stills",
          "position": null,
          "cost": 1
        },
        {
          "player": "D Lewis",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Thomas",
          "position": null,
          "cost": 1
        },
        {
          "player": "A Morris",
          "position": null,
          "cost": 1
        },
        {
          "player": "B Roth",
          "position": null,
          "cost": 1
        }
      ],
      "bradley": [
        {
          "player": "J Winston",
          "position": "QB",
          "cost": 5
        },
        {
          "player": "A Robinson",
          "position": "WR",
          "cost": 25
        },
        {
          "player": "A Green",
          "position": "WR",
          "cost": 64
        },
        {
          "player": "C Anderson",
          "position": "RB",
          "cost": 24
        },
        {
          "player": "L Murray",
          "position": "RB",
          "cost": 3
        },
        {
          "player": "D Adams",
          "position": "W/R/T",
          "cost": 17
        },
        {
          "player": "C Brate",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "Janikowski",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Vikings",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "Woodhead",
          "position": null,
          "cost": 10
        },
        {
          "player": "L Fitz",
          "position": null,
          "cost": 10
        },
        {
          "player": "D Parker",
          "position": null,
          "cost": 4
        },
        {
          "player": "J Williams",
          "position": null,
          "cost": 9
        },
        {
          "player": "S Shepard",
          "position": null,
          "cost": 3
        },
        {
          "player": "J Matthews",
          "position": null,
          "cost": 5
        }
      ],
      "Caleb": [
        {
          "player": "T Taylor",
          "position": "QB",
          "cost": 3
        },
        {
          "player": "E Sanders",
          "position": "WR",
          "cost": 10
        },
        {
          "player": "J Jones",
          "position": "WR",
          "cost": 78
        },
        {
          "player": "I Crowell",
          "position": "RB",
          "cost": 18
        },
        {
          "player": "L McCoy",
          "position": "RB",
          "cost": 68
        },
        {
          "player": "L Miller",
          "position": "W/R/T",
          "cost": 46
        },
        {
          "player": "T Kelce",
          "position": "TE",
          "cost": 22
        },
        {
          "player": "C Santos",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Packers",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "C Davis",
          "position": null,
          "cost": 6
        },
        {
          "player": "R Cobb",
          "position": null,
          "cost": 4
        },
        {
          "player": "CJ Prosise",
          "position": null,
          "cost": 1
        },
        {
          "player": "G Bernard",
          "position": null,
          "cost": 9
        },
        {
          "player": "J Richard",
          "position": null,
          "cost": 1
        },
        {
          "player": "A Stewart",
          "position": null,
          "cost": 1
        }
      ],
      "Dallas": [
        {
          "player": "P Rivers",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "J Landry",
          "position": "WR",
          "cost": 19
        },
        {
          "player": "T Hilton",
          "position": "WR",
          "cost": 46
        },
        {
          "player": "M Gordon",
          "position": "RB",
          "cost": 42
        },
        {
          "player": "J Mixon",
          "position": "RB",
          "cost": 20
        },
        {
          "player": "M Wallace",
          "position": "W/R/T",
          "cost": 2
        },
        {
          "player": "J Reed",
          "position": "TE",
          "cost": 17
        },
        {
          "player": "M Bryant",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Seattle",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "E Lacy",
          "position": null,
          "cost": 13
        },
        {
          "player": "D Moncrief",
          "position": null,
          "cost": 7
        },
        {
          "player": "D Foreman",
          "position": null,
          "cost": 10
        },
        {
          "player": "C Sims",
          "position": null,
          "cost": 2
        },
        {
          "player": "M Jones",
          "position": null,
          "cost": 2
        },
        {
          "player": "J Doctson",
          "position": null,
          "cost": 2
        }
      ],
      "Nick Trow": [
        {
          "player": "K Cousins",
          "position": "QB",
          "cost": 5
        },
        {
          "player": "K Allen",
          "position": "WR",
          "cost": 21
        },
        {
          "player": "D Baldwin",
          "position": "WR",
          "cost": 28
        },
        {
          "player": "S Ware",
          "position": "RB",
          "cost": 16
        },
        {
          "player": "D McFadden",
          "position": "RB",
          "cost": 10
        },
        {
          "player": "D Cook",
          "position": "W/R/T",
          "cost": 29
        },
        {
          "player": "J Doyle",
          "position": "TE",
          "cost": 3
        },
        {
          "player": "B McManus",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Chiefs",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "D Murray",
          "position": null,
          "cost": 53
        },
        {
          "player": "D Henry",
          "position": null,
          "cost": 17
        },
        {
          "player": "J Crowder",
          "position": null,
          "cost": 6
        },
        {
          "player": "T Williams",
          "position": null,
          "cost": 6
        },
        {
          "player": "P Garcon",
          "position": null,
          "cost": 8
        },
        {
          "player": "T Rawls",
          "position": null,
          "cost": 7
        }
      ],
      "Ragen": [
        {
          "player": "A Rodgers",
          "position": "QB",
          "cost": 35
        },
        {
          "player": "D Bryant",
          "position": "WR",
          "cost": 41
        },
        {
          "player": "G Tate",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "D Johnson",
          "position": "RB",
          "cost": 16
        },
        {
          "player": "C Hyde",
          "position": "RB",
          "cost": 32
        },
        {
          "player": "T Montgomery",
          "position": "W/R/T",
          "cost": 25
        },
        {
          "player": "D Walker",
          "position": "TE",
          "cost": 4
        },
        {
          "player": "D Hopkins",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Jags",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "S Diggs",
          "position": null,
          "cost": 2
        },
        {
          "player": "J Ross",
          "position": null,
          "cost": 4
        },
        {
          "player": "H Henry",
          "position": null,
          "cost": 2
        },
        {
          "player": "J Brown",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Charles",
          "position": null,
          "cost": 9
        },
        {
          "player": "T Riddick",
          "position": null,
          "cost": 3
        }
      ],
      "aric": [
        {
          "player": "D Carr",
          "position": "QB",
          "cost": 2
        },
        {
          "player": "K Benjamin",
          "position": "WR",
          "cost": 20
        },
        {
          "player": "D Hopkins",
          "position": "WR",
          "cost": 34
        },
        {
          "player": "D Freeman",
          "position": "RB",
          "cost": 36
        },
        {
          "player": "J Howard",
          "position": "RB",
          "cost": 14
        },
        {
          "player": "W Snead",
          "position": "W/R/T",
          "cost": 13
        },
        {
          "player": "G Olsen",
          "position": "TE",
          "cost": 21
        },
        {
          "player": "G Gano",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Raiders",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "M Bryant",
          "position": null,
          "cost": 11
        },
        {
          "player": "E Elliott",
          "position": null,
          "cost": 49
        },
        {
          "player": "D Johnson Jr",
          "position": null,
          "cost": 3
        },
        {
          "player": "G Golladay",
          "position": null,
          "cost": 1
        },
        {
          "player": "Z Jones",
          "position": null,
          "cost": 2
        },
        {
          "player": "J Hill",
          "position": null,
          "cost": 1
        }
      ]
    }
  },
  "2016": {
    "budgets": {
      "Jakob": 233,
      "Tank": 172,
      "Spencer H": 206,
      "Scott": 156,
      "Eric": 194,
      "Kirk": 164,
      "bradley": 198,
      "Caleb": 189,
      "Dallas": 263,
      "Nick Trow": 173,
      "Ragen": 370,
      "aric": 82
    },
    "cash_spent": {},
    "picks": {
      "Jakob": [
        {
          "player": "J Winston",
          "position": "QB",
          "cost": 9
        },
        {
          "player": "K Allen",
          "position": "WR",
          "cost": 17
        },
        {
          "player": "E Sanders",
          "position": "WR",
          "cost": 27
        },
        {
          "player": "L McCoy",
          "position": "RB",
          "cost": 60
        },
        {
          "player": "J Forsett",
          "position": "RB",
          "cost": 15
        },
        {
          "player": "AJ Green",
          "position": "W/R/T",
          "cost": 60
        },
        {
          "player": "G Olsen",
          "position": "TE",
          "cost": 17
        },
        {
          "player": "J Tucker",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Houston",
          "position": "DEF",
          "cost": 4
        },
        {
          "player": "L Fitzgerald",
          "position": null,
          "cost": 5
        },
        {
          "player": "P Rivers",
          "position": null,
          "cost": 1
        },
        {
          "player": "T Eifert",
          "position": null,
          "cost": 2
        },
        {
          "player": "M Wallace",
          "position": null,
          "cost": 1
        },
        {
          "player": "C Johnson",
          "position": null,
          "cost": 2
        },
        {
          "player": "A Morris",
          "position": null,
          "cost": 11
        }
      ],
      "Tank": [
        {
          "player": "M Stafford",
          "position": "QB",
          "cost": 2
        },
        {
          "player": "D Moncrief",
          "position": "WR",
          "cost": 22
        },
        {
          "player": "T Lockett",
          "position": "WR",
          "cost": 6
        },
        {
          "player": "J Hill",
          "position": "RB",
          "cost": 15
        },
        {
          "player": "A Peterson",
          "position": "RB",
          "cost": 79
        },
        {
          "player": "Du Johnson",
          "position": "W/R/T",
          "cost": 6
        },
        {
          "player": "M Bennett",
          "position": "TE",
          "cost": 5
        },
        {
          "player": "S Gostowski",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Cardinals",
          "position": "DEF",
          "cost": 7
        },
        {
          "player": "J McKinnon",
          "position": null,
          "cost": 4
        },
        {
          "player": "J Matthews",
          "position": null,
          "cost": 2
        },
        {
          "player": "C Michael",
          "position": null,
          "cost": 9
        },
        {
          "player": "J Cameron",
          "position": null,
          "cost": 1
        },
        {
          "player": "A Dalton",
          "position": null,
          "cost": 1
        },
        {
          "player": "B Perriman",
          "position": null,
          "cost": 1
        }
      ],
      "Spencer H": [
        {
          "player": "B Bortles",
          "position": "QB",
          "cost": 2
        },
        {
          "player": "A Jeffery",
          "position": "WR",
          "cost": 17
        },
        {
          "player": "S Watkins",
          "position": "WR",
          "cost": 30
        },
        {
          "player": "J Langford",
          "position": "RB",
          "cost": 38
        },
        {
          "player": "TJ Yeldon",
          "position": "RB",
          "cost": 15
        },
        {
          "player": "T Benjamin",
          "position": "W/R/T",
          "cost": 3
        },
        {
          "player": "Gronk",
          "position": "TE",
          "cost": 66
        },
        {
          "player": "M Crosby",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Cincy",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "D Funchess",
          "position": null,
          "cost": 8
        },
        {
          "player": "J Ajayi",
          "position": null,
          "cost": 8
        },
        {
          "player": "I Crowell",
          "position": null,
          "cost": 8
        },
        {
          "player": "M Thomas",
          "position": null,
          "cost": 1
        },
        {
          "player": "S Smith",
          "position": null,
          "cost": 3
        },
        {
          "player": "C Sims",
          "position": null,
          "cost": 5
        }
      ],
      "Scott": [
        {
          "player": "T Taylor",
          "position": "QB",
          "cost": 4
        },
        {
          "player": "J Edelman",
          "position": "WR",
          "cost": 17
        },
        {
          "player": "A Cooper",
          "position": "WR",
          "cost": 29
        },
        {
          "player": "J Stewart",
          "position": "RB",
          "cost": 17
        },
        {
          "player": "C Hyde",
          "position": "RB",
          "cost": 27
        },
        {
          "player": "D Jackson",
          "position": "W/R/T",
          "cost": 13
        },
        {
          "player": "D Allen",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "A Vinateri",
          "position": "K",
          "cost": 4
        },
        {
          "player": "Denver",
          "position": "DEF",
          "cost": 3
        },
        {
          "player": "L Blount",
          "position": null,
          "cost": 11
        },
        {
          "player": "C Ivory",
          "position": null,
          "cost": 13
        },
        {
          "player": "T Brady",
          "position": null,
          "cost": 6
        },
        {
          "player": "T Smith",
          "position": null,
          "cost": 7
        },
        {
          "player": "K Aiken",
          "position": null,
          "cost": 3
        },
        {
          "player": "M Crabtree",
          "position": null,
          "cost": 1
        }
      ],
      "Eric": [
        {
          "player": "A Luck",
          "position": "QB",
          "cost": 11
        },
        {
          "player": "J Nelson",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "E Decker",
          "position": "WR",
          "cost": 7
        },
        {
          "player": "L Miller",
          "position": "RB",
          "cost": 30
        },
        {
          "player": "E Elliott",
          "position": "RB",
          "cost": 67
        },
        {
          "player": "R Jennings",
          "position": "W/R/T",
          "cost": 10
        },
        {
          "player": "E Ebron",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "J Brown",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Jets",
          "position": "DEF",
          "cost": 3
        },
        {
          "player": "R Cobb",
          "position": null,
          "cost": 27
        },
        {
          "player": "A Foster",
          "position": null,
          "cost": 18
        },
        {
          "player": "S Coates",
          "position": null,
          "cost": 4
        },
        {
          "player": "M Sanu",
          "position": null,
          "cost": 1
        },
        {
          "player": "T Sharpe",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Bryant",
          "position": null,
          "cost": 1
        }
      ],
      "Kirk": [
        {
          "player": "Big Ben",
          "position": "QB",
          "cost": 12
        },
        {
          "player": "A Brown",
          "position": "WR",
          "cost": 21
        },
        {
          "player": "M Evans",
          "position": "WR",
          "cost": 26
        },
        {
          "player": "T Gurley",
          "position": "RB",
          "cost": 27
        },
        {
          "player": "D Sproles",
          "position": "RB",
          "cost": 7
        },
        {
          "player": "J Landry",
          "position": "W/R/T",
          "cost": 15
        },
        {
          "player": "D Walker",
          "position": "TE",
          "cost": 10
        },
        {
          "player": "M Prater",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Chiefs",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "L Bell",
          "position": null,
          "cost": 21
        },
        {
          "player": "D Parker",
          "position": null,
          "cost": 9
        },
        {
          "player": "D Booker",
          "position": null,
          "cost": 4
        },
        {
          "player": "R Matthews",
          "position": null,
          "cost": 2
        },
        {
          "player": "C Palmer",
          "position": null,
          "cost": 6
        },
        {
          "player": "T Riddick",
          "position": null,
          "cost": 2
        }
      ],
      "bradley": [
        {
          "player": "C Newton",
          "position": "QB",
          "cost": 6
        },
        {
          "player": "B Marshall",
          "position": "WR",
          "cost": 27
        },
        {
          "player": "J Brown",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "T Rawls",
          "position": "RB",
          "cost": 57
        },
        {
          "player": "L Murray",
          "position": "RB",
          "cost": 38
        },
        {
          "player": "M Jones",
          "position": "W/R/T",
          "cost": 6
        },
        {
          "player": "T Kelce",
          "position": "TE",
          "cost": 13
        },
        {
          "player": "B Walsh",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Minnesota",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "J Gordon",
          "position": null,
          "cost": 16
        },
        {
          "player": "C Coleman",
          "position": null,
          "cost": 5
        },
        {
          "player": "B Powell",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Graham",
          "position": null,
          "cost": 6
        },
        {
          "player": "G Barnridge",
          "position": null,
          "cost": 3
        },
        {
          "player": "L Treadwell",
          "position": null,
          "cost": 7
        }
      ],
      "Caleb": [
        {
          "player": "M Mariota",
          "position": "QB",
          "cost": 3
        },
        {
          "player": "B Cooks",
          "position": "WR",
          "cost": 39
        },
        {
          "player": "D Thomas",
          "position": "WR",
          "cost": 36
        },
        {
          "player": "M Ingram",
          "position": "RB",
          "cost": 15
        },
        {
          "player": "F Gore",
          "position": "RB",
          "cost": 20
        },
        {
          "player": "A Abdullah",
          "position": "W/R/T",
          "cost": 17
        },
        {
          "player": "J Thomas",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "C Catanzarono",
          "position": "K",
          "cost": 3
        },
        {
          "player": "Pats",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "K White",
          "position": null,
          "cost": 7
        },
        {
          "player": "D Woodhead",
          "position": null,
          "cost": 19
        },
        {
          "player": "T Coleman",
          "position": null,
          "cost": 6
        },
        {
          "player": "S Diggs",
          "position": null,
          "cost": 13
        },
        {
          "player": "J Starks",
          "position": null,
          "cost": 2
        },
        {
          "player": "M Jones",
          "position": null,
          "cost": 7
        }
      ],
      "Dallas": [
        {
          "player": "D Brees",
          "position": "QB",
          "cost": 11
        },
        {
          "player": "T Hilton",
          "position": "WR",
          "cost": 23
        },
        {
          "player": "D Bryant",
          "position": "WR",
          "cost": 50
        },
        {
          "player": "E Lacy",
          "position": "RB",
          "cost": 65
        },
        {
          "player": "D Murray",
          "position": "RB",
          "cost": 41
        },
        {
          "player": "M Gordon",
          "position": "W/R/T",
          "cost": 21
        },
        {
          "player": "A Gates",
          "position": "TE",
          "cost": 3
        },
        {
          "player": "S Hauscka",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Carolina",
          "position": "DEF",
          "cost": 9
        },
        {
          "player": "G Bernard",
          "position": null,
          "cost": 10
        },
        {
          "player": "D Henry",
          "position": null,
          "cost": 13
        },
        {
          "player": "D Lewis",
          "position": null,
          "cost": 6
        },
        {
          "player": "A Hurns",
          "position": null,
          "cost": 4
        },
        {
          "player": "J Doctson",
          "position": null,
          "cost": 1
        },
        {
          "player": "V Jackson",
          "position": null,
          "cost": 4
        }
      ],
      "Nick Trow": [
        {
          "player": "R Wilson",
          "position": "QB",
          "cost": 11
        },
        {
          "player": "A Robinson",
          "position": "WR",
          "cost": 14
        },
        {
          "player": "G Tate",
          "position": "WR",
          "cost": 30
        },
        {
          "player": "R Matthews",
          "position": "RB",
          "cost": 24
        },
        {
          "player": "C Anderson",
          "position": "RB",
          "cost": 12
        },
        {
          "player": "D Williams",
          "position": "W/R/T",
          "cost": 7
        },
        {
          "player": "C Fleener",
          "position": "TE",
          "cost": 12
        },
        {
          "player": "D Bailey",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Seattle",
          "position": "DEF",
          "cost": 6
        },
        {
          "player": "S Ware",
          "position": null,
          "cost": 6
        },
        {
          "player": "D Baldwin",
          "position": null,
          "cost": 14
        },
        {
          "player": "J Maclin",
          "position": null,
          "cost": 15
        },
        {
          "player": "W Snead",
          "position": null,
          "cost": 11
        },
        {
          "player": "M Wheaton",
          "position": null,
          "cost": 1
        },
        {
          "player": "D Washington",
          "position": null,
          "cost": 8
        }
      ],
      "Ragen": [
        {
          "player": "A Rodgers",
          "position": "QB",
          "cost": 41
        },
        {
          "player": "J Jones",
          "position": "WR",
          "cost": 80
        },
        {
          "player": "O Beckham",
          "position": "WR",
          "cost": 80
        },
        {
          "player": "D Johnson",
          "position": "RB",
          "cost": 6
        },
        {
          "player": "D Martin",
          "position": "RB",
          "cost": 32
        },
        {
          "player": "J Charles",
          "position": "W/R/T",
          "cost": 62
        },
        {
          "player": "J Reed",
          "position": "TE",
          "cost": 11
        },
        {
          "player": "C Santos",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Bills",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "M Floyd",
          "position": null,
          "cost": 10
        },
        {
          "player": "M Forte",
          "position": null,
          "cost": 40
        },
        {
          "player": "T Austin",
          "position": null,
          "cost": 1
        },
        {
          "player": "C Hogan",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Cook",
          "position": null,
          "cost": 1
        },
        {
          "player": "R Griffin",
          "position": null,
          "cost": 3
        }
      ],
      "aric": [
        {
          "player": "D Carr",
          "position": "QB",
          "cost": 6
        },
        {
          "player": "D Hopkins",
          "position": "WR",
          "cost": 17
        },
        {
          "player": "K Benjamin",
          "position": "WR",
          "cost": 10
        },
        {
          "player": "D Freeman",
          "position": "RB",
          "cost": 18
        },
        {
          "player": "P Perkins",
          "position": "RB",
          "cost": 2
        },
        {
          "player": "Sheopard",
          "position": "W/R/T",
          "cost": 9
        },
        {
          "player": "A Seferian-Jenk",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "G Gano",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Oakland",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "T Boyd",
          "position": null,
          "cost": 3
        },
        {
          "player": "P Dorsett",
          "position": null,
          "cost": 2
        },
        {
          "player": "T Bridgewater",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Howard",
          "position": null,
          "cost": 4
        },
        {
          "player": "W Smallwood",
          "position": null,
          "cost": 1
        },
        {
          "player": "P Cooper",
          "position": null,
          "cost": 5
        }
      ]
    }
  },
  "2015": {
    "budgets": {
      "Jakob": 165,
      "Tank": 153,
      "Spencer H": 228,
      "Scott": 240,
      "Eric": 280,
      "Kirk": 132,
      "bradley": 163,
      "Caleb": 306,
      "Dallas": 198,
      "Nick Trow": 206,
      "Ragen": 232,
      "aric": 95
    },
    "cash_spent": {},
    "picks": {
      "Jakob": [
        {
          "player": "A Rodgers",
          "position": "QB",
          "cost": 49
        },
        {
          "player": "R Cobb",
          "position": "WR",
          "cost": 35
        },
        {
          "player": "J Landry",
          "position": "WR",
          "cost": 10
        },
        {
          "player": "J Bell",
          "position": "RB",
          "cost": 18
        },
        {
          "player": "C Spiller",
          "position": "RB",
          "cost": 12
        },
        {
          "player": "D McFadden",
          "position": "W/R/T",
          "cost": 12
        },
        {
          "player": "G Olsen",
          "position": "TE",
          "cost": 11
        },
        {
          "player": "J Tucker",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Ravens",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "D Williams",
          "position": null,
          "cost": 2
        },
        {
          "player": "T Smith",
          "position": null,
          "cost": 4
        },
        {
          "player": "S Bradford",
          "position": null,
          "cost": 1
        },
        {
          "player": "Charles Johnson",
          "position": null,
          "cost": 1
        },
        {
          "player": "Chris Johnson",
          "position": null,
          "cost": 3
        },
        {
          "player": "E Royal",
          "position": null,
          "cost": 3
        }
      ],
      "Tank": [
        {
          "player": "T Brady",
          "position": "QB",
          "cost": 19
        },
        {
          "player": "A Jeffery",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "E Decker",
          "position": "WR",
          "cost": 2
        },
        {
          "player": "J Hill",
          "position": "RB",
          "cost": 10
        },
        {
          "player": "A Abdullah",
          "position": "RB",
          "cost": 22
        },
        {
          "player": "D Cobb",
          "position": "W/R/T",
          "cost": 4
        },
        {
          "player": "Gronk",
          "position": "TE",
          "cost": 44
        },
        {
          "player": "S Haushka",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Rams",
          "position": "DEF",
          "cost": 3
        },
        {
          "player": "P Rivers",
          "position": null,
          "cost": 7
        },
        {
          "player": "D Johnson",
          "position": null,
          "cost": 7
        },
        {
          "player": "J Thomas",
          "position": null,
          "cost": 4
        },
        {
          "player": "S Vereen",
          "position": null,
          "cost": 8
        },
        {
          "player": "J Brown",
          "position": null,
          "cost": 6
        },
        {
          "player": "L Fitzgerald",
          "position": null,
          "cost": 5
        }
      ],
      "Spencer H": [
        {
          "player": "E Manning",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "V Jackson",
          "position": "WR",
          "cost": 22
        },
        {
          "player": "S Watkins",
          "position": "WR",
          "cost": 20
        },
        {
          "player": "M Forte",
          "position": "RB",
          "cost": 72
        },
        {
          "player": "A Morris",
          "position": "RB",
          "cost": 45
        },
        {
          "player": "L Murray",
          "position": "W/R/T",
          "cost": 26
        },
        {
          "player": "D Walker",
          "position": "TE",
          "cost": 5
        },
        {
          "player": "C Catanzaro",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Dolphins",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "R Jennings",
          "position": null,
          "cost": 5
        },
        {
          "player": "D Funchess",
          "position": null,
          "cost": 3
        },
        {
          "player": "T Coleman",
          "position": null,
          "cost": 15
        },
        {
          "player": "C Latimer",
          "position": null,
          "cost": 1
        },
        {
          "player": "D Green-B",
          "position": null,
          "cost": 2
        },
        {
          "player": "M Jones",
          "position": null,
          "cost": 1
        }
      ],
      "Scott": [
        {
          "player": "R Tannehill",
          "position": "QB",
          "cost": 2
        },
        {
          "player": "E Sanders",
          "position": "WR",
          "cost": 18
        },
        {
          "player": "B Cooks",
          "position": "WR",
          "cost": 26
        },
        {
          "player": "A Peterson",
          "position": "RB",
          "cost": 78
        },
        {
          "player": "J Forsett",
          "position": "RB",
          "cost": 39
        },
        {
          "player": "A Cooper",
          "position": "W/R/T",
          "cost": 19
        },
        {
          "player": "T Kelce",
          "position": "TE",
          "cost": 10
        },
        {
          "player": "M Bryant",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Broncos",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "J Edelman",
          "position": null,
          "cost": 11
        },
        {
          "player": "L Blount",
          "position": null,
          "cost": 6
        },
        {
          "player": "C Ivory",
          "position": null,
          "cost": 8
        },
        {
          "player": "N Agholor",
          "position": null,
          "cost": 17
        },
        {
          "player": "J Janis",
          "position": null,
          "cost": 1
        },
        {
          "player": "D Robinson",
          "position": null,
          "cost": 3
        }
      ],
      "Eric": [
        {
          "player": "D Brees",
          "position": "QB",
          "cost": 35
        },
        {
          "player": "C Johnson",
          "position": "WR",
          "cost": 52
        },
        {
          "player": "M Colston",
          "position": "WR",
          "cost": 7
        },
        {
          "player": "M Lynch",
          "position": "RB",
          "cost": 79
        },
        {
          "player": "J Randle",
          "position": "RB",
          "cost": 30
        },
        {
          "player": "F Gore",
          "position": "W/R/T",
          "cost": 30
        },
        {
          "player": "J Witten",
          "position": "TE",
          "cost": 2
        },
        {
          "player": "D Carpenter",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Pats",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "M Bryant",
          "position": null,
          "cost": 17
        },
        {
          "player": "M Floyd",
          "position": null,
          "cost": 5
        },
        {
          "player": "C Sims",
          "position": null,
          "cost": 7
        },
        {
          "player": "F Jackson",
          "position": null,
          "cost": 5
        },
        {
          "player": "K White",
          "position": null,
          "cost": 2
        },
        {
          "player": "J Nelson",
          "position": null,
          "cost": 7
        }
      ],
      "Kirk": [
        {
          "player": "Big Ben",
          "position": "QB",
          "cost": 7
        },
        {
          "player": "M Evans",
          "position": "WR",
          "cost": 17
        },
        {
          "player": "A Johnson",
          "position": "WR",
          "cost": 22
        },
        {
          "player": "L Bell",
          "position": "RB",
          "cost": 13
        },
        {
          "player": "T Yeldon",
          "position": "RB",
          "cost": 21
        },
        {
          "player": "D Jackson",
          "position": "W/R/T",
          "cost": 15
        },
        {
          "player": "J Cameron",
          "position": "TE",
          "cost": 4
        },
        {
          "player": "C Parkey",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Jets",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "T Gurley",
          "position": null,
          "cost": 18
        },
        {
          "player": "M Stafford",
          "position": null,
          "cost": 2
        },
        {
          "player": "D Parker",
          "position": null,
          "cost": 4
        },
        {
          "player": "P Dorsett",
          "position": null,
          "cost": 1
        },
        {
          "player": "D Sproles",
          "position": null,
          "cost": 3
        },
        {
          "player": "J Hill",
          "position": null,
          "cost": 2
        }
      ],
      "bradley": [
        {
          "player": "C Newton",
          "position": "QB",
          "cost": 1
        },
        {
          "player": "B Marshall",
          "position": "WR",
          "cost": 18
        },
        {
          "player": "D Adams",
          "position": "WR",
          "cost": 37
        },
        {
          "player": "E Lacy",
          "position": "RB",
          "cost": 45
        },
        {
          "player": "J Starks",
          "position": "RB",
          "cost": 1
        },
        {
          "player": "D Bowe",
          "position": "W/R/T",
          "cost": 1
        },
        {
          "player": "Z Ertz",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "C Sturis",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Lions",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "A Foster",
          "position": null,
          "cost": 27
        },
        {
          "player": "A Blue",
          "position": null,
          "cost": 12
        },
        {
          "player": "K Davis",
          "position": null,
          "cost": 6
        },
        {
          "player": "V Cruz",
          "position": null,
          "cost": 8
        },
        {
          "player": "L Hankerson",
          "position": null,
          "cost": 1
        },
        {
          "player": "C Patterson",
          "position": null,
          "cost": 1
        }
      ],
      "Caleb": [
        {
          "player": "R Wilson",
          "position": "QB",
          "cost": 13
        },
        {
          "player": "O Beckham",
          "position": "WR",
          "cost": 61
        },
        {
          "player": "D Thomas",
          "position": "WR",
          "cost": 63
        },
        {
          "player": "D Murray",
          "position": "RB",
          "cost": 57
        },
        {
          "player": "M Ingram",
          "position": "RB",
          "cost": 10
        },
        {
          "player": "D Bryant",
          "position": "W/R/T",
          "cost": 68
        },
        {
          "player": "O Daniels",
          "position": "TE",
          "cost": 2
        },
        {
          "player": "M Crosby",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Packers",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "B Perriman",
          "position": null,
          "cost": 10
        },
        {
          "player": "I Crowell",
          "position": null,
          "cost": 9
        },
        {
          "player": "A Williams",
          "position": null,
          "cost": 1
        },
        {
          "player": "J Ajayi",
          "position": null,
          "cost": 3
        },
        {
          "player": "P Garcon",
          "position": null,
          "cost": 4
        },
        {
          "player": "R Bush",
          "position": null,
          "cost": 3
        }
      ],
      "Dallas": [
        {
          "player": "T Romo",
          "position": "QB",
          "cost": 13
        },
        {
          "player": "T Hilton",
          "position": "WR",
          "cost": 15
        },
        {
          "player": "K Allen",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "L Miller",
          "position": "RB",
          "cost": 20
        },
        {
          "player": "J Charles",
          "position": "RB",
          "cost": 80
        },
        {
          "player": "M Wallace",
          "position": "W/R/T",
          "cost": 5
        },
        {
          "player": "D Allen",
          "position": "TE",
          "cost": 3
        },
        {
          "player": "S Gostowski",
          "position": "K",
          "cost": 3
        },
        {
          "player": "Seahawks",
          "position": "DEF",
          "cost": 4
        },
        {
          "player": "G Bernard",
          "position": null,
          "cost": 5
        },
        {
          "player": "M Mariota",
          "position": null,
          "cost": 6
        },
        {
          "player": "A Ellington",
          "position": null,
          "cost": 15
        },
        {
          "player": "S Smith",
          "position": null,
          "cost": 4
        },
        {
          "player": "R White",
          "position": null,
          "cost": 10
        },
        {
          "player": "B Sankey",
          "position": null,
          "cost": 4
        }
      ],
      "Nick Trow": [
        {
          "player": "P Manning",
          "position": "QB",
          "cost": 32
        },
        {
          "player": "J Jones",
          "position": "WR",
          "cost": 53
        },
        {
          "player": "G Tate",
          "position": "WR",
          "cost": 20
        },
        {
          "player": "C Anderson",
          "position": "RB",
          "cost": 7
        },
        {
          "player": "M Gordon",
          "position": "RB",
          "cost": 30
        },
        {
          "player": "J Maclin",
          "position": "W/R/T",
          "cost": 22
        },
        {
          "player": "T Eifert",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "B Walsh",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Bills",
          "position": "DEF",
          "cost": 4
        },
        {
          "player": "A Robinson",
          "position": null,
          "cost": 9
        },
        {
          "player": "R Matthews",
          "position": null,
          "cost": 16
        },
        {
          "player": "T Mason",
          "position": null,
          "cost": 2
        },
        {
          "player": "K Wright",
          "position": null,
          "cost": 1
        },
        {
          "player": "R Hillman",
          "position": null,
          "cost": 8
        }
      ],
      "Ragen": [
        {
          "player": "M Ryan",
          "position": "QB",
          "cost": 9
        },
        {
          "player": "A Brown",
          "position": "WR",
          "cost": 14
        },
        {
          "player": "A Green",
          "position": "WR",
          "cost": 57
        },
        {
          "player": "L McCoy",
          "position": "RB",
          "cost": 51
        },
        {
          "player": "J Stewart",
          "position": "RB",
          "cost": 11
        },
        {
          "player": "J Graham",
          "position": "W/R/T",
          "cost": 41
        },
        {
          "player": "M Bennett",
          "position": "TE",
          "cost": 6
        },
        {
          "player": "D Bailey",
          "position": "K",
          "cost": 2
        },
        {
          "player": "Cardinals",
          "position": "DEF",
          "cost": 3
        },
        {
          "player": "D Martin",
          "position": null,
          "cost": 21
        },
        {
          "player": "D Johnson",
          "position": null,
          "cost": 1
        },
        {
          "player": "P Harvin",
          "position": null,
          "cost": 4
        },
        {
          "player": "D Woodhead",
          "position": null,
          "cost": 5
        },
        {
          "player": "B LaFell",
          "position": null,
          "cost": 3
        },
        {
          "player": "J Winston",
          "position": null,
          "cost": 4
        }
      ],
      "aric": [
        {
          "player": "A Luck",
          "position": "QB",
          "cost": 32
        },
        {
          "player": "D Hopkins",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "J Matthews",
          "position": "WR",
          "cost": 8
        },
        {
          "player": "C Hyde",
          "position": "RB",
          "cost": 18
        },
        {
          "player": "D Freeman",
          "position": "RB",
          "cost": 12
        },
        {
          "player": "C Artis-Payne",
          "position": "W/R/T",
          "cost": 1
        },
        {
          "player": "A Seferian-J",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "A Vinatieri",
          "position": "K",
          "cost": 1
        },
        {
          "player": "Texans",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "B Oliver",
          "position": null,
          "cost": 1
        },
        {
          "player": "M Williams",
          "position": null,
          "cost": 1
        },
        {
          "player": "T Bridgewater",
          "position": null,
          "cost": 1
        },
        {
          "player": "T Lockett",
          "position": null,
          "cost": 1
        },
        {
          "player": "K Benjamin",
          "position": null,
          "cost": 5
        }
      ]
    }
  },
  "2014": {
    "budgets": {},
    "cash_spent": {},
    "picks": {
      "Caleb": [
        {
          "player": "RUSSEL WILSON",
          "position": "QB",
          "cost": 8
        },
        {
          "player": "RODDY WHITE",
          "position": "WR",
          "cost": 19
        },
        {
          "player": "DESEAN JACKSON",
          "position": "WR",
          "cost": 20
        },
        {
          "player": "EDDIE LACY",
          "position": "RB",
          "cost": 30
        },
        {
          "player": "DEMARCO MURRAY",
          "position": "RB",
          "cost": 38
        },
        {
          "player": "VICTOR CRUZ",
          "position": "W/R/T",
          "cost": 27
        },
        {
          "player": "ZACH ERTZ",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "TRE MASON",
          "position": "K",
          "cost": 3
        },
        {
          "player": "CHIEFS",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "DEANDRE HOPKINS",
          "position": null,
          "cost": 6
        },
        {
          "player": "TAVON AUSTIN",
          "position": null,
          "cost": 2
        },
        {
          "player": "JOHNNY FOOTBALL",
          "position": null,
          "cost": 6
        },
        {
          "player": "MARK INGRAM",
          "position": null,
          "cost": 5
        },
        {
          "player": "MARKUS WHEATON",
          "position": null,
          "cost": 7
        },
        {
          "player": "JONATHAN STEWART",
          "position": null,
          "cost": 6
        }
      ],
      "Nick Trow": [
        {
          "player": "COLIN KAEPERNICK",
          "position": "QB",
          "cost": 5
        },
        {
          "player": "JULIO JONES",
          "position": "WR",
          "cost": 36
        },
        {
          "player": "MICHAEL CRABTREE",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "ADRIAN PETERSON",
          "position": "RB",
          "cost": 66
        },
        {
          "player": "ARIAN FOSTER",
          "position": "RB",
          "cost": 53
        },
        {
          "player": "JAMES WHITE",
          "position": "W/R/T",
          "cost": 1
        },
        {
          "player": "TIM WRIGHT",
          "position": "TE",
          "cost": 3
        },
        {
          "player": "BRYCE BROWN",
          "position": "K",
          "cost": 1
        },
        {
          "player": "PATRIOTS",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "GOLDEN TATE",
          "position": null,
          "cost": 13
        },
        {
          "player": "RONNIE HILMAN",
          "position": null,
          "cost": 2
        },
        {
          "player": "KENNY STILLS",
          "position": null,
          "cost": 3
        },
        {
          "player": "ANDREW HAWKINS",
          "position": null,
          "cost": 1
        },
        {
          "player": "AARON DOBSON",
          "position": null,
          "cost": 2
        },
        {
          "player": "CHRSITINE MICHAEL",
          "position": null,
          "cost": 2
        }
      ],
      "Ragen": [
        {
          "player": "MATTHEW STAFFORD",
          "position": "QB",
          "cost": 21
        },
        {
          "player": "ANTONIO BROWN",
          "position": "WR",
          "cost": 9
        },
        {
          "player": "JORDY NELSON",
          "position": "WR",
          "cost": 17
        },
        {
          "player": "ALFRED MORRIS",
          "position": "RB",
          "cost": 41
        },
        {
          "player": "CJ SPILLER",
          "position": "RB",
          "cost": 26
        },
        {
          "player": "WES WELKER",
          "position": "W/R/T",
          "cost": 5
        },
        {
          "player": "JASON WITTEN",
          "position": "TE",
          "cost": 20
        },
        {
          "player": "STEPHEN HAUSHCHA",
          "position": "K",
          "cost": 3
        },
        {
          "player": "PANTHERS",
          "position": "DEF",
          "cost": 5
        },
        {
          "player": "MATT RYAN",
          "position": null,
          "cost": 4
        },
        {
          "player": "REGGIE WAYNE",
          "position": null,
          "cost": 20
        },
        {
          "player": "ANQUAN BOLDIN",
          "position": null,
          "cost": 6
        },
        {
          "player": "DANNY WOODHEAD",
          "position": null,
          "cost": 3
        },
        {
          "player": "JORDAN TODMAN",
          "position": null,
          "cost": 1
        },
        {
          "player": "MARQUISE LEE",
          "position": null,
          "cost": 1
        }
      ],
      "Jakob": [
        {
          "player": "AARON RODGERS",
          "position": "QB",
          "cost": 41
        },
        {
          "player": "RANDALL COBB",
          "position": "WR",
          "cost": 23
        },
        {
          "player": "ANDRE JOHNSON",
          "position": "WR",
          "cost": 22
        },
        {
          "player": "MONTEE BALL",
          "position": "RB",
          "cost": 21
        },
        {
          "player": "STEVEN JACKSON",
          "position": "RB",
          "cost": 7
        },
        {
          "player": "BRANDON LAFELL",
          "position": "W/R/T",
          "cost": 1
        },
        {
          "player": "KYLE RUDOLPH",
          "position": "TE",
          "cost": 1
        },
        {
          "player": "STEPHEN GOSTOWSKI",
          "position": "K",
          "cost": 2
        },
        {
          "player": "49ERS",
          "position": "DEF",
          "cost": 4
        },
        {
          "player": "BERNARD PIERCE",
          "position": null,
          "cost": 8
        },
        {
          "player": "KNOWSHON MORENO",
          "position": null,
          "cost": 6
        },
        {
          "player": "GREG JENNINGS",
          "position": null,
          "cost": 2
        },
        {
          "player": "RG3",
          "position": null,
          "cost": 3
        },
        {
          "player": "KHIRY ROBINSON",
          "position": null,
          "cost": 3
        },
        {
          "player": "ROY HELU",
          "position": null,
          "cost": 8
        }
      ],
      "Tank": [
        {
          "player": "DREW BREES",
          "position": "QB",
          "cost": 42
        },
        {
          "player": "ALSHON JEFFERY",
          "position": "WR",
          "cost": 6
        },
        {
          "player": "PERCY HARVIN",
          "position": "WR",
          "cost": 7
        },
        {
          "player": "LESEAN MCCOY",
          "position": "RB",
          "cost": 69
        },
        {
          "player": "GIIOVANNIA BERNARD",
          "position": "RB",
          "cost": 18
        },
        {
          "player": "CIORDARRELE PATTERSON",
          "position": "W/R/T",
          "cost": 6
        },
        {
          "player": "ROB GRONKOWSKI",
          "position": "TE",
          "cost": 29
        },
        {
          "player": "JONATHON GRIMES",
          "position": "K",
          "cost": 2
        },
        {
          "player": "SEATTLE",
          "position": "DEF",
          "cost": 10
        },
        {
          "player": "KENDELL WRIGHT",
          "position": null,
          "cost": 6
        },
        {
          "player": "STEVE SMITH",
          "position": null,
          "cost": 7
        },
        {
          "player": "STEVEN RIDLEY",
          "position": null,
          "cost": 10
        },
        {
          "player": "SHONN GREENE",
          "position": null,
          "cost": 7
        },
        {
          "player": "KENNY BRITT",
          "position": null,
          "cost": 1
        },
        {
          "player": "AHMAD BRADSHAW",
          "position": null,
          "cost": 8
        }
      ],
      "Spencer H": [
        {
          "player": "TONY ROMO",
          "position": "QB",
          "cost": 5
        },
        {
          "player": "DEMARYIUS THOMAS",
          "position": "WR",
          "cost": 48
        },
        {
          "player": "PIERRE GARCON",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "BEN TATE",
          "position": "RB",
          "cost": 7
        },
        {
          "player": "RASHAD JENNINGS",
          "position": "RB",
          "cost": 29
        },
        {
          "player": "ANDRE ELLINGTON",
          "position": "W/R/T",
          "cost": 33
        },
        {
          "player": "JORDAN CAMERON",
          "position": "TE",
          "cost": 11
        },
        {
          "player": "JORDAN MATHEWS",
          "position": "K",
          "cost": 3
        },
        {
          "player": "SAINTS",
          "position": "DEF",
          "cost": 4
        },
        {
          "player": "TRENT RICHARDSON",
          "position": null,
          "cost": 17
        },
        {
          "player": "KNILE DAVIS",
          "position": null,
          "cost": 3
        },
        {
          "player": "PIERRE THOMAS",
          "position": null,
          "cost": 11
        },
        {
          "player": "KELVIN BENJAMIN",
          "position": null,
          "cost": 5
        },
        {
          "player": "DARREN SPROLES",
          "position": null,
          "cost": 15
        },
        {
          "player": "JUSTIN HUNTER",
          "position": null,
          "cost": 8
        }
      ],
      "Eric": [
        {
          "player": "PEYTON MANNING",
          "position": "QB",
          "cost": 48
        },
        {
          "player": "VINCENT JACKSON",
          "position": "WR",
          "cost": 22
        },
        {
          "player": "SAMMIE WATKINS",
          "position": "WR",
          "cost": 13
        },
        {
          "player": "ZAC STACY",
          "position": "RB",
          "cost": 6
        },
        {
          "player": "TOBY GERHART",
          "position": "RB",
          "cost": 6
        },
        {
          "player": "MICHAEL FLOYD",
          "position": "W/R/T",
          "cost": 11
        },
        {
          "player": "DENNIS PITTA",
          "position": "TE",
          "cost": 10
        },
        {
          "player": "DEVONTE FREEMAN",
          "position": "K",
          "cost": 5
        },
        {
          "player": "RAMS",
          "position": "DEF",
          "cost": 3
        },
        {
          "player": "FRED JACKSON",
          "position": null,
          "cost": 9
        },
        {
          "player": "JEREMY HILL",
          "position": null,
          "cost": 5
        },
        {
          "player": "RILEY COOPER",
          "position": null,
          "cost": 4
        },
        {
          "player": "DANNY AMENDOLA",
          "position": null,
          "cost": 7
        },
        {
          "player": "LEGARRETTE BLOUNT",
          "position": null,
          "cost": 1
        },
        {
          "player": "DWAHNE BOWE",
          "position": null,
          "cost": 4
        }
      ],
      "Scott": [
        {
          "player": "CAM NEWTON",
          "position": "QB",
          "cost": 13
        },
        {
          "player": "EMMANUEL SANDERS",
          "position": "WR",
          "cost": 12
        },
        {
          "player": "CALVIN JOHNSON",
          "position": "WR",
          "cost": 58
        },
        {
          "player": "RAY RICE",
          "position": "RB",
          "cost": 15
        },
        {
          "player": "RYAN MATTHEWS",
          "position": "RB",
          "cost": 20
        },
        {
          "player": "TORREY SMITH",
          "position": "W/R/T",
          "cost": 23
        },
        {
          "player": "GREG OLSEN",
          "position": "TE",
          "cost": 6
        },
        {
          "player": "MASON CROSBY",
          "position": "K",
          "cost": 3
        },
        {
          "player": "BRONCOS",
          "position": "DEF",
          "cost": 5
        },
        {
          "player": "SHANE VEREEN",
          "position": null,
          "cost": 15
        },
        {
          "player": "JULIAN EDELMAN",
          "position": null,
          "cost": 6
        },
        {
          "player": "JOIQUIE BELL",
          "position": null,
          "cost": 20
        },
        {
          "player": "BISHOP SANKEY",
          "position": null,
          "cost": 8
        },
        {
          "player": "MARQUES COLSTON",
          "position": null,
          "cost": 10
        },
        {
          "player": "JAY CUTLER",
          "position": null,
          "cost": 3
        }
      ],
      "Dallas": [
        {
          "player": "PHILLIP RIVERS",
          "position": "QB",
          "cost": 3
        },
        {
          "player": "KEENAN ALLEN",
          "position": "WR",
          "cost": 6
        },
        {
          "player": "BRANDON MARSHALL",
          "position": "WR",
          "cost": 44
        },
        {
          "player": "DOUG MARTIN",
          "position": "RB",
          "cost": 35
        },
        {
          "player": "FRANK GORE",
          "position": "RB",
          "cost": 23
        },
        {
          "player": "TY HILTON",
          "position": "W/R/T",
          "cost": 10
        },
        {
          "player": "VERNON DAVIS",
          "position": "TE",
          "cost": 20
        },
        {
          "player": "DAN BAILEU",
          "position": "K",
          "cost": 1
        },
        {
          "player": "BENGALS",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "LAMAR MILLER",
          "position": null,
          "cost": 13
        },
        {
          "player": "CECIL SHORTS",
          "position": null,
          "cost": 7
        },
        {
          "player": "TERRANCE WEST",
          "position": null,
          "cost": 3
        },
        {
          "player": "ALEX SMITH",
          "position": null,
          "cost": 1
        },
        {
          "player": "JACQUIXX RODGERS",
          "position": null,
          "cost": 1
        },
        {
          "player": "LANCE DUNBAR",
          "position": null,
          "cost": 3
        }
      ],
      "bradley": [
        {
          "player": "TOM BRADLEY",
          "position": "QB",
          "cost": 13
        },
        {
          "player": "DEZ BRYANT",
          "position": "WR",
          "cost": 50
        },
        {
          "player": "LARRY FITZGERALD",
          "position": "WR",
          "cost": 21
        },
        {
          "player": "MATT FORTE",
          "position": "RB",
          "cost": 69
        },
        {
          "player": "REGGIE BUSH",
          "position": "RB",
          "cost": 36
        },
        {
          "player": "JEREMY MACLIN",
          "position": "W/R/T",
          "cost": 16
        },
        {
          "player": "JORDAN REED",
          "position": "TE",
          "cost": 13
        },
        {
          "player": "PHIL DAWSON",
          "position": "K",
          "cost": 1
        },
        {
          "player": "CARDINALS",
          "position": "DEF",
          "cost": 2
        },
        {
          "player": "DEANGELO WILLIAMS",
          "position": null,
          "cost": 13
        },
        {
          "player": "DARREN MCFADDEN",
          "position": null,
          "cost": 1
        },
        {
          "player": "CHRIS IVORY",
          "position": null,
          "cost": 3
        },
        {
          "player": "DOUG BALDWIN",
          "position": null,
          "cost": 1
        },
        {
          "player": "CJ ANDERSON",
          "position": null,
          "cost": 2
        },
        {
          "player": "JAMES JONES",
          "position": null,
          "cost": 1
        }
      ],
      "Kirk": [
        {
          "player": "NICK FOLES",
          "position": "QB",
          "cost": 22
        },
        {
          "player": "MIKE EVANS",
          "position": "WR",
          "cost": 11
        },
        {
          "player": "ERIC DECKER",
          "position": "WR",
          "cost": 7
        },
        {
          "player": "LE'VEON BELL",
          "position": "RB",
          "cost": 8
        },
        {
          "player": "JAMAAL CHARLES",
          "position": "RB",
          "cost": 70
        },
        {
          "player": "CHRIS JOHNSON",
          "position": "W/R/T",
          "cost": 33
        },
        {
          "player": "JULIUS THOMAS",
          "position": "TE",
          "cost": 32
        },
        {
          "player": "JUSTIN TUCKER",
          "position": "K",
          "cost": 1
        },
        {
          "player": "BROWNS",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "CHARLES CLAY",
          "position": null,
          "cost": 2
        },
        {
          "player": "MIKE WALLACE",
          "position": null,
          "cost": 8
        },
        {
          "player": "CARLOS HYDE",
          "position": null,
          "cost": 12
        },
        {
          "player": "TERRANCE WILLIAMS",
          "position": null,
          "cost": 4
        },
        {
          "player": "ANDRE WILLIMAS",
          "position": null,
          "cost": 3
        },
        {
          "player": "JAMES STARKS",
          "position": null,
          "cost": 2
        }
      ],
      "aric": [
        {
          "player": "ANDREW LUCK",
          "position": "QB",
          "cost": 21
        },
        {
          "player": "AJ GREEN",
          "position": "WR",
          "cost": 49
        },
        {
          "player": "DENARIUS MOORE",
          "position": "WR",
          "cost": 1
        },
        {
          "player": "MARSHAWN LYNCH",
          "position": "RB",
          "cost": 60
        },
        {
          "player": "MJD",
          "position": "RB",
          "cost": 18
        },
        {
          "player": "DEANTHONY THOMAS",
          "position": "W/R/T",
          "cost": 1
        },
        {
          "player": "JIMMY GRAHAM",
          "position": "TE",
          "cost": 55
        },
        {
          "player": "ADAM VINATERI",
          "position": "K",
          "cost": 1
        },
        {
          "player": "TEXANS",
          "position": "DEF",
          "cost": 1
        },
        {
          "player": "MARTELLUS BENNETT",
          "position": null,
          "cost": 1
        },
        {
          "player": "MIKE WILLIAMS",
          "position": null,
          "cost": 1
        },
        {
          "player": "BRANON COOKS",
          "position": null,
          "cost": 17
        },
        {
          "player": "HAKEEM NICKS",
          "position": null,
          "cost": 1
        },
        {
          "player": "ANDY DALTON",
          "position": null,
          "cost": 1
        },
        {
          "player": "ROBERT TURBIN",
          "position": null,
          "cost": 1
        }
      ]
    }
  }
};

function normalizeForMatch(name) {
  return (name || '').toLowerCase().replace(/[^a-z]/g, '');
}

function getLastName(name) {
  const parts = (name || '').trim().split(/\s+/);
  return parts[parts.length - 1].toLowerCase().replace(/[^a-z]/g, '');
}

async function backfillDraftValues() {
  console.log('Starting draft value backfill for Bro Montana Bowl...');
  
  let totalUpdated = 0;
  let totalPicksPatched = 0;

  for (const [yearStr, yearData] of Object.entries(DRAFT_DATA)) {
    const year = parseInt(yearStr);
    
    // Get all HistoricalSeason records for this year
    const seasons = await prisma.historicalSeason.findMany({
      where: { leagueId: LEAGUE_ID, year: year }
    });
    
    if (!seasons.length) {
      console.log(`  ${year}: No historical seasons found, skipping`);
      continue;
    }
    
    let yearPatched = 0;
    
    for (const hs of seasons) {
      const ownerName = hs.ownerName;
      
      // Find this owner's picks from our Google Sheet data
      const sheetPicks = yearData.picks[ownerName];
      if (!sheetPicks || sheetPicks.length === 0) {
        // Try case-insensitive match
        const matchKey = Object.keys(yearData.picks).find(k => k.toLowerCase() === ownerName.toLowerCase());
        if (!matchKey) continue;
      }
      const ownerSheetPicks = sheetPicks || yearData.picks[Object.keys(yearData.picks).find(k => k.toLowerCase() === ownerName.toLowerCase())];
      if (!ownerSheetPicks) continue;
      
      const ownerBudget = yearData.budgets?.[ownerName] || null;
      
      // Parse existing draftData — it's { type, picks: [...] } structure
      let draftObj = hs.draftData;
      if (!draftObj) {
        // No existing draft data — create fresh
        draftObj = {
          type: 'auction',
          picks: ownerSheetPicks.map((p, idx) => ({
            playerName: p.player,
            position: p.position || 'BN',
            cost: p.cost,
            round: idx + 1,
            pick: idx + 1,
            isKeeper: false,
            ownerName: ownerName
          }))
        };
        if (ownerBudget) draftObj.startingBudget = ownerBudget;
        
        await prisma.historicalSeason.update({
          where: { id: hs.id },
          data: { draftData: draftObj }
        });
        yearPatched += ownerSheetPicks.length;
        continue;
      }
      
      // Get the picks array from the object
      let picks = Array.isArray(draftObj) ? draftObj : (draftObj.picks || []);
      
      // Filter to only this owner's picks in the vault
      const ownerPicks = picks.filter(p => (p.ownerName || '').toLowerCase() === ownerName.toLowerCase());
      
      if (ownerPicks.length === 0) {
        // No picks for this owner in the existing data — unusual but possible
        continue;
      }
      
      // Build lookup from sheet picks by last name
      const sheetByLastName = {};
      const sheetByFullNorm = {};
      for (const sp of ownerSheetPicks) {
        const lastName = getLastName(sp.player);
        const fullNorm = normalizeForMatch(sp.player);
        if (!sheetByLastName[lastName]) sheetByLastName[lastName] = [];
        sheetByLastName[lastName].push(sp);
        sheetByFullNorm[fullNorm] = sp;
      }
      
      let patchCount = 0;
      const usedSheetPicks = new Set();
      
      for (const pick of ownerPicks) {
        const pickFullNorm = normalizeForMatch(pick.playerName);
        const pickLastName = getLastName(pick.playerName);
        
        // Try full name match first
        let matched = sheetByFullNorm[pickFullNorm];
        
        // Try last name match
        if (!matched && sheetByLastName[pickLastName]) {
          const candidates = sheetByLastName[pickLastName].filter(sp => !usedSheetPicks.has(sp));
          if (candidates.length === 1) {
            matched = candidates[0];
          } else if (candidates.length > 1) {
            // Multiple matches by last name — try first initial
            const pickFirstChar = (pick.playerName || '')[0]?.toLowerCase();
            matched = candidates.find(sp => sp.player[0]?.toLowerCase() === pickFirstChar) || candidates[0];
          }
        }
        
        if (matched && matched.cost != null) {
          pick.cost = matched.cost;
          usedSheetPicks.add(matched);
          patchCount++;
        }
      }
      
      // Also update budget on the draft object
      if (ownerBudget) {
        if (Array.isArray(draftObj)) {
          // Shouldn't happen but handle it
        } else {
          draftObj.startingBudget = ownerBudget;
        }
      }
      
      // Write back
      if (patchCount > 0) {
        await prisma.historicalSeason.update({
          where: { id: hs.id },
          data: { draftData: draftObj }
        });
        yearPatched += patchCount;
      }
    }
    
    totalPicksPatched += yearPatched;
    console.log(`  ${year}: Patched ${yearPatched} pick costs`);
  }
  
  console.log(`\nDone! Patched ${totalPicksPatched} pick costs across ${Object.keys(DRAFT_DATA).length} years.`);
}

backfillDraftValues()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

// Common US first names for auto-detection in owner assignment wizard
// Sources: US Census Bureau, SSA popular baby names (top 500)
// Used to suggest which imported team names might be real people

export const COMMON_FIRST_NAMES = new Set([
  // Male names
  'james', 'john', 'robert', 'michael', 'david', 'william', 'richard', 'joseph',
  'thomas', 'charles', 'christopher', 'daniel', 'matthew', 'anthony', 'mark',
  'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth', 'kevin',
  'brian', 'george', 'timothy', 'ronald', 'edward', 'jason', 'jeffrey',
  'ryan', 'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen',
  'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 'raymond',
  'gregory', 'frank', 'alexander', 'patrick', 'jack', 'dennis', 'jerry',
  'tyler', 'aaron', 'jose', 'nathan', 'henry', 'douglas', 'peter',
  'zachary', 'kyle', 'noah', 'ethan', 'jeremy', 'walter', 'christian',
  'keith', 'roger', 'terry', 'austin', 'sean', 'gerald', 'carl',
  'harold', 'dylan', 'arthur', 'lawrence', 'jordan', 'jesse', 'bryan',
  'billy', 'bruce', 'gabriel', 'joe', 'logan', 'albert', 'willie',
  'alan', 'eugene', 'russell', 'vincent', 'philip', 'bobby', 'johnny',
  'bradley', 'roy', 'ralph', 'eugene', 'randy', 'wayne', 'adam',
  'harry', 'vincent', 'russell', 'louis', 'clarence', 'philip', 'bobby',
  'howard', 'fred', 'martin', 'danny', 'dale', 'travis', 'todd',
  'mike', 'matt', 'chris', 'nick', 'tom', 'dan', 'dave', 'steve',
  'bob', 'bill', 'jim', 'tim', 'jeff', 'joe', 'ben', 'sam', 'rob',
  'tony', 'greg', 'derek', 'chad', 'dustin', 'chase', 'cody',
  'cameron', 'caleb', 'connor', 'cole', 'mason', 'hunter', 'blake',
  'gavin', 'tristan', 'colton', 'wyatt', 'liam', 'carter', 'owen',
  'luke', 'landon', 'jackson', 'aiden', 'lucas', 'jayden', 'elijah',
  'oliver', 'grayson', 'parker', 'cooper', 'nolan', 'brayden', 'carson',
  'lincoln', 'hudson', 'easton', 'jaxon', 'dominic', 'xavier', 'bryce',
  'marcus', 'malik', 'darius', 'andre', 'devin', 'trevor', 'shane',
  'lance', 'seth', 'grant', 'drew', 'spencer', 'reed', 'tanner',
  'wade', 'brady', 'brock', 'brett', 'jarrett', 'corey', 'dakota',
  'collin', 'garrett', 'mitchell', 'kirk', 'clay', 'clark', 'dean',
  'neil', 'kurt', 'nate', 'zach', 'jake', 'max', 'leo', 'ian',
  'alex', 'will', 'josh', 'jon', 'brad', 'ted', 'ray', 'troy',
  // Female names
  'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan',
  'jessica', 'sarah', 'karen', 'lisa', 'nancy', 'betty', 'margaret',
  'sandra', 'ashley', 'dorothy', 'kimberly', 'emily', 'donna', 'michelle',
  'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon',
  'laura', 'cynthia', 'kathleen', 'amy', 'angela', 'shirley', 'anna',
  'brenda', 'pamela', 'emma', 'nicole', 'helen', 'samantha', 'katherine',
  'christine', 'debra', 'rachel', 'carolyn', 'janet', 'catherine', 'maria',
  'heather', 'diane', 'ruth', 'julie', 'olivia', 'joyce', 'virginia',
  'victoria', 'kelly', 'lauren', 'christina', 'joan', 'evelyn', 'judith',
  'megan', 'andrea', 'cheryl', 'hannah', 'jacqueline', 'martha', 'gloria',
  'teresa', 'ann', 'sara', 'madison', 'frances', 'kathryn', 'janice',
  'jean', 'abigail', 'alice', 'judy', 'sophia', 'grace', 'denise',
  'amber', 'doris', 'marilyn', 'danielle', 'beverly', 'isabella', 'theresa',
  'diana', 'natalie', 'brittany', 'charlotte', 'marie', 'kayla', 'alexis',
  'lori', 'marie', 'crystal', 'tiffany', 'brooke', 'holly', 'morgan',
  'savannah', 'paige', 'taylor', 'jordan', 'sydney', 'mackenzie', 'riley',
  'allison', 'haley', 'gabriella', 'bailey', 'chloe', 'lily', 'leah',
  'kate', 'kim', 'jen', 'jess', 'meg', 'steph', 'becky', 'beth',
  'sue', 'deb', 'val', 'tina', 'gina', 'dana', 'robin', 'wendy',
  'lynn', 'joy', 'misty', 'ivy', 'hope', 'faith', 'penny', 'dawn',
])

// Owner color palette for assignment UI
export const OWNER_COLORS = [
  '#D4A853', '#6BCB77', '#4D96FF', '#FF6B6B', '#C084FC',
  '#FF9F43', '#54A0FF', '#EE5A6F', '#01CBC6', '#F368E0',
  '#FF6348', '#7BED9F', '#70A1FF', '#FFA502', '#A29BFE',
]

// Detect which rawNames might be real person names
// Returns array of { name, matchedWord, seasons } objects
export function detectNames(rawNames, nameToYears = {}) {
  const results = []
  for (const name of rawNames) {
    const words = name.trim().split(/[\s_.\-@]+/)
    const matched = words.find(w => COMMON_FIRST_NAMES.has(w.toLowerCase()))
    if (matched) {
      results.push({
        name,
        matchedWord: matched,
        seasons: nameToYears[name] || [],
      })
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name))
}

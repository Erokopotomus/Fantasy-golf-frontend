/**
 * Seed course images — assigns Unsplash landscape photos to all 44 PGA Tour courses.
 *
 * Usage:
 *   DATABASE_URL="$RAILWAY_URL" node prisma/seedCourseImages.js
 *   (or just: node prisma/seedCourseImages.js  — if .env has DATABASE_URL)
 *
 * Photos are matched by course character: coastal courses get ocean shots,
 * southern courses get palm trees, northern/classic courses get tree-lined aerials, etc.
 * All images served from Unsplash CDN at 800x400 crop.
 */

const prisma = require('../src/lib/prisma.js')

const IMG = (base) => `${base}?w=800&h=400&fit=crop&auto=format&q=80`

// Photo pool organized by vibe
const photos = {
  // Coastal / ocean views
  pebble:     IMG('https://images.unsplash.com/photo-1561066030-f096e3ba23dd'),   // Pebble Beach cliff ocean
  coastal2:   IMG('https://images.unsplash.com/photo-1692931460164-f71ed1101ecf'),  // Ocean golf view
  coastal3:   IMG('https://images.unsplash.com/photo-1672825952732-ecef34882416'),  // West Cliffs Portugal ocean
  coastal4:   IMG('https://images.unsplash.com/photo-1757671297066-9f9d17d468cb'),  // Norfolk Island ocean course
  coastal5:   IMG('https://images.unsplash.com/photo-1459548069978-7c1e521d3d22'),  // Bird's eye UK coastal

  // Palm trees / tropical / southern
  tropical1:  IMG('https://images.unsplash.com/photo-1701020832735-20db45473441'),  // Palm trees + lake
  tropical2:  IMG('https://images.unsplash.com/photo-1704480327798-49fc80d336bd'),  // Hawaii/Mauna Lani palms
  tropical3:  IMG('https://images.unsplash.com/photo-1499424780482-d1f9f0d925cc'),  // Gold Coast Australia lush

  // Aerial / drone overhead
  aerial1:    IMG('https://images.unsplash.com/photo-1742498626135-67a7d3501eff'),  // PGA National (already used)
  aerial2:    IMG('https://images.unsplash.com/photo-1685926705423-6c1bbccbab34'),  // Austin TX lake aerial
  aerial3:    IMG('https://images.unsplash.com/photo-1700667315345-e0c51587b2fd'),  // Shanty Creek Michigan trees
  aerial4:    IMG('https://images.unsplash.com/photo-1522859232762-5c42047b6675'),  // Large courses + ponds
  aerial5:    IMG('https://images.unsplash.com/photo-1566698629409-787a68fc5724'),  // Italy sunset aerial
  aerial6:    IMG('https://images.unsplash.com/photo-1671798436323-b2b48e7e6c47'),  // Kragero Resort Norway
  aerial7:    IMG('https://images.unsplash.com/photo-1689592607829-43321b3fcc55'),  // Green aerial
  aerial8:    IMG('https://images.unsplash.com/photo-1671798436326-4c38e89598c0'),  // Trees aerial
  aerial9:    IMG('https://images.unsplash.com/photo-1532662362004-da35ea753120'),  // Course with trees
  aerial10:   IMG('https://images.unsplash.com/photo-1638662293033-7834e41473ae'),  // City course aerial

  // Tree-lined / classic eastern
  classic1:   IMG('https://images.unsplash.com/photo-1698001325881-5ea1886635e5'),  // Fall leaves maple
  classic2:   IMG('https://images.unsplash.com/photo-1699394426296-9c549c27fcaf'),  // Danville CA trees
  classic3:   IMG('https://images.unsplash.com/photo-1695418423426-b1e647262e73'),  // Presidio SF green
  classic4:   IMG('https://images.unsplash.com/photo-1516705416642-fa4f130a0bb3'),  // Summer greenery
  classic5:   IMG('https://images.unsplash.com/photo-1544733274-e33e953ceb9e'),     // UK green course
  classic6:   IMG('https://images.unsplash.com/photo-1761978503733-54eba581cad4'),  // Lush green blue sky

  // Sunset / golden hour
  sunset1:    IMG('https://images.unsplash.com/photo-1486754735734-325b5831c3ad'),  // Pine fairway sunset
  sunset2:    IMG('https://images.unsplash.com/photo-1693572709450-8c1be5b360c4'),  // Course at sunset
  sunset3:    IMG('https://images.unsplash.com/photo-1743185836009-848e5035422b'),  // Escondido sunset

  // Lake / water features
  lake1:      IMG('https://images.unsplash.com/photo-1735848250329-8bfa233e8f3f'),  // University Place lake
  lake2:      IMG('https://images.unsplash.com/photo-1674884070794-b61d85f9adf8'),  // Scenic lake bg
  lake3:      IMG('https://images.unsplash.com/photo-1529514034604-3cf028e773ed'),  // Water surrounded
  lake4:      IMG('https://images.unsplash.com/photo-1641249300414-7a4f01709382'),  // Course in water drone

  // Desert / mountain
  desert1:    IMG('https://images.unsplash.com/photo-1694636507260-8b2428e3b738'),  // Tucson AZ desert
  mountain1:  IMG('https://images.unsplash.com/photo-1694720971856-a5fb5da97173'),  // Sun Valley mountains
  mountain2:  IMG('https://images.unsplash.com/photo-1685880841774-d3cd18c3207a'),  // Czech mountains
  mountain3:  IMG('https://images.unsplash.com/photo-1511022406504-605119708377'),  // Windermere UK mountains

  // Atmospheric / bunkers
  foggy:      IMG('https://images.unsplash.com/photo-1725835567442-7f39d9199f8c'),  // Foggy course
  bunker1:    IMG('https://images.unsplash.com/photo-1698426002572-01af3df03c13'),  // Sand trap foreground
  bunker2:    IMG('https://images.unsplash.com/photo-1643813615358-a457f4cc294f'),  // Torrey Pines sand trap
  scenic1:    IMG('https://images.unsplash.com/photo-1698169206079-7b46e8377df4'),  // Course from distance
  scenic2:    IMG('https://images.unsplash.com/photo-1677477009126-aad941137d86'),  // Green scenic
  waterfall:  IMG('https://images.unsplash.com/photo-1665961249026-41261c537184'),  // Waterfall course
  green1:     IMG('https://images.unsplash.com/photo-1617332763121-0106f3dd4935'),  // Near water daytime
  hawaii:     IMG('https://images.unsplash.com/photo-1683169285928-eb93b0169793'),  // Waimea Hawaii ocean
}

// Map each course to the most fitting photo
const courseImages = {
  // --- Coastal / Links ---
  'Pebble Beach Golf Links':                        photos.pebble,     // Actual Pebble Beach area
  'Harbour Town Golf Links':                         photos.coastal2,   // SC island course
  'Royal Liverpool Golf Club':                       photos.coastal5,   // UK links
  'Royal Troon Golf Club':                           photos.classic5,   // Scottish links
  'Shinnecock Hills Golf Club':                      photos.coastal3,   // Long Island coast
  'Monterey Peninsula Country Club (Shore Course)':  photos.coastal4,   // Monterey coast

  // --- Hawaii / Tropical ---
  'Plantation Course at Kapalua':                    photos.hawaii,     // Hawaiian ocean course
  'Waialae Country Club':                            photos.tropical2,  // Honolulu palms

  // --- Florida / Southeast / Palms ---
  'PGA National Resort (The Champion Course)':       photos.aerial1,    // Already assigned
  'Bay Hill Club & Lodge':                           photos.tropical1,  // Orlando palms + lake
  'Copperhead Course at Innisbrook':                 photos.lake1,      // Palm Harbor water
  'TPC Sawgrass (Stadium Course)':                   photos.lake4,      // Famous island green / water
  'East Lake Golf Club':                             photos.sunset1,    // Atlanta classic pine
  'Congaree Golf Club':                              photos.green1,     // SC lowcountry
  'Sedgefield Country Club':                         photos.classic2,   // NC trees

  // --- Desert / Southwest ---
  'TPC Scottsdale (Stadium Course)':                 photos.desert1,    // Tucson/AZ desert
  'Torrey Pines Golf Course (South)':                photos.bunker2,    // Actual Torrey Pines
  'Torrey Pines Golf Course (North)':                photos.scenic1,    // La Jolla
  'TPC San Antonio (Oaks Course)':                   photos.sunset3,    // TX scenic
  'TPC Summerlin':                                   photos.sunset2,    // Vegas sunset

  // --- Mountain / Pacific ---
  'Spyglass Hill Golf Course':                       photos.foggy,      // Monterey fog
  'Riviera Country Club':                            photos.classic3,   // LA prestige green
  'TPC Harding Park':                                photos.mountain2,  // SF area
  'Silverado Resort (North Course)':                 photos.lake2,      // Napa wine country scenic

  // --- Classic Eastern / Tree-lined ---
  'Augusta National Golf Club':                      photos.aerial5,    // Georgia pines / prestige
  'Bethpage State Park (Black Course)':              photos.aerial9,    // NY public course trees
  'Oakmont Country Club':                            photos.bunker1,    // PA bunker heavy
  'Pinehurst Resort & Country Club (No. 2)':         photos.aerial4,    // NC sandhills aerial
  'Winged Foot Golf Club (West)':                    photos.classic1,   // NY fall classic
  'Quail Hollow Club':                               photos.aerial3,    // Charlotte trees
  'Valhalla Golf Club':                              photos.aerial6,    // Louisville green
  'Aronimink Golf Club':                             photos.classic4,   // PA classic
  'Southern Hills Country Club':                     photos.classic6,   // Tulsa traditional
  'Muirfield Village Golf Club':                     photos.aerial8,    // Ohio Jack Nicklaus
  'Colonial Country Club':                           photos.sunset1,    // Fort Worth classic (reuse)

  // --- Midwest / Northern ---
  'TPC Twin Cities':                                 photos.aerial7,    // Minnesota green
  'TPC Deere Run':                                   photos.lake3,      // Illinois water
  'Olympia Fields Country Club (North)':             photos.scenic2,    // Chicago area
  'Detroit Golf Club':                               photos.classic1,   // Michigan trees (reuse ok - fall vibe)
  'Castle Pines Golf Club':                          photos.mountain1,  // Colorado mountains
  'TPC River Highlands':                             photos.aerial2,    // Connecticut river
  'Caves Valley Golf Club':                          photos.aerial10,   // Maryland
  'TPC Craig Ranch':                                 photos.lake2,      // Dallas area (reuse ok)
  'TPC Southwind':                                   photos.tropical3,  // Memphis lush
}

async function seed() {
  let updated = 0
  let skipped = 0

  for (const [name, imageUrl] of Object.entries(courseImages)) {
    const course = await prisma.course.findFirst({ where: { name } })
    if (!course) {
      console.log(`  SKIP: "${name}" not found in DB`)
      skipped++
      continue
    }

    await prisma.course.update({
      where: { id: course.id },
      data: { imageUrl },
    })
    console.log(`  ✓ ${name}`)
    updated++
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`)
}

seed()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

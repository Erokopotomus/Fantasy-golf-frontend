// Side-effect requires: each extractor module calls registerExtractor at
// load time. Importing this index registers all 19 characteristics with
// the orchestrator. Add new extractor files here as they ship.

require('./extractors/pickQuality')
require('./extractors/positional')
require('./extractors/auction')
require('./extractors/trade')
require('./extractors/waiver')
require('./extractors/drop')
require('./extractors/outcome')

const { runForUser, EXTRACTORS } = require('./extractor')

module.exports = { runForUser, EXTRACTORS }

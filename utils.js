const utils                     = require('lexitjs/utils')
const {fs}                      = utils
const {os}                      = utils
const current_path              = (sub=null)=>__dirname+(sub?(sub.startsWith('/') ? "" : "/")+sub:"")
const read_json                 = (filepath)=>JSON.parse(fs.readFileSync(filepath))
const assets_path               = (sub=null)=>current_path('assets')+(sub?(sub.startsWith('/') ? "" : "/")+sub:"")



const    expressions            = read_json(assets_path('expressions.json'))
const    statements             = read_json(assets_path('statements.json'))
const    operators_predececense = read_json(assets_path('operators_predececense.json'))


utils.helpers.statements = statements
utils.helpers.expressions = expressions
utils.helpers.operators_predececense = operators_predececense
module.exports                  = utils
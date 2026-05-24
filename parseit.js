#!/usr/bin/env node
process.argv.splice(0,2)
const lexit = require('lexitjs')
const { fs,helpers } = require('./utils')
const lexer = new lexit.LexIt()
const args  = process.argv
const name  = __filename 
// console.info('read helpers')
const literal_expression = helpers.expressions.filter(
        expression_ref=>{
            if(expression_ref.type.toLowerCase('literal'))
            {
                return (expression_ref.from_tokens)
            }
        }
    )[0]
const literals = helpers.expressions.filter(
        expression_ref=>{
            if(expression_ref.type.toLowerCase('literal'))
            {
                return (expression_ref.from_tokens)
            }
        }
    ).map(expression_ref=>expression_ref.from_tokens.map(ft=>ft.toLowerCase()))[0]
const groups = helpers.expressions.filter(
    expression_ref=>{
        if(expression_ref.hasOwnProperty('start') && expression_ref.hasOwnProperty('end'))
        {
            return (expression_ref)
        }
    }
)
function process_token(token_list,pos){
    const previous_pos      = pos-1
    const next_pos          = pos+1
    const token             = token_list.length>pos ? token_list[pos] : null
    const previous          = token_list.length>previous_pos ? token_list[previous_pos] : null
    const next              = token_list.length>next_pos ? token_list[next_pos] : null    
    const [type,value]      =   token
    const is_operator       =   helpers.operators.hasOwnProperty(value)
    const operator          =   is_operator ? helpers.operators[value] : null
    const is_litteral       =   literals.includes(type)
    console.info(groups,value)
    const is_group          =   groups.find(group=>group.start===value)
    console.info('is_group => ',is_group)
    if(is_operator){
        const   matching_expressions    = helpers.expressions.filter(expression_ref=>expression_ref.hasOwnProperty('operators') && expression_ref.operators.includes(value))
        let     matched                 = null
        if(matching_expressions.length)
        {
            matching_expressions.map(expression_ref=>{
                if(expression_ref.associativity)
                {
                    if(expression_ref.associativity == 'left')
                    {
                        if(previous_pos>=0)
                        {
                            matched = {...expression_ref,left:previous,idx:previous_pos,operator,value}
                        }
                    }
                }
            })
        }
        token[2] = matched
    }
    else
    {
        if(is_litteral)
        {
            token[2]                 = {...literal_expression,idx:pos,value,operator}
        }
    }
    pos++
    return {token,pos,operator,value}
}
function ast_parse(dataset)
{
    const ast                   = []
    let current_pos             = 0
    const token_set_size        = dataset.length
    while(current_pos < token_set_size)
    {
        const current_token         = dataset[current_pos]
        const {token,pos,operator}           = current_token
        if(token.length <2)
        {
            console.info(' incorrect token configuration ',token)
            break
        }
        const params                = token.length > 1 ? token[2] : {}
        const type                  = params ? params.type : ''
        if(type.toLowerCase() != 'literal')
        {
            if(params.type == 'BINARY_EXPRESSION')   
            {
                let left    = params.left 
                let right   = (dataset.length > current_pos+1) ? dataset[current_pos+1].token : null
                const node = {
                    type:params.type,
                    operator:params.operator,
                    value:params.value,
                    left,
                    right
                }
                ast.push(node)
            }
        }
        current_pos++
    }
    return ast
}
const clean_token   =   [] 
if(args.length)
{
    const dataset       =   {}
    args.map(file=>{
        file_data = fs.readFileSync(file).toString()
        file_tokens = []
        if(file_data)
        {
            file_tokens = lexer.tokenize(file_data) 
        }
        dataset[file] = {file_data,file_tokens}
    })
    console.info(dataset['math.mb'].file_tokens)
    Object.keys(dataset).map(
        set_name=>{
            const set = dataset[set_name]
            if(set.file_tokens)
            {
                let idx = 0
                while(idx < set.file_tokens.length)    
                {
                    const {token,pos} = process_token(set.file_tokens,idx)
                    idx = pos
                    clean_token.push({token,pos})
                }
            }
        }
    )
}
console.info(clean_token)
const ast_tree = ast_parse(clean_token)
console.info(ast_tree)
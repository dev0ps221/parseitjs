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
                        expression_ref.left = previous
                        if(previous_pos>=0)
                        {
                            matched = expression_ref
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
            literal_expression.value = value
            token[2]                 = literal_expression
        }
    }
    pos++
    return {token,pos}
}

if(args.length)
{
    const dataset = {}
    args.map(file=>{
        file_data = fs.readFileSync(file).toString()
        file_tokens = []
        if(file_data)
        {
            file_tokens = lexer.tokenize(file_data) 
        }
        dataset[file] = {file_data,file_tokens}
    })
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
                    console.info(token,pos)
                }
            }
        }
    )
    // console.info(dataset['code.mb'])
}

// console.info(lexer.tokenize('let var_a'))
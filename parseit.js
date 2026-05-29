#!/usr/bin/env node
process.argv.splice(0,2)
const lexit = require('lexitjs')
const { fs,helpers } = require('./utils')
const {operators_predececense} = helpers
const lexer = new lexit.LexIt()
const args  = process.argv
const name  = __filename 
const literal_expression = helpers.expressions.filter(
        expression_ref=>{
            if(expression_ref.type.toLowerCase()=='literal')
            {
                return (expression_ref.from_tokens)
            }
        }
    )[0]
const literals = helpers.expressions.filter(
        expression_ref=>{
            if(expression_ref.type.toLowerCase()=='literal')
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
    const operator_sign     =   operator ? value : null
    const is_litteral       =   literals.includes(type)
    const is_group          =   groups.find(group=>group.start===value)
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
                            matched = {...expression_ref,left:previous[2],idx:previous_pos,operator,operator_sign,value}
                        }
                    }
                }
            })
        }
        matched.operator_sign = operator_sign
        token[2] = matched
    }
    else
    {
        if(is_litteral)
        {
            token[2]                 = {...literal_expression,idx:pos,value,operator,operator_sign}
        }
        if(is_group)
        {
            let current_group = is_group
            let cursor      =   pos + 1
            let token_set   =   []    
            let test_token              = token_list[cursor]
            let type                    = test_token[0]
            let test_token_value        = test_token[1]
            let token_count =   0 
            let matched_end =   (test_token == current_group.end)
            test_token.operator_sign = operator_sign
            while((token_list.length > cursor) && (test_token_value != current_group.end))
            {
                token_set.push(test_token)
                cursor++
                if(token_list.length>cursor)
                {
                    test_token              = token_list[cursor]
                    type                    = test_token[0]
                    test_token_value        = test_token[1]
                }
                else
                {
                    break   
                }
                if(test_token == current_group.end)
                {
                    matched_end = true
                }
            }
            let tokens = []
            token_set.forEach((token_ref,idx)=>{
                const {token,pos} = process_token(token_set,idx)
                idx = pos
                tokens.push({token,pos})
            })
            token[2] = {...current_group,elements:ast_parse(tokens)}
            pos+=token_set.length
        }
    }
    pos++
    return {token,pos,operator,operator_sign,value}
}
function ast_parse(dataset)
{
    const ast                   = []
    let current_pos             = 0
    const token_set_size        = dataset.length
    while(current_pos < token_set_size)
    {
        let     node                    =   null
        const   current_token           =   dataset[current_pos]
        const   {token,pos,operator,operator_sign}    =   current_token
        const   previous                =    ((dataset.length > (current_pos-1)) && (dataset[current_pos-1] && dataset[current_pos-1].token) && (dataset[current_pos-1].token.length>1)) ? dataset[current_pos-1].token[2] : null
        const   next                    =    ((dataset.length > (current_pos+1)) && (dataset[current_pos+1] && dataset[current_pos+1].token) && (dataset[current_pos+1].token.length>1)) ? dataset[current_pos+1].token[2] : null
        if(token.length <2)
        {
            console.info(' incorrect token configuration ',token)
            break
        }
        const params                = token.length > 1 ? token[2] : {}
        const type                  = params ? params.type : ''
        if(type.toLowerCase() != 'literal')
        {
            if(type == 'BINARY_EXPRESSION')   
            {
                let left    = params.left 
                let right   = (dataset.length > current_pos+1) ? dataset[current_pos+1].token[2] : null
                node = {
                    type,
                    operator:params.operator,
                    operator_sign:params.operator_sign,
                    value:params.value,
                    left,
                    idx:current_pos,
                    previous,
                    next,
                    right
                }
            }
        }
        else
        {
            node = {
                type,
                operator:params.operator,
                operator_sign:params.operator_sign,
                value:params.value,
                previous,
                next,
                idx:current_pos,
            }
        }
        if(node)
        {
            let append = true
            if(previous)
            {
                if(previous.type == 'BINARY_EXPRESSION')
                {
                    if(node.type != 'BINARY_EXPRESSION' || (operators_predececense[previous.operator_sign] > operators_predececense[node.operator_sign]) )
                    {
                        previous.right  =   node
                        append          =   false 
                    }
                    else
                    {
                        node.left       = previous
                    }
                }   
                else
                {
                    if(node.type == 'BINARY_EXPRESSION')
                    {
                        node.left = previous
                    }
                }
            }
            if(next)
            {
                if(next.type =='BINARY_EXPRESSION')
                {
                    if(node.type != 'BINARY_EXPRESSION')
                    {
                        next.left = node
                        append    = false
                        if(previous && previous.type == 'BINARY_EXPRESSION')
                        {
                            if(operators_predececense[previous.operator_sign] > operators_predececense[next.operator_sign])
                            {
                                previous.right  = node
                            }
                            else
                            {
                                node.left       = previous
                            }
                        }
                    }
                    // if()
                    // 
                }
            }
            if(append)
            {
                ast.push(node)
            }
        }
        current_pos++
    }
    const clean_ast = binary_factor(ast)
    return clean_ast
}
function binary_factor(ast)
{
    const clean_ast = []
    const clean_ref = {}
    ast.map((leaf,idx)=>{
        const   previous_idx    = idx > 0                   ? (idx - 1)             : null 
        const   next_idx        = (ast.length > (idx + 1))  ? (idx + 1)             : null 
        const   previous_leaf_idx   = clean_ref.hasOwnProperty(previous_idx) ? clean_ref[previous_idx] : null
        const   next_leaf_idx   = clean_ref.hasOwnProperty(next_idx) ? clean_ref[next_idx] : null
        const   previous        = previous_idx              ? ast[previous_idx]     : null
        const   next            = next_idx                  ? ast[next_idx]         : null
        let     append          = false 
        const   ignore          = leaf.ignore || leaf.type!= 'BINARY_EXPRESSION'
        if(!ignore)
        {
            if(previous)
            {
                if(previous.type == 'BINARY_EXPRESSION')
                {
                    if(leaf.type == 'BINARY_EXPRESSION')
                    {
                        if((previous.right))
                        {
                            if(leaf.left && ((previous.right.idx == leaf.left.idx) || (previous.right.idx == leaf.idx) ))
                            {
                                if(operators_predececense[leaf.operator_sign] < operators_predececense[previous.operator_sign])
                                {
                                    if(previous_leaf_idx)
                                    {
                                        clean_ast[previous_leaf_idx].right = leaf
                                    }
                                    append                              = false
                                }
                            }
                            else   
                            {   
                                if(previous_leaf_idx)
                                {
                                    clean_ast[previous_leaf_idx]        =   clean_ast[previous_leaf_idx]
                                    append                              = false
                                }
                            }
                        }
                    }
                }
                else
                {
                    if(previous_leaf_idx)
                    {
                        leaf.left                           =   clean_ast[previous_leaf_idx]
                        clean_ast[previous_leaf_idx].right  =   leaf
                        append = true
                    }
                }
            }
            if(next)
            {

                if(next.type == 'BINARY_EXPRESSION')
                {
                    if(leaf.type == 'BINARY_EXPRESSION')
                    {
                        if((next.left))
                        {
                            if(leaf.right && ((next.left.idx == leaf.right.idx) || (next.left.idx == leaf.idx) ))
                            {
                                if(operators_predececense[leaf.operator_sign] < operators_predececense[next.operator_sign])
                                {
                                    ast[next_idx].left            = leaf
                                    if(next_leaf_idx)
                                    {
                                        clean_ast[next_leaf_idx].left = leaf
                                    }
                                    leaf.ignore     = true
                                }
                                else
                                {
                                    leaf.right = next
                                    ast[next_idx].ignore            = true
                                    if(next_leaf_idx)
                                    {
                                        clean_ast[next_leaf_idx].ignore = true
                                    }
                                    append = true
                                }
                            }
                        }
                    }
                }
                else
                {
                    if(next_leaf_idx)
                    {
                        leaf.right                           =   clean_ast[next_leaf_idx]
                        clean_ast[next_leaf_idx].right  =   leaf
                        append(true)
                    }
                }
            }
            
        }
        if(append)
        {
            clean_ref[idx]=clean_ast.length
            clean_ast.push(leaf)
        }
    })
    return clean_ast
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
const ast_tree = ast_parse(clean_token)
console.info(ast_tree)
#!/usr/bin/env node
process.argv.splice(0,2)
const lexit = require('lexitjs')
const util = require('util')
console.inspect  = (item)=>{
    console.info(util.inspect(item,
        {depth: null,
        colors: true,
        compact: false}))
}
const { fs,helpers } = require('./utils')
const {operators_predececense} = helpers
const lexer = new lexit.LexIt()
const args  = process.argv
const name  = __filename 
const identifier_expression = helpers.expressions.filter(
        expression_ref=>{
            if(expression_ref.type.toLowerCase()=='identifier')
            {
                return (expression_ref.token)
            }
        }
    )[0]
const literal_expression = helpers.expressions.filter(
        expression_ref=>{
            if(expression_ref.type.toLowerCase()=='literal')
            {
                return (expression_ref.from_tokens)
            }
        }
    )[0]
const specialchar_expression = helpers.expressions.filter(
    expression_ref=>{
        if(expression_ref.type.toLowerCase()=='specialchar')
        {
            return (expression_ref.from_tokens)
        }
    }
)[0]
const end_of_statement = helpers.expressions.filter(
    expression_ref=>{
        if(expression_ref.type.toLowerCase()=='eos')
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

const identifiers = helpers.expressions.filter(
        expression_ref=>{
            if(expression_ref.type.toLowerCase()=='identifier')
            {
                return expression_ref.token
            }
        }
    ).map(expression_ref=>expression_ref.token.toLowerCase())[0]
const specialchars = helpers.expressions.filter(
        expression_ref=>{
            if(expression_ref.type.toLowerCase()=='specialchar')
            {
                return expression_ref.from_tokens
            }
        }
    ).map(expression_ref=>expression_ref.from_tokens.map(ft=>ft.toLowerCase()))[0]
    
const end_of_statements = helpers.expressions.filter(
        expression_ref=>{
            if(expression_ref.type.toLowerCase()=='eos')
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
class ParseIt{
    process_token(token_list,pos){
        const previous_pos      = pos-1
        const next_pos          = pos+1
        const token             = token_list.length>pos ? token_list[pos] : null
        const previous          = token_list.length>previous_pos ? token_list[previous_pos] : null
        const next              = token_list.length>next_pos ? token_list[next_pos] : null    
        const [type,value]      =   token
        const is_operator       =   helpers.operators.hasOwnProperty(value)
        const operator          =   is_operator ? helpers.operators[value] : null
        const operator_sign     =   operator ? value : null
        const is_litteral       =   literals.includes(type.toLowerCase())
        const is_identifier     =   identifiers.includes(type.toLowerCase())
        const is_specialchar    =   specialchars.includes(type.toLowerCase())
        const is_end_of_statement       =   end_of_statements.includes(type.toLowerCase())
        const is_group          =   groups.find(group=>group.start===value)
        let     matched                 = null
        if(is_operator || is_identifier){

            const   matching_start          =  helpers.expressions.filter(expression_ref=>{return expression_ref.hasOwnProperty('args') && expression_ref.args.start == value})
            const   matching_operators      =  helpers.expressions.filter(expression_ref=>(expression_ref.hasOwnProperty('operators') && expression_ref.operators.includes(value)))
            const   matching_expressions    =  matching_start.length ? matching_start : matching_operators
            
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
                    else
                    {
                        matched = {...expression_ref,idx:pos,value}   
                    }
                })
            }
            if(matched)
            {
                matched.operator_sign = operator_sign
            }
            token[2] = matched
        }
        if(!matched || (!(is_operator || is_identifier)))
        {
            if(is_litteral)
            {
                token[2]                 = {...literal_expression,is_litteral,idx:pos,value,operator,operator_sign}
            }
            if(is_specialchar)
            {
                token[2]                 = {...specialchar_expression,is_specialchar,idx:pos,value,operator,operator_sign}
                token['is_'+type]    = true
            }
            if(is_identifier)
            {
                token[2]                 = {...identifier_expression,is_identifier,idx:pos,value,operator,operator_sign}
            }
            if(is_end_of_statement)
            {
                token[2]                 = {...end_of_statement,idx:pos,is_end_of_statement,value,operator,operator_sign}
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
    ast_parse(dataset)
    {
        const ast                   = []
        let current_pos             = 0
        const token_set_size        = dataset.length
        while(current_pos < token_set_size)
        {
            
            let can_do                      = true
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
            
            let go_ahead = false
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
                // else if(type == "ASSIGNMENT_EXPRESSION")
                // {
                //     const {args,operators} = params
                //     console.info("assignment here ",current_token)
                //     const expression_start = args.start
                //     const expression_end   = args.end.map(itm=>itm.toLowerCase())
                //     let   start_token_idx  = null
                //     let   end_token_idx    = null
                //     let   cursor           = current_pos-1
                //     let   test             = null
                //     let   assignees        = []
                //     let   assignments       = []
                    
                //     while(cursor >= 0 && (start_token_idx==null))
                //     {
                //         test = dataset[cursor]
                //         const {value} = test.token[2] ? test.token[2] : {}
                //         start_token_idx = value == expression_start ? test.pos : null
                //         cursor--
                //     }
                //     if(start_token_idx)
                //     {
                //         let assignee_idx = start_token_idx
                //         while(assignee_idx < current_pos)
                //         {
                //             if(!dataset[assignee_idx].token.is_space)
                //             {
                //                 assignees.push(dataset[assignee_idx])
                //             }
                //             assignee_idx++
                //         }
                //     }
                //     cursor           = current_pos+1
                //     while(cursor < dataset.length && (end_token_idx==null))
                //     {   
                //         test = dataset[cursor]
                //         const value = test.token[1].toLowerCase()
                //         end_token_idx = expression_end.includes(value) ? test.pos : null
                //         cursor++
                //     }
                //     if(end_token_idx)
                //     {
                //         let assignment_idx = current_pos+1
                //         while(assignment_idx < end_token_idx)
                //         {

                //             if(!dataset[assignment_idx].token.is_space)
                //             {
                //                 assignments.push(dataset[assignment_idx])
                //             }
                //             assignment_idx++
                //         }
                //     }

                //     assignees   = this.ast_parse(assignees.map((item,idx)=>{item.pos=idx;return item}))
                //     assignments = this.ast_parse(assignments.map((item,idx)=>{item.pos=idx;return item}))
                //     go_ahead = true
                //     node = {
                //         type,
                //         operator:params.operator,
                //         operator_sign:params.operator_sign,
                //         value:assignments,
                //         assignees,
                //         assignments,
                //         idx:current_pos,
                //         previous,
                //         next
                //     }
                //     current_pos += end_token_idx+1 - current_pos
                // }

                else if(type == "ASSIGNMENT_EXPRESSION")
                {
                    // console.info('tooooookeeeeeen',current_token,current_pos,dataset)
                    const {args} = params
                    const expression_start = args.start
                    const expression_end   = args.end.map(itm=>itm.toLowerCase())
                    let   start_token_idx  = current_pos
                    let   end_token_idx    = null
                    let   cursor           = start_token_idx+1
                    let   test             = null
                    let   assignees        = []
                    let   assignments      = []
                    let   operator         = null
                    let   operator_sign    = null
                    let   operator_index   = null
                    // console.info(end_token_idx)
                    // console.info(args.operators)
                    while((cursor >= 0) && (cursor < dataset.length) && (end_token_idx == null))
                    {
                        const test            =   dataset[cursor]
                        const value           =   ((test.token[1] && test.token[1].value) ? test.token[1].value.toLowerCase() : test.token[1]).trim()
                        if(expression_end.includes(value))
                        {
                            end_token_idx = cursor
                        }
                        if(args.operators.includes(value))
                        {
                            operator       = helpers.operators[value]
                            operator_sign  = value
                            operator_index = cursor
                        }
                        cursor++
                    }
                    cursor           = start_token_idx+1
                    while((cursor < end_token_idx))
                    {
                        const test            =   dataset[cursor]
                        const type           =   (test.token[0].toLowerCase) ? test.token[0].toLowerCase() : test.token[0]
                        const value           =   ((test.token[1] && test.token[1].value) ? test.token[1].value.toLowerCase() : test.token[1]).trim()
                        if(operator == value)
                        {
                            cursor++
                            continue
                        }
                        if(cursor > operator_index)
                        {
                            if((!(type == 'space')) && value.trim())
                            {
                                assignments.push(test)
                            }
                        }
                        if(cursor < operator_index)
                        {
                            if((!(type == 'space')) && value.trim())
                            {
                                assignees.push(test)
                            }
                        }
                        cursor++
                    }
                    assignees   = this.ast_parse(assignees.map((item,idx)=>{item.pos=idx;return item}))
                    assignments = this.ast_parse(assignments.map((item,idx)=>{item.pos=idx;return item}))
                    go_ahead    = true
                    node = {
                        type,
                        declaration_kind:params?params.value:dataset[start_token_idx][1],
                        operator,
                        operator_sign,
                        assignees,
                        assignments,
                        idx:current_pos,
                    }
                    current_pos += end_token_idx ? (end_token_idx - current_pos) : (dataset.length - current_pos)
                }
                else if(type == 'EOS')   
                {
                    go_ahead = true
                    node = {
                        type,
                        operator:params.operator,
                        operator_sign:params.operator_sign,
                        value:params.value,
                        is_end_of_statement:true,
                        idx:current_pos,
                        previous,
                        next
                    }
                }
                else
                {
                    go_ahead = true
                    if(params && params.value == " " || (!type))
                    {
                        can_do = false
                    }
                    node = {
                        type,
                        is_end_of_statement:params ? params.is_end_of_statement:null,
                        is_specialchar:params ? params.is_specialchar:null,
                        is_litteral:params ? params.is_litteral:null,
                        is_identifier:params ? params.is_identifier:null,
                        operator:params ? params.operator:null,
                        operator_sign:params ? params.operator_sign:null,
                        value:params ? params.value:null,
                        idx:current_pos,
                        previous,
                        next
                    }

                }
            }
            else
            {
                node = {
                    type,
                    is_end_of_statement:params.is_end_of_statement,
                    is_litteral:params.is_litteral,
                    is_identifier:params.is_identifier,
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
                let append = can_do
                if(node.type == 'SPECIALCHAR')
                {
                    go_ahead = true
                }

                if(!go_ahead)
                {
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
                        }
                    }
                }
                if(append)
                {
                    ast.push(node)
                }
            }
            current_pos++
        }
        const clean_ast = this.binary_factor(ast)
        return clean_ast
    }
    cleanAST(node) {
        if (!node || typeof node !== 'object') return node

        const cleaned = {
            type: node.type,
            operator: node.operator,
            is_end_of_statement: node.is_end_of_statement,
            is_specialchar: node.is_end_of_statement,
            is_litteral: node.is_litteral,
            is_identifier: node.is_identifier,
            operator_sign: node.operator_sign,
            assignees: node.assignees,
            assignments: node.assignments,
            declaration_kind: node.declaration_kind,
            value: node.value,
            idx: node.idx,
            left: null,
            right: null
        }
        if(cleaned.is_specialchar)
        {
            cleaned['is_'+(node.type ? node.type : '').toLowerCase()] = node['is_'+(node.type ? node.type : '').toLowerCase()]
        }

        if (node.left) {
            cleaned.left = this.cleanAST(node.left)
        }

        if (node.right) {
            cleaned.right = this.cleanAST(node.right)
        }

        return cleaned
    }
    binary_factor(ast)
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
            let     append          = false || leaf.type!= 'BINARY_EXPRESSION'
            let     ignore          = leaf.ignore ? true : (leaf.type != 'BINARY_EXPRESSION')
            
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

                                if((operators_predececense[leaf.operator_sign] == operators_predececense[next.operator_sign]))
                                {
                                    ast[previous_idx].right = leaf
                                    leaf                    = ast[previous_idx]
                                    append                  = false
                                }
                                else
                                {
                                    leaf.left                    = ast[previous_idx] 
                                    ast[previous_idx].ignore          = true
                                    append = true
                                }
                            }
                            else   
                            {   
                                if(previous_leaf_idx)
                                {
                                    clean_ast[previous_leaf_idx]        =   leaf
                                    append                              = false
                                }
                            }
                        }
                    }
                }
                else
                {
                    if(!previous.is_end_of_statement && !previous.value == ' ')
                    {
                        if(previous_leaf_idx)
                        {
                            leaf.left                           =   clean_ast[previous_leaf_idx]
                            clean_ast[previous_leaf_idx].right  =   leaf
                        }
                    }
                    append = true
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
                                if((operators_predececense[leaf.operator_sign] == operators_predececense[next.operator_sign]))
                                {
                                    ast[next_idx].left = leaf
                                    leaf               = ast[next_idx]
                                    if(clean_ast[previous_idx])
                                    {
                                        if(clean_ast[previous_idx].type == 'BINARY_EXPRESSION')
                                        {
                                            if((operators_predececense[clean_ast[previous_idx].operator_sign] < operators_predececense[next.operator_sign]))
                                            {
                                                clean_ast[previous_idx].right = leaf
                                            }
                                        }
                                    
                                    }
                                    else
                                    {
                                        ignore             = false
                                    }
                                }
                                else
                                {
                                    leaf.right                    = ast[next_idx] 
                                    ast[next_idx].ignore          = true
                                    append                        = true
                                }
                            }
                        }
                    }
                }
                else
                {
                    if(next_leaf_idx)
                    {
                        leaf.right                            =   clean_ast[next_leaf_idx]
                        clean_ast[next_leaf_idx].ignore       =   true
                        append = true
                    }
                }
            }

            if(leaf.type == 'BINARY_EXPRESSION' && (!previous || (previous.type != 'BINARY_EXPRESSION')) && (!next || (next.type != 'BINARY_EXPRESSION')))
            {
                append = true
            }
            if(leaf.type == 'ASSIGNMENT_EXPRESSION')
            {
                append = true
                ignore = false
            }

            if(leaf.is_end_of_statement)
            {
                append = true
                ignore = false
            }
            if(leaf.type == 'IDENTIFIER')
            {
                append = true
                ignore = false
            }
            if(append && !ignore)
            {
                clean_ref[idx]=clean_ast.length
                clean_ast.push(leaf)
            }
        })
        return clean_ast.map((ast_item)=>{
            return this.cleanAST(ast_item)
        })
    }

    tokenize_input(args,use_input)
    {
        const clean_token   =   [] 
        if(args.length)
        {
            const dataset       =   {}
            args.map(file=>{
                let file_data = fs.readFileSync(file).toString()
                let file_tokens = []
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
                            const {token,pos} = this.process_token(set.file_tokens,idx)
                            idx = pos
                            clean_token.push({token,pos})
                        }
                    }
                }
            )
        }
        return clean_token
        
    }
    parse(args,use_input)
    {

        if(!use_input && (Array.isArray(args)))
        {
            use_input = this.tokenize_input(args)
        }
        use_input.push({
            token: [
                'eof',
                'eof',
                {
                type: 'eos',
                token: 'eof',
                is_end_of_statement: true,
                idx: 0,
                value: 'eof',
                operator: null,
                operator_sign: null
                }
            ],
            pos: use_input.length
        })
        // console.inspect(use_input[0])
        return this.ast_parse(use_input)
    }
}

const parser = new ParseIt()
const ast_tree = parser.parse(args)
console.inspect(ast_tree)
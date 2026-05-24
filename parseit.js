#!/usr/bin/env node
process.argv.splice(0,2)
const lexit = require('lexitjs')
const { fs } = require('lexitjs/utils')
const lexer = new lexit.LexIt()
const args  = process.argv
const name  = __filename 

if(args.length)
{
    const dataset = {}
    args.map(file=>{
        file_data = fs.readFileSync(file).toString()
        file_tokens = []
        if(file_data)
        {
            console.info(file_data)
            file_tokens = lexer.tokenize(file_data) 
        }
        dataset[file] = {file_data,file_tokens}
    })
    console.info(dataset['code.mb'])
}

// console.info(lexer.tokenize('let var_a'))
const Parser = require('tree-sitter');
const Python = require('tree-sitter-python');
const fs = require('fs');

const parser = new Parser();
parser.setLanguage(Python);

function buildAST(fullFilePath) {
        if (Array.isArray(fullFilePath)) {
            throw new Error('Expected a string path, received an array');
        }
    
        if (!fullFilePath || typeof fullFilePath !== 'string') {
            throw new Error('Invalid file path provided');
        }
    
        const src = fs.readFileSync(fullFilePath, 'utf8');
        return parser.parse(src);
    }

module.exports = { buildAST };
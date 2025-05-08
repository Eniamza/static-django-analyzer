const readlineSync = require('readline-sync');
const chalk = require('chalk');

const fs    = require('fs');
const path  = require('path');
const glob  = require('glob');
const Parser = require('tree-sitter');
const Python = require('tree-sitter-python');

// Defining Chalk Colors

const message = chalk.blue.bold;
const error = chalk.red.bold;
const success = chalk.green.bold;
const warning = chalk.yellow.bold;

// Asking user the path for Django's root directory

console.log(message('Welcome to Django Static Analyzer!'));
const path = readlineSync.question(message('Enter the path for Django\'s root directory: '));
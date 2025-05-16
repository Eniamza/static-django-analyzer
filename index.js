const readlineSync = require('readline-sync');
const chalk = require('chalk');
const fs = require('fs');

const { listPythonFiles } = require('./lib/listPythonFiles.js');
const { buildAST } = require('./parser/buildAST.js');
const { processArguments, getSettingsFile, getInstalledApps, getRootUrls, listAllSubURLFiles } = require("./parser/processFiles.js");
const { get } = require('http');

// Defining Chalk Colors

const message = chalk.blue.bold;
const error = chalk.red.bold;
const success = chalk.green.bold;
const warning = chalk.yellow.bold;

// Asking user the path for Django's root directory

console.log(message('Welcome to Django Static Analyzer!'));
// const path = readlineSync.question(message('Enter the path for Django\'s root directory: '));
// const path = "D:\\STATIC\\ArchiveBox\\archivebox"
const path = "D:\\STATIC\\rest-sample"
console.log(message('Analyzing the directory...'));



    try {

        let pyFiles = listPythonFiles(path)
        let managePy = pyFiles.find(file => file.endsWith('manage.py'))
       
           if (!managePy) {
               console.log(error('manage.py not found in the specified directory.'));
               process.exit(1);
           }

        let ast = buildAST(managePy);
        let availableArguments = processArguments(ast);
        console.log(success('Available arguments for os.environ.setdefault:', availableArguments));
           
        console.log(pyFiles)
        let settingsFilePath = getSettingsFile(availableArguments, pyFiles);
        if (!settingsFilePath) {
            console.log(error('No valid settings file found.'));
            throw new Error('No valid settings file found.');
        }
    
        console.log(success('Settings file found:', settingsFilePath));
    
        // Building the settings file AST
        let settingsAst = buildAST(settingsFilePath);
        let installedApps = getInstalledApps(settingsAst);

        // get All root url paths from settingsFilePath/urls.py

        let urlsFilePath = settingsFilePath.replace('settings.py', 'urls.py');
        if (!fs.existsSync(urlsFilePath)) {
            throw new Error('urls.py not found in the settings directory.');
        }

        console.log(success('root urls.py found:', urlsFilePath));
        let urlsAst = buildAST(urlsFilePath);
        let rootUrls = getRootUrls(urlsAst,installedApps);
        let allSubURLFiles = listAllSubURLFiles(rootUrls, pyFiles);
        console.log(success('All sub URL files found:', allSubURLFiles));

        for (const filePath of allSubURLFiles) {
            let ast = buildAST(filePath);
            let rooturltest = getRootUrls(ast, []);
            console.log(success('file:', filePath));
            console.log(rooturltest);
        }

    } catch (err) {
        console.log(error('Error processing files:'), err.message);
        process.exit(1);
    }




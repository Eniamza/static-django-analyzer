const fs = require('fs');
const path = require('path');

function processArguments(ast) {

    let rootNode = ast.rootNode

    let allCallFunctions = rootNode.descendantsOfType('call')

    let allArgumentsAvailable = []

    allCallFunctions.forEach((call) => {
        let functionName = call.firstNamedChild.text
        if ( functionName === "os.environ.setdefault") {
            call.descendantsOfType("string_content").forEach((argList) => {
                allArgumentsAvailable.push(argList.text)
            })
        }
    })

    return allArgumentsAvailable
}

function checkArguments(availableArguments) {

    if (availableArguments.length === 0) {
        console.log('No arguments found for os.environ.setdefault.');
        return false
    }
    if (availableArguments.length === 1 && availableArguments[0] === "DJANGO_SETTINGS_MODULE") {
        console.log('No arguments found for os.environ.setdefault.');
        return false
    }

    let validArgument 
    console.log('Available arguments:', availableArguments);
    for (const arg of availableArguments) {
        if (arg !== "DJANGO_SETTINGS_MODULE") {
            validArgument = arg
            break
        }
    }


    if (validArgument) {
        console.log('Valid argument found for os.environ.setdefault:', validArgument);
        return validArgument
    } else {
        console.log('No valid arguments found for os.environ.setdefault.');
        return false
    }

}

function getSettingsFile(availableArguments, pyFiles) {
    let isValidSettingAvailable = checkArguments(availableArguments)

    if (isValidSettingAvailable === false) {
        console.log(error('No valid settings available for os.environ.setdefault.'));
        return false
    }

    let settingsParentFolderName = isValidSettingAvailable.split('.')[0]
    let settingsFileName = isValidSettingAvailable.split('.')[1]
    // setting file name
    let settingRelatedFilesPath = pyFiles.find(file => {
        const normalizedPath = path.normalize(file);
        const expectedEnding = path.join(settingsParentFolderName, `${settingsFileName}.py`);
        return normalizedPath.endsWith(expectedEnding) && 
            normalizedPath.includes(settingsParentFolderName) && 
            normalizedPath.includes(settingsFileName);
    });

    // console.log('settingsParentFolderName:', settingsParentFolderName);
    return settingRelatedFilesPath

}

function getInstalledApps(ast) {
    let rootNode = ast.rootNode;
    let defaultInstalledApps = [
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        'rest_framework',
        'django_filters'
    ];

    let allExpressionStatements = rootNode.descendantsOfType('expression_statement');
    let installedApps = [];

    for (const expression of allExpressionStatements) {
        let expressionText = expression.text;
        if (expressionText.includes("INSTALLED_APPS")) {
            let listDecendant = expression.descendantsOfType('list')[0]
            let strings = listDecendant.descendantsOfType('string')
            strings.forEach((installed) => {
                const cleanText = installed.text.slice(1, -1)
                if (!defaultInstalledApps.includes(cleanText)) {
                    installedApps.push(cleanText);
                }
            });
        }
    }

    console.log('Installed Apps:', installedApps);

    if (installedApps.length === 0) {
        throw new Error('No INSTALLED_APPS found in the settings file.');
    }

    return installedApps;
}

function parseCallNode(callNode) {
    let NodeArgs = callNode.namedChildren;
    let identifierNode = NodeArgs[0];
    let argsNode = NodeArgs[1];

    if (!identifierNode) {
        console.log('Invalid call node structure:', callNode);
        throw new Error('Invalid call node structure');
    }

    if (identifierNode.type === 'identifier') {
        if (identifierNode.text === 'include') {
            let includeString = argsNode.descendantsOfType('string_content')[0].text
            return {
                nodeName: identifierNode.text,
                argList: includeString
            }
        }
    }

    let nodeName
    let argList
    if (identifierNode.type === 'attribute') {
        if(identifierNode.text.startsWith("view")) {
            let newNodeName = identifierNode.text.split(".").slice(1).join(".")   
            nodeName = newNodeName
            argList = []
            argsNode.namedChildren.forEach((child) => {
                argList.push(child.text)
            })

            return {
                nodeName: nodeName,
                argList: argList
            }
        }
        else {
            nodeName = identifierNode.text
            argList = []
            argsNode.namedChildren.forEach((child) => {
                // console.log(nodeName)
                // console.log('child111111:', child.text);
                argList.push(child.text)
            })

            return {
                nodeName: nodeName,
                argList: argList
            }
        }
        
    }

    console.log('Invalid call node structure:', callNode);
    return {
        nodeName: null,
        argList: null
    }

    
}

function parseKeywordArguments(arg) {
    let keywordArguments = {};
    let keywordArgs = arg.namedChildren;

    // [
    //     IdentifierNode {
    //       type: identifier,
    //       startPosition: {row: 40, column: 37},
    //       endPosition: {row: 40, column: 41},
    //       childCount: 0,
    //     },
    //     StringNode {
    //       type: string,
    //       startPosition: {row: 40, column: 42},
    //       endPosition: {row: 40, column: 48},
    //       childCount: 3,
    //     }
    //   ]

    let identifierNode = keywordArgs[0];
    let valueNode = keywordArgs[1];

    if (!identifierNode || !valueNode) {
        console.log('Invalid keyword argument structure:', arg);
        throw new Error('Invalid keyword argument structure');
    }

    let keywordName = identifierNode.text;
    let keywordValue = valueNode.text;

    if (valueNode.type === 'string') {
        keywordValue = keywordValue.slice(1, -1); // Remove quotes
    }
    else if (valueNode.type === 'call') {
        // console.log('Call node found----------------------');
        let parsedCall = parseCallNode(valueNode);
        keywordValue = parsedCall

    }

    // console.log('Parsed keyword argument:', {
    //     keywordName: keywordName,
    //     keywordValue: keywordValue,
    //     valueNodeType: valueNode.type,
    // });

    return {
        keywordName: keywordName,
        keywordValue: keywordValue,
        valueNodeType: valueNode.type,
    };
}

function getRootUrls(ast, installedApps) {
    let rootNode = ast.rootNode;

    // Fetch all "path" and "re_path" function calls
    let allCallFunctions = rootNode.descendantsOfType('call');
    let allUrls = [];
    let allPathCallNodes = [];

    allCallFunctions.forEach((call) => {
        let functionName = call.firstNamedChild.text;
        if (functionName === "path" || functionName === "re_path") {
            allPathCallNodes.push(call);
        }
    });

    let pathCallandArgumentsMap = {}

    // console.log('All path and re_path calls:', allPathCallNodes[4].children[1].children.forEach((child) => {
    //     console.log('child:', child.text);
    // }
    // ));

    for (const pathCall of allPathCallNodes) {
        let arguments = pathCall.namedChildren[1];
        let pathName = arguments.descendantsOfType('string_content')[0].text
        let pathArguments = []

        arguments.namedChildren.forEach((arg) => {
            // console.log('arg:', arg);
            pathArguments.push(arg)

        }
        )

        if (pathCallandArgumentsMap.hasOwnProperty(pathName)) {
            console.log('Collision detected for path: (Skipping)', pathName);
            continue
        }

        pathCallandArgumentsMap[pathName] = pathArguments
        
    }

    let pathCallandResolvedArgumentsMap = {}

    for (const [key, value] of Object.entries(pathCallandArgumentsMap)) {
        // console.log(`Processing key: ${key}`);

        let buildPathArgumentObject = {
            route: null,
            view: null,
            kwargs: null,
            name: null
        }

        for (const [index, arg] of value.entries()) {
            // If the index is 0 and it's not a keyword argument, it's the route
            if (index === 0 && arg.type !== 'keyword_argument') {
                // console.log('Key name', key);
                // buildPathArgumentObject.route = arg.descendantsOfType('string_content')[0].text;

                if (!arg.descendantsOfType('string_content')[0]) {
                    if (arg.text === "''"){
                        buildPathArgumentObject.route = ''
                    }
                    else {
                        if(arg.text === "''") {
                            buildPathArgumentObject.route = ''
                        }else {
                            buildPathArgumentObject.route = arg.text;
                        }

                    }
                }
                else {
                    
                    buildPathArgumentObject.route = arg.descendantsOfType('string_content')[0].text;
                }


                // console.log('route:', arg.text);
            }
            // If the index is 1 and it's not a keyword argument, it's the view
            else if (index === 1 && arg.type !== 'keyword_argument') {
                if (arg.type === 'call') {
                    let parsedCall = parseCallNode(arg);
                    buildPathArgumentObject.view = parsedCall;
                    // console.log('view:', parsedCall.nodeName);
                }
                else {
                    buildPathArgumentObject.view = arg.text;
                    // console.log('view:', arg.text);
                }
            }
            // If the index is 2 and it's a dictionary type, it's the kwargs
            else if (index === 2 && arg.type === 'dictionary') {
                buildPathArgumentObject.kwargs = arg.text;
                // console.log('kwargs:', arg.text);
            }
            // If the index is 3 and it's not a keyword argument, it's the name
            else if (index === 3 && arg.type !== 'keyword_argument') {
                buildPathArgumentObject.name = arg.text;
                // console.log('name:', arg.text);
            }
            // If it's a keyword argument, check its name and assign it accordingly
            else if (arg.type === 'keyword_argument') {

                let parsedKeyword = parseKeywordArguments(arg);
                let keywordName = parsedKeyword.keywordName;
                let keywordValue = parsedKeyword.keywordValue;

                if (keywordName === 'name') {
                    buildPathArgumentObject.name = keywordValue;
                    // console.log('name:', keywordValue);
                } else if (keywordName === 'kwargs') {
                    buildPathArgumentObject.kwargs = keywordValue;
                    // console.log('kwargs:', keywordValue);
                } else if (keywordName === 'route') {
                    buildPathArgumentObject.route = keywordValue;
                    // console.log('route:', keywordValue);
                } else if (keywordName === 'view') {
                    buildPathArgumentObject.view = keywordValue;
                    // console.log('view:', keywordValue);
                }
                else {
                    console.log('Unknown keyword argument:', keywordName);
                }
            }
      }

        pathCallandResolvedArgumentsMap[key] = buildPathArgumentObject
    
    }
    // console.log('All path and re_path calls:', pathCallandArgumentsMap);
    // console.log('All path and re_path calls:', pathCallandResolvedArgumentsMap);
    fs.writeFileSync('pathCallandResolvedArgumentsMap.json', JSON.stringify(pathCallandResolvedArgumentsMap, null, 2), 'utf-8');
    return pathCallandResolvedArgumentsMap;
}

function listSubURLFiles(pathObject, pyFiles) {
    let subView = pathObject.view;


    if (!subView || typeof subView !== 'object' || 
        subView.nodeName !== 'include' || 
        typeof subView.argList !== 'string') {
        return null;
    }

    let subViewPath = subView.argList;
    let [subviewParentFolderName, subviewFileName] = subViewPath.split('.');


    // console.log('subviewParentFolderName:', subviewParentFolderName);
    // console.log('subviewFileName:', subviewFileName);

    if (subViewPath.includes('django')) {
        console.log('Skipping a Default Django URL:', subViewPath);
        return null;
    }

    let subViewFilePath = pyFiles.find(file => {
        const normalizedPath = path.normalize(file);
        const expectedEnding = path.join(subviewParentFolderName, `${subviewFileName}.py`);
        return normalizedPath.endsWith(expectedEnding) && 
               normalizedPath.includes(subviewParentFolderName) && 
               normalizedPath.includes(subviewFileName);
    });

    // Log and return the result
    if (subViewFilePath) {
        console.log('Found URL file:', subViewFilePath);
        return subViewFilePath;
    } 

    // console.log(`Could not find URL file for: ${subviewParentFolderName}.${subviewFileName}`);
    return null;
}

module.exports = { processArguments, checkArguments, getSettingsFile, getInstalledApps , getRootUrls, listSubURLFiles }
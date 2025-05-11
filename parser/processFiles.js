


function processArguments(ast) {

    let rootNode = ast.rootNode

    let allCallFunctions = rootNode.descendantsOfType('call')

    let allArgumentsAvailable = []

    allCallFunctions.forEach((call) => {
        let functionName = call.firstNamedChild.text
        if ( functionName === "os.environ.setdefault") {
            call.descendantsOfType("string").forEach((argList) => {
                const cleanText = argList.text.replace(/^"|"$/g, '')
                allArgumentsAvailable.push(cleanText)
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

    let validArgument = availableArguments.find((arg) => {
        return arg !== "DJANGO_SETTINGS_MODULE"
    })


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

let settingRelatedFilesPath = pyFiles.find(file => file.endsWith('.py') && 
file.includes(settingsParentFolderName) && 
file.includes(settingsFileName)
) 
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
        let pathName = arguments.descendantsOfType('string')[0].text.slice(1, -1);
        pathCallandArgumentsMap[pathName] = []
        let pathArguments = []

        arguments.namedChildren.forEach((arg) => {
            pathArguments.push(arg)
        }
        )

        pathCallandArgumentsMap[pathName] = pathArguments
        
    }

    let pathCallandResolvedArgumentsMap = {}

    for (const [key, value] of Object.entries(pathCallandArgumentsMap)) {
        console.log(`Processing key: ${key}`);

        let buildPathArgumentObject = {
            route: null,
            view: null,
            kwargs: null,
            name: null
        }

        for (const [index, arg] of value.entries()) {
            // If the index is 0 and it's not a keyword argument, it's the route
            if (index === 0 && arg.type !== 'keyword_argument') {
                console.log('route:', arg.text);
            }
            // If the index is 1 and it's not a keyword argument, it's the view
            else if (index === 1 && arg.type !== 'keyword_argument') {
                console.log('view:', arg.text);
            }
            // If the index is 2 and it's a dictionary type, it's the kwargs
            else if (index === 2 && arg.type === 'dictionary') {
                console.log('kwargs:', arg.text);
            }
            // If the index is 3 and it's not a keyword argument, it's the name
            else if (index === 3 && arg.type !== 'keyword_argument') {
                console.log('name:', arg.text);
            }
            // If it's a keyword argument, check its name and assign it accordingly
            else if (arg.type === 'keyword_argument') {
                // let keywordName = arg.firstNamedChild.text;
                // let keywordValue = arg.lastNamedChild.text;

                // if (keywordName === 'kwargs') {
                //     buildPathArgumentObject.kwargs = keywordValue;
                // } else if (keywordName === 'name') {
                //     buildPathArgumentObject.name = keywordValue.slice(1, -1);
                // }
                console.log('keyword argument:', arg.text);
            }
      }
    
    }
    // console.log('All path and re_path calls:', pathCallandArgumentsMap);
    return pathCallandArgumentsMap;
}

module.exports = { processArguments, checkArguments, getSettingsFile, getInstalledApps , getRootUrls }
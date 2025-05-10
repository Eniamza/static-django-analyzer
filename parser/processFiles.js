


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

function getInstalledApps (ast) {
    let rootNode = ast.rootNode

    let defaultInstalledApps = [
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        'rest_framework',
        'django_filters'
    ]

    let allExpressionStatements = rootNode.descendantsOfType('expression_statement')
    let installedApps = [];
    for (const expression of allExpressionStatements) {
        let expressionText = expression.text;
        if (expressionText.includes("INSTALLED_APPS")) {
            let appsText = expressionText.split('=')[1].trim();

            appsText = appsText
                .replace(/^\[|\]$/g, '')
                .split(',')
                .map(app => app.trim())
                .map(app => app.replace(/['"]/g, ''))
                .filter(app => app.length > 0);

            installedApps = appsText;
            installedApps = installedApps.filter(app => !defaultInstalledApps.includes(app));
            console.log('Installed apps found:', installedApps);
            break; // Exit the loop once we find INSTALLED_APPS
        }
    }

    if (installedApps.length === 0) {
        throw new Error('No INSTALLED_APPS found in the settings file.');
    }

    return installedApps;

}

function getRootUrls (ast,installedApps) {
    let rootNode = ast.rootNode

    // Fetch all "path" and "re_path" function calls
    let allCallFunctions = rootNode.descendantsOfType('call')



    let allUrls = []
    allCallFunctions.forEach((call) => {
        let functionName = call.firstNamedChild.text
        if (functionName === "path" || functionName === "re_path") {
            let urlPath = call.firstNamedChild.nextNamedSibling.text
            allUrls.push(urlPath)
        }
    })

    // Filter URLs based on installed apps
    let filteredUrls = allUrls.filter(url => {
        return installedApps.some(app => url.includes(app));
    });

    if (filteredUrls.length === 0) {
        console.log('No URLs found for the installed apps.');
        throw new Error('No URLs found for the installed apps.');
    } else {
        console.log('Filtered URLs found:', filteredUrls);
        return filteredUrls
    }
}

module.exports = { processArguments, checkArguments, getSettingsFile, getInstalledApps , getRootUrls }
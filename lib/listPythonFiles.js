const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

function listPythonFiles(dir) {

    if (!fs.existsSync(dir)) {
        throw new Error(`Directory not found: ${dir}`);
    }

    // Use glob to find all Python files in the directory and its subdirectories
    const pattern = path.join(dir, '**/*.py');
    const options = {
        windowsPathsNoEscape: true,
        absolute: true
    };
    const files = glob.sync(pattern, options);
    return files;
}

module.exports = { listPythonFiles };
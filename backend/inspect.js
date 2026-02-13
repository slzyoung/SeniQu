const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('Searching for @privy-io/server-auth...');

// Search in current node_modules
glob.glob('node_modules/@privy-io/**/*', (err, files) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Found in local node_modules:', files.length, 'files');
        if (files.length > 0) {
            console.log(files.slice(0, 5));
        }
    }
});

// Search in parent node_modules (monorepo?)
glob.glob('../node_modules/@privy-io/**/*', (err, files) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Found in parent node_modules:', files.length, 'files');
        if (files.length > 0) {
            console.log(files.slice(0, 5));
        }
    }
});

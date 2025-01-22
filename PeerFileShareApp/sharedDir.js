const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const appName = "PeerFileShareApp"; // Your app name
const sharedDir = path.join(app.getPath('appData'), appName, 'shared');
const publicDir = path.join(sharedDir, 'public');
const privateDir = path.join(sharedDir, 'private');

function ensureDirectoriesExist() {
    [sharedDir, publicDir, privateDir].forEach((dir) => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

ensureDirectoriesExist();

module.exports = { publicDir, privateDir };

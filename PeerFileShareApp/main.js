const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const net = require('net');
const fs = require('fs');
const { promisify } = require('util');
const downloadDir = path.join(os.homedir(), 'PeerFileShare', 'downloads');

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
        },
    });

    mainWindow.loadFile('index.html');

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });

    ensureDirectoriesExist();
});

ipcMain.handle('get-shared-dirs', () => {
    const publicDir = path.join(os.homedir(), 'PeerFileShare', 'public');
    const privateDir = path.join(os.homedir(), 'PeerFileShare', 'private');
    return { publicDir, privateDir };
});

ipcMain.handle('get-files', (_, dirType) => {
    const dir = dirType === 'public'
        ? path.join(os.homedir(), 'PeerFileShare', 'public')
        : path.join(os.homedir(), 'PeerFileShare', 'private');

    try {
        const files = fs.readdirSync(dir);
        return files;
    } catch (error) {
        console.error(`Error reading ${dirType} directory:`, error);
        return [];
    }
});

ipcMain.handle('get-local-ip', () => {
    const networkInterfaces = os.networkInterfaces();
    let localIp = '127.0.0.1'; // Default to localhost

    for (const interfaceName in networkInterfaces) {
        if (networkInterfaces[interfaceName]) {
            networkInterfaces[interfaceName].forEach((iface) => {
                if (!iface.internal && iface.family === 'IPv4') {
                    localIp = iface.address;
                }
            });
        }
    }

    return localIp;
});

ipcMain.handle('move-file-to-private', (_, filename) => {
    const publicDir = path.join(os.homedir(), 'PeerFileShare', 'public');
    const privateDir = path.join(os.homedir(), 'PeerFileShare', 'private');
    const sourcePath = path.join(publicDir, filename);
    const destinationPath = path.join(privateDir, filename);

    try {
        if (fs.existsSync(sourcePath)) {
            fs.renameSync(sourcePath, destinationPath);
            console.log(`Moved file ${filename} from public to private.`);
            return { success: true };
        } else {
            console.error(`File not found: ${filename}`);
            return { success: false, error: 'File not found' };
        }
    } catch (error) {
        console.error('Error moving file:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('move-file-to-public', (_, filename) => {
    const publicDir = path.join(os.homedir(), 'PeerFileShare', 'public');
    const privateDir = path.join(os.homedir(), 'PeerFileShare', 'private');
    const sourcePath = path.join(privateDir, filename);
    const destinationPath = path.join(publicDir, filename);

    try {
        if (fs.existsSync(sourcePath)) {
            fs.renameSync(sourcePath, destinationPath);
            console.log(`Moved file ${filename} from private to public.`);
            return { success: true };
        } else {
            console.error(`File not found: ${filename}`);
            return { success: false, error: 'File not found' };
        }
    } catch (error) {
        console.error('Error moving file:', error);
        return { success: false, error: error.message };
    }
});

function ensureDirectoriesExist() {
    const baseDir = path.join(os.homedir(), 'PeerFileShare');
    const publicDir = path.join(baseDir, 'public');
    const privateDir = path.join(baseDir, 'private');
    const downloadDir = path.join(baseDir, 'downloads');

    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    if (!fs.existsSync(privateDir)) fs.mkdirSync(privateDir, { recursive: true });
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

    try {
        console.log('Public Directory Contents:', fs.readdirSync(publicDir));
    } catch (error) {
        console.error('Error reading Public Directory:', error.message);
    }
}


function startTCPServer() {
    const server = net.createServer((socket) => {
        console.log('Peer connected:', socket.remoteAddress);

        socket.setEncoding('utf8');

        socket.on('data', (data) => {
            console.log('Received request:', data);

            const [command, ...args] = data.split(' ');

            if (command === 'LIST') {
                handleListRequest(socket);
            } else if (command === 'GET' && args[0]) {
                handleGetRequest(socket, args[0], socket);
            }
        });

        socket.on('end', () => {
            console.log('Peer disconnected');
        });

        socket.on('error', (err) => {
            console.log('Socket error:', err);
        });
    });

    const port = 5000;
    server.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

function handleListRequest(socket) {
    const publicDir = path.join(os.homedir(), 'PeerFileShare', 'public');
    fs.readdir(publicDir, (err, files) => {
        if (err) {
            socket.write('Error reading public directory');
        } else {
            socket.write(JSON.stringify(files));
        }
    });
}

function handleGetRequest(socket, filename, clientSocket) {
    console.log(`handeling get request for ${filename}`)
    const publicDir = path.join(os.homedir(), 'PeerFileShare', 'public');
    const filePath = path.join(publicDir, filename);

    console.log(`path of file to download: ${filePath}`)

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            clientSocket.write('File not found');
        } else {
            console.log("starting actual download process")
            const readStream = fs.createReadStream(filePath);
            readStream.pipe(clientSocket);
            console.log(`Sending file: ${filename}`);
        }
    });
}

startTCPServer();

// IPC to fetch peer files list
ipcMain.handle('get-peer-files', async (event, peerIp) => {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        const port = 5000; // same port as server

        client.connect(port, peerIp, () => {
            console.log(`Connected to peer at ${peerIp}`);
            client.write('LIST'); // Send the LIST command to the peer
        });

        client.on('data', (data) => {
            try {
                const files = JSON.parse(data.toString());
                resolve(files); // Resolve with the list of files
            } catch (err) {
                reject('Error parsing file list');
            }
            client.destroy(); // Close the connection after receiving data
        });

        client.on('error', (err) => {
            reject('Error connecting to peer');
            client.destroy();
        });
    });
});

// IPC to download file
ipcMain.handle('download-file', async (event, peerIp, filename) => {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        const port = 5000;

        console.log(`Requesting ${filename} from ${peerIp}`);

        client.connect(port, peerIp, () => {
            console.log(`Connected to peer at ${peerIp}`);
            client.write(`GET ${filename}`); // Request the file from the peer
        });

        // Correct the download path by including the filename
        const downloadPath = path.join(os.homedir(), 'PeerFileShare', 'downloads', filename);
        const writeStream = fs.createWriteStream(downloadPath);

        client.on('data', (data) => {
            writeStream.write(data); // Write data to the download file
        });

        client.on('end', () => {
            writeStream.end();
            console.log(`Download complete: ${filename}`);
            resolve();
        });

        client.on('error', (err) => {
            reject('Error downloading file');
            client.destroy();
        });
    });
});

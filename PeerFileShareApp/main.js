const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const net = require('net');
const fs = require('fs');

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
});

ipcMain.handle('get-shared-dirs', () => {
    // Assuming shared folders are located in home directory under 'PeerFileShare'
    const publicDir = path.join(os.homedir(), 'PeerFileShare', 'public');
    const privateDir = path.join(os.homedir(), 'PeerFileShare', 'private');
    return { publicDir, privateDir };
});

// Get local IP address
ipcMain.handle('get-local-ip', () => {
    const networkInterfaces = os.networkInterfaces();
    let localIp = '';

    for (const interfaceName in networkInterfaces) {
        if (networkInterfaces[interfaceName]) {
            networkInterfaces[interfaceName].forEach((iface) => {
                if (!iface.internal && iface.family === 'IPv4') {
                    localIp = iface.address;
                }
            });
        }
    }

    return localIp || '127.0.0.1';  // Fallback to localhost if no IP found
});

// Start a TCP server for peer-to-peer file sharing
function startTCPServer() {
    const server = net.createServer((socket) => {
        console.log('Peer connected:', socket.remoteAddress);

        // Set encoding for data transfer
        socket.setEncoding('utf8');

        socket.on('data', (data) => {
            console.log('Received request:', data);

            const [command, ...args] = data.split(' ');

            if (command === 'LIST') {
                handleListRequest(socket);
            } else if (command === 'GET' && args[0]) {
                handleGetRequest(socket, args[0]);
            }
        });

        socket.on('end', () => {
            console.log('Peer disconnected');
        });

        socket.on('error', (err) => {
            console.log('Socket error:', err);
        });
    });

    const port = 5000; // Use a port for peer-to-peer connection
    server.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

// Handle 'LIST' request - List public files
function handleListRequest(socket) {
    const publicDir = path.join(os.homedir(), 'PeerFileShare', 'public'); // Define public folder location
    fs.readdir(publicDir, (err, files) => {
        if (err) {
            socket.write('Error reading public directory');
        } else {
            // Send a list of public files to the peer
            socket.write(JSON.stringify(files));
        }
    });
}

// Handle 'GET' request - Send a specific file
function handleGetRequest(socket, filename) {
    const publicDir = path.join(os.homedir(), 'PeerFileShare', 'public');
    const filePath = path.join(publicDir, filename);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            socket.write('File not found');
        } else {
            // Send file as a stream to the peer
            const readStream = fs.createReadStream(filePath);
            readStream.pipe(socket);
            console.log(`Sending file: ${filename}`);
        }
    });
}

startTCPServer();

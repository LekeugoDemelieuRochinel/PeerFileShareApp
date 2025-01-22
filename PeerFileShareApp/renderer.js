async function initializeApp() {
    // Get the local IP address and display it in the My IP field
    const localIp = await window.electronAPI.getLocalIp();
    const ipElement = document.getElementById('my-ip');
    ipElement.value = localIp;  // Set the local IP in the input field

    // Get shared directories
    const { publicDir, privateDir } = await window.electronAPI.getSharedDirs();
    console.log('Public Directory:', publicDir);
    console.log('Private Directory:', privateDir);

    // Add selection behavior to file lists
    const fileSections = ["public-files", "private-files", "peer-files"];

    fileSections.forEach((sectionId) => {
        const fileList = document.getElementById(sectionId);

        fileList.addEventListener("click", (event) => {
            if (event.target.tagName === "LI") {
                const previouslySelected = fileList.querySelector(".selected");

                if (event.target === previouslySelected) {
                    // Unhighlight if the same file is clicked
                    event.target.classList.remove("selected");
                } else {
                    // Highlight the clicked file
                    if (previouslySelected) {
                        previouslySelected.classList.remove("selected");
                    }
                    event.target.classList.add("selected");
                }
            }
        });
    });

    // Handle connect to peer
    const connectButton = document.getElementById('connect-peer');
    connectButton.addEventListener('click', () => {
        const peerIp = document.getElementById('peer-ip').value;
        if (peerIp) {
            connectToPeer(peerIp);
        }
    });
}

// Connect to peer
function connectToPeer(peerIp) {
    const client = new net.Socket();
    const port = 5000; // Connect to the server running on this port

    client.connect(port, peerIp, () => {
        console.log('Connected to peer at', peerIp);
        // Send LIST command to fetch the public files
        client.write('LIST');
    });

    client.on('data', (data) => {
        console.log('Received from peer:', data.toString());
        const files = JSON.parse(data.toString());
        updatePeerFilesList(files);
    });

    client.on('close', () => {
        console.log('Connection closed');
    });

    client.on('error', (err) => {
        console.log('Connection error:', err);
    });
}

// Update the peer files list in the UI
function updatePeerFilesList(files) {
    const peerFilesList = document.getElementById('peer-files');
    peerFilesList.innerHTML = ''; // Clear current list

    files.forEach((file) => {
        const li = document.createElement('li');
        li.textContent = file;
        peerFilesList.appendChild(li);
    });
}

// When user clicks on a file in the peer files list to download
function setupFileDownload() {
    const peerFilesList = document.getElementById('peer-files');
    peerFilesList.addEventListener('click', (event) => {
        if (event.target.tagName === "LI") {
            const selectedFile = event.target.textContent;

            // Send GET command to the peer for the selected file
            downloadFileFromPeer(selectedFile);
        }
    });
}

// Send GET command for the selected file to the peer
function downloadFileFromPeer(fileName) {
    const peerIp = document.getElementById('peer-ip').value;
    const client = new net.Socket();
    const port = 5000;

    client.connect(port, peerIp, () => {
        console.log('Sending GET request for file:', fileName);
        client.write(`GET ${fileName}`);
    });

    client.on('data', (data) => {
        // Receive file data from the peer
        console.log('Received data from peer:', data.toString());
        // Assuming the received data is the file content
        saveReceivedFile(fileName, data);
    });

    client.on('close', () => {
        console.log('File transfer complete');
    });

    client.on('error', (err) => {
        console.log('Connection error:', err);
    });
}

// Save the received file to the local directory
function saveReceivedFile(fileName, data) {
    const publicDir = path.join(os.homedir(), 'PeerFileShare', 'public');
    const filePath = path.join(publicDir, fileName);

    fs.writeFile(filePath, data, (err) => {
        if (err) {
            console.log('Error saving file:', err);
        } else {
            console.log(`File saved: ${fileName}`);
            // Update the UI to show the downloaded file
            updatePublicFilesList();
        }
    });
}

// Handle 'Make Public' action
function handleMakePublic() {
    const selectedFile = document.querySelector('#private-files .selected');
    if (selectedFile) {
        const fileName = selectedFile.textContent;
        moveFileToPublic(fileName);
    }
}

// Handle 'Make Private' action
function handleMakePrivate() {
    const selectedFile = document.querySelector('#public-files .selected');
    if (selectedFile) {
        const fileName = selectedFile.textContent;
        moveFileToPrivate(fileName);
    }
}

// Move file from private to public directory
function moveFileToPublic(fileName) {
    const privateDir = path.join(os.homedir(), 'PeerFileShare', 'private');
    const publicDir = path.join(os.homedir(), 'PeerFileShare', 'public');
    const oldPath = path.join(privateDir, fileName);
    const newPath = path.join(publicDir, fileName);

    fs.rename(oldPath, newPath, (err) => {
        if (err) {
            console.log('Error moving file to public:', err);
        } else {
            console.log(`File moved to public: ${fileName}`);
            updateFileLists();
        }
    });
}

// Move file from public to private directory
function moveFileToPrivate(fileName) {
    const privateDir = path.join(os.homedir(), 'PeerFileShare', 'private');
    const publicDir = path.join(os.homedir(), 'PeerFileShare', 'public');
    const oldPath = path.join(publicDir, fileName);
    const newPath = path.join(privateDir, fileName);

    fs.rename(oldPath, newPath, (err) => {
        if (err) {
            console.log('Error moving file to private:', err);
        } else {
            console.log(`File moved to private: ${fileName}`);
            updateFileLists();
        }
    });
}

// Update the lists of public and private files after changes
function updateFileLists() {
    // Update the public and private file sections
    loadPublicFiles();
    loadPrivateFiles();
}


document.addEventListener('DOMContentLoaded', initializeApp);

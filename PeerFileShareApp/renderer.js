async function initializeApp() {
    const localIp = await window.electronAPI.getLocalIp();
    document.getElementById('my-ip').value = localIp;

    const { publicDir, privateDir } = await window.electronAPI.getSharedDirs();
    console.log('Public Directory:', publicDir);
    console.log('Private Directory:', privateDir);

    await loadFileLists();

    // Add click listener to make files private
    document.getElementById('make-private').addEventListener('click', async () => {
        const selectedFile = document.querySelector('#public-files .selected');
        if (selectedFile) {
            const filename = selectedFile.textContent;
            const result = await window.electronAPI.moveFileToPrivate(filename);
            if (result.success) {
                console.log(`${filename} moved to private.`);
                loadFileLists(); // Reload file lists
            } else {
                console.error(result.error);
            }
        } else {
            console.error('No file selected to move to private.');
        }
    });

    // Add click listener to make files public
    document.getElementById('make-public').addEventListener('click', async () => {
        const selectedFile = document.querySelector('#private-files .selected');
        if (selectedFile) {
            const filename = selectedFile.textContent;
            const result = await window.electronAPI.moveFileToPublic(filename);
            if (result.success) {
                console.log(`${filename} moved to public.`);
                loadFileLists(); // Reload file lists
            } else {
                console.error(result.error);
            }
        } else {
            console.error('No file selected to move to public.');
        }
    });

    const fileSections = ["public-files", "private-files", "peer-files"];
    fileSections.forEach((sectionId) => {
        const fileList = document.getElementById(sectionId);

        fileList.addEventListener("click", (event) => {
            if (event.target.tagName === "LI") {
                const previouslySelected = fileList.querySelector(".selected");
                if (event.target === previouslySelected) {
                    event.target.classList.remove("selected");
                } else {
                    if (previouslySelected) {
                        previouslySelected.classList.remove("selected");
                    }
                    event.target.classList.add("selected");
                }
            }
        });
    });

    // Download file functionality
    document.getElementById('download-file').addEventListener('click', async () => {
        const selectedFile = document.querySelector('#peer-files .selected');
        if (!selectedFile) {
            alert('Please select a file to download');
            return;
        }

        console.log(`I want to download this file ${selectedFile.textContent}`)

        const peerIp = document.getElementById('peer-ip').value;
        if (!peerIp) {
            alert('Please connect to a peer first');
            return;
        }

        try {
            console.log("start try")
            // Initiate the file download
            await window.electronAPI.downloadFile(peerIp, selectedFile.textContent);
            alert('File downloaded successfully');
        } catch (error) {
            alert('Error downloading file: ' + error);
        }
    });
}

async function loadFileLists() {
    const publicFiles = await window.electronAPI.getFiles('public');
    const privateFiles = await window.electronAPI.getFiles('private');

    console.log(publicFiles);

    updateFileList('public-files', publicFiles);
    updateFileList('private-files', privateFiles);
}

document.getElementById('connect-peer').addEventListener('click', async () => {
    const peerIp = document.getElementById('peer-ip').value;
    if (peerIp) {
        try {
            const peerFiles = await window.electronAPI.getPeerFiles(peerIp);
            const peerFilesList = document.getElementById('peer-files');
            peerFilesList.innerHTML = ''; // Clear previous files

            peerFiles.forEach((file) => {
                const li = document.createElement('li');
                li.textContent = file;
                peerFilesList.appendChild(li);
            });
        } catch (error) {
            alert('Error fetching peer files: ' + error);
        }
    } else {
        alert('Please enter a peer IP address.');
    }
});

function updateFileList(sectionId, files) {
    const fileList = document.getElementById(sectionId);
    fileList.innerHTML = '';

    files.forEach((file) => {
        const li = document.createElement('li');
        li.textContent = file;
        fileList.appendChild(li);
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);

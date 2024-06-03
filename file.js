async function checkUrl(url, timeout = 1000) {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchPromise = fetch(url, { signal });

    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetchPromise;
        clearTimeout(timeoutId);
        if (response.ok) {
            return url;
        } else {
            throw new Error('Response not OK');
        }
    } catch (error) {
        return null;
    }
}

async function setUrl(number) {
    let newUrl = `https://raw.githubusercontent.com/vis-nlp/Chart-to-text/main/statista_dataset/dataset/data/${number}.csv`;
    let fallbackUrl = `https://raw.githubusercontent.com/vis-nlp/Chart-to-text/main/statista_dataset/dataset/multicolumn/data/${number}.csv`;

    let validUrl = await checkUrl(newUrl);
    if (!validUrl) {
        validUrl = await checkUrl(fallbackUrl);
    }

    if (validUrl) {
        return validUrl;
    } else {
        console.error('Both URLs are inaccessible');
        return null;
    }
}

const files = [];
for (let i = 1; i <= 8822; i++) {
    files.push(`${i}.vl.json`);
}

const fileSelector = document.getElementById('file-selector');
const textArea = document.getElementById('vega-lite-code');

// Populate the dropdown with filenames
files.forEach(file => {
    const option = document.createElement('option');
    option.value = file;
    option.textContent = file;
    fileSelector.appendChild(option);
});

// Handle file selection
fileSelector.addEventListener('change', async function () {
    const fileName = this.value;
    if (fileName) {
        try {
            const response = await fetch(`../vl_spec/${fileName}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            let vega = data;
            let currentUrl = vega["data"]["url"];
            let match = currentUrl.match(/\/(\d+)\.tsv$/);
            if (match) {
                let number = match[1];
                let newUrl = await setUrl(number);
                if (newUrl) {
                    vega["data"]["url"] = newUrl;
                }
            }
            textArea.value = JSON.stringify(vega, null, 2);
        } catch (error) {
            console.error('Error loading file:', error);
            textArea.value = 'Error loading file content';
        }
    } else {
        textArea.value = '';
    }
});
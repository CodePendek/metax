// API Configuration dengan multiple keys untuk load balancing
const API_CONFIGS = [
    {
        key: "AIzaSyBnpi-ZnhpoXT_wUAMGjuCghrLob6C2p50",
        endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        name: "API Key 1",
        usage: 0,
        lastUsed: 0,
        status: 'unknown'
    },{
    	key: "AIzaSyAJVzovLU0ovc9ydqkRCGbsxBc4CJZZPQg",
    	endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    	name: "API Key 2",
    	usage: 0,
    	lastUsed: 0,
    	status: 'unknown'
    }
];

// Elemen DOM
const imageUpload = document.getElementById('image-upload');
const imagePreviews = document.getElementById('image-previews');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const previewNav = document.querySelector('.preview-nav');
const imageCount = document.querySelector('.image-count');
const currentRange = document.getElementById('current-range');
const totalImages = document.getElementById('total-images');
const generateBtn = document.getElementById('generate-btn');
const loading = document.getElementById('loading');
const progressInfo = document.getElementById('progress-info');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const metadataAll = document.getElementById('metadata-all');
const metadataShutterstock = document.getElementById('metadata-shutterstock');
const metadataAdobestock = document.getElementById('metadata-adobestock');
const metadataVecteezy = document.getElementById('metadata-vecteezy');
const downloadShutterstockBtn = document.getElementById('download-shutterstock');
const downloadAdobestockBtn = document.getElementById('download-adobestock');
const downloadVecteezyBtn = document.getElementById('download-vecteezy');
const downloadAllBtn = document.getElementById('download-all');
const notification = document.getElementById('notification');
const fileCounter = document.querySelector('.file-counter');
const uploadedCount = document.getElementById('uploaded-count');
const maxFiles = document.getElementById('max-files');
const aiStatusDot = document.getElementById('aiStatusDot');
const aiStatusText = document.getElementById('aiStatusText');
const apiStatusList = document.getElementById('api-status-list');
const vectorCheckbox = document.getElementById('vector-checkbox');
const videoCheckbox = document.getElementById('video-checkbox');

// Variabel state
let uploadedImages = [];
let currentMetadata = [];
let currentIndex = 0;
const MAX_FILES = 20;
const IMAGESPERPAGE = 12;

// Load balancer untuk API
class APILoadBalancer {
    constructor(configs) {
        this.apis = [...configs];
        this.currentIndex = 0;
    }

    // Mendapatkan API dengan penggunaan terendah dan status baik
    getNextAPI() {
        const availableAPIs = this.apis.filter(api => api.status === 'ready');
        
        if (availableAPIs.length === 0) {
            // Jika tidak ada API yang ready, gunakan yang unknown
            const unknownAPIs = this.apis.filter(api => api.status === 'unknown');
            if (unknownAPIs.length > 0) {
                return unknownAPIs[0];
            }
            return this.apis[0]; // Fallback
        }

        // Urutkan berdasarkan penggunaan terendah dan waktu terakhir digunakan
        availableAPIs.sort((a, b) => {
            if (a.usage !== b.usage) {
                return a.usage - b.usage;
            }
            return a.lastUsed - b.lastUsed;
        });

        return availableAPIs[0];
    }

    // Update penggunaan API
    updateUsage(apiKey) {
        const api = this.apis.find(a => a.key === apiKey);
        if (api) {
            api.usage++;
            api.lastUsed = Date.now();
        }
    }

    // Update status API
    updateStatus(apiKey, status) {
        const api = this.apis.find(a => a.key === apiKey);
        if (api) {
            api.status = status;
        }
    }

    // Reset usage counter (bisa dipanggil setiap jam)
    resetUsage() {
        this.apis.forEach(api => {
            api.usage = 0;
        });
    }
}

const loadBalancer = new APILoadBalancer(API_CONFIGS);

// Tampilkan notifikasi
function showNotification(message, isError = false) {
	notification.innerHTML = `
        <div class="alert ${isError ? 'alert-error' : 'alert-info'}">
            <span>${message}</span>
        </div>
    `;
	notification.classList.remove('hidden');
	
	setTimeout(() => {
		notification.classList.add('hidden');
	}, 3000);
}

// Update status API display
function updateAPIStatusDisplay() {
    apiStatusList.innerHTML = '';
    
    API_CONFIGS.forEach(api => {
        const statusItem = document.createElement('div');
        statusItem.className = 'api-status-item';
        
        const statusClass = api.status === 'ready' ? 'ai-ready' : 
                          api.status === 'bandwidth' ? 'ai-bandwidth' : 'ai-inactive';
        
        statusItem.innerHTML = `
            <div class="api-status-info">
                <span class="status-indicator ${statusClass}" style="position: static; margin: 0;"></span>
                <span class="api-status-text">${api.name}: ${getStatusText(api.status)}</span>
            </div>
            <span class="api-usage-count">Used: ${api.usage}</span>
        `;
        
        apiStatusList.appendChild(statusItem);
    });
}

function getStatusText(status) {
    switch(status) {
        case 'ready': return 'Ready';
        case 'bandwidth': return 'Bandwidth Full';
        case 'inactive': return 'Inactive';
        default: return 'Checking...';
    }
}

// Get filename with extension based on content type
function getFilenameWithExtension(originalName, isVector, isVideo) {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
    
    if (isVector) {
        return nameWithoutExt + ".eps";
    } else if (isVideo) {
        return nameWithoutExt + ".mp4";
    }
    
    return originalName; // Keep original extension
}

// Update counter file
function updateFileCounter() {
    uploadedCount.textContent = uploadedImages.length;
    maxFiles.textContent = MAX_FILES;
    
    if (uploadedImages.length > 0) {
        fileCounter.classList.remove('hidden');
    } else {
        fileCounter.classList.add('hidden');
    }
}

// Update tampilan navigasi gambar
function updatePreviewNavigation() {
    if (uploadedImages.length <= IMAGESPERPAGE) {
        previewNav.classList.add('hidden');
        imageCount.classList.add('hidden');
        return;
    }
    
    previewNav.classList.remove('hidden');
    imageCount.classList.remove('hidden');
    
    const start = currentIndex + 1;
    const end = Math.min(currentIndex + IMAGESPERPAGE, uploadedImages.length);
    currentRange.textContent = `${start}-${end}`;
    totalImages.textContent = uploadedImages.length;
    
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex + IMAGESPERPAGE >= uploadedImages.length;
}

// Update status indicator
function updateStatusIndicator(index, status) {
    const previewItems = document.querySelectorAll('.preview-item');
    if (previewItems[index]) {
        const indicator = previewItems[index].querySelector('.status-indicator');
        if (indicator) {
            indicator.className = `status-indicator status-${status}`;
        }
    }
}

// Tampilkan gambar yang diunggah
function displayImages() {
    imagePreviews.innerHTML = '';
    
    const end = Math.min(currentIndex + IMAGESPERPAGE, uploadedImages.length);
    
    for (let i = currentIndex; i < end; i++) {
        const image = uploadedImages[i];
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
            <img class="w-24 rounded-sm shadow-sm" src="${image.preview}" alt="Preview">
            <div class="file-name w-24 h-xs overflow-hidden text-xs">${image.originalName}</div>
            <div class="status-indicator status-ready"></div>
        `;
        imagePreviews.appendChild(previewItem);
    }
    
    updatePreviewNavigation();
    updateFileCounter();
}

// Preview gambar yang diunggah
imageUpload.addEventListener('change', function(event) {
    const files = event.target.files;
    if (!files.length) return;
    
    const limitedFiles = Array.from(files).slice(0, MAX_FILES);
    
    uploadedImages = [];
    currentIndex = 0;
    
    metadataAll.value = '';
    metadataShutterstock.value = '';
    metadataAdobestock.value = '';
    metadataVecteezy.value = '';
    currentMetadata = [];
    
    limitedFiles.forEach((file, index) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            uploadedImages.push({
                originalName: file.name,
                base64: e.target.result.split(',')[1],
                preview: e.target.result,
                type: file.type,
                file: file
            });
            
            if (uploadedImages.length === limitedFiles.length) {
                displayImages();
            }
        };
        
        reader.onerror = function() {
            console.error('Error reading file:', file.name);
        };
        
        reader.readAsDataURL(file);
    });
    
    if (limitedFiles.length < files.length) {
        showNotification(`Hanya ${MAX_FILES} gambar pertama yang diproses.`, true);
    }
});

// Navigasi gambar
prevBtn.addEventListener('click', function() {
    if (currentIndex > 0) {
        currentIndex -= IMAGESPERPAGE;
        displayImages();
    }
});

nextBtn.addEventListener('click', function() {
    if (currentIndex + IMAGESPERPAGE < uploadedImages.length) {
        currentIndex += IMAGESPERPAGE;
        displayImages();
    }
});

// Tab navigation
tabs.forEach(tab => {
	tab.addEventListener('click', function() {
		const tabId = this.getAttribute('data-tab');
		
		// Reset semua tab
		tabs.forEach(t => t.classList.remove('tab-active'));
		this.classList.add('tab-active');
		
		// Sembunyikan semua textarea
		metadataAll.classList.add('hidden');
		metadataShutterstock.classList.add('hidden');
		metadataAdobestock.classList.add('hidden');
		metadataVecteezy.classList.add('hidden');
		
		// Tampilkan textarea sesuai tab
		if (tabId === 'all') metadataAll.classList.remove('hidden');
		if (tabId === 'shutterstock') metadataShutterstock.classList.remove('hidden');
		if (tabId === 'adobestock') metadataAdobestock.classList.remove('hidden');
		if (tabId === 'vecteezy') metadataVecteezy.classList.remove('hidden');
	});
});

// Fungsi untuk mengirim gambar ke API AI dengan load balancing
async function processImageWithLoadBalancing(image, retryCount = 0) {
    const maxRetries = API_CONFIGS.length;
    
    if (retryCount >= maxRetries) {
        throw new Error('All APIs failed or unavailable');
    }

    const api = loadBalancer.getNextAPI();
    const isVector = vectorCheckbox.checked;
    const isVideo = videoCheckbox.checked;
    
    const promptText = `Generate compelling microstock metadata that will attract buyers and increase sales potential. Use a CSV-like format with exactly four columns: filename,title,description,keywords. All text must be in commercial English.

filename: [nama_file] (use this exact filename without modification)

title: Create a concise, engaging title (50-70 characters) that highlights the main subject, action, and context. Include commercial appeal and potential use cases. Focus on clarity and searchability.

description: Write a detailed description (150-200 characters) that tells a story about the image. Include:
- Main subjects and their actions
- Color palette and composition
- Mood and atmosphere
- Potential commercial applications (e.g., website design, advertising, editorial content)
- Technical details if relevant (e.g., isolated object, copy space)
- Do NOT mention that it's a vector illustration if vector option is selected
-DO NOT include any special characters, symbols, emojis, quotation marks, hyphens, or parentheses - use only standard letters (A-Z, a-z), numbers (0-9), commas, periods, and spaces.

keywords: Provide 25-35 highly relevant, buyer-focused keywords including:
- Primary subjects and actions
- Styles and concepts
- Industries and use cases
- Synonyms and alternative phrases
- Long-tail keywords for better discoverability
- EXCLUDE the word "vector" completely if vector option is selected
- Format as comma-separated values without numbers or bullets

Example Format:
[nama_file],"Professional business team collaborating in modern office","Diverse group of professionals working together at conference table in bright contemporary office space with natural lighting, suitable for business concepts, teamwork, and corporate communications","business, team, meeting, office, collaboration, professionals, diversity, conference, discussion, workplace, strategy, planning, success, partnership, leadership, corporate, communication, modern, interior, daylight"

Do NOT include any additional text, explanations, or disclaimers. Output only the single line of metadata exactly as specified.`;

    try {
        const requestBody = {
            contents: [{
                parts: [
                    { text: promptText },
                    {
                        inline_data: {
                            mime_type: image.type || "image/jpeg",
                            data: image.base64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        };

        const response = await fetch(`${api.endpoint}?key=${api.key}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            if (response.status === 429) {
                loadBalancer.updateStatus(api.key, 'bandwidth');
                updateAPIStatusDisplay();
                return await processImageWithLoadBalancing(image, retryCount + 1);
            } else if (response.status >= 500) {
                loadBalancer.updateStatus(api.key, 'inactive');
                updateAPIStatusDisplay();
                return await processImageWithLoadBalancing(image, retryCount + 1);
            }
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            throw new Error("Unexpected API response format");
        }

        // API berhasil, update status dan usage
        loadBalancer.updateStatus(api.key, 'ready');
        loadBalancer.updateUsage(api.key);
        updateAPIStatusDisplay();
        
        return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
        console.error(`Error with API ${api.name}:`, error);
        
        if (retryCount < maxRetries - 1) {
            loadBalancer.updateStatus(api.key, 'inactive');
            updateAPIStatusDisplay();
            return await processImageWithLoadBalancing(image, retryCount + 1);
        }
        
        throw error;
    }
}

// Fungsi untuk mengurai metadata dari output AI
function parseMetadata(metadataText, targetFilename) {
    const cleanText = metadataText.replace(/```csv|```/g, '').trim();
    const lines = cleanText.split('\n');
    let dataLine = '';
    
    for (const line of lines) {
        if (line.includes(targetFilename) || line.startsWith(targetFilename)) {
            dataLine = line;
            break;
        }
    }
    
    if (!dataLine && lines.length > 0) {
        dataLine = lines[0];
    }
    
    if (!dataLine) return null;
    
    const regex = /(?:,|^)(?:"([^"]*)"|([^",]*))/g;
    let matches;
    const fields = [];
    
    while ((matches = regex.exec(dataLine)) !== null) {
        const value = matches[1] || matches[2] || '';
        fields.push(value.trim());
    }
    
    while (fields.length < 4) {
        fields.push('');
    }
    
    return {
        filename: targetFilename,
        title: fields[1] || 'No title generated',
        description: fields[2] || 'No description generated',
        keywords: fields[3] || 'keywords'
    };
}

// Fungsi untuk mendownload file CSV
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Fungsi untuk membuat konten CSV Shutterstock
function createShutterstockCSV(metadataArray) {
    let csvContent = 'filename,description,keywords\n';
    metadataArray.forEach(meta => {
        csvContent += `"${meta.filename}","${meta.description}","${meta.keywords}"\n`;
    });
    return csvContent;
}

// Fungsi untuk membuat konten CSV Adobe Stock
function createAdobestockCSV(metadataArray) {
    let csvContent = 'filename,title,keywords\n';
    metadataArray.forEach(meta => {
        csvContent += `"${meta.filename}","${meta.description}","${meta.keywords}"\n`;
    });
    return csvContent;
}

// Fungsi untuk membuat konten CSV Vecteezy
function createVecteezyCSV(metadataArray) {
    let csvContent = 'filename,title,keywords\n';
    metadataArray.forEach(meta => {
        csvContent += `"${meta.filename}","${meta.description}","${meta.keywords}"\n`;
    });
    return csvContent;
}

// Update semua tab metadata
function updateAllMetadataTabs() {
    if (!currentMetadata.length) return;
    
    let allContent = 'filename,title,description,keywords\n';
    currentMetadata.forEach(meta => {
        allContent += `"${meta.filename}","${meta.title}","${meta.description}","${meta.keywords}"\n`;
    });
    metadataAll.value = allContent;
    
    metadataShutterstock.value = createShutterstockCSV(currentMetadata);
    metadataAdobestock.value = createAdobestockCSV(currentMetadata);
    metadataVecteezy.value = createVecteezyCSV(currentMetadata);
}

// Check status semua API
async function checkAllAPIStatus() {
    const statusPromises = API_CONFIGS.map(async (api) => {
        try {
            const res = await fetch(`${api.endpoint}?key=${api.key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] })
            });
            
            if (res.ok) {
                loadBalancer.updateStatus(api.key, 'ready');
            } else if (res.status === 429) {
                loadBalancer.updateStatus(api.key, 'bandwidth');
            } else {
                loadBalancer.updateStatus(api.key, 'inactive');
            }
        } catch (error) {
            loadBalancer.updateStatus(api.key, 'inactive');
            console.error(`API ${api.name} check failed:`, error);
        }
    });

    await Promise.all(statusPromises);
    
    // Update overall status
    const readyAPIs = API_CONFIGS.filter(api => api.status === 'ready');
    const bandwidthAPIs = API_CONFIGS.filter(api => api.status === 'bandwidth');
    
    if (readyAPIs.length > 0) {
        aiStatusDot.className = 'status-indicator ai-ready';
        aiStatusText.textContent = `AI Status: ${readyAPIs.length} API(s) Ready`;
        generateBtn.disabled = false;
    } else if (bandwidthAPIs.length > 0) {
        aiStatusDot.className = 'status-indicator ai-bandwidth';
        aiStatusText.textContent = 'AI Status: All APIs at bandwidth limit';
        generateBtn.disabled = true;
    } else {
        aiStatusDot.className = 'status-indicator ai-inactive';
        aiStatusText.textContent = 'AI Status: All APIs inactive';
        generateBtn.disabled = true;
    }
    
    updateAPIStatusDisplay();
}

// Initial API status check
checkAllAPIStatus();

// Auto-refresh API status every 5 minutes
setInterval(checkAllAPIStatus, 5 * 60 * 1000);

// Auto-reset usage counter every hour
setInterval(() => {
    loadBalancer.resetUsage();
    updateAPIStatusDisplay();
}, 60 * 60 * 1000);

// Event listener untuk tombol generate
generateBtn.addEventListener('click', async function() {
    if (!uploadedImages.length) {
        showNotification('Silakan unggah gambar terlebih dahulu.', true);
        return;
    }

    generateBtn.disabled = true;
    loading.classList.remove('hidden');
    metadataAll.value = 'filename,title,description,keywords\n\nMemproses gambar...';

    const isVector = vectorCheckbox.checked;
    const isVideo = videoCheckbox.checked;

    try {
        currentMetadata = [];
        
        for (let i = 0; i < uploadedImages.length; i++) {
            const image = uploadedImages[i];
            progressInfo.textContent = `${i} dari ${uploadedImages.length} gambar selesai`;
            metadataAll.value = `filename,title,description,keywords\n\nMemproses gambar ${i+1} dari ${uploadedImages.length}...`;
            
            updateStatusIndicator(i, 'processing');
            
            try {
                const aiResponse = await processImageWithLoadBalancing(image);
                const targetFilename = getFilenameWithExtension(image.originalName, isVector, isVideo);
                const metadata = parseMetadata(aiResponse, targetFilename);
                
                if (metadata) {
                    currentMetadata.push(metadata);
                    updateStatusIndicator(i, 'ready');
                } else {
                    currentMetadata.push({
                        filename: targetFilename,
                        title: 'No title generated',
                        description: 'No description generated',
                        keywords: 'keywords'
                    });
                    updateStatusIndicator(i, 'error');
                }
            } catch (error) {
                console.error(`Error processing image ${image.originalName}:`, error);
                const targetFilename = getFilenameWithExtension(image.originalName, isVector, isVideo);
                currentMetadata.push({
                    filename: targetFilename,
                    title: 'Error: Could not generate title',
                    description: 'Error: Could not generate description',
                    keywords: 'error, processing, failed'
                });
                updateStatusIndicator(i, 'error');
            }
        }
        
        progressInfo.textContent = `${uploadedImages.length} dari ${uploadedImages.length} gambar selesai`;
        updateAllMetadataTabs();
        showNotification(`Berhasil membuat metadata untuk ${uploadedImages.length} gambar.`);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan saat memproses gambar.', true);
        metadataAll.value = `filename,title,description,keywords\n\nError: ${error.message}`;
    } finally {
        loading.classList.add('hidden');
        generateBtn.disabled = false;
    }
});

// Event listener untuk tombol download
[downloadShutterstockBtn, downloadAdobestockBtn, downloadVecteezyBtn, downloadAllBtn].forEach(btn => {
    btn.addEventListener('click', function() {
        if (!currentMetadata.length) {
            showNotification('Silakan generate metadata terlebih dahulu.', true);
            return;
        }
    });
});

downloadShutterstockBtn.addEventListener('click', function() {
    const csvContent = createShutterstockCSV(currentMetadata);
    downloadCSV(csvContent, 'shutterstock_metadata.csv');
    showNotification('File Shutterstock CSV berhasil didownload.');
});

downloadAdobestockBtn.addEventListener('click', function() {
    const csvContent = createAdobestockCSV(currentMetadata);
    downloadCSV(csvContent, 'adobestock_metadata.csv');
    showNotification('File Adobe Stock CSV berhasil didownload.');
});

downloadVecteezyBtn.addEventListener('click', function() {
    const csvContent = createVecteezyCSV(currentMetadata);
    downloadCSV(csvContent, 'vecteezy_metadata.csv');
    showNotification('File Vecteezy CSV berhasil didownload.');
});

downloadAllBtn.addEventListener('click', function() {
    downloadCSV(createShutterstockCSV(currentMetadata), 'shutterstock_metadata.csv');
    downloadCSV(createAdobestockCSV(currentMetadata), 'adobestock_metadata.csv');
    downloadCSV(createVecteezyCSV(currentMetadata), 'vecteezy_metadata.csv');
    showNotification('Semua file CSV berhasil didownload.');
});

// Checkbox event listeners untuk mencegah konflik
vectorCheckbox.addEventListener('change', function() {
    if (this.checked) {
        videoCheckbox.checked = false;
    }
});

videoCheckbox.addEventListener('change', function() {
    if (this.checked) {
        vectorCheckbox.checked = false;
    }
});
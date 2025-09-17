// API Configuration untuk load balancing
const API_CONFIGS = [
    {
        key: "AIzaSyBnpi-ZnhpoXT_wUAMGjuCghrLob6C2p50",
        endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        name: "API Key 1",
        usage: 0,
        lastUsed: 0,
        status: 'unknown'
    },
    {
        key: "AIzaSyAJVzovLU0ovc9ydqkRCGbsxBc4CJZZPQg",
        endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        name: "API Key 2",
        usage: 0,
        lastUsed: 0,
        status: 'unknown'
    },
    {
        key: "AIzaSyCoAEasOlOC9fwKgGrh2zfU2kgRDtjO4XA",
        endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        name: "API Key 3",
        usage: 0,
        lastUsed: 0,
        status: 'unknown'
    },
    {
        key: "AIzaSyDUG7Eq3zvQ5roZVcoW3MsEDod71YDGp4M",
        endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        name: "API Key 4",
        usage: 0,
        lastUsed: 0,
        status: 'unknown'
    },
    {
        key: "AIzaSyDmsapmQeHkBHnaKfrwgiu_esa2Nvdc-CQ",
        endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        name: "API Key 5",
        usage: 0,
        lastUsed: 0,
        status: 'unknown'
    }
];

// DOM Elements
const imageUpload = document.getElementById('image-upload');
const imagePreviews = document.getElementById('image-previews');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const previewNav = document.querySelector('.preview-nav');
const imageCount = document.querySelector('.image-count');
const currentRange = document.getElementById('current-range');
const totalImages = document.getElementById('total-images');
const generateBtn = document.getElementById('generate-btn');
const downloadModalBtn = document.getElementById('download-modal-btn');
const loading = document.getElementById('loading');
const progressInfo = document.getElementById('progress-info');
const metadataTableBody = document.getElementById('metadata-table-body');
const mobileMetadataCards = document.getElementById('mobile-metadata-cards');
const mobileTabs = document.getElementById('mobile-tabs');
const mobileOverview = document.getElementById('mobile-overview');
const mobileDetails = document.getElementById('mobile-details');
const mobileKeywords = document.getElementById('mobile-keywords');

// Modal elements
const modalTotalFiles = document.getElementById('modal-total-files');
const modalAvgKeywords = document.getElementById('modal-avg-keywords');
const modalQualityScore = document.getElementById('modal-quality-score');
const modalDownloadShutterstock = document.getElementById('modal-download-shutterstock');
const modalDownloadAdobestock = document.getElementById('modal-download-adobestock');
const modalDownloadVecteezy = document.getElementById('modal-download-vecteezy');
const modalDownloadAll = document.getElementById('modal-download-all');
const togglePreview = document.getElementById('toggle-preview');
const modalPreview = document.getElementById('modal-preview');
const previewContent = document.getElementById('preview-content');

const notification = document.getElementById('notification');
const fileCounter = document.querySelector('.file-counter');
const uploadedCount = document.getElementById('uploaded-count');
const maxFiles = document.getElementById('max-files');
const aiStatusDot = document.getElementById('aiStatusDot');
const aiStatusText = document.getElementById('aiStatusText');
const apiStatusList = document.getElementById('api-status-list');
const vectorCheckbox = document.getElementById('vector-checkbox');
const videoCheckbox = document.getElementById('video-checkbox');

// State variables
let uploadedImages = [];
let currentMetadata = [];
let currentIndex = 0;
const MAX_FILES = 20;
const IMAGES_PER_PAGE = 12;

// Load balancer class untuk API management
class APILoadBalancer {
    constructor(configs) {
        this.apis = [...configs];
        this.currentIndex = 0;
    }

    getNextAPI() {
        const availableAPIs = this.apis.filter(api => api.status === 'ready');
        
        if (availableAPIs.length === 0) {
            const unknownAPIs = this.apis.filter(api => api.status === 'unknown');
            if (unknownAPIs.length > 0) {
                return unknownAPIs[0];
            }
            return this.apis[0];
        }

        availableAPIs.sort((a, b) => {
            if (a.usage !== b.usage) {
                return a.usage - b.usage;
            }
            return a.lastUsed - b.lastUsed;
        });

        return availableAPIs[0];
    }

    updateUsage(apiKey) {
        const api = this.apis.find(a => a.key === apiKey);
        if (api) {
            api.usage++;
            api.lastUsed = Date.now();
        }
    }

    updateStatus(apiKey, status) {
        const api = this.apis.find(a => a.key === apiKey);
        if (api) {
            api.status = status;
        }
    }

    resetUsage() {
        this.apis.forEach(api => {
            api.usage = 0;
        });
    }
}

const loadBalancer = new APILoadBalancer(API_CONFIGS);

// Utility functions
function showNotification(message, isError = false) {
    notification.innerHTML = `<div class="alert ${isError ? 'alert-error' : 'alert-info'}">
        <span>${message}</span>
    </div>`;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

function updateAPIStatusDisplay() {
    apiStatusList.innerHTML = '';
    
    API_CONFIGS.forEach(api => {
        const statusItem = document.createElement('div');
        statusItem.className = 'api-status-item flex justify-between items-center mb-2';
        
        const statusClass = api.status === 'ready' ? 'ai-ready' :
                          api.status === 'bandwidth' ? 'ai-bandwidth' : 'ai-inactive';
        
        statusItem.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="status-indicator ${statusClass}" style="position: static; width: 12px; height: 12px;"></span>
                <span class="text-sm">${api.name}: ${getStatusText(api.status)}</span>
            </div>
            <span class="text-xs">Used: ${api.usage}</span>
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

// Fungsi untuk menghitung jumlah keyword
function countKeywords(keywordString) {
    if (!keywordString || keywordString.trim() === '') return 0;
    
    // Split by comma dan hitung yang tidak kosong
    const keywords = keywordString.split(',')
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0);
    
    return keywords.length;
}

function getFilenameWithExtension(originalName, isVector, isVideo) {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
    
    if (isVector) {
        return nameWithoutExt + ".eps";
    } else if (isVideo) {
        return nameWithoutExt + ".mp4";
    }
    
    return originalName;
}

function updateFileCounter() {
    uploadedCount.textContent = uploadedImages.length;
    maxFiles.textContent = MAX_FILES;
    
    if (uploadedImages.length > 0) {
        fileCounter.classList.remove('hidden');
    } else {
        fileCounter.classList.add('hidden');
    }
}

function updatePreviewNavigation() {
    if (uploadedImages.length <= IMAGES_PER_PAGE) {
        previewNav.classList.add('hidden');
        imageCount.classList.add('hidden');
        return;
    }
    
    previewNav.classList.remove('hidden');
    imageCount.classList.remove('hidden');
    
    const start = currentIndex + 1;
    const end = Math.min(currentIndex + IMAGES_PER_PAGE, uploadedImages.length);
    currentRange.textContent = `${start}-${end}`;
    totalImages.textContent = uploadedImages.length;
    
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex + IMAGES_PER_PAGE >= uploadedImages.length;
}

function updateStatusIndicator(index, status) {
    const previewItems = document.querySelectorAll('.preview-item');
    if (previewItems[index]) {
        const indicator = previewItems[index].querySelector('.status-indicator');
        if (indicator) {
            indicator.className = `status-indicator status-${status}`;
        }
    }
}

function displayImages() {
    imagePreviews.innerHTML = '';
    
    const end = Math.min(currentIndex + IMAGES_PER_PAGE, uploadedImages.length);
    
    for (let i = currentIndex; i < end; i++) {
        const image = uploadedImages[i];
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
            <img class="w-24 h-24 object-cover rounded-sm shadow-sm" src="${image.preview}" alt="Preview">
            <div class="file-name w-24 text-xs mt-1 truncate">${image.originalName}</div>
            <div class="status-indicator status-ready"></div>
        `;
        imagePreviews.appendChild(previewItem);
    }
    
    updatePreviewNavigation();
    updateFileCounter();
}

function updateMetadataTable() {
    if (currentMetadata.length === 0) {
        // Desktop table
        metadataTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-gray-500 py-8">
                    Upload gambar dan generate metadata untuk melihat preview
                </td>
            </tr>
        `;
        
        // Mobile cards
        mobileMetadataCards.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                Upload gambar dan generate metadata untuk melihat preview
            </div>
        `;
        
        mobileTabs.style.display = 'none';
        downloadModalBtn.disabled = true;
        return;
    }
    
    // Enable download button
    downloadModalBtn.disabled = false;
    
    // Update desktop table
    metadataTableBody.innerHTML = '';
    
    currentMetadata.forEach((meta, index) => {
        const keywordCount = countKeywords(meta.keywords);
        const row = document.createElement('tr');
        row.innerHTML = `
            <th class="text-xs">${index + 1}</th>
            <td class="font-mono text-xs truncate max-w-32" title="${meta.filename}">${meta.filename}</td>
            <td class="text-xs truncate max-w-48" title="${meta.title}">${meta.title}</td>
            <td class="text-xs truncate max-w-64" title="${meta.description}">${meta.description}</td>
            <td class="text-center text-xs font-semibold ${keywordCount < 25 ? 'text-red-500' : keywordCount > 35 ? 'text-orange-500' : 'text-green-500'}">${keywordCount}</td>
            <td class="text-xs">
                <div class="max-h-16 overflow-y-auto text-xs" title="${meta.keywords}">${meta.keywords}</div>
            </td>
        `;
        metadataTableBody.appendChild(row);
    });
    
    // Update mobile cards
    updateMobileCards();
    mobileTabs.style.display = 'block';
}

function updateModalStats() {
    if (currentMetadata.length === 0) return;
    
    const totalFiles = currentMetadata.length;
    const avgKeywords = Math.round(
        currentMetadata.reduce((acc, meta) => acc + countKeywords(meta.keywords), 0) / totalFiles
    );
    
    // Calculate quality score based on optimal keyword range (25-35)
    const optimalCount = currentMetadata.filter(meta => {
        const count = countKeywords(meta.keywords);
        return count >= 25 && count <= 35;
    }).length;
    const qualityScore = Math.round((optimalCount / totalFiles) * 100);
    
    modalTotalFiles.textContent = totalFiles;
    modalAvgKeywords.textContent = avgKeywords;
    modalQualityScore.textContent = `${qualityScore}%`;
    
    // Update modal quality score color
    const scoreElement = document.getElementById('modal-quality-score');
    if (qualityScore >= 80) {
        scoreElement.className = 'stat-value text-lg text-success';
    } else if (qualityScore >= 60) {
        scoreElement.className = 'stat-value text-lg text-warning';
    } else {
        scoreElement.className = 'stat-value text-lg text-error';
    }
}

function updateMobileCards() {
    mobileMetadataCards.innerHTML = '';
    
    currentMetadata.forEach((meta, index) => {
        const keywordCount = countKeywords(meta.keywords);
        const card = document.createElement('div');
        card.className = 'metadata-card';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="font-semibold text-sm">#${index + 1}</span>
                <span class="badge badge-sm ${keywordCount < 25 ? 'badge-error' : keywordCount > 35 ? 'badge-warning' : 'badge-success'}">${keywordCount} keywords</span>
            </div>
            <div class="font-mono text-xs mb-2 text-primary">${meta.filename}</div>
            <div class="text-sm font-medium mb-2">${meta.title}</div>
            <div class="text-xs text-gray-600 mb-3 truncate-3-lines">${meta.description}</div>
            <div class="keywords-scroll">
                <div class="flex flex-wrap gap-1">
                    ${meta.keywords.split(',').slice(0, 10).map(keyword => 
                        `<span class="badge badge-xs badge-ghost">${keyword.trim()}</span>`
                    ).join('')}
                    ${meta.keywords.split(',').length > 10 ? `<span class="text-xs text-gray-500">+${meta.keywords.split(',').length - 10} more</span>` : ''}
                </div>
            </div>
        `;
        mobileMetadataCards.appendChild(card);
    });
    
    updateMobileTabs();
}

function updateMobileTabs() {
    if (currentMetadata.length === 0) return;
    
    // Overview tab
    mobileOverview.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div class="stat bg-base-200 rounded-lg p-3">
                <div class="stat-title text-xs">Total Images</div>
                <div class="stat-value text-lg">${currentMetadata.length}</div>
            </div>
            <div class="stat bg-base-200 rounded-lg p-3">
                <div class="stat-title text-xs">Avg Keywords</div>
                <div class="stat-value text-lg">${Math.round(currentMetadata.reduce((acc, meta) => acc + countKeywords(meta.keywords), 0) / currentMetadata.length)}</div>
            </div>
        </div>
        <div class="mt-4">
            <div class="text-sm font-semibold mb-2">Quality Status:</div>
            <div class="space-y-2">
                <div class="flex justify-between">
                    <span class="text-xs">Optimal (25-35 keywords)</span>
                    <span class="text-green-500 font-semibold">${currentMetadata.filter(meta => {
                        const count = countKeywords(meta.keywords);
                        return count >= 25 && count <= 35;
                    }).length}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-xs">Too few (&lt;25 keywords)</span>
                    <span class="text-red-500 font-semibold">${currentMetadata.filter(meta => countKeywords(meta.keywords) < 25).length}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-xs">Too many (&gt;35 keywords)</span>
                    <span class="text-orange-500 font-semibold">${currentMetadata.filter(meta => countKeywords(meta.keywords) > 35).length}</span>
                </div>
            </div>
        </div>
    `;
    
    // Details tab
    mobileDetails.innerHTML = `
        <div class="space-y-3">
            ${currentMetadata.map((meta, index) => `
                <div class="bg-base-200 rounded-lg p-3">
                    <div class="font-semibold text-sm mb-1">#${index + 1} - ${meta.filename}</div>
                    <div class="text-xs mb-2"><strong>Title:</strong> ${meta.title}</div>
                    <div class="text-xs"><strong>Description:</strong> ${meta.description}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Keywords tab
    mobileKeywords.innerHTML = `
        <div class="space-y-3">
            ${currentMetadata.map((meta, index) => `
                <div class="bg-base-200 rounded-lg p-3">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-semibold text-sm">#${index + 1}</span>
                        <span class="badge badge-sm ${countKeywords(meta.keywords) < 25 ? 'badge-error' : countKeywords(meta.keywords) > 35 ? 'badge-warning' : 'badge-success'}">${countKeywords(meta.keywords)}</span>
                    </div>
                    <div class="flex flex-wrap gap-1">
                        ${meta.keywords.split(',').map(keyword => 
                            `<span class="badge badge-xs badge-ghost">${keyword.trim()}</span>`
                        ).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Image upload handler
imageUpload.addEventListener('change', function(event) {
    const files = event.target.files;
    if (!files.length) return;
    
    const limitedFiles = Array.from(files).slice(0, MAX_FILES);
    
    uploadedImages = [];
    currentIndex = 0;
    currentMetadata = [];
    
    updateMetadataTable();
    
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

// Navigation handlers
prevBtn.addEventListener('click', function() {
    if (currentIndex > 0) {
        currentIndex -= IMAGES_PER_PAGE;
        displayImages();
    }
});

nextBtn.addEventListener('click', function() {
    if (currentIndex + IMAGES_PER_PAGE < uploadedImages.length) {
        currentIndex += IMAGES_PER_PAGE;
        displayImages();
    }
});

// AI processing function
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
- DO NOT include any special characters, symbols, emojis, quotation marks, hyphens, or parentheses - use only standard letters (A-Z, a-z), numbers (0-9), commas, periods, and spaces.

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

function createShutterstockCSV(metadataArray) {
    let csvContent = 'filename,description,keywords\n';
    metadataArray.forEach(meta => {
        csvContent += `"${meta.filename}","${meta.description}","${meta.keywords}"\n`;
    });
    return csvContent;
}

function createAdobestockCSV(metadataArray) {
    let csvContent = 'filename,title,keywords\n';
    metadataArray.forEach(meta => {
        csvContent += `"${meta.filename}","${meta.description}","${meta.keywords}"\n`;
    });
    return csvContent;
}

function createVecteezyCSV(metadataArray) {
    let csvContent = 'filename,title,keywords\n';
    metadataArray.forEach(meta => {
        csvContent += `"${meta.filename}","${meta.description}","${meta.keywords}"\n`;
    });
    return csvContent;
}

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

    const readyAPIs = API_CONFIGS.filter(api => api.status === 'ready');
    const bandwidthAPIs = API_CONFIGS.filter(api => api.status === 'bandwidth');

    if (readyAPIs.length > 0) {
        aiStatusDot.className = 'w-4 h-4 rounded-full border border-white shadow ai-ready';
        aiStatusText.textContent = `AI Status: ${readyAPIs.length} API(s) Ready`;
        generateBtn.disabled = false;
    } else if (bandwidthAPIs.length > 0) {
        aiStatusDot.className = 'w-4 h-4 rounded-full border border-white shadow ai-bandwidth';
        aiStatusText.textContent = 'AI Status: All APIs at bandwidth limit';
        generateBtn.disabled = true;
    } else {
        aiStatusDot.className = 'w-4 h-4 rounded-full border border-white shadow ai-inactive';
        aiStatusText.textContent = 'AI Status: All APIs inactive';
        generateBtn.disabled = true;
    }

    updateAPIStatusDisplay();
}

// Generate metadata event handler
generateBtn.addEventListener('click', async function() {
    if (!uploadedImages.length) {
        showNotification('Silakan unggah gambar terlebih dahulu.', true);
        return;
    }
    
    generateBtn.disabled = true;
    loading.classList.remove('hidden');
    
    const isVector = vectorCheckbox.checked;
    const isVideo = videoCheckbox.checked;
    
    try {
        currentMetadata = [];
        
        for (let i = 0; i < uploadedImages.length; i++) {
            const image = uploadedImages[i];
            progressInfo.textContent = `${i} dari ${uploadedImages.length} gambar selesai`;
            
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
            
            // Update table after each processed image
            updateMetadataTable();
            updateModalStats();
        }
        
        progressInfo.textContent = `${uploadedImages.length} dari ${uploadedImages.length} gambar selesai`;
        showNotification(`Berhasil membuat metadata untuk ${uploadedImages.length} gambar.`);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan saat memproses gambar.', true);
    } finally {
        loading.classList.add('hidden');
        generateBtn.disabled = false;
    }
});

// Modal download event handlers
modalDownloadShutterstock.addEventListener('click', function() {
    if (!currentMetadata.length) {
        showNotification('Silakan generate metadata terlebih dahulu.', true);
        return;
    }
    const csvContent = createShutterstockCSV(currentMetadata);
    downloadCSV(csvContent, 'shutterstock_metadata.csv');
    showNotification('File Shutterstock CSV berhasil didownload.');
});

modalDownloadAdobestock.addEventListener('click', function() {
    if (!currentMetadata.length) {
        showNotification('Silakan generate metadata terlebih dahulu.', true);
        return;
    }
    const csvContent = createAdobestockCSV(currentMetadata);
    downloadCSV(csvContent, 'adobestock_metadata.csv');
    showNotification('File Adobe Stock CSV berhasil didownload.');
});

modalDownloadVecteezy.addEventListener('click', function() {
    if (!currentMetadata.length) {
        showNotification('Silakan generate metadata terlebih dahulu.', true);
        return;
    }
    const csvContent = createVecteezyCSV(currentMetadata);
    downloadCSV(csvContent, 'vecteezy_metadata.csv');
    showNotification('File Vecteezy CSV berhasil didownload.');
});

modalDownloadAll.addEventListener('click', function() {
    if (!currentMetadata.length) {
        showNotification('Silakan generate metadata terlebih dahulu.', true);
        return;
    }
    
    // Download all formats dengan delay
    downloadCSV(createShutterstockCSV(currentMetadata), 'shutterstock_metadata.csv');
    setTimeout(() => {
        downloadCSV(createAdobestockCSV(currentMetadata), 'adobestock_metadata.csv');
    }, 100);
    setTimeout(() => {
        downloadCSV(createVecteezyCSV(currentMetadata), 'vecteezy_metadata.csv');
    }, 200);
    
    showNotification('Semua file CSV berhasil didownload.');
});

// Toggle preview functionality
togglePreview.addEventListener('click', function() {
    if (modalPreview.classList.contains('hidden')) {
        modalPreview.classList.remove('hidden');
        
        // Show preview of first few entries
        const previewData = currentMetadata.slice(0, 3).map((meta, index) => 
            `${index + 1}. ${meta.filename}\n   Title: ${meta.title}\n   Keywords: ${meta.keywords.slice(0, 100)}...\n`
        ).join('\n');
        
        previewContent.textContent = previewData;
    } else {
        modalPreview.classList.add('hidden');
    }
});

// Checkbox event listeners
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

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Initial API status check
    checkAllAPIStatus();
    
    // Auto-refresh API status every 5 minutes
    setInterval(checkAllAPIStatus, 5 * 60 * 1000);
    
    // Auto-reset usage counter every hour
    setInterval(() => {
        loadBalancer.resetUsage();
        updateAPIStatusDisplay();
    }, 60 * 60 * 1000);
    
    // Initialize table and modal
    updateMetadataTable();
    updateModalStats();
    
    // Mobile tab navigation
    const mobileTabs = document.querySelectorAll('[data-mobile-tab]');
    mobileTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-mobile-tab');
            
            // Update tab appearance
            mobileTabs.forEach(t => t.classList.remove('tab-active'));
            this.classList.add('tab-active');
            
            // Show correct content
            document.querySelectorAll('.tab-content-mobile').forEach(content => {
                content.classList.add('hidden');
            });
            document.getElementById(`mobile-${tabName}`).classList.remove('hidden');
        });
    });
});
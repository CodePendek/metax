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

// Updated AI processing function with better category handling
async function processImageWithLoadBalancing(image, retryCount = 0) {
    const maxRetries = API_CONFIGS.length;
    
    if (retryCount >= maxRetries) {
        throw new Error('All APIs failed or unavailable');
    }
    
    const api = loadBalancer.getNextAPI();
    const isVector = vectorCheckbox.checked;
    const isVideo = videoCheckbox.checked;
    
// ENHANCED SEO MICROSTOCK PROMPT
const promptText = `Analyze this image and generate high-converting microstock metadata optimized for search and sales.

Return ONLY a JSON object with these exact fields:
{
  "filename": "exact_filename_provided",
  "title": "SEO-optimized 50-150 char title",
  "description": "detailed commercial description 150-200 chars", 
  "keywords": "30-35 strategic keywords for maximum discoverability",
  "shutterstock_category": "most relevant category from list",
  "adobestock_category": "category number 1-21",
  "vecteezy_license": "Pro"
}

SEO OPTIMIZATION RULES:

TITLE STRATEGY:
- Start with PRIMARY subject (what buyers search for first)
- Include EMOTION/MOOD words (happy, professional, modern, elegant)
- Add COMMERCIAL USE hints (business, corporate, design, marketing)
- Use TRENDING keywords (sustainable, diverse, authentic, minimal)
- Examples: "Professional business team meeting in modern office", "Happy diverse family enjoying outdoor picnic"

DESCRIPTION STRATEGY:  
- First sentence: describe MAIN VISUAL ELEMENTS
- Second sentence: suggest COMMERCIAL APPLICATIONS
- Include DEMOGRAPHIC details (age, ethnicity, gender when visible)
- Add TECHNICAL specs (isolated, copy space, high contrast)
- Mention STYLE/AESTHETIC (modern, vintage, minimalist, colorful)

KEYWORD STRATEGY (5W1H Framework):
- WHAT: 6-8 PRIMARY subject keywords (main objects, people, concepts)
- WHO: 4-5 DEMOGRAPHIC keywords (target audience, age groups, professions)
- WHERE: 3-4 LOCATION/SETTING keywords (office, home, outdoor, studio, urban)
- WHEN: 2-3 TEMPORAL keywords (morning, seasonal, contemporary, timeless)
- WHY: 6-8 PURPOSE/EMOTION keywords (success, relaxation, celebration, communication)
- HOW: 4-6 STYLE/METHOD keywords (minimalist, candid, professional, aerial, close-up)
- BONUS: 2-3 TRENDING/NICHE keywords (sustainability, diversity, technology)

TOTAL: 30-35 strategically distributed keywords

5W1H APPLICATION:
- Use BOTH singular and plural forms for important terms
- Include SYNONYM variations (happy/joyful, business/corporate)
- Add SEASONAL/CONTEXTUAL terms when relevant

HIGH-PERFORMING KEYWORD CATEGORIES:
- Emotions: happy, confident, relaxed, focused, energetic, peaceful
- Demographics: young, adult, senior, diverse, multicultural, family
- Business: professional, corporate, teamwork, success, growth, strategy
- Lifestyle: healthy, modern, casual, luxury, sustainable, authentic
- Technical: isolated, copy space, close-up, overhead, horizontal, vertical
- Colors: bright, vibrant, neutral, pastel, monochrome, colorful
- Concepts: innovation, communication, education, wellness, finance, technology

SHUTTERSTOCK CATEGORIES:
Abstract, Animals/Wildlife, Arts, Backgrounds/Textures, Beauty/Fashion, Buildings/Landmarks, Business/Finance, Celebrities, Education, Food and Drink, Healthcare/Medical, Holidays, Industrial, Interiors, Miscellaneous, Nature, Objects, Parks/Outdoor, People, Religion, Science, Signs/Symbols, Sports/Recreation, Technology, Transportation, Vintage

ADOBE STOCK CATEGORIES:
1=Animals, 2=Buildings and Architecture, 3=Business, 4=Drinks, 5=The Environment, 6=States of Mind, 7=Food, 8=Graphic Resources, 9=Hobbies and Leisure, 10=Industry, 11=Landscapes, 12=Lifestyle, 13=People, 14=Plants and Flowers, 15=Culture and Religion, 16=Science, 17=Social Issues, 18=Sports, 19=Technology, 20=Transport, 21=Travel

AVOID:
- Generic terms (image, photo, picture)  
- Overly technical jargon
- Repetitive keywords
- Special characters or symbols
- Trademarked terms or brand names
- Location-specific details unless globally relevant

PRIORITIZE:
- Commercial applicability
- Emotional connection
- Search volume potential
- Trending market demands
- Cross-platform compatibility

Focus on what BUYERS are actually searching for, not just describing what you see.`;

// Usage dalam function processImageWithLoadBalancing:
// Ganti bagian promptText dengan enhanced version di atas
    
    const targetFilenameForPrompt = getFilenameWithExtension(image.originalName, isVector, isVideo);
    const promptWithContext = `${promptText}\n\nfilename: ${targetFilenameForPrompt}\nvector: ${isVector ? 'yes' : 'no'}\nvideo: ${isVideo ? 'yes' : 'no'}`;
    
    try {
        const requestBody = {
            contents: [{
                parts: [
                    { text: promptWithContext },
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

// Updated parseMetadata function with better category handling
function parseMetadata(metadataText, targetFilename) {
    if (!metadataText || !metadataText.trim()) return null;
    
    let cleanText = metadataText.replace(/```json|```/g, '').trim();
    
    // Try to find JSON first
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonCandidate = cleanText.slice(firstBrace, lastBrace + 1);
        try {
            const parsed = JSON.parse(jsonCandidate);
            
            const filename = parsed.filename || targetFilename;
            const title = parsed.title || 'Generated title';
            const description = parsed.description || 'Generated description';
            
            let keywords = parsed.keywords || '';
            if (Array.isArray(keywords)) {
                keywords = keywords.join(', ');
            } else if (typeof keywords === 'string') {
                keywords = keywords.trim();
            } else {
                keywords = 'keywords, generated, content';
            }
            
            // Handle categories with fallbacks
            let shutterstock_category = parsed.shutterstock_category || '';
            let adobestock_category = parsed.adobestock_category || '';
            let vecteezy_license = parsed.vecteezy_license || 'Pro';
            
            // Validate Shutterstock category
            const validShutterstockCategories = [
                'Abstract', 'Animals/Wildlife', 'Arts', 'Backgrounds/Textures', 'Beauty/Fashion',
                'Buildings/Landmarks', 'Business/Finance', 'Celebrities', 'Education', 'Food and Drink',
                'Healthcare/Medical', 'Holidays', 'Industrial', 'Interiors', 'Miscellaneous', 'Nature',
                'Objects', 'Parks/Outdoor', 'People', 'Religion', 'Science', 'Signs/Symbols',
                'Sports/Recreation', 'Technology', 'Transportation', 'Vintage'
            ];
            
            if (!validShutterstockCategories.includes(shutterstock_category)) {
                shutterstock_category = 'Miscellaneous'; // Default fallback
            }
            
            // Validate Adobe Stock category (should be number 1-21)
            const adobeCategoryNum = parseInt(adobestock_category);
            if (isNaN(adobeCategoryNum) || adobeCategoryNum < 1 || adobeCategoryNum > 21) {
                adobestock_category = '8'; // Default to "Graphic Resources"
            } else {
                adobestock_category = adobeCategoryNum.toString();
            }
            
            return {
                filename: filename,
                title: title,
                description: description,
                keywords: keywords,
                shutterstock_category: shutterstock_category,
                adobestock_category: adobestock_category,
                vecteezy_license: vecteezy_license
            };
        } catch (err) {
            console.warn('JSON parse failed, falling back to CSV parsing.', err);
        }
    }
    
    // Fallback to CSV parsing with default categories
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
    
    const fallbackTitle = fields[1] || 'Generated title';
    const fallbackDescription = fields[2] || 'Generated description';
    const fallbackKeywords = fields[3] || 'keywords, generated, content';
    
    return {
        filename: targetFilename,
        title: fallbackTitle,
        description: fallbackDescription,
        keywords: fallbackKeywords,
        shutterstock_category: 'Miscellaneous', // Default fallback
        adobestock_category: '8', // Default to "Graphic Resources"
        vecteezy_license: 'Pro'
    };
}

// Fixed CSV generation functions
function createShutterstockCSV(metadataArray) {
    // Header: filename,description,keywords,categories
    let csvContent = 'filename,description,keywords,categories\n';
    metadataArray.forEach(meta => {
        const filename = meta.filename || '';
        const description = (meta.description || '').replace(/"/g, '""');
        const keywords = (meta.keywords || '').replace(/"/g, '""');
        const categories = (meta.shutterstock_category || 'Miscellaneous').replace(/"/g, '""');
        csvContent += `"${filename}","${description}","${keywords}","${categories}"\n`;
    });
    return csvContent;
}

function createAdobestockCSV(metadataArray) {
    // Header: filename,title,keywords,category (category is numeric code)
    let csvContent = 'filename,title,keywords,category\n';
    metadataArray.forEach(meta => {
        const filename = meta.filename || '';
        const title = (meta.title || meta.description || '').replace(/"/g, '""');
        const keywords = (meta.keywords || '').replace(/"/g, '""');
        const category = meta.adobestock_category || '8'; // Default to "Graphic Resources"
        csvContent += `"${filename}","${title}","${keywords}","${category}"\n`;
    });
    return csvContent;
}

function createVecteezyCSV(metadataArray) {
    // Header: filename,title,keywords,license
    let csvContent = 'filename,title,keywords,license\n';
    metadataArray.forEach(meta => {
        const filename = meta.filename || '';
        const title = (meta.title || meta.description || '').replace(/"/g, '""');
        const keywords = (meta.keywords || '').replace(/"/g, '""');
        const license = (meta.vecteezy_license || 'Pro').replace(/"/g, '""');
        csvContent += `"${filename}","${title}","${keywords}","${license}"\n`;
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
                        keywords: 'keywords',
                        shutterstock_category: '',
                        adobestock_category: '',
                        vecteezy_license: 'Pro'
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
                    keywords: 'error, processing, failed',
                    shutterstock_category: '',
                    adobestock_category: '',
                    vecteezy_license: 'Pro'
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

// Tambahkan event listener pada gambar preview
imagePreviews.addEventListener('click', function(event) {
  if (event.target.tagName === 'IMG') {
    const imageSrc = event.target.src;
    const imageModal = document.getElementById('image-modal');
    const imageModalContent = document.getElementById('image-modal-content');
    imageModalContent.src = imageSrc;
    imageModal.showModal();
  }
});
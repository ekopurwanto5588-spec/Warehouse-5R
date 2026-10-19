/**
 * 5R Warehouse Checklist App - Master Checklist Items & Realistic Sample Data
 */

const CHECKLIST_ITEMS = [
    {
        id: 1,
        code: '5R-01',
        category: 'Resik & Ringkas',
        title: 'Lantai bersih, tidak ada tumpahan atau genangan air',
        desc: 'Lantai bebas genangan air, oli, ceceran produk, dan debu tebal. Permukaan kering dan tidak licin.',
        icon: 'fa-broom',
        rPrinciple: 'Resik'
    },
    {
        id: 2,
        code: '5R-02',
        category: 'Resik',
        title: 'Rack dan pallet bersih, tidak ada tumpahan atau sisa produk',
        desc: 'Struktur beam/upright rak bersih dari debu/serpihan kayu. Pallet utuh dan bebas kotoran.',
        icon: 'fa-boxes-stacked',
        rPrinciple: 'Resik'
    },
    {
        id: 3,
        code: '5R-03',
        category: 'Ringkas & Rawat',
        title: 'Tidak ada produk rusak, bocor, expired atau tanpa label',
        desc: 'Semua produk terlabel barcode & ED jelas. Produk reject/bocor segera dipindahkan ke area Bad Stock.',
        icon: 'fa-triangle-exclamation',
        rPrinciple: 'Ringkas'
    },
    {
        id: 4,
        code: '5R-04',
        category: 'Rapi',
        title: 'Produk tersusun rapi sesuai lokasi tidak di lantai langsung',
        desc: 'Barang tidak diletakkan di lantai tanpa alas pallet. Susunan stabil, rapi sesuai bin/rack location.',
        icon: 'fa-layer-group',
        rPrinciple: 'Rapi'
    },
    {
        id: 5,
        code: '5R-05',
        category: 'Resik & Rawat',
        title: 'Dinding, lampu dan ventilasi / exhaust fan bersih dan berfungsi',
        desc: 'Lampu penerangan terang menyala, ventilasi/exhaust fan bersih dari jaring laba-laba dan berfungsi baik.',
        icon: 'fa-fan',
        rPrinciple: 'Rawat'
    },
    {
        id: 6,
        code: '5R-06',
        category: 'Resik & Safety',
        title: 'Tidak ada sampah, kardus bekas dan tanda hama (serangga dan tikus)',
        desc: 'Tempat sampah tertutup rapat, kardus bekas dibundel rapi, tidak ada kotoran atau tanda sarang tikus/hama.',
        icon: 'fa-shield-virus',
        rPrinciple: 'Resik'
    },
    {
        id: 7,
        code: '5R-07',
        category: 'Rawat',
        title: 'Tidak ada kebocoran atap / rembesan air di area rack',
        desc: 'Atap dan talang air tertutup rapat. Tidak ada tetesan air hujan atau tanda rembesan lembab di area racking.',
        icon: 'fa-cloud-rain',
        rPrinciple: 'Rawat'
    },
    {
        id: 8,
        code: '5R-08',
        category: 'Rapi & K3',
        title: 'Gangway / bebas hambatan, APAR tidak terhalang',
        desc: 'Aisle/jalur forklift dan jalur pejalan kaki bebas rintangan. APAR dan kotak P3K mudah dijangkau tanpa halangan.',
        icon: 'fa-fire-extinguisher',
        rPrinciple: 'Rapi'
    },
    {
        id: 9,
        code: '5R-09',
        category: 'Rajin & Rapi',
        title: 'Alat kebersihan dan handpallet tersimpan ditempatnya',
        desc: 'Handpallet diparkir rapi di garis kuning (5S Staging). Sapu, pel, dan cairan pembersih tersimpan rapi di rak tools.',
        icon: 'fa-dolly',
        rPrinciple: 'Rajin'
    }
];

// Master Area Warehouse Lengkap:
// Termasuk penambahan: Staging Inbound Luar, Staging Inbound Dalam, Staging Outbound
const WAREHOUSE_AREAS = [
    { id: 'area-labeling', name: 'Area Labeling', icon: 'fa-tag' },
    { id: 'area-packing-line', name: 'Area Packing Line', icon: 'fa-boxes-packing' },
    { id: 'area-chiller', name: 'Area Chiller', icon: 'fa-temperature-low' },
    { id: 'area-coolroom', name: 'Area Coolroom', icon: 'fa-snowflake' },
    { id: 'area-ambient', name: 'Area Ambient', icon: 'fa-warehouse' },
    { id: 'area-office', name: 'Area Office', icon: 'fa-building' },
    { id: 'area-toilet', name: 'Area Toilet', icon: 'fa-restroom' },
    { id: 'area-asset', name: 'Area Asset', icon: 'fa-dolly' },
    { id: 'area-crossdock', name: 'Area Crossdock', icon: 'fa-truck-ramp-box' },
    { id: 'area-staging-inbound-luar', name: 'Area Staging Inbound Luar', icon: 'fa-dolly-flatbed' },
    { id: 'area-staging-inbound-dalam', name: 'Area Staging Inbound Dalam', icon: 'fa-boxes-stacked' },
    { id: 'area-staging-outbound', name: 'Area Staging Outbound', icon: 'fa-truck-loading' }
];

const SHIFTS = [
    { id: 'awal', name: 'Awal Shift (07:00 - 08:00)', short: 'Awal', color: '#0ea5e9', icon: 'fa-sun' },
    { id: 'mid', name: 'Mid Shift (12:00 - 13:00)', short: 'Mid', color: '#f59e0b', icon: 'fa-cloud-sun' },
    { id: 'end', name: 'End Shift (16:00 - 17:00)', short: 'End', color: '#8b5cf6', icon: 'fa-moon' }
];

// Helper to generate realistic warehouse photo as SVG Data URI with Timestamp Watermark
function createSampleWarehousePhoto(type, title, area, dateStr, shift) {
    const bgGradient = type === 'clean' 
        ? ['#064e3b', '#047857', '#059669'] 
        : (type === 'finding' ? ['#7f1d1d', '#991b1b', '#b91c1c'] : ['#1e293b', '#334155', '#475569']);
    
    const statusLabel = type === 'clean' ? 'KONDISI BERSIH (√)' : (type === 'finding' ? 'TEMUAN (X)' : 'SESUDAH DIPERBAIKI');
    const badgeBg = type === 'clean' ? '#10b981' : (type === 'finding' ? '#ef4444' : '#3b82f6');

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <defs>
            <linearGradient id="bg_${type}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${bgGradient[0]}"/>
                <stop offset="50%" stop-color="${bgGradient[1]}"/>
                <stop offset="100%" stop-color="${bgGradient[2]}"/>
            </linearGradient>
            <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.4"/>
            </filter>
        </defs>
        
        <!-- Background Warehouse Simulation -->
        <rect width="600" height="400" fill="url(#bg_${type})"/>
        
        <!-- Floor Grid lines -->
        <path d="M0,280 L600,280 M0,320 L600,320 M0,360 L600,360" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
        <path d="M100,280 L20,400 M300,280 L300,400 M500,280 L580,400" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
        
        <!-- Warehouse Structure Silhouette -->
        <rect x="40" y="80" width="16" height="200" fill="rgba(255,255,255,0.15)"/>
        <rect x="220" y="80" width="16" height="200" fill="rgba(255,255,255,0.15)"/>
        <rect x="380" y="80" width="16" height="200" fill="rgba(255,255,255,0.15)"/>
        <rect x="540" y="80" width="16" height="200" fill="rgba(255,255,255,0.15)"/>
        <line x1="40" y1="120" x2="556" y2="120" stroke="rgba(255,255,255,0.2)" stroke-width="4"/>
        <line x1="40" y1="180" x2="556" y2="180" stroke="rgba(255,255,255,0.2)" stroke-width="4"/>
        <line x1="40" y1="240" x2="556" y2="240" stroke="rgba(255,255,255,0.2)" stroke-width="4"/>

        <!-- Pallets & Equipment -->
        <rect x="65" y="135" width="145" height="40" rx="4" fill="rgba(255,255,255,0.25)"/>
        <rect x="245" y="135" width="125" height="40" rx="4" fill="rgba(255,255,255,0.22)"/>
        <rect x="405" y="135" width="125" height="40" rx="4" fill="rgba(255,255,255,0.25)"/>

        <!-- Floor Staging Area Yellow Line -->
        <line x1="50" y1="280" x2="550" y2="280" stroke="#f59e0b" stroke-dasharray="16,8" stroke-width="6"/>

        <!-- Center Inspection Status Card -->
        <rect x="30" y="30" width="540" height="70" rx="8" fill="rgba(15,23,42,0.85)" stroke="rgba(255,255,255,0.15)"/>
        <rect x="45" y="45" width="150" height="24" rx="4" fill="${badgeBg}"/>
        <text x="120" y="61" fill="#ffffff" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle">${statusLabel}</text>
        <text x="210" y="62" fill="#ffffff" font-family="system-ui, sans-serif" font-size="14" font-weight="bold">${title.substring(0, 42)}</text>
        <text x="45" y="88" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">Area: ${area} | Shift: ${shift}</text>

        <!-- Indelible Watermark Footer (Live Timestamp Camera Simulation) -->
        <rect x="30" y="315" width="540" height="65" rx="8" fill="rgba(15,23,42,0.95)" stroke="rgba(255,255,255,0.2)"/>
        <circle cx="55" cy="347" r="14" fill="#10b981"/>
        <text x="55" y="352" fill="#ffffff" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" text-anchor="middle">5R</text>
        <text x="80" y="338" fill="#ffffff" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">WAREHOUSE CIKUDA (CKD) • KAMERA PATROLI 5R</text>
        <text x="80" y="356" fill="#38bdf8" font-family="monospace" font-size="11">WAKTU: ${dateStr} WIB • SHIFT: ${shift.toUpperCase()}</text>
        <text x="80" y="372" fill="#a7f3d0" font-family="monospace" font-size="10">LOKASI: ${area.toUpperCase()} • STATUS: ${statusLabel}</text>
    </svg>`;

    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// Generate realistic signature SVG Data URI
function createSampleSignature(name) {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="120" viewBox="0 0 300 120">
        <rect width="300" height="120" fill="transparent"/>
        <path d="M30,70 Q60,20 90,65 T140,55 Q170,95 210,40 T270,70" fill="none" stroke="#0284c7" stroke-width="3" stroke-linecap="round"/>
        <path d="M70,80 L220,78" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round"/>
        <text x="150" y="105" fill="#64748b" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle">${name}</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// Generate Preloaded Realistic Sample Data for Current Month with All 12 Areas
function generateInitialSampleData() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed
    const inspections = [];

    const picList = [
        { name: 'Budi Santoso', phone: '081234567890' },
        { name: 'Agus Setiawan', phone: '081398765432' },
        { name: 'Rian Pratama', phone: '081512344321' },
        { name: 'Siti Rahmawati', phone: '081987651234' }
    ];

    const currentDay = today.getDate();
    const startDay = Math.max(1, currentDay - 3);

    for (let day = startDay; day <= currentDay; day++) {
        const dateObj = new Date(year, month, day);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const isSaturday = dateObj.getDay() === 6;

        const shiftsToCreate = (day === currentDay) ? ['awal', 'mid'] : ['awal', 'mid', 'end'];

        shiftsToCreate.forEach((shiftId, sIdx) => {
            const shiftObj = SHIFTS.find(s => s.id === shiftId);
            const pic = picList[(day + sIdx) % picList.length];
            const area = WAREHOUSE_AREAS[(day + sIdx) % WAREHOUSE_AREAS.length];

            const hasFinding = (day === currentDay && shiftId === 'awal') || (day === currentDay - 2 && shiftId === 'mid');
            const findingItemId = hasFinding ? (shiftId === 'awal' ? 1 : 6) : null;

            const timeStampClean = `${dateStr} ${shiftId === 'awal' ? '07:42:15' : (shiftId === 'mid' ? '12:35:10' : '16:40:22')}`;

            const items = CHECKLIST_ITEMS.map(item => {
                let status = 'ok';
                let note = '';
                let photo = null;
                let cleanPhoto = null;

                if (hasFinding && item.id === findingItemId) {
                    status = 'finding';
                    if (item.id === 1) {
                        note = 'Terdapat genangan air kecil di jalur transit, sudah dipasang traffic cone warning.';
                        photo = createSampleWarehousePhoto('finding', item.title, area.name, `${dateStr} 07:45:10`, shiftObj.short);
                    } else if (item.id === 6) {
                        note = 'Ada kardus bekas unboxing tercecer di gangway belakang pallet.';
                        photo = createSampleWarehousePhoto('finding', item.title, area.name, `${dateStr} 12:30:45`, shiftObj.short);
                    }
                } else if (Math.random() > 0.4) {
                    cleanPhoto = createSampleWarehousePhoto('clean', item.title, area.name, timeStampClean, shiftObj.short);
                }

                return {
                    itemId: item.id,
                    status: status,
                    note: note,
                    photo: photo,
                    cleanPhoto: cleanPhoto,
                    resolved: (status === 'finding' && day < currentDay),
                    resolvedAt: (status === 'finding' && day < currentDay) ? `${dateStr} 14:00` : null,
                    resolvedNote: (status === 'finding' && day < currentDay) ? 'Area sudah disapu dan kardus dipindahkan ke tempat penampungan daur ulang.' : '',
                    resolvedPhoto: (status === 'finding' && day < currentDay) ? createSampleWarehousePhoto('resolved', item.title, area.name, `${dateStr} 14:15:20`, shiftObj.short) : null
                };
            });

            const overallPhoto = createSampleWarehousePhoto('clean', 'Overview Kebersihan Area', area.name, `${dateStr} ${shiftId === 'awal' ? '07:50:30' : '16:50:15'}`, shiftObj.short);

            const inspection = {
                id: `INS_${yyyy}${mm}${dd}_${shiftId}_${area.id}`,
                date: dateStr,
                monthYear: `${yyyy}-${mm}`,
                shift: shiftId,
                shiftName: shiftObj.name,
                areaId: area.id,
                areaName: area.name,
                picName: pic.name,
                picPhone: pic.phone,
                spvName: 'Hendrawan',
                isSaturdayDeepCleaning: isSaturday,
                deepCleaningDone: isSaturday,
                notes: hasFinding ? 'Ada catatan temuan yang perlu dipantau oleh tim operasional shift berikutnya.' : 'Area terpantau bersih, aman, dan mematuhi standar 5R warehouse.',
                overallPhoto: overallPhoto,
                signature: createSampleSignature(pic.name),
                items: items,
                complianceScore: hasFinding ? 89 : 100,
                status: hasFinding ? (day < currentDay ? 'resolved' : 'has_findings') : 'clean',
                createdAt: `${dateStr}T${shiftId === 'awal' ? '07:55:00' : (shiftId === 'mid' ? '12:55:00' : '16:55:00')}Z`
            };

            inspections.push(inspection);
        });
    }

    return inspections;
}

window.CHECKLIST_ITEMS = CHECKLIST_ITEMS;
window.WAREHOUSE_AREAS = WAREHOUSE_AREAS;
window.SHIFTS = SHIFTS;
window.createSampleWarehousePhoto = createSampleWarehousePhoto;
window.createSampleSignature = createSampleSignature;
window.generateInitialSampleData = generateInitialSampleData;

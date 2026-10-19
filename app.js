/**
 * 5R Warehouse Patrol & Audit Tracker - Main Application Logic
 * Supports:
 * 1. Multi-Shift (Awal, Mid, End)
 * 2. 12 Master Warehouse Areas (Labeling, Packing Line, Chiller, Coolroom, Ambient, Office, Toilet, Asset, Crossdock, Staging Inbound Luar, Staging Inbound Dalam, Staging Outbound)
 * 3. 9 Standard Checklist Items
 * 4. Direct Live Camera Capture (No gallery upload) with Indelible Timestamp Watermark
 * 5. Clean Condition Photo & Finding Photo per item
 * 6. High-Precision A4 Landscape Print & PDF Layout (Guaranteed 1 Page, No black bars)
 * 7. On-Screen High-Contrast White Paper Sheet Preview
 * 8. Fully Editable Signature Names & Roles (PIC, SPV, Manager)
 * 9. Formatted Excel (.xls) & CSV Downloads
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Default Signers
    const DEFAULT_SIGNERS = {
        picName: 'Staff Inventory / PIC',
        picRole: 'Petugas PIC Keliling',
        spvName: 'Hendrawan',
        spvRole: 'SPV Inventory',
        mgrName: 'Eko Purwanto',
        mgrRole: 'Warehouse Manager'
    };

    // App State
    const state = {
        activeTab: 'tab-form',
        selectedShift: 'awal',
        inspections: [],
        areas: window.WAREHOUSE_AREAS || [],
        checklistItems: window.CHECKLIST_ITEMS || [],
        shifts: window.SHIFTS || [],
        signers: { ...DEFAULT_SIGNERS },
        itemStates: {}, // { [itemId]: { status: 'ok'|'finding'|'na', note: '', photo: null, cleanPhoto: null } }
        overallPhoto: null,
        resolvingFinding: null,
        resolvePhoto: null,
        filterMonth: '',
        filterArea: 'ALL',
        galleryTypeFilter: 'ALL',
        galleryShiftFilter: 'ALL',
        findingsFilter: 'OPEN'
    };

    // Camera State
    let currentCameraTarget = null;
    let cameraMediaStream = null;
    let currentFacingMode = 'environment';
    let cameraClockInterval = null;

    // Signature Pad State
    let isDrawing = false;
    let hasSignature = false;
    const sigCanvas = document.getElementById('signature-canvas');
    const sigCtx = sigCanvas ? sigCanvas.getContext('2d') : null;

    // Initialize App
    await init();

    async function init() {
        initTheme();
        initSigners();
        initDateTimeDefaults();
        initAreaDropdowns();
        initLiveShiftTicker();
        setupNavigation();
        setupSignatureCanvas();
        setupCameraEngine();
        setupSignersEditor();
        setupEventListeners();

        // Load data from storage
        await loadInspections();

        // Render Initial Views
        renderChecklistForm();
        renderTrackerView();
        renderGalleryView();
        renderFindingsView();
        renderOfficialReport();
        updateKPICards();
    }

    // --------------------------------------------------------------------------
    // Theme Management
    // --------------------------------------------------------------------------
    function initTheme() {
        const savedTheme = localStorage.getItem('wh5r_theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            const themeBtn = document.getElementById('btn-theme-toggle');
            if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
    }

    function toggleTheme() {
        const isLight = document.body.classList.toggle('light-theme');
        localStorage.setItem('wh5r_theme', isLight ? 'light' : 'dark');
        const themeBtn = document.getElementById('btn-theme-toggle');
        if (themeBtn) {
            themeBtn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        }
    }

    // --------------------------------------------------------------------------
    // Signers Management (Editable TTD)
    // --------------------------------------------------------------------------
    function initSigners() {
        try {
            const saved = localStorage.getItem('wh5r_signers');
            if (saved) {
                state.signers = { ...DEFAULT_SIGNERS, ...JSON.parse(saved) };
            }
        } catch (e) {
            state.signers = { ...DEFAULT_SIGNERS };
        }
        updateSignersUI();
    }

    function setupSignersEditor() {
        const inputs = [
            { id: 'signer-pic-name', key: 'picName' },
            { id: 'signer-pic-role', key: 'picRole' },
            { id: 'signer-spv-name', key: 'spvName' },
            { id: 'signer-spv-role', key: 'spvRole' },
            { id: 'signer-mgr-name', key: 'mgrName' },
            { id: 'signer-mgr-role', key: 'mgrRole' }
        ];

        inputs.forEach(({ id, key }) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = state.signers[key] || '';
                el.addEventListener('input', (e) => {
                    state.signers[key] = e.target.value.trim() || DEFAULT_SIGNERS[key];
                    localStorage.setItem('wh5r_signers', JSON.stringify(state.signers));
                    updateSignersUI();
                });
            }
        });
    }

    function updateSignersUI() {
        // Document Header
        const hdrSpv = document.getElementById('display-hdr-spv');
        const hdrMgr = document.getElementById('display-hdr-mgr');
        if (hdrSpv) hdrSpv.textContent = state.signers.spvName;
        if (hdrMgr) hdrMgr.textContent = state.signers.mgrName;

        // Signature Box 1 (PIC)
        const sigRolePic = document.getElementById('display-sig-role-pic');
        const sigNamePic = document.getElementById('display-sig-name-pic');
        const sigSubPic = document.getElementById('display-sig-sub-pic');
        if (sigRolePic) sigRolePic.textContent = state.signers.picRole;
        if (sigNamePic) sigNamePic.textContent = state.signers.picName;
        if (sigSubPic) sigSubPic.textContent = state.signers.picName;

        // Signature Box 2 (SPV)
        const sigNameSpv = document.getElementById('display-sig-name-spv');
        const sigRoleSpv = document.getElementById('display-sig-role-spv');
        if (sigNameSpv) sigNameSpv.textContent = state.signers.spvName;
        if (sigRoleSpv) sigRoleSpv.textContent = state.signers.spvRole;

        // Signature Box 3 (Manager)
        const sigNameMgr = document.getElementById('display-sig-name-mgr');
        const sigRoleMgr = document.getElementById('display-sig-role-mgr');
        if (sigNameMgr) sigNameMgr.textContent = state.signers.mgrName;
        if (sigRoleMgr) sigRoleMgr.textContent = state.signers.mgrRole;

        // Update default SPV input in Form Patroli
        const formSpv = document.getElementById('form-spv');
        if (formSpv && !formSpv.value) {
            formSpv.value = state.signers.spvName;
        }
    }

    // --------------------------------------------------------------------------
    // Date & Shift Setup
    // --------------------------------------------------------------------------
    function initDateTimeDefaults() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const dateInput = document.getElementById('form-date');
        if (dateInput) {
            dateInput.value = todayStr;
            checkSaturday(todayStr);
        }

        const monthSelect = document.getElementById('tracker-month-select');
        if (monthSelect) {
            state.filterMonth = `${yyyy}-${mm}`;
            monthSelect.value = state.filterMonth;
        }

        const hour = today.getHours();
        if (hour >= 6 && hour < 12) {
            state.selectedShift = 'awal';
        } else if (hour >= 12 && hour < 16) {
            state.selectedShift = 'mid';
        } else {
            state.selectedShift = 'end';
        }
        updateShiftPillUI(state.selectedShift);
    }

    function checkSaturday(dateStr) {
        const d = new Date(dateStr);
        const isSat = d.getDay() === 6;
        const banner = document.getElementById('saturday-banner');
        if (banner) {
            banner.style.display = isSat ? 'flex' : 'none';
        }
    }

    function initAreaDropdowns() {
        const formArea = document.getElementById('form-area');
        const trackerArea = document.getElementById('tracker-area-filter');

        if (formArea) {
            formArea.innerHTML = state.areas.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
        }
        if (trackerArea) {
            trackerArea.innerHTML = '<option value="ALL">Semua Area</option>' + 
                state.areas.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
        }
    }

    function initLiveShiftTicker() {
        function tick() {
            const now = new Date();
            const hour = now.getHours();
            const min = String(now.getMinutes()).padStart(2, '0');
            const sec = String(now.getSeconds()).padStart(2, '0');
            const timeStr = `${String(hour).padStart(2, '0')}:${min}:${sec} WIB`;

            let currentShiftName = 'Awal Shift (07:00-08:00)';
            if (hour >= 12 && hour < 16) {
                currentShiftName = 'Mid Shift (12:00-13:00)';
            } else if (hour >= 16 && hour < 22) {
                currentShiftName = 'End Shift (16:00-17:00)';
            }

            const kpiShift = document.getElementById('kpi-live-shift');
            const kpiClock = document.getElementById('kpi-live-clock');
            const badgeShift = document.getElementById('current-shift-badge');

            if (kpiShift) kpiShift.textContent = currentShiftName.split(' ')[0] + ' ' + currentShiftName.split(' ')[1];
            if (kpiClock) kpiClock.textContent = timeStr;
            if (badgeShift) badgeShift.textContent = currentShiftName.split(' ')[0] + ' ' + currentShiftName.split(' ')[1];
        }
        tick();
        setInterval(tick, 1000);
    }

    // --------------------------------------------------------------------------
    // Navigation Tabs
    // --------------------------------------------------------------------------
    function setupNavigation() {
        const desktopBtns = document.querySelectorAll('.desktop-nav-btn');
        const mobileBtns = document.querySelectorAll('.mobile-nav-item');

        function switchTab(targetTabId) {
            state.activeTab = targetTabId;

            document.querySelectorAll('.tab-pane').forEach(p => {
                p.classList.remove('active');
                if (p.id === targetTabId) p.classList.add('active');
            });

            desktopBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === targetTabId);
            });

            mobileBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === targetTabId);
            });

            if (targetTabId === 'tab-tracker') renderTrackerView();
            if (targetTabId === 'tab-gallery') renderGalleryView();
            if (targetTabId === 'tab-findings') renderFindingsView();
            if (targetTabId === 'tab-report') renderOfficialReport();

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        desktopBtns.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        mobileBtns.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });
    }

    // --------------------------------------------------------------------------
    // Data Storage Integration
    // --------------------------------------------------------------------------
    async function loadInspections() {
        let stored = await window.storageEngine.getAllInspections();
        if (stored && Array.isArray(stored) && stored.length > 0) {
            state.inspections = stored.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
        } else {
            state.inspections = [];
        }
    }

    async function clearAllInspections() {
        const confirmed = window.confirm(
            "PERINGATAN:\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA PATROLI?\n\nSemua riwayat pengisian dan bukti foto di perangkat ini akan dikosongkan (kembali ke 0)."
        );
        if (!confirmed) return;

        await window.storageEngine.clearAll();
        state.inspections = [];

        updateKPICards();
        renderTrackerView();
        renderGalleryView();
        renderFindingsView();
        renderOfficialReport();

        showToast("Semua data berhasil dibersihkan! Aplikasi kini siap digunakan dari 0.", "info");
    }

    async function loadDemoSampleData() {
        const confirmed = window.confirm(
            "Muat data simulasi / demo?\nData patroli contoh untuk 3 hari terakhir akan dimasukkan untuk demonstrasi visual."
        );
        if (!confirmed) return;

        if (typeof window.generateInitialSampleData === 'function') {
            const sampleData = window.generateInitialSampleData();
            await window.storageEngine.clearAll();
            for (const item of sampleData) {
                await window.storageEngine.saveInspection(item);
            }
            state.inspections = sampleData;

            updateKPICards();
            renderTrackerView();
            renderGalleryView();
            renderFindingsView();
            renderOfficialReport();

            showToast("Data simulasi demo berhasil dimuat!", "success");
        }
    }

    function updateKPICards() {
        const total = state.inspections.length;
        let totalItemsChecked = 0;
        let totalItemsOk = 0;
        let openFindingsCount = 0;
        let totalFindingsCount = 0;
        let resolvedFindingsCount = 0;

        state.inspections.forEach(ins => {
            if (ins.items && Array.isArray(ins.items)) {
                ins.items.forEach(it => {
                    if (it.status !== 'na') {
                        totalItemsChecked++;
                        if (it.status === 'ok') {
                            totalItemsOk++;
                        } else if (it.status === 'finding') {
                            totalFindingsCount++;
                            if (!it.resolved) {
                                openFindingsCount++;
                            } else {
                                resolvedFindingsCount++;
                            }
                        }
                    }
                });
            }
        });

        const compliance = totalItemsChecked > 0 ? Math.round((totalItemsOk / totalItemsChecked) * 100) : 100;

        const kpiCompliance = document.getElementById('kpi-compliance');
        const kpiComplianceSub = document.getElementById('kpi-compliance-sub');
        const kpiInspections = document.getElementById('kpi-inspections');
        const kpiOpenFindings = document.getElementById('kpi-open-findings');
        const kpiFindingsSub = document.getElementById('kpi-findings-sub');
        const desktopBadge = document.getElementById('desktop-finding-count');
        const mobileBadge = document.getElementById('mobile-finding-count');

        if (kpiCompliance) kpiCompliance.textContent = total > 0 ? `${compliance}%` : '-';
        if (kpiComplianceSub) kpiComplianceSub.textContent = total > 0 ? 'Standar target min. 95%' : 'Belum ada data patroli';
        if (kpiInspections) kpiInspections.textContent = total;
        if (kpiOpenFindings) kpiOpenFindings.textContent = openFindingsCount;
        if (kpiFindingsSub) {
            if (total === 0) {
                kpiFindingsSub.textContent = 'Belum ada temuan';
            } else if (openFindingsCount === 0 && totalFindingsCount === 0) {
                kpiFindingsSub.textContent = 'Semua area bersih ✓';
            } else if (openFindingsCount === 0) {
                kpiFindingsSub.textContent = `${resolvedFindingsCount} temuan sudah solved`;
            } else {
                kpiFindingsSub.textContent = `${openFindingsCount} open / ${resolvedFindingsCount} solved`;
            }
        }
        if (desktopBadge) desktopBadge.textContent = openFindingsCount;
        if (mobileBadge) mobileBadge.textContent = openFindingsCount;

        // Store findings counts in state for use by findings tab
        state._findingCounts = { total: totalFindingsCount, open: openFindingsCount, resolved: resolvedFindingsCount };
    }

    // --------------------------------------------------------------------------
    // Form Patroli 5R Rendering
    // --------------------------------------------------------------------------
    function renderChecklistForm() {
        const container = document.getElementById('checklist-items-container');
        if (!container) return;

        state.checklistItems.forEach(item => {
            if (!state.itemStates[item.id]) {
                state.itemStates[item.id] = {
                    status: 'ok',
                    note: '',
                    photo: null,
                    cleanPhoto: null,
                    photos: [],
                    cleanPhotos: []
                };
            } else {
                if (!state.itemStates[item.id].photos) {
                    state.itemStates[item.id].photos = state.itemStates[item.id].photo ? [state.itemStates[item.id].photo] : [];
                }
                if (!state.itemStates[item.id].cleanPhotos) {
                    state.itemStates[item.id].cleanPhotos = state.itemStates[item.id].cleanPhoto ? [state.itemStates[item.id].cleanPhoto] : [];
                }
            }
        });

        container.innerHTML = state.checklistItems.map((item, idx) => {
            const st = state.itemStates[item.id];
            const isOk = st.status === 'ok';
            const isFinding = st.status === 'finding';
            const isNa = st.status === 'na';
            const cleanPhotos = st.cleanPhotos || [];
            const findingPhotos = st.photos || [];

            return `
            <div class="checklist-card status-${st.status}" id="card-item-${item.id}">
                <div class="card-top-row">
                    <div class="item-info">
                        <div class="item-number-badge">${idx + 1}</div>
                        <div class="item-content">
                            <div class="item-header-meta">
                                <span class="item-principle-badge">${item.rPrinciple}</span>
                                <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">${item.code}</span>
                            </div>
                            <h4 class="item-title">${item.title}</h4>
                            <p class="item-description">${item.desc}</p>
                        </div>
                    </div>
                </div>

                <!-- 3 Action Status Buttons -->
                <div class="status-buttons-group">
                    <button type="button" class="btn-status btn-ok ${isOk ? 'active' : ''}" data-item-id="${item.id}" data-status="ok">
                        <i class="fa-solid fa-check"></i>
                        <span>Sesuai / Bersih (√)</span>
                    </button>
                    <button type="button" class="btn-status btn-finding ${isFinding ? 'active' : ''}" data-item-id="${item.id}" data-status="finding">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>Ada Temuan (X)</span>
                    </button>
                    <button type="button" class="btn-status btn-na ${isNa ? 'active' : ''}" data-item-id="${item.id}" data-status="na">
                        <i class="fa-solid fa-minus"></i>
                        <span>Libur / NA (L)</span>
                    </button>
                </div>

                <!-- Clean Condition Photo Drawer (Maks 3 Foto) -->
                <div class="clean-photo-drawer" id="clean-drawer-${item.id}" style="${isOk ? 'display: flex;' : 'display: none;'}">
                    <div class="evidence-row">
                        <button type="button" class="btn-camera-trigger btn-clean-camera" data-item-id="${item.id}" data-type="clean" ${cleanPhotos.length >= 3 ? 'style="opacity:0.6;pointer-events:none;"' : ''}>
                            <i class="fa-solid fa-camera"></i>
                            <span>${cleanPhotos.length === 0 ? 'Foto Bersih (Maks 3)' : (cleanPhotos.length >= 3 ? 'Maks 3 Foto (Penuh)' : `+ Tambah Foto (${cleanPhotos.length}/3)`)}</span>
                        </button>

                        <div class="multi-photo-container" id="clean-photos-container-${item.id}">
                            ${cleanPhotos.map((p, pIdx) => `
                                <div class="photo-thumb-card" onclick="window.openLightbox('${encodeURI(p)}', 'Foto Bersih #${pIdx+1}: ${encodeURIComponent(item.title)}')">
                                    <img src="${p}" alt="Foto Bersih #${pIdx+1}">
                                    <span class="photo-thumb-idx">#${pIdx+1}</span>
                                    <button type="button" class="photo-thumb-del" onclick="event.stopPropagation(); window.removeCleanPhotoIdx(${item.id}, ${pIdx})" title="Hapus foto ini">
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>

                        <span style="font-size: 0.72rem; color: #10b981; display: flex; align-items: center; gap: 4px;">
                            <i class="fa-solid fa-shield-check"></i> Kamera langsung (maks 3 foto) berstempel waktu
                        </span>
                    </div>
                </div>

                <!-- Finding Drawer (Maks 3 Foto) -->
                <div class="finding-drawer ${isFinding ? 'open' : ''}" id="drawer-item-${item.id}">
                    <div class="input-group">
                        <label class="input-label" for="note-item-${item.id}">
                            <i class="fa-solid fa-pen"></i> Catatan Temuan & Tindakan Perbaikan:
                        </label>
                        <textarea id="note-item-${item.id}" class="form-control" rows="2" 
                            placeholder="Jelaskan kondisi tidak sesuai dan tindakan langsung...">${st.note}</textarea>
                    </div>

                    <div class="evidence-row">
                        <button type="button" class="btn-camera-trigger btn-finding-camera" data-item-id="${item.id}" data-type="finding" ${findingPhotos.length >= 3 ? 'style="opacity:0.6;pointer-events:none;"' : ''}>
                            <i class="fa-solid fa-camera"></i>
                            <span>${findingPhotos.length === 0 ? 'Foto Bukti Temuan (Maks 3)' : (findingPhotos.length >= 3 ? 'Maks 3 Foto (Penuh)' : `+ Tambah Foto (${findingPhotos.length}/3)`)}</span>
                        </button>

                        <div class="multi-photo-container" id="finding-photos-container-${item.id}">
                            ${findingPhotos.map((p, pIdx) => `
                                <div class="photo-thumb-card" onclick="window.openLightbox('${encodeURI(p)}', 'Foto Temuan #${pIdx+1}: ${encodeURIComponent(item.title)}')">
                                    <img src="${p}" alt="Foto Temuan #${pIdx+1}">
                                    <span class="photo-thumb-idx">#${pIdx+1}</span>
                                    <button type="button" class="photo-thumb-del" onclick="event.stopPropagation(); window.removeFindingPhotoIdx(${item.id}, ${pIdx})" title="Hapus foto ini">
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>

                        <span style="font-size: 0.72rem; color: #f43f5e; display: flex; align-items: center; gap: 4px;">
                            <i class="fa-solid fa-triangle-exclamation"></i> Wajib foto kamera langsung (maks 3 foto)
                        </span>
                    </div>
                </div>
            </div>`;
        }).join('');

        attachFormCardListeners();
    }

    function attachFormCardListeners() {
        document.querySelectorAll('.btn-status').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = parseInt(btn.dataset.itemId);
                const status = btn.dataset.status;
                setItemStatus(itemId, status);
            });
        });

        document.querySelectorAll('.checklist-card textarea').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const itemId = parseInt(e.target.id.replace('note-item-', ''));
                if (state.itemStates[itemId]) {
                    state.itemStates[itemId].note = e.target.value;
                }
            });
        });

        document.querySelectorAll('.btn-camera-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.itemId ? parseInt(btn.dataset.itemId) : null;
                const type = btn.dataset.type || 'clean';
                openLiveCamera({ itemId, type });
            });
        });

        document.querySelectorAll('.btn-remove-photo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = parseInt(btn.dataset.itemId);
                removeFindingPhoto(itemId);
            });
        });

        document.querySelectorAll('.btn-remove-clean').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = parseInt(btn.dataset.itemId);
                removeCleanPhoto(itemId);
            });
        });

        document.querySelectorAll('.photo-preview-box img').forEach(img => {
            img.addEventListener('click', () => {
                if (img.src) {
                    openLightbox(img.src, 'Bukti Dokumentasi Kamera 5R', 'Detail Foto Patroli', 'Terverifikasi');
                }
            });
        });
    }

    function setItemStatus(itemId, status) {
        if (!state.itemStates[itemId]) return;
        state.itemStates[itemId].status = status;

        const card = document.getElementById(`card-item-${itemId}`);
        const findingDrawer = document.getElementById(`drawer-item-${itemId}`);
        const cleanDrawer = document.getElementById(`clean-drawer-${itemId}`);

        if (card) {
            card.classList.remove('status-ok', 'status-finding', 'status-na');
            card.classList.add(`status-${status}`);

            card.querySelectorAll('.btn-status').forEach(b => {
                b.classList.toggle('active', b.dataset.status === status);
            });
        }

        if (findingDrawer) {
            findingDrawer.classList.toggle('open', status === 'finding');
        }
        if (cleanDrawer) {
            cleanDrawer.style.display = status === 'ok' ? 'flex' : 'none';
        }
    }

    function quickPassAllClean() {
        state.checklistItems.forEach(item => {
            state.itemStates[item.id].status = 'ok';
            const card = document.getElementById(`card-item-${item.id}`);
            const findingDrawer = document.getElementById(`drawer-item-${item.id}`);
            const cleanDrawer = document.getElementById(`clean-drawer-${item.id}`);
            if (card) {
                card.classList.remove('status-finding', 'status-na');
                card.classList.add('status-ok');
                card.querySelectorAll('.btn-status').forEach(b => {
                    b.classList.toggle('active', b.dataset.status === 'ok');
                });
            }
            if (findingDrawer) findingDrawer.classList.remove('open');
            if (cleanDrawer) cleanDrawer.style.display = 'flex';
        });
        showToast('Semua item checklist ditandai BERSIH / SESUAI (√)', 'success');
    }

    function resetForm() {
        if (confirm('Reset seluruh isian form checklist patroli?')) {
            state.itemStates = {};
            state.overallPhoto = null;
            state.overallPhotos = [];
            renderOverallPhotos();
            clearSignature();
            const notesInput = document.getElementById('form-general-notes');
            if (notesInput) notesInput.value = '';
            renderChecklistForm();
            showToast('Form berhasil direset.', 'info');
        }
    }

    // --------------------------------------------------------------------------
    // LIVE CAMERA ENGINE
    // --------------------------------------------------------------------------
    function setupCameraEngine() {
        const shutterBtn = document.getElementById('btn-camera-shutter');
        const switchBtn = document.getElementById('btn-switch-camera');
        const closeBtn = document.getElementById('btn-close-camera');
        const cancelBtn = document.getElementById('btn-cancel-camera');
        const fallbackInput = document.getElementById('fallback-camera-input');

        if (shutterBtn) shutterBtn.addEventListener('click', captureLiveCameraFrame);
        if (switchBtn) switchBtn.addEventListener('click', toggleCameraFacingMode);
        if (closeBtn) closeBtn.addEventListener('click', closeLiveCamera);
        if (cancelBtn) cancelBtn.addEventListener('click', closeLiveCamera);

        if (fallbackInput) {
            fallbackInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await handleFallbackCameraFile(file);
                }
            });
        }
    }

    async function openLiveCamera(target) {
        currentCameraTarget = target;
        const modal = document.getElementById('modal-live-camera');
        const video = document.getElementById('camera-stream');

        updateCameraHUDInfo();

        if (cameraClockInterval) clearInterval(cameraClockInterval);
        cameraClockInterval = setInterval(updateCameraHUDTime, 1000);

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia not supported on this browser context');
            }

            if (cameraMediaStream) {
                cameraMediaStream.getTracks().forEach(t => t.stop());
            }

            cameraMediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: currentFacingMode },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            video.srcObject = cameraMediaStream;
            await video.play();
            if (modal) modal.classList.add('open');
        } catch (err) {
            console.warn('Live camera stream not accessible, opening enforced native camera capture:', err);
            const fallbackInput = document.getElementById('fallback-camera-input');
            if (fallbackInput) {
                fallbackInput.value = '';
                fallbackInput.click();
            }
        }
    }

    function updateCameraHUDInfo() {
        const areaSelect = document.getElementById('form-area');
        const areaName = areaSelect ? areaSelect.options[areaSelect.selectedIndex].text : 'Area Warehouse';
        const shiftObj = state.shifts.find(s => s.id === state.selectedShift) || { short: 'Shift' };

        const titleEl = document.getElementById('hud-camera-title');
        const statusEl = document.getElementById('hud-camera-status');
        const shiftBadge = document.getElementById('hud-shift-badge');

        if (titleEl) titleEl.textContent = areaName;
        if (shiftBadge) shiftBadge.textContent = `${shiftObj.short} Shift`;

        if (statusEl) {
            if (currentCameraTarget?.type === 'clean') {
                statusEl.textContent = 'KONDISI: BERSIH / SESUAI (√)';
                statusEl.style.color = '#10b981';
            } else if (currentCameraTarget?.type === 'finding') {
                statusEl.textContent = 'TEMUAN: TIDAK SESUAI (X)';
                statusEl.style.color = '#f43f5e';
            } else if (currentCameraTarget?.type === 'resolve') {
                statusEl.textContent = 'VERIFIKASI TINDAKAN PERBAIKAN';
                statusEl.style.color = '#38bdf8';
            } else {
                statusEl.textContent = 'OVERVIEW KONDISI AREA';
                statusEl.style.color = '#38bdf8';
            }
        }
        updateCameraHUDTime();
    }

    function updateCameraHUDTime() {
        const metaEl = document.getElementById('hud-camera-meta');
        if (!metaEl) return;
        const now = new Date();
        const dateStr = formatIndoDate(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`);
        const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} WIB`;
        const picName = document.getElementById('form-pic')?.value || 'PIC';
        metaEl.textContent = `${dateStr} ${timeStr} • PIC: ${picName}`;
    }

    async function toggleCameraFacingMode() {
        currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        if (currentCameraTarget) {
            await openLiveCamera(currentCameraTarget);
        }
    }

    function closeLiveCamera() {
        if (cameraMediaStream) {
            cameraMediaStream.getTracks().forEach(t => t.stop());
            cameraMediaStream = null;
        }
        if (cameraClockInterval) {
            clearInterval(cameraClockInterval);
            cameraClockInterval = null;
        }
        const modal = document.getElementById('modal-live-camera');
        if (modal) modal.classList.remove('open');
    }

    function captureLiveCameraFrame() {
        const video = document.getElementById('camera-stream');
        const canvas = document.getElementById('camera-capture-canvas');
        if (!video || !canvas || !video.videoWidth) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const sec = String(now.getSeconds()).padStart(2, '0');
        const timeStamp = `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec} WIB`;

        const areaSelect = document.getElementById('form-area');
        const areaName = areaSelect ? areaSelect.options[areaSelect.selectedIndex].text : 'Area Warehouse';
        const picName = document.getElementById('form-pic')?.value || 'PIC';
        const shiftName = state.shifts.find(s => s.id === state.selectedShift)?.name || 'Shift';

        const statusLabel = currentCameraTarget?.type === 'clean' 
            ? 'KONDISI: BERSIH / SESUAI (√)' 
            : (currentCameraTarget?.type === 'finding' ? 'TEMUAN: TIDAK SESUAI (X)' : 'OVERVIEW AREA 5R');

        burnIndelibleWatermark(ctx, canvas.width, canvas.height, {
            timestamp: timeStamp,
            area: areaName,
            pic: picName,
            shift: shiftName,
            status: statusLabel,
            type: currentCameraTarget?.type
        });

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        attachCapturedPhoto(dataUrl);
        closeLiveCamera();
        showToast('Foto kamera berhasil diambil dengan cap stempel otomatis!', 'success');
    }

    async function handleFallbackCameraFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_DIM = 1200;
                let w = img.width;
                let h = img.height;
                if (w > h && w > MAX_DIM) {
                    h = Math.round((h * MAX_DIM) / w);
                    w = MAX_DIM;
                } else if (h > MAX_DIM) {
                    w = Math.round((w * MAX_DIM) / h);
                    h = MAX_DIM;
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);

                const now = new Date();
                const timeStamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} WIB`;
                const areaSelect = document.getElementById('form-area');
                const areaName = areaSelect ? areaSelect.options[areaSelect.selectedIndex].text : 'Area Warehouse';
                const picName = document.getElementById('form-pic')?.value || 'PIC';
                const shiftName = state.shifts.find(s => s.id === state.selectedShift)?.name || 'Shift';
                const statusLabel = currentCameraTarget?.type === 'clean' ? 'KONDISI: BERSIH / SESUAI (√)' : 'TEMUAN: TIDAK SESUAI (X)';

                burnIndelibleWatermark(ctx, w, h, {
                    timestamp: timeStamp,
                    area: areaName,
                    pic: picName,
                    shift: shiftName,
                    status: statusLabel,
                    type: currentCameraTarget?.type
                });

                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                attachCapturedPhoto(dataUrl);
                showToast('Foto kamera berhasil disimpan dengan timestamp!', 'success');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function burnIndelibleWatermark(ctx, width, height, info) {
        const barHeight = Math.max(64, Math.round(height * 0.14));
        const accentColor = info.type === 'clean' ? '#10b981' : (info.type === 'finding' ? '#ef4444' : '#0ea5e9');

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(0, height - barHeight, width, barHeight);

        ctx.fillStyle = accentColor;
        ctx.fillRect(0, height - barHeight, width, 5);

        ctx.fillStyle = accentColor;
        const badgeSize = Math.round(barHeight * 0.7);
        const badgeX = 16;
        const badgeY = height - barHeight + (barHeight - badgeSize) / 2;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 8) : ctx.rect(badgeX, badgeY, badgeSize, badgeSize);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(badgeSize * 0.45)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('5R', badgeX + badgeSize / 2, badgeY + badgeSize / 2);

        const textStartX = badgeX + badgeSize + 16;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(barHeight * 0.24)}px sans-serif`;
        ctx.fillText(`WAREHOUSE CIKUDA (CKD) • ${info.timestamp}`, textStartX, height - barHeight + barHeight * 0.35);

        ctx.fillStyle = '#38bdf8';
        ctx.font = `${Math.round(barHeight * 0.20)}px monospace`;
        ctx.fillText(`AREA: ${info.area.toUpperCase()} • SHIFT: ${info.shift.toUpperCase()} • PIC: ${info.pic}`, textStartX, height - barHeight + barHeight * 0.65);

        ctx.fillStyle = info.type === 'clean' ? '#a7f3d0' : (info.type === 'finding' ? '#fca5a5' : '#e0e7ff');
        ctx.font = `bold ${Math.round(barHeight * 0.20)}px sans-serif`;
        ctx.fillText(info.status, textStartX, height - barHeight + barHeight * 0.90);
    }

    function attachCapturedPhoto(dataUrl) {
        if (!currentCameraTarget) return;
        const { itemId, type } = currentCameraTarget;

        if (type === 'clean' && itemId) {
            if (!state.itemStates[itemId].cleanPhotos) state.itemStates[itemId].cleanPhotos = [];
            if (state.itemStates[itemId].cleanPhotos.length < 3) {
                state.itemStates[itemId].cleanPhotos.push(dataUrl);
            } else {
                state.itemStates[itemId].cleanPhotos[2] = dataUrl;
            }
            state.itemStates[itemId].cleanPhoto = state.itemStates[itemId].cleanPhotos[0] || null;
            renderItemCleanPhotos(itemId);
        } else if (type === 'finding' && itemId) {
            if (!state.itemStates[itemId].photos) state.itemStates[itemId].photos = [];
            if (state.itemStates[itemId].photos.length < 3) {
                state.itemStates[itemId].photos.push(dataUrl);
            } else {
                state.itemStates[itemId].photos[2] = dataUrl;
            }
            state.itemStates[itemId].photo = state.itemStates[itemId].photos[0] || null;
            renderItemFindingPhotos(itemId);
        } else if (type === 'overall') {
            if (!state.overallPhotos) state.overallPhotos = [];
            if (state.overallPhotos.length < 3) {
                state.overallPhotos.push(dataUrl);
            } else {
                state.overallPhotos[2] = dataUrl;
            }
            state.overallPhoto = state.overallPhotos[0] || null;
            renderOverallPhotos();
        } else if (type === 'resolve') {
            if (!state.resolvePhotos) state.resolvePhotos = [];
            if (state.resolvePhotos.length < 3) {
                state.resolvePhotos.push(dataUrl);
            } else {
                state.resolvePhotos[2] = dataUrl;
            }
            state.resolvePhoto = state.resolvePhotos[0] || null;
            renderResolvePhotos();
        }
    }

    window.removeCleanPhotoIdx = function(itemId, idx) {
        if (state.itemStates[itemId] && state.itemStates[itemId].cleanPhotos) {
            state.itemStates[itemId].cleanPhotos.splice(idx, 1);
            state.itemStates[itemId].cleanPhoto = state.itemStates[itemId].cleanPhotos[0] || null;
            renderItemCleanPhotos(itemId);
        }
    };

    window.removeFindingPhotoIdx = function(itemId, idx) {
        if (state.itemStates[itemId] && state.itemStates[itemId].photos) {
            state.itemStates[itemId].photos.splice(idx, 1);
            state.itemStates[itemId].photo = state.itemStates[itemId].photos[0] || null;
            renderItemFindingPhotos(itemId);
        }
    };

    window.removeOverallPhotoIdx = function(idx) {
        if (state.overallPhotos) {
            state.overallPhotos.splice(idx, 1);
            state.overallPhoto = state.overallPhotos[0] || null;
            renderOverallPhotos();
        }
    };

    window.removeResolvePhotoIdx = function(idx) {
        if (state.resolvePhotos) {
            state.resolvePhotos.splice(idx, 1);
            state.resolvePhoto = state.resolvePhotos[0] || null;
            renderResolvePhotos();
        }
    };

    function renderItemCleanPhotos(itemId) {
        const container = document.getElementById(`clean-photos-container-${itemId}`);
        const btn = document.querySelector(`.btn-clean-camera[data-item-id="${itemId}"]`);
        const photos = state.itemStates[itemId]?.cleanPhotos || [];
        if (container) {
            container.innerHTML = photos.map((p, idx) => `
                <div class="photo-thumb-card" onclick="window.openLightbox('${encodeURI(p)}', 'Foto Bersih #${idx+1}')">
                    <img src="${p}" alt="Foto Bersih #${idx+1}">
                    <span class="photo-thumb-idx">#${idx+1}</span>
                    <button type="button" class="photo-thumb-del" onclick="event.stopPropagation(); window.removeCleanPhotoIdx(${itemId}, ${idx})" title="Hapus foto ini">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `).join('');
        }
        if (btn) {
            const count = photos.length;
            if (count >= 3) {
                btn.innerHTML = `<i class="fa-solid fa-check-circle"></i> <span>Maks 3 Foto (Penuh)</span>`;
                btn.style.opacity = '0.6';
                btn.style.pointerEvents = 'none';
            } else if (count > 0) {
                btn.innerHTML = `<i class="fa-solid fa-camera"></i> <span>+ Tambah Foto (${count}/3)</span>`;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            } else {
                btn.innerHTML = `<i class="fa-solid fa-camera"></i> <span>Foto Kondisi Bersih (Maks 3)</span>`;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            }
        }
    }

    function renderItemFindingPhotos(itemId) {
        const container = document.getElementById(`finding-photos-container-${itemId}`);
        const btn = document.querySelector(`.btn-finding-camera[data-item-id="${itemId}"]`);
        const photos = state.itemStates[itemId]?.photos || [];
        if (container) {
            container.innerHTML = photos.map((p, idx) => `
                <div class="photo-thumb-card" onclick="window.openLightbox('${encodeURI(p)}', 'Foto Temuan #${idx+1}')">
                    <img src="${p}" alt="Foto Temuan #${idx+1}">
                    <span class="photo-thumb-idx">#${idx+1}</span>
                    <button type="button" class="photo-thumb-del" onclick="event.stopPropagation(); window.removeFindingPhotoIdx(${itemId}, ${idx})" title="Hapus foto ini">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `).join('');
        }
        if (btn) {
            const count = photos.length;
            if (count >= 3) {
                btn.innerHTML = `<i class="fa-solid fa-check-circle"></i> <span>Maks 3 Foto (Penuh)</span>`;
                btn.style.opacity = '0.6';
                btn.style.pointerEvents = 'none';
            } else if (count > 0) {
                btn.innerHTML = `<i class="fa-solid fa-camera"></i> <span>+ Tambah Foto (${count}/3)</span>`;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            } else {
                btn.innerHTML = `<i class="fa-solid fa-camera"></i> <span>Foto Bukti Temuan (Maks 3)</span>`;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            }
        }
    }

    function renderOverallPhotos() {
        const container = document.getElementById('preview-overall-container');
        const btnText = document.getElementById('btn-overall-camera-text');
        const btn = document.getElementById('btn-overall-camera');
        const photos = state.overallPhotos || [];
        if (container) {
            container.innerHTML = photos.map((p, idx) => `
                <div class="photo-thumb-card" onclick="window.openLightbox('${encodeURI(p)}', 'Overview Area #${idx+1}')">
                    <img src="${p}" alt="Overview #${idx+1}">
                    <span class="photo-thumb-idx">#${idx+1}</span>
                    <button type="button" class="photo-thumb-del" onclick="event.stopPropagation(); window.removeOverallPhotoIdx(${idx})" title="Hapus foto ini">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `).join('');
        }
        if (btn && btnText) {
            const count = photos.length;
            if (count >= 3) {
                btnText.textContent = 'Maks 3 Foto Area (Penuh)';
                btn.style.opacity = '0.6';
                btn.style.pointerEvents = 'none';
            } else if (count > 0) {
                btnText.textContent = `+ Tambah Foto Area (${count}/3)`;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            } else {
                btnText.textContent = 'Foto Area (Maks 3)';
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            }
        }
    }

    function renderResolvePhotos() {
        const container = document.getElementById('preview-resolve-container');
        const btnText = document.getElementById('btn-resolve-camera-text');
        const btn = document.getElementById('btn-resolve-camera');
        const photos = state.resolvePhotos || [];
        if (container) {
            container.innerHTML = photos.map((p, idx) => `
                <div class="photo-thumb-card" onclick="window.openLightbox('${encodeURI(p)}', 'Foto Sesudah #${idx+1}')">
                    <img src="${p}" alt="After #${idx+1}">
                    <span class="photo-thumb-idx">#${idx+1}</span>
                    <button type="button" class="photo-thumb-del" onclick="event.stopPropagation(); window.removeResolvePhotoIdx(${idx})" title="Hapus foto ini">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `).join('');
        }
        if (btn && btnText) {
            const count = photos.length;
            if (count >= 3) {
                btnText.textContent = 'Maks 3 Foto Sesudah (Penuh)';
                btn.style.opacity = '0.6';
                btn.style.pointerEvents = 'none';
            } else if (count > 0) {
                btnText.textContent = `+ Tambah Foto Sesudah (${count}/3)`;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            } else {
                btnText.textContent = 'Foto Sesudah (Maks 3)';
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            }
        }
    }

    function removeFindingPhoto(itemId) {
        if (state.itemStates[itemId]) {
            state.itemStates[itemId].photos = [];
            state.itemStates[itemId].photo = null;
            renderItemFindingPhotos(itemId);
        }
    }

    function removeCleanPhoto(itemId) {
        if (state.itemStates[itemId]) {
            state.itemStates[itemId].cleanPhotos = [];
            state.itemStates[itemId].cleanPhoto = null;
            renderItemCleanPhotos(itemId);
        }
    }

    // --------------------------------------------------------------------------
    // Signature Pad
    // --------------------------------------------------------------------------
    function setupSignatureCanvas() {
        if (!sigCanvas || !sigCtx) return;

        function resizeCanvas() {
            const rect = sigCanvas.getBoundingClientRect();
            sigCanvas.width = rect.width * (window.devicePixelRatio || 1);
            sigCanvas.height = rect.height * (window.devicePixelRatio || 1);
            sigCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
            sigCtx.strokeStyle = '#0284c7';
            sigCtx.lineWidth = 2.5;
            sigCtx.lineCap = 'round';
            sigCtx.lineJoin = 'round';
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        function getPos(e) {
            const rect = sigCanvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        }

        function startDrawing(e) {
            isDrawing = true;
            hasSignature = true;
            const p = getPos(e);
            sigCtx.beginPath();
            sigCtx.moveTo(p.x, p.y);
            const placeholder = document.getElementById('sig-placeholder');
            if (placeholder) placeholder.style.display = 'none';
        }

        function draw(e) {
            if (!isDrawing) return;
            e.preventDefault();
            const p = getPos(e);
            sigCtx.lineTo(p.x, p.y);
            sigCtx.stroke();
        }

        function stopDrawing() {
            if (isDrawing) {
                sigCtx.closePath();
                isDrawing = false;
            }
        }

        sigCanvas.addEventListener('mousedown', startDrawing);
        sigCanvas.addEventListener('mousemove', draw);
        sigCanvas.addEventListener('mouseup', stopDrawing);
        sigCanvas.addEventListener('mouseleave', stopDrawing);

        sigCanvas.addEventListener('touchstart', startDrawing, { passive: false });
        sigCanvas.addEventListener('touchmove', draw, { passive: false });
        sigCanvas.addEventListener('touchend', stopDrawing);
    }

    function clearSignature() {
        if (!sigCanvas || !sigCtx) return;
        sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
        hasSignature = false;
        const placeholder = document.getElementById('sig-placeholder');
        if (placeholder) placeholder.style.display = 'flex';
    }

    // --------------------------------------------------------------------------
    // Submit Inspection
    // --------------------------------------------------------------------------
    async function submitInspection() {
        const dateInput = document.getElementById('form-date');
        const areaSelect = document.getElementById('form-area');
        const picInput = document.getElementById('form-pic');
        const spvInput = document.getElementById('form-spv');
        const notesInput = document.getElementById('form-general-notes');
        const deepCleanCheck = document.getElementById('check-deep-cleaning');

        if (!dateInput || !dateInput.value) {
            showToast('Silakan pilih tanggal pemeriksaan.', 'danger');
            return;
        }
        if (!picInput || !picInput.value.trim()) {
            showToast('Nama PIC petugas wajib diisi.', 'danger');
            picInput.focus();
            return;
        }

        for (const item of state.checklistItems) {
            const st = state.itemStates[item.id];
            if (st.status === 'finding' && (!st.note || !st.note.trim())) {
                showToast(`Catatan temuan untuk item #${item.id} (${item.title}) belum diisi!`, 'danger');
                const textarea = document.getElementById(`note-item-${item.id}`);
                if (textarea) textarea.focus();
                return;
            }
        }

        const dateStr = dateInput.value;
        const areaId = areaSelect.value;
        const areaName = areaSelect.options[areaSelect.selectedIndex].text;
        const picName = picInput.value.trim();
        const spvName = spvInput?.value.trim() || state.signers.spvName;
        const generalNotes = notesInput?.value.trim() || '';
        const isSaturday = new Date(dateStr).getDay() === 6;
        const deepCleaningDone = isSaturday ? (deepCleanCheck ? deepCleanCheck.checked : false) : false;

        let totalChecked = 0;
        let totalOk = 0;
        let hasOpenFinding = false;

        const items = state.checklistItems.map(item => {
            const st = state.itemStates[item.id];
            if (st.status !== 'na') {
                totalChecked++;
                if (st.status === 'ok') totalOk++;
                if (st.status === 'finding') hasOpenFinding = true;
            }
            const cleanPhotos = st.cleanPhotos || (st.cleanPhoto ? [st.cleanPhoto] : []);
            const findingPhotos = st.photos || (st.photo ? [st.photo] : []);

            return {
                itemId: item.id,
                status: st.status,
                note: st.note || '',
                photo: findingPhotos[0] || null,
                photos: findingPhotos,
                cleanPhoto: cleanPhotos[0] || null,
                cleanPhotos: cleanPhotos,
                resolved: false,
                resolvedAt: null,
                resolvedNote: '',
                resolvedPhoto: null,
                resolvedPhotos: []
            };
        });

        const complianceScore = totalChecked > 0 ? Math.round((totalOk / totalChecked) * 100) : 100;
        const shiftObj = state.shifts.find(s => s.id === state.selectedShift) || state.shifts[0];

        let signatureData = null;
        if (hasSignature && sigCanvas) {
            signatureData = sigCanvas.toDataURL('image/png');
        } else {
            signatureData = window.createSampleSignature(picName);
        }

        const overallPhotos = state.overallPhotos || (state.overallPhoto ? [state.overallPhoto] : []);

        const newInspection = {
            id: `INS_${dateStr.replace(/-/g, '')}_${state.selectedShift}_${areaId}_${Date.now().toString().slice(-4)}`,
            date: dateStr,
            monthYear: dateStr.substring(0, 7),
            shift: state.selectedShift,
            shiftName: shiftObj.name,
            areaId: areaId,
            areaName: areaName,
            picName: picName,
            picPhone: '',
            spvName: spvName,
            isSaturdayDeepCleaning: isSaturday,
            deepCleaningDone: deepCleaningDone,
            notes: generalNotes,
            overallPhoto: overallPhotos[0] || null,
            overallPhotos: overallPhotos,
            signature: signatureData,
            items: items,
            complianceScore: complianceScore,
            status: hasOpenFinding ? 'has_findings' : 'clean',
            createdAt: new Date().toISOString()
        };

        await window.storageEngine.saveInspection(newInspection);
        state.inspections.unshift(newInspection);

        showToast(`Patroli 5R Shift ${shiftObj.short} berhasil disimpan! Kepatuhan: ${complianceScore}%`, 'success');

        updateKPICards();
        renderTrackerView();
        renderGalleryView();
        renderFindingsView();
        renderOfficialReport();

        setTimeout(() => {
            const trackerBtn = document.querySelector('[data-tab="tab-tracker"]');
            if (trackerBtn) trackerBtn.click();
        }, 600);
    }

    // --------------------------------------------------------------------------
    // Tab 2: Tracker & 31-Day Inspection Matrix
    // --------------------------------------------------------------------------
    function renderTrackerView() {
        const matrixTable = document.getElementById('tracker-matrix-table');
        const historyContainer = document.getElementById('history-cards-container');
        const countBadge = document.getElementById('history-count-badge');
        if (!matrixTable) return;

        const [yearStr, monthStr] = (state.filterMonth || new Date().toISOString().substring(0, 7)).split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const daysInMonth = new Date(year, month, 0).getDate();

        const filtered = state.inspections.filter(ins => {
            const matchMonth = ins.date && ins.date.startsWith(state.filterMonth);
            const matchArea = state.filterArea === 'ALL' || ins.areaId === state.filterArea;
            return matchMonth && matchArea;
        });

        if (countBadge) countBadge.textContent = `${filtered.length} Data Patroli`;

        let thead = '<thead><tr><th class="sticky-col">Shift / Jadwal</th>';
        for (let d = 1; d <= daysInMonth; d++) {
            thead += `<th>${d}</th>`;
        }
        thead += '</tr></thead>';

        let tbody = '<tbody>';

        state.shifts.forEach(shift => {
            tbody += `<tr><td class="sticky-col" style="color: ${shift.color}; font-weight: 700;">
                <i class="fa-solid ${shift.icon}"></i> ${shift.short} Shift
            </td>`;

            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = `${state.filterMonth}-${String(d).padStart(2, '0')}`;
                const matchIns = filtered.find(ins => ins.date === dayStr && ins.shift === shift.id);

                if (matchIns) {
                    const hasFinding = matchIns.status === 'has_findings';
                    const dotClass = hasFinding ? 'dot-finding' : 'dot-clean';
                    const title = `${matchIns.areaName} • ${matchIns.picName} • Skor: ${matchIns.complianceScore}%`;
                    tbody += `<td class="matrix-day-cell" title="${title}" onclick="window.viewInspectionDetail('${matchIns.id}')">
                        <div class="shift-status-dots">
                            <span class="shift-dot ${dotClass}"></span>
                            <span style="font-size: 0.65rem; font-weight: 700; color: ${hasFinding ? '#f43f5e' : '#10b981'};">
                                ${hasFinding ? 'X' : '√'}
                            </span>
                        </div>
                    </td>`;
                } else {
                    tbody += `<td class="matrix-day-cell">
                        <div class="shift-status-dots">
                            <span class="shift-dot dot-empty"></span>
                        </div>
                    </td>`;
                }
            }
            tbody += '</tr>';
        });

        tbody += `<tr><td class="sticky-col" style="color: #f59e0b; font-weight: 700;">
            <i class="fa-solid fa-sparkles"></i> Deep Clean (Sabtu)
        </td>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month - 1, d);
            const isSat = dateObj.getDay() === 6;
            const dayStr = `${state.filterMonth}-${String(d).padStart(2, '0')}`;
            const satIns = filtered.find(ins => ins.date === dayStr && ins.deepCleaningDone);

            if (isSat) {
                tbody += `<td class="matrix-day-cell" style="background: rgba(245, 158, 11, 0.08);">
                    <span style="font-size: 0.7rem; font-weight: 800; color: ${satIns ? '#10b981' : '#f59e0b'};">
                        ${satIns ? 'DC √' : 'DC'}
                    </span>
                </td>`;
            } else {
                tbody += `<td class="matrix-day-cell" style="color: var(--text-muted); opacity: 0.3;">-</td>`;
            }
        }
        tbody += '</tr></tbody>';

        matrixTable.innerHTML = thead + tbody;

        if (historyContainer) {
            if (filtered.length === 0) {
                historyContainer.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary); background: var(--bg-card); border-radius: var(--radius-xl); border: 1px dashed var(--border-color);">
                        <i class="fa-solid fa-clipboard-question" style="font-size: 2.5rem; margin-bottom: 12px; color: var(--text-muted);"></i>
                        <p style="font-size: 0.95rem; font-weight: 600;">Belum ada data pemeriksaan 5R pada bulan & area ini.</p>
                        <p style="font-size: 0.8rem; margin-top: 4px;">Gunakan menu Form Patroli untuk mulai mencatat keliling shift.</p>
                    </div>`;
            } else {
                historyContainer.innerHTML = filtered.map(ins => {
                    const shiftObj = state.shifts.find(s => s.id === ins.shift) || { short: ins.shift, color: '#0ea5e9' };
                    const hasFindings = ins.status === 'has_findings';
                    const findingCount = ins.items ? ins.items.filter(i => i.status === 'finding').length : 0;

                    return `
                    <div class="history-card" onclick="window.viewInspectionDetail('${ins.id}')">
                        <div class="history-card-header">
                            <div>
                                <div class="history-date">${formatIndoDate(ins.date)}</div>
                                <div class="history-area"><i class="fa-solid fa-warehouse"></i> ${ins.areaName}</div>
                            </div>
                            <span class="chip-shift ${ins.shift}">${shiftObj.short} Shift</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; margin: 4px 0;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-family: var(--font-heading); font-weight: 800; font-size: 1.4rem; color: ${hasFindings ? '#f59e0b' : '#10b981'};">
                                    ${ins.complianceScore || 100}%
                                </span>
                                <span style="font-size: 0.75rem; color: var(--text-secondary);">Kepatuhan 5R</span>
                            </div>
                            ${hasFindings 
                                ? `<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; background: rgba(244, 63, 94, 0.15); color: #f43f5e; font-weight: 700;">
                                    ${findingCount} Temuan
                                   </span>`
                                : `<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 700;">
                                    Sempurna
                                   </span>`
                            }
                        </div>

                        <div class="history-meta-row" style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                            <span><i class="fa-solid fa-user-shield"></i> PIC: <strong>${ins.picName}</strong></span>
                            <button type="button" class="btn btn-sm" style="padding: 5px 12px; font-size: 0.78rem; font-weight: 700; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--brand-primary); color: #38bdf8; background: rgba(2, 132, 199, 0.15);" onclick="event.stopPropagation(); window.viewInspectionDetail('${ins.id}')">
                                <i class="fa-solid fa-pen-to-square"></i> Lihat & Ketik Detail
                            </button>
                        </div>
                    </div>`;
                }).join('');
            }
        }
    }

    // --------------------------------------------------------------------------
    // Tab 3: Photo Gallery View
    // --------------------------------------------------------------------------
    function renderGalleryView() {
        const galleryContainer = document.getElementById('gallery-grid-container');
        if (!galleryContainer) return;

        const photos = [];

        state.inspections.forEach(ins => {
            if (state.galleryShiftFilter !== 'ALL' && ins.shift !== state.galleryShiftFilter) return;

            const overallPhotos = ins.overallPhotos || (ins.overallPhoto ? [ins.overallPhoto] : []);
            if (state.galleryTypeFilter === 'ALL' || state.galleryTypeFilter === 'clean') {
                overallPhotos.forEach((url, pIdx) => {
                    photos.push({
                        url: url,
                        type: 'clean',
                        title: overallPhotos.length > 1 ? `Overview Kebersihan Area #${pIdx+1}` : 'Overview Kebersihan Area',
                        desc: ins.notes || 'Pemeriksaan rutin area kerja',
                        area: ins.areaName,
                        shift: ins.shiftName,
                        date: ins.date,
                        pic: ins.picName,
                        inspectionId: ins.id
                    });
                });
            }

            if (ins.items && Array.isArray(ins.items)) {
                ins.items.forEach(it => {
                    const itemDef = state.checklistItems.find(c => c.id === it.itemId) || { title: `Item #${it.itemId}` };
                    const cleanPhotos = it.cleanPhotos || (it.cleanPhoto ? [it.cleanPhoto] : []);
                    const findingPhotos = it.photos || (it.photo ? [it.photo] : []);
                    const resolvedPhotos = it.resolvedPhotos || (it.resolvedPhoto ? [it.resolvedPhoto] : []);

                    if (state.galleryTypeFilter === 'ALL' || state.galleryTypeFilter === 'clean') {
                        cleanPhotos.forEach((url, pIdx) => {
                            photos.push({
                                url: url,
                                type: 'clean',
                                title: cleanPhotos.length > 1 ? `${itemDef.title} #${pIdx+1}` : itemDef.title,
                                desc: 'Kondisi bersih & teratur sesuai SOP',
                                area: ins.areaName,
                                shift: ins.shiftName,
                                date: ins.date,
                                pic: ins.picName,
                                inspectionId: ins.id
                            });
                        });
                    }

                    if (state.galleryTypeFilter === 'ALL' || state.galleryTypeFilter === 'finding') {
                        findingPhotos.forEach((url, pIdx) => {
                            photos.push({
                                url: url,
                                type: 'finding',
                                title: findingPhotos.length > 1 ? `${itemDef.title} #${pIdx+1}` : itemDef.title,
                                desc: it.note || 'Temuan ketidaksesuaian 5R',
                                area: ins.areaName,
                                shift: ins.shiftName,
                                date: ins.date,
                                pic: ins.picName,
                                inspectionId: ins.id
                            });
                        });
                    }

                    if (state.galleryTypeFilter === 'ALL' || state.galleryTypeFilter === 'clean') {
                        resolvedPhotos.forEach((url, pIdx) => {
                            photos.push({
                                url: url,
                                type: 'resolved',
                                title: resolvedPhotos.length > 1 ? `[Perbaikan] ${itemDef.title} #${pIdx+1}` : `[Perbaikan] ${itemDef.title}`,
                                desc: it.resolvedNote || 'Telah diselesaikan oleh tim',
                                area: ins.areaName,
                                shift: ins.shiftName,
                                date: it.resolvedAt ? it.resolvedAt.split(' ')[0] : ins.date,
                                pic: ins.picName,
                                inspectionId: ins.id
                            });
                        });
                    }
                });
            }
        });

        if (photos.length === 0) {
            galleryContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: var(--text-secondary); background: var(--bg-card); border-radius: var(--radius-xl); border: 1px dashed var(--border-color);">
                    <i class="fa-solid fa-camera" style="font-size: 2.5rem; margin-bottom: 12px; color: var(--text-muted);"></i>
                    <p style="font-size: 0.95rem; font-weight: 600;">Belum ada dokumentasi foto yang sesuai filter.</p>
                    <p style="font-size: 0.8rem; margin-top: 4px;">Gunakan kamera langsung di Form Patroli untuk mengambil bukti visual.</p>
                </div>`;
            return;
        }

        galleryContainer.innerHTML = photos.map(photo => {
            const isFinding = photo.type === 'finding';
            const badgeBg = isFinding ? '#f43f5e' : (photo.type === 'resolved' ? '#0ea5e9' : '#10b981');
            const badgeText = isFinding ? 'TEMUAN' : (photo.type === 'resolved' ? 'SELESAI' : 'BERSIH');

            return `
            <div class="gallery-card" onclick="window.openLightbox('${encodeURI(photo.url)}', '${encodeURIComponent(photo.title)}', '${encodeURIComponent(photo.desc)}', '${encodeURIComponent(photo.date + ' • ' + photo.area)}')">
                <div class="gallery-image-wrapper">
                    <img src="${photo.url}" alt="${photo.title}" loading="lazy">
                    <div style="position: absolute; top: 8px; left: 8px; background: ${badgeBg}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.68rem; font-weight: 800;">
                        ${badgeText}
                    </div>
                    <div class="gallery-watermark-overlay">
                        <div><i class="fa-regular fa-calendar"></i> ${formatIndoDate(photo.date)}</div>
                        <div><i class="fa-solid fa-location-dot"></i> ${photo.area}</div>
                    </div>
                </div>
                <div class="gallery-card-body">
                    <div class="gallery-item-title">${photo.title}</div>
                    <div class="gallery-item-desc">${photo.desc}</div>
                    <div style="margin-top: 6px; font-size: 0.72rem; color: var(--text-muted);">
                        Oleh: <strong>${photo.pic}</strong>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    // --------------------------------------------------------------------------
    // Tab 4: Monitoring Temuan & CAPA
    // --------------------------------------------------------------------------
    function renderFindingsView() {
        const container = document.getElementById('findings-list-container');
        if (!container) return;

        // Gather ALL findings (unfiltered) for pill counts
        let totalAll = 0, totalOpen = 0, totalResolved = 0;
        state.inspections.forEach(ins => {
            if (ins.items && Array.isArray(ins.items)) {
                ins.items.forEach(it => {
                    if (it.status === 'finding') {
                        totalAll++;
                        if (it.resolved) totalResolved++;
                        else totalOpen++;
                    }
                });
            }
        });
        const solveRate = totalAll > 0 ? Math.round((totalResolved / totalAll) * 100) : 100;

        // Update pill counts
        const pillAll = document.getElementById('pill-count-all');
        const pillOpen = document.getElementById('pill-count-open');
        const pillResolved = document.getElementById('pill-count-resolved');
        const pillRate = document.getElementById('pill-count-rate');
        if (pillAll) pillAll.textContent = totalAll;
        if (pillOpen) pillOpen.textContent = totalOpen;
        if (pillResolved) pillResolved.textContent = totalResolved;
        if (pillRate) pillRate.textContent = `${solveRate}%`;

        // Update pill active state to match filter
        document.querySelectorAll('.finding-stat-pill[data-filter]').forEach(p => {
            p.classList.toggle('active', p.dataset.filter === state.findingsFilter);
        });

        const findings = [];
        state.inspections.forEach(ins => {
            if (ins.items && Array.isArray(ins.items)) {
                ins.items.forEach(it => {
                    if (it.status === 'finding') {
                        const itemDef = state.checklistItems.find(c => c.id === it.itemId) || { title: `Item #${it.itemId}` };
                        const isResolved = Boolean(it.resolved);

                        if (state.findingsFilter === 'ALL' || 
                           (state.findingsFilter === 'OPEN' && !isResolved) || 
                           (state.findingsFilter === 'RESOLVED' && isResolved)) {
                            const fPhotos = it.photos || (it.photo ? [it.photo] : []);
                            const rPhotos = it.resolvedPhotos || (it.resolvedPhoto ? [it.resolvedPhoto] : []);
                            findings.push({
                                inspectionId: ins.id,
                                itemId: it.itemId,
                                itemTitle: itemDef.title,
                                category: itemDef.category,
                                rPrinciple: itemDef.rPrinciple,
                                date: ins.date,
                                shift: ins.shiftName,
                                area: ins.areaName,
                                pic: ins.picName,
                                note: it.note,
                                photo: fPhotos[0] || null,
                                photos: fPhotos,
                                resolved: isResolved,
                                resolvedAt: it.resolvedAt,
                                resolvedNote: it.resolvedNote,
                                resolvedPhoto: rPhotos[0] || null,
                                resolvedPhotos: rPhotos
                            });
                        }
                    }
                });
            }
        });

        if (findings.length === 0) {
            const filterLabel = state.findingsFilter === 'OPEN' ? 'Temuan Open' : (state.findingsFilter === 'RESOLVED' ? 'Temuan Solved' : 'Temuan');
            container.innerHTML = `
                <div style="text-align: center; padding: 50px; color: var(--text-secondary); background: var(--bg-card); border-radius: var(--radius-xl); border: 1px dashed var(--border-color);">
                    <i class="fa-solid fa-circle-check" style="font-size: 2.8rem; margin-bottom: 12px; color: #10b981;"></i>
                    <p style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">Tidak ada ${filterLabel} berstatus ini!</p>
                    <p style="font-size: 0.82rem; margin-top: 4px;">Area warehouse terpelihara dengan sangat baik sesuai SOP.</p>
                </div>`;
            return;
        }

        container.innerHTML = findings.map(f => {
            const fPhotos = f.photos || (f.photo ? [f.photo] : []);
            const rPhotos = f.resolvedPhotos || (f.resolvedPhoto ? [f.resolvedPhoto] : []);

            return `
            <div class="finding-item-card ${f.resolved ? 'resolved' : 'pending'}">
                <div class="finding-header">
                    <div>
                        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
                            <span style="background: ${f.resolved ? 'rgba(16, 185, 129, 0.16)' : 'rgba(244, 63, 94, 0.16)'}; color: ${f.resolved ? '#10b981' : '#f43f5e'}; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 800;">
                                ${f.resolved ? '✓ SOLVED / SELESAI' : '⚠ OPEN / PERLU TINDAKAN'}
                            </span>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">${formatIndoDate(f.date)} • ${f.shift}</span>
                        </div>
                        <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">${f.itemTitle}</h3>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
                            <i class="fa-solid fa-location-dot"></i> Area: <strong>${f.area}</strong> | PIC Pelapor: <strong>${f.pic}</strong>
                        </div>
                    </div>

                    ${!f.resolved ? `
                        <button type="button" class="btn btn-success btn-sm" onclick="window.openResolveModal('${f.inspectionId}', ${f.itemId})">
                            <i class="fa-solid fa-wrench"></i> Selesaikan Temuan
                        </button>
                    ` : `
                        <div style="text-align: right;">
                            <span style="font-size: 0.78rem; color: #10b981; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                                <i class="fa-solid fa-check-circle"></i> Selesai diperbaiki
                            </span>
                            <span style="font-size: 0.72rem; color: var(--text-muted);">${f.resolvedAt || '-'}</span>
                        </div>
                    `}
                </div>

                <div style="background: rgba(244, 63, 94, 0.08); border-left: 3px solid #f43f5e; padding: 10px 14px; border-radius: 6px; font-size: 0.85rem;">
                    <strong>Catatan Temuan:</strong> ${f.note || 'Tidak ada catatan tertulis.'}
                </div>

                ${f.resolved && f.resolvedNote ? `
                    <div style="background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; padding: 10px 14px; border-radius: 6px; font-size: 0.85rem;">
                        <strong><i class='fa-solid fa-wrench'></i> Tindakan Perbaikan (After):</strong> ${f.resolvedNote}
                    </div>
                ` : ''}

                <div class="finding-comparison-photos" style="display: flex; gap: 16px; flex-wrap: wrap;">
                    ${fPhotos.length > 0 ? `
                        <div class="photo-compare-box" style="flex: 1; min-width: 200px;">
                            <div class="photo-compare-label" style="color: #f43f5e; margin-bottom: 6px;">
                                <span><i class="fa-solid fa-triangle-exclamation"></i> Foto Sebelum (Temuan - ${fPhotos.length} Foto)</span>
                            </div>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                ${fPhotos.map((p, idx) => `
                                    <div class="photo-thumb-card" style="width: 76px; height: 76px;" onclick="window.openLightbox('${encodeURI(p)}', 'Foto Sebelum #${idx+1}: ${encodeURIComponent(f.itemTitle)}')">
                                        <img src="${p}" alt="Sebelum #${idx+1}">
                                        <span class="photo-thumb-idx">#${idx+1}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${rPhotos.length > 0 ? `
                        <div class="photo-compare-box" style="flex: 1; min-width: 200px;">
                            <div class="photo-compare-label" style="color: #10b981; margin-bottom: 6px;">
                                <span><i class="fa-solid fa-circle-check"></i> Foto Sesudah (Perbaikan - ${rPhotos.length} Foto)</span>
                            </div>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                ${rPhotos.map((p, idx) => `
                                    <div class="photo-thumb-card" style="width: 76px; height: 76px;" onclick="window.openLightbox('${encodeURI(p)}', 'Foto Sesudah #${idx+1}: ${encodeURIComponent(f.itemTitle)}')">
                                        <img src="${p}" alt="Sesudah #${idx+1}">
                                        <span class="photo-thumb-idx">#${idx+1}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>`;
        }).join('');
    }

    window.openResolveModal = function(inspectionId, itemId) {
        state.resolvingFinding = { inspectionId, itemId };
        state.resolvePhoto = null;
        state.resolvePhotos = [];
        renderResolvePhotos();

        const ins = state.inspections.find(i => i.id === inspectionId);
        if (!ins) return;
        const it = ins.items.find(i => i.itemId === itemId);
        const itemDef = state.checklistItems.find(c => c.id === itemId) || { title: `Item #${itemId}` };

        document.getElementById('resolve-item-meta').textContent = `${formatIndoDate(ins.date)} • ${ins.shiftName} • ${ins.areaName}`;
        document.getElementById('resolve-item-title').textContent = itemDef.title;
        document.getElementById('resolve-item-notes').textContent = `Catatan: ${it?.note || '-'}`;
        document.getElementById('resolve-action-notes').value = '';

        const modal = document.getElementById('modal-resolve');
        if (modal) modal.classList.add('open');
    };

    async function saveResolveFinding() {
        if (!state.resolvingFinding) return;
        const { inspectionId, itemId } = state.resolvingFinding;
        const actionNotes = document.getElementById('resolve-action-notes')?.value.trim();
        const afterPhotos = state.resolvePhotos || [];
        const afterPhoto = afterPhotos[0] || state.resolvePhoto;

        if (!actionNotes) {
            showToast('Silakan jelaskan tindakan perbaikan yang telah dilakukan.', 'danger');
            document.getElementById('resolve-action-notes')?.focus();
            return;
        }

        const ins = state.inspections.find(i => i.id === inspectionId);
        if (ins) {
            const it = ins.items.find(i => i.itemId === itemId);
            if (it) {
                it.resolved = true;
                it.resolvedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
                it.resolvedNote = actionNotes;
                it.resolvedPhotos = afterPhotos;
                if (afterPhoto) it.resolvedPhoto = afterPhoto;

                const stillOpen = ins.items.some(i => i.status === 'finding' && !i.resolved);
                if (!stillOpen) {
                    ins.status = 'resolved';
                }

                await window.storageEngine.saveInspection(ins);
                showToast('Temuan berhasil diselesaikan (Closed) dengan bukti tindakan perbaikan!', 'success');

                document.getElementById('modal-resolve')?.classList.remove('open');
                state.resolvingFinding = null;
                state.resolvePhotos = [];

                updateKPICards();
                renderFindingsView();
                renderGalleryView();
            }
        }
    }

    // --------------------------------------------------------------------------
    // Tab 5: Official Report & Print Sheet (A4 Landscape Precision Layout)
    // --------------------------------------------------------------------------
    function renderOfficialReport() {
        const table = document.getElementById('print-matrix-table');
        const findingsTable = document.getElementById('print-findings-table');
        if (!table) return;

        const [yearStr, monthStr] = (state.filterMonth || new Date().toISOString().substring(0, 7)).split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const daysInMonth = new Date(year, month, 0).getDate();

        const monthName = getIndoMonthName(month);
        const monthYearLabel = document.getElementById('print-month-year');
        if (monthYearLabel) monthYearLabel.textContent = `${monthName} ${year}`;

        // Ensure signers are displayed
        updateSignersUI();

        // Header: No, Item Pengecekan, 1 - 31
        let thead = '<thead><tr>';
        thead += '<th style="width: 25px;">No</th>';
        thead += '<th class="col-item" style="width: 200px;">ITEM PENGECEKAN 5R</th>';
        for (let d = 1; d <= daysInMonth; d++) {
            thead += `<th style="width: calc((100% - 225px) / 31);">${d}</th>`;
        }
        thead += '</tr></thead>';

        let tbody = '<tbody>';

        state.checklistItems.forEach((item, idx) => {
            tbody += `<tr>
                <td style="font-weight: bold;">${idx + 1}</td>
                <td class="col-item" style="font-weight: 600;">
                    ${item.title}
                </td>`;

            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = `${state.filterMonth}-${String(d).padStart(2, '0')}`;
                const dayInspections = state.inspections.filter(i => {
                    const matchMonth = i.date === dayStr;
                    const matchArea = state.filterArea === 'ALL' || i.areaId === state.filterArea;
                    return matchMonth && matchArea;
                });

                let cellMark = '';
                let cellColor = '#000000';

                if (dayInspections.length > 0) {
                    let hasFinding = false;
                    dayInspections.forEach(ins => {
                        const it = ins.items?.find(i => i.itemId === item.id);
                        if (it && it.status === 'finding') hasFinding = true;
                    });

                    if (hasFinding) {
                        cellMark = 'X';
                        cellColor = '#dc2626';
                    } else {
                        cellMark = '√';
                        cellColor = '#16a34a';
                    }
                }

                tbody += `<td style="font-weight: bold; color: ${cellColor};">
                    ${cellMark}
                </td>`;
            }
            tbody += '</tr>';
        });

        // Saturday Deep Cleaning Row
        tbody += `<tr>
            <td style="font-weight: bold;">DC</td>
            <td class="col-item" style="font-weight: bold;">Deep cleaning dilakukan (khusus hari SABTU)</td>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const isSat = new Date(year, month - 1, d).getDay() === 6;
            const dayStr = `${state.filterMonth}-${String(d).padStart(2, '0')}`;
            const satIns = state.inspections.find(i => {
                const matchDate = i.date === dayStr && i.deepCleaningDone;
                const matchArea = state.filterArea === 'ALL' || i.areaId === state.filterArea;
                return matchDate && matchArea;
            });

            tbody += `<td style="font-weight: bold; color: ${satIns ? '#16a34a' : '#d97706'};">
                ${isSat ? (satIns ? '√' : 'O') : '-'}
            </td>`;
        }
        tbody += '</tr>';

        // PIC Initials Row
        tbody += `<tr>
            <td style="font-weight: bold;">P</td>
            <td class="col-item" style="font-style: italic;">Paraf / Nama Petugas PIC</td>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const dayStr = `${state.filterMonth}-${String(d).padStart(2, '0')}`;
            const dayIns = state.inspections.find(i => {
                const matchDate = i.date === dayStr;
                const matchArea = state.filterArea === 'ALL' || i.areaId === state.filterArea;
                return matchDate && matchArea;
            });
            const initial = dayIns ? dayIns.picName.split(' ')[0].substring(0, 3) : '';
            tbody += `<td style="font-size: 6.5pt; font-weight: bold; color: #0284c7;">
                ${initial}
            </td>`;
        }
        tbody += '</tr>';

        tbody += '</tbody>';
        table.innerHTML = thead + tbody;

        // Render Compact Monthly Findings Table
        if (findingsTable) {
            const monthlyFindings = [];
            state.inspections.filter(i => i.date.startsWith(state.filterMonth)).forEach(ins => {
                if (ins.items) {
                    ins.items.forEach(it => {
                        if (it.status === 'finding') {
                            const def = state.checklistItems.find(c => c.id === it.itemId);
                            monthlyFindings.push({
                                date: ins.date,
                                area: ins.areaName,
                                item: def?.title || it.itemId,
                                note: it.note,
                                resolved: it.resolved,
                                action: it.resolvedNote || (it.resolved ? 'Telah diperbaiki' : 'Menunggu tindakan')
                            });
                        }
                    });
                }
            });

            if (monthlyFindings.length === 0) {
                findingsTable.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 4px; font-style: italic; color: #16a34a;">Tidak ada temuan ketidaksesuaian pada periode bulan ini (Area bersih & sesuai SOP).</td></tr>`;
            } else {
                let fHtml = `<thead><tr>
                    <th style="width: 70px;">Tanggal</th>
                    <th style="width: 140px; text-align: left;">Area</th>
                    <th style="width: 200px; text-align: left;">Item Temuan</th>
                    <th style="text-align: left;">Catatan Masalah</th>
                    <th style="width: 170px; text-align: left;">Tindakan Perbaikan</th>
                </tr></thead><tbody>`;
                monthlyFindings.slice(0, 4).forEach(f => {
                    fHtml += `<tr>
                        <td>${f.date}</td>
                        <td style="text-align: left;">${f.area}</td>
                        <td style="text-align: left;">${f.item}</td>
                        <td style="text-align: left;">${f.note}</td>
                        <td style="text-align: left; color: ${f.resolved ? '#16a34a' : '#dc2626'}; font-weight: bold;">
                            ${f.resolved ? '√ ' : 'X '}${f.action}
                        </td>
                    </tr>`;
                });
                fHtml += '</tbody>';
                findingsTable.innerHTML = fHtml;
            }
        }
    }

    // --------------------------------------------------------------------------
    // Export Actions (Formatted Excel & CSV)
    // --------------------------------------------------------------------------
    function exportToExcelXLS() {
        if (state.inspections.length === 0) {
            showToast('Belum ada data untuk diekspor.', 'warn');
            return;
        }

        const [yearStr, monthStr] = (state.filterMonth || new Date().toISOString().substring(0, 7)).split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const daysInMonth = new Date(year, month, 0).getDate();
        const monthName = getIndoMonthName(month);

        let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
            <style>
                table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10pt; }
                th, td { border: 1px solid #000000; padding: 6px; text-align: center; }
                th { background-color: #f1f5f9; font-weight: bold; }
                .title-header { font-size: 14pt; font-weight: bold; text-align: left; background-color: #e2e8f0; }
                .sub-header { font-size: 9pt; text-align: left; }
                .ok-mark { color: #16a34a; font-weight: bold; }
                .finding-mark { color: #dc2626; font-weight: bold; }
            </style>
        </head>
        <body>
            <table>
                <tr>
                    <td colspan="${daysInMonth + 2}" class="title-header">FORM CHECKLIST KEBERSIHAN & 5R WAREHOUSE</td>
                </tr>
                <tr>
                    <td colspan="${daysInMonth + 2}" class="sub-header">Warehouse Cikuda (CKD) - Tim Inventory | No. Dok: CKD-5R-SOP-01 Rev: 02</td>
                </tr>
                <tr>
                    <td colspan="${daysInMonth + 2}" class="sub-header">Bulan/Tahun: ${monthName} ${year} | Area: ${state.filterArea === 'ALL' ? 'Semua Area' : state.filterArea}</td>
                </tr>
                <tr>
                    <td colspan="${daysInMonth + 2}" class="sub-header">SPV Inventory: ${state.signers.spvName} | Warehouse Manager: ${state.signers.mgrName}</td>
                </tr>
                <tr></tr>
                <tr style="background-color: #e2e8f0;">
                    <th style="width: 40px;">No</th>
                    <th style="width: 280px; text-align: left;">Item Pengecekan 5R</th>`;

        for (let d = 1; d <= daysInMonth; d++) {
            html += `<th style="width: 30px;">${d}</th>`;
        }
        html += `</tr>`;

        state.checklistItems.forEach((item, idx) => {
            html += `<tr>
                <td>${idx + 1}</td>
                <td style="text-align: left;">${item.title}</td>`;

            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = `${state.filterMonth}-${String(d).padStart(2, '0')}`;
                const dayInspections = state.inspections.filter(i => i.date === dayStr);

                let mark = '';
                let markClass = '';
                if (dayInspections.length > 0) {
                    let hasFinding = false;
                    dayInspections.forEach(ins => {
                        const it = ins.items?.find(i => i.itemId === item.id);
                        if (it && it.status === 'finding') hasFinding = true;
                    });
                    if (hasFinding) {
                        mark = 'X';
                        markClass = 'finding-mark';
                    } else {
                        mark = '√';
                        markClass = 'ok-mark';
                    }
                }
                html += `<td class="${markClass}">${mark}</td>`;
            }
            html += `</tr>`;
        });

        html += `<tr>
            <td>DC</td>
            <td style="text-align: left; font-weight: bold;">Deep cleaning dilakukan (khusus hari SABTU)</td>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const isSat = new Date(year, month - 1, d).getDay() === 6;
            const dayStr = `${state.filterMonth}-${String(d).padStart(2, '0')}`;
            const satIns = state.inspections.find(i => i.date === dayStr && i.deepCleaningDone);
            html += `<td>${isSat ? (satIns ? '√' : 'O') : '-'}</td>`;
        }
        html += `</tr>`;

        html += `<tr>
            <td>P</td>
            <td style="text-align: left; font-style: italic;">Paraf / Nama Petugas PIC</td>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const dayStr = `${state.filterMonth}-${String(d).padStart(2, '0')}`;
            const dayIns = state.inspections.find(i => i.date === dayStr);
            const initial = dayIns ? dayIns.picName.split(' ')[0] : '';
            html += `<td>${initial}</td>`;
        }
        html += `</tr>`;

        html += `</table></body></html>`;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        triggerDownload(blob, `5R_Warehouse_Matrix_${state.filterMonth}.xls`);
        showToast('File Excel (.xls) berhasil diunduh!', 'success');
    }

    function exportToCSV() {
        if (state.inspections.length === 0) {
            showToast('Belum ada data untuk diekspor.', 'warn');
            return;
        }

        const rows = [
            ['ID Inspeksi', 'Tanggal', 'Shift', 'Area Warehouse', 'Nama PIC', 'SPV Inventory', 'Skor Kepatuhan (%)', 'Status', 'Catatan Patroli']
        ];

        state.inspections.forEach(ins => {
            rows.push([
                ins.id,
                ins.date,
                ins.shiftName,
                ins.areaName,
                ins.picName,
                ins.spvName || state.signers.spvName,
                ins.complianceScore || 100,
                ins.status === 'clean' ? 'Bersih (√)' : 'Ada Temuan (X)',
                `"${(ins.notes || '').replace(/"/g, '""')}"`
            ]);
        });

        const csvContent = '\uFEFF' + rows.map(e => e.join(';')).join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `5R_Warehouse_Data_${state.filterMonth}.csv`);
        showToast('File CSV berhasil diunduh!', 'success');
    }

    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 1500);
    }

    function exportBackupJSON() {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.inspections, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `Warehouse_5R_Backup_${Date.now()}.json`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
        }, 1500);
        showToast('Backup data JSON berhasil diunduh.', 'success');
    }

    // --------------------------------------------------------------------------
    // Lightbox & Modal Helpers
    // --------------------------------------------------------------------------
    window.openLightbox = function(url, title, desc, meta) {
        let decodedUrl = url;
        try { decodedUrl = decodeURI(url); } catch (e) { decodedUrl = url; }
        let decodedTitle = title || 'Bukti Foto 5R';
        try { decodedTitle = decodeURIComponent(title || 'Bukti Foto 5R'); } catch (e) { decodedTitle = title || 'Bukti Foto 5R'; }
        let decodedDesc = desc || '';
        try { decodedDesc = decodeURIComponent(desc || ''); } catch (e) { decodedDesc = desc || ''; }
        let decodedMeta = meta || '';
        try { decodedMeta = decodeURIComponent(meta || ''); } catch (e) { decodedMeta = meta || ''; }

        const modal = document.getElementById('modal-lightbox');
        const img = document.getElementById('lightbox-image');
        const titleEl = document.getElementById('lightbox-title');
        const descEl = document.getElementById('lightbox-desc');
        const metaRightEl = document.getElementById('lightbox-meta-right');
        const downloadBtn = document.getElementById('btn-download-lightbox');

        if (img) img.src = decodedUrl;
        if (titleEl) titleEl.textContent = decodedTitle;
        if (descEl) descEl.textContent = decodedDesc;
        if (metaRightEl) metaRightEl.textContent = decodedMeta;
        if (downloadBtn) downloadBtn.href = decodedUrl;

        if (modal) modal.classList.add('open');
    };

    window.viewInspectionDetail = function(inspectionId) {
        const ins = state.inspections.find(i => i.id === inspectionId);
        if (!ins) return;

        const modal = document.getElementById('modal-inspection-detail');
        const body = document.getElementById('modal-detail-body');
        const titleEl = document.getElementById('modal-detail-title');
        const subtitleEl = document.getElementById('modal-detail-subtitle');
        if (!modal || !body) return;

        modal.dataset.currentInsId = ins.id;

        const shiftObj = state.shifts.find(s => s.id === ins.shift) || { short: ins.shift, color: '#0ea5e9' };
        const hasFinding = ins.status === 'has_findings' || ins.status === 'resolved';
        const findingItems = (ins.items || []).filter(it => it.status === 'finding');
        const openFindings = findingItems.filter(it => !it.resolved).length;
        const resolvedFindings = findingItems.filter(it => it.resolved).length;

        if (titleEl) titleEl.textContent = `${ins.areaName} — ${shiftObj.short} Shift`;
        if (subtitleEl) subtitleEl.textContent = `${formatIndoDate(ins.date)} • PIC: ${ins.picName}`;

        // Build checklist table rows
        const checklistRows = (ins.items || []).map(it => {
            const def = state.checklistItems.find(c => c.id === it.itemId);
            let badge = '';
            if (it.status === 'ok') {
                badge = `<span class="detail-status-badge badge-ok"><i class="fa-solid fa-check"></i> Sesuai</span>`;
            } else if (it.status === 'finding') {
                if (it.resolved) {
                    badge = `<span class="detail-status-badge" style="background:rgba(16,185,129,0.12);color:#10b981;"><i class="fa-solid fa-wrench"></i> Solved</span>`;
                } else {
                    badge = `<span class="detail-status-badge badge-finding"><i class="fa-solid fa-triangle-exclamation"></i> Temuan</span>`;
                }
            } else {
                badge = `<span class="detail-status-badge badge-na">N/A</span>`;
            }

            const itemPhotos = it.photos || (it.photo ? [it.photo] : []);
            const cleanPhotos = it.cleanPhotos || (it.cleanPhoto ? [it.cleanPhoto] : []);
            const resolvedPhotos = it.resolvedPhotos || (it.resolvedPhoto ? [it.resolvedPhoto] : []);

            let photoThumbs = '';
            if (itemPhotos.length > 0) {
                photoThumbs += `<div style="display:flex;gap:4px;margin-top:4px;">` + itemPhotos.map((p, idx) => `
                    <img src="${p}" style="width:36px;height:36px;border-radius:4px;object-fit:cover;cursor:pointer;border:1px solid #f43f5e;" onclick="window.openLightbox('${encodeURI(p)}', 'Foto Temuan #${idx+1}')">
                `).join('') + `</div>`;
            }
            if (cleanPhotos.length > 0) {
                photoThumbs += `<div style="display:flex;gap:4px;margin-top:4px;">` + cleanPhotos.map((p, idx) => `
                    <img src="${p}" style="width:36px;height:36px;border-radius:4px;object-fit:cover;cursor:pointer;border:1px solid #10b981;" onclick="window.openLightbox('${encodeURI(p)}', 'Foto Bersih #${idx+1}')">
                `).join('') + `</div>`;
            }
            if (resolvedPhotos.length > 0) {
                photoThumbs += `<div style="display:flex;gap:4px;margin-top:4px;">` + resolvedPhotos.map((p, idx) => `
                    <img src="${p}" style="width:36px;height:36px;border-radius:4px;object-fit:cover;cursor:pointer;border:1px solid #0284c7;" onclick="window.openLightbox('${encodeURI(p)}', 'Foto Perbaikan #${idx+1}')">
                `).join('') + `</div>`;
            }

            const cameraBtn = (it.status === 'finding' && !it.resolved) ? `
                <button type="button" style="background:rgba(16,185,129,0.12);border:1px solid #10b981;color:#10b981;border-radius:6px;padding:3px 8px;font-size:0.72rem;cursor:pointer;margin-top:4px;display:inline-flex;align-items:center;gap:4px;" onclick="window.openResolveModal('${ins.id}', ${it.itemId}); document.getElementById('modal-inspection-detail').classList.remove('open');">
                    <i class="fa-solid fa-wrench"></i> Selesaikan
                </button>` : '';

            const codeDisplay = def?.code || ('5R-0' + it.itemId);

            return `<tr>
                <td style="font-weight:700;color:#38bdf8;font-family:var(--font-mono);font-size:0.8rem;">${codeDisplay}</td>
                <td style="text-align:left;font-weight:600;color:var(--text-primary);line-height:1.35;">${def?.title || 'Item #' + it.itemId}</td>
                <td>
                    <div style="display:flex;flex-direction:column;align-items:flex-start;gap:4px;">
                        ${badge}
                        ${cameraBtn}
                        ${photoThumbs}
                    </div>
                </td>
                <td style="font-size:0.8rem;color:var(--text-secondary);text-align:left;line-height:1.4;">
                    ${it.note ? `<div style="color:var(--text-primary);">${it.note}</div>` : ''}
                    ${it.resolvedNote ? `<div style="color:#10b981;margin-top:3px;font-weight:600;font-size:0.78rem;"><i class="fa-solid fa-check"></i> ${it.resolvedNote}</div>` : ''}
                    ${(!it.note && !it.resolvedNote) ? '<span style="color:var(--text-muted);">—</span>' : ''}
                </td>
            </tr>`;
        }).join('');

        const overallPhotosList = ins.overallPhotos || (ins.overallPhoto ? [ins.overallPhoto] : []);

        body.innerHTML = `
            <!-- Top Section: 2 Balanced Panels (Desktop Split) -->
            <div class="detail-top-split">
                <!-- Left Panel: Summary KPIs & Overview Photo -->
                <div class="detail-panel">
                    <div class="detail-panel-title">
                        <i class="fa-solid fa-chart-pie" style="color:#0284c7;"></i> Ringkasan Patroli Area
                    </div>
                    
                    <div class="detail-kpi-bar">
                        <div class="detail-kpi-pill">
                            <div class="detail-kpi-label">Kepatuhan</div>
                            <div class="detail-kpi-val" style="color:${hasFinding ? '#f59e0b' : '#10b981'};">${ins.complianceScore || 100}%</div>
                        </div>
                        <div class="detail-kpi-pill">
                            <div class="detail-kpi-label">Total Temuan</div>
                            <div class="detail-kpi-val" style="color:${findingItems.length > 0 ? '#f43f5e' : '#10b981'};">${findingItems.length}</div>
                        </div>
                        <div class="detail-kpi-pill">
                            <div class="detail-kpi-label">Open / Solved</div>
                            <div class="detail-kpi-val">
                                <span style="color:#f43f5e;">${openFindings}</span> / <span style="color:#10b981;">${resolvedFindings}</span>
                            </div>
                        </div>
                        <div class="detail-kpi-pill">
                            <div class="detail-kpi-label">Shift</div>
                            <div class="detail-kpi-val" style="color:${shiftObj.color};font-size:0.92rem;line-height:1.35;">${shiftObj.short}</div>
                        </div>
                    </div>

                    <!-- Overview Area Photos -->
                    <div style="margin-top:4px;border-top:1px solid var(--border-color);padding-top:10px;">
                        <div style="font-size:0.75rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
                            <span><i class="fa-solid fa-camera" style="color:#38bdf8;"></i> Foto Overview Area</span>
                            <span style="font-size:0.7rem;color:var(--text-muted);">${overallPhotosList.length} Foto Tersimpan</span>
                        </div>
                        ${overallPhotosList.length > 0 ? `
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            ${overallPhotosList.map((p, idx) => `
                                <div class="photo-thumb-card" style="width:76px;height:76px;" onclick="window.openLightbox('${encodeURI(p)}', 'Overview #${idx+1}: ${encodeURIComponent(ins.areaName)}')">
                                    <img src="${p}" alt="Overview #${idx+1}">
                                    <span class="photo-thumb-idx">#${idx+1}</span>
                                </div>
                            `).join('')}
                        </div>
                        ` : `
                        <div style="font-size:0.75rem;color:var(--text-muted);font-style:italic;padding:4px 0;">
                            <i class="fa-regular fa-image" style="margin-right:4px;"></i> Tidak ada foto overview yang diunggah.
                        </div>
                        `}
                    </div>
                </div>

                <!-- Right Panel: Editable PIC, SPV & Notes -->
                <div class="detail-panel">
                    <div class="detail-panel-title" style="justify-content:space-between;">
                        <span style="display:flex;align-items:center;gap:6px;">
                            <i class="fa-solid fa-pen-to-square" style="color:#0284c7;"></i> Edit PIC & Catatan
                        </span>
                        <span style="font-size:0.68rem;background:rgba(56,189,248,0.12);color:#38bdf8;padding:2px 8px;border-radius:4px;font-weight:600;">
                            Bisa Langsung Diketik
                        </span>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div class="input-group">
                            <label class="input-label" style="font-size:0.72rem;margin-bottom:3px;"><i class="fa-solid fa-user-shield"></i> Nama PIC:</label>
                            <input type="text" id="detail-edit-pic" class="form-control" value="${ins.picName || ''}" placeholder="Nama PIC..." style="padding:7px 10px;font-size:0.83rem;">
                        </div>
                        <div class="input-group">
                            <label class="input-label" style="font-size:0.72rem;margin-bottom:3px;"><i class="fa-solid fa-user-check"></i> SPV Inventory:</label>
                            <input type="text" id="detail-edit-spv" class="form-control" value="${ins.spvName || ''}" placeholder="Nama SPV..." style="padding:7px 10px;font-size:0.83rem;">
                        </div>
                    </div>
                    <div class="input-group" style="flex:1;display:flex;flex-direction:column;">
                        <label class="input-label" style="font-size:0.72rem;margin-bottom:3px;"><i class="fa-regular fa-comment-dots"></i> Catatan Tambahan Petugas:</label>
                        <textarea id="detail-edit-notes" class="form-control" rows="3" style="font-size:0.83rem;resize:vertical;flex:1;" placeholder="Ketik catatan kondisi, perbaikan, atau catatan tambahan...">${ins.notes || ''}</textarea>
                    </div>
                    <div style="font-size:0.72rem;color:var(--text-muted);display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.03);padding:6px 10px;border-radius:6px;border:1px dashed var(--border-color);">
                        <i class="fa-solid fa-circle-info" style="color:#0284c7;"></i>
                        <span>Simpan perubahan dengan tombol hijau di bawah footer modal.</span>
                    </div>
                </div>
            </div>

            <!-- Bottom Section: Dedicated Full-Width Checklist Table (Semua 9 Item Rapi) -->
            <div class="detail-checklist-wrapper" style="margin-top:2px;">
                <div style="padding:10px 16px;background:var(--bg-surface);font-weight:700;font-size:0.86rem;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <i class="fa-solid fa-list-check" style="color:#0284c7;"></i>
                        <span>Detail 9 Item Checklist Standar 5R</span>
                    </div>
                    <span style="font-size:0.74rem;color:var(--text-secondary);font-weight:500;">9 Standar Terverifikasi</span>
                </div>
                <div style="overflow-x:auto;">
                    <table class="detail-checklist-table">
                        <thead><tr>
                            <th style="width:75px;">Kode</th>
                            <th>Item Standar 5R</th>
                            <th style="width:190px;">Status & Foto</th>
                            <th style="width:260px;">Catatan</th>
                        </tr></thead>
                        <tbody>${checklistRows}</tbody>
                    </table>
                </div>
            </div>
        `;

        // Store inspectionId in button for report link
        const detailToReport = document.getElementById('btn-detail-to-report');
        if (detailToReport) detailToReport.dataset.insId = ins.id;

        modal.classList.add('open');
    };

    window.saveInspectionDetailChanges = async function(inspectionId) {
        const ins = state.inspections.find(i => i.id === inspectionId);
        if (!ins) return;

        const newPic = document.getElementById('detail-edit-pic')?.value.trim();
        const newSpv = document.getElementById('detail-edit-spv')?.value.trim();
        const newNotes = document.getElementById('detail-edit-notes')?.value.trim();

        if (newPic) ins.picName = newPic;
        if (newSpv !== undefined) ins.spvName = newSpv;
        if (newNotes !== undefined) ins.notes = newNotes;

        await window.storageEngine.saveInspection(ins);
        showToast('Detail pemeriksaan berhasil disimpan & diperbarui!', 'success');

        const subtitleEl = document.getElementById('modal-detail-subtitle');
        if (subtitleEl) subtitleEl.textContent = `${formatIndoDate(ins.date)} • PIC: ${ins.picName}`;

        updateKPICards();
        renderTrackerView();
        renderFindingsView();
        renderOfficialReport();
    };

    // --------------------------------------------------------------------------
    // Event Listeners
    // --------------------------------------------------------------------------
    function setupEventListeners() {
        document.getElementById('btn-theme-toggle')?.addEventListener('click', toggleTheme);

        document.getElementById('btn-quick-sync')?.addEventListener('click', async () => {
            await loadInspections();
            updateKPICards();
            renderTrackerView();
            renderGalleryView();
            renderFindingsView();
            renderOfficialReport();
            showToast('Data berhasil dimuat ulang.', 'info');
        });

        document.getElementById('btn-quick-pass')?.addEventListener('click', quickPassAllClean);
        document.getElementById('btn-reset-form')?.addEventListener('click', resetForm);

        document.getElementById('form-date')?.addEventListener('change', (e) => {
            checkSaturday(e.target.value);
        });

        document.querySelectorAll('.shift-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const shiftId = btn.dataset.shift;
                state.selectedShift = shiftId;
                updateShiftPillUI(shiftId);
            });
        });

        document.getElementById('btn-overall-camera')?.addEventListener('click', () => {
            openLiveCamera({ type: 'overall' });
        });

        document.getElementById('btn-remove-overall-photo')?.addEventListener('click', () => {
            state.overallPhoto = null;
            const previewBox = document.getElementById('preview-overall-box');
            if (previewBox) previewBox.style.display = 'none';
        });

        document.getElementById('btn-clear-sig')?.addEventListener('click', clearSignature);
        document.getElementById('btn-submit-inspection')?.addEventListener('click', submitInspection);

        document.getElementById('tracker-month-select')?.addEventListener('change', (e) => {
            state.filterMonth = e.target.value;
            renderTrackerView();
            renderOfficialReport();
        });

        document.getElementById('tracker-area-filter')?.addEventListener('change', (e) => {
            state.filterArea = e.target.value;
            const printAreaLabel = document.getElementById('print-area-name');
            if (printAreaLabel) {
                printAreaLabel.textContent = e.target.options[e.target.selectedIndex].text;
            }
            renderTrackerView();
            renderOfficialReport();
        });

        document.getElementById('gallery-type-filter')?.addEventListener('change', (e) => {
            state.galleryTypeFilter = e.target.value;
            renderGalleryView();
        });

        document.getElementById('gallery-shift-filter')?.addEventListener('change', (e) => {
            state.galleryShiftFilter = e.target.value;
            renderGalleryView();
        });

        document.getElementById('findings-status-filter')?.addEventListener('change', (e) => {
            state.findingsFilter = e.target.value;
            renderFindingsView();
        });

        document.getElementById('btn-resolve-camera')?.addEventListener('click', () => {
            openLiveCamera({ type: 'resolve' });
        });

        document.getElementById('btn-remove-resolve-photo')?.addEventListener('click', () => {
            state.resolvePhoto = null;
            const previewBox = document.getElementById('preview-resolve-box');
            if (previewBox) previewBox.style.display = 'none';
        });

        document.getElementById('btn-save-resolve')?.addEventListener('click', saveResolveFinding);
        document.getElementById('btn-close-resolve')?.addEventListener('click', () => {
            document.getElementById('modal-resolve')?.classList.remove('open');
        });
        document.getElementById('btn-cancel-resolve')?.addEventListener('click', () => {
            document.getElementById('modal-resolve')?.classList.remove('open');
        });

        // Modal Detail Pemeriksaan 5R
        document.getElementById('btn-close-inspection-detail')?.addEventListener('click', () => {
            document.getElementById('modal-inspection-detail')?.classList.remove('open');
        });
        document.getElementById('btn-close-detail-footer')?.addEventListener('click', () => {
            document.getElementById('modal-inspection-detail')?.classList.remove('open');
        });
        document.getElementById('btn-save-detail-changes')?.addEventListener('click', () => {
            const currentInsId = document.getElementById('modal-inspection-detail')?.dataset.currentInsId;
            if (currentInsId) {
                window.saveInspectionDetailChanges(currentInsId);
            }
        });
        document.getElementById('btn-detail-to-report')?.addEventListener('click', () => {
            document.getElementById('modal-inspection-detail')?.classList.remove('open');
            // Switch to report tab
            const reportBtn = document.querySelector('[data-tab="tab-report"]');
            if (reportBtn) reportBtn.click();
        });
        // Close modal on backdrop click
        document.getElementById('modal-inspection-detail')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                e.currentTarget.classList.remove('open');
            }
        });

        // Findings Pills - click to change filter
        document.querySelectorAll('.finding-stat-pill[data-filter]').forEach(pill => {
            pill.addEventListener('click', () => {
                const filterVal = pill.dataset.filter;
                state.findingsFilter = filterVal;
                // Also sync dropdown
                const sel = document.getElementById('findings-status-filter');
                if (sel) sel.value = filterVal;
                renderFindingsView();
            });
        });

        // Print & Export Handlers
        document.getElementById('btn-print-official')?.addEventListener('click', () => {
            renderOfficialReport();
            window.print();
        });

        document.getElementById('btn-export-excel')?.addEventListener('click', exportToExcelXLS);
        document.getElementById('btn-export-csv')?.addEventListener('click', exportToCSV);
        document.getElementById('btn-export-json')?.addEventListener('click', exportBackupJSON);
        document.getElementById('btn-reset-db')?.addEventListener('click', clearAllInspections);
        document.getElementById('btn-load-demo')?.addEventListener('click', loadDemoSampleData);

        document.getElementById('btn-close-lightbox')?.addEventListener('click', () => {
            document.getElementById('modal-lightbox')?.classList.remove('open');
        });
        document.getElementById('btn-done-lightbox')?.addEventListener('click', () => {
            document.getElementById('modal-lightbox')?.classList.remove('open');
        });

        // QR Code Share Modal
        document.getElementById('btn-share-qr')?.addEventListener('click', () => {
            openQRShareModal();
        });
        ['btn-close-qr', 'btn-close-qr-footer'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => {
                document.getElementById('modal-qr-share')?.classList.remove('open');
            });
        });
        document.getElementById('modal-qr-share')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
        });
        document.getElementById('btn-qr-update')?.addEventListener('click', () => {
            const customIp = document.getElementById('qr-custom-ip')?.value.trim();
            if (customIp) {
                const url = `http://${customIp}:8080/`;
                renderQRCode(url);
            }
        });
        document.getElementById('btn-qr-copy')?.addEventListener('click', () => {
            const urlEl = document.getElementById('qr-url-display');
            if (urlEl && urlEl.textContent && urlEl.textContent !== 'Mendeteksi...') {
                navigator.clipboard.writeText(urlEl.textContent).then(() => {
                    showToast('URL berhasil disalin ke clipboard!', 'success');
                }).catch(() => {
                    showToast('Salin manual: ' + urlEl.textContent, 'info');
                });
            }
        });
    }

    // --------------------------------------------------------------------------
    // QR Code Share Modal Logic
    // --------------------------------------------------------------------------
    let qrCodeInstance = null;

    function renderQRCode(url) {
        const canvas = document.getElementById('qr-code-canvas');
        const urlDisplay = document.getElementById('qr-url-display');
        const statusText = document.getElementById('qr-status-text');
        const statusBar = document.getElementById('qr-status-bar');
        const openBtn = document.getElementById('btn-qr-open-url');

        if (!canvas) return;

        // Update URL display
        if (urlDisplay) urlDisplay.textContent = url;
        if (openBtn) openBtn.href = url;
        if (statusText) statusText.textContent = 'Server aktif — siap diakses dari HP!';
        if (statusBar) {
            statusBar.style.background = 'rgba(16,185,129,0.1)';
            statusBar.style.borderColor = 'rgba(16,185,129,0.3)';
            statusBar.style.color = '#10b981';
        }

        // Clear previous QR
        canvas.innerHTML = '';
        if (qrCodeInstance) {
            try { qrCodeInstance.clear(); } catch(e) {}
            qrCodeInstance = null;
        }

        // Generate new QR
        if (typeof QRCode !== 'undefined') {
            qrCodeInstance = new QRCode(canvas, {
                text: url,
                width: 200,
                height: 200,
                colorDark: '#0f172a',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            // Fallback: show URL only
            canvas.style.display = 'flex';
            canvas.style.alignItems = 'center';
            canvas.style.justifyContent = 'center';
            canvas.style.background = '#f1f5f9';
            canvas.style.borderRadius = '8px';
            canvas.style.padding = '12px';
            canvas.style.fontFamily = 'monospace';
            canvas.style.fontSize = '0.75rem';
            canvas.style.color = '#0f172a';
            canvas.style.wordBreak = 'break-all';
            canvas.innerHTML = `<div style="text-align:center;"><i class="fa-solid fa-qrcode" style="font-size:2.5rem;color:#0284c7;display:block;margin-bottom:8px;"></i>${url}</div>`;
        }
    }

    function openQRShareModal() {
        const modal = document.getElementById('modal-qr-share');
        if (!modal) return;
        modal.classList.add('open');

        // Detect current host
        const currentHostname = window.location.hostname;
        const isLocal = currentHostname === 'localhost' || currentHostname === '127.0.0.1' || currentHostname === '';

        let targetUrl;
        if (window.location.protocol === 'https:' || currentHostname.includes('vercel.app')) {
            targetUrl = window.location.origin + window.location.pathname;
            const statusText = document.getElementById('qr-status-text');
            const statusBar = document.getElementById('qr-status-bar');
            if (statusText) statusText.textContent = 'Server Online (Vercel Cloud)';
            if (statusBar) {
                statusBar.style.background = 'rgba(16,185,129,0.1)';
                statusBar.style.borderColor = 'rgba(16,185,129,0.3)';
                statusBar.style.color = '#10b981';
            }
        } else if (isLocal || !currentHostname) {
            // Running from file:// — use known local IP (user needs to start server)
            targetUrl = 'http://10.146.154.184:8080/';
            const statusText = document.getElementById('qr-status-text');
            const statusBar = document.getElementById('qr-status-bar');
            if (statusText) statusText.textContent = 'Jalankan Start Server.bat terlebih dahulu!';
            if (statusBar) {
                statusBar.style.background = 'rgba(245,158,11,0.1)';
                statusBar.style.borderColor = 'rgba(245,158,11,0.3)';
                statusBar.style.color = '#f59e0b';
            }
        } else {
            // Already running from network server
            const portSuffix = window.location.port ? `:${window.location.port}` : '';
            targetUrl = `${window.location.protocol}//${currentHostname}${portSuffix}/`;
        }

        // Pre-fill custom IP input
        const customIpInput = document.getElementById('qr-custom-ip');
        if (customIpInput && !customIpInput.value) {
            customIpInput.value = targetUrl.replace('http://', '').replace('https://', '').replace(':8080/', '').replace('/', '');
        }

        renderQRCode(targetUrl);
    }

    function updateShiftPillUI(shiftId) {
        document.querySelectorAll('.shift-pill-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.shift === shiftId);
        });
    }

    // --------------------------------------------------------------------------
    // Toast & Date Helpers
    // --------------------------------------------------------------------------
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '80px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = type === 'success' ? '#10b981' : (type === 'danger' ? '#f43f5e' : '#0284c7');
        toast.style.color = '#ffffff';
        toast.style.padding = '10px 18px';
        toast.style.borderRadius = '30px';
        toast.style.fontSize = '0.85rem';
        toast.style.fontWeight = '600';
        toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
        toast.style.zIndex = '9999';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '8px';
        toast.style.transition = 'all 0.3s ease';

        const iconClass = type === 'success' ? 'fa-check-circle' : (type === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-info');
        toast.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${message}</span>`;

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    function formatIndoDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length < 3) return dateStr;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
    }

    function getIndoMonthName(monthNumber) {
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return months[monthNumber - 1] || 'Bulan';
    }
});

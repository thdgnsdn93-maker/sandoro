let isAdminMode = false;
let isUserPreview = false;
let isDeckEditUnlocked = false;
let currentPage = 1;
const ADMIN_PASSWORD = "0731";
const CREATOR_UID = "20029059326";

let categoryNames = ["금의위", "낙원(동맹)", "낙화", "고구려", "재야"];
let currentFilter = '금의위';
let searchQuery = '';
let currentDictTargetTab = 'formation';
let currentActiveView = 'dashboard'; // 'dashboard' 또는 'stats'

let favorites = JSON.parse(localStorage.getItem('userFavorites') || '[]');
let accessLogs = JSON.parse(localStorage.getItem('accessLogs') || '[]');
const AVAILABLE_JOBS = ["진군", "신행", "기좌", "병참", "천공", "청낭", "금의위"];
let members = [];

// ✨ 맹원 주간 활동 데이터 스토리지 연동
let memberWeekData = JSON.parse(localStorage.getItem('memberWeekData') || '[]');

let DICT_CONTENTS = {
    formation: `# 1. 진형 및 병종상성 대도감\n## 진형\n### 기형진\n- **특성**: 기병 피해 증가 및 방어 상승`,
    synergy: `# 2. 각 장수 인연보너스 대도감`,
    generalTactic: `# 3. 장수 전법정리 대도감`,
    commonTactic: `# 4. 공용 전법정리 대도감`
};

// ✨ 페이지 뷰 전환 함수 (편성 뷰 vs 통계 룸 뷰)
function switchPageView(viewName) {
    currentActiveView = viewName;
    const dashView = document.getElementById('view-dashboard');
    const statsView = document.getElementById('view-stats');
    const headerTitle = document.getElementById('mainHeaderTitle');
    const searchInput = document.getElementById('searchInput');

    if (viewName === 'stats') {
        dashView.classList.add('hidden');
        statsView.classList.remove('hidden');
        headerTitle.innerText = "📊 금의위 맹원 주간활동 통계 룸";
        if(searchInput) searchInput.classList.add('hidden');
        renderStatsTable();
    } else {
        statsView.classList.add('hidden');
        dashView.classList.remove('hidden');
        headerTitle.innerText = "각 연맹 인원 & 편성 현황";
        if(searchInput) searchInput.classList.remove('hidden');
        renderTable();
    }
    
    // 모바일 드로어 열려있다면 닫기
    const drawer = document.getElementById('mobileDrawerMenu');
    const backdrop = document.getElementById('mobileDrawerBackdrop');
    if (drawer && !drawer.classList.contains('-translate-x-full')) {
        drawer.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
    }
}

// ✨ 엑셀 파일 업로드 처리 (금의위 맹원 주간 활동 리포트)
function handleMemberWeekExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonRows = XLSX.utils.sheet_to_json(worksheet, {defval: ""});
            
            if(jsonRows.length === 0) return alert("엑셀 파일에 데이터가 없습니다.");

            memberWeekData = jsonRows.map((row, idx) => ({
                id: row['캐릭터 ID'] || idx,
                name: row['멤버'] || '',
                job: row['직업'] || '',
                group: row['조별'] || '',
                position: row['직위'] || '',
                prosperity: Number(String(row['번영'] || 0).replace(/,/g, '')) || 0,
                mhoon: row['주간 무훈'] || 0,
                contribution: Number(String(row['주간 공헌'] || 0).replace(/,/g, '')) || 0,
                camp: row['주둔지'] || '',
                siegeCount: Number(String(row['주 공성 횟수'] || 0).replace(/,/g, '')) || 0
            }));

            localStorage.setItem('memberWeekData', JSON.stringify(memberWeekData));
            alert(`📊 주간활동 데이터 ${memberWeekData.length}건 업로드 완료!`);
            
            if (currentActiveView === 'stats') {
                renderStatsTable();
            }
            toggleModal('dataUploadModal');
        } catch (err) {
            alert("엑셀 파싱 오류: " + err.message);
        }
        event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}

// ✨ 통계 페이지 데이터 및 요약 카드 렌더링
function renderStatsTable() {
    const tbody = document.getElementById('stats-table-body');
    if (!tbody) return;

    const keyword = (document.getElementById('statsSearchInput')?.value || '').toLowerCase().trim();
    const filtered = memberWeekData.filter(m => m.name.toLowerCase().includes(keyword));

    // 요약 카드 계산
    const totalMembers = memberWeekData.length;
    const totalProsperity = memberWeekData.reduce((acc, cur) => acc + cur.prosperity, 0);
    const totalContribution = memberWeekData.reduce((acc, cur) => acc + cur.contribution, 0);
    const avgProsperity = totalMembers > 0 ? Math.round(totalProsperity / totalMembers) : 0;

    document.getElementById('statTotalMembers').innerText = `${totalMembers}명`;
    document.getElementById('statTotalProsperity').innerText = totalProsperity.toLocaleString();
    document.getElementById('statTotalContribution').innerText = totalContribution.toLocaleString();
    document.getElementById('statAvgProsperity').innerText = avgProsperity.toLocaleString();

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-muted">등록된 주간활동 데이터가 없습니다. 관리자 제어판에서 엑셀 파일을 업로드해주세요.</td></tr>`;
        return;
    }

    let html = '';
    filtered.forEach((m, idx) => {
        html += `
        <tr class="border-b border-theme transition bg-hover">
            <td class="p-3 sm:p-4 border-r border-theme text-center font-bold text-muted">${idx + 1}</td>
            <td class="p-3 sm:p-4 border-r border-theme font-bold text-main">${m.name}</td>
            <td class="p-3 sm:p-4 border-r border-theme text-muted">${m.job}</td>
            <td class="p-3 sm:p-4 border-r border-theme text-muted">${m.group}</td>
            <td class="p-3 sm:p-4 border-r border-theme"><span class="px-2 py-0.5 rounded text-xs bg-panel border border-theme gold-text font-bold">${m.position}</span></td>
            <td class="p-3 sm:p-4 border-r border-theme text-right font-mono">${m.prosperity.toLocaleString()}</td>
            <td class="p-3 sm:p-4 border-r border-theme text-right font-mono text-yellow-500">${m.mhoon}</td>
            <td class="p-3 sm:p-4 border-r border-theme text-right font-mono text-emerald-400">${m.contribution.toLocaleString()}</td>
            <td class="p-3 sm:p-4 border-r border-theme text-muted text-xs">${m.camp}</td>
            <td class="p-3 sm:p-4 text-center font-bold">${m.siegeCount}회</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// 기존 함수들 유지 (toggleSubMenu, toggleMobileDrawer, loadDataFromFirebase, saveDataToStorage, handleUidAuth 등 기존 로직 포함)
function toggleSubMenu(menuId) {
    const menu = document.getElementById(menuId);
    const arrow = document.getElementById(menuId + '-arrow');
    if (menu.style.display === 'none') {
        menu.style.display = 'block';
        if (arrow) arrow.innerText = '▲';
    } else {
        menu.style.display = 'none';
        if (arrow) arrow.innerText = '▼';
    }
}

function toggleMobileDrawer() {
    const drawer = document.getElementById('mobileDrawerMenu');
    const backdrop = document.getElementById('mobileDrawerBackdrop');
    if (drawer.classList.contains('-translate-x-full')) {
        drawer.classList.remove('-translate-x-full');
        backdrop.classList.remove('hidden');
    } else {
        drawer.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
    }
}

async function loadDataFromFirebase() {
    if (window.firebaseDB) {
        const { db, doc, getDoc } = window.firebaseDB;
        try {
            const docSnap = await getDoc(doc(db, "alliance_data", "main"));
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.members && data.members.length > 0) members = data.members;
                if (data.categoryNames) categoryNames = data.categoryNames;
                if (data.DICT_CONTENTS) DICT_CONTENTS = data.DICT_CONTENTS;
                
                if (currentFilter !== '즐겨찾기' && !categoryNames.includes(currentFilter)) {
                    currentFilter = categoryNames[0] || '금의위';
                }

                saveDataToStorage();
                renderFilterButtons();
                if (currentActiveView === 'dashboard') renderTable();
                return;
            }
        } catch (err) {
            console.error("파이어베이스 연동 실패:", err);
        }
    }

    const localMembers = localStorage.getItem('gameMembers');
    const localCategories = localStorage.getItem('categoryNames');
    const localDict = localStorage.getItem('dictContents');

    if (localMembers) members = JSON.parse(localMembers);
    if (localCategories) categoryNames = JSON.parse(localCategories);
    if (localDict) DICT_CONTENTS = JSON.parse(localDict);

    if (currentFilter !== '즐겨찾기' && !categoryNames.includes(currentFilter)) {
        currentFilter = categoryNames[0] || '금의위';
    }

    renderFilterButtons();
    if (currentActiveView === 'dashboard') renderTable();
}

async function saveDataToStorage() {
    localStorage.setItem('gameMembers', JSON.stringify(members));
    localStorage.setItem('categoryNames', JSON.stringify(categoryNames));
    localStorage.setItem('dictContents', JSON.stringify(DICT_CONTENTS));
    localStorage.setItem('userFavorites', JSON.stringify(favorites));

    if (window.firebaseDB) {
        const { db, doc, setDoc } = window.firebaseDB;
        try {
            await setDoc(doc(db, "alliance_data", "main"), {
                members: members, categoryNames: categoryNames, DICT_CONTENTS: DICT_CONTENTS
            }, { merge: true });
        } catch (err) {
            console.error("클라우드 저장 실패:", err);
        }
    }
}

function handleUidAuth() {
    const inputUid = document.getElementById('authUid').value.trim();
    if (!inputUid) return alert("게임 UID를 입력해주세요.");

    const isRememberChecked = document.getElementById('saveUidCheckbox').checked;
    if (isRememberChecked) localStorage.setItem('savedAuthUid', inputUid);
    else localStorage.removeItem('savedAuthUid');

    let matchedMember = members.find(m => String(m.uid) === inputUid);
    let isCreator = (inputUid === CREATOR_UID);

    if (!matchedMember) {
        if (isCreator) {
            matchedMember = { uid: CREATOR_UID, name: "관리자(산도로)", alliance: categoryNames[0], job: "금의위", isAdminRole: true, decks: [] };
            members.push(matchedMember);
        } else {
            matchedMember = { id: Date.now() + Math.random(), uid: inputUid, name: `대원_${inputUid.slice(-4)}`, alliance: categoryNames[0], job: "", isAdminRole: false, decks: [] };
            members.push(matchedMember);
        }
        saveDataToStorage();
    }

    const userInfo = { uid: matchedMember.uid, name: matchedMember.name, time: new Date().toLocaleString() };
    localStorage.setItem('loggedUser', JSON.stringify(userInfo));
    accessLogs.unshift({ uid: matchedMember.uid, name: matchedMember.name, time: new Date().toLocaleString() });
    localStorage.setItem('accessLogs', JSON.stringify(accessLogs));

    alert(`환영합니다 ${matchedMember.name}님!`);
    document.getElementById('authOverlay').classList.add('hidden');
    loadDataFromFirebase();
}

function handleLogout() {
    if (confirm("대시보드에서 나가시겠습니까?")) {
        localStorage.removeItem('loggedUser');
        location.reload();
    }
}

function toggleAdminMode() {
    if (!isAdminMode) {
        if (isCurrentLoggedUserAdmin()) {
            isAdminMode = true;
            applyAdminUIState();
            toggleModal('adminControlModal');
            return;
        }
        const pw = prompt("관리자 비밀번호를 입력하세요:");
        if (pw !== ADMIN_PASSWORD) return alert("비밀번호가 틀렸습니다.");
        isAdminMode = true;
        applyAdminUIState();
        toggleModal('adminControlModal');
    } else {
        toggleModal('adminControlModal');
    }
}

function turnOffAdminMode() {
    isAdminMode = false;
    isUserPreview = false;
    applyAdminUIState();
    toggleModal('adminControlModal');
    alert("🛡 관리자 모드가 해제되었습니다.");
}

function toggleUserPreview() {
    isUserPreview = !isUserPreview;
    toggleModal('adminControlModal');
    if (currentActiveView === 'dashboard') renderTable();
    alert(isUserPreview ? "👀 일반 유저 시점 미리보기로 전환되었습니다." : "🛡️ 관리자 시점으로 복귀했습니다.");
}

function openAdminControlFromSub(currentModalId) {
    toggleModal(currentModalId);
    toggleModal('adminControlModal');
}

function openDictTabWithScroll(tabKey) {
    switchDictTab(tabKey);
    toggleModal('dictModal');
}

function isCurrentLoggedUserAdmin() {
    const loggedUserStr = localStorage.getItem('loggedUser');
    if (!loggedUserStr) return false;
    try {
        const loggedUser = JSON.parse(loggedUserStr);
        if (String(loggedUser.uid) === CREATOR_UID) return true;
        const member = members.find(m => String(m.uid) === String(loggedUser.uid));
        return member && member.alliance === '금의위' && member.isAdminRole === true;
    } catch (e) {
        return false;
    }
}

function applyAdminUIState() {
    const btn = document.getElementById('editModeBtn');
    const addBtn = document.getElementById('addMemberBtn');
    const delSelectedBtn = document.getElementById('delSelectedBtn');
    
    if (isAdminMode) {
        if(btn) { btn.innerHTML = "<span>🛡️</span> 제어판"; btn.className = "bg-red-800 hover:bg-red-700 px-3 py-2 rounded-lg font-bold text-white text-xs shadow transition flex items-center gap-1.5"; }
        if(addBtn) addBtn.classList.remove('hidden');
        if(delSelectedBtn) delSelectedBtn.classList.remove('hidden');
    } else {
        if(btn) { btn.innerHTML = "<span>🛡️</span> 관리자 모드"; btn.className = "bg-amber-600 hover:bg-amber-500 px-3 py-2 rounded-lg font-bold text-white text-xs shadow transition flex items-center gap-1.5"; }
        if(addBtn) addBtn.classList.add('hidden');
        if(delSelectedBtn) delSelectedBtn.classList.add('hidden');
    }
    renderFilterButtons();
    if (currentActiveView === 'dashboard') renderTable();
}

function openCategoryModal() {
    toggleModal('adminControlModal');
    renderCategoryModalInputs();
    toggleModal('categoryModal');
}

function renderCategoryModalInputs() {
    const container = document.getElementById('categoryInputsContainer');
    container.innerHTML = '';
    categoryNames.forEach((cat, index) => {
        container.innerHTML += `
        <div class="category-draggable-item flex gap-2 items-center bg-main p-2 rounded-lg border border-theme" draggable="true" data-index="${index}">
            <span class="text-muted font-bold text-xs select-none">☰</span>
            <input type="text" value="${cat}" class="cat-input flex-1 bg-panel border border-theme px-3 py-1.5 rounded-lg text-sm text-main">
            <button type="button" onclick="this.parentElement.remove()" class="bg-red-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold">삭제</button>
        </div>`;
    });
}

function addCategoryInput() {
    const container = document.getElementById('categoryInputsContainer');
    const tempDiv = document.createElement('div');
    tempDiv.className = "category-draggable-item flex gap-2 items-center bg-main p-2 rounded-lg border border-theme";
    tempDiv.innerHTML = `
        <span class="text-muted font-bold text-xs select-none">☰</span>
        <input type="text" value="새 동맹" class="cat-input flex-1 bg-panel border border-theme px-3 py-1.5 rounded-lg text-sm text-main">
        <button type="button" onclick="this.parentElement.remove()" class="bg-red-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold">삭제</button>
    `;
    container.appendChild(tempDiv);
}

function saveCategorySettings() {
    const inputs = document.querySelectorAll('.cat-input');
    categoryNames = Array.from(inputs).map(input => input.value.trim()).filter(val => val !== '');
    if (currentFilter !== '즐겨찾기' && !categoryNames.includes(currentFilter)) currentFilter = categoryNames[0] || '금의위';
    saveDataToStorage();
    renderFilterButtons();
    if (currentActiveView === 'dashboard') renderTable();
    toggleModal('categoryModal');
    toggleModal('adminControlModal');
    alert("카테고리 설정이 저장되었습니다!");
}

let activeUploadAlliance = '금의위';
function openDataUploadModal() {
    toggleModal('adminControlModal');
    let box = document.getElementById('allianceUploadButtonsBox');
    if (box) {
        let html = '';
        categoryNames.forEach(cat => {
            html += `<div class="flex items-center justify-between bg-panel p-2.5 rounded-lg border border-theme"><span class="text-xs font-bold gold-text">⚔️ ${cat} 업로드</span><button onclick="activeUploadAlliance='${cat}'; document.getElementById('allianceExcelInput').click();" class="bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">파일 선택</button></div>`;
        });
        box.innerHTML = html;
    }
    toggleModal('dataUploadModal');
}

function openAdminLogModal() {
    toggleModal('adminControlModal');
    const container = document.getElementById('adminLogContainer');
    const logs = JSON.parse(localStorage.getItem('accessLogs') || '[]');
    let html = logs.length === 0 ? `<p class="text-center text-muted py-4">기록된 접속 로그가 없습니다.</p>` : '';
    logs.forEach(log => {
        html += `<div class="bg-main p-2.5 rounded-lg border border-theme flex justify-between items-center text-xs"><div><strong class="text-main">${log.name}</strong> <span class="text-muted">(${log.uid})</span></div><div class="text-muted">${log.time}</div></div>`;
    });
    container.innerHTML = html;
    toggleModal('adminLogModal');
}

function applyTheme() {
    const theme = document.getElementById('themeSelector').value;
    document.getElementById('app-body').className = `${theme} min-h-screen flex flex-col md:flex-row relative transition-colors duration-300`;
}

function renderFilterButtons() {
    const container = document.getElementById('filter-buttons');
    const sidebarContainer = document.getElementById('sidebar-filter-buttons');
    let html = '', sidebarHtml = '';
    
    categoryNames.forEach((cat, index) => {
        const isSelected = currentFilter === cat && currentActiveView === 'dashboard';
        const btnClass = isSelected ? 'bg-yellow-600 text-white shadow' : 'bg-panel hover:bg-hover border border-theme text-muted';
        html += `<button onclick="switchPageView('dashboard'); filterTable('${cat}');" class="px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${btnClass}">${cat}</button>`;
        sidebarHtml += `<a href="#" onclick="switchPageView('dashboard'); filterTable('${cat}'); toggleMobileDrawer(); return false;" class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-muted hover:bg-hover transition"><span>${index + 1}.</span> ${cat}</a>`;
    });
    
    if(container) container.innerHTML = html;
    if(sidebarContainer) sidebarContainer.innerHTML = sidebarHtml;
}

function handleSearch() {
    if (currentActiveView === 'dashboard') {
        searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
        currentPage = 1;
        renderTable();
    }
}

function filterTable(filter) {
    currentFilter = filter;
    currentPage = 1;
    renderFilterButtons();
    if (currentActiveView === 'dashboard') renderTable();
}

function changePageSize() { currentPage = 1; renderTable(); }
function changePage(p) { currentPage = p; renderTable(); }

function toggleSelectAll(cb) {
    document.querySelectorAll('.row-checkbox').forEach(box => box.checked = cb.checked);
}

function deleteSelectedMembers() {
    const sel = document.querySelectorAll('.row-checkbox:checked');
    if (sel.length === 0) return alert("삭제할 대원을 선택해주세요.");
    if (confirm(`선택한 ${sel.length명의 대원을 정말 삭제하시겠습니까?`)) {
        const ids = Array.from(sel).map(b => Number(b.getAttribute('data-id')));
        members = members.filter(m => !ids.includes(m.id));
        saveDataToStorage();
        renderTable();
        alert("삭제되었습니다.");
    }
}

function renderTable() {
    if (currentActiveView !== 'dashboard') return;
    const tbody = document.getElementById('member-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const effectiveIsAdmin = isAdminMode && !isUserPreview;
    const hasAdminRole = isCurrentLoggedUserAdmin();
    const showUidCol = effectiveIsAdmin || hasAdminRole;

    const theadTr = document.querySelector('table thead tr');
    if (theadTr) {
        let headHtml = '';
        if (effectiveIsAdmin) headHtml += `<th class="p-3 sm:p-4 border-r border-theme text-center w-10"><input type="checkbox" id="selectAllCheckbox" onclick="toggleSelectAll(this)" class="cursor-pointer"></th>`;
        headHtml += `<th class="p-3 sm:p-4 border-r border-theme text-center w-12">⭐</th>`;
        headHtml += `<th class="p-3 sm:p-4 border-r border-theme text-center w-16">No.</th>`;
        if (showUidCol) headHtml += `<th class="p-3 sm:p-4 border-r border-theme">UID</th>`;
        headHtml += `<th class="p-3 sm:p-4 border-r border-theme">닉네임</th><th class="p-3 sm:p-4 border-r border-theme">직업</th><th class="p-3 sm:p-4 border-r border-theme">소속</th>`;
        for(let i=1; i<=5; i++) headHtml += `<th class="p-3 sm:p-4 text-center border-r border-theme min-w-[140px]">보유덱 ${i}</th>`;
        if (effectiveIsAdmin) headHtml += `<th class="p-3 sm:p-4 text-center">관리</th>`;
        theadTr.innerHTML = headHtml;
    }

    let filtered = members.filter(m => {
        let match = currentFilter === '즐겨찾기' ? favorites.includes(m.id) : (m.alliance === currentFilter);
        return match && m.name.toLowerCase().includes(searchQuery);
    });

    document.getElementById('total-member-count').innerText = members.length;
    const pageSizeVal = document.getElementById('pageSizeSelect').value;
    let displayedList = filtered;

    if (pageSizeVal !== 'all') {
        const limit = parseInt(pageSizeVal, 10);
        let totalPages = Math.ceil(filtered.length / limit) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        displayedList = filtered.slice((currentPage - 1) * limit, (currentPage - 1) * limit + limit);
    }

    if(displayedList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="p-6 text-center text-muted">등록된 인원이 없습니다.</td></tr>`;
        return;
    }

    displayedList.forEach((member, index) => {
        const tr = document.createElement('tr');
        tr.className = `border-b border-theme transition bg-hover`;
        let html = '';
        if(effectiveIsAdmin) html += `<td class="p-3 sm:p-4 border-r border-theme text-center"><input type="checkbox" class="row-checkbox cursor-pointer" data-id="${member.id}"></td>`;

        const isFav = favorites.includes(member.id);
        html += `<td class="p-3 sm:p-4 border-r border-theme text-center"><button type="button" onclick="toggleFavorite(${member.id})" class="text-sm">${isFav ? '⭐' : '☆'}</button></td>`;
        
        const absoluteIndex = (pageSizeVal !== 'all') ? ((currentPage - 1) * parseInt(pageSizeVal, 10)) + index + 1 : index + 1;
        html += `<td class="p-3 sm:p-4 border-r border-theme text-center font-bold text-muted">${absoluteIndex}</td>`;
        
        if (showUidCol) html += `<td class="p-3 sm:p-4 border-r border-theme font-mono">${member.uid}</td>`;
        html += `<td class="p-3 sm:p-4 border-r border-theme font-bold">${member.name}</td>`;
        html += `<td class="p-3 sm:p-4 border-r border-theme text-muted">${member.job || '-'}</td>`;
        html += `<td class="p-3 sm:p-4 border-r border-theme">${member.alliance}</td>`;

        for(let i=0; i<5; i++) {
            const deck = member.decks && member.decks[i];
            if (deck && (deck.g1 || deck.g2 || deck.g3)) {
                html += `<td class="p-2 sm:p-3 border-r border-theme"><div class="deck-cell rounded-lg p-1.5 text-center bg-panel"><div class="text-[11px] font-bold gold-text">${deck.g1 || '-'} / ${deck.g2 || '-'} / ${deck.g3 || '-'}</div></div></td>`;
            } else {
                html += `<td class="p-2 sm:p-3 border-r border-theme"><div class="deck-cell rounded-lg p-1.5 text-center text-muted border border-dashed border-theme">+ 설정</div></td>`;
            }
        }
        if(effectiveIsAdmin) html += `<td class="p-2 text-center"><button onclick="deleteMember(${member.id})" class="bg-red-800 text-white px-2 py-1 rounded text-xs">삭제</button></td>`;
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

function toggleFavorite(id) {
    const idx = favorites.indexOf(id);
    if (idx > -1) favorites.splice(idx, 1);
    else favorites.push(id);
    saveDataToStorage();
    renderTable();
}

function downloadShareExcel() {
    let exportData = members.map((m, idx) => ({
        "No": idx + 1, "UID": m.uid, "닉네임": m.name, "직업": m.job || "", "소속": m.alliance || ""
    }));
    let ws = XLSX.utils.json_to_sheet(exportData);
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "연맹원현황");
    XLSX.writeFile(wb, "금의위_연맹원_현황.xlsx");
}

function openSettingsModal() { toggleModal('settingsModal'); }
function toggleModal(id) { document.getElementById(id).classList.toggle('hidden'); }
function addNewMember() { members.push({ id: Date.now(), uid: "0000", name: "신규장수", alliance: currentFilter, decks: [] }); saveDataToStorage(); renderTable(); }
function deleteMember(id) { if(confirm("정말 삭제하시겠습니까?")) { members = members.filter(m => m.id !== id); saveDataToStorage(); renderTable(); } }

loadDataFromFirebase();
if (memberWeekData.length > 0) {
    // 자동 초기 로드 시 엑셀 데이터가 있으면 반영
}
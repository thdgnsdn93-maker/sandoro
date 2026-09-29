let isAdminMode = false;
let isUserPreview = false;
let isDeckEditUnlocked = false;
let currentPage = 1;
const ADMIN_PASSWORD = "0731";
const CREATOR_UID = "20029059326";

// 순수 동맹 카테고리 목록 유지
let categoryNames = ["금의위", "낙원(동맹)", "낙화", "고구려", "재야"];
let currentFilter = '금의위';
let searchQuery = '';
let currentDictTargetTab = 'formation';
let currentActiveView = 'dashboard';

let favorites = JSON.parse(localStorage.getItem('userFavorites') || '[]');
let accessLogs = JSON.parse(localStorage.getItem('accessLogs') || '[]');
const AVAILABLE_JOBS = ["진군", "신행", "기좌", "병참", "천공", "청낭", "금의위"];
let members = [];
let memberWeekData = JSON.parse(localStorage.getItem('memberWeekData') || '[]');

let DICT_CONTENTS = {
    formation: `# 1. 진형 및 병종상성 대도감`,
    synergy: `# 2. 각 장수 인연보너스 대도감`,
    generalTactic: `# 3. 장수 전법정리 대도감`,
    commonTactic: `# 4. 공용 전법정리 대도감`
};

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
    
    const drawer = document.getElementById('mobileDrawerMenu');
    const backdrop = document.getElementById('mobileDrawerBackdrop');
    if (drawer && !drawer.classList.contains('-translate-x-full')) {
        drawer.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
    }
}

// 엑셀 명단 업로드 파싱 로직 (UID, 닉네임, 직업만 갱신 및 덱 유지)
function handleAllianceExcelUpload(event) {
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

            const allianceToAssign = activeUploadAlliance || categoryNames[0];

            jsonRows.forEach((row, idx) => {
                let rawRow = {};
                Object.keys(row).forEach(k => {
                    rawRow[k.trim().toLowerCase().replace(/\s+/g, '')] = String(row[k]).trim();
                });

                const uidVal = rawRow['캐릭터id'] || rawRow['uid'] || rawRow['id'] || rawRow['캐릭터아이디'] || '';
                const nameVal = rawRow['멤버'] || rawRow['닉네임'] || rawRow['이름'] || rawRow['캐릭터이름'] || `대원_${idx+1}`;
                const jobVal = rawRow['직업'] || '';

                if (!uidVal) return;

                let existing = members.find(m => String(m.uid) === uidVal);
                if (existing) {
                    existing.name = nameVal;
                    if (jobVal) existing.job = jobVal;
                    existing.alliance = allianceToAssign;
                } else {
                    members.push({
                        id: Date.now() + Math.random() + idx,
                        uid: uidVal,
                        name: nameVal,
                        job: jobVal,
                        alliance: allianceToAssign,
                        isAdminRole: false,
                        decks: []
                    });
                }
            });

            saveDataToStorage();
            alert(`👥 ${allianceToAssign} 인원 엑셀 데이터 반영 완료! (${members.length}명 보유)`);
            renderTable();
            toggleModal('dataUploadModal');
        } catch (err) {
            alert("엑셀 파싱 오류: " + err.message);
        }
        event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}

// 주간활동 리포트 연동 시 통계룸 인원은 '금의위'로 포함시키고 UID/닉네임/직업만 동기화, 누락 인원은 '재야'로 변경
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

            let uploadedUids = new Set();

            memberWeekData = jsonRows.map((row, idx) => {
                let rawRow = {};
                Object.keys(row).forEach(k => {
                    rawRow[k.trim().toLowerCase().replace(/\s+/g, '')] = String(row[k]).trim();
                });

                const uidVal = rawRow['캐릭터id'] || rawRow['uid'] || rawRow['id'] || '';
                const nameVal = rawRow['멤버'] || rawRow['닉네임'] || rawRow['이름'] || '';
                const jobVal = rawRow['직업'] || '';

                if (uidVal) uploadedUids.add(uidVal);

                let existingMember = members.find(m => String(m.uid) === uidVal);
                if (existingMember) {
                    // 기존 덱은 그대로 유지하고 UID, 닉네임, 직업 데이터 및 소속을 금의위로 조정
                    existingMember.name = nameVal;
                    if (jobVal) existingMember.job = jobVal;
                    existingMember.alliance = '금의위';
                } else if (uidVal) {
                    // 편성에 없던 신규 인원인 경우 금의위 소속으로 새로 추가
                    members.push({
                        id: Date.now() + Math.random() + idx,
                        uid: uidVal,
                        name: nameVal,
                        job: jobVal,
                        alliance: '금의위',
                        isAdminRole: false,
                        decks: []
                    });
                }

                return {
                    id: uidVal || idx,
                    uid: uidVal,
                    name: nameVal,
                    job: jobVal,
                    alliance: '금의위',
                    group: rawRow['조별'] || '',
                    position: rawRow['직위'] || '일반 멤버',
                    prosperity: Number(String(rawRow['번영'] || 0).replace(/,/g, '')) || 0,
                    mhoon: rawRow['주간무훈'] || 0,
                    contribution: Number(String(rawRow['주간공헌'] || 0).replace(/,/g, '')) || 0,
                    camp: rawRow['주둔지'] || '',
                    siegeCount: Number(String(rawRow['주공성횟수'] || 0).replace(/,/g, '')) || 0
                };
            });

            // 주간활동 통계 룸 데이터에 누락된 인원은 '재야' 소속으로 변경
            members.forEach(m => {
                if (m.uid && !uploadedUids.has(String(m.uid))) {
                    m.alliance = '재야';
                }
            });

            saveDataToStorage();
            localStorage.setItem('memberWeekData', JSON.stringify(memberWeekData));
            alert(`📊 주간활동 데이터 ${memberWeekData.length}건 반영 완료! (통계룸 인원 전원 금의위 포함, 누락 인원은 '재야'로 변경됨)`);
            
            if (currentActiveView === 'stats') {
                renderStatsTable();
            } else {
                renderTable();
            }
            toggleModal('dataUploadModal');
        } catch (err) {
            alert("엑셀 파싱 오류: " + err.message);
        }
        event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}

function renderStatsTable() {
    const tbody = document.getElementById('stats-table-body');
    if (!tbody) return;

    const keyword = (document.getElementById('statsSearchInput')?.value || '').toLowerCase().trim();
    const sortType = document.getElementById('statsSortSelect')?.value || 'contributionDesc';

    let filtered = memberWeekData.filter(m => m.name.toLowerCase().includes(keyword));

    filtered.sort((a, b) => {
        if (sortType === 'contributionDesc') return b.contribution - a.contribution;
        if (sortType === 'contributionAsc') return a.contribution - b.contribution;
        if (sortType === 'prosperityDesc') return b.prosperity - a.prosperity;
        if (sortType === 'siegeDesc') return b.siegeCount - a.siegeCount;
        return 0;
    });

    const totalMembers = memberWeekData.length;
    const totalProsperity = memberWeekData.reduce((acc, cur) => acc + cur.prosperity, 0);
    const totalContribution = memberWeekData.reduce((acc, cur) => acc + cur.contribution, 0);
    const avgProsperity = totalMembers > 0 ? Math.round(totalProsperity / totalMembers) : 0;

    document.getElementById('statTotalMembers').innerText = `${totalMembers}명`;
    document.getElementById('statTotalProsperity').innerText = totalProsperity.toLocaleString();
    document.getElementById('statTotalContribution').innerText = totalContribution.toLocaleString();
    document.getElementById('statAvgProsperity').innerText = avgProsperity.toLocaleString();

    const evaluatedMembers = [...memberWeekData].map(m => {
        const mhoonNum = Number(String(m.mhoon).replace(/,/g, '')) || 0;
        return {
            ...m,
            totalScore: m.contribution + (mhoonNum * 10) + (m.siegeCount * 1000)
        };
    });
    evaluatedMembers.sort((a, b) => b.totalScore - a.totalScore);

    const topExecBox = document.getElementById('topExecutivesList');
    if (evaluatedMembers.length > 0) {
        let topHtml = '';
        evaluatedMembers.slice(0, 10).forEach((ex, i) => {
            const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : `${i+1}.`));
            topHtml += `<div class="flex justify-between items-center bg-main p-2 rounded border border-theme"><span>${medal} <strong>${ex.name}</strong> <span class="text-[10px] text-muted">(${ex.position})</span></span><span class="gold-text font-bold">공헌: ${ex.contribution.toLocaleString()}</span></div>`;
        });
        topExecBox.innerHTML = topHtml;
    }

    const adminLowBoxWrapper = document.getElementById('adminLowBoxWrapper');
    const lowExecBox = document.getElementById('lowExecutivesList');
    const hasAdminRole = isCurrentLoggedUserAdmin();

    if (hasAdminRole) {
        adminLowBoxWrapper.classList.remove('hidden');
        let lowHtml = '';
        const bottomCount = Math.max(1, Math.ceil(evaluatedMembers.length * 0.05));
        const bottomMembers = [...evaluatedMembers].reverse().slice(0, bottomCount);
        bottomMembers.forEach((ex) => {
            lowHtml += `<div class="flex justify-between items-center bg-main p-2 rounded border border-theme"><span>⚠ <strong>${ex.name}</strong> <span class="text-[10px] text-muted">(${ex.position})</span></span><span class="text-red-400 font-bold">공헌: ${ex.contribution.toLocaleString()}</span></div>`;
        });
        lowExecBox.innerHTML = lowHtml;
    } else {
        adminLowBoxWrapper.classList.add('hidden');
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-muted">등록된 주간활동 데이터가 없습니다. 관리자 제어판에서 엑셀 파일을 업로드해주세요.</td></tr>`;
        return;
    }

    let html = '';
    filtered.forEach((m, idx) => {
        const isExec = m.position && m.position !== '일반 멤버';
        const badgeClass = isExec ? 'bg-amber-500/20 text-yellow-500 font-bold border border-amber-500/40' : 'bg-panel border border-theme text-muted';
        html += `
        <tr class="border-b border-theme transition bg-hover">
            <td class="p-3 sm:p-4 border-r border-theme text-center font-bold text-muted">${idx + 1}</td>
            <td class="p-3 sm:p-4 border-r border-theme font-bold text-main">${m.name}</td>
            <td class="p-3 sm:p-4 border-r border-theme text-muted">${m.job || '-'}</td>
            <td class="p-3 sm:p-4 border-r border-theme text-muted">${m.group || '-'}</td>
            <td class="p-3 sm:p-4 border-r border-theme"><span class="px-2 py-0.5 rounded text-xs ${badgeClass}">${m.position}</span></td>
            <td class="p-3 sm:p-4 border-r border-theme text-right font-mono">${m.prosperity.toLocaleString()}</td>
            <td class="p-3 sm:p-4 border-r border-theme text-right font-mono text-yellow-500">${m.mhoon}</td>
            <td class="p-3 sm:p-4 border-r border-theme text-right font-mono text-emerald-400">${m.contribution.toLocaleString()}</td>
            <td class="p-3 sm:p-4 border-r border-theme text-muted text-xs">${m.camp}</td>
            <td class="p-3 sm:p-4 text-center font-bold">${m.siegeCount}회</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// 🕵️ 스파이 및 중복 계정 검사 로직
function runSpyCheck() {
    const duplicateBox = document.getElementById('duplicateUidList');
    const suspiciousBox = document.getElementById('suspiciousUidList');
    
    let uidMap = {};
    let duplicates = [];
    let suspicious = [];

    members.forEach(m => {
        const uidStr = String(m.uid).trim();
        if (!uidStr || uidStr === '0000' || uidStr.length < 5) {
            suspicious.push(m);
            return;
        }

        if (uidMap[uidStr]) {
            if (!duplicates.some(d => d.uid === uidStr)) {
                duplicates.push({ uid: uidStr, members: [uidMap[uidStr], m] });
            } else {
                duplicates.find(d => d.uid === uidStr).members.push(m);
            }
        } else {
            uidMap[uidStr] = m;
        }
    });

    if (duplicates.length === 0) {
        duplicateBox.innerHTML = `<p class="py-2 text-emerald-400 font-bold">✅ 중복된 UID가 없습니다. (클린함)</p>`;
    } else {
        let html = '';
        duplicates.forEach(dup => {
            const names = dup.members.map(m => `${m.name}(${m.alliance})`).join(', ');
            html += `<div class="bg-panel p-2 rounded border border-red-500/30 flex justify-between"><span class="text-main font-bold">UID: ${dup.uid}</span><span class="text-red-400 text-right">${names}</span></div>`;
        });
        duplicateBox.innerHTML = html;
    }

    if (suspicious.length === 0) {
        suspiciousBox.innerHTML = `<p class="py-2 text-emerald-400 font-bold">✅ 식별 불가/이상 UID가 없습니다.</p>`;
    } else {
        let html = '';
        suspicious.forEach(m => {
            html += `<div class="bg-panel p-2 rounded border border-orange-500/30 flex justify-between"><span class="text-main font-bold">${m.name}</span><span class="text-orange-400">사유: UID 미확인 (${m.uid || '없음'})</span></div>`;
        });
        suspiciousBox.innerHTML = html;
    }

    toggleModal('spyCheckModal');
}

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
                
                if (currentFilter !== '⭐ 즐겨찾기' && !categoryNames.includes(currentFilter)) {
                    currentFilter = categoryNames[0];
                }

                saveDataToStorage();
                renderFilterButtons();
                applyAdminUIState();
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

    if (currentFilter !== '⭐ 즐겨찾기' && !categoryNames.includes(currentFilter)) {
        currentFilter = categoryNames[0];
    }

    renderFilterButtons();
    applyAdminUIState();
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
    } else {
        if (isCreator) {
            matchedMember.isAdminRole = true;
        }
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

function isCurrentLoggedUserCreator() {
    const loggedUserStr = localStorage.getItem('loggedUser');
    if (!loggedUserStr) return false;
    try {
        const loggedUser = JSON.parse(loggedUserStr);
        return String(loggedUser.uid) === CREATOR_UID;
    } catch (e) {
        return false;
    }
}

function isCurrentLoggedUserAdmin() {
    const loggedUserStr = localStorage.getItem('loggedUser');
    if (!loggedUserStr) return false;
    try {
        const loggedUser = JSON.parse(loggedUserStr);
        if (String(loggedUser.uid) === CREATOR_UID) return true;
        const member = members.find(m => String(m.uid) === String(loggedUser.uid));
        return member && (member.isAdminRole === true || String(member.uid) === CREATOR_UID);
    } catch (e) {
        return false;
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

function applyAdminUIState() {
    if (isCurrentLoggedUserAdmin() && !isAdminMode) {
        isAdminMode = true;
    }

    const btn = document.getElementById('editModeBtn');
    const addBtn = document.getElementById('addMemberBtn');
    const delSelectedBtn = document.getElementById('delSelectedBtn');
    const spyBtn = document.getElementById('spyCheckBtn');
    
    const uidColHeader = document.getElementById('uidColHeader');
    const delColHeader = document.getElementById('delColHeader');
    
    const effectiveIsAdmin = isAdminMode && !isUserPreview;
    const hasAdminRole = isCurrentLoggedUserAdmin();
    const showUidCol = effectiveIsAdmin || hasAdminRole;

    if (effectiveIsAdmin) {
        if(delColHeader) delColHeader.classList.remove('hidden');
    } else {
        if(delColHeader) delColHeader.classList.add('hidden');
    }

    if (showUidCol) {
        if(uidColHeader) uidColHeader.classList.remove('hidden');
    } else {
        if(uidColHeader) uidColHeader.classList.add('hidden');
    }

    if (effectiveIsAdmin) {
        if(btn) { btn.innerHTML = "<span>🛡️</span> 제어판"; btn.className = "bg-red-800 hover:bg-red-700 px-3 py-2 rounded-lg font-bold text-white text-xs shadow transition flex items-center gap-1.5"; }
        if(addBtn) addBtn.classList.remove('hidden');
        if(delSelectedBtn) addBtn.classList.remove('hidden');
        if(spyBtn) spyBtn.classList.remove('hidden');
    } else {
        if(btn) { btn.innerHTML = "<span>🛡️</span> 관리자 모드"; btn.className = "bg-amber-600 hover:bg-amber-500 px-3 sm:px-4 py-2 rounded-lg font-bold text-white text-xs shadow transition flex items-center gap-1.5"; }
        if(addBtn) addBtn.classList.add('hidden');
        if(delSelectedBtn) addBtn.classList.add('hidden');
        if(spyBtn) addBtn.classList.add('hidden');
    }
    renderFilterButtons();
    if (currentActiveView === 'dashboard') renderTable();
    if (currentActiveView === 'stats') renderStatsTable();
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
    if (currentFilter !== '⭐ 즐겨찾기' && !categoryNames.includes(currentFilter)) currentFilter = categoryNames[0];
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
    
    // ⭐ 즐겨찾기 버튼을 맨 앞에 항상 고정 배치
    let html = `<button onclick="switchPageView('dashboard'); filterTable('⭐ 즐겨찾기');" class="px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${currentFilter === '⭐ 즐겨찾기' && currentActiveView === 'dashboard' ? 'bg-yellow-600 text-white shadow' : 'bg-panel hover:bg-hover border border-theme text-muted'}">⭐ 즐겨찾기</button>`;
    
    let sidebarHtml = '';
    
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

function deleteSelectedMembers() {
    const sel = document.querySelectorAll('.row-checkbox:checked');
    if (sel.length === 0) return alert("삭제할 대원을 선택해주세요.");
    if (confirm(`선택한 ${sel.length}명의 대원을 정말 삭제하시겠습니까?`)) {
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
    const isCreator = isCurrentLoggedUserCreator();
    const showUidCol = effectiveIsAdmin || hasAdminRole;

    let filtered = members.filter(m => {
        let match = currentFilter === '⭐ 즐겨찾기' ? favorites.includes(m.id) : (m.alliance === currentFilter);
        return match && m.name.toLowerCase().includes(searchQuery);
    });

    document.getElementById('total-member-count').innerText = members.length;
    const pageSizeVal = document.getElementById('pageSizeSelect').value;
    let displayedList = filtered;
    let totalPages = 1;

    if (pageSizeVal !== 'all') {
        const limit = parseInt(pageSizeVal, 10);
        totalPages = Math.ceil(filtered.length / limit) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        displayedList = filtered.slice((currentPage - 1) * limit, (currentPage - 1) * limit + limit);
    }

    renderPagination(totalPages);

    if(displayedList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="p-6 text-center text-muted">등록된 인원이 없습니다.</td></tr>`;
        return;
    }

    displayedList.forEach((member, index) => {
        const tr = document.createElement('tr');
        tr.className = `border-b border-theme transition bg-hover`;
        let html = '';
        
        // 1. 별표(즐겨찾기) 열
        const isFav = favorites.includes(member.id);
        html += `<td class="p-3 sm:p-4 border-r border-theme text-center"><button type="button" onclick="toggleFavorite(${member.id})" class="text-sm">${isFav ? '⭐' : '☆'}</button></td>`;
        
        // 2. No. 열 (숫자만 출력)
        const absoluteIndex = (pageSizeVal !== 'all') ? ((currentPage - 1) * parseInt(pageSizeVal, 10)) + index + 1 : index + 1;
        html += `<td class="p-3 sm:p-4 border-r border-theme text-center font-bold text-muted">${absoluteIndex}</td>`;
        
        // 3. UID 열 (절대 수정 불가, 읽기 전용 잠금)
        if (showUidCol) {
            html += `<td class="p-3 sm:p-4 border-r border-theme font-mono text-muted select-all">${member.uid || '-'}</td>`;
        }
        
        // 4. 닉네임 열 (제작자 로그인 시 닉네임 옆에 관리자 권한 부여 체크박스 표시)
        if (effectiveIsAdmin) {
            let adminCheckboxHtml = '';
            if (isCreator && String(member.uid) !== CREATOR_UID) {
                const isChecked = member.isAdminRole ? 'checked' : '';
                adminCheckboxHtml = `
                    <label class="inline-flex items-center gap-1 ml-2 text-[11px] text-yellow-500 cursor-pointer select-none bg-main px-1.5 py-0.5 rounded border border-theme">
                        <input type="checkbox" ${isChecked} onchange="updateMemberAdminRole(${member.id}, this.checked)" class="cursor-pointer w-3 h-3"> 관리자
                    </label>
                `;
            }
            html += `<td class="p-3 sm:p-4 border-r border-theme flex items-center gap-2"><input type="text" value="${member.name}" onchange="updateMemberField(${member.id}, 'name', this.value)" class="bg-main border border-theme px-2 py-1 rounded text-xs font-bold w-24 text-main">${adminCheckboxHtml}</td>`;
        } else {
            let badge = member.isAdminRole ? ` <span class="text-[10px] text-yellow-500 bg-yellow-500/20 px-1.5 py-0.5 rounded font-bold ml-1">관리자</span>` : '';
            html += `<td class="p-3 sm:p-4 border-r border-theme font-bold">${member.name}${badge}</td>`;
        }

        // 5. 직업 열
        if (effectiveIsAdmin) {
            let jobOptions = `<option value="">- 선택 -</option>`;
            AVAILABLE_JOBS.forEach(j => {
                jobOptions += `<option value="${j}" ${member.job === j ? 'selected' : ''}>${j}</option>`;
            });
            html += `<td class="p-3 sm:p-4 border-r border-theme"><select onchange="updateMemberField(${member.id}, 'job', this.value)" class="bg-main border border-theme px-2 py-1 rounded text-xs text-main">${jobOptions}</select></td>`;
        } else {
            html += `<td class="p-3 sm:p-4 border-r border-theme text-muted">${member.job || '-'}</td>`;
        }

        // 6. 소속 열
        if (effectiveIsAdmin) {
            let catOptions = '';
            categoryNames.forEach(c => {
                catOptions += `<option value="${c}" ${member.alliance === c ? 'selected' : ''}>${c}</option>`;
            });
            html += `<td class="p-3 sm:p-4 border-r border-theme"><select onchange="updateMemberField(${member.id}, 'alliance', this.value)" class="bg-main border border-theme px-2 py-1 rounded text-xs text-main">${catOptions}</select></td>`;
        } else {
            html += `<td class="p-3 sm:p-4 border-r border-theme">${member.alliance}</td>`;
        }

        // 7. 보유덱 1~5 열
        for(let i=0; i<5; i++) {
            const deck = member.decks && member.decks[i];
            if (deck && (deck.g1 || deck.g2 || deck.g3)) {
                html += `<td class="p-2 sm:p-3 border-r border-theme cursor-pointer" onclick="openDeckModal(${member.id}, ${i})"><div class="deck-cell rounded-lg p-1.5 text-center bg-panel hover:bg-hover"><div class="text-[11px] font-bold gold-text">${deck.g1 || '-'} / ${deck.g2 || '-'} / ${deck.g3 || '-'}</div></div></td>`;
            } else {
                html += `<td class="p-2 sm:p-3 border-r border-theme cursor-pointer" onclick="openDeckModal(${member.id}, ${i})"><div class="deck-cell rounded-lg p-1.5 text-center text-muted border border-dashed border-theme hover:bg-hover">+ 설정</div></td>`;
            }
        }
        
        // 8. 관리(삭제) 열 (관리자 모드 전용)
        if(effectiveIsAdmin) {
            html += `<td class="p-2 text-center"><button onclick="deleteMember(${member.id})" class="bg-red-800 hover:bg-red-700 text-white px-2 py-1 rounded text-xs">삭제</button></td>`;
        }

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

function updateMemberField(id, field, value) {
    const member = members.find(m => m.id === id);
    if (member) {
        member[field] = value;
        saveDataToStorage();
    }
}

function updateMemberAdminRole(id, isChecked) {
    const member = members.find(m => m.id === id);
    if (member) {
        member.isAdminRole = isChecked;
        saveDataToStorage();
        alert(`${member.name}님의 관리자 권한이 ${isChecked ? '부여' : '해제'}되었습니다.`);
    }
}

function toggleFavorite(id) {
    const idx = favorites.indexOf(id);
    if (idx > -1) favorites.splice(idx, 1);
    else favorites.push(id);
    saveDataToStorage();
    renderTable();
}

function renderPagination(totalPages) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        const activeClass = i === currentPage ? 'bg-yellow-600 text-white font-bold' : 'bg-panel border border-theme text-muted hover:bg-hover';
        html += `<button onclick="changePage(${i})" class="px-3 py-1 rounded text-xs transition ${activeClass}">${i}</button>`;
    }
    container.innerHTML = html;
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
function addNewMember() { members.push({ id: Date.now(), uid: "0000", name: "신규장수", alliance: currentFilter === '⭐ 즐겨찾기' ? categoryNames[0] : currentFilter, decks: [], isAdminRole: false }); saveDataToStorage(); renderTable(); }
function deleteMember(id) { if(confirm("정말 삭제하시겠습니까?")) { members = members.filter(m => m.id !== id); saveDataToStorage(); renderTable(); } }

loadDataFromFirebase();
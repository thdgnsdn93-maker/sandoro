let isAdminMode = false;
const ADMIN_PASSWORD = "0731"; // 🔑 관리자 비밀번호[cite: 3]

let categoryNames = ["우리 동맹", "제2동맹", "제3동맹", "재야"];
let currentFilter = '전체';
let searchQuery = '';
let overlapSortGeneral = ''; 
let uploadedFiles = [];
let currentEditMemberId = null;
let currentEditDeckIndex = null;
let currentDictViewCategory = 'gen-wu';

const AVAILABLE_JOBS = ["진군", "신행", "기좌", "병참", "천공", "청낭", "금의위"];

let DB = {
    generals: { 
        "오": { "서성": { tactic: "백리의 성", desc: "4턴 동안 아군 방어막 획득" } }, 
        "촉": { "유비": { tactic: "백성과 함께", desc: "치유 효과" } }, 
        "위": { "조조": { tactic: "난세의 간옹", desc: "피해 감소" } }, 
        "군": { "여포": { tactic: "무쌍의 용사", desc: "일반 공격" } } 
    },
    tactics: { 
        "지휘": { "격려": "[특성: 지휘 | 발동률: 100%] 우군 2명의 무력 증가" }, 
        "패시브": { "강습": "[특성: 패시브 | 발동률: 100%] 일반 공격 후 피해 전달" }, 
        "액티브": { "화공전술": "[특성: 액티브 | 발동률: 45%] 적 전체 화공 상태 부여" }, 
        "추격": { "무방비 공격": "[특성: 추격 | 발동률: 35%] 일반 공격 후 병기 피해" } 
    }
};

let members = [];

// 🔥 [데이터 초기화 방지] 로컬 저장소 우선 로드 + 파이어베이스 동기화
async function loadDataFromFirebase() {
    const localDB = localStorage.getItem('gameDB');
    const localMembers = localStorage.getItem('gameMembers');
    const localCategories = localStorage.getItem('categoryNames');
    const localFiles = localStorage.getItem('uploadedFiles');

    if (localDB) DB = JSON.parse(localDB);
    if (localMembers) members = JSON.parse(localMembers);
    if (localCategories) categoryNames = JSON.parse(localCategories);
    if (localFiles) uploadedFiles = JSON.parse(localFiles);

    renderFilterButtons();
    renderTable();

    if (!window.firebaseDB) {
        setTimeout(loadDataFromFirebase, 300);
        return;
    }
    const { db, doc, getDoc } = window.firebaseDB;
    try {
        const docSnap = await getDoc(doc(db, "alliance_data", "main"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.DB && Object.keys(data.DB.generals).length > 0) DB = data.DB;
            if (data.members && data.members.length > 0) members = data.members;
            if (data.categoryNames) categoryNames = data.categoryNames;
            if (data.uploadedFiles) uploadedFiles = data.uploadedFiles;
            
            saveDataToStorage();
        } else {
            saveDataToStorage();
        }
    } catch (err) {
        console.error("파이어베이스 클라우드 연동 실패 (로컬 데이터로 작동):", err);
    }
    renderFilterButtons();
    renderTable();
}

// 🔥 파이어스토어 및 로컬에 데이터 동기화 저장
async function saveDataToStorage() {
    localStorage.setItem('gameDB', JSON.stringify(DB));
    localStorage.setItem('gameMembers', JSON.stringify(members));
    localStorage.setItem('categoryNames', JSON.stringify(categoryNames));
    localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));

    if (window.firebaseDB) {
        const { db, doc, setDoc } = window.firebaseDB;
        try {
            await setDoc(doc(db, "alliance_data", "main"), {
                DB: DB,
                members: members,
                categoryNames: categoryNames,
                uploadedFiles: uploadedFiles
            });
        } catch (err) {
            console.error("클라우드 저장 실패:", err);
        }
    }
}

// 🎨 테마 변경은 권한 없이 누구나 가능
function applyTheme() {
    const theme = document.getElementById('themeSelector').value;
    document.getElementById('app-body').className = `${theme} min-h-screen flex transition-colors duration-300`;
}

// 🔒 관리자 모드 토글 및 권한 제어
function toggleAdminMode() {
    if (!isAdminMode) {
        const pw = prompt("관리자 비밀번호를 입력하세요:");
        if (pw !== ADMIN_PASSWORD) {
            alert("비밀번호가 틀렸습니다. 관리자 권한을 획득할 수 없습니다.");
            return;
        }
    }

    isAdminMode = !isAdminMode;
    const btn = document.getElementById('editModeBtn');
    const addBtn = document.getElementById('addMemberBtn');
    const delSelectedBtn = document.getElementById('delSelectedBtn');
    const delHeader = document.getElementById('delColHeader');
    const selectAllHeader = document.getElementById('selectAllHeader');
    
    if(isAdminMode) {
        if(btn) btn.innerHTML = "<span>🛡️</span> 관리자 모드 끄기";
        if(addBtn) addBtn.classList.remove('hidden');
        if(delSelectedBtn) delSelectedBtn.classList.remove('hidden');
        if(delHeader) delHeader.classList.remove('hidden');
        if(selectAllHeader) selectAllHeader.classList.remove('hidden');
        alert("관리자 권한이 활성화되었습니다.");
    } else {
        if(btn) btn.innerHTML = "<span>🛡️</span> 관리자 모드";
        if(addBtn) addBtn.classList.add('hidden');
        if(delSelectedBtn) addBtn.classList.add('hidden');
        if(delHeader) delHeader.classList.add('hidden');
        if(selectAllHeader) selectAllHeader.classList.add('hidden');
        alert("관리자 모드가 해제되었습니다.");
    }
    renderFilterButtons();
    renderTable();
}

// 🔒 관리자 권한 확인 래퍼 함수들
function checkAdminBeforeAction(actionCallback) {
    if (!isAdminMode) {
        const pw = prompt("이 기능은 관리자 권한이 필요합니다. 비밀번호를 입력하세요:");
        if (pw === ADMIN_PASSWORD) {
            isAdminMode = true;
            const btn = document.getElementById('editModeBtn');
            const addBtn = document.getElementById('addMemberBtn');
            const delSelectedBtn = document.getElementById('delSelectedBtn');
            const delHeader = document.getElementById('delColHeader');
            const selectAllHeader = document.getElementById('selectAllHeader');
            
            if(btn) btn.innerHTML = "<span>🛡️</span> 관리자 모드 끄기";
            if(addBtn) addBtn.classList.remove('hidden');
            if(delSelectedBtn) delSelectedBtn.classList.remove('hidden');
            if(delHeader) delHeader.classList.remove('hidden');
            if(selectAllHeader) selectAllHeader.classList.remove('hidden');
            renderFilterButtons();
            renderTable();

            actionCallback();
        } else {
            alert("비밀번호가 틀렸습니다. 접근이 거부되었습니다.");
            return;
        }
    } else {
        actionCallback();
    }
}

// 📖 도감 조회는 누구나 가능하도록 변경
function tryOpenDictModal() {
    toggleModal('dictModal');
    renderUploadedFilesList();
    showDictCategory(currentDictViewCategory);
}

function tryExcelUploadTrigger() {
    checkAdminBeforeAction(() => {
        document.getElementById('excelInput').click();
    });
}

function addNewMember() {
    if (!isAdminMode) return alert("관리자 모드에서만 인원을 추가할 수 있습니다.");
    const newMember = {
        id: Date.now(),
        uid: String(Math.floor(1000 + Math.random() * 9000)),
        name: "신규장수",
        job: "",
        alliance: categoryNames[0] || "미소속",
        decks: []
    };
    members.push(newMember);
    saveDataToStorage();
    renderTable();
}

function deleteMember(id) {
    if (!isAdminMode) return alert("관리자 모드에서만 삭제할 수 있습니다.");
    if(confirm("정말 이 인원을 삭제하시겠습니까?")) {
        members = members.filter(m => m.id !== id);
        saveDataToStorage();
        renderTable();
    }
}

function toggleSelectAll(source) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

function deleteSelectedMembers() {
    if (!isAdminMode) return alert("관리자 모드에서만 삭제할 수 있습니다.");
    const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked'))
                           .map(cb => Number(cb.getAttribute('data-id')));
    if(selectedIds.length === 0) return alert("선택된 인원이 없습니다.");
    if(confirm(`선택한 총 ${selectedIds.length}명의 인원을 정말 삭제하시겠습니까?`)) {
        members = members.filter(m => !selectedIds.includes(m.id));
        saveDataToStorage();
        renderTable();
        const selectAll = document.getElementById('selectAllCheckbox');
        if(selectAll) selectAll.checked = false;
    }
}

function updateMemberField(id, field, value) {
    if (!isAdminMode) return;
    const m = members.find(item => item.id === id);
    if(m) {
        m[field] = value;
        saveDataToStorage();
    }
}

function openSettingsModal() {
    const container = document.getElementById('categoryInputsContainer');
    container.innerHTML = '';
    categoryNames.forEach((cat, index) => {
        container.innerHTML += `
        <div class="flex gap-2 items-center bg-main p-2 rounded-lg border border-theme">
            <input type="text" value="${cat}" ${isAdminMode ? '' : 'disabled'} class="cat-input flex-1 bg-panel border border-theme px-3 py-1.5 rounded-lg text-sm">
            ${isAdminMode ? `<button type="button" onclick="this.parentElement.remove()" class="bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">삭제</button>` : ''}
        </div>`;
    });
    toggleModal('settingsModal');
}

function addCategoryInput() {
    if (!isAdminMode) return alert("관리자 권한이 필요합니다.");
    const container = document.getElementById('categoryInputsContainer');
    container.innerHTML += `
    <div class="flex gap-2 items-center bg-main p-2 rounded-lg border border-theme">
        <input type="text" value="새 동맹" class="cat-input flex-1 bg-panel border border-theme px-3 py-1.5 rounded-lg text-sm">
        <button type="button" onclick="this.parentElement.remove()" class="bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">삭제</button>
    </div>`;
}

function saveSettings() {
    applyTheme();
    if (!isAdminMode) {
        toggleModal('settingsModal');
        return;
    }
    const inputs = document.querySelectorAll('.cat-input');
    categoryNames = Array.from(inputs).map(input => input.value.trim()).filter(val => val !== '');
    if (!categoryNames.includes("재야")) categoryNames.push("재야");
    saveDataToStorage();
    renderFilterButtons();
    toggleModal('settingsModal');
    renderTable();
}

function renderFilterButtons() {
    const container = document.getElementById('filter-buttons');
    const sidebarContainer = document.getElementById('sidebar-filter-buttons');
    
    let html = `<button onclick="filterTable('전체')" class="px-4 py-2 rounded-lg text-xs font-bold ${currentFilter === '전체' ? 'bg-yellow-600 text-white shadow' : 'bg-panel hover:bg-hover border border-theme text-muted'}">전체 보기</button>`;
    let sidebarHtml = `<a href="#" onclick="filterTable('전체'); return false;" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${currentFilter === '전체' ? 'bg-hover text-main font-bold' : 'text-muted hover:bg-hover hover:text-main'} transition"><span>🛡️</span> 전체 보기</a>`;
    
    categoryNames.forEach((cat) => {
        const isSelected = currentFilter === cat;
        const btnClass = isSelected ? 'bg-yellow-600 text-white shadow' : 'bg-panel hover:bg-hover border border-theme text-muted';
        const sidebarClass = isSelected ? 'bg-hover text-main font-bold' : 'text-muted hover:bg-hover hover:text-main';
        
        html += `<button onclick="filterTable('${cat}')" class="px-4 py-2 rounded-lg text-xs font-bold transition ${btnClass}">${cat}</button>`;
        sidebarHtml += `<a href="#" onclick="filterTable('${cat}'); return false;" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${sidebarClass} transition"><span>⚔️</span> ${cat}</a>`;
    });
    
    if(container) container.innerHTML = html;
    if(sidebarContainer) sidebarContainer.innerHTML = sidebarHtml;
}

function handleSearch() {
    searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    renderTable();
}

function filterTable(filter) {
    currentFilter = filter;
    renderFilterButtons();
    renderTable();
}

// ⚔️ 장수 겹침 분석은 권한 없이 누구나 이용 가능
function openOverlapModal() {
    document.getElementById('overlapSearchInput').value = '';
    toggleModal('overlapModal');
}

function hasGeneral(member, genName) {
    if (!member.decks || member.decks.length === 0) return false;
    for (let d of member.decks) {
        if (!d) continue;
        if ((d.g1 && d.g1.includes(genName)) || 
            (d.g2 && d.g2.includes(genName)) || 
            (d.g3 && d.g3.includes(genName))) {
            return true;
        }
    }
    return false;
}

function applyOverlapSort() {
    const val = document.getElementById('overlapSearchInput').value.trim();
    if(!val) return alert("장수 이름을 입력해주세요.");
    overlapSortGeneral = val;
    toggleModal('overlapModal');
    renderTable();
}

function clearOverlapSort() {
    overlapSortGeneral = '';
    toggleModal('overlapModal');
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('member-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let filtered = members.filter(member => {
        const matchAlliance = (currentFilter === '전체') || (member.alliance === currentFilter);
        const matchSearch = member.name.toLowerCase().includes(searchQuery) || member.uid.toLowerCase().includes(searchQuery);
        return matchAlliance && matchSearch;
    });

    if (overlapSortGeneral) {
        filtered.sort((a, b) => {
            const aHas = hasGeneral(a, overlapSortGeneral) ? 1 : 0;
            const bHas = hasGeneral(b, overlapSortGeneral) ? 1 : 0;
            return bHas - aHas;
        });

        const badge = document.getElementById('sort-status-badge');
        badge.innerText = `⚔️ '${overlapSortGeneral}' 보유자 우선 정렬중`;
        badge.classList.remove('hidden');
    } else {
        const badge = document.getElementById('sort-status-badge');
        if(badge) badge.classList.add('hidden');
    }

    const totalCountEl = document.getElementById('total-member-count');
    if(totalCountEl) totalCountEl.innerText = members.length;
    
    const filteredCountEl = document.getElementById('filtered-member-count');
    if (filteredCountEl) {
        if (currentFilter !== '전체' || searchQuery) {
            filteredCountEl.innerText = ` (검색/필터 결과: ${filtered.length}명)`;
        } else {
            filteredCountEl.innerText = '';
        }
    }

    if(filtered.length === 0) {
        const colspan = isAdminMode ? 12 : 11;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="p-6 text-center text-muted">등록된 인원이 없거나 검색 결과가 없습니다.</td></tr>`;
        return;
    }

    filtered.forEach((member, index) => {
        const tr = document.createElement('tr');
        const isTargetHighlighted = overlapSortGeneral && hasGeneral(member, overlapSortGeneral);
        tr.className = `border-b border-theme transition ${isTargetHighlighted ? 'bg-amber-950/40' : 'bg-hover'}`;
        
        let allianceOptions = '';
        categoryNames.forEach(cat => {
            allianceOptions += `<option value="${cat}" ${member.alliance === cat ? 'selected' : ''}>${cat}</option>`;
        });

        let jobOptions = `<option value="">(공란)</option>`;
        AVAILABLE_JOBS.forEach(j => {
            jobOptions += `<option value="${j}" ${member.job === j ? 'selected' : ''}>${j}</option>`;
        });

        let html = '';
        if(isAdminMode) {
            html += `<td class="p-4 border-r border-theme text-center"><input type="checkbox" class="row-checkbox cursor-pointer" data-id="${member.id}"></td>`;
        }

        html += `
            <td class="p-4 border-r border-theme text-center text-muted font-bold">${index + 1}</td>
            <td class="p-4 border-r border-theme text-muted">
                ${isAdminMode ? `<input type="text" value="${member.uid}" onchange="updateMemberField(${member.id}, 'uid', this.value)" class="w-20 text-xs">` : member.uid}
            </td>
            <td class="p-4 border-r border-theme font-bold">
                ${isAdminMode ? `<input type="text" value="${member.name}" onchange="updateMemberField(${member.id}, 'name', this.value)" class="w-32 text-xs font-bold">` : member.name}
            </td>
            <td class="p-4 border-r border-theme text-muted">
                ${isAdminMode ? `<select onchange="updateMemberField(${member.id}, 'job', this.value)" class="text-xs">${jobOptions}</select>` : (member.job || '-')}
            </td>
            <td class="p-4 border-r border-theme">
                ${isAdminMode ? `<select onchange="updateMemberField(${member.id}, 'alliance', this.value)" class="text-xs">${allianceOptions}</select>` : `<span class="px-2.5 py-1 rounded-lg text-xs bg-panel border border-theme">${member.alliance}</span>`}
            </td>
        `;

        for(let i=0; i<5; i++) {
            const deck = member.decks[i];
            if (deck) {
                html += `<td class="p-3 border-r border-theme"><div onclick="openDeckModal(${member.id},${i})" class="deck-cell rounded-lg p-2 text-center"><div class="text-xs font-bold gold-text mb-1">${deck.g1} / ${deck.g2} /${deck.g3}</div><div class="text-[10px] text-muted">수정</div></div></td>`;
            } else {
                html += `<td class="p-3 border-r border-theme"><div onclick="openDeckModal(${member.id},${i})" class="deck-cell rounded-lg p-2 text-center text-muted" style="border-style: dashed;">+ 설정</div></td>`;
            }
        }

        if(isAdminMode) {
            html += `<td class="p-3 text-center"><button onclick="deleteMember(${member.id})" class="bg-red-800 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold">삭제</button></td>`;
        }

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

function downloadShareExcel() {
    if (members.length === 0) return alert("다운로드할 인원 데이터가 없습니다.");
    
    const excelRows = members.map((m, idx) => {
        let rowData = { "번호": idx + 1, "UID": m.uid, "닉네임": m.name, "직업": m.job || "", "소속": m.alliance };
        for (let i = 0; i < 5; i++) {
            const d = m.decks[i];
            const p = `${i + 1}덱_`;
            rowData[p + "주장"] = d ? d.g1 : ""; rowData[p + "주장전법1"] = d ? d.t1_1 : ""; rowData[p + "주장전법2"] = d ? d.t1_2 : ""; rowData[p + "주장전법3"] = d ? d.t1_3 : "";
            rowData[p + "부장1"] = d ? d.g2 : ""; rowData[p + "부장1전법1"] = d ? d.t2_1 : ""; rowData[p + "부장1전법2"] = d ? d.t2_2 : ""; rowData[p + "부장1전법3"] = d ? d.t2_3 : "";
            rowData[p + "부장2"] = d ? d.g3 : ""; rowData[p + "부장2전법1"] = d ? d.t3_1 : ""; rowData[p + "부장2전법2"] = d ? d.t3_2 : ""; rowData[p + "부장2전법3"] = d ? d.t3_3 : "";
        }
        return rowData;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows);
    XLSX.utils.book_append_sheet(wb, ws, "연합부대현황");
    XLSX.writeFile(wb, `연합_부대편성현황_${new Date().toISOString().slice(0, 10)}.xlsx`);
    alert("공유용 엑셀 파일이 다운로드되었습니다!");
}

function handleExcelUpload(event) {
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

            let parsedMembers = [];

            jsonRows.forEach((row) => {
                let uid = '';
                let name = '';
                let rawJob = '';
                let rawAlliance = '';

                for (let key in row) {
                    let cleanKey = String(key).trim().replace(/\s+/g, '');
                    let val = String(row[key] || '').trim();

                    if (cleanKey.includes('UID') || cleanKey === '아이디' || cleanKey === '번호') {
                        if (val) uid = val;
                    } else if (cleanKey.includes('닉네임') || cleanKey.includes('이름') || cleanKey.includes('유저')) {
                        if (val) name = val;
                    } else if (cleanKey.includes('직업') || cleanKey.includes('역할')) {
                        if (val) rawJob = val;
                    } else if (cleanKey.includes('소속') || cleanKey.includes('동맹') || cleanKey.includes('길드')) {
                        if (val) rawAlliance = val;
                    }
                }

                const keys = Object.keys(row);
                if (!uid && keys.length > 0) uid = String(row[keys[0]] || '').trim();
                if (!name && keys.length > 1) name = String(row[keys[1]] || '').trim();
                if (!rawJob && keys.length > 2) rawJob = String(row[keys[2]] || '').trim();
                if (!rawAlliance && keys.length > 3) rawAlliance = String(row[keys[3]] || '').trim();

                if (!name || name.includes('닉네임')) return;
                if (!uid) uid = String(Math.floor(1000 + Math.random() * 9000));

                let job = AVAILABLE_JOBS.includes(rawJob) ? rawJob : "";

                let alliance = rawAlliance || "재야";
                const lowerAlliance = alliance.toLowerCase();
                if (lowerAlliance.includes('무소속') || lowerAlliance.includes('미소속') || lowerAlliance.includes('재야')) {
                    alliance = "재야";
                } else if (!categoryNames.includes(alliance)) {
                    categoryNames.push(alliance);
                }

                parsedMembers.push({
                    uid: uid,
                    name: name,
                    job: job,
                    alliance: alliance,
                    decks: []
                });
            });

            if (parsedMembers.length === 0) {
                return alert("유효한 유저 데이터를 찾지 못했습니다. 엑셀 양식을 확인해주세요.");
            }

            let addedList = [];
            let updatedList = [];

            parsedMembers.forEach(newM => {
                let existingIndex = members.findIndex(m => String(m.uid) === String(newM.uid));
                
                if (existingIndex !== -1) {
                    members[existingIndex].name = newM.name;
                    members[existingIndex].job = newM.job;
                    members[existingIndex].alliance = newM.alliance;
                    updatedList.push(`${newM.name} (UID:${newM.uid})`);
                } else {
                    members.push({
                        id: Date.now() + Math.random(),
                        ...newM
                    });
                    addedList.push(`${newM.name} (UID:${newM.uid})`);
                }
            });

            saveDataToStorage();
            renderFilterButtons();
            renderTable();
            showUploadReport(addedList, updatedList);
        } catch (err) {
            alert("엑셀 파일을 읽는 중 오류가 발생했습니다: " + err.message);
        }
        event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}

function showUploadReport(added, updated) {
    const container = document.getElementById('reportContentContainer');
    let html = `
        <div class="bg-main p-3 rounded-lg border border-theme">
            <h3 class="font-bold text-emerald-400 mb-1">✨ 신규 추가된 인원 (${added.length}명)</h3>
            <p class="text-xs text-muted mb-2">${added.length > 0 ? added.join(', ') : '없음'}</p>
        </div>
        <div class="bg-main p-3 rounded-lg border border-theme">
            <h3 class="font-bold text-yellow-400 mb-1">🔄 정보 및 덱 최신화(갱신)된 인원 (${updated.length}명)</h3>
            <p class="text-xs text-muted mb-2">${updated.length > 0 ? updated.join(', ') : '없음'}</p>
        </div>
    `;
    container.innerHTML = html;
    toggleModal('uploadReportModal');
}

document.addEventListener('input', function(e) {
    if (e.target && e.target.classList.contains('search-input')) processAutocomplete(e.target);
});
document.addEventListener('compositionend', function(e) {
    if (e.target && e.target.classList.contains('search-input')) processAutocomplete(e.target);
});

function processAutocomplete(input) {
    const type = input.getAttribute('data-type');
    const listId = input.getAttribute('data-list');
    const targetId = input.getAttribute('data-target');
    const list = document.getElementById(listId);
    const val = input.value.toLowerCase().trim();

    if (!list) return;
    list.innerHTML = '';
    if (!val) { list.classList.add('hidden'); return; }

    let matches = [];
    if (type === 'general') {
        for (let faction in DB.generals) {
            for (let genName in DB.generals[faction]) {
                if (genName.toLowerCase().includes(val)) matches.push({ name: genName, tactic: DB.generals[faction][genName].tactic });
            }
        }
    } else if (type === 'tactic') {
        for (let tacType in DB.tactics) {
            for (let tacName in DB.tactics[tacType]) {
                if (tacName.toLowerCase().includes(val)) matches.push({ name: tacName });
            }
        }
    } else if (type === 'member') {
        members.forEach(m => {
            if (m.name.toLowerCase().includes(val) || m.uid.toLowerCase().includes(val)) matches.push({ name: `${m.name} (${m.uid})` });
        });
    }

    if (matches.length === 0) { list.classList.add('hidden'); return; }

    matches.forEach(item => {
        const div = document.createElement('div');
        div.innerHTML = type === 'general' ? `<strong>${item.name}</strong> <span class="text-muted text-[11px]">(${item.tactic})</span>` : `<span>${item.name}</span>`;
        div.onclick = function() {
            input.value = type === 'member' ? item.name.split(' (')[0] : item.name;
            list.classList.add('hidden');
            if (targetId && item.tactic) document.getElementById(targetId).value = item.tactic;
            if (type === 'member') handleSearch();
        };
        list.appendChild(div);
    });
    list.classList.remove('hidden');
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.autocomplete-container') && !e.target.closest('#searchInput') && !e.target.closest('#overlapSearchInput')) {
        document.querySelectorAll('.autocomplete-items').forEach(el => el.classList.add('hidden'));
    }
});

function openDeckModal(memberId, deckIndex) {
    currentEditMemberId = memberId;
    currentEditDeckIndex = deckIndex;
    const member = members.find(m => m.id === memberId);
    document.getElementById('deckModalTitle').innerText = `${member.name} - 보유덱 ${deckIndex + 1} 설정`;
    const deck = member.decks[deckIndex] || { g1:'', t1_1:'', t1_2:'', t1_3:'', g2:'', t2_1:'', t2_2:'', t2_3:'', g3:'', t3_1:'', t3_2:'', t3_3:'' };
    
    ['gen1','tac1_1','tac1_2','tac1_3', 'gen2','tac2_1','tac2_2','tac2_3', 'gen3','tac3_1','tac3_2','tac3_3'].forEach(id => {
        const key = id.replace('gen', 'g').replace('tac', 't');
        const el = document.getElementById(id);
        if(el) el.value = deck[key] || '';
    });
    document.querySelectorAll('.autocomplete-items').forEach(el => el.classList.add('hidden'));
    toggleModal('deckModal');
}

function saveDeck() {
    const getVal = (id) => document.getElementById(id).value;
    const deck = {
        g1: getVal('gen1'), t1_1: getVal('tac1_1'), t1_2: getVal('tac1_2'), t1_3: getVal('tac1_3'),
        g2: getVal('gen2'), t2_1: getVal('tac2_1'), t2_2: getVal('tac2_2'), t2_3: getVal('tac2_3'),
        g3: getVal('gen3'), t3_1: getVal('tac3_1'), t3_2: getVal('tac3_2'), t3_3: getVal('tac3_3'),
    };
    const member = members.find(m => m.id === currentEditMemberId);
    while(member.decks.length <= currentEditDeckIndex) member.decks.push(null);
    member.decks[currentEditDeckIndex] = (deck.g1 || deck.g2 || deck.g3) ? deck : null;
    saveDataToStorage();
    toggleModal('deckModal');
    renderTable();
}

function clearDeck() {
    ['gen1','tac1_1','tac1_2','tac1_3', 'gen2','tac2_1','tac2_2','tac2_3', 'gen3','tac3_1','tac3_2','tac3_3'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
}

function toggleModal(id) { document.getElementById(id).classList.toggle('hidden'); }

function openAddGeneralModal() {
    if (!isAdminMode) return alert("관리자 권한이 필요합니다.");
    document.getElementById('dictItemModalTitle').innerText = "도감 항목 직접 추가";
    document.getElementById('addItemType').value = "general";
    toggleAddFormType();
    toggleModal('dictItemModal');
}

function toggleAddFormType() {
    const type = document.getElementById('addItemType').value;
    if(type === 'general') {
        document.getElementById('factionDiv').classList.remove('hidden');
        document.getElementById('tacTypeDiv').classList.add('hidden');
        document.getElementById('addNameLabel').innerText = "장수 이름";
        document.getElementById('tacticNameDiv').classList.remove('hidden');
    } else {
        document.getElementById('factionDiv').classList.add('hidden');
        document.getElementById('tacTypeDiv').classList.remove('hidden');
        document.getElementById('addNameLabel').innerText = "전법 이름";
        document.getElementById('tacticNameDiv').classList.add('hidden');
    }
}

function saveDictItemDirect() {
    if (!isAdminMode) return alert("관리자 권한이 필요합니다.");
    const type = document.getElementById('addItemType').value;
    const name = document.getElementById('addItemName').value.trim();
    const desc = document.getElementById('addItemDesc').value.trim();
    if(!name) return alert("이름을 입력해주세요.");

    if(type === 'general') {
        const faction = document.getElementById('addFaction').value;
        const tactic = document.getElementById('addItemTactic').value.trim();
        DB.generals[faction][name] = { tactic: tactic || "고유전법", desc: desc || "설명 없음" };
    } else {
        const tacType = document.getElementById('addTacType').value;
        DB.tactics[tacType][name] = desc || "설명 없음";
    }
    saveDataToStorage();
    toggleModal('dictItemModal');
    showDictCategory(currentDictViewCategory);
    alert("도감에 저장되었습니다!");
}

function deleteDictItem(categoryKey, itemName) {
    if (!isAdminMode) return alert("관리자 권한이 필요합니다.");
    if(confirm(`"${itemName}" 항목을 삭제하시겠습니까?`)) {
        if(categoryKey.startsWith('gen-')) {
            const map = { 'gen-wu': '오', 'gen-shu': '촉', 'gen-wei': '위', 'gen-qun': '군' };
            delete DB.generals[map[categoryKey]][itemName];
        } else {
            const map = { 'tac-cmd': '지휘', 'tac-pas': '패시브', 'tac-act': '액티브', 'tac-pur': '추격' };
            delete DB.tactics[map[categoryKey]][itemName];
        }
        saveDataToStorage();
        showDictCategory(categoryKey);
    }
}

// 📖 도감 조회 기능 (일반 유저 누구나 조회 가능)
function showDictCategory(cat) {
    currentDictViewCategory = cat;
    const content = document.getElementById('dict-content');
    if(!content) return;
    let html = '';
    if (cat.startsWith('gen-')) {
        const map = { 'gen-wu': '오', 'gen-shu': '촉', 'gen-wei': '위', 'gen-qun': '군' };
        const f = map[cat];
        html += `<h3 class="text-2xl font-bold mb-4 border-b border-theme pb-2">[${f}] 장수 고유 전법</h3>`;
        const list = DB.generals[f];
        if(!list || Object.keys(list).length === 0) {
            html += `<p class="text-muted">등록된 장수가 없습니다.</p>`;
        } else {
            for (let gen in list) {
                const deleteBtn = isAdminMode ? `<button onclick="deleteDictItem('${cat}', '${gen}')" class="absolute top-3 right-3 text-red-400 font-bold text-xs bg-red-950 px-2 py-1 rounded">삭제</button>` : '';
                html += `<div class="bg-main p-3 rounded-lg mb-3 border-l-4 gold-border shadow relative">${deleteBtn}<div class="font-bold gold-text text-lg pr-12">${gen} <span class="text-sm bg-panel px-2 py-0.5 rounded text-muted">고유: ${list[gen].tactic}</span></div><p class="text-sm mt-2 text-muted bg-panel p-2.5 rounded-lg border border-theme">${list[gen].desc}</p></div>`;
            }
        }
    } else {
        const map = { 'tac-cmd': '지휘', 'tac-pas': '패시브', 'tac-act': '액티브', 'tac-pur': '추격' };
        const t = map[cat];
        html += `<h3 class="text-2xl font-bold mb-4 border-b border-theme pb-2">[${t}] 공용 전법</h3>`;
        const list = DB.tactics[t];
        if(!list || Object.keys(list).length === 0) {
            html += `<p class="text-muted">등록된 공용 전법이 없습니다.</p>`;
        } else {
            for (let tac in list) {
                const deleteBtn = isAdminMode ? `<button onclick="deleteDictItem('${cat}', '${tac}')" class="absolute top-3 right-3 text-red-400 font-bold text-xs bg-red-950 px-2 py-1 rounded">삭제</button>` : '';
                html += `<div class="bg-main p-3 rounded-lg mb-3 border-l-4 border-blue-500 shadow relative">${deleteBtn}<div class="font-bold text-lg text-blue-400 pr-12">${tac}</div><p class="text-sm mt-2 text-muted bg-panel p-2.5 rounded-lg border border-theme">${list[tac]}</p></div>`;
            }
        }
    }
    content.innerHTML = html;
}

function cleanMdText(text) { if (!text) return ''; return text.replace(/[*#_`>]/g, '').replace(/\[.*?\]/g, '').trim(); }

function handleMarkdownUpload(event) {
    if (!isAdminMode) return alert("관리자 권한이 필요합니다.");
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const lines = e.target.result.split('\n');
        let currentFaction = '군';
        let currentTacType = '액티브';
        let currentGenName = null;
        let currentGenInfo = { tactic: '', desc: '' };
        let parsedGen = 0, parsedTac = 0;

        lines.forEach((line) => {
            const trimmed = line.trim();
            if (trimmed.includes('오나라') || trimmed.includes('오 (吴)')) currentFaction = '오';
            else if (trimmed.includes('촉나라') || trimmed.includes('촉 (蜀)')) currentFaction = '촉';
            else if (trimmed.includes('위나라') || trimmed.includes('위 (魏)')) currentFaction = '위';
            else if (trimmed.includes('군웅')) currentFaction = '군';

            if (trimmed.includes('지휘 전법')) currentTacType = '지휘';
            else if (trimmed.includes('패시브 전법')) currentTacType = '패시브';
            else if (trimmed.includes('액티브 전법')) currentTacType = '액티브';
            else if (trimmed.includes('추격 전법')) currentTacType = '추격';

            if (trimmed.startsWith('### ') && !trimmed.includes('목차')) {
                if (currentGenName) DB.generals[currentFaction][currentGenName] = currentGenInfo;
                const match = trimmed.match(/###\s+(.*?)\s+-\s+(.*?)(?:\s+\[.*\])?$/);
                if (match) {
                    currentGenName = cleanMdText(match[1]);
                    currentGenInfo = { tactic: cleanMdText(match[2]), desc: '' };
                    parsedGen++;
                }
            } else if (currentGenName && trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('|')) {
                const cleaned = cleanMdText(trimmed);
                if (cleaned && !cleaned.includes('소속 국가')) currentGenInfo.desc += cleaned + " ";
            }

            if (trimmed.startsWith('|') && !trimmed.includes('전법명') && !trimmed.includes('---')) {
                const parts = trimmed.split('|').map(p => p.trim());
                if (parts.length >= 6) {
                    const tacName = cleanMdText(parts[1]);
                    const tacChar = cleanMdText(parts[2]);
                    const tacRate = cleanMdText(parts[3]);
                    const tacDesc = cleanMdText(parts[5]);
                    if (tacName) {
                        DB.tactics[currentTacType][tacName] = `[특성: ${tacChar} | 발동률: ${tacRate}] ${tacDesc}`;
                        parsedTac++;
                    }
                }
            }
        });
        if (currentGenName) DB.generals[currentFaction][currentGenName] = currentGenInfo;

        uploadedFiles.push({ id: Date.now(), name: file.name, type: 'md' });
        saveDataToStorage();
        renderUploadedFilesList();
        alert(`마크다운 분석 및 파이어스토어 동기화 완료!\n- 장수: ${parsedGen}개\n- 공용 전법: ${parsedTac}개 반영 완료`);
        event.target.value = '';
    };
    reader.readAsText(file, 'UTF-8');
}

function renderUploadedFilesList() {
    const countEl = document.getElementById('uploaded-files-count');
    const chipsEl = document.getElementById('uploaded-files-chips');
    if(!countEl) return;
    countEl.innerText = `${uploadedFiles.length}개`;
    let html = '';
    uploadedFiles.forEach(file => {
        html += `<div class="bg-panel border border-theme px-2.5 py-1 rounded-lg flex items-center gap-2"><span class="text-main font-bold">📄 ${file.name}</span></div>`;
    });
    if(chipsEl) chipsEl.innerHTML = html || '<span class="text-muted italic">업로드된 파일 없음</span>';
}

function downloadDictTemplate() {
    if (!isAdminMode) return alert("관리자 권한이 필요합니다.");
    const wb = XLSX.utils.book_new();
    const genRows = [];
    for(let faction in DB.generals) {
        for(let genName in DB.generals[faction]) {
            genRows.push({ "소속": faction, "이름": genName, "고유전법": DB.generals[faction][genName].tactic, "설명": DB.generals[faction][genName].desc });
        }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(genRows), "장수");
    
    const tacRows = [];
    for(let type in DB.tactics) {
        for(let tacName in DB.tactics[type]) {
            tacRows.push({ "분류": type, "이름": tacName, "설명": DB.tactics[type][tacName] });
        }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tacRows), "전법");
    XLSX.writeFile(wb, "도감_템플릿.xlsx");
}

function handleDictUpload(event) {
    if (!isAdminMode) return alert("관리자 권한이 필요합니다.");
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        if (workbook.SheetNames.includes("장수")) {
            XLSX.utils.sheet_to_json(workbook.Sheets["장수"]).forEach(row => {
                if (row['소속'] && row['이름']) DB.generals[row['소속'].trim()][row['이름'].trim()] = { tactic: row['고유전법'] || "", desc: row['설명'] || "" };
            });
        }
        if (workbook.SheetNames.includes("전법")) {
            XLSX.utils.sheet_to_json(workbook.Sheets["전법"]).forEach(row => {
                if (row['분류'] && row['이름']) DB.tactics[row['분류'].trim()][row['이름'].trim()] = row['설명'] || "";
            });
        }
        saveDataToStorage();
        alert("도감 엑셀 데이터가 반영되었습니다!");
        event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}
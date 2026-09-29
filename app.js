let isAdminMode = false;
let isUserPreview = false;
let isDeckEditUnlocked = false;
let currentPage = 1;
const ADMIN_PASSWORD = "0731";
const CREATOR_UID = "20029059326"; // ✨ 제작자 UID 고정

let categoryNames = ["금의위", "낙원(동맹)", "낙화", "고구려", "재야"];
let currentFilter = '금의위'; // 전체 보기가 없으므로 첫 카테고리를 기본값으로 설정
let searchQuery = '';
let uploadedFiles = [];
let currentDictTargetTab = 'formation';

let accessLogs = JSON.parse(localStorage.getItem('accessLogs') || '[]');
const AVAILABLE_JOBS = ["진군", "신행", "기좌", "병참", "천공", "청낭", "금의위"];
let members = [];

let DICT_CONTENTS = {
    formation: `# 1. 진형 및 병종상성 대도감\n## 진형\n### 기형진\n- **특성**: 기병 피해 증가 및 방어 상승\n### 일자진\n- **특성**: 전열 피해 8% 감소\n### 학익진\n- **특성**: 원거리 및 책략 피해 상승\n### 어린진\n- **특성**: 돌격 및 선봉 전투력 극대화\n### 팔괘진\n- **특성**: 진형 전체 책략 방어 및 회복`,
    synergy: `# 2. 각 장수 인연보너스 대도감\n## 도원결의\n### 구성원\n- **대상**: 유비, 관우, 장비\n- **인연 효과**: 3번째 턴 행동 전 아군 전체 디버프 일괄 제거\n## 오호상장\n### 구성원\n- **대상**: 관우, 장비, 조운, 마초, 황충\n- **인연 효과**: 회심(치명타) 피해 +10%`,
    generalTactic: `# 3. 장수 전법정리 대도감\n## 오나라\n### 유비\n- 고유 전법: 백성과 함께 (지휘 / 치유 | 발동률 100%)\n-\n전법 상세 효과: 전투 시작 시, 전체 아군의 통솔이 18포인트 증가합니다(지력의 영향 받음). 매 턴 종료 시, 전체 아군의 병력을 회복시키며(치유율 100%, 지력의 영향 받음), 현재 병력이 가장 낮은 아군 단일 목표의 디버프 상태를 1개 제거하고 해당 목표의 병력을 1회 추가 회복시킵니다(치유율 90%, 지력의 영향 받음).\n### 조운\n- 고유 전법: 칠진칠출 (액티브 / 병刃 | 발동률 45%)\n-\n전법 상세 효과: 적군 단일에게 병刃 피해를 줍니다.`,
    commonTactic: `# 4. 공용 전법정리 대도감\n## 지휘 전법\n### 격려\n- **효과**: 우군 무력 증가\n### 허점 공략\n- **효과**: 방어 감소\n### 청낭 치료\n- **효과**: 회복`
};

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
                
                if (!categoryNames.includes(currentFilter)) {
                    currentFilter = categoryNames[0] || '금의위';
                }

                saveDataToStorage();
                renderFilterButtons();
                renderTable();
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

    if (!categoryNames.includes(currentFilter)) {
        currentFilter = categoryNames[0] || '금의위';
    }

    renderFilterButtons();
    renderTable();
}

async function saveDataToStorage() {
    localStorage.setItem('gameMembers', JSON.stringify(members));
    localStorage.setItem('categoryNames', JSON.stringify(categoryNames));
    localStorage.setItem('dictContents', JSON.stringify(DICT_CONTENTS));

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
    if (isRememberChecked) {
        localStorage.setItem('savedAuthUid', inputUid);
    } else {
        localStorage.removeItem('savedAuthUid');
    }

    let matchedMember = members.find(m => String(m.uid) === inputUid);
    let isCreator = (inputUid === CREATOR_UID);

    if (!matchedMember) {
        if (isCreator) {
            matchedMember = { uid: CREATOR_UID, name: "관리자(산도로)", alliance: categoryNames[0], job: "금의위", decks: [] };
            members.push(matchedMember);
        } else {
            matchedMember = { 
                id: Date.now() + Math.random(), 
                uid: inputUid, 
                name: `대원_${inputUid.slice(-4)}`, 
                alliance: categoryNames[0], 
                job: "", 
                decks: [] 
            };
            members.push(matchedMember);
        }
        saveDataToStorage();
    }

    const userInfo = { uid: matchedMember.uid, name: matchedMember.name, time: new Date().toLocaleString() };
    localStorage.setItem('loggedUser', JSON.stringify(userInfo));
    accessLogs.unshift({ uid: matchedMember.uid, name: matchedMember.name, time: new Date().toLocaleString() });
    localStorage.setItem('accessLogs', JSON.stringify(accessLogs));

    if (isCreator || matchedMember.uid === CREATOR_UID) {
        alert("반갑습니다 관리자(산도로)님!");
    } else {
        alert(`환영합니다 ${matchedMember.uid} ${matchedMember.name}님! (일반 모드 로그인)`);
    }

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
    const previewBtn = document.getElementById('previewToggleBtn');
    if (previewBtn) {
        previewBtn.innerText = isUserPreview ? "👀 일반 유저 시점 끄기 (보기 복귀)" : "👀 일반 유저 시점 미리보기";
    }
    toggleModal('adminControlModal');
    renderTable();
    updateDictAdminUI();
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
    const btn = document.getElementById('editModeBtn');
    const addBtn = document.getElementById('addMemberBtn');
    const delSelectedBtn = document.getElementById('delSelectedBtn');
    const delHeader = document.getElementById('delColHeader');
    const selectAllHeader = document.getElementById('selectAllHeader');
    const uidHeader = document.getElementById('uidColHeader');
    
    if (isAdminMode) {
        if(btn) {
            btn.innerHTML = "<span>🛡️</span> 관리자 제어판";
            btn.className = "bg-red-800 hover:bg-red-700 px-4 py-2 rounded-lg font-bold text-white text-xs shadow transition flex items-center gap-1.5";
        }
        if(addBtn) addBtn.classList.remove('hidden');
        if(delSelectedBtn) delSelectedBtn.classList.remove('hidden');
        if(delHeader) delHeader.classList.remove('hidden');
        if(selectAllHeader) selectAllHeader.classList.remove('hidden');
        if(uidHeader) uidHeader.classList.remove('hidden');
    } else {
        if(btn) {
            btn.innerHTML = "<span>🛡️</span> 관리자 모드";
            btn.className = "bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg font-bold text-white text-xs shadow transition flex items-center gap-1.5";
        }
        if(addBtn) addBtn.classList.add('hidden');
        if(delSelectedBtn) delSelectedBtn.classList.add('hidden');
        if(delHeader) delHeader.classList.add('hidden');
        if(selectAllHeader) selectAllHeader.classList.add('hidden');
        if(uidHeader) uidHeader.classList.add('hidden');
    }
    renderFilterButtons();
    renderTable();
    updateDictAdminUI();
}

function updateDictAdminUI() {
    const editBtn = document.getElementById('editDictBtn');
    if (!editBtn) return;
    const effectiveIsAdmin = isAdminMode && !isUserPreview;
    if (effectiveIsAdmin) {
        editBtn.classList.remove('hidden');
    } else {
        editBtn.classList.add('hidden');
    }
}

function openDictEditModal() {
    const rawText = DICT_CONTENTS[currentDictTargetTab] || "";
    document.getElementById('dictEditTextarea').value = rawText;
    toggleModal('dictEditModal');
}

function saveDictContent() {
    const updatedText = document.getElementById('dictEditTextarea').value;
    DICT_CONTENTS[currentDictTargetTab] = updatedText;
    
    saveDataToStorage();
    switchDictTab(currentDictTargetTab);
    toggleModal('dictEditModal');
    alert("도감 내용이 성공적으로 수정 및 저장되었습니다!");
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
        <div class="category-draggable-item flex gap-2 items-center bg-main p-2 rounded-lg border border-theme cursor-grab active:cursor-grabbing" draggable="true" data-index="${index}">
            <span class="text-muted font-bold text-xs select-none">☰</span>
            <input type="text" value="${cat}" class="cat-input flex-1 bg-panel border border-theme px-3 py-1.5 rounded-lg text-sm text-main">
            <button type="button" onclick="this.parentElement.remove()" class="bg-red-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold">삭제</button>
        </div>`;
    });

    setupCategoryDragAndDrop();
}

function setupCategoryDragAndDrop() {
    const container = document.getElementById('categoryInputsContainer');
    let draggedItem = null;

    container.querySelectorAll('.category-draggable-item').forEach(item => {
        item.addEventListener('dragstart', function(e) {
            draggedItem = this;
            setTimeout(() => this.classList.add('opacity-40'), 0);
        });

        item.addEventListener('dragend', function(e) {
            this.classList.remove('opacity-40');
            draggedItem = null;
        });

        item.addEventListener('dragover', function(e) {
            e.preventDefault();
        });

        item.addEventListener('drop', function(e) {
            e.preventDefault();
            if (this !== draggedItem) {
                let allItems = Array.from(container.querySelectorAll('.category-draggable-item'));
                let draggedIdx = allItems.indexOf(draggedItem);
                let targetIdx = allItems.indexOf(this);

                if (draggedIdx < targetIdx) {
                    container.insertBefore(draggedItem, this.nextSibling);
                } else {
                    container.insertBefore(draggedItem, this);
                }
            }
        });
    });
}

function addCategoryInput() {
    const container = document.getElementById('categoryInputsContainer');
    const tempDiv = document.createElement('div');
    tempDiv.className = "category-draggable-item flex gap-2 items-center bg-main p-2 rounded-lg border border-theme cursor-grab active:cursor-grabbing";
    tempDiv.setAttribute('draggable', 'true');
    tempDiv.innerHTML = `
        <span class="text-muted font-bold text-xs select-none">☰</span>
        <input type="text" value="새 동맹" class="cat-input flex-1 bg-panel border border-theme px-3 py-1.5 rounded-lg text-sm text-main">
        <button type="button" onclick="this.parentElement.remove()" class="bg-red-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold">삭제</button>
    `;
    container.appendChild(tempDiv);
    setupCategoryDragAndDrop();
}

function saveCategorySettings() {
    const inputs = document.querySelectorAll('.cat-input');
    categoryNames = Array.from(inputs).map(input => input.value.trim()).filter(val => val !== '');
    if (!categoryNames.includes(currentFilter)) {
        currentFilter = categoryNames[0] || '금의위';
    }
    
    saveDataToStorage();
    renderFilterButtons();
    renderTable();
    toggleModal('categoryModal');
    toggleModal('adminControlModal');
    alert("카테고리 순서 및 설정이 성공적으로 저장되었습니다!");
}

function openDataUploadModal() {
    toggleModal('adminControlModal');
    toggleModal('dataUploadModal');
}

function openAdminLogModal() {
    toggleModal('adminControlModal');
    const container = document.getElementById('adminLogContainer');
    const logs = JSON.parse(localStorage.getItem('accessLogs') || '[]');
    let html = logs.length === 0 ? `<p class="text-center text-muted py-4">기록된 접속 로그가 없습니다.</p>` : '';
    logs.forEach((log) => {
        html += `<div class="bg-main p-3 rounded-lg border border-theme flex justify-between items-center text-xs"><div><strong class="text-main">${log.name}</strong> <span class="text-muted">(UID: ${log.uid})</span></div><div class="text-muted">${log.time}</div></div>`;
    });
    container.innerHTML = html;
    toggleModal('adminLogModal');
}

function applyTheme() {
    const theme = document.getElementById('themeSelector').value;
    document.getElementById('app-body').className = `${theme} min-h-screen flex transition-colors duration-300`;
}

function openDeckModal(memberId, deckIndex) {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    document.getElementById('editDeckMemberId').value = memberId;
    document.getElementById('editDeckIndex').value = deckIndex;

    const deck = (member.decks && member.decks[deckIndex]) || { 
        formation: '기형진',
        g1: '', t1_1: '', t1_2: '', t1_3: '',
        g2: '', t2_1: '', t2_2: '', t2_3: '',
        g3: '', t3_1: '', t3_2: '', t3_3: ''
    };

    document.getElementById('editDeckFormation').value = deck.formation || '기형진';
    
    document.getElementById('deckG1').value = deck.g1 || '';
    document.getElementById('deckT1_1').value = deck.t1_1 || '';
    document.getElementById('deckT1_2').value = deck.t1_2 || '';
    document.getElementById('deckT1_3').value = deck.t1_3 || '';

    document.getElementById('deckG2').value = deck.g2 || '';
    document.getElementById('deckT2_1').value = deck.t2_1 || '';
    document.getElementById('deckT2_2').value = deck.t2_2 || '';
    document.getElementById('deckT2_3').value = deck.t2_3 || '';

    document.getElementById('deckG3').value = deck.g3 || '';
    document.getElementById('deckT3_1').value = deck.t3_1 || '';
    document.getElementById('deckT3_2').value = deck.t3_2 || '';
    document.getElementById('deckT3_3').value = deck.t3_3 || '';

    isDeckEditUnlocked = false;
    applyDeckUnlockUIState();
    updateDeckFormationBonusInfo();

    toggleModal('deckEditModal');
}

function showTacticTooltip(tacticName) {
    if (isDeckEditUnlocked) return; 
    if (!tacticName) return;
    
    let cleanName = tacticName.replace(/[-*#]/g, '').replace(/고유전법/g, '').replace(/고유\s*전법/g, '').replace(/[:：]/g, '').trim();
    let nameMatch = cleanName.match(/^([^(]+)/);
    if (nameMatch) cleanName = nameMatch[1].trim();

    let allDictTexts = (DICT_CONTENTS['commonTactic'] || "") + "\n" + (DICT_CONTENTS['generalTactic'] || "");
    let lines = allDictTexts.split('\n');
    
    let foundTitle = cleanName;
    let foundDescLines = [];
    let capturing = false;

    for (let i = 0; i < lines.length; i++) {
        let l = lines[i].trim();
        let plainLine = l.replace(/[-*#]/g, '').replace(/고유전법/g, '').replace(/고유\s*전법/g, '').replace(/[:：]/g, '').trim();
        
        if (l.includes('고유') && l.includes('전법')) {
            let partsMatch = plainLine.match(/^([^(]+)/);
            let tName = partsMatch ? partsMatch[1].trim() : plainLine;
            if (tName.toLowerCase() === cleanName.toLowerCase()) {
                foundTitle = l.replace(/-\s*고유\s*전법[:：]?/, '').trim();
                capturing = true;
                continue;
            }
        } else if (l.startsWith('### ') && l.replace('### ', '').trim().toLowerCase() === cleanName.toLowerCase()) {
            foundTitle = l.replace('### ', '').trim();
            capturing = true;
            continue;
        }

        if (capturing) {
            if (l.startsWith('### ') || (l.includes('고유') && l.includes('전법')) || l.startsWith('## ')) {
                break;
            }
            if (l && l !== '-') {
                foundDescLines.push(l);
            }
        }
    }

    let tooltipElem = document.getElementById('globalTacticTooltip');
    if (!tooltipElem) {
        tooltipElem = document.createElement('div');
        tooltipElem.id = 'globalTacticTooltip';
        tooltipElem.className = 'fixed z-50 bg-panel border border-theme p-3 rounded-lg shadow-xl text-xs text-main max-w-xs pointer-events-none transition-opacity duration-150';
        document.body.appendChild(tooltipElem);
    }

    if (foundDescLines.length > 0) {
        let descHtml = foundDescLines.join('<br>').replace(/\*\*(.*?)\*\*/g, '<strong class="gold-text">$1</strong>');
        tooltipElem.innerHTML = `<strong class="gold-text block mb-1">📜 ${foundTitle}</strong>${descHtml}`;
    } else {
        let parsedTactics = parseMarkdownByTarget(allDictTexts);
        let foundCommon = parsedTactics.find(t => t.title.toLowerCase() === cleanName.toLowerCase());
        if (foundCommon) {
            tooltipElem.innerHTML = `<strong class="gold-text block mb-1">📜 ${foundCommon.title}</strong>${foundCommon.desc}`;
        } else {
            tooltipElem.innerHTML = `<strong class="gold-text block mb-1">📜 ${cleanName}</strong>등록된 전법 효과가 없습니다.`;
        }
    }

    tooltipElem.style.display = 'block';
    document.addEventListener('mousemove', moveTacticTooltip);
}

function moveTacticTooltip(e) {
    let tooltipElem = document.getElementById('globalTacticTooltip');
    if (tooltipElem) {
        tooltipElem.style.left = (e.clientX + 15) + 'px';
        tooltipElem.style.top = (e.clientY + 15) + 'px';
    }
}

function hideTacticTooltip() {
    let tooltipElem = document.getElementById('globalTacticTooltip');
    if (tooltipElem) {
        tooltipElem.style.display = 'none';
    }
    document.removeEventListener('mousemove', moveTacticTooltip);
}

function updateDeckFormationBonusInfo() {
    const selectedFormation = document.getElementById('editDeckFormation').value.trim();
    const formationTextElem = document.getElementById('deckFormationBonusText');
    const synergyTextElem = document.getElementById('deckSynergyBonusText');

    const formationMarkdown = DICT_CONTENTS['formation'] || "";
    let parsedFormations = parseMarkdownByTarget(formationMarkdown);
    let foundForm = parsedFormations.find(f => f.title.replace(/\s+/g, '').includes(selectedFormation.replace(/\s+/g, '')));
    
    if (foundForm) {
        let lines = foundForm.desc.split('<br>');
        let conciseLines = lines.filter(l => l.includes('효과') || l.includes('피격') || l.includes('피해') || l.includes('특성')).slice(0, 2);
        formationTextElem.innerHTML = conciseLines.length > 0 ? conciseLines.join(' | ') : foundForm.desc;
    } else {
        formationTextElem.innerText = `${selectedFormation} 정보 없음`;
    }

    const g1 = document.getElementById('deckG1').value.split('(')[0].trim();
    const g2 = document.getElementById('deckG2').value.split('(')[0].trim();
    const g3 = document.getElementById('deckG3').value.split('(')[0].trim();
    const activeGenerals = [g1, g2, g3].filter(name => name !== '');

    const synergyMarkdown = DICT_CONTENTS['synergy'] || "";
    let parsedSynergies = parseMarkdownByTarget(synergyMarkdown);
    let activeSynergies = [];

    parsedSynergies.forEach(syn => {
        let targetLine = syn.desc.split('<br>').find(l => l.includes('대상') || l.includes('구성원')) || syn.desc;
        let effectLine = syn.desc.split('<br>').find(l => l.includes('효과')) || "효과 미등록";
        let cleanEffect = effectLine.replace(/<[^>]*>?/gm, '').replace('인연 효과:', '').trim();

        let requiredGenerals = ['유비', '관우', '장비', '조운', '마초', '황충', '안량', '문추', '장합'].filter(g => targetLine.includes(g));
        let matchedCount = 0;

        activeGenerals.forEach(gen => {
            if (targetLine.includes(gen)) {
                matchedCount++;
            }
        });

        let minRequired = requiredGenerals.length >= 3 ? 3 : 2; 
        if (targetLine.includes('유비') && targetLine.includes('관우') && targetLine.includes('장비')) {
            minRequired = 3;
        }

        if (matchedCount >= minRequired) {
            activeSynergies.push(`⭐ ${syn.title} - ${cleanEffect}`);
        }
    });

    if (activeSynergies.length > 0) {
        synergyTextElem.innerHTML = activeSynergies.join(' | ');
    } else {
        synergyTextElem.innerText = activeGenerals.length > 0 ? "현재 조합에서 활성화된 인연 보너스가 없습니다." : "장수를 선택하면 인연 보너스가 자동으로 계산됩니다.";
    }
}

function toggleDeckEditUnlock() {
    isDeckEditUnlocked = !isDeckEditUnlocked;
    applyDeckUnlockUIState();
}

function applyDeckUnlockUIState() {
    const statusLabel = document.getElementById('deckEditLockStatus');
    const unlockBtn = document.getElementById('deckUnlockBtn');
    const formationSelect = document.getElementById('editDeckFormation');

    const generalInputs = ['deckG1', 'deckG2', 'deckG3'];
    const tacticInputs = [
        'deckT1_1', 'deckT1_2', 'deckT1_3',
        'deckT2_1', 'deckT2_2', 'deckT2_3',
        'deckT3_1', 'deckT3_2', 'deckT3_3'
    ];

    if (isDeckEditUnlocked) {
        statusLabel.className = "text-xs bg-emerald-900/50 text-emerald-300 px-3 py-1 rounded border border-emerald-700";
        statusLabel.innerText = "🔓 수정 가능 상태";
        unlockBtn.innerText = "🔒 수정완료";
        unlockBtn.className = "bg-red-700 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow transition";
        formationSelect.disabled = false;

        [...generalInputs, ...tacticInputs].forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.removeAttribute('readonly');
                el.onmouseenter = null;
                el.onmouseleave = null;
            }
        });

    } else {
        statusLabel.className = "text-xs bg-red-900/50 text-red-300 px-3 py-1 rounded border border-red-700";
        statusLabel.innerText = "🔒 잠김 상태 (수정 버튼을 누르세요)";
        unlockBtn.innerText = "🔓 수정";
        unlockBtn.className = "bg-amber-600 hover:bg-amber-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow transition";
        formationSelect.disabled = true;

        generalInputs.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.setAttribute('readonly', true);
                el.onmouseenter = null;
                el.onmouseleave = null;
            }
        });

        tacticInputs.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.setAttribute('readonly', true);
                el.onmouseenter = function() { showTacticTooltip(this.value); };
                el.onmouseleave = function() { hideTacticTooltip(); };
            }
        });
    }
}

function handleDeckInputSearch(slotNum, tacticType) {
    if (!isDeckEditUnlocked) return;

    let inputId = '';
    let listId = '';

    if (tacticType === 'g') {
        inputId = `deckG${slotNum}`;
        listId = `autocomplete-list-g${slotNum}`;
    } else {
        inputId = `deckT${slotNum}_${tacticType.slice(-1)}`;
        listId = `autocomplete-list-t${slotNum}_${tacticType.slice(-1)}`;
    }

    const inputElem = document.getElementById(inputId);
    const listContainer = document.getElementById(listId);
    if (!inputElem || !listContainer) return;

    const inputVal = inputElem.value.trim().toLowerCase();

    if (!inputVal) {
        listContainer.classList.add('hidden');
        return;
    }

    let sourceList = [];
    if (tacticType === 'g') {
        const rawText = DICT_CONTENTS['generalTactic'] || "";
        let lines = rawText.split('\n');
        lines.forEach(line => {
            let trimmed = line.trim();
            if (trimmed.startsWith('### ')) {
                sourceList.push(trimmed.replace('### ', '').trim());
            }
        });
    } else {
        const rawText = DICT_CONTENTS['commonTactic'] || "";
        let parsed = parseMarkdownByTarget(rawText);
        parsed.forEach(p => sourceList.push(p.title));
    }

    const matched = sourceList.filter(item => item.toLowerCase().includes(inputVal));
    if (matched.length === 0) {
        listContainer.classList.add('hidden');
        return;
    }

    let html = '';
    matched.forEach(name => {
        html += `<div onclick="selectDeckAutocompleteValue(${slotNum}, '${tacticType}', '${name}')" class="p-2 hover:bg-hover cursor-pointer text-xs text-main">${name}</div>`;
    });

    listContainer.innerHTML = html;
    listContainer.classList.remove('hidden');
}

function selectDeckAutocompleteValue(slotNum, tacticType, name) {
    if (tacticType === 'g') {
        document.getElementById(`deckG${slotNum}`).value = name;
        document.getElementById(`autocomplete-list-g${slotNum}`).classList.add('hidden');

        const generalText = DICT_CONTENTS['generalTactic'] || "";
        let lines = generalText.split('\n');
        let uniqueTactic = "고유전법 미등록";
        
        let foundGeneral = false;
        for (let i = 0; i < lines.length; i++) {
            let l = lines[i].trim();
            if (l.startsWith('### ') && l.replace('### ', '').trim() === name) {
                foundGeneral = true;
                continue;
            }
            if (foundGeneral) {
                if (l.startsWith('### ')) break;
                if (l.includes('고유') && l.includes('전법')) {
                    let parts = l.replace(/[-*#]/g, '').replace(/고유전법/g, '').replace(/고유\s*전법/g, '').replace(/[:：]/g, '').trim();
                    let match = parts.match(/^([^(]+)/);
                    if (match && match[1]) {
                        uniqueTactic = match[1].trim();
                    } else {
                        uniqueTactic = parts;
                    }
                    break;
                }
            }
        }
        document.getElementById(`deckT${slotNum}_1`).value = uniqueTactic;

    } else {
        let cleanNameMatch = name.match(/^([^(]+)/);
        let cleanTacticName = cleanNameMatch ? cleanNameMatch[1].trim() : name;

        let targetIndex = tacticType.slice(-1);
        let targetInputId = `deckT${slotNum}_${targetIndex}`;
        let targetListId = `autocomplete-list-t${slotNum}_${targetIndex}`;
        
        const inputElem = document.getElementById(targetInputId);
        const listElem = document.getElementById(targetListId);

        if (inputElem) inputElem.value = cleanTacticName;
        if (listElem) listElem.classList.add('hidden');
    }

    updateDeckFormationBonusInfo();
}

function saveDeckData() {
    const memberId = Number(document.getElementById('editDeckMemberId').value);
    const deckIndex = Number(document.getElementById('editDeckIndex').value);

    const formation = document.getElementById('editDeckFormation').value;
    
    const g1 = document.getElementById('deckG1').value.trim();
    const t1_1 = document.getElementById('deckT1_1').value.trim();
    const t1_2 = document.getElementById('deckT1_2').value.trim();
    const t1_3 = document.getElementById('deckT1_3').value.trim();

    const g2 = document.getElementById('deckG2').value.trim();
    const t2_1 = document.getElementById('deckT2_1').value.trim();
    const t2_2 = document.getElementById('deckT2_2').value.trim();
    const t2_3 = document.getElementById('deckT2_3').value.trim();

    const g3 = document.getElementById('deckG3').value.trim();
    const t3_1 = document.getElementById('deckT3_1').value.trim();
    const t3_2 = document.getElementById('deckT3_2').value.trim();
    const t3_3 = document.getElementById('deckT3_3').value.trim();

    const member = members.find(m => m.id === memberId);
    if (member) {
        if (!member.decks) member.decks = [];
        member.decks[deckIndex] = {
            formation,
            g1, t1_1, t1_2, t1_3,
            g2, t2_1, t2_2, t2_3,
            g3, t3_1, t3_2, t3_3
        };
        
        saveDataToStorage();
        renderTable();
        toggleModal('deckEditModal');
        alert("조합 공유 덱 편성이 성공적으로 저장되었습니다!");
    }
}

function clearDeckData() {
    const memberId = Number(document.getElementById('editDeckMemberId').value);
    const deckIndex = Number(document.getElementById('editDeckIndex').value);

    const member = members.find(m => m.id === memberId);
    if (member && member.decks) {
        member.decks[deckIndex] = null;
        saveDataToStorage();
        renderTable();
        toggleModal('deckEditModal');
        alert("덱이 초기화되었습니다.");
    }
}

let parsedDictItems = [];

function switchDictTab(tabKey) {
    currentDictTargetTab = tabKey;
    ['formation', 'synergy', 'generalTactic', 'commonTactic'].forEach(key => {
        const btn = document.getElementById(`tabBtn-${key}`);
        if(btn) {
            if(key === tabKey) {
                btn.className = "px-3 py-1.5 rounded text-xs font-bold bg-yellow-600 text-white transition";
            } else {
                btn.className = "px-3 py-1.5 rounded text-xs font-bold bg-main text-muted hover:text-main transition";
            }
        }
    });

    const rawText = DICT_CONTENTS[tabKey] || "";
    parsedDictItems = parseMarkdownByTarget(rawText);
    renderDictList(parsedDictItems);

    if (parsedDictItems.length > 0) {
        selectDictItem(0);
    } else {
        document.getElementById('dictDetailTitle').innerText = "내용 없음";
        document.getElementById('dictDetailDesc').innerText = "등록된 데이터가 없습니다.";
    }

    updateDictAdminUI();
}

function parseMarkdownByTarget(text) {
    let lines = text.split('\n');
    let items = [];
    let currentTitle = "";
    let currentDescLines = [];

    lines.forEach(line => {
        let trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
            if (currentTitle && currentDescLines.length > 0) {
                items.push({ title: currentTitle, desc: currentDescLines.join('<br>') });
                currentDescLines = [];
            }
            currentTitle = trimmed.replace('### ', '').replace(/\*\*/g, '').replace(/\[.*?\]/g, '').trim();
        } else if (trimmed && !trimmed.startsWith('#')) {
            let cleanLine = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="gold-text">$1</strong>');
            if (currentTitle) {
                currentDescLines.push(cleanLine);
            }
        }
    });

    if (currentTitle && currentDescLines.length > 0) {
        items.push({ title: currentTitle, desc: currentDescLines.join('<br>') });
    }

    if (items.length === 0) {
        items.push({ title: "안내", desc: text.replace(/\n/g, '<br>') });
    }

    return items;
}

function renderDictList(items) {
    const container = document.getElementById('dictListContainer');
    if(!container) return;

    let labelName = "항목";
    if (currentDictTargetTab === 'formation') labelName = "진형 명";
    else if (currentDictTargetTab === 'synergy') labelName = "인연 이름";
    else if (currentDictTargetTab === 'generalTactic') labelName = "장수 명";
    else if (currentDictTargetTab === 'commonTactic') labelName = "전법 명";

    let html = `<div class="px-3 py-1.5 text-[11px] font-bold text-muted border-b border-theme mb-1">📌 ${labelName} 목록</div>`;
    
    items.forEach((item, index) => {
        html += `
        <div onclick="selectDictItem(${index})" id="dict-item-${index}" class="dict-list-btn p-2.5 rounded-lg cursor-pointer transition text-xs font-bold text-main hover:bg-hover bg-main border border-theme flex items-center justify-between" data-index="${index}">
            <span>${item.title}</span>
            <span class="text-muted text-[10px]">▶</span>
        </div>`;
    });

    container.innerHTML = html;
}

function selectDictItem(index) {
    const item = parsedDictItems[index];
    if(!item) return;

    document.querySelectorAll('.dict-list-btn').forEach((el) => {
        const itemIdx = el.getAttribute('data-index');
        if (itemIdx !== null) {
            if (Number(itemIdx) === index) {
                el.className = "dict-list-btn p-2.5 rounded-lg cursor-pointer transition text-xs font-bold text-white bg-yellow-600 border border-yellow-500 flex items-center justify-between shadow";
            } else {
                el.className = "dict-list-btn p-2.5 rounded-lg cursor-pointer transition text-xs font-bold text-main hover:bg-hover bg-main border border-theme flex items-center justify-between";
            }
        }
    });

    document.getElementById('dictDetailTitle').innerText = item.title;
    document.getElementById('dictDetailDesc').innerHTML = item.desc;
}

function filterDictList() {
    const keyword = document.getElementById('dictSearchInput').value.toLowerCase().trim();
    const filtered = parsedDictItems.filter(item => item.title.toLowerCase().includes(keyword) || item.desc.toLowerCase().includes(keyword));
    
    const container = document.getElementById('dictListContainer');
    if(!container) return;

    let labelName = "항목";
    if (currentDictTargetTab === 'formation') labelName = "진형 명";
    else if (currentDictTargetTab === 'synergy') labelName = "인연 이름";
    else if (currentDictTargetTab === 'generalTactic') labelName = "장수 명";
    else if (currentDictTargetTab === 'commonTactic') labelName = "전법 명";

    let html = `<div class="px-3 py-1.5 text-[11px] font-bold text-muted border-b border-theme mb-1">📌 ${labelName} 검색 결과</div>`;
    
    filtered.forEach((item) => {
        const originalIndex = parsedDictItems.findIndex(orig => orig.title === item.title);
        html += `
        <div onclick="selectDictItem(${originalIndex})" id="dict-item-${originalIndex}" class="dict-list-btn p-2.5 rounded-lg cursor-pointer transition text-xs font-bold text-main hover:bg-hover bg-main border border-theme flex items-center justify-between" data-index="${originalIndex}">
            <span>${item.title}</span>
            <span class="text-muted text-[10px]">▶</span>
        </div>`;
    });
    container.innerHTML = html;

    if (filtered.length > 0) {
        const firstOriginalIndex = parsedDictItems.findIndex(orig => orig.title === filtered[0].title);
        selectDictItem(firstOriginalIndex);
    } else {
        document.getElementById('dictDetailTitle').innerText = "검색 결과 없음";
        document.getElementById('dictDetailDesc').innerText = "일치하는 항목이 없습니다.";
    }
}

function renderFilterButtons() {
    const container = document.getElementById('filter-buttons');
    const sidebarContainer = document.getElementById('sidebar-filter-buttons');
    
    // 전체 보기 버튼은 생성하지 않음 (요청 반영)
    let html = '';
    let sidebarHtml = '';
    
    categoryNames.forEach((cat, index) => {
        const isSelected = currentFilter === cat;
        const btnClass = isSelected ? 'bg-yellow-600 text-white shadow' : 'bg-panel hover:bg-hover border border-theme text-muted';
        const sidebarClass = isSelected ? 'bg-hover text-main font-bold' : 'text-muted hover:bg-hover hover:text-main';
        
        html += `<button onclick="filterTable('${cat}')" class="px-4 py-2 rounded-lg text-xs font-bold transition ${btnClass}">${cat}</button>`;
        sidebarHtml += `<a href="#" onclick="filterTable('${cat}'); return false;" class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${sidebarClass} transition"><span>${index + 1}.</span> ${cat}</a>`;
    });
    
    if(container) container.innerHTML = html;
    if(sidebarContainer) sidebarContainer.innerHTML = sidebarHtml;
}

function handleSearch() { 
    searchQuery = document.getElementById('searchInput').value.toLowerCase().trim(); 
    currentPage = 1; 
    renderTable(); 
}

function filterTable(filter) { 
    currentFilter = filter; 
    currentPage = 1; 
    renderFilterButtons(); 
    renderTable(); 
}

function changePageSize() { 
    currentPage = 1; 
    renderTable(); 
}

function changePage(page) {
    currentPage = page;
    renderTable();
}

function toggleSelectAll(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => { cb.checked = selectAllCheckbox.checked; });
}

function deleteSelectedMembers() {
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        return alert("삭제할 대원을 선택해주세요.");
    }
    if (confirm(`선택한 ${selectedCheckboxes.length}명의 대원을 정말 삭제하시겠습니까?`)) {
        const idsToDelete = Array.from(selectedCheckboxes).map(cb => Number(cb.getAttribute('data-id')));
        members = members.filter(m => !idsToDelete.includes(m.id));
        saveDataToStorage();
        renderTable();
        alert("선택된 대원이 삭제되었습니다.");
    }
}

function renderTable() {
    const tbody = document.getElementById('member-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const effectiveIsAdmin = isAdminMode && !isUserPreview;

    let filtered = members.filter(member => {
        const matchAlliance = (member.alliance === currentFilter);
        const matchSearch = member.name.toLowerCase().includes(searchQuery);
        return matchAlliance && matchSearch;
    });

    document.getElementById('total-member-count').innerText = members.length;

    const pageSizeVal = document.getElementById('pageSizeSelect').value;
    let displayedList = filtered;
    let totalPages = 1;

    if (pageSizeVal !== 'all') {
        const limit = parseInt(pageSizeVal, 10);
        totalPages = Math.ceil(filtered.length / limit) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        
        const startIndex = (currentPage - 1) * limit;
        displayedList = filtered.slice(startIndex, startIndex + limit);
        
        document.getElementById('filtered-member-count').innerText = ` (표시: ${displayedList.length}명 / 총 검색 결과: ${filtered.length}명)`;
    } else {
        document.getElementById('filtered-member-count').innerText = filtered.length !== members.length ? ` (검색 결과: ${filtered.length}명)` : '';
    }

    const paginationContainer = document.getElementById('paginationContainer');
    if (paginationContainer) {
        if (pageSizeVal !== 'all' && totalPages > 1) {
            let pagHtml = `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled class="px-3 py-1 bg-panel border border-theme rounded text-xs text-muted opacity-50 cursor-not-allowed"' : 'class="px-3 py-1 bg-panel border border-theme rounded text-xs font-bold hover:bg-hover text-main"'}>◀ 이전</button>`;
            
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            if (endPage - startPage < 4) {
                startPage = Math.max(1, endPage - 4);
            }

            for (let p = startPage; p <= endPage; p++) {
                if (p === currentPage) {
                    pagHtml += `<button class="px-3 py-1 bg-yellow-600 text-white rounded text-xs font-bold shadow">${p}</button>`;
                } else {
                    pagHtml += `<button onclick="changePage(${p})" class="px-3 py-1 bg-panel border border-theme rounded text-xs font-bold hover:bg-hover text-main">${p}</button>`;
                }
            }

            pagHtml += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled class="px-3 py-1 bg-panel border border-theme rounded text-xs text-muted opacity-50 cursor-not-allowed"' : 'class="px-3 py-1 bg-panel border border-theme rounded text-xs font-bold hover:bg-hover text-main"'}>다음 ▶</button>`;
            paginationContainer.innerHTML = pagHtml;
            paginationContainer.classList.remove('hidden');
        } else {
            paginationContainer.innerHTML = '';
            paginationContainer.classList.add('hidden');
        }
    }

    if(displayedList.length === 0) {
        const colSpan = effectiveIsAdmin ? 12 : 11;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="p-6 text-center text-muted">등록된 인원이 없습니다.</td></tr>`;
        return;
    }

    displayedList.forEach((member, index) => {
        const tr = document.createElement('tr');
        tr.className = `border-b border-theme transition bg-hover`;
        
        let allianceOptions = '';
        categoryNames.forEach(cat => { allianceOptions += `<option value="${cat}" ${member.alliance === cat ? 'selected' : ''}>${cat}</option>`; });

        let jobOptions = `<option value="">(공란)</option>`;
        AVAILABLE_JOBS.forEach(j => { jobOptions += `<option value="${j}" ${member.job === j ? 'selected' : ''}>${j}</option>`; });

        let html = '';
        if(effectiveIsAdmin) {
            html += `<td class="p-4 border-r border-theme text-center"><input type="checkbox" class="row-checkbox cursor-pointer" data-id="${member.id}"></td>`;
        }

        const absoluteIndex = (pageSizeVal !== 'all') ? ((currentPage - 1) * parseInt(pageSizeVal, 10)) + index + 1 : index + 1;
        html += `<td class="p-4 border-r border-theme text-center text-muted font-bold">${absoluteIndex}</td>`;
        
        if (effectiveIsAdmin) {
            html += `<td class="p-4 border-r border-theme text-muted font-mono select-all">${member.uid}</td>`;
        }

        html += `
            <td class="p-4 border-r border-theme font-bold">${effectiveIsAdmin ? `<input type="text" value="${member.name}" onchange="updateMemberField(${member.id}, 'name', this.value)" class="w-28 text-xs font-bold bg-main border border-theme px-1 rounded">` : member.name}</td>
            <td class="p-4 border-r border-theme text-muted">${effectiveIsAdmin ? `<select onchange="updateMemberField(${member.id}, 'job', this.value)" class="text-xs bg-main border border-theme p-1 rounded">${jobOptions}</select>` : (member.job || '-')}</td>
            <td class="p-4 border-r border-theme">${effectiveIsAdmin ? `<select onchange="updateMemberField(${member.id}, 'alliance', this.value)" class="text-xs bg-main border border-theme p-1 rounded">${allianceOptions}</select>` : `<span class="px-2.5 py-1 rounded-lg text-xs bg-panel border border-theme">${member.alliance}</span>`}</td>
        `;

        for(let i=0; i<5; i++) {
            const deck = member.decks && member.decks[i];
            if (deck && (deck.g1 || deck.g2 || deck.g3)) {
                html += `<td class="p-3 border-r border-theme"><div onclick="openDeckModal(${member.id},${i})" class="deck-cell rounded-lg p-2 text-center cursor-pointer hover:bg-panel transition"><div class="text-xs font-bold gold-text mb-1">${deck.g1 || '-'} / ${deck.g2 || '-'} / ${deck.g3 || '-'}</div><div class="text-[10px] text-muted">수정</div></div></td>`;
            } else {
                html += `<td class="p-3 border-r border-theme"><div onclick="openDeckModal(${member.id},${i})" class="deck-cell rounded-lg p-2 text-center text-muted cursor-pointer hover:bg-panel transition" style="border-style: dashed;">+ 설정</div></td>`;
            }
        }

        if(effectiveIsAdmin) {
            html += `<td class="p-3 text-center"><button onclick="deleteMember(${member.id})" class="bg-red-800 text-white px-2.5 py-1 rounded-lg text-xs font-bold">삭제</button></td>`;
        }

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
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

            let uploadedUids = new Set();
            let seenUids = new Set();
            let seenNames = new Set();
            let duplicates = [];
            let excelRowsData = [];

            jsonRows.forEach((row) => {
                let uid = '';
                let name = '';
                let rawJob = '';
                let rawAlliance = '';
                let rawDecks = '';

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
                    } else if (cleanKey.includes('덱') || cleanKey.includes('조합') || cleanKey.includes('부대')) {
                        if (val) rawDecks = val;
                    }
                }

                const keys = Object.keys(row);
                if (!uid && keys.length > 0) uid = String(row[keys[0]] || '').trim();
                if (!name && keys.length > 1) name = String(row[keys[1]] || '').trim();
                if (!rawJob && keys.length > 2) rawJob = String(row[keys[2]] || '').trim();
                if (!rawAlliance && keys.length > 3) rawAlliance = String(row[keys[3]] || '').trim();
                if (!rawDecks && keys.length > 4) rawDecks = String(row[keys[4]] || '').trim();

                if (!name || name.includes('닉네임')) return;
                if (!uid) uid = String(Math.floor(1000 + Math.random() * 9000));

                if (seenUids.has(uid) || seenNames.has(name)) {
                    duplicates.push({ uid, name });
                } else {
                    seenUids.add(uid);
                    seenNames.add(name);
                }

                let job = AVAILABLE_JOBS.includes(rawJob) ? rawJob : "";
                
                // ✨ 카테고리 자동 분류 매핑 로직
                let alliance = "재야";
                if (rawAlliance.includes("금의위")) {
                    alliance = "금의위";
                } else if (rawAlliance.includes("낙원")) {
                    alliance = "낙원(동맹)";
                } else if (rawAlliance.includes("낙화")) {
                    alliance = "낙화";
                } else if (rawAlliance.includes("고구려")) {
                    alliance = "고구려";
                } else {
                    let matchedCat = categoryNames.find(cat => rawAlliance === cat || rawAlliance.includes(cat) || cat.includes(rawAlliance));
                    if (matchedCat) alliance = matchedCat;
                }

                uploadedUids.add(String(uid));
                excelRowsData.push({ uid, name, job, alliance, rawDecks });
            });

            // 1. 업로드된 엑셀 데이터를 기존 members와 대조하여 갱신 또는 추가 (기존 덱은 유지)
            excelRowsData.forEach(row => {
                let existingMember = members.find(m => String(m.uid) === String(row.uid));
                if (existingMember) {
                    existingMember.name = row.name;
                    existingMember.job = row.job;
                    existingMember.alliance = row.alliance; // 소속이 바뀌었으면 자동 반영
                } else {
                    let decks = [];
                    if (row.rawDecks && row.rawDecks !== row.alliance && !categoryNames.includes(row.rawDecks)) {
                        decks = [{ formation: '기형진', g1: row.rawDecks, t1_1: '', t1_2: '', t1_3: '', g2: '', t2_1: '', t2_2: '', t2_3: '', g3: '', t3_1: '', t3_2: '', t3_3: '' }];
                    }
                    members.push({ 
                        id: Date.now() + Math.random(), 
                        uid: row.uid, 
                        name: row.name, 
                        job: row.job, 
                        alliance: row.alliance, 
                        decks 
                    });
                }
            });

            // 2. ✨ 새 엑셀 명단에서 빠진(누락된) 기존 인원은 자동으로 '재야' 소속으로 이동
            members.forEach(member => {
                if (!uploadedUids.has(String(member.uid))) {
                    member.alliance = "재야";
                }
            });

            saveDataToStorage();
            renderFilterButtons();
            renderTable();

            if (duplicates.length > 0) {
                let dupContainer = document.getElementById('duplicateListContainer');
                let dupHtml = `<p class="font-bold text-amber-400 mb-2">총 ${duplicates.length}건의 중복 데이터가 감지되었습니다:</p>`;
                duplicates.forEach(d => {
                    dupHtml += `<div class="bg-panel p-2 rounded border border-theme flex justify-between"><span>닉네임: <strong>${d.name}</strong></span><span class="text-muted">UID: ${d.uid}</span></div>`;
                });
                dupContainer.innerHTML = dupHtml;
                toggleModal('duplicateAlertModal');
            } else {
                alert("엑셀 데이터가 최신화되었습니다! (빠진 인원은 '재야' 소속으로 이동되었으며, 기존 대원들의 덱은 유지됩니다)");
            }
        } catch (err) {
            alert("엑셀 오류: " + err.message);
        }
        event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}

function handleDictFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        DICT_CONTENTS[currentDictTargetTab] = content;
        saveDataToStorage();
        switchDictTab(currentDictTargetTab);
        alert("도감 데이터가 성공적으로 업데이트되었습니다!");
        event.target.value = '';
    };
    reader.readAsText(file, "utf-8");
}

function openSettingsModal() { toggleModal('settingsModal'); }
function toggleModal(id) { document.getElementById(id).classList.toggle('hidden'); }
function addNewMember() {
    members.push({ id: Date.now(), uid: "00000000", name: "신규장수", job: "", alliance: currentFilter, decks: [] });
    saveDataToStorage();
    renderTable();
}
function deleteMember(id) {
    if(confirm("정말 삭제하시겠습니까?")) {
        members = members.filter(m => m.id !== id);
        saveDataToStorage();
        renderTable();
    }
}
function updateMemberField(id, field, val) {
    const m = members.find(x => x.id === id);
    if(m) { m[field] = val; saveDataToStorage(); }
}
function downloadShareExcel() {
    let exportData = members.map((m, idx) => ({
        "No": idx + 1,
        "UID": m.uid,
        "닉네임": m.name,
        "직업": m.job || "",
        "소속": m.alliance || "",
        "보유덱1": m.decks && m.decks[0] ? (m.decks[0].g1 || "") : "",
        "보유덱2": m.decks && m.decks[1] ? (m.decks[1].g1 || "") : "",
        "보유덱3": m.decks && m.decks[2] ? (m.decks[2].g1 || "") : "",
        "보유덱4": m.decks && m.decks[3] ? (m.decks[3].g1 || "") : "",
        "보유덱5": m.decks && m.decks[4] ? (m.decks[4].g1 || "") : ""
    }));

    let worksheet = XLSX.utils.json_to_sheet(exportData);
    let workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "연맹원현황");
    XLSX.writeFile(workbook, "금의위_연맹원_현황.xlsx");
}

// 최초 로드 시 데이터 불러오기 실행
loadDataFromFirebase();
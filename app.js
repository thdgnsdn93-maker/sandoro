let isAdminMode = false;
let isUserPreview = false;
let currentPage = 1;
const ADMIN_PASSWORD = "0731";
const CREATOR_UID = "20029059326";

let categoryNames = ["금의위", "낙원", "낙화", "고구려", "재야"];
let currentFilter = '금의위';
let searchQuery = '';
let currentDictTargetTab = 'formation';
let currentActiveView = 'dashboard';
let activeDictUploadKey = 'formation';

let favorites = JSON.parse(localStorage.getItem('userFavorites') || '[]');
let accessLogs = JSON.parse(localStorage.getItem('accessLogs') || '[]');
const AVAILABLE_JOBS = ["진군", "신행", "기좌", "병참", "천공", "청낭", "금의위"];
let members = [];
let memberWeekData = JSON.parse(localStorage.getItem('memberWeekData') || '[]');

const GENERAL_DATABASE = {
    "조조": "난세의 간웅 (효과: 아군 전체 피해 감소 및 통솔 증가)",
    "관우": "위진화하 (효과: 적 단일 대상에게 강력한 물리 피해 및 무장 해제)",
    "제갈량": "신산귀모 (효과: 적의 책략 피해를 무효화하고 지혜 기반 반격)",
    "조운": "단기참장 (효과: 통상 공격 후 추가 피해 및 제어 효과 면역)",
    "초선": "폐월 (효과: 적군 주장을 현혹시켜 아군을 공격하게 만듦)",
    "장비": "연인환성 (효과: 전투 시작 후 적 전체에 광역 물리 피해)",
    "여포": "천하무쌍 (효과: 적군을 도발하여 결투를 벌이고 공격력 대폭 상승)",
    "주유": "동만지화 (효과: 적 전체에 지속적인 화계 피해 부여)"
};

const COMMON_TACTICS_LIST = [
    "팔문금사陣 (효과: 전투 초반 아군 피해 감소)",
    "백의교위 (효과: 선공 효과 및 회피율 증가)",
    "파진함락 (효과: 적 방어력 무시 물리 피해)",
    "태평요술 (효과: 책략 피해 극대화 및 발동 확률 증가)"
];

// 도감 데이터 (formation 목록이 진형 선택 Selectbox에 동적으로 연동됨)
let DICT_DETAIL_DATA = {
    formation: [
        { name: "기략진", type: "진형 / 상성", effect: "책략 피해 및 속도 보너스 부여" },
        { name: "학익진", type: "진형 / 상성", effect: "원거리 공격력 및 사거리 증가" },
        { name: "어룡진", type: "진형 / 상성", effect: "기동력 및 돌격 피해 증가" },
        { name: "봉시진", type: "진형 / 상성", effect: "전방 돌파력 및 물리 공격력 극대화" },
        { name: "안행진", type: "진형 / 상성", effect: "방어 및 지속 전투력 강화" },
        { name: "언월진", type: "진형 / 상성", effect: "단일 대상 치명타 확률 증가" }
    ],
    synergy: [
        { name: "오호대장군", type: "인연 / 상시", effect: "무력 및 통솔력 +15 추가 상승" },
        { name: "오자량장", type: "인연 / 상시", effect: "속도 및 회피율 증가 버프" },
        { name: "삼형제", type: "인연 / 전투시작", effect: "전투 시작 시 아군 전체 보호막 생성" }
    ],
    generalTactic: [
        { name: "관우 (위진화하)", type: "고유전법 / 발동률 45%", effect: "적 단일 대상에게 강력한 물리 피해 및 무장 해제 효과 부여" },
        { name: "조조 (난세의 간웅)", type: "고유전법 / 지휘", effect: "아군 전체 피해 감소 및 통솔력 증가" },
        { name: "제갈량 (신산귀모)", type: "고유전법 / 액티브", effect: "적의 책략 피해를 무효화하고 지혜 기반 반격" },
        { name: "여포 (천하무쌍)", type: "고유전법 / 돌격", effect: "적군을 도발하여 결투를 벌이고 공격력 대폭 상승" }
    ],
    commonTactic: [
        { name: "팔문금사陣", type: "공용전법 / 지휘", effect: "전투 초반 아군 피해 감소" },
        { name: "백의교위", type: "공용전법 / 패시브", effect: "선공 효과 및 회피율 증가" },
        { name: "파진함락", type: "공용전법 / 액티브", effect: "적 방어력을 무시하는 물리 피해 부여" }
    ]
};

function getDisplayCategoryName(cat) {
    if (cat === "낙원(동맹)") return "낙원";
    return cat;
}

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

// 📚 도감 탭 전환 및 좌측 리스트 렌더링
function switchDictTab(tabKey) {
    currentDictTargetTab = tabKey;
    ['formation', 'synergy', 'generalTactic', 'commonTactic'].forEach(t => {
        const btn = document.getElementById(`dictTab-${t}`);
        if (btn) btn.className = `px-3 py-1.5 rounded-lg text-xs font-bold ${t === tabKey ? 'bg-amber-600 text-white shadow' : 'bg-main text-muted hover:bg-hover'}`;
    });

    renderDictSubList(tabKey);
}

function renderDictSubList(tabKey) {
    const listContainer = document.getElementById('dictSubItemList');
    const items = DICT_DETAIL_DATA[tabKey] || [];

    if (items.length === 0) {
        listContainer.innerHTML = `<p class="text-muted text-xs p-2">항목이 없습니다.</p>`;
        document.getElementById('dictContentArea').innerHTML = `<p class="text-muted">등록된 상세 내용이 없습니다.</p>`;
        return;
    }

    let html = '';
    items.forEach((item, idx) => {
        const activeClass = idx === 0 ? 'bg-amber-600/20 gold-text border-amber-500/50 font-bold' : 'bg-panel text-main hover:bg-hover border-theme';
        html += `<button onclick="selectDictItem('${tabKey}', ${idx}, this)" class="w-full text-left px-3 py-2.5 rounded-lg text-xs transition border ${activeClass}">${item.name}</button>`;
    });
    listContainer.innerHTML = html;

    if (items.length > 0) showDictDetail(items[0]);
}

function selectDictItem(tabKey, index, btnElement) {
    const items = DICT_DETAIL_DATA[tabKey] || [];
    const item = items[index];
    if (!item) return;

    const parent = document.getElementById('dictSubItemList');
    Array.from(parent.children).forEach(child => {
        child.className = "w-full text-left px-3 py-2.5 rounded-lg text-xs transition border bg-panel text-main hover:bg-hover border-theme";
    });
    btnElement.className = "w-full text-left px-3 py-2.5 rounded-lg text-xs transition border bg-amber-600/20 gold-text border-amber-500/50 font-bold";

    showDictDetail(item);
}

function showDictDetail(item) {
    const contentArea = document.getElementById('dictContentArea');
    contentArea.innerHTML = `
        <div class="space-y-3 bg-panel p-5 rounded-xl border border-theme shadow-inner">
            <div class="border-b border-theme pb-2">
                <span class="text-muted text-[11px] block">이름</span>
                <h3 class="text-base font-extrabold gold-text">${item.name}</h3>
            </div>
            <div class="border-b border-theme pb-2">
                <span class="text-muted text-[11px] block">특성 / 발동률</span>
                <p class="text-sm font-bold text-main mt-0.5">${item.type}</p>
            </div>
            <div>
                <span class="text-muted text-[11px] block">상세효과</span>
                <p class="text-sm text-main mt-1 leading-relaxed">${item.effect}</p>
            </div>
        </div>
    `;
}

// ⚔️ 덱 설정 모달 열기 및 진형 목록 도감 연동
let currentEditingMemberId = null;
let currentEditingDeckIdx = 0;

function populateFormationSelect(selectedFormation) {
    const selectEl = document.getElementById('deckFormationSelect');
    if (!selectEl) return;
    
    const formations = DICT_DETAIL_DATA.formation || [];
    selectEl.innerHTML = formations.map(f => `<option value="${f.name}" ${f.name === selectedFormation ? 'selected' : ''}>${f.name}</option>`).join('');
}

function openDeckModal(memberId, deckIdx) {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    currentEditingMemberId = memberId;
    currentEditingDeckIdx = deckIdx;

    const titleEl = document.getElementById('deckModalTitle');
    if (titleEl) titleEl.innerText = `⚔️ ${member.name} - 보유덱 ${deckIdx + 1} 덱 수정`;

    const deck = (member.decks && member.decks[deckIdx]) || {};
    
    // 도감에서 진형 목록 동적 로드 후 선택값 반영
    populateFormationSelect(deck.formation || '기략진');

    document.getElementById('deckGen1').value = deck.g1 || '';
    document.getElementById('deckGen2').value = deck.g2 || '';
    document.getElementById('deckGen3').value = deck.g3 || '';

    document.getElementById('deckSkill1_1').value = deck.s1_1 || '';
    document.getElementById('deckSkill1_2').value = deck.s1_2 || '';
    document.getElementById('deckSkill1_3').value = deck.s1_3 || '';

    document.getElementById('deckSkill2_1').value = deck.s2_1 || '';
    document.getElementById('deckSkill2_2').value = deck.s2_2 || '';
    document.getElementById('deckSkill2_3').value = deck.s2_3 || '';

    document.getElementById('deckSkill3_1').value = deck.s3_1 || '';
    document.getElementById('deckSkill3_2').value = deck.s3_2 || '';
    document.getElementById('deckSkill3_3').value = deck.s3_3 || '';

    toggleModal('deckModal');
}

function handleGenInput(genNum) {
    const inputVal = document.getElementById(`deckGen${genNum}`).value.trim();
    const dropdown = document.getElementById(`genDropdown${genNum}`);
    const skillInput = document.getElementById(`deckSkill${genNum}_1`);

    if (GENERAL_DATABASE[inputVal]) {
        skillInput.value = GENERAL_DATABASE[inputVal];
    } else if (!inputVal) {
        skillInput.value = "";
    }

    if (!inputVal) {
        dropdown.classList.add('hidden');
        return;
    }

    const matches = Object.keys(GENERAL_DATABASE).filter(name => name.includes(inputVal));
    if (matches.length > 0) {
        dropdown.innerHTML = matches.map(name => `<div onclick="selectGeneral(${genNum}, '${name}')" class="px-3 py-2 text-xs text-main hover:bg-hover cursor-pointer border-b border-theme last:border-b-0"><strong>${name}</strong></div>`).join('');
        dropdown.classList.remove('hidden');
    } else {
        dropdown.classList.add('hidden');
    }
}

function selectGeneral(genNum, name) {
    document.getElementById(`deckGen${genNum}`).value = name;
    document.getElementById(`deckSkill${genNum}_1`).value = GENERAL_DATABASE[name];
    document.getElementById(`genDropdown${genNum}`).classList.add('hidden');
}

function handleSkillInput(genNum, skillNum) {
    const inputVal = document.getElementById(`deckSkill${genNum}_${skillNum}`).value.trim();
    const dropdown = document.getElementById(`skillDropdown${genNum}_${skillNum}`);

    if (!inputVal) {
        dropdown.classList.add('hidden');
        return;
    }

    const matches = COMMON_TACTICS_LIST.filter(tactic => tactic.includes(inputVal));
    if (matches.length > 0) {
        dropdown.innerHTML = matches.map(tactic => `<div onclick="selectSkill(${genNum}, ${skillNum}, '${tactic}')" class="px-3 py-2 text-xs text-main hover:bg-hover cursor-pointer border-b border-theme last:border-b-0">${tactic}</div>`).join('');
        dropdown.classList.remove('hidden');
    } else {
        dropdown.classList.add('hidden');
    }
}

function selectSkill(genNum, skillNum, tactic) {
    document.getElementById(`deckSkill${genNum}_${skillNum}`).value = tactic;
    document.getElementById(`skillDropdown${genNum}_${skillNum}`).classList.add('hidden');
}

function clearDeckInputs() {
    populateFormationSelect('기략진');
    for(let i=1; i<=3; i++) {
        document.getElementById(`deckGen${i}`).value = '';
        document.getElementById(`deckSkill${i}_1`).value = '';
        document.getElementById(`deckSkill${i}_2`).value = '';
        document.getElementById(`deckSkill${i}_3`).value = '';
    }
}

function saveDeckData() {
    const member = members.find(m => m.id === currentEditingMemberId);
    if (!member) return;

    if (!member.decks) member.decks = [];
    
    member.decks[currentEditingDeckIdx] = {
        formation: document.getElementById('deckFormationSelect').value,
        g1: document.getElementById('deckGen1').value.trim(),
        g2: document.getElementById('deckGen2').value.trim(),
        g3: document.getElementById('deckGen3').value.trim(),
        s1_1: document.getElementById('deckSkill1_1').value.trim(),
        s1_2: document.getElementById('deckSkill1_2').value.trim(),
        s1_3: document.getElementById('deckSkill1_3').value.trim(),
        s2_1: document.getElementById('deckSkill2_1').value.trim(),
        s2_2: document.getElementById('deckSkill2_2').value.trim(),
        s2_3: document.getElementById('deckSkill2_3').value.trim(),
        s3_1: document.getElementById('deckSkill3_1').value.trim(),
        s3_2: document.getElementById('deckSkill3_2').value.trim(),
        s3_3: document.getElementById('deckSkill3_3').value.trim()
    };

    saveDataToStorage();
    renderTable();
    toggleModal('deckModal');
    alert("덱 편성이 성공적으로 수정되었습니다!");
}

function handleDictMarkdownUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            if (!content.trim()) return alert("파일 내용이 비어있습니다.");
            alert("📚 도감 마크다운이 업로드되었습니다!");
            toggleModal('dataUploadModal');
        } catch (err) {
            alert("오류 발생: " + err.message);
        }
        event.target.value = '';
    };
    reader.readAsText(file, "UTF-8");
}

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
            if(jsonRows.length === 0) return alert("엑셀 데이터가 없습니다.");

            const allianceToAssign = activeUploadAlliance || categoryNames[0];
            jsonRows.forEach((row, idx) => {
                let rawRow = {}, rawNameKey = '';
                Object.keys(row).forEach(k => {
                    const cleanKey = k.trim().toLowerCase().replace(/\s+/g, '');
                    const val = String(row[k]).trim();
                    rawRow[cleanKey] = val;
                    if (cleanKey.includes('닉네임') || cleanKey.includes('멤버') || cleanKey.includes('이름') || cleanKey.includes('캐릭터')) {
                        if (!rawNameKey && val) rawNameKey = val;
                    }
                });

                const uidVal = rawRow['캐릭터id'] || rawRow['uid'] || rawRow['id'] || '';
                const nameVal = rawRow['멤버'] || rawRow['닉네임'] || rawRow['이름'] || rawNameKey || `대원_${idx+1}`;
                if (!uidVal) return;

                let existing = members.find(m => String(m.uid) === uidVal);
                if (existing) {
                    existing.name = nameVal;
                    existing.alliance = allianceToAssign;
                } else {
                    members.push({ id: Date.now() + Math.random() + idx, uid: uidVal, name: nameVal, job: rawRow['직업'] || '', alliance: allianceToAssign, isAdminRole: false, decks: [] });
                }
            });

            saveDataToStorage();
            renderTable();
            alert("연맹 명단 반영 완료!");
            toggleModal('dataUploadModal');
        } catch (err) { alert("파싱 오류: " + err.message); }
        event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}

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
            if(jsonRows.length === 0) return alert("데이터 없음");

            let uploadedUids = new Set();
            memberWeekData = jsonRows.map((row, idx) => {
                let rawRow = {};
                Object.keys(row).forEach(k => { rawRow[k.trim().toLowerCase().replace(/\s+/g, '')] = String(row[k]).trim(); });

                const uidVal = rawRow['캐릭터id'] || rawRow['uid'] || rawRow['id'] || '';
                const nameVal = rawRow['멤버'] || rawRow['닉네임'] || rawRow['이름'] || '';
                if (uidVal) uploadedUids.add(uidVal);

                let existingMember = members.find(m => String(m.uid) === uidVal);
                if (existingMember) {
                    existingMember.name = nameVal;
                    existingMember.alliance = '금의위';
                } else if (uidVal) {
                    members.push({ id: Date.now() + Math.random() + idx, uid: uidVal, name: nameVal, job: rawRow['직업'] || '', alliance: '금의위', isAdminRole: false, decks: [] });
                }

                return {
                    id: uidVal || idx, uid: uidVal, name: nameVal, job: rawRow['직업'] || '', alliance: '금의위',
                    group: rawRow['조별'] || '', position: rawRow['직위'] || '일반 멤버',
                    prosperity: Number(String(rawRow['번영'] || 0).replace(/,/g, '')) || 0,
                    mhoon: Number(String(rawRow['주간무훈'] || rawRow['무훈'] || 0).replace(/,/g, '')) || 0,
                    contribution: Number(String(rawRow['주간공헌'] || rawRow['공헌'] || 0).replace(/,/g, '')) || 0,
                    camp: rawRow['주둔지'] || '', siegeCount: Number(String(rawRow['주공성횟수'] || rawRow['공성횟수'] || 0).replace(/,/g, '')) || 0
                };
            });

            members.forEach(m => { if (m.alliance === '금의위' && m.uid && !uploadedUids.has(String(m.uid))) m.alliance = '재야'; });
            saveDataToStorage();
            localStorage.setItem('memberWeekData', JSON.stringify(memberWeekData));
            alert("주간활동 데이터 반영 완료!");
            if (currentActiveView === 'stats') renderStatsTable(); else renderTable();
            toggleModal('dataUploadModal');
        } catch (err) { alert("오류: " + err.message); }
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
        if (sortType === 'prosperityDesc') return b.prosperity - a.prosperity;
        if (sortType === 'mhoonDesc') return b.mhoon - a.mhoon;
        if (sortType === 'siegeDesc') return b.siegeCount - a.siegeCount;
        return 0;
    });

    document.getElementById('statTotalMembers').innerText = `${memberWeekData.length}명`;
    document.getElementById('statAvgProsperity').innerText = Math.round(memberWeekData.reduce((a,c)=>a+c.prosperity,0)/(memberWeekData.length||1)).toLocaleString();
    document.getElementById('statAvgMhoon').innerText = Math.round(memberWeekData.reduce((a,c)=>a+c.mhoon,0)/(memberWeekData.length||1)).toLocaleString();
    document.getElementById('statAvgContribution').innerText = Math.round(memberWeekData.reduce((a,c)=>a+c.contribution,0)/(memberWeekData.length||1)).toLocaleString();
    document.getElementById('statAvgSiege').innerText = `${(memberWeekData.reduce((a,c)=>a+c.siegeCount,0)/(memberWeekData.length||1)).toFixed(1)}회`;

    tbody.innerHTML = filtered.map((m, idx) => `
        <tr class="border-b border-theme transition bg-hover">
            <td class="p-3 sm:p-4 border-r border-theme text-center font-bold text-muted">${idx + 1}</td>
            <td class="p-3 sm:p-4 border-r border-theme font-bold text-main">${m.name}</td>
            <td class="p-3 sm:p-4 border-r border-theme text-muted">${m.job || '-'}</td>
            <td class="p-3 sm:p-4 border-r border-theme text-muted">${m.group || '-'}</td>
            <td class="p-3 sm:p-4 border-r border-theme"><span class="px-2 py-0.5 rounded text-xs bg-panel border border-theme">${m.position}</span></td>
            <td class="p-3 sm:p-4 border-r border-theme text-right font-mono">${m.prosperity.toLocaleString()}</td>
            <td class="p-3 sm:p-4 border-r border-theme text-right font-mono text-yellow-500">${m.mhoon.toLocaleString()}</td>
            <td class="p-3 sm:p-4 border-r border-theme text-right font-mono text-emerald-400">${m.contribution.toLocaleString()}</td>
            <td class="p-3 sm:p-4 border-r border-theme text-muted text-xs">${m.camp}</td>
            <td class="p-3 sm:p-4 text-center font-bold">${m.siegeCount}회</td>
        </tr>`).join('') || `<tr><td colspan="10" class="p-8 text-center text-muted">데이터 없음</td></tr>`;
}

function runSpyCheck() {
    let uidMap = {}, duplicates = [], suspicious = [];
    members.forEach(m => {
        const uidStr = String(m.uid).trim();
        if (!uidStr || uidStr === '0000' || uidStr.length < 5) { suspicious.push(m); return; }
        if (uidMap[uidStr]) {
            if (!duplicates.some(d => d.uid === uidStr)) duplicates.push({ uid: uidStr, members: [uidMap[uidStr], m] });
            else duplicates.find(d => d.uid === uidStr).members.push(m);
        } else { uidMap[uidStr] = m; }
    });
    document.getElementById('duplicateUidList').innerHTML = duplicates.length === 0 ? `<p class="py-2 text-emerald-400 font-bold">✅ 중복 UID 없음</p>` : duplicates.map(d=>`<div class="bg-panel p-2 rounded border border-red-500/30 flex justify-between"><span>${d.uid}</span><span class="text-red-400">${d.members.map(m=>m.name).join(', ')}</span></div>`).join('');
    document.getElementById('suspiciousUidList').innerHTML = suspicious.length === 0 ? `<p class="py-2 text-emerald-400 font-bold">✅ 이상 계정 없음</p>` : suspicious.map(m=>`<div class="bg-panel p-2 rounded border border-orange-500/30"><span>${m.name}</span></div>`).join('');
    toggleModal('spyCheckModal');
}

function toggleSubMenu(menuId) {
    const menu = document.getElementById(menuId);
    const arrow = document.getElementById(menuId + '-arrow');
    if (menu.style.display === 'none') { menu.style.display = 'block'; if(arrow) arrow.innerText = '▲'; }
    else { menu.style.display = 'none'; if(arrow) arrow.innerText = '▼'; }
}

function toggleMobileDrawer() {
    document.getElementById('mobileDrawerMenu').classList.toggle('-translate-x-full');
    document.getElementById('mobileDrawerBackdrop').classList.toggle('hidden');
}

async function loadDataFromFirebase() {
    if (window.firebaseDB) {
        const { db, doc, getDoc } = window.firebaseDB;
        try {
            const docSnap = await getDoc(doc(db, "alliance_data", "main"));
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.members) members = data.members;
                if (data.categoryNames) categoryNames = data.categoryNames;
                if (data.DICT_DETAIL_DATA) DICT_DETAIL_DATA = data.DICT_DETAIL_DATA;
                if (currentFilter !== '⭐ 즐겨찾기' && !categoryNames.includes(currentFilter)) currentFilter = categoryNames[0];
                saveDataToStorage();
                renderFilterButtons();
                applyAdminUIState();
                if (currentActiveView === 'dashboard') renderTable();
                return;
            }
        } catch (err) { console.error(err); }
    }
    renderFilterButtons();
    applyAdminUIState();
    if (currentActiveView === 'dashboard') renderTable();
}

async function saveDataToStorage() {
    localStorage.setItem('gameMembers', JSON.stringify(members));
    localStorage.setItem('categoryNames', JSON.stringify(categoryNames));
    localStorage.setItem('dictDetailData', JSON.stringify(DICT_DETAIL_DATA));
    localStorage.setItem('userFavorites', JSON.stringify(favorites));

    if (window.firebaseDB) {
        const { db, doc, setDoc } = window.firebaseDB;
        try { await setDoc(doc(db, "alliance_data", "main"), { members, categoryNames, DICT_DETAIL_DATA }, { merge: true }); } catch (err) { console.error(err); }
    }
}

function handleUidAuth() {
    const inputUid = document.getElementById('authUid').value.trim();
    if (!inputUid) return alert("UID를 입력해주세요.");
    if (document.getElementById('saveUidCheckbox').checked) localStorage.setItem('savedAuthUid', inputUid);
    else localStorage.removeItem('savedAuthUid');

    let matchedMember = members.find(m => String(m.uid) === inputUid);
    let isCreator = (inputUid === CREATOR_UID);

    if (!matchedMember) {
        matchedMember = { id: Date.now() + Math.random(), uid: inputUid, name: isCreator ? "관리자(산도로)" : `대원_${inputUid.slice(-4)}`, alliance: categoryNames[0], job: "", isAdminRole: isCreator, decks: [] };
        members.push(matchedMember);
        saveDataToStorage();
    } else if (isCreator) { matchedMember.isAdminRole = true; }

    localStorage.setItem('loggedUser', JSON.stringify({ uid: matchedMember.uid, name: matchedMember.name, time: new Date().toLocaleString() }));
    document.getElementById('authOverlay').classList.add('hidden');
    loadDataFromFirebase();
}

function handleLogout() {
    if (confirm("로그아웃 하시겠습니까?")) { localStorage.removeItem('loggedUser'); location.reload(); }
}

function isCurrentLoggedUserCreator() {
    try { return String(JSON.parse(localStorage.getItem('loggedUser')).uid) === CREATOR_UID; } catch(e) { return false; }
}

function isCurrentLoggedUserAdmin() {
    try {
        const u = JSON.parse(localStorage.getItem('loggedUser'));
        if (String(u.uid) === CREATOR_UID) return true;
        const m = members.find(item => String(item.uid) === String(u.uid));
        return m && m.isAdminRole;
    } catch(e) { return false; }
}

function isCurrentLoggedUserGeumuiwi() {
    try {
        const u = JSON.parse(localStorage.getItem('loggedUser'));
        if (String(u.uid) === CREATOR_UID) return true;
        const m = members.find(item => String(item.uid) === String(u.uid));
        return m && m.alliance === '금의위';
    } catch(e) { return false; }
}

function toggleAdminMode() {
    if (!isAdminMode) {
        if (isCurrentLoggedUserAdmin()) { isAdminMode = true; applyAdminUIState(); toggleModal('adminControlModal'); return; }
        if (prompt("관리자 비밀번호:") !== ADMIN_PASSWORD) return alert("비밀번호 오류");
        isAdminMode = true;
        applyAdminUIState();
        toggleModal('adminControlModal');
    } else { toggleModal('adminControlModal'); }
}

function turnOffAdminMode() { isAdminMode = false; isUserPreview = false; applyAdminUIState(); toggleModal('adminControlModal'); }
function toggleUserPreview() { isUserPreview = !isUserPreview; toggleModal('adminControlModal'); if (currentActiveView === 'dashboard') renderTable(); }
function openAdminControlFromSub(mId) { toggleModal(mId); toggleModal('adminControlModal'); }
function openDictTabWithScroll(tabKey) { switchDictTab(tabKey); toggleModal('dictModal'); }

function applyAdminUIState() {
    if (isCurrentLoggedUserAdmin() && !isAdminMode) isAdminMode = true;
    const effectiveIsAdmin = isAdminMode && !isUserPreview;
    
    document.getElementById('addMemberBtn')?.classList.toggle('hidden', !effectiveIsAdmin);
    document.getElementById('delSelectedBtn')?.classList.toggle('hidden', !effectiveIsAdmin);
    document.getElementById('spyCheckBtn')?.classList.toggle('hidden', !effectiveIsAdmin);
    document.getElementById('delColHeader')?.classList.toggle('hidden', !effectiveIsAdmin);
    document.getElementById('uidColHeader')?.classList.toggle('hidden', !(effectiveIsAdmin || isCurrentLoggedUserGeumuiwi()));
    
    const btn = document.getElementById('editModeBtn');
    if (btn) {
        btn.innerHTML = effectiveIsAdmin ? "<span>🛡</span> 제어판" : "<span>🛡️</span> 관리자 모드";
        btn.className = effectiveIsAdmin ? "bg-red-800 hover:bg-red-700 px-3 py-2 rounded-lg font-bold text-white text-xs shadow transition flex items-center gap-1.5" : "bg-amber-600 hover:bg-amber-500 px-3 py-2 rounded-lg font-bold text-white text-xs shadow transition flex items-center gap-1.5";
    }
    renderFilterButtons();
    if (currentActiveView === 'dashboard') renderTable();
}

function openCategoryModal() {
    toggleModal('adminControlModal');
    document.getElementById('categoryInputsContainer').innerHTML = categoryNames.map(cat => `
        <div class="flex gap-2 items-center bg-main p-2 rounded-lg border border-theme">
            <input type="text" value="${getDisplayCategoryName(cat)}" class="cat-input flex-1 bg-panel border border-theme px-3 py-1.5 rounded-lg text-sm text-main">
            <button type="button" onclick="this.parentElement.remove()" class="bg-red-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold">삭제</button>
        </div>`).join('');
    toggleModal('categoryModal');
}

function addCategoryInput() {
    document.getElementById('categoryInputsContainer').innerHTML += `
        <div class="flex gap-2 items-center bg-main p-2 rounded-lg border border-theme">
            <input type="text" value="새 동맹" class="cat-input flex-1 bg-panel border border-theme px-3 py-1.5 rounded-lg text-sm text-main">
            <button type="button" onclick="this.parentElement.remove()" class="bg-red-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold">삭제</button>
        </div>`;
}

function saveCategorySettings() {
    categoryNames = Array.from(document.querySelectorAll('.cat-input')).map(i => i.value.trim() === '낙원' ? '낙원(동맹)' : i.value.trim()).filter(Boolean);
    if (!categoryNames.includes(currentFilter)) currentFilter = categoryNames[0];
    saveDataToStorage();
    renderFilterButtons();
    toggleModal('categoryModal');
    toggleModal('adminControlModal');
}

let activeUploadAlliance = '금의위';
function openDataUploadModal() {
    toggleModal('adminControlModal');
    document.getElementById('allianceUploadButtonsBox').innerHTML = categoryNames.map(cat => `
        <div class="flex items-center justify-between bg-panel p-2.5 rounded-lg border border-theme">
            <span class="text-xs font-bold gold-text">⚔️ ${getDisplayCategoryName(cat)} 업로드</span>
            <button onclick="activeUploadAlliance='${cat}'; document.getElementById('allianceExcelInput').click();" class="bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">선택</button>
        </div>`).join('');
    toggleModal('dataUploadModal');
}

function openAdminLogModal() {
    toggleModal('adminControlModal');
    const logs = JSON.parse(localStorage.getItem('accessLogs') || '[]');
    document.getElementById('adminLogContainer').innerHTML = logs.length === 0 ? `<p class="text-center text-muted py-4">로그 없음</p>` : logs.map(l => `<div class="bg-main p-2.5 rounded-lg border border-theme flex justify-between text-xs"><span>${l.name} (${l.uid})</span><span class="text-muted">${l.time}</span></div>`).join('');
    toggleModal('adminLogModal');
}

function applyTheme() {
    document.getElementById('app-body').className = `${document.getElementById('themeSelector').value} min-h-screen flex flex-col md:flex-row relative transition-colors duration-300`;
}

function renderFilterButtons() {
    const container = document.getElementById('filter-buttons');
    const sidebarContainer = document.getElementById('sidebar-filter-buttons');
    
    let html = `<button onclick="switchPageView('dashboard'); filterTable('⭐ 즐겨찾기');" class="px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${currentFilter === '⭐ 즐겨찾기' && currentActiveView === 'dashboard' ? 'bg-yellow-600 text-white shadow' : 'bg-panel hover:bg-hover border border-theme text-muted'}">⭐ 즐겨찾기</button>`;
    let sidebarHtml = '';
    
    categoryNames.forEach((cat, index) => {
        const isSelected = currentFilter === cat && currentActiveView === 'dashboard';
        html += `<button onclick="switchPageView('dashboard'); filterTable('${cat}');" class="px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${isSelected ? 'bg-yellow-600 text-white shadow' : 'bg-panel hover:bg-hover border border-theme text-muted'}">${getDisplayCategoryName(cat)}</button>`;
        sidebarHtml += `<a href="#" onclick="switchPageView('dashboard'); filterTable('${cat}'); toggleMobileDrawer(); return false;" class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-muted hover:bg-hover transition"><span>${index + 1}.</span> ${getDisplayCategoryName(cat)}</a>`;
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

function filterTable(filter) { currentFilter = filter; currentPage = 1; renderFilterButtons(); if (currentActiveView === 'dashboard') renderTable(); }
function changePageSize() { currentPage = 1; renderTable(); }
function changePage(p) { currentPage = p; renderTable(); }

function deleteSelectedMembers() {
    const sel = document.querySelectorAll('.row-checkbox:checked');
    if (sel.length === 0) return alert("선택된 대원이 없습니다.");
    if (confirm("선택한 대원을 삭제하시겠습니까?")) {
        members = members.filter(m => !Array.from(sel).map(b => Number(b.getAttribute('data-id'))).includes(m.id));
        saveDataToStorage();
        renderTable();
    }
}

function renderTable() {
    if (currentActiveView !== 'dashboard') return;
    const tbody = document.getElementById('member-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const effectiveIsAdmin = isAdminMode && !isUserPreview;
    const showUidCol = effectiveIsAdmin || isCurrentLoggedUserAdmin() || isCurrentLoggedUserGeumuiwi();

    let filtered = members.filter(m => (currentFilter === '⭐ 즐겨찾기' ? favorites.includes(m.id) : m.alliance === currentFilter) && m.name.toLowerCase().includes(searchQuery));
    document.getElementById('total-member-count').innerText = members.length;
    
    const pageSizeVal = document.getElementById('pageSizeSelect').value;
    let displayedList = filtered, totalPages = 1;
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
        let html = `<td class="p-3 sm:p-4 border-r border-theme text-center"><button type="button" onclick="toggleFavorite(${member.id})" class="text-sm">${favorites.includes(member.id) ? '⭐' : '☆'}</button></td>`;
        html += `<td class="p-3 sm:p-4 border-r border-theme text-center font-bold text-muted">${(pageSizeVal !== 'all') ? ((currentPage - 1) * parseInt(pageSizeVal, 10)) + index + 1 : index + 1}</td>`;
        
        if (showUidCol) html += `<td class="p-3 sm:p-4 border-r border-theme font-mono text-muted select-all">${member.uid || '-'}</td>`;
        
        if (effectiveIsAdmin) {
            html += `<td class="p-3 sm:p-4 border-r border-theme"><input type="text" value="${member.name}" onchange="updateMemberField(${member.id}, 'name', this.value)" class="bg-main border border-theme px-2 py-1 rounded text-xs font-bold w-24 text-main"></td>`;
            html += `<td class="p-3 sm:p-4 border-r border-theme"><select onchange="updateMemberField(${member.id}, 'job', this.value)" class="bg-main border border-theme px-2 py-1 rounded text-xs text-main">${AVAILABLE_JOBS.map(j=>`<option value="${j}" ${member.job===j?'selected':''}>${j}</option>`).join('')}</select></td>`;
            html += `<td class="p-3 sm:p-4 border-r border-theme"><select onchange="updateMemberField(${member.id}, 'alliance', this.value)" class="bg-main border border-theme px-2 py-1 rounded text-xs text-main">${categoryNames.map(c=>`<option value="${c}" ${member.alliance===c?'selected':''}>${getDisplayCategoryName(c)}</option>`).join('')}</select></td>`;
        } else {
            html += `<td class="p-3 sm:p-4 border-r border-theme font-bold">${member.name}</td>`;
            html += `<td class="p-3 sm:p-4 border-r border-theme text-muted">${member.job || '-'}</td>`;
            html += `<td class="p-3 sm:p-4 border-r border-theme">${getDisplayCategoryName(member.alliance)}</td>`;
        }

        for(let i=0; i<5; i++) {
            const deck = member.decks && member.decks[i];
            if (deck && (deck.g1 || deck.g2 || deck.g3)) {
                html += `<td class="p-2 sm:p-3 border-r border-theme cursor-pointer" onclick="openDeckModal(${member.id}, ${i})"><div class="deck-cell rounded-lg p-1.5 text-center bg-panel hover:bg-hover"><div class="text-[11px] font-bold gold-text">${deck.g1 || '-'} / ${deck.g2 || '-'} / ${deck.g3 || '-'}</div></div></td>`;
            } else {
                html += `<td class="p-2 sm:p-3 border-r border-theme cursor-pointer" onclick="openDeckModal(${member.id}, ${i})"><div class="deck-cell rounded-lg p-1.5 text-center text-muted border border-dashed border-theme hover:bg-hover">+ 설정</div></td>`;
            }
        }
        
        if(effectiveIsAdmin) html += `<td class="p-2 text-center"><button onclick="deleteMember(${member.id})" class="bg-red-800 text-white px-2 py-1 rounded text-xs">삭제</button></td>`;
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

function updateMemberField(id, field, value) {
    const member = members.find(m => m.id === id);
    if (member) { member[field] = value; saveDataToStorage(); }
}

function toggleFavorite(id) {
    const idx = favorites.indexOf(id);
    if (idx > -1) favorites.splice(idx, 1); else favorites.push(id);
    saveDataToStorage();
    renderTable();
}

function renderPagination(totalPages) {
    const container = document.getElementById('paginationContainer');
    if (!container || totalPages <= 1) { if(container) container.innerHTML = ''; return; }
    container.innerHTML = Array.from({length: totalPages}, (_, i) => `<button onclick="changePage(${i+1})" class="px-3 py-1 rounded text-xs transition ${i+1 === currentPage ? 'bg-yellow-600 text-white font-bold' : 'bg-panel border border-theme text-muted'}">${i+1}</button>`).join('');
}

function downloadShareExcel() {
    let ws = XLSX.utils.json_to_sheet(members.map((m, idx) => ({ "No": idx + 1, "UID": m.uid, "닉네임": m.name, "직업": m.job || "", "소속": getDisplayCategoryName(m.alliance || "") })));
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "연맹원현황");
    XLSX.writeFile(wb, "금의위_연맹원_현황.xlsx");
}

function openSettingsModal() { toggleModal('settingsModal'); }
function toggleModal(id) { document.getElementById(id).classList.toggle('hidden'); }
function addNewMember() { members.push({ id: Date.now(), uid: "0000", name: "신규장수", alliance: currentFilter === '⭐ 즐겨찾기' ? categoryNames[0] : currentFilter, decks: [], isAdminRole: false }); saveDataToStorage(); renderTable(); }
function deleteMember(id) { if(confirm("삭제하시겠습니까?")) { members = members.filter(m => m.id !== id); saveDataToStorage(); renderTable(); } }

loadDataFromFirebase();
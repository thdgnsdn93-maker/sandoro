let isAdminMode = false;
let isUserPreview = false;
let isDeckEditMode = false;
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
    "관우": "화하 진압 (효과: 적 전체 병기 피해 및 제어 상태 대상 탈주병 생성)",
    "제갈량": "초선차전 (효과: 심리 공격 수치 증가 및 책략 피해 반격)",
    "조운": "칠진칠출 (효과: 피신 확률 증가 및 용담 발동)",
    "초선": "폐월 (효과: 남성 무장 피해 감소 및 반사 병기 피해)",
    "장비": "만인지적 (효과: 적 전체 병기 피해 및 위협·공포 부여)",
    "여포": "무쌍의 용사 (효과: 전체 적군과 1회 일반 공격 교환 및 추가 병기 피해)",
    "주유": "기지의 승리 (효과: 이상 상태 감지 시 기지 발동)"
};

const COMMON_TACTICS_LIST = [
    "팔문금사陣 (효과: 전투 초반 아군 피해 감소)",
    "백의교위 (효과: 선공 효과 및 회피율 증가)",
    "파진함락 (효과: 적 방어력 무시 물리 피해)",
    "태평요술 (효과: 책략 피해 극대화 및 발동 확률 증가)"
];

const DEFAULT_DICT_DATA = {
    formation: [
        { name: "일자진", type: "밸런스 분산형 / 전열 받는 피해 8% 감소", effect: "어그로가 3곳으로 균등 분산되는 기본 밸런스진" },
        { name: "기형진", type: "1탱+2딜 공격진 / 전열 받는 피해 6% 감소", effect: "강력한 1탱이 60% 피격을 견디고 후열 딜러가 12% 딜증으로 폭딜 투사" },
        { name: "안행진", type: "방어 보완 & 누킹진 / 전열 통솔 +20", effect: "전열 물리 방어(통솔) 강화 및 후열 메인 딜러 화력 15% 극대화" },
        { name: "방원진", type: "평타 연타 극딜진 / 전열 받는 피해 5% 감소", effect: "후열 배치 무장에게 상시 연타율 40% 버프를 부여하는 평타 덱 전용 진형" },
        { name: "추형진", type: "돌격 초공격형진 / 전열 가해 피해 16% 증가", effect: "전열 브루저/물리 딜러의 피해량을 16% 폭증시켜 적 전열을 신속 파쇄" },
        { name: "어린진", type: "지략 회피 반격진 / 전열 피신 12% 증가", effect: "후열 60% 자리에 지략 반격 탱커를 배치해 반격 확률과 회심/묘책을 극대화" },
        { name: "구행진", type: "[S2] 전열 방어 & 후열 연타 보조진", effect: "우측 전열 탱커가 집중 방어하고 후열 연타 딜러진을 보조하는 시즌 2 신규 진형" },
        { name: "언월진", type: "[S2] 2전열 강타 & 후열 보호진", effect: "2명의 전열 공격형 딜러가 강력한 대미지를 투사하고 후열 딜러/서포터를 보호" }
    ],
    synergy: [
        { name: "하북 정장", type: "필요 인원: 2명 | 대상: 안량, 문추, 장합", effect: "무력 +20" },
        { name: "괄목상대", type: "필요 인원: 2명 | 대상: 여몽, 노숙", effect: "3턴 시작 시 액티브 전법 피해 12% 감소" },
        { name: "동오 대도독", type: "필요 인원: 3명 | 대상: 주유, 노숙, 여몽, 육손", effect: "심리 공격 +8% (책략 피해 비례 자가 회복)" },
        { name: "깊은 의리", type: "필요 인원: 2명 | 대상: 관우, 관평, 주창, 관은병", effect: "관통 +6% (물리 방어 관통)" },
        { name: "오자양장", type: "필요 인원: 2명 | 대상: 우금, 장합, 서황, 장료, 악진", effect: "관통 +6%" }
    ],
    generalTactic: [
        { name: "서성", type: "고유전법: 백리의 성 (지휘 / 방어 / 100%)", effect: "전투 시작 후 4턴 동안 전체 아군이 피해를 받기 직전 25% 확률로 방어 획득. 4턴 시작 시 통솔 40포인트 증가 및 전체 적군 홍수 상태 부여" },
        { name: "대교", type: "고유전법: 국색 (지휘 / 보조 / 100%)", effect: "매 턴 시작 시, 랜덤 적군 2명이 받는 피해 20% 증가 및 아군 2명 병력 회복 (치유율 180%)" },
        { name: "손책", type: "고유전법: 강동 제패 (액티브 / 병기 / 65%)", effect: "적군 랜덤 2명에게 250%의 병기 피해를 주고, 자신과 랜덤 아군 단일 목표 병력 회복" },
        { name: "감녕", type: "고유전법: 수전의 제왕 (패시브 / 병기 / 100%)", effect: "일반 공격 피해 150% 증가 및 공격 전 무력 12포인트 증가 (최대 4회 중첩)" }
    ],
    commonTactic: [
        { name: "격려", type: "지휘 / 보조 / 100% | 적합: 방패/창/궁/기", effect: "전투 시 우군 2명의 무력이 7 ➔ 14포인트 증가합니다" },
        { name: "결사의 다짐", type: "지휘 / 보조 / 100% | 적합: 방패/창/궁/기", effect: "전투 시작 시 랜덤 아군 1명 결사 획득(회복 및 병기 피해 감소), 무력 최고 아군 다짐 획득" },
        { name: "강철의 의지", type: "액티브 / 보조 / 35% ➔ 70% | 적합: 방패/창/궁/기", effect: "2턴 동안 우군 2명의 연타 확률 20 ➔ 42.5%, 회유 20% 증가" },
        { name: "강공격", type: "추격 / 병기 / 40% | 적합: 방패/창/궁/기", effect: "일반 공격 후, 현재 공격 목표에게 60 ➔ 120%의 병기 피해를 즉시 추가로 줍니다" }
    ]
};

let DICT_DETAIL_DATA = JSON.parse(localStorage.getItem('dictDetailData')) || DEFAULT_DICT_DATA;

function getTacticTooltip(skillName) {
    if (!skillName) return "";
    const cleanName = skillName.split(' ')[0].trim();
    const allTactics = [...(DICT_DETAIL_DATA.generalTactic || []), ...(DICT_DETAIL_DATA.commonTactic || [])];
    const found = allTactics.find(t => t.name.includes(cleanName) || t.type.includes(cleanName));
    if (found) {
        return `[${found.name}] ${found.type}\n효과: ${found.effect}`;
    }
    return `전법명: ${skillName}`;
}

function updateFormationAndSynergyBonusText() {
    const formationSelect = document.getElementById('deckFormationSelect');
    const selectedFormationName = formationSelect ? formationSelect.value : '일자진';
    
    const formationObj = (DICT_DETAIL_DATA.formation || []).find(f => f.name === selectedFormationName);
    let formationText = formationObj ? `[진형보너스(${formationObj.name})] ${formationObj.effect}` : "선택된 진형 효과 없음";

    const g1 = document.getElementById('deckGen1')?.value.trim() || '';
    const g2 = document.getElementById('deckGen2')?.value.trim() || '';
    const g3 = document.getElementById('deckGen3')?.value.trim() || '';
    const currentGenerators = [g1, g2, g3].filter(Boolean);

    let matchedSynergies = [];
    (DICT_DETAIL_DATA.synergy || []).forEach(syn => {
        const matchedCount = currentGenerators.filter(g => syn.type.includes(g) || syn.name.includes(g)).length;
        if (matchedCount >= 2) {
            matchedSynergies.push(`✨ 인연보너스[${syn.name}]: ${syn.effect}`);
        }
    });

    let synergyText = matchedSynergies.length > 0 ? matchedSynergies.join(' | ') : "활성화된 장수 인연 보너스 없음 (2명 이상 배치 시 적용)";
    
    const bannerEl = document.getElementById('formationSynergyBonusBanner');
    if (bannerEl) {
        bannerEl.innerText = `${formationText}  |  ${synergyText}`;
    }
}

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
    const isGeneralTactic = currentDictTargetTab === 'generalTactic';
    
    contentArea.innerHTML = `
        <div class="space-y-3 bg-panel p-5 rounded-xl border border-theme shadow-inner">
            <div class="border-b border-theme pb-2">
                <span class="text-muted text-[11px] block">${isGeneralTactic ? '장수 이름' : '항목 이름'}</span>
                <h3 class="text-base font-extrabold gold-text">${item.name}</h3>
            </div>
            <div class="border-b border-theme pb-2">
                <span class="text-muted text-[11px] block">${isGeneralTactic ? '고유전법 명칭 및 유형' : '특성 / 발동률 / 분류'}</span>
                <p class="text-sm font-bold text-main mt-0.5">${item.type}</p>
            </div>
            <div>
                <span class="text-muted text-[11px] block">상세 효과</span>
                <p class="text-sm text-main mt-1 leading-relaxed">${item.effect}</p>
            </div>
        </div>
    `;
}

// 📌 업로드 마크다운 문서를 1:1 정확한 이름과 내용으로 파싱하는 로직
function handleDictMarkdownUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const rawContent = e.target.result;
            if (!rawContent.trim()) { alert("파일 내용이 비어있습니다."); return; }

            const lines = rawContent.split(/\r?\n/);
            let parsedItems = [];
            let currentItem = null;

            lines.forEach(line => {
                let trimmed = line.trim();
                if (!trimmed) return;
                if (trimmed.startsWith('>') || trimmed.startsWith('---')) return;

                // 새로운 항목(이름)의 시작점 감지 (### 헤더 또는 **볼드체** 또는 번호 매기기)
                const isHeader = trimmed.startsWith('###') || trimmed.startsWith('##') || trimmed.match(/^[0-9]+\.\s+/) || (trimmed.startsWith('**') && trimmed.endsWith('**'));

                if (isHeader) {
                    if (currentItem && currentItem.name) {
                        parsedItems.push(currentItem);
                    }
                    let cleanName = trimmed
                        .replace(/^[#\-*0-9.\s]+/, '')
                        .replace(/\*\*/g, '')
                        .split(':')[0]
                        .split('(')[0]
                        .split('-')[0]
                        .trim();

                    if (cleanName && cleanName.length < 20) {
                        currentItem = { name: cleanName, type: "상세 정보", effect: "" };
                    }
                } else if (currentItem) {
                    if (trimmed.includes('유형') || trimmed.includes('발동') || trimmed.includes('분류') || trimmed.includes('대상') || trimmed.includes('인원') || trimmed.includes('지휘') || trimmed.includes('액티브') || trimmed.includes('패시브')) {
                        if (currentItem.type === "상세 정보") {
                            currentItem.type = trimmed.replace(/^[#\-*]+\s*/, '').replace(/\*\*/g, '').trim();
                        } else {
                            currentItem.effect += (currentItem.effect ? " " : "") + trimmed.replace(/^[#\-*]+\s*/, '').replace(/\*\*/g, '').trim();
                        }
                    } else {
                        currentItem.effect += (currentItem.effect ? " " : "") + trimmed.replace(/^[#\-*]+\s*/, '').replace(/\*\*/g, '').trim();
                    }
                }
            });

            if (currentItem && currentItem.name) {
                parsedItems.push(currentItem);
            }

            if (parsedItems.length > 0) {
                DICT_DETAIL_DATA[activeDictUploadKey] = parsedItems.map(item => ({
                    name: item.name,
                    type: item.type || "세부 분류 및 정보",
                    effect: item.effect || "상세 효과 내용"
                }));

                saveDataToStorage();
                if (document.getElementById('dictModal') && !document.getElementById('dictModal').classList.contains('hidden')) {
                    switchDictTab(activeDictUploadKey);
                }
                alert(`📚 총 ${parsedItems.length}개의 항목이 정확하게 분리되어 반영되었습니다!`);
            } else {
                alert("⚠️ 마크다운 형식을 올바르게 읽지 못했습니다.");
            }
            toggleModal('dataUploadModal');
        } catch (err) { alert("파싱 오류: " + err.message); }
        event.target.value = '';
    };
    reader.readAsText(file, "UTF-8");
}

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
    isDeckEditMode = false;

    const titleEl = document.getElementById('deckModalTitle');
    if (titleEl) titleEl.innerText = `⚔️ ${member.name} - 보유덱 ${deckIdx + 1} 덱 상세`;

    const deck = (member.decks && member.decks[deckIdx]) || {};
    populateFormationSelect(deck.formation || '일자진');

    document.getElementById('deckGen1').value = deck.g1 || '';
    document.getElementById('deckGen2').value = deck.g2 || '';
    document.getElementById('deckGen3').value = deck.g3 || '';

    const s1_1 = deck.s1_1 || '';
    const s1_2 = deck.s1_2 || '';
    const s1_3 = deck.s1_3 || '';
    const s2_1 = deck.s2_1 || '';
    const s2_2 = deck.s2_2 || '';
    const s2_3 = deck.s2_3 || '';
    const s3_1 = deck.s3_1 || '';
    const s3_2 = deck.s3_2 || '';
    const s3_3 = deck.s3_3 || '';

    document.getElementById('deckSkill1_1').value = s1_1;
    document.getElementById('deckSkill1_1').title = getTacticTooltip(s1_1);
    document.getElementById('deckSkill1_2').value = s1_2;
    document.getElementById('deckSkill1_2').title = getTacticTooltip(s1_2);
    document.getElementById('deckSkill1_3').value = s1_3;
    document.getElementById('deckSkill1_3').title = getTacticTooltip(s1_3);

    document.getElementById('deckSkill2_1').value = s2_1;
    document.getElementById('deckSkill2_1').title = getTacticTooltip(s2_1);
    document.getElementById('deckSkill2_2').value = s2_2;
    document.getElementById('deckSkill2_2').title = getTacticTooltip(s2_2);
    document.getElementById('deckSkill2_3').value = s2_3;
    document.getElementById('deckSkill2_3').title = getTacticTooltip(s2_3);

    document.getElementById('deckSkill3_1').value = s3_1;
    document.getElementById('deckSkill3_1').title = getTacticTooltip(s3_1);
    document.getElementById('deckSkill3_2').value = s3_2;
    document.getElementById('deckSkill3_2').title = getTacticTooltip(s3_2);
    document.getElementById('deckSkill3_3').value = s3_3;
    document.getElementById('deckSkill3_3').title = getTacticTooltip(s3_3);

    applyDeckEditModeUI();
    updateFormationAndSynergyBonusText();
    toggleModal('deckModal');
}

function toggleDeckEditMode() {
    isDeckEditMode = !isDeckEditMode;
    applyDeckEditModeUI();
}

function applyDeckEditModeUI() {
    const editBtn = document.getElementById('deckEditModeToggleBtn');
    const saveBtn = document.getElementById('deckSaveBtn');
    const clearBtn = document.getElementById('deckClearBtn');
    const formationSelect = document.getElementById('deckFormationSelect');

    formationSelect.disabled = !isDeckEditMode;

    for(let i=1; i<=3; i++) {
        document.getElementById(`deckGen${i}`).readOnly = !isDeckEditMode;
        document.getElementById(`deckSkill${i}_2`).readOnly = !isDeckEditMode;
        document.getElementById(`deckSkill${i}_3`).readOnly = !isDeckEditMode;
    }

    if (isDeckEditMode) {
        if(editBtn) editBtn.innerText = "수정 취소";
        if(saveBtn) saveBtn.classList.remove('hidden');
        if(clearBtn) clearBtn.classList.remove('hidden');
    } else {
        if(editBtn) editBtn.innerText = "덱 수정";
        if(saveBtn) saveBtn.classList.add('hidden');
        if(clearBtn) clearBtn.classList.add('hidden');
    }
}

function handleGenInput(genNum) {
    if (!isDeckEditMode) return;
    const inputVal = document.getElementById(`deckGen${genNum}`).value.trim();
    const dropdown = document.getElementById(`genDropdown${genNum}`);
    const skillInput = document.getElementById(`deckSkill${genNum}_1`);

    if (GENERAL_DATABASE[inputVal]) {
        skillInput.value = GENERAL_DATABASE[inputVal];
        skillInput.title = getTacticTooltip(GENERAL_DATABASE[inputVal]);
    } else if (!inputVal) {
        skillInput.value = "";
        skillInput.title = "";
    }

    updateFormationAndSynergyBonusText();

    if (!inputVal) { dropdown.classList.add('hidden'); return; }

    const matches = Object.keys(GENERAL_DATABASE).filter(name => name.includes(inputVal));
    if (matches.length > 0) {
        dropdown.innerHTML = matches.map(name => `<div onclick="selectGeneral(${genNum}, '${name}')" class="px-3 py-2 text-xs text-main hover:bg-hover cursor-pointer border-b border-theme last:border-b-0"><strong>${name}</strong></div>`).join('');
        dropdown.classList.remove('hidden');
    } else { dropdown.classList.add('hidden'); }
}

function selectGeneral(genNum, name) {
    document.getElementById(`deckGen${genNum}`).value = name;
    const tacticVal = GENERAL_DATABASE[name];
    const skillInput = document.getElementById(`deckSkill${genNum}_1`);
    skillInput.value = tacticVal;
    skillInput.title = getTacticTooltip(tacticVal);
    document.getElementById(`genDropdown${genNum}`).classList.add('hidden');
    updateFormationAndSynergyBonusText();
}

function handleSkillInput(genNum, skillNum) {
    if (!isDeckEditMode) return;
    const inputVal = document.getElementById(`deckSkill${genNum}_${skillNum}`).value.trim();
    const dropdown = document.getElementById(`skillDropdown${genNum}_${skillNum}`);

    if (!inputVal) { dropdown.classList.add('hidden'); return; }

    const matches = COMMON_TACTICS_LIST.filter(tactic => tactic.includes(inputVal));
    if (matches.length > 0) {
        dropdown.innerHTML = matches.map(tactic => `<div onclick="selectSkill(${genNum}, ${skillNum}, '${tactic}')" class="px-3 py-2 text-xs text-main hover:bg-hover cursor-pointer border-b border-theme last:border-b-0">${tactic}</div>`).join('');
        dropdown.classList.remove('hidden');
    } else { dropdown.classList.add('hidden'); }
}

function selectSkill(genNum, skillNum, tactic) {
    const targetInput = document.getElementById(`deckSkill${genNum}_${skillNum}`);
    targetInput.value = tactic;
    targetInput.title = getTacticTooltip(tactic);
    document.getElementById(`skillDropdown${genNum}_${skillNum}`).classList.add('hidden');
}

function clearDeckInputs() {
    if (!isDeckEditMode) return;
    populateFormationSelect('일자진');
    for(let i=1; i<=3; i++) {
        document.getElementById(`deckGen${i}`).value = '';
        document.getElementById(`deckSkill${i}_1`).value = '';
        document.getElementById(`deckSkill${i}_1`).title = '';
        document.getElementById(`deckSkill${i}_2`).value = '';
        document.getElementById(`deckSkill${i}_2`).title = '';
        document.getElementById(`deckSkill${i}_3`).value = '';
        document.getElementById(`deckSkill${i}_3`).title = '';
    }
    updateFormationAndSynergyBonusText();
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
            <span class="text-xs font-bold gold-text">⚔ ${getDisplayCategoryName(cat)} 업로드</span>
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
import { stages, lifeQuotes } from './data.js';

// 应用状态
const state = {
    currentStage: 0,
    selectedWishes: new Set(),    // 已选择的愿望ID
    vanishedWishes: new Set(),    // 已消失的愿望ID
    stageSelections: {},          // 每个阶段的选择记录
    totalSelected: 0,
    totalVanished: 0
};

// DOM 元素缓存
const dom = {
    introPage: document.getElementById('intro-page'),
    wishPage: document.getElementById('wish-page'),
    resultPage: document.getElementById('result-page'),
    startBtn: document.getElementById('start-btn'),
    stageTitle: document.getElementById('stage-title'),
    stageDesc: document.getElementById('stage-desc'),
    stageHint: document.getElementById('stage-hint'),
    selectedCount: document.getElementById('selected-count'),
    vanishedCount: document.getElementById('vanished-count'),
    wishesGrid: document.getElementById('wishes-grid'),
    nextStageBtn: document.getElementById('next-stage-btn'),
    resultList: document.getElementById('result-list'),
    finalSelected: document.getElementById('final-selected'),
    finalVanished: document.getElementById('final-vanished'),
    finalRemaining: document.getElementById('final-remaining'),
    lifeQuote: document.getElementById('life-quote'),
    restartBtn: document.getElementById('restart-btn'),
    particlesContainer: document.getElementById('particles-container')
};

// 初始化
function init() {
    dom.startBtn.addEventListener('click', startJourney);
    dom.nextStageBtn.addEventListener('click', goNextStage);
    dom.restartBtn.addEventListener('click', restart);
    
    // 使用事件委托处理愿望点击
    dom.wishesGrid.addEventListener('click', handleWishClick);
}

// 开始旅程
function startJourney() {
    switchPage(dom.introPage, dom.wishPage);
    loadStage(0);
}

// 页面切换
function switchPage(from, to) {
    from.classList.remove('active');
    setTimeout(() => {
        to.classList.add('active');
    }, 400);
}

// 加载阶段
function loadStage(stageIndex) {
    const stage = stages[stageIndex];
    state.currentStage = stageIndex;
    
    // 更新标题信息
    dom.stageTitle.textContent = stage.title;
    dom.stageDesc.textContent = stage.subtitle;
    
    // 更新提示
    const hints = [
        '选择你童年最渴望的事物，但要记住——每个选择都有代价',
        '青春只有一次，你会如何度过？',
        '成年后的选择更加沉重，三思而后行',
        '人到中年，你最珍视什么？',
        '人生的最后篇章，什么才是最重要的？'
    ];
    dom.stageHint.textContent = hints[stageIndex];
    
    // 更新进度点
    document.querySelectorAll('.stage-dot').forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (i < stageIndex) dot.classList.add('completed');
        if (i === stageIndex) dot.classList.add('active');
    });
    
    // 更新按钮文字
    if (stageIndex === 4) {
        dom.nextStageBtn.textContent = '查看人生清单 →';
    } else {
        dom.nextStageBtn.textContent = '下一阶段 →';
    }
    
    // 渲染愿望
    renderWishes(stage);
}

// 渲染愿望按钮
function renderWishes(stage) {
    dom.wishesGrid.innerHTML = '';
    
    stage.wishes.forEach((wish, index) => {
        const btn = document.createElement('button');
        btn.className = 'wish-btn appearing';
        btn.dataset.wishId = wish.id;
        btn.style.animationDelay = `${index * 0.05}s`;
        
        btn.innerHTML = `
            <span class="wish-emoji">${wish.emoji}</span>
            <span class="wish-text">${wish.text}</span>
        `;
        
        // 如果之前已选择过（回退时）
        if (state.selectedWishes.has(wish.id)) {
            btn.classList.add('selected');
        }
        
        dom.wishesGrid.appendChild(btn);
    });
}

// 处理愿望点击（事件委托）
function handleWishClick(e) {
    const btn = e.target.closest('.wish-btn');
    if (!btn || btn.classList.contains('vanished') || btn.classList.contains('vanishing')) return;
    
    const wishId = btn.dataset.wishId;
    
    if (state.selectedWishes.has(wishId)) {
        // 取消选择
        deselectWish(btn, wishId);
    } else {
        // 选择愿望
        selectWish(btn, wishId);
    }
    
    updateCounters();
}

// 选择愿望
function selectWish(btn, wishId) {
    state.selectedWishes.add(wishId);
    btn.classList.add('selected');
    
    // 添加涟漪效果
    createRipple(btn);
    
    // 随机消失其他愿望（每选一个，消失1-2个）
    const vanishCount = Math.random() > 0.5 ? 2 : 1;
    vanishRandomWishes(wishId, vanishCount);
}

// 取消选择
function deselectWish(btn, wishId) {
    state.selectedWishes.delete(wishId);
    btn.classList.remove('selected');
}

// 随机消失愿望
function vanishRandomWishes(excludeId, count) {
    const availableBtns = Array.from(dom.wishesGrid.querySelectorAll('.wish-btn'))
        .filter(btn => {
            const id = btn.dataset.wishId;
            return id !== excludeId && 
                   !state.selectedWishes.has(id) && 
                   !state.vanishedWishes.has(id) &&
                   !btn.classList.contains('vanished') &&
                   !btn.classList.contains('vanishing');
        });
    
    if (availableBtns.length === 0) return;
    
    // 随机打乱并取前count个
    const shuffled = availableBtns.sort(() => Math.random() - 0.5);
    const toVanish = shuffled.slice(0, Math.min(count, shuffled.length));
    
    toVanish.forEach((btn, i) => {
        setTimeout(() => {
            const id = btn.dataset.wishId;
            state.vanishedWishes.add(id);
            
            // 创建粒子效果
            createParticles(btn);
            
            // 添加消失动画
            btn.classList.add('vanishing');
            
            setTimeout(() => {
                btn.classList.remove('vanishing');
                btn.classList.add('vanished');
                btn.innerHTML = `<span class="wish-text" style="opacity:0.15; font-size:11px;">已消逝</span>`;
                updateCounters();
            }, 800);
        }, i * 200);
    });
}

// 创建涟漪效果
function createRipple(btn) {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    ripple.style.left = '50%';
    ripple.style.top = '50%';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// 创建粒子效果
function createParticles(btn) {
    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const angle = (Math.PI * 2 * i) / 8;
        const distance = 30 + Math.random() * 50;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');
        particle.style.background = `hsl(${Math.random() * 60 + 340}, 80%, 60%)`;
        
        dom.particlesContainer.appendChild(particle);
        setTimeout(() => particle.remove(), 1000);
    }
}

// 更新计数器
function updateCounters() {
    dom.selectedCount.textContent = state.selectedWishes.size;
    dom.vanishedCount.textContent = state.vanishedWishes.size;
}

// 进入下一阶段
function goNextStage() {
    if (state.currentStage < 4) {
        // 显示过渡动画
        showStageTransition(state.currentStage + 1, () => {
            loadStage(state.currentStage + 1);
        });
    } else {
        // 最后一个阶段，显示结果
        showResults();
    }
}

// 阶段过渡动画
function showStageTransition(nextStageIndex, callback) {
    const stage = stages[nextStageIndex];
    
    // 创建过渡遮罩
    const overlay = document.createElement('div');
    overlay.className = 'stage-transition-overlay';
    overlay.innerHTML = `
        <h3>${stage.title}</h3>
        <p>${stage.subtitle}</p>
    `;
    document.body.appendChild(overlay);
    
    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });
    
    setTimeout(() => {
        callback();
        setTimeout(() => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 500);
        }, 300);
    }, 1500);
}

// 显示结果
function showResults() {
    switchPage(dom.wishPage, dom.resultPage);
    
    const totalWishes = 100;
    const selectedCount = state.selectedWishes.size;
    const vanishedCount = state.vanishedWishes.size;
    const remainingCount = totalWishes - selectedCount - vanishedCount;
    
    // 动画显示数字
    animateNumber(dom.finalSelected, selectedCount, 1500);
    animateNumber(dom.finalVanished, vanishedCount, 1500);
    animateNumber(dom.finalRemaining, remainingCount, 1500);
    
    // 渲染每个阶段的结果
    dom.resultList.innerHTML = '';
    
    stages.forEach((stage, index) => {
        const stageDiv = document.createElement('div');
        stageDiv.className = 'result-stage';
        stageDiv.style.animationDelay = `${index * 0.2}s`;
        
        let wishesHtml = '';
        stage.wishes.forEach(wish => {
            let statusClass = 'untouched';
            let statusIcon = '';
            
            if (state.selectedWishes.has(wish.id)) {
                statusClass = 'selected';
                statusIcon = '✓ ';
            } else if (state.vanishedWishes.has(wish.id)) {
                statusClass = 'vanished';
                statusIcon = '✗ ';
            }
            
            wishesHtml += `
                <span class="result-wish ${statusClass}">
                    ${wish.emoji} ${statusIcon}${wish.text}
                </span>
            `;
        });
        
        stageDiv.innerHTML = `
            <div class="result-stage-title" style="color: ${stage.color}">
                ${stage.title} <span style="font-size: 0.8rem; opacity: 0.6;">${stage.subtitle}</span>
            </div>
            <div class="flex flex-wrap">
                ${wishesHtml}
            </div>
        `;
        
        dom.resultList.appendChild(stageDiv);
    });
    
    // 随机选择一句感悟
    const quoteIndex = Math.floor(Math.random() * lifeQuotes.length);
    dom.lifeQuote.textContent = `"${lifeQuotes[quoteIndex]}"`;
}

// 数字动画
function animateNumber(element, target, duration) {
    const start = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 缓动函数
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (target - start) * eased);
        
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// 重新开始
function restart() {
    state.currentStage = 0;
    state.selectedWishes.clear();
    state.vanishedWishes.clear();
    state.stageSelections = {};
    state.totalSelected = 0;
    state.totalVanished = 0;
    
    updateCounters();
    
    switchPage(dom.resultPage, dom.introPage);
}

// 启动应用
init();

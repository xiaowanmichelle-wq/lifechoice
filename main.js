import { stages, lifeQuotes, traitDimensions, personalityTypes } from './data.js';

// 配置常量
const MAX_SELECTIONS_PER_STAGE = 5;

// 应用状态
const state = {
    currentStage: 0,
    selectedWishes: new Set(),    // 已选择的愿望ID
    vanishedWishes: new Set(),    // 已消失的愿望ID
    triggeredVanish: new Set(),   // 已经触发过消失效果的愿望ID（防止反复选择/取消重复触发）
    stageSelections: {},          // 每个阶段的选择计数
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
    stageLimit: document.getElementById('stage-limit'),
    wishesGrid: document.getElementById('wishes-grid'),
    nextStageBtn: document.getElementById('next-stage-btn'),
    resultList: document.getElementById('result-list'),
    finalSelected: document.getElementById('final-selected'),
    finalVanished: document.getElementById('final-vanished'),
    finalRemaining: document.getElementById('final-remaining'),
    lifeQuote: document.getElementById('life-quote'),
    restartBtn: document.getElementById('restart-btn'),
    saveImageBtn: document.getElementById('save-image-btn'),
    particlesContainer: document.getElementById('particles-container')
};

// 初始化
function init() {
    dom.startBtn.addEventListener('click', startJourney);
    dom.nextStageBtn.addEventListener('click', goNextStage);
    dom.restartBtn.addEventListener('click', restart);
    dom.saveImageBtn.addEventListener('click', saveAsImage);
    
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
        // 结果页面需要滚动到顶部
        if (to === dom.resultPage) {
            to.scrollTop = 0;
        }
    }, 400);
}

// 获取当前阶段已选数量
function getCurrentStageSelectedCount() {
    const stage = stages[state.currentStage];
    let count = 0;
    stage.wishes.forEach(wish => {
        if (state.selectedWishes.has(wish.id)) count++;
    });
    return count;
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
    updateCounters();
    updateStageLimit();
}

// 更新阶段选择限制显示
function updateStageLimit() {
    const count = getCurrentStageSelectedCount();
    dom.stageLimit.textContent = `${count}/${MAX_SELECTIONS_PER_STAGE}`;
    if (count >= MAX_SELECTIONS_PER_STAGE) {
        dom.stageLimit.classList.add('limit-reached');
    } else {
        dom.stageLimit.classList.remove('limit-reached');
    }
}

// 渲染愿望按钮
function renderWishes(stage) {
    dom.wishesGrid.innerHTML = '';
    
    stage.wishes.forEach((wish, index) => {
        const btn = document.createElement('button');
        btn.className = 'wish-btn appearing';
        btn.dataset.wishId = wish.id;
        btn.style.animationDelay = `${index * 0.05}s`;
        
        // 检查是否已消失
        if (state.vanishedWishes.has(wish.id)) {
            btn.className = 'wish-btn vanished';
            btn.innerHTML = `<span class="wish-text" style="opacity:0.15; font-size:11px;">已消逝</span>`;
            dom.wishesGrid.appendChild(btn);
            return;
        }
        
        btn.innerHTML = `
            <span class="wish-emoji">${wish.emoji}</span>
            <span class="wish-text">${wish.text}</span>
        `;
        
        // 如果之前已选择过
        if (state.selectedWishes.has(wish.id)) {
            btn.classList.add('selected');
        }
        
        // 如果已达上限且未选中，显示禁用状态
        const stageCount = getCurrentStageSelectedCount();
        if (stageCount >= MAX_SELECTIONS_PER_STAGE && !state.selectedWishes.has(wish.id)) {
            btn.classList.add('limit-disabled');
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
        // 检查是否达到上限
        const stageCount = getCurrentStageSelectedCount();
        if (stageCount >= MAX_SELECTIONS_PER_STAGE) {
            // 显示上限提示动画
            showLimitWarning();
            return;
        }
        // 选择愿望
        selectWish(btn, wishId);
    }
    
    updateCounters();
    updateStageLimit();
    updateDisabledState();
}

// 显示上限提示
function showLimitWarning() {
    const warning = document.getElementById('limit-warning');
    if (warning) {
        warning.classList.remove('show');
        void warning.offsetWidth; // 强制回流
        warning.classList.add('show');
    }
}

// 更新禁用状态
function updateDisabledState() {
    const stageCount = getCurrentStageSelectedCount();
    const allBtns = dom.wishesGrid.querySelectorAll('.wish-btn');
    allBtns.forEach(btn => {
        const id = btn.dataset.wishId;
        if (stageCount >= MAX_SELECTIONS_PER_STAGE && !state.selectedWishes.has(id)) {
            btn.classList.add('limit-disabled');
        } else {
            btn.classList.remove('limit-disabled');
        }
    });
}

// 选择愿望
function selectWish(btn, wishId) {
    state.selectedWishes.add(wishId);
    btn.classList.add('selected');
    
    // 添加涟漪效果
    createRipple(btn);
    
    // 只有首次选择该愿望时才触发消失效果，防止反复选择/取消重复触发
    if (!state.triggeredVanish.has(wishId)) {
        state.triggeredVanish.add(wishId);
        
        // 计算消失数量：选的越多，消失的越多
        const stageCount = getCurrentStageSelectedCount();
        // 基础消失2个，每多选一个额外增加1个消失
        const vanishCount = 2 + Math.floor(stageCount / 2);
        vanishRandomWishes(wishId, vanishCount);
    }
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
        }, i * 150);
    });
}

// 创建涟漪效果
function createRipple(btn) {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
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

// 生成阶段故事文字（将选择串联成一段话）
function generateStageStory(stage, selectedWishes) {
    const stageSelected = stage.wishes.filter(w => selectedWishes.has(w.id));
    if (stageSelected.length === 0) {
        return '这个阶段，你没有做出任何选择，一切都在沉默中流逝……';
    }
    
    const storyTemplates = {
        0: (wishes) => {
            const items = wishes.map(w => `<span class="story-highlight">${w.emoji} ${w.text}</span>`);
            if (items.length === 1) return `在童年的时光里，你最珍视的是${items[0]}。那些纯真的日子，因为这个选择而变得温暖。`;
            if (items.length === 2) return `童年的你，拥有了${items[0]}，也得到了${items[1]}。这两份礼物，照亮了你最初的岁月。`;
            return `在那段无忧无虑的童年里，你选择了${items.slice(0, -1).join('、')}，还有${items[items.length - 1]}。这些美好的记忆，成为了你一生的底色。`;
        },
        1: (wishes) => {
            const items = wishes.map(w => `<span class="story-highlight">${w.emoji} ${w.text}</span>`);
            if (items.length === 1) return `青春年华中，你全力以赴去追求${items[0]}。那段燃烧的岁月，只为这一个梦想。`;
            if (items.length === 2) return `在青春的十字路口，你选择了${items[0]}，同时也拥抱了${items[1]}。热血与汗水，铸就了你的少年时代。`;
            return `青春是一场盛大的冒险。你追逐着${items.slice(0, -1).join('、')}，最终还收获了${items[items.length - 1]}。每一步都算数。`;
        },
        2: (wishes) => {
            const items = wishes.map(w => `<span class="story-highlight">${w.emoji} ${w.text}</span>`);
            if (items.length === 1) return `而立之年，你把所有的赌注押在了${items[0]}上。这是一个沉重而坚定的选择。`;
            if (items.length === 2) return `步入而立之年，你努力实现${items[0]}，也在追寻${items[1]}。成年人的世界里，每一步都需要勇气。`;
            return `在人生最关键的十字路口，你选择了${items.slice(0, -1).join('、')}，以及${items[items.length - 1]}。这些选择，定义了你的人生轨迹。`;
        },
        3: (wishes) => {
            const items = wishes.map(w => `<span class="story-highlight">${w.emoji} ${w.text}</span>`);
            if (items.length === 1) return `不惑之年，你终于明白${items[0]}才是最重要的。岁月沉淀出了智慧。`;
            if (items.length === 2) return `人到中年，你守护着${items[0]}，也珍惜着${items[1]}。这是你用半生换来的领悟。`;
            return `在沉淀与收获的季节里，你拥有了${items.slice(0, -1).join('、')}，还有${items[items.length - 1]}。这些，就是你最珍贵的财富。`;
        },
        4: (wishes) => {
            const items = wishes.map(w => `<span class="story-highlight">${w.emoji} ${w.text}</span>`);
            if (items.length === 1) return `花甲之年，你最终选择了${items[0]}。回首一生，这便是最好的归宿。`;
            if (items.length === 2) return `在人生的黄昏，你拥有${items[0]}和${items[1]}。夕阳下的从容，是一生最美的风景。`;
            return `走过漫长的人生旅途，你最终拥有了${items.slice(0, -1).join('、')}，以及${items[items.length - 1]}。这一生，值得。`;
        }
    };
    
    return storyTemplates[stage.id](stageSelected);
}

// 生成散落的消失愿望
function generateScatteredVanished(stage, vanishedWishes) {
    const stageVanished = stage.wishes.filter(w => vanishedWishes.has(w.id));
    if (stageVanished.length === 0) return '';
    
    // 为每个消失的愿望生成随机位置和角度
    let html = '<div class="scattered-wishes">';
    stageVanished.forEach((wish, i) => {
        const offsetX = (Math.random() - 0.5) * 80; // -40% ~ 40%
        const offsetY = Math.random() * 30 + 5;      // 5 ~ 35px
        const rotate = (Math.random() - 0.5) * 16;   // -8 ~ 8deg
        const opacity = 0.15 + Math.random() * 0.15;  // 0.15 ~ 0.30
        const fontSize = 11 + Math.random() * 3;      // 11 ~ 14px
        const delay = i * 0.15;
        
        html += `<span class="scattered-wish" style="
            --scatter-x: ${offsetX}%;
            --scatter-y: ${offsetY}px;
            --scatter-rotate: ${rotate}deg;
            --scatter-opacity: ${opacity};
            --scatter-size: ${fontSize}px;
            animation-delay: ${delay}s;
        ">${wish.emoji} ${wish.text}</span>`;
    });
    html += '</div>';
    return html;
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
    
    // 渲染时间轴
    dom.resultList.innerHTML = '';
    
    // 时间轴线
    const timelineInner = document.createElement('div');
    timelineInner.className = 'timeline';
    
    stages.forEach((stage, index) => {
        const node = document.createElement('div');
        node.className = 'timeline-node';
        node.style.animationDelay = `${index * 0.3}s`;
        
        // 阶段选中的愿望
        const stageSelected = stage.wishes.filter(w => state.selectedWishes.has(w.id));
        
        // 生成故事文字
        const storyText = generateStageStory(stage, state.selectedWishes);
        
        // 生成散落的消失愿望
        const scatteredHtml = generateScatteredVanished(stage, state.vanishedWishes);
        
        // 选中愿望的高亮标签
        let selectedTagsHtml = '';
        if (stageSelected.length > 0) {
            selectedTagsHtml = '<div class="timeline-selected-tags">';
            stageSelected.forEach(w => {
                selectedTagsHtml += `<span class="timeline-tag">${w.emoji} ${w.text}</span>`;
            });
            selectedTagsHtml += '</div>';
        }
        
        node.innerHTML = `
            <div class="timeline-dot" style="--dot-color: ${stage.color}"></div>
            <div class="timeline-content">
                <div class="timeline-stage-label" style="color: ${stage.color}">
                    ${stage.title}
                    <span class="timeline-age">${stage.subtitle}</span>
                </div>
                ${selectedTagsHtml}
                <div class="timeline-story">${storyText}</div>
                ${scatteredHtml}
            </div>
        `;
        
        timelineInner.appendChild(node);
    });
    
    dom.resultList.appendChild(timelineInner);
    
    // ========== 人格分析 ==========
    const personalityScores = calculatePersonalityScores();
    const personalityType = matchPersonalityType(personalityScores);
    
    // 渲染人格分析卡片
    const personalityContainer = document.getElementById('personality-result');
    if (personalityContainer) {
        personalityContainer.innerHTML = generatePersonalityHtml(personalityScores, personalityType);
        
        // 延迟触发进度条动画
        setTimeout(() => {
            personalityContainer.querySelectorAll('.trait-bar-fill').forEach(bar => {
                bar.style.width = bar.dataset.width + '%';
            });
        }, 800);
    }
    
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

// 保存为图片 - 兼容微信浏览器，使用弹窗展示图片+长按保存方案
function saveAsImage() {
    const btn = dom.saveImageBtn;
    btn.textContent = '正在生成图片...';
    btn.disabled = true;
    
    // 创建一个完全独立的离屏容器，不受页面布局影响
    const offscreen = document.createElement('div');
    offscreen.id = 'offscreen-capture';
    offscreen.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        background: #0a0a1a;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif;
        padding: 48px 40px;
        z-index: -1;
        overflow: visible;
    `;
    
    // 构建截图内容 - 纯HTML/内联样式，不依赖CSS文件中的复杂规则
    let captureHtml = '';
    
    // 标题区
    captureHtml += `
        <div style="text-align: center; margin-bottom: 40px;">
            <h2 style="font-family: 'Noto Serif SC', serif; font-size: 36px; font-weight: 700; margin-bottom: 10px;
                background: linear-gradient(135deg, #c084fc, #f472b6, #fb923c); -webkit-background-clip: text; 
                -webkit-text-fill-color: transparent; background-clip: text;">
                你的人生旅途
            </h2>
            <p style="color: #9ca3af; font-size: 15px; margin-bottom: 12px;">每一个选择，都写就了独一无二的你</p>
            <div style="width: 60px; height: 2px; background: linear-gradient(to right, #a855f7, #ec4899); margin: 0 auto;"></div>
        </div>
    `;
    
    // 统计区
    const totalWishes = 100;
    const selectedCount = state.selectedWishes.size;
    const vanishedCount = state.vanishedWishes.size;
    const remainingCount = totalWishes - selectedCount - vanishedCount;
    
    captureHtml += `
        <div style="display: flex; justify-content: center; gap: 48px; margin-bottom: 40px;">
            <div style="text-align: center;">
                <p style="font-size: 36px; font-weight: 700; color: #a78bfa;">${selectedCount}</p>
                <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">你的选择</p>
            </div>
            <div style="text-align: center;">
                <p style="font-size: 36px; font-weight: 700; color: #f87171;">${vanishedCount}</p>
                <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">代价</p>
            </div>
            <div style="text-align: center;">
                <p style="font-size: 36px; font-weight: 700; color: #9ca3af;">${remainingCount}</p>
                <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">未曾触及</p>
            </div>
        </div>
    `;
    
    // 人格分析（截图版）- 放在时间轴之前
    const imgScores = calculatePersonalityScores();
    const imgType = matchPersonalityType(imgScores);
    captureHtml += generatePersonalityImageHtml(imgScores, imgType);
    
    // 时间轴区
    const stageColors = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];
    captureHtml += `<div style="position: relative; padding-left: 45px; margin-bottom: 40px;">`;
    
    // 时间轴竖线 - 用渐变色
    captureHtml += `<div style="position: absolute; left: 17px; top: 0; bottom: 0; width: 2px; 
        background: linear-gradient(to bottom, ${stageColors.join(', ')});"></div>`;
    
    stages.forEach((stage, index) => {
        const stageSelected = stage.wishes.filter(w => state.selectedWishes.has(w.id));
        const stageVanished = stage.wishes.filter(w => state.vanishedWishes.has(w.id));
        const color = stageColors[index];
        
        // 生成故事文字（纯文本版本，用于截图）
        const storyText = generateStageStoryPlainHtml(stage, state.selectedWishes);
        
        // 选中的愿望标签
        let tagsHtml = '';
        if (stageSelected.length > 0) {
            tagsHtml = '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px;">';
            stageSelected.forEach(w => {
                tagsHtml += `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 12px; 
                    border-radius: 20px; font-size: 13px; background: rgba(124, 58, 237, 0.2); 
                    border: 1px solid rgba(124, 58, 237, 0.4); color: #c4b5fd;">${w.emoji} ${w.text}</span>`;
            });
            tagsHtml += '</div>';
        }
        
        // 消失的愿望
        let vanishedHtml = '';
        if (stageVanished.length > 0) {
            vanishedHtml = '<div style="display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 16px; justify-content: center;">';
            stageVanished.forEach(w => {
                const rotate = ((Math.random() - 0.5) * 12).toFixed(1);
                const opacity = (0.2 + Math.random() * 0.15).toFixed(2);
                vanishedHtml += `<span style="font-size: 12px; color: rgba(156, 163, 175, ${opacity}); 
                    text-decoration: line-through; text-decoration-color: rgba(239, 68, 68, 0.25);
                    transform: rotate(${rotate}deg); display: inline-block;">${w.emoji} ${w.text}</span>`;
            });
            vanishedHtml += '</div>';
        }
        
        const marginBottom = index < 4 ? '40px' : '0';
        
        captureHtml += `
            <div style="position: relative; margin-bottom: ${marginBottom};">
                <div style="position: absolute; left: -36px; top: 4px; width: 14px; height: 14px; border-radius: 50%; 
                    background: ${color}; box-shadow: 0 0 10px ${color}; border: 2px solid #0a0a1a;"></div>
                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); 
                    border-radius: 14px; padding: 22px;">
                    <div style="font-family: 'Noto Serif SC', serif; font-size: 20px; font-weight: 700; 
                        color: ${color}; margin-bottom: 12px;">
                        ${stage.title}
                        <span style="font-size: 12px; opacity: 0.5; font-weight: 400; margin-left: 8px;">${stage.subtitle}</span>
                    </div>
                    ${tagsHtml}
                    <div style="font-size: 14px; line-height: 1.9; color: #b0b8c8;">${storyText}</div>
                    ${vanishedHtml}
                </div>
            </div>
        `;
    });
    
    captureHtml += '</div>';
    
    // 感悟
    const quoteText = dom.lifeQuote.textContent;
    captureHtml += `
        <div style="text-align: center; margin-bottom: 32px; padding: 0 20px;">
            <p style="font-size: 15px; color: #9ca3af; font-style: italic; line-height: 1.8;">${quoteText}</p>
        </div>
    `;
    
    // 签名
    captureHtml += `
        <div style="text-align: center; color: #4b5563; font-size: 13px;">
            <p>本应用由@在路上的kairo 制作，由With通过自然语言生成</p>
        </div>
    `;
    
    offscreen.innerHTML = captureHtml;
    document.body.appendChild(offscreen);
    
    // 等待字体和内容渲染完成
    setTimeout(() => {
        if (typeof html2canvas !== 'undefined') {
            html2canvas(offscreen, {
                backgroundColor: '#0a0a1a',
                scale: 2,
                useCORS: true,
                logging: false,
                width: offscreen.scrollWidth,
                height: offscreen.scrollHeight,
            }).then(canvas => {
                // 清理离屏元素
                document.body.removeChild(offscreen);
                
                // 将 canvas 转为 blob，再转为 blob URL 用于展示
                canvas.toBlob((blob) => {
                    if (!blob) {
                        // fallback: 使用 dataURL
                        showImagePreview(canvas.toDataURL('image/png'));
                        return;
                    }
                    const blobUrl = URL.createObjectURL(blob);
                    showImagePreview(blobUrl);
                }, 'image/png');
                
                btn.textContent = '保存为图片 📷';
                btn.disabled = false;
            }).catch((err) => {
                console.error('截图失败:', err);
                document.body.removeChild(offscreen);
                btn.textContent = '生成失败，请重试';
                btn.disabled = false;
                setTimeout(() => { btn.textContent = '保存为图片 📷'; }, 2000);
            });
        } else {
            document.body.removeChild(offscreen);
            btn.textContent = '保存为图片 📷';
            btn.disabled = false;
        }
    }, 500);
}

// 展示生成的图片预览弹窗（兼容微信浏览器长按保存）
function showImagePreview(imageSrc) {
    // 移除之前可能存在的弹窗
    const existingModal = document.getElementById('image-preview-modal');
    if (existingModal) existingModal.remove();
    
    // 创建全屏弹窗
    const modal = document.createElement('div');
    modal.id = 'image-preview-modal';
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.92);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding: 20px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        animation: modal-fade-in 0.3s ease;
    `;
    
    // 顶部提示栏
    const topBar = document.createElement('div');
    topBar.style.cssText = `
        width: 100%;
        max-width: 600px;
        text-align: center;
        margin-bottom: 16px;
        flex-shrink: 0;
    `;
    topBar.innerHTML = `
        <p style="color: #e2e8f0; font-size: 16px; font-weight: 600; margin-bottom: 6px;">📷 图片已生成</p>
        <p style="color: #9ca3af; font-size: 13px;">长按下方图片即可保存到手机相册</p>
    `;
    modal.appendChild(topBar);
    
    // 图片容器
    const imgContainer = document.createElement('div');
    imgContainer.style.cssText = `
        width: 100%;
        max-width: 600px;
        flex-shrink: 0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
        margin-bottom: 20px;
    `;
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.style.cssText = `
        width: 100%;
        display: block;
        -webkit-touch-callout: default;
        -webkit-user-select: auto;
        user-select: auto;
    `;
    img.alt = '我的人生愿望清单';
    imgContainer.appendChild(img);
    modal.appendChild(imgContainer);
    
    // 底部按钮区域
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
        display: flex;
        gap: 12px;
        flex-shrink: 0;
        flex-wrap: wrap;
        justify-content: center;
        margin-bottom: 20px;
    `;
    
    // 尝试下载按钮（非微信环境可用）
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '下载图片 ⬇️';
    downloadBtn.style.cssText = `
        padding: 12px 28px;
        border-radius: 25px;
        border: none;
        background: linear-gradient(135deg, #059669, #0d9488);
        color: white;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 0 15px rgba(5, 150, 105, 0.3);
    `;
    downloadBtn.addEventListener('click', () => {
        // 尝试用 <a download> 下载
        try {
            const link = document.createElement('a');
            link.download = '我的人生愿望清单.png';
            link.href = imageSrc;
            link.click();
        } catch(e) {
            // 如果失败，提示用户长按保存
            alert('当前浏览器不支持直接下载，请长按图片保存');
        }
    });
    btnContainer.appendChild(downloadBtn);
    
    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭 ✕';
    closeBtn.style.cssText = `
        padding: 12px 28px;
        border-radius: 25px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        background: transparent;
        color: #e2e8f0;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
    `;
    closeBtn.addEventListener('click', () => {
        modal.style.animation = 'modal-fade-out 0.3s ease forwards';
        setTimeout(() => {
            modal.remove();
            // 释放blob URL
            if (imageSrc.startsWith('blob:')) {
                URL.revokeObjectURL(imageSrc);
            }
        }, 300);
    });
    btnContainer.appendChild(closeBtn);
    
    modal.appendChild(btnContainer);
    
    // 点击弹窗背景关闭（但点击图片不关闭）
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeBtn.click();
        }
    });
    
    document.body.appendChild(modal);
}

// 为截图生成故事HTML（使用内联样式的高亮）
function generateStageStoryPlainHtml(stage, selectedWishes) {
    const stageSelected = stage.wishes.filter(w => selectedWishes.has(w.id));
    if (stageSelected.length === 0) {
        return '这个阶段，你没有做出任何选择，一切都在沉默中流逝……';
    }
    
    const makeHighlight = (w) => `<span style="color: #e0d4fc; font-weight: 600; padding: 2px 6px; background: rgba(124, 58, 237, 0.15); border-radius: 5px;">${w.emoji} ${w.text}</span>`;
    
    const storyTemplates = {
        0: (wishes) => {
            const items = wishes.map(makeHighlight);
            if (items.length === 1) return `在童年的时光里，你最珍视的是${items[0]}。那些纯真的日子，因为这个选择而变得温暖。`;
            if (items.length === 2) return `童年的你，拥有了${items[0]}，也得到了${items[1]}。这两份礼物，照亮了你最初的岁月。`;
            return `在那段无忧无虑的童年里，你选择了${items.slice(0, -1).join('、')}，还有${items[items.length - 1]}。这些美好的记忆，成为了你一生的底色。`;
        },
        1: (wishes) => {
            const items = wishes.map(makeHighlight);
            if (items.length === 1) return `青春年华中，你全力以赴去追求${items[0]}。那段燃烧的岁月，只为这一个梦想。`;
            if (items.length === 2) return `在青春的十字路口，你选择了${items[0]}，同时也拥抱了${items[1]}。热血与汗水，铸就了你的少年时代。`;
            return `青春是一场盛大的冒险。你追逐着${items.slice(0, -1).join('、')}，最终还收获了${items[items.length - 1]}。每一步都算数。`;
        },
        2: (wishes) => {
            const items = wishes.map(makeHighlight);
            if (items.length === 1) return `而立之年，你把所有的赌注押在了${items[0]}上。这是一个沉重而坚定的选择。`;
            if (items.length === 2) return `步入而立之年，你努力实现${items[0]}，也在追寻${items[1]}。成年人的世界里，每一步都需要勇气。`;
            return `在人生最关键的十字路口，你选择了${items.slice(0, -1).join('、')}，以及${items[items.length - 1]}。这些选择，定义了你的人生轨迹。`;
        },
        3: (wishes) => {
            const items = wishes.map(makeHighlight);
            if (items.length === 1) return `不惑之年，你终于明白${items[0]}才是最重要的。岁月沉淀出了智慧。`;
            if (items.length === 2) return `人到中年，你守护着${items[0]}，也珍惜着${items[1]}。这是你用半生换来的领悟。`;
            return `在沉淀与收获的季节里，你拥有了${items.slice(0, -1).join('、')}，还有${items[items.length - 1]}。这些，就是你最珍贵的财富。`;
        },
        4: (wishes) => {
            const items = wishes.map(makeHighlight);
            if (items.length === 1) return `花甲之年，你最终选择了${items[0]}。回首一生，这便是最好的归宿。`;
            if (items.length === 2) return `在人生的黄昏，你拥有${items[0]}和${items[1]}。夕阳下的从容，是一生最美的风景。`;
            return `走过漫长的人生旅途，你最终拥有了${items.slice(0, -1).join('、')}，以及${items[items.length - 1]}。这一生，值得。`;
        }
    };
    
    return storyTemplates[stage.id](stageSelected);
}

// ========== 人格分析系统 ==========

// 计算人格维度得分
function calculatePersonalityScores() {
    const scores = { O: 0, C: 0, E: 0, A: 0, N: 0 };
    let count = 0;
    
    // 遍历所有阶段，累加已选愿望的人格得分
    stages.forEach(stage => {
        stage.wishes.forEach(wish => {
            if (state.selectedWishes.has(wish.id) && wish.traits) {
                Object.keys(scores).forEach(key => {
                    scores[key] += wish.traits[key] || 0;
                });
                count++;
            }
        });
    });
    
    // 归一化到 0~1 范围
    if (count > 0) {
        const maxPossible = count * 2; // 每个维度最高+2
        Object.keys(scores).forEach(key => {
            // 将 [-2*count, +2*count] 映射到 [0, 1]
            scores[key] = (scores[key] + maxPossible) / (2 * maxPossible);
            scores[key] = Math.max(0, Math.min(1, scores[key]));
        });
    }
    
    return scores;
}

// 匹配人格类型
function matchPersonalityType(scores) {
    // 按优先级遍历人格类型，返回第一个匹配的
    for (const type of personalityTypes) {
        if (type.id === 'balanced') continue; // 跳过默认类型
        if (type.condition(scores)) {
            return type;
        }
    }
    // 如果都不匹配，返回默认的"均衡者"
    return personalityTypes.find(t => t.id === 'balanced');
}

// 获取前两个最突出的维度
function getTopDimensions(scores) {
    const sorted = Object.entries(scores)
        .sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 2).map(([key, value]) => ({
        key,
        value,
        ...traitDimensions[key]
    }));
}

// 生成人格分析HTML（用于页面展示）
function generatePersonalityHtml(scores, personalityType) {
    const topDims = getTopDimensions(scores);
    
    // 雷达图数据（用CSS实现简化版）
    const dims = ['O', 'C', 'E', 'A', 'N'];
    const radarBars = dims.map(key => {
        const dim = traitDimensions[key];
        const pct = Math.round(scores[key] * 100);
        return `
            <div class="trait-bar-item">
                <div class="trait-bar-label">
                    <span class="trait-bar-icon">${dim.icon}</span>
                    <span class="trait-bar-name">${dim.name}</span>
                    <span class="trait-bar-pct">${pct}%</span>
                </div>
                <div class="trait-bar-track">
                    <div class="trait-bar-fill" style="width: ${pct}%; background: ${dim.color}; --bar-color: ${dim.color};" data-width="${pct}"></div>
                </div>
            </div>
        `;
    }).join('');
    
    // 人格标签
    const tagsHtml = personalityType.tags.map(tag =>
        `<span class="personality-tag">${tag}</span>`
    ).join('');
    
    // 突出维度描述
    const topDimDesc = topDims.map(d =>
        `<span class="top-dim-badge" style="--dim-color: ${d.color};">${d.icon} ${d.name}</span>`
    ).join('');
    
    return `
        <div class="personality-card">
            <div class="personality-header">
                <div class="personality-emoji">${personalityType.emoji}</div>
                <div class="personality-title-area">
                    <h3 class="personality-name">${personalityType.name}</h3>
                    <p class="personality-subtitle">${personalityType.subtitle}</p>
                </div>
            </div>
            
            <div class="personality-desc">
                <p>${personalityType.description}</p>
            </div>
            
            <div class="personality-tags-area">
                ${tagsHtml}
            </div>
            
            <div class="personality-dims-title">
                <span>你的人格画像</span>
                <span class="top-dims-label">突出维度：${topDimDesc}</span>
            </div>
            
            <div class="trait-bars">
                ${radarBars}
            </div>
            
            <div class="personality-advice">
                <div class="advice-icon">💡</div>
                <p>${personalityType.advice}</p>
            </div>
        </div>
    `;
}

// 生成人格分析HTML（用于截图，内联样式版本）
function generatePersonalityImageHtml(scores, personalityType) {
    const dims = ['O', 'C', 'E', 'A', 'N'];
    const topDims = getTopDimensions(scores);
    
    // 维度条
    const barsHtml = dims.map(key => {
        const dim = traitDimensions[key];
        const pct = Math.round(scores[key] * 100);
        return `
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 13px; color: #d1d5db;">${dim.icon} ${dim.name}</span>
                    <span style="font-size: 12px; color: #9ca3af;">${pct}%</span>
                </div>
                <div style="height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${pct}%; background: ${dim.color}; border-radius: 4px;"></div>
                </div>
            </div>
        `;
    }).join('');
    
    // 标签
    const tagsHtml = personalityType.tags.map(tag =>
        `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; 
            background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); 
            color: #c4b5fd; margin: 3px;">${tag}</span>`
    ).join('');
    
    // 突出维度
    const topDimHtml = topDims.map(d =>
        `<span style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 10px; 
            border-radius: 12px; font-size: 12px; background: rgba(255,255,255,0.05); 
            color: ${d.color};">${d.icon} ${d.name}</span>`
    ).join(' ');
    
    return `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); 
            border-radius: 16px; padding: 28px; margin-bottom: 32px;">
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
                <div style="font-size: 48px; width: 64px; height: 64px; display: flex; align-items: center; 
                    justify-content: center; background: rgba(139, 92, 246, 0.15); border-radius: 16px;">
                    ${personalityType.emoji}
                </div>
                <div>
                    <h3 style="font-family: 'Noto Serif SC', serif; font-size: 24px; font-weight: 700; 
                        color: #e2e8f0; margin-bottom: 4px;">${personalityType.name}</h3>
                    <p style="font-size: 13px; color: #9ca3af;">${personalityType.subtitle}</p>
                </div>
            </div>
            
            <p style="font-size: 14px; line-height: 1.8; color: #b0b8c8; margin-bottom: 16px;">
                ${personalityType.description}
            </p>
            
            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px;">
                ${tagsHtml}
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <span style="font-size: 13px; color: #9ca3af;">人格画像</span>
                <span style="font-size: 12px; color: #6b7280;">突出维度：${topDimHtml}</span>
            </div>
            
            ${barsHtml}
            
            <div style="display: flex; align-items: flex-start; gap: 10px; margin-top: 20px; padding: 14px; 
                background: rgba(139, 92, 246, 0.08); border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.15);">
                <span style="font-size: 18px; flex-shrink: 0;">💡</span>
                <p style="font-size: 13px; line-height: 1.7; color: #c4b5fd;">${personalityType.advice}</p>
            </div>
        </div>
    `;
}

// 重新开始
function restart() {
    state.currentStage = 0;
    state.selectedWishes.clear();
    state.vanishedWishes.clear();
    state.triggeredVanish.clear();
    state.stageSelections = {};
    state.totalSelected = 0;
    state.totalVanished = 0;
    
    updateCounters();
    
    switchPage(dom.resultPage, dom.introPage);
}

// 启动应用
init();

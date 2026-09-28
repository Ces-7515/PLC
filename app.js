/**
 * Palworld TCG Counter App Logic (Life & Resources)
 */

// アプリの状態
const defaultState = {
  mode: 'single', // 'single' | 'two'
  resTab: 'both', // 'both' | 'food' | 'mat'
  p2Flipped: false,
  p1: {
    life: 10,
    food: 0,
    mat: 0
  },
  p2: {
    life: 10,
    food: 0,
    mat: 0
  },
  logs: []
};

let state = JSON.parse(JSON.stringify(defaultState));

// Web Audio APIによる簡易効果音
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

function playSound(type) {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'plus') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'minus') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'reset') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    // Audio Context errors ignored
  }
}

function vibrate(ms = 30) {
  if (navigator.vibrate) {
    navigator.vibrate(ms);
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setupEventListeners();
  render();
  registerServiceWorker();
});

// PWA Service Worker 登録
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('SW registered:', reg))
        .catch((err) => console.log('SW reg error:', err));
    });
  }
}

// ローカルストレージ
function saveState() {
  localStorage.setItem('palworld_tcg_state', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('palworld_tcg_state');
  if (saved) {
    try {
      state = JSON.parse(saved);
    } catch (e) {
      state = JSON.parse(JSON.stringify(defaultState));
    }
  }
}

// イベントリスナー設定
function setupEventListeners() {
  // モード切替
  document.getElementById('mode-toggle-btn').addEventListener('click', () => {
    state.mode = state.mode === 'single' ? 'two' : 'single';
    vibrate(20);
    saveState();
    render();
  });

  // 全リセット
  document.getElementById('reset-all-btn').addEventListener('click', () => {
    if (confirm('すべてのカウントをリセットしますか？')) {
      state.p1 = { life: 10, food: 0, mat: 0 };
      state.p2 = { life: 10, food: 0, mat: 0 };
      addLog('全カウントを初期化しました');
      playSound('reset');
      vibrate(50);
      saveState();
      render();
    }
  });

  // P1 ライフ (+ / -)
  document.getElementById('p1-life-minus').addEventListener('click', () => adjustLife('p1', -1));
  document.getElementById('p1-life-plus').addEventListener('click', () => adjustLife('p1', 1));

  // P1 素材・食材 (+ / -)
  document.getElementById('p1-food-minus').addEventListener('click', () => adjustResource('p1', 'food', -1));
  document.getElementById('p1-food-plus').addEventListener('click', () => adjustResource('p1', 'food', 1));
  document.getElementById('p1-mat-minus').addEventListener('click', () => adjustResource('p1', 'mat', -1));
  document.getElementById('p1-mat-plus').addEventListener('click', () => adjustResource('p1', 'mat', 1));

  // ログ削除
  document.getElementById('clear-log-btn').addEventListener('click', () => {
    state.logs = [];
    saveState();
    renderLogs();
  });

  // P2 180°回転
  document.getElementById('p2-flip-btn').addEventListener('click', () => {
    state.p2Flipped = !state.p2Flipped;
    saveState();
    render();
  });
}

// ライフ調整
window.adjustLife = function(player, delta) {
  const p = state[player];
  const oldVal = p.life;
  p.life = Math.max(0, p.life + delta);
  
  if (oldVal !== p.life) {
    const pName = player === 'p1' ? 'P1' : 'P2';
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    addLog(`${pName} ライフ ${sign} (現在: ${p.life})`);
    playSound(delta > 0 ? 'plus' : 'minus');
    vibrate(30);
    saveState();
    render();
  }
};

// 素材・食材表示タブ切り替え
window.setResourceTab = function(tab) {
  state.resTab = tab;
  vibrate(20);
  saveState();
  render();
};

// 素材・食材調整
window.adjustResource = function(player, type, delta) {
  const p = state[player];
  const oldVal = p[type];
  p[type] = Math.max(0, p[type] + delta);
  if (oldVal !== p[type]) {
    const label = type === 'food' ? '食材' : '素材';
    const pName = player === 'p1' ? 'P1' : 'P2';
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    addLog(`${pName} ${label} ${sign} (現在: ${p[type]})`);
    playSound(delta > 0 ? 'plus' : 'minus');
    vibrate(20);
    saveState();
    render();
  }
};

window.setResource = function(player, type, val) {
  state[player][type] = val;
  saveState();
  render();
};

// ログ追加
function addLog(text) {
  const time = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  state.logs.unshift(`[${time}] ${text}`);
  if (state.logs.length > 20) {
    state.logs.pop();
  }
}

// レンダリング関数
function render() {
  // モード表示切替
  const singleView = document.getElementById('single-player-view');
  const twoView = document.getElementById('two-player-view');
  const modeText = document.getElementById('mode-text');
  const appContainer = document.getElementById('app');

  if (state.mode === 'single') {
    singleView.classList.add('active');
    twoView.classList.remove('active');
    if (appContainer) appContainer.classList.remove('mode-2p');
    modeText.textContent = '2P対戦';
  } else {
    singleView.classList.remove('active');
    twoView.classList.add('active');
    if (appContainer) appContainer.classList.add('mode-2p');
    modeText.textContent = '1P表示';
  }

  // P2 180°回転適用
  const p2Panel = document.querySelector('.p2-panel');
  if (state.p2Flipped) {
    p2Panel.classList.add('flipped');
  } else {
    p2Panel.classList.remove('flipped');
  }

  // 1P ライフ表示
  const p1LifeEl = document.getElementById('p1-life-val');
  p1LifeEl.textContent = state.p1.life;
  if (state.p1.life <= 3) {
    p1LifeEl.classList.add('low');
  } else {
    p1LifeEl.classList.remove('low');
  }

  // 素材・食材表示タブのアクティブ化切替
  const currentTab = state.resTab || 'both';
  ['both', 'food', 'mat'].forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    if (btn) {
      if (t === currentTab) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });

  // モード別エリア表示切替
  const gridBoth = document.getElementById('res-grid-both');
  const focusFood = document.getElementById('res-focus-food');
  const focusMat = document.getElementById('res-focus-mat');

  if (gridBoth && focusFood && focusMat) {
    gridBoth.classList.remove('active');
    focusFood.classList.remove('active');
    focusMat.classList.remove('active');

    if (currentTab === 'food') {
      focusFood.classList.add('active');
    } else if (currentTab === 'mat') {
      focusMat.classList.add('active');
    } else {
      gridBoth.classList.add('active');
    }
  }

  // 1P 素材・食材
  document.getElementById('p1-food-val').textContent = state.p1.food;
  document.getElementById('p1-mat-val').textContent = state.p1.mat;

  const foodLg = document.getElementById('p1-food-val-lg');
  const matLg = document.getElementById('p1-mat-val-lg');
  if (foodLg) foodLg.textContent = state.p1.food;
  if (matLg) matLg.textContent = state.p1.mat;

  // 2P モード用要素の更新
  document.getElementById('p1-life-val-2p').textContent = state.p1.life;
  document.getElementById('p1-food-val-2p').textContent = state.p1.food;
  document.getElementById('p1-mat-val-2p').textContent = state.p1.mat;

  document.getElementById('p2-life-val').textContent = state.p2.life;
  document.getElementById('p2-food-val').textContent = state.p2.food;
  document.getElementById('p2-mat-val').textContent = state.p2.mat;

  // ログ描画
  renderLogs();
}

function renderLogs() {
  const logListEl = document.getElementById('action-log');
  if (!logListEl) return;
  
  if (state.logs.length === 0) {
    logListEl.innerHTML = '<li class="log-item default">対戦ログはありません</li>';
    return;
  }

  logListEl.innerHTML = state.logs
    .map(log => `<li class="log-item">${escapeHtml(log)}</li>`)
    .join('');
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

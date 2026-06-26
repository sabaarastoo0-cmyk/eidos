/* =============================================
   EIDOS — Frontend JS (متصل به بک‌اند واقعی)
   ============================================= */

const API = '';
const $ = id => document.getElementById(id);

// ---- STATE ----
let currentUser = null;
let currentSort = 'latest';
let currentSearchQuery = '';
let searchDebounceTimer = null;

const FORM_FIELDS = [
  'title', 'domain', 'similarIdea',
  'description', 'problemSolved', 'importance', 'consequences',
  'solution', 'differentiator', 'prototype',
  'executionSteps', 'phases', 'duration', 'resources', 'budget',
  'audience', 'value', 'competitors',
  'challenges', 'riskManagement', 'futureVision'
];

const FIELD_LABELS = {
  title: 'عنوان ایده', domain: 'حوزه', similarIdea: 'مشابه قبلی',
  description: 'شرح ایده', problemSolved: 'مسئله', importance: 'اهمیت', consequences: 'پیامد عدم اجرا',
  solution: 'راه‌حل', differentiator: 'وجه تمایز', prototype: 'نمونه اولیه',
  executionSteps: 'مراحل اجرا', phases: 'فازها', duration: 'مدت زمان', resources: 'منابع', budget: 'هزینه',
  audience: 'مخاطب', value: 'ارزش پیشنهادی', competitors: 'رقبا',
  challenges: 'چالش‌ها', riskManagement: 'مدیریت ریسک', futureVision: 'چشم‌انداز ۵ ساله'
};

// AI chat state
let aiMessages = [];      // [{role:'user'|'assistant', content:string}]
let aiCollectedFields = {}; // accumulates form data extracted so far
let aiIsTyping = false;

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  if (token && userData) {
    try { currentUser = JSON.parse(userData); updateNavForUser(); } catch {}
  }
  loadIdeas();
});

// ---- NAVBAR ----
function updateNavForUser() {
  if (currentUser) {
    $('nav-guest').style.display = 'none';
    $('nav-user').style.display = 'flex';
    $('nav-username').textContent = currentUser.username;
    $('admin-badge').style.display = currentUser.isAdmin ? 'inline' : 'none';
    $('nav-admin-link').style.display = currentUser.isAdmin ? 'inline-block' : 'none';
  } else {
    $('nav-guest').style.display = 'flex';
    $('nav-user').style.display = 'none';
    $('nav-admin-link').style.display = 'none';
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  updateNavForUser();
  showHome();
  showToast('خروج موفق');
}

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ---- TOAST ----
function showToast(msg, isError = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = isError ? 'error show' : 'show';
  setTimeout(() => t.className = isError ? 'error' : '', 3000);
}

// ---- VIEW TOGGLE ----
function showHome() {
  $('hero').style.display = 'flex';
  $('main').style.display = 'block';
  $('profile-page').style.display = 'none';
  $('admin-page').style.display = 'none';
}

function showProfile(username) {
  if (!username) return;
  $('hero').style.display = 'none';
  $('main').style.display = 'none';
  $('admin-page').style.display = 'none';
  $('profile-page').style.display = 'block';
  loadProfile(username);
}

function showAdmin() {
  if (!currentUser || !currentUser.isAdmin) return;
  $('hero').style.display = 'none';
  $('main').style.display = 'none';
  $('profile-page').style.display = 'none';
  $('admin-page').style.display = 'block';
  loadAdminPanel();
}

// ---- AUTH MODAL ----
function openAuthModal(tab = 'login') {
  $('auth-modal').classList.add('open');
  switchAuthTab(tab);
}
function closeAuthModal() { $('auth-modal').classList.remove('open'); }

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
  $(`form-${tab}`).classList.add('active');
}

// ---- REGISTER ----
async function handleRegister(e) {
  e.preventDefault();
  const username = $('reg-username').value.trim();
  const email = $('reg-email').value.trim();
  const password = $('reg-password').value;
  const confirm = $('reg-confirm').value;
  const errEl = $('reg-error');
  errEl.textContent = '';

  if (password !== confirm) { errEl.textContent = 'رمز عبور و تکرار آن یکسان نیستند'; return; }
  if (password.length < 8) { errEl.textContent = 'رمز عبور باید حداقل ۸ کاراکتر باشد'; return; }

  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error; return; }
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    currentUser = data.user;
    updateNavForUser();
    closeAuthModal();
    showToast('ثبت‌نام موفق! خوش آمدید');
  } catch {
    errEl.textContent = 'خطا در اتصال به سرور';
  }
}

// ---- LOGIN ----
async function handleLogin(e) {
  e.preventDefault();
  const identifier = $('login-identifier').value.trim();
  const password = $('login-password').value;
  const errEl = $('login-error');
  errEl.textContent = '';

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error; return; }
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    currentUser = data.user;
    updateNavForUser();
    closeAuthModal();
    showToast('ورود موفق');
  } catch {
    errEl.textContent = 'خطا در اتصال به سرور';
  }
}

// ---- SEARCH ----
function filterIdeas(query) {
  currentSearchQuery = query.trim();
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => loadIdeas(currentSort), 350);
}

// ---- LOAD IDEAS ----
async function loadIdeas(sort = currentSort) {
  currentSort = sort;
  document.querySelectorAll('.sort-tab').forEach(t => t.classList.toggle('active', t.dataset.sort === sort));
  const grid = $('ideas-grid');
  grid.innerHTML = '<div class="loading"><div class="spinner"></div>در حال بارگذاری...</div>';

  try {
    const params = new URLSearchParams({ sort, page: 1, limit: 30 });
    if (currentSearchQuery) params.set('search', currentSearchQuery);
    const res = await fetch(`${API}/api/ideas?${params.toString()}`);
    const data = await res.json();
    renderIdeas(data.ideas, grid);
  } catch {
    grid.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><p>خطا در بارگذاری ایده‌ها</p></div>';
  }
}

function renderIdeas(ideas, container) {
  if (!ideas || !ideas.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">💡</div><p>هنوز ایده‌ای ثبت نشده است</p></div>';
    return;
  }
  container.innerHTML = ideas.map(idea => `
    <div class="idea-card ${idea.pinned ? 'is-pinned' : ''}" onclick="openIdeaDetail('${idea._id}')">
      ${idea.pinned ? '<span class="pinned-badge">📌 پین شده</span>' : ''}
      <div style="font-size:0.75rem;color:var(--text-light);">${formatDate(idea.createdAt)}</div>
      <h3 class="idea-card-title">${escHtml(idea.title)}</h3>
      <div class="idea-card-author" onclick="event.stopPropagation(); showProfile('${idea.authorUsername}')">
        ارسال شده: ${escHtml(idea.authorUsername || '')}
      </div>
      <p class="idea-card-desc">${escHtml(idea.description)}</p>
      <div class="idea-card-footer">
        ${idea.domain ? `<span class="idea-domain-tag">${escHtml(idea.domain)}</span>` : ''}
        <span class="like-count">❤️ ${idea.likes ? idea.likes.length : 0}</span>
      </div>
    </div>
  `).join('');
}

// ---- IDEA DETAIL ----
async function openIdeaDetail(id) {
  const modal = $('idea-modal');
  modal.classList.add('open');
  $('idea-modal-content').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`${API}/api/ideas/${id}`);
    const idea = await res.json();
    renderIdeaDetail(idea);
  } catch {
    $('idea-modal-content').innerHTML = '<div class="empty-state"><p>خطا در بارگذاری</p></div>';
  }
}

function renderIdeaDetail(idea) {
  const isLiked = currentUser && idea.likes && idea.likes.includes(currentUser.id);
  const canDelete = currentUser && (currentUser.isAdmin || currentUser.id === idea.author);
  const canPin = currentUser && currentUser.isAdmin;

  const sections = [
    { title: 'بخش ۱: اطلاعات اولیه', fields: [
      { label: 'حوزه ایده', val: idea.domain },
      { label: 'مشابه اجرا شده', val: idea.similarIdea }
    ]},
    { title: 'بخش ۲: خلاصه و تعریف مسئله', fields: [
      { label: 'شرح ایده', val: idea.description },
      { label: 'مسئله‌ای که حل می‌کند', val: idea.problemSolved },
      { label: 'اهمیت مسئله', val: idea.importance },
      { label: 'پیامد عدم اجرا', val: idea.consequences }
    ]},
    { title: 'بخش ۳: راه‌حل پیشنهادی', fields: [
      { label: 'راه‌حل پیشنهادی', val: idea.solution },
      { label: 'تمایز ایده', val: idea.differentiator },
      { label: 'نمونه اولیه', val: idea.prototype }
    ]},
    { title: 'بخش ۴: اجرا', fields: [
      { label: 'مراحل اجرا', val: idea.executionSteps },
      { label: 'تعداد فازها', val: idea.phases },
      { label: 'مدت زمان', val: idea.duration },
      { label: 'منابع مورد نیاز', val: idea.resources },
      { label: 'برآورد هزینه', val: idea.budget }
    ]},
    { title: 'بخش ۵: مخاطب و بازار', fields: [
      { label: 'مخاطب اصلی', val: idea.audience },
      { label: 'ارزش ایجاد شده', val: idea.value },
      { label: 'رقبا و تفاوت', val: idea.competitors }
    ]},
    { title: 'بخش ۶: ریسک و آینده', fields: [
      { label: 'چالش‌های اجرا', val: idea.challenges },
      { label: 'مدیریت ریسک', val: idea.riskManagement },
      { label: 'چشم‌انداز ۵ ساله', val: idea.futureVision }
    ]}
  ];

  const sectionsHtml = sections.map(s => {
    const fields = s.fields.filter(f => f.val).map(f => `
      <div class="idea-field">
        <div class="idea-field-label">${f.label}</div>
        <div class="idea-field-value">${escHtml(f.val)}</div>
      </div>
    `).join('');
    return fields ? `<div class="idea-section-title">${s.title}</div>${fields}` : '';
  }).join('');

  const filesHtml = (idea.imageFile || idea.pdfFile || idea.demoLink) ? `
    <div class="idea-section-title">بخش ۷: فایل‌ها</div>
    ${idea.imageFile ? `<div class="idea-field"><div class="idea-field-label">تصویر</div>
      <img src="/uploads/${idea.imageFile}" style="max-width:100%;border-radius:6px;margin-top:0.5rem;"></div>` : ''}
    ${idea.pdfFile ? `<div class="idea-field"><a href="/uploads/${idea.pdfFile}" target="_blank" class="btn btn-outline-navy btn-sm">دانلود PDF</a></div>` : ''}
    ${idea.demoLink ? `<div class="idea-field"><a href="${escHtml(idea.demoLink)}" target="_blank" class="btn btn-outline-navy btn-sm">مشاهده دمو</a></div>` : ''}
  ` : '';

  const commentsHtml = (idea.comments || []).map(c => `
    <div class="comment-item">
      <div class="comment-author">@${escHtml(c.username)}</div>
      <div>${escHtml(c.text)}</div>
    </div>
  `).join('') || '<p style="color:var(--text-light);font-size:0.85rem;">هنوز نظری ثبت نشده</p>';

  $('idea-modal-content').innerHTML = `
    <div class="idea-detail-header">
      <h2>${idea.pinned ? '📌 ' : ''}${escHtml(idea.title)}</h2>
      <div class="idea-meta">
        <span class="idea-card-author" onclick="closeIdeaModal(); showProfile('${idea.authorUsername}')">
          @${escHtml(idea.authorUsername || '')}
        </span>
        <span>${formatDate(idea.createdAt)}</span>
        ${idea.domain ? `<span class="idea-domain-tag">${escHtml(idea.domain)}</span>` : ''}
      </div>
    </div>

    <div class="idea-actions">
      <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${idea._id}', this)">
        ❤️ <span class="like-num">${idea.likes ? idea.likes.length : 0}</span> لایک
      </button>
      ${canPin ? `<button class="btn-pin btn ${idea.pinned ? 'is-pinned' : ''}" onclick="togglePin('${idea._id}', this)">${idea.pinned ? '📌 پین‌شده — برداشتن' : '📌 پین کردن'}</button>` : ''}
      ${canDelete ? `<button class="btn btn-danger btn-sm" onclick="deleteIdea('${idea._id}')">حذف ایده</button>` : ''}
    </div>

    <div style="padding:1rem 1.5rem;">
      ${sectionsHtml}
      ${filesHtml}
    </div>

    <div class="comments-section">
      <h4>نظرات (${(idea.comments || []).length})</h4>
      <div id="comments-list-${idea._id}">${commentsHtml}</div>
      ${currentUser ? `
        <div class="comment-input-row">
          <input type="text" id="comment-input-${idea._id}" placeholder="نظر خود را بنویسید...">
          <button class="btn btn-primary btn-sm" onclick="submitComment('${idea._id}')">ارسال</button>
        </div>
      ` : `<p style="margin-top:0.75rem;font-size:0.82rem;color:var(--text-light);">برای ثبت نظر <a href="#" onclick="closeIdeaModal(); openAuthModal('login')">وارد شوید</a></p>`}
    </div>
  `;
}

function closeIdeaModal() { $('idea-modal').classList.remove('open'); }

// ---- LIKE ----
async function toggleLike(ideaId, btn) {
  if (!currentUser) { closeIdeaModal(); openAuthModal('login'); return; }
  try {
    const res = await fetch(`${API}/api/ideas/${ideaId}/like`, { method: 'POST', headers: authHeader() });
    const data = await res.json();
    if (!res.ok) { showToast(data.error, true); return; }
    btn.classList.toggle('liked', data.liked);
    btn.querySelector('.like-num').textContent = data.likes;
  } catch { showToast('خطا', true); }
}

// ---- PIN (admin) ----
async function togglePin(ideaId, btn) {
  try {
    const res = await fetch(`${API}/api/ideas/${ideaId}/pin`, { method: 'POST', headers: authHeader() });
    const data = await res.json();
    if (!res.ok) { showToast(data.error, true); return; }
    btn.classList.toggle('is-pinned', data.pinned);
    btn.textContent = data.pinned ? '📌 پین‌شده — برداشتن' : '📌 پین کردن';
    showToast(data.pinned ? 'ایده پین شد' : 'پین برداشته شد');
    loadIdeas(currentSort);
  } catch { showToast('خطا', true); }
}

// ---- COMMENT ----
async function submitComment(ideaId) {
  const input = $(`comment-input-${ideaId}`);
  const text = input.value.trim();
  if (!text) return;
  try {
    const res = await fetch(`${API}/api/ideas/${ideaId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ text })
    });
    const comment = await res.json();
    if (!res.ok) { showToast(comment.error, true); return; }
    const list = $(`comments-list-${ideaId}`);
    if (list.querySelector('p')) list.innerHTML = '';
    list.insertAdjacentHTML('beforeend', `
      <div class="comment-item">
        <div class="comment-author">@${escHtml(comment.username)}</div>
        <div>${escHtml(comment.text)}</div>
      </div>
    `);
    input.value = '';
    const heading = document.querySelector('.comments-section h4');
    if (heading) heading.textContent = heading.textContent.replace(/\(\d+\)/, m => `(${parseInt(m.slice(1,-1)) + 1})`);
  } catch { showToast('خطا', true); }
}

// ---- DELETE IDEA ----
async function deleteIdea(ideaId) {
  if (!confirm('آیا از حذف این ایده اطمینان دارید؟')) return;
  try {
    const res = await fetch(`${API}/api/ideas/${ideaId}`, { method: 'DELETE', headers: authHeader() });
    if (res.ok) {
      closeIdeaModal();
      loadIdeas(currentSort);
      showToast('ایده حذف شد');
    }
  } catch { showToast('خطا در حذف', true); }
}

// ---- NEW IDEA MODAL ----
function openNewIdeaModal() {
  if (!currentUser) { openAuthModal('login'); return; }
  aiMessages = [];
  aiCollectedFields = {};
  $('new-idea-modal').classList.add('open');
}
function closeNewIdeaModal() {
  $('new-idea-modal').classList.remove('open');
  $('new-idea-form').reset();
  $('ai-fields-summary').style.display = 'none';
  $('ai-fields-summary').innerHTML = '';
}

async function handleNewIdea(e) {
  e.preventDefault();
  const form = $('new-idea-form');
  const formData = new FormData(form);
  const errEl = $('idea-form-error');
  errEl.textContent = '';

  try {
    const res = await fetch(`${API}/api/ideas`, {
      method: 'POST',
      headers: authHeader(),
      body: formData
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error; return; }
    closeNewIdeaModal();
    loadIdeas(currentSort);
    showToast('ایده با موفقیت ثبت شد!');
  } catch {
    errEl.textContent = 'خطا در ثبت ایده';
  }
}

// =============================================
// ---- AI ASSISTANT CHAT ----
// =============================================

function openAiChatModal() {
  $('ai-chat-modal').classList.add('open');
  if (aiMessages.length === 0) {
    renderAiMessage('سلام! من دستیار ایدوس هستم 🤖 بیا با هم ایده‌ات رو شکل بدیم. اول بگو ایده‌ات چیه — همین‌جوری خام و خلاصه، چند جمله کافیه.', 'ai');
  } else {
    // re-render history
    $('ai-chat-window').innerHTML = '';
    aiMessages.forEach(m => renderAiMessage(m.content, m.role === 'assistant' ? 'ai' : 'user', false));
    updateAiProgress();
  }
  $('ai-chat-input').focus();
}

function closeAiChatModal() {
  $('ai-chat-modal').classList.remove('open');
}

function renderAiMessage(text, who, animate = true) {
  const win = $('ai-chat-window');
  const div = document.createElement('div');
  div.className = `ai-msg from-${who}`;
  div.innerHTML = escHtml(text);
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

function showAiTyping() {
  const win = $('ai-chat-window');
  const div = document.createElement('div');
  div.className = 'ai-msg from-ai typing';
  div.id = 'ai-typing-indicator';
  div.innerHTML = '<span class="ai-typing-dot"></span><span class="ai-typing-dot"></span><span class="ai-typing-dot"></span>';
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}
function hideAiTyping() {
  const el = $('ai-typing-indicator');
  if (el) el.remove();
}

async function sendAiMessage(e) {
  e.preventDefault();
  if (aiIsTyping) return;
  const input = $('ai-chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  aiMessages.push({ role: 'user', content: text });
  renderAiMessage(text, 'user');

  aiIsTyping = true;
  showAiTyping();

  try {
    const res = await fetch(`${API}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ messages: aiMessages, currentFormData: aiCollectedFields })
    });
    const data = await res.json();
    hideAiTyping();
    aiIsTyping = false;

    if (!res.ok) {
      renderAiMessage(data.error || 'خطایی رخ داد، دوباره تلاش کن.', 'ai');
      return;
    }

    aiMessages.push({ role: 'assistant', content: data.reply });
    renderAiMessage(data.reply, 'ai');

    if (data.formData && Object.keys(data.formData).length) {
      Object.assign(aiCollectedFields, data.formData);
      updateAiProgress();
    }
  } catch {
    hideAiTyping();
    aiIsTyping = false;
    renderAiMessage('ارتباط با دستیار قطع شد. لطفاً دوباره تلاش کن.', 'ai');
  }
}

function updateAiProgress() {
  const filledCount = FORM_FIELDS.filter(f => aiCollectedFields[f] && String(aiCollectedFields[f]).trim()).length;
  const pct = Math.round((filledCount / FORM_FIELDS.length) * 100);
  $('ai-progress-fill').style.width = pct + '%';
  $('ai-progress-text').textContent = `${filledCount} از ${FORM_FIELDS.length} بخش`;
}

function applyAiFieldsToForm() {
  let appliedCount = 0;
  FORM_FIELDS.forEach(key => {
    const val = aiCollectedFields[key];
    if (val === undefined || val === null || val === '') return;
    const input = $(`field-${key}`);
    if (!input) return;
    if (!input.value || input.value.trim() === '') {
      input.value = val;
      input.classList.add('ai-filled');
      setTimeout(() => input.classList.remove('ai-filled'), 1500);
      appliedCount++;
    }
  });

  const summary = $('ai-fields-summary');
  if (appliedCount > 0) {
    const ticks = FORM_FIELDS
      .filter(k => aiCollectedFields[k])
      .map(k => `<span class="ai-field-tick">✓ ${FIELD_LABELS[k] || k}</span>`)
      .join('');
    summary.innerHTML = `<div style="font-size:0.8rem;color:var(--text-light);margin-bottom:0.4rem;">دستیار این بخش‌ها را پر کرد (قابل ویرایش):</div>${ticks}`;
    summary.style.display = 'block';
  }
  return appliedCount;
}

function finishAiChatAndGoToForm() {
  const applied = applyAiFieldsToForm();
  closeAiChatModal();
  if (applied > 0) {
    showToast(`${applied} بخش از فرم با کمک دستیار پر شد — حالا می‌توانید بررسی و ویرایش کنید`);
  }
  // scroll the new-idea modal body to top of form
  const modalBody = document.querySelector('#new-idea-modal .modal-body');
  if (modalBody) modalBody.scrollTop = 0;
}

// =============================================
// ---- PROFILE ----
// =============================================
async function loadProfile(username) {
  $('profile-content').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`${API}/api/users/${username}`);
    const data = await res.json();
    if (!res.ok) { $('profile-content').innerHTML = '<p>کاربر یافت نشد</p>'; return; }
    renderProfile(data.user, data.ideas);
  } catch {
    $('profile-content').innerHTML = '<p>خطا</p>';
  }
}

function renderProfile(user, ideas) {
  const initial = user.username.charAt(0).toUpperCase();
  $('profile-content').innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">${initial}</div>
      <div class="profile-info">
        <h2>${escHtml(user.username)} ${user.isAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}</h2>
        <p>${escHtml(user.email)}</p>
        <p style="margin-top:0.3rem;font-size:0.8rem;color:var(--text-light);">عضو از ${formatDate(user.createdAt)}</p>
      </div>
    </div>
    <h3 style="margin-bottom:1rem;font-size:1rem;font-family:'Inter',sans-serif;">ایده‌ها (${ideas.length})</h3>
    <div class="profile-ideas-grid">
      ${ideas.length === 0
        ? '<div class="empty-state"><div class="icon">💡</div><p>هنوز ایده‌ای ثبت نشده</p></div>'
        : ideas.map(idea => `
          <div class="idea-card ${idea.pinned ? 'is-pinned' : ''}" onclick="openIdeaDetail('${idea._id}')">
            ${idea.pinned ? '<span class="pinned-badge">📌 پین شده</span>' : ''}
            ${idea.domain ? `<span class="idea-domain-tag">${escHtml(idea.domain)}</span>` : ''}
            <h3 class="idea-card-title">${escHtml(idea.title)}</h3>
            <p class="idea-card-desc">${escHtml(idea.description)}</p>
            <div class="idea-card-footer">
              <span>${formatDate(idea.createdAt)}</span>
              <span class="like-count">❤️ ${idea.likes ? idea.likes.length : 0}</span>
            </div>
          </div>
        `).join('')}
    </div>
    <div style="margin-top:1.5rem;">
      <button class="btn btn-outline-navy" onclick="showHome(); loadIdeas()">← بازگشت</button>
    </div>
  `;
}

// =============================================
// ---- ADMIN PANEL ----
// =============================================
async function loadAdminPanel() {
  $('admin-content').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const [statsRes, ideasRes] = await Promise.all([
      fetch(`${API}/api/admin/stats`, { headers: authHeader() }),
      fetch(`${API}/api/ideas?sort=latest&limit=100`)
    ]);
    const stats = await statsRes.json();
    const ideasData = await ideasRes.json();

    if (!statsRes.ok) {
      $('admin-content').innerHTML = `<div class="empty-state"><p>${escHtml(stats.error || 'دسترسی ندارید')}</p></div>`;
      return;
    }
    renderAdminPanel(stats, ideasData.ideas || []);
  } catch {
    $('admin-content').innerHTML = '<div class="empty-state"><p>خطا در بارگذاری پنل مدیریت</p></div>';
  }
}

function renderAdminPanel(stats, ideas) {
  const domainsHtml = (stats.topDomains || []).map(d => `
    <div class="admin-domain-row">
      <span>${escHtml(d.domain)}</span>
      <span class="count">${d.count}</span>
    </div>
  `).join('') || '<p style="color:var(--text-light);font-size:0.85rem;">داده‌ای موجود نیست</p>';

  const usersHtml = (stats.recentUsers || []).map(u => `
    <div class="admin-user-row">
      <span class="idea-card-author" onclick="showAdmin(); showProfile('${u.username}')">@${escHtml(u.username)}</span>
      <span style="color:var(--text-light);font-size:0.78rem;">${formatDate(u.createdAt)}</span>
    </div>
  `).join('') || '<p style="color:var(--text-light);font-size:0.85rem;">کاربری ثبت نشده</p>';

  const ideasRowsHtml = ideas.map(idea => `
    <tr>
      <td class="admin-idea-title-cell" onclick="openIdeaDetail('${idea._id}')" title="${escHtml(idea.title)}">
        ${idea.pinned ? '📌 ' : ''}${escHtml(idea.title)}
      </td>
      <td>${escHtml(idea.authorUsername || '')}</td>
      <td>${escHtml(idea.domain || '—')}</td>
      <td>❤️ ${idea.likes ? idea.likes.length : 0}</td>
      <td>💬 ${idea.comments ? idea.comments.length : 0}</td>
      <td>${formatDate(idea.createdAt)}</td>
      <td>
        <div class="admin-actions-cell">
          <button class="btn-pin btn btn-sm ${idea.pinned ? 'is-pinned' : ''}" onclick="adminTogglePin('${idea._id}', this)">${idea.pinned ? 'برداشتن' : 'پین'}</button>
          <button class="btn btn-danger btn-sm" onclick="adminDeleteIdea('${idea._id}')">حذف</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-light);padding:1.5rem;">ایده‌ای ثبت نشده</td></tr>';

  const mostLikedHtml = stats.mostLiked
    ? `<div class="admin-domain-row"><span>${escHtml(stats.mostLiked.title)} — @${escHtml(stats.mostLiked.author)}</span><span class="count">❤️ ${stats.mostLiked.likes}</span></div>`
    : '<p style="color:var(--text-light);font-size:0.85rem;">هنوز ایده‌ای لایک نشده</p>';

  $('admin-content').innerHTML = `
    <div class="admin-header">
      <h2>پنل مدیریت</h2>
      <p>آمار کلی و مدیریت محتوای ایدوس</p>
    </div>

    <div class="admin-stats-grid">
      <div class="stat-card"><div class="stat-number">${stats.totalUsers}</div><div class="stat-label">کاربران</div></div>
      <div class="stat-card"><div class="stat-number">${stats.totalIdeas}</div><div class="stat-label">ایده‌ها</div></div>
      <div class="stat-card"><div class="stat-number">${stats.totalLikes}</div><div class="stat-label">لایک‌ها</div></div>
      <div class="stat-card"><div class="stat-number">${stats.totalComments}</div><div class="stat-label">کامنت‌ها</div></div>
      <div class="stat-card accent"><div class="stat-number">${stats.pinnedCount}</div><div class="stat-label">پین‌شده</div></div>
      <div class="stat-card accent"><div class="stat-number">${stats.ideasLast7Days}</div><div class="stat-label">ایده ۷ روز اخیر</div></div>
    </div>

    <div class="admin-panel-section">
      <h3>محبوب‌ترین حوزه‌ها</h3>
      ${domainsHtml}
    </div>

    <div class="admin-panel-section">
      <h3>محبوب‌ترین ایده</h3>
      ${mostLikedHtml}
    </div>

    <div class="admin-panel-section">
      <h3>آخرین کاربران ثبت‌نام‌کرده</h3>
      ${usersHtml}
    </div>

    <div class="admin-panel-section">
      <h3>مدیریت ایده‌ها (${ideas.length})</h3>
      <div style="overflow-x:auto;">
        <table class="admin-idea-table">
          <thead>
            <tr>
              <th>عنوان</th><th>نویسنده</th><th>حوزه</th><th>لایک</th><th>کامنت</th><th>تاریخ</th><th>عملیات</th>
            </tr>
          </thead>
          <tbody>${ideasRowsHtml}</tbody>
        </table>
      </div>
    </div>

    <div style="margin-top:1rem;">
      <button class="btn btn-outline-navy" onclick="showHome(); loadIdeas()">← بازگشت به صفحه اصلی</button>
    </div>
  `;
}

async function adminTogglePin(ideaId, btn) {
  try {
    const res = await fetch(`${API}/api/ideas/${ideaId}/pin`, { method: 'POST', headers: authHeader() });
    const data = await res.json();
    if (!res.ok) { showToast(data.error, true); return; }
    showToast(data.pinned ? 'ایده پین شد' : 'پین برداشته شد');
    loadAdminPanel();
  } catch { showToast('خطا', true); }
}

async function adminDeleteIdea(ideaId) {
  if (!confirm('آیا از حذف این ایده اطمینان دارید؟')) return;
  try {
    const res = await fetch(`${API}/api/ideas/${ideaId}`, { method: 'DELETE', headers: authHeader() });
    if (res.ok) {
      showToast('ایده حذف شد');
      loadAdminPanel();
    }
  } catch { showToast('خطا در حذف', true); }
}

// ---- UTILS ----
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fa-IR');
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

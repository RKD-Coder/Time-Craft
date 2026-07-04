const STORAGE_KEY = 'smartTimetableData_v3';
let state = {
  setup: { schoolName:'', academicYear:'', periodsPerDay:8, periodDuration:45, breakAfter:4, breakDuration:20, workingDays:['Mon','Tue','Wed','Thu','Fri','Sat'], schoolLogo:null },
  teachers: [], subjects: [], classes: [], timetable: null
};
let editingIds = { teacher:null, subject:null, class:null, classSubj:null };
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load(){ const s=localStorage.getItem(STORAGE_KEY); if(s){ try{ state={...state, ...JSON.parse(s)}; }catch(e){} } }
load();

const ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const $ = id => document.getElementById(id);

/* ── Theme ──────────────────────────────────────────────── */
function initTheme(){
  const saved = localStorage.getItem('tc_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}
function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('tc_theme', next);
  updateThemeIcon(next);
}
function updateThemeIcon(theme){
  const icon = $('themeIcon');
  if(icon) icon.className = theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
  const btn = $('themeToggle');
  if(btn) btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  // Drawer theme control
  const dIcon = $('drawerThemeIcon');
  if(dIcon) dIcon.className = theme === 'dark' ? 'ri-moon-clear-line' : 'ri-sun-line';
  const dLabel = $('drawerThemeLabel');
  if(dLabel) dLabel.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
}
initTheme();

/* ── Mobile Nav ─────────────────────────────────────────── */
function openMobileNav(){
  $('navDrawer').classList.add('open');
  $('navOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMobileNav(){
  $('navDrawer').classList.remove('open');
  $('navOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Confirm Reset ──────────────────────────────────────── */
function confirmReset(){
  customConfirm('This will erase ALL teachers, subjects, classes and timetable data permanently.', () => { localStorage.clear(); location.reload(); }, { type:'danger', title:'Reset All Data', confirmText:'Yes, Reset' });
}

/* ── Tab Navigation ─────────────────────────────────────── */
function goToTab(tabId){
  document.querySelectorAll('.tab[data-tab]').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll(`.tab[data-tab="${tabId}"]`).forEach(x=>x.classList.add('active'));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.add('hidden'));
  $('tab-'+tabId).classList.remove('hidden');
  if(tabId==='teachers') renderTeachers();
  if(tabId==='subjects') renderSubjects();
  if(tabId==='classes') renderClasses();
  if(tabId==='generate') renderGenerateStats();
  if(tabId==='view') renderViewTab();
}
document.querySelectorAll('.tab[data-tab]').forEach(t=>{
  t.addEventListener('click',()=>goToTab(t.dataset.tab));
});

/* ── Toast ──────────────────────────────────────────────── */
const TOAST_ICONS = {
  success: 'ri-checkbox-circle-line',
  error:   'ri-close-circle-line',
  warn:    'ri-alert-line',
  info:    'ri-information-line'
};
function toast(msg, type='success'){
  const icon = TOAST_ICONS[type] || TOAST_ICONS.info;
  const cls  = `toast toast-${type==='error'?'error':type==='warn'?'warn':type==='info'?'info':'success'}`;
  const el = document.createElement('div');
  el.className = cls;
  el.innerHTML = `<i class="${icon}"></i><div class="toast-body">${msg}</div><button class="toast-dismiss" onclick="this.closest('.toast').remove()"><i class="ri-close-line"></i></button>`;
  $('toastContainer').appendChild(el);
  const remove = () => { el.classList.add('removing'); setTimeout(()=>el.remove(), 260); };
  // Only success toasts auto-dismiss — warnings/errors stay until the user closes them.
  const timer = type==='success' ? setTimeout(remove, 3800) : null;
  el.querySelector('.toast-dismiss').addEventListener('click', ()=>{ if(timer) clearTimeout(timer); });
  pushNotification(msg, type);
}

/* ── Notification Dropdown ──────────────────────────────────
   Logs every toast() call into a small in-memory history so the
   user can review recent activity from the bell icon in the header.
───────────────────────────────────────────────────────────── */
const NOTIF_LIMIT = 50;
let notifications = [];

function pushNotification(msg, type){
  notifications.unshift({ msg, type, ts: Date.now(), read: false });
  if(notifications.length > NOTIF_LIMIT) notifications.length = NOTIF_LIMIT;
  updateNotifBadge();
  const dd = $('notifDropdown');
  if(dd && !dd.classList.contains('hidden')) renderNotifList();
}

function updateNotifBadge(){
  const unread = notifications.filter(n => !n.read).length;
  ['notifBadgeDesktop','notifBadgeMobile'].forEach(id=>{
    const el = $(id);
    if(!el) return;
    el.textContent = unread>99 ? '99+' : String(unread);
    el.classList.toggle('hidden', unread===0);
  });
}

function renderNotifList(){
  const list = $('notifList');
  if(!list) return;
  if(!notifications.length){
    list.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
    return;
  }
  list.innerHTML = notifications.map(n => `
    <div class="notif-item notif-${n.type||'info'}">
      <i class="${TOAST_ICONS[n.type] || TOAST_ICONS.info}"></i>
      <div class="notif-item-body">
        <div class="notif-item-msg">${n.msg}</div>
        <div class="notif-item-time">${new Date(n.ts).toLocaleString()}</div>
      </div>
    </div>`).join('');
}

function toggleNotifDropdown(e){
  if(e){ e.stopPropagation(); }
  const dd = $('notifDropdown');
  if(!dd) return;
  const isHidden = dd.classList.contains('hidden');
  if(isHidden){
    dd.classList.remove('hidden');
    renderNotifList();
    notifications.forEach(n => n.read = true);
    updateNotifBadge();
    const close = ev => {
      if(!dd.contains(ev.target) && !ev.target.closest('#notifBtnDesktop') && !ev.target.closest('#notifBtnMobile')){
        dd.classList.add('hidden');
        document.removeEventListener('click', close);
      }
    };
    setTimeout(()=>document.addEventListener('click', close), 50);
  } else {
    dd.classList.add('hidden');
  }
}

function clearNotifications(){
  notifications = [];
  renderNotifList();
  updateNotifBadge();
}

function closeModal(id){ $(id).classList.add('hidden'); }
function toggleDownloadMenu(){
  const m = $('downloadMenu');
  m.classList.toggle('hidden');
  if(!m.classList.contains('hidden')){
    const close = e => { if(!m.contains(e.target)){ m.classList.add('hidden'); document.removeEventListener('click', close); } };
    setTimeout(()=>document.addEventListener('click', close), 50);
  }
}

/* ── Custom Confirm Dialog ──────────────────────────────────
   Replaces browser confirm() everywhere.
   type: 'danger' | 'warn' | 'info' | 'primary'
   confirmText: label for OK button (default 'Confirm')
───────────────────────────────────────────────────────────── */
function customConfirm(message, onConfirm, { type='danger', title='Confirm Action', confirmText='Confirm', cancelText='Cancel' } = {}) {
  const iconMap = { danger:'ri-delete-bin-line', warn:'ri-alert-line', info:'ri-information-line', primary:'ri-question-line' };
  const btnMap  = { danger:'btn-danger', warn:'btn-warn', info:'btn-primary', primary:'btn-primary' };
  const overlay = document.createElement('div');
  overlay.className = 'ca-overlay';
  overlay.innerHTML = `
    <div class="ca-box">
      <div class="ca-icon-wrap ca-icon-${type}">
        <i class="${iconMap[type]||'ri-question-line'}"></i>
      </div>
      <div class="ca-title">${title}</div>
      <p class="ca-message">${message}</p>
      <div class="ca-actions">
        <button class="btn btn-outline ca-cancel">${cancelText}</button>
        <button class="btn ${btnMap[type]||'btn-primary'} ca-ok">${confirmText}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const remove = () => { overlay.style.opacity='0'; setTimeout(()=>overlay.remove(), 220); };
  overlay.querySelector('.ca-cancel').addEventListener('click', remove);
  overlay.querySelector('.ca-ok').addEventListener('click', () => { remove(); onConfirm(); });
  overlay.addEventListener('click', e => { if(e.target===overlay) remove(); });
}

/* ── Custom Alert (replaces showInfoModal) ─────────────────── */
function showInfoModal(title, msg) {
  $('infoModalTitle').textContent = title;
  $('infoModalBody').textContent  = msg;
  $('infoModal').classList.remove('hidden');
}

/* ── Custom Select ─────────────────────────────────────────────
   Builds a styled dropdown over every <select> element.
   Call after any dynamic HTML that contains <select> elements.
───────────────────────────────────────────────────────────── */
function initCustomSelects(root = document) {
  // Already-initialized selects just need their display resynced to
  // whatever value was set programmatically since last render (modal
  // reopen, editing a different row, etc.) — .value assignment fires
  // no 'change' event and mutates no DOM attribute, so nothing else
  // would ever re-run syncDisplay() for them.
  root.querySelectorAll('select.cs-initialized').forEach(sel => {
    if (sel._csSync) sel._csSync();
  });

  root.querySelectorAll('select:not(.cs-initialized)').forEach(sel => {
    sel.classList.add('cs-initialized');

    // Wrap
    const wrap = document.createElement('div');
    wrap.className = 'cs-wrap';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);

    // Display bar
    const display = document.createElement('div');
    display.className = 'cs-display';
    display.innerHTML = '<span class="cs-value"></span><i class="ri-arrow-down-s-line cs-arrow"></i>';
    wrap.appendChild(display);

    // Dropdown list
    const dropdown = document.createElement('div');
    dropdown.className = 'cs-dropdown';
    wrap.appendChild(dropdown);

    function buildOptions() {
      dropdown.innerHTML = '';
      [...sel.options].forEach((opt, i) => {
        const item = document.createElement('div');
        item.className = 'cs-option' + (opt.selected ? ' selected' : '') + (opt.disabled ? ' disabled' : '');
        item.textContent = opt.text;
        item.dataset.value = opt.value;
        item.dataset.index = i;
        if (!opt.disabled) {
          item.addEventListener('click', e => {
            e.stopPropagation();
            sel.selectedIndex = i;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            syncDisplay();
            closeDropdown();
          });
        }
        dropdown.appendChild(item);
      });
    }

    function syncDisplay() {
      const opt = sel.options[sel.selectedIndex];
      display.querySelector('.cs-value').textContent = opt ? opt.text : '';
      display.setAttribute('data-disabled', sel.disabled ? 'true' : 'false');
      dropdown.querySelectorAll('.cs-option').forEach((item, i) => {
        item.classList.toggle('selected', i === sel.selectedIndex);
      });
    }

    function openDropdown() {
      if (sel.disabled) return;
      // Close all other open dropdowns
      document.querySelectorAll('.cs-wrap.open').forEach(w => w.classList.remove('open'));
      buildOptions();
      wrap.classList.add('open');
      // Scroll selected into view
      const sel_item = dropdown.querySelector('.cs-option.selected');
      if (sel_item) sel_item.scrollIntoView({ block: 'nearest' });
    }

    function closeDropdown() {
      wrap.classList.remove('open');
    }

    display.addEventListener('click', e => {
      e.stopPropagation();
      wrap.classList.contains('open') ? closeDropdown() : openDropdown();
    });

    // Sync when native select value changes programmatically
    sel.addEventListener('change', syncDisplay);

    // Observe for option changes (e.g. when select is rebuilt)
    const obs = new MutationObserver(() => { buildOptions(); syncDisplay(); });
    obs.observe(sel, { childList: true, subtree: true, attributes: true });

    sel._csSync = () => { buildOptions(); syncDisplay(); };
    buildOptions();
    syncDisplay();
  });

  // Global close on outside click — idempotent guard
  if (!document._csOutsideClickBound) {
    document._csOutsideClickBound = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.cs-wrap.open').forEach(w => w.classList.remove('open'));
    });
  }
}

// Re-run after any modal opens (called at the end of each openXxxModal)
function refreshSelects(root = document) { initCustomSelects(root); }

/* SETUP */
function renderWorkingDays(){
  $('workingDays').innerHTML = ALL_DAYS.map(d=>`
    <label class="day-pill">
      <input type="checkbox" value="${d}" ${state.setup.workingDays.includes(d)?'checked':''}>
      <span>${d}</span>
    </label>`).join('');
}
function handleImageUpload(event, type){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    state.setup[type] = e.target.result;
    const previewId = type === 'schoolLogo' ? 'logoPreview' : 'signPreview';
    $(previewId).src = e.target.result;
    $(previewId).classList.remove('hidden');
    save();
    toast('Image uploaded!');
  };
  reader.readAsDataURL(file);
}
function saveSetup(){
  state.setup.schoolName=$('schoolName').value;
  state.setup.academicYear=$('academicYear').value;
  state.setup.periodsPerDay=parseInt($('periodsPerDay').value)||8;
  state.setup.periodDuration=parseInt($('periodDuration').value)||45;
  state.setup.breakAfter=parseInt($('breakAfter').value)||4;
  state.setup.breakDuration=parseInt($('breakDuration').value)||20;
  state.setup.workingDays=[...document.querySelectorAll('#workingDays input:checked')].map(x=>x.value);
  save(); toast('School configuration saved!');
}
function loadSetupUI(){
  $('schoolName').value=state.setup.schoolName;
  $('academicYear').value=state.setup.academicYear;
  $('periodsPerDay').value=state.setup.periodsPerDay;
  $('periodDuration').value=state.setup.periodDuration;
  $('breakAfter').value=state.setup.breakAfter;
  $('breakDuration').value=state.setup.breakDuration;
  renderWorkingDays();
  if(state.setup.schoolLogo){
    $('logoPreview').src = state.setup.schoolLogo;
    $('logoPreview').classList.remove('hidden');
  }
  if(state.setup.principalSign){
    $('signPreview').src = state.setup.principalSign;
    $('signPreview').classList.remove('hidden');
  }
}
loadSetupUI();

/* TEACHERS */
function clampMaxPerDay(el){
  const v=parseInt(el.value);
  if(!isNaN(v) && v>8) el.value=8;
}
function toggleSelectAll(containerId, btn) {
  const checkboxes = document.querySelectorAll(`#${containerId} input[type="checkbox"]`);
  if(checkboxes.length === 0) return;
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
  btn.textContent = allChecked ? 'Select All' : 'Deselect All';
}
// Keep the Select All / Deselect All button in sync when the user manually
// (un)checks an individual option afterwards — bind once per container,
// survives re-renders since the container element itself isn't replaced.
function bindCheckboxGroupSync(containerId){
  const container=document.getElementById(containerId);
  if(!container || container._syncBound) return;
  container._syncBound=true;
  container.addEventListener('change', e=>{
    if(e.target.type!=='checkbox') return;
    const checkboxes=container.querySelectorAll('input[type="checkbox"]');
    if(!checkboxes.length) return;
    const allChecked=Array.from(checkboxes).every(cb=>cb.checked);
    const btn=container.previousElementSibling && container.previousElementSibling.querySelector('button');
    if(btn) btn.textContent = allChecked ? 'Deselect All' : 'Select All';
  });
}

function nextTeacherId(){
  let n=1;
  while(state.teachers.some(t=>t.id==='T'+String(n).padStart(3,'0'))) n++;
  return 'T'+String(n).padStart(3,'0');
}
function openTeacherModal(id){
  editingIds.teacher=id;
  $('teacherModalTitle').textContent = id?'Edit Teacher':'Add Teacher';
  const t = id?state.teachers.find(x=>x.id===id):null;
  $('tId').value = t?t.id:nextTeacherId();
  $('tId').readOnly = !!t;
  $('tName').value = t?t.name:'';
  $('tLevel').value = t?t.level:'TGT';
  $('tMaxDay').value = t?t.maxPerDay:6;
  $('tMaxWeek').value = t?t.maxPerWeek:30;
  
  $('tSubjects').innerHTML = state.subjects.length?
    state.subjects.map(s=>`<label class="check-item">
      <input type="checkbox" value="${s.id}" ${t&&t.subjects.includes(s.id)?'checked':''}>
      <span>${s.code} — ${s.name}</span></label>`).join(''):
    '<div style="font-size:.8rem;color:var(--text-2);padding:.5rem;grid-column:1/-1;">No subjects added yet.</div>';

  $('tClasses').innerHTML = state.classes.length?
    state.classes.map(c=>`<label class="check-item">
      <input type="checkbox" value="${c.id}" ${t&&t.eligibleClasses&&t.eligibleClasses.includes(c.id)?'checked':''}>
      <span>${c.name}${c.section?' - '+c.section:''}${c.course?' ('+c.course+')':''}</span></label>`).join(''):
    '<div style="font-size:.8rem;color:var(--text-2);padding:.5rem;grid-column:1/-1;">No classes added yet.</div>';

  $('tUnavailable').innerHTML = ALL_DAYS.map(d=>`
    <label class="day-pill">
      <input type="checkbox" value="${d}" ${t&&t.unavailableDays&&t.unavailableDays.includes(d)?'checked':''}>
      <span>${d}</span>
    </label>`).join('');
  $('teacherModal').classList.remove('hidden');
  refreshSelects($('teacherModal'));
  bindCheckboxGroupSync('tSubjects');
  bindCheckboxGroupSync('tClasses');
}
function saveTeacher(){
  const id=$('tId').value.trim()||nextTeacherId();
  const name=$('tName').value.trim();
  if(!name){ toast('Teacher name required','error'); return; }
  if(state.teachers.some(t=>t.id===id && t.id!==editingIds.teacher)){
    toast('Teacher ID already exists','error'); return;
  }
  const subjects=[...document.querySelectorAll('#tSubjects input:checked')].map(x=>x.value);
  const eligibleClasses=[...document.querySelectorAll('#tClasses input:checked')].map(x=>x.value);
  const unavailableDays=[...document.querySelectorAll('#tUnavailable input:checked')].map(x=>x.value);
  const maxPerDay=Math.min(parseInt($('tMaxDay').value)||6, 8);
  const data={ id, name, level:$('tLevel').value, subjects, eligibleClasses, maxPerDay, maxPerWeek:parseInt($('tMaxWeek').value)||30, unavailableDays };

  if(editingIds.teacher){
    const i=state.teachers.findIndex(t=>t.id===editingIds.teacher);
    state.teachers[i]=data;
  } else state.teachers.push(data);

  // Sort by ID
  state.teachers.sort((a,b) => a.id.localeCompare(b.id));

  // Teacher qualified for exactly one subject → auto-map them on that
  // subject for every class they're eligible for (no manual mapping step needed).
  if(subjects.length===1){
    const sid=subjects[0];
    const targetClasses=eligibleClasses.length?state.classes.filter(c=>eligibleClasses.includes(c.id)):state.classes;
    targetClasses.forEach(c=>{
      let cs=c.subjects.find(s=>s.subjectId===sid);
      if(!cs){
        cs={ subjectId:sid, periodsPerWeek:5, teacherIds:[] };
        c.subjects.push(cs);
      }
      if(!cs.teacherIds.includes(id)) cs.teacherIds.push(id);
    });
  }

  save(); closeModal('teacherModal'); renderTeachers();
  toast('Teacher saved successfully!');
}
function deleteTeacher(id){
  const t=state.teachers.find(x=>x.id===id);
  customConfirm(`Delete teacher "${t?t.name:id}" (${id})? All their subject assignments will be removed.`, () => {
    state.teachers=state.teachers.filter(t=>t.id!==id);
    state.classes.forEach(c=>c.subjects.forEach(s=>s.teacherIds=s.teacherIds.filter(t=>t!==id)));
    save(); renderTeachers(); toast('Teacher deleted','warn');
  }, { type:'danger', title:'Delete Teacher', confirmText:'Delete' });
}
function renderTeachers(){
  $('teachersTable').innerHTML = state.teachers.length? state.teachers.map(t=>{
    const subjNames=t.subjects.map(sid=>{const s=state.subjects.find(x=>x.id===sid);return s?s.code:'';}).filter(Boolean);
    const clsNames=t.eligibleClasses&&t.eligibleClasses.length?t.eligibleClasses.map(cid=>{const c=state.classes.find(x=>x.id===cid);return c?`${c.name.replace('Class ','')}${c.section?'-'+c.section:''}`:'';}).filter(Boolean):[];
    return `<tr>
      <td><span class="badge badge-blue mono">${t.id}</span></td>
      <td><span class="badge badge-purple">${t.level||'TGT'}</span></td>
      <td style="font-weight:600;">${t.name}</td>
      <td>${subjNames.length?subjNames.map(s=>`<span class="subject-tag">${s}</span>`).join(''):'<span style="color:var(--muted);">—</span>'}</td>
      <td style="font-size:.8rem;color:var(--text-2);">${clsNames.length?clsNames.join(', '):'<span style="color:var(--muted);">—</span>'}</td>
      <td><span class="badge badge-amber">${t.maxPerDay}/day</span></td>
      <td><span class="badge badge-green">${t.maxPerWeek}/wk</span></td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="openTeacherMapping('${t.id}')"><i class="ri-map-pin-line"></i> Map</button>
          <button class="btn-icon" onclick="openTeacherModal('${t.id}')" title="Edit"><i class="ri-edit-line"></i></button>
          <button class="btn-icon" onclick="deleteTeacher('${t.id}')" title="Delete" style="color:var(--danger);"><i class="ri-delete-bin-line"></i></button>
        </div>
      </td>
    </tr>`;}).join(''): '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:2rem;">No teachers added yet.</td></tr>';
}

let currentMappingTeacherId = null;

function openTeacherMapping(tId) {
  currentMappingTeacherId = tId;
  const t = state.teachers.find(x => x.id === tId);
  $('teacherMappingTitle').textContent = `Map Subjects for ${t.name}`;
  
  const eligibleClasses = state.classes.filter(c => isTeacherEligibleForClass(t, c));
  
  let html = '';
  if(eligibleClasses.length === 0) {
    html = '<div style="color:var(--text-2);padding:1rem;text-align:center;">This teacher is not eligible for any classes. Please update their Teaching Level or Eligible Classes.</div>';
  } else {
    html = eligibleClasses.map(c => {
      let subjHtml = t.subjects.map(sid => {
        const subj = state.subjects.find(s => s.id === sid);
        if(!subj) return '';
        const classSubj = c.subjects.find(cs => cs.subjectId === sid);
        const isAssigned = classSubj && classSubj.teacherIds.includes(t.id);

        return `<label class="check-item">
          <input type="checkbox" class="mapping-cb" data-class="${c.id}" data-subject="${sid}" ${isAssigned ? 'checked' : ''}>
          <span>${subj.name} <span style="opacity:.6;">(${subj.code})</span></span>
        </label>`;
      }).join('');

      if(!subjHtml) subjHtml = '<div style="font-size:.8rem;color:var(--muted);padding:.5rem;">No subjects assigned to this teacher in their profile.</div>';
      
      return `<div class="mapping-class">
        <div style="font-weight:700;color:var(--text);margin-bottom:.75rem;">${c.name} ${c.section||''} ${c.course?'('+c.course+')':''}</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">${subjHtml}</div>
      </div>`;
    }).join('');
  }
  
  $('teacherMappingArea').innerHTML = html;
  $('teacherMappingModal').classList.remove('hidden');
}

function saveTeacherMapping() {
  const checkboxes = document.querySelectorAll('.mapping-cb');
  
  const intended = {};
  checkboxes.forEach(cb => {
    const cid = cb.dataset.class;
    const sid = cb.dataset.subject;
    if(!intended[cid]) intended[cid] = {};
    intended[cid][sid] = cb.checked;
  });
  
  state.classes.forEach(c => {
    if(intended[c.id]) {
      Object.keys(intended[c.id]).forEach(sid => {
        const isChecked = intended[c.id][sid];
        let cs = c.subjects.find(x => x.subjectId === sid);
        
        if(isChecked) {
          if(!cs) {
            cs = { subjectId: sid, teacherIds: [], periodsPerWeek: 5 };
            c.subjects.push(cs);
          }
          if(!cs.teacherIds.includes(currentMappingTeacherId)) {
            cs.teacherIds.push(currentMappingTeacherId);
          }
        } else {
          if(cs) {
            cs.teacherIds = cs.teacherIds.filter(tid => tid !== currentMappingTeacherId);
          }
        }
      });
    }
  });
  
  save();
  closeModal('teacherMappingModal');
  toast('Teacher mapping saved successfully!', 'success');
}

/* SUBJECTS */
function openSubjectModal(id){
  editingIds.subject=id;
  $('subjectModalTitle').textContent = id?'Edit Subject':'Add Subject';
  const s = id?state.subjects.find(x=>x.id===id):null;
  $('sCode').value = s?s.code:'';
  $('sName').value = s?s.name:'';
  $('sType').value = s?s.type:'theory';
  
  $('sElective').innerHTML = state.subjects.filter(x=>x.id!==id).length ?
    state.subjects.filter(x=>x.id!==id).map(x=>
      `<label class="check-item">
        <input type="checkbox" value="${x.id}" ${s&&s.alternativeIds&&s.alternativeIds.includes(x.id)?'checked':''} class="s-alt-cb">
        <span>${x.code} — ${x.name}</span>
      </label>`).join('') :
    '<div style="font-size:.8rem;color:var(--muted);padding:.5rem;grid-column:1/-1;">Add more subjects first to create elective groups.</div>';
  $('sTough').checked = s ? (s.tough !== false && (s.tough || isAutoToughSubject(s))) : false;
  $('sPriority').value = s && s.priority ? s.priority : 'semi-main';
  $('subjectModal').classList.remove('hidden');
  refreshSelects($('subjectModal'));
}
function isAutoToughSubject(s){
  if(!s) return false;
  const toughCodes=['PHY','CHM','MAT','BIO','ACC','SCI','MATH','MATHS'];
  return toughCodes.includes(s.code) || /physics|chemistry|mathematics|biology|accountancy|science/i.test(s.name);
}
function saveSubject(){
  const code=$('sCode').value.trim().toUpperCase();
  const name=$('sName').value.trim();
  if(!code||!name){ toast('Code and Name required','error'); return; }
  if(state.subjects.some(s=>s.code===code && s.id!==editingIds.subject)){
    toast('Subject code must be unique','error'); return;
  }
  const altIds=[...document.querySelectorAll('#sElective .s-alt-cb:checked')].map(o=>o.value);
  const tough=$('sTough').checked;
  const priority=$('sPriority').value;
  const data={ id:editingIds.subject||'sub_'+Date.now(), code, name, type:$('sType').value, priority, alternativeIds:altIds, tough };
  
  if(editingIds.subject){
    const i=state.subjects.findIndex(s=>s.id===editingIds.subject);
    data.id = state.subjects[i].id;
    state.subjects[i]=data;
  } else state.subjects.push(data);
  
  state.subjects.sort((a,b) => a.code.localeCompare(b.code));
  
  syncAlternativeGroups(data.id, altIds);
  
  save(); closeModal('subjectModal'); renderSubjects();
  toast('Subject saved!');
}
function deleteSubject(id){
  const s=state.subjects.find(x=>x.id===id);
  customConfirm(`Delete subject "${s?s.name+' ('+s.code+')':id}"? It will be removed from all teachers and classes.`, () => {
    state.subjects=state.subjects.filter(s=>s.id!==id);
    state.teachers.forEach(t=>t.subjects=t.subjects.filter(sid=>sid!==id));
    state.classes.forEach(c=>c.subjects=c.subjects.filter(s=>s.subjectId!==id));
    save(); renderSubjects(); toast('Subject deleted','warn');
  }, { type:'danger', title:'Delete Subject', confirmText:'Delete' });
}
function syncAlternativeGroups(subjectId, altIds){
  state.subjects.forEach(sx=>{
    if(sx.id===subjectId) return;
    if(altIds.includes(sx.id)){
      if(!sx.alternativeIds) sx.alternativeIds=[];
      if(!sx.alternativeIds.includes(subjectId)) sx.alternativeIds.push(subjectId);
      altIds.forEach(aid=>{
        if(aid!==sx.id && !sx.alternativeIds.includes(aid)) sx.alternativeIds.push(aid);
      });
    } else if(sx.alternativeIds){
      sx.alternativeIds=sx.alternativeIds.filter(id=>id!==subjectId);
    }
  });
  const allInGroup=new Set([subjectId,...altIds]);
  state.subjects.forEach(sx=>{
    if(allInGroup.has(sx.id)){
      if(!sx.alternativeIds) sx.alternativeIds=[];
      allInGroup.forEach(oid=>{
        if(oid!==sx.id && !sx.alternativeIds.includes(oid)) sx.alternativeIds.push(oid);
      });
    }
  });
}
function getElectiveGroup(subjectId){
  const subj=state.subjects.find(s=>s.id===subjectId);
  if(!subj||!subj.alternativeIds||!subj.alternativeIds.length) return [subjectId];
  return [subjectId,...subj.alternativeIds];
}
function renderSubjects(){
  $('subjectsTable').innerHTML = state.subjects.length? state.subjects.map(s=>{
    const altNames = s.alternativeIds&&s.alternativeIds.length ? s.alternativeIds.map(aid=>state.subjects.find(x=>x.id===aid)?.name).join(', ') : '—';
    const typeBadge={theory:'badge-blue',practical:'badge-purple',activity:'badge-green',language:'badge-amber'}[s.type]||'badge-blue';
    const subjPriority = s.priority || 'semi-main';
    const priorityBadge = subjPriority === 'main' ? '<span class="badge badge-amber">Main</span>' : (subjPriority === 'free' ? '<span class="badge badge-green">Free</span>' : '<span class="badge badge-blue">Semi-Main</span>');
    return `<tr>
      <td><span class="badge badge-blue mono">${s.code}</span></td>
      <td style="font-weight:600;">${s.name}</td>
      <td><span class="badge ${typeBadge}">${s.type}</span></td>
      <td>${priorityBadge}</td>
      <td style="font-size:.8rem;color:var(--text-2);">${altNames}</td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn-icon" onclick="openSubjectModal('${s.id}')" title="Edit"><i class="ri-edit-line"></i></button>
          <button class="btn-icon" onclick="deleteSubject('${s.id}')" title="Delete" style="color:var(--danger);"><i class="ri-delete-bin-line"></i></button>
        </div>
      </td>
    </tr>`;}).join(''): '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem;">No subjects added yet.</td></tr>';
}

/* CLASSES */
function handleClassNameChange(){
  const name=$('cName').value;
  const isSenior = name==='Class 11' || name==='Class 12';
  if(isSenior){
    $('cSection').value='';
    $('cSection').disabled=true;
    $('cSectionWrap').style.opacity='0.5';
    $('cCourse').disabled=false;
  } else {
    $('cSection').disabled=false;
    $('cSectionWrap').style.opacity='1';
    $('cCourse').value='';
    $('cCourse').disabled=true;
  }
  // Sync custom select disabled states
  document.querySelectorAll('#cCourse.cs-initialized, #cName.cs-initialized').forEach(sel => {
    const disp = sel.parentElement?.querySelector('.cs-display');
    if(disp) disp.setAttribute('data-disabled', sel.disabled ? 'true' : 'false');
  });
}
function populateInchargeSelect(selectedId){
  const sel=$('cIncharge');
  sel.innerHTML='<option value="">— None / Select Later —</option>';
  state.teachers.forEach(t=>{
    const opt=document.createElement('option');
    opt.value=t.id;
    opt.textContent=`${t.name} (${t.id})`;
    if(t.id===selectedId) opt.selected=true;
    sel.appendChild(opt);
  });
}

function openClassModal(id){
  editingIds.class=id;
  $('classModalTitle').textContent = id?'Edit Class':'Add Class';
  const c = id?state.classes.find(x=>x.id===id):null;
  $('cName').value = c?c.name:'Class 1';
  $('cSection').value = c?c.section:'A';
  $('cCourse').value = c?c.course:'';
  handleClassNameChange();
  populateInchargeSelect(c?c.inchargeId:'');
  $('cMaxPerDay').value = c&&c.maxPerDay!=null?c.maxPerDay:0;
  $('classModal').classList.remove('hidden');
  refreshSelects($('classModal'));
}
function saveClass(){
  const name=$('cName').value;
  const section=$('cSection').value.trim().toUpperCase();
  const course=$('cCourse').value;
  const isSenior = name==='Class 11' || name==='Class 12';
  
  if(isSenior){
    if(!course){ toast('Course stream required for 11th/12th','error'); return; }
    if(state.classes.some(c=>c.name===name&&c.course===course&&c.id!==editingIds.class)){
      toast('This class/course already exists','error'); return;
    }
  } else {
    if(!section){ toast('Section required','error'); return; }
    if(state.classes.some(c=>c.name===name&&c.section===section&&c.id!==editingIds.class)){
      toast('This class/section already exists','error'); return;
    }
  }
  
  const existing=editingIds.class?state.classes.find(x=>x.id===editingIds.class):null;
  
  let subjects = existing ? existing.subjects : [];
  if (!existing) {
    const siblingClass = state.classes.find(c => c.name === name && c.subjects && c.subjects.length > 0);
    if (siblingClass) {
      subjects = siblingClass.subjects.map(cs => ({ subjectId: cs.subjectId, periodsPerWeek: cs.periodsPerWeek, teacherIds: [] }));
      setTimeout(() => toast(`Subjects automatically copied from ${siblingClass.name} ${siblingClass.section||siblingClass.course||''}`, 'info'), 500);
    }
  }
  
  const inchargeId=$('cIncharge').value||'';
  const maxPerDay=Math.min(parseInt($('cMaxPerDay').value)||0, 8);
  const data={ id:editingIds.class||'cls_'+Date.now(), name, section:isSenior?'':section, course:isSenior?course:'', subjects, inchargeId, maxPerDay };
  if(editingIds.class){
    const i=state.classes.findIndex(c=>c.id===editingIds.class);
    state.classes[i]=data;
  } else state.classes.push(data);
  
  state.classes.sort((a,b) => {
    const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
    if(numA !== numB) return numA - numB;
    const secA = a.section || a.course || '';
    const secB = b.section || b.course || '';
    return secA.localeCompare(secB);
  });
  
  save(); closeModal('classModal'); renderClasses();
  toast('Class saved!');
}
function deleteClass(id){
  const cls=state.classes.find(c=>c.id===id);
  const label=cls?getClassLabel(cls):id;
  const usedBy=state.teachers.filter(t=>t.eligibleClasses&&t.eligibleClasses.includes(id));
  const msg = usedBy.length
    ? `Delete class "${label}"? It is used by these teachers: ${usedBy.map(t=>t.name).join(', ')}. Deleting it will NOT remove it from their eligible classes automatically — update that mapping yourself afterwards. Delete anyway?`
    : `Delete class "${label}" and all its subject mappings?`;
  customConfirm(msg, () => {
    state.classes=state.classes.filter(c=>c.id!==id);
    save(); renderClasses(); toast('Class deleted successfully!');
  }, { type:'danger', title:'Delete Class', confirmText:'Delete' });
}
function openClassSubjectsModal(clsId){
  editingIds.classSubj=clsId;
  const cls=state.classes.find(c=>c.id===clsId);
  $('classSubjectsTitle').textContent=`Subjects for ${cls.name} ${cls.section?'-'+cls.section:''} ${cls.course?'('+cls.course+')':''}`;

  /* ── Info rows: Course/Stream + Incharge + Max/Day ─────── */
  const inchargeTeacher=cls.inchargeId?state.teachers.find(t=>t.id===cls.inchargeId):null;
  let infoHtml=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:1.25rem;padding:12px 14px;background:var(--bg-alt);border-radius:var(--r-lg);border:1px solid var(--border);">`;

  if(cls.course){
    infoHtml+=`<div>
      <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-2);font-weight:600;margin-bottom:2px;">Course / Stream</div>
      <span class="badge badge-purple">${cls.course}</span>
    </div>`;
  }

  infoHtml+=`<div>
    <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-2);font-weight:600;margin-bottom:4px;">Class Incharge</div>`;
  if(inchargeTeacher){
    infoHtml+=`<div style="font-weight:600;font-size:.875rem;">${inchargeTeacher.name}</div>
      <span class="badge badge-blue mono" style="font-size:.7rem;">${inchargeTeacher.id}</span>`;
  } else {
    infoHtml+=`<span style="color:var(--muted);font-size:.85rem;">Not assigned</span>`;
  }
  infoHtml+=`</div>`;

  const maxDayDisplay=(cls.maxPerDay&&cls.maxPerDay>0)?`${cls.maxPerDay} periods/day`:'No cap';
  infoHtml+=`<div>
    <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-2);font-weight:600;margin-bottom:4px;">Max Periods / Day</div>
    <span class="badge badge-amber">${maxDayDisplay}</span>
  </div>`;

  infoHtml+=`</div>`;

  let html=infoHtml+`<table>
    <thead><tr>
      <th>Include</th>
      <th>Subject</th>
      <th>Periods/Week</th>
      <th style="text-align:center;">Priority</th>
      <th>Eligible Teachers</th>
    </tr></thead>
    <tbody>`;
  state.subjects.forEach(subj => {
    const mapped = cls.subjects.find(s => s.subjectId === subj.id);
    const checked = mapped ? 'checked' : '';
    const periods = mapped ? mapped.periodsPerWeek : '';
    const subjPriority = subj.priority || 'semi-main';
    const priorityBadge = subjPriority === 'main' ? '<span class="badge badge-amber">Main</span>' : (subjPriority === 'free' ? '<span class="badge badge-green">Free</span>' : '<span class="badge badge-blue">Semi-Main</span>');
    const eligibleT = state.teachers.filter(t => t.subjects.includes(subj.id) && (!t.eligibleClasses || t.eligibleClasses.includes(cls.id)));
    const tCheckboxes = eligibleT.map(t => {
      // Auto-select teachers explicitly mapped to this class (t.eligibleClasses
      // includes it) the first time this subject row is rendered; once the
      // mapping is saved, the stored teacherIds are the source of truth.
      const isChecked = mapped ? mapped.teacherIds.includes(t.id) : (t.eligibleClasses && t.eligibleClasses.includes(cls.id));
      return `
      <label class="check-item" style="font-size:.78rem;padding:.35rem .5rem;">
        <input type="checkbox" data-subj="${subj.id}" data-tid="${t.id}" ${isChecked ? 'checked' : ''}>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;" title="${t.name}">${t.name}</span>
      </label>`;
    }).join('');
    html += `<tr>
      <td style="text-align:center;"><input type="checkbox" data-subj="${subj.id}" class="include-cb" ${checked} onchange="toggleSubjInput(this)"></td>
      <td><strong style="color:var(--primary-h);">${subj.code}</strong><span style="display:block;font-size:.75rem;color:var(--text-2);">${subj.name}</span></td>
      <td><input type="number" min="0" max="15" value="${periods}" data-subj="${subj.id}" class="input periods-inp" style="width:72px;" ${mapped ? '' : 'disabled'}></td>
      <td style="text-align:center;">${priorityBadge}</td>
      <td><div style="display:flex;flex-wrap:wrap;gap:4px;">${tCheckboxes || '<span style="font-size:.78rem;color:var(--muted);font-style:italic;">No eligible teachers</span>'}</div></td>
    </tr>`;
  });
  html+='</tbody></table>';
  $('classSubjectsArea').innerHTML=html;
  const isSenior=cls.name==='Class 11'||cls.name==='Class 12';
  $('applyStreamBtn').style.display=isSenior&&cls.course?'inline-flex':'none';
  $('classSubjectsModal').classList.remove('hidden');
  /* no selects in this modal — table uses checkboxes/number inputs only */
}
const STREAM_TEMPLATES={
  'Medical':{sub_ENG:5,sub_PHY:7,sub_CHM:7,sub_BIO:7,sub_COM:4},
  'Non-Medical':{sub_ENG:5,sub_PHY:7,sub_CHM:7,sub_MAT:7,sub_PE:4},
  'Commerce':{sub_ENG:5,sub_ACC:8,sub_BST:7,sub_ECO:7,sub_INF:4},
  'Arts':{sub_ENG:5,sub_HIS:8,sub_ECO:6,sub_HIN:5,sub_PE:4}
};
function applyStreamTemplate(){
  const cls=state.classes.find(c=>c.id===editingIds.classSubj);
  if(!cls||!cls.course||!STREAM_TEMPLATES[cls.course]) return;
  const tmpl=STREAM_TEMPLATES[cls.course];
  state.subjects.forEach(subj=>{
    const key='sub_'+subj.code;
    const periods=tmpl[key];
    const cb=document.querySelector(`.include-cb[data-subj="${subj.id}"]`);
    const inp=document.querySelector(`.periods-inp[data-subj="${subj.id}"]`);
    if(!cb||!inp) return;
    if(periods){
      cb.checked=true; inp.disabled=false; inp.value=periods;
      const eligible=state.teachers.filter(t=>t.subjects.includes(subj.id)&&(!t.eligibleClasses||!t.eligibleClasses.length||t.eligibleClasses.includes(cls.id)));
      document.querySelectorAll(`input[data-subj="${subj.id}"][data-tid]`).forEach(tcb=>{
        tcb.checked=eligible.some(t=>t.id===tcb.dataset.tid);
      });
    } else {
      cb.checked=false; inp.disabled=true; inp.value='';
    }
  });
  toast(`Applied ${cls.course} stream template (CBSE pattern)`,'info');
}
function toggleSubjInput(cb){
  const inp=document.querySelector(`.periods-inp[data-subj="${cb.dataset.subj}"]`);
  inp.disabled=!cb.checked;
  if(!cb.checked) {
    inp.value='';
  }
  if(cb.checked && !inp.value) inp.value=5;
}
function saveClassSubjects(){
  const cls=state.classes.find(c=>c.id===editingIds.classSubj);
  cls.subjects=[];
  document.querySelectorAll('.include-cb:checked').forEach(cb => {
    const subjId=cb.dataset.subj;
    const periods=parseInt(document.querySelector(`.periods-inp[data-subj="${subjId}"]`).value)||0;
    const teacherIds=[...document.querySelectorAll(`input[data-subj="${subjId}"][data-tid]:checked`)].map(x=>x.dataset.tid);
    if(periods>0){
      cls.subjects.push({ subjectId:subjId, periodsPerWeek:periods, teacherIds });
    }
  });
  save(); closeModal('classSubjectsModal'); renderClasses();
  toast('Subjects mapped successfully!');
  
  const siblingClasses = state.classes.filter(c => c.name === cls.name && c.id !== cls.id);
  if(siblingClasses.length > 0) {
    const currentSubjectIds = cls.subjects.map(s => s.subjectId);
    let missingSections = [];
    siblingClasses.forEach(sib => {
      const sibSubjectIds = sib.subjects.map(s => s.subjectId);
      const hasMissing = currentSubjectIds.some(sid => !sibSubjectIds.includes(sid));
      if(hasMissing) {
        missingSections.push(sib.section || sib.course || sib.id);
      }
    });
    if(missingSections.length > 0) {
      setTimeout(() => toast(`Note: Section(s) ${missingSections.join(', ')} do not have some of these subjects.`, 'warn'), 1000);
    }
  }
}
function renderClasses(){
  $('classesTable').innerHTML = state.classes.length? state.classes.map(c=>{
    const totalPeriods=c.subjects.reduce((a,s)=>a+s.periodsPerWeek,0);
    const slots=state.setup.periodsPerDay*state.setup.workingDays.length;
    const fit = totalPeriods<=slots;
    const subjList = c.subjects.length ? c.subjects.map(s => {
      const sub = state.subjects.find(x=>x.id===s.subjectId);
      return `<span class="subject-tag mr-1 mb-1">${sub?.code}:${s.periodsPerWeek}p</span>`;
    }).join('') : '<span style="color:var(--muted);">No subjects mapped</span>';
    const inchargeTeacher = c.inchargeId ? state.teachers.find(t=>t.id===c.inchargeId) : null;
    const inchargeCell = inchargeTeacher
      ? `<div style="font-weight:600;font-size:.85rem;">${inchargeTeacher.name}</div><div><span class="badge badge-blue mono" style="font-size:.72rem;">${inchargeTeacher.id}</span></div>`
      : '<span style="color:var(--muted);font-size:.85rem;">—</span>';
    const maxDayCell = (c.maxPerDay && c.maxPerDay>0)
      ? `<span class="badge badge-amber">${c.maxPerDay}/day</span>`
      : '<span style="color:var(--muted);font-size:.85rem;">—</span>';
    return `<tr>
      <td style="font-weight:600;">${c.name}${c.section?' - '+c.section:''}</td>
      <td>${c.course?`<span class="badge badge-purple">${c.course}</span>`:'<span style="color:var(--muted);font-size:.85rem;">General</span>'}</td>
      <td>${inchargeCell}</td>
      <td>${maxDayCell}</td>
      <td>${subjList}</td>
      <td>${totalPeriods} / ${slots} ${fit?'<span class="badge badge-green" style="margin-left:4px;">OK</span>':'<span class="badge badge-red" style="margin-left:4px;">Over</span>'}</td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="openClassSubjectsModal('${c.id}')"><i class="ri-book-2-line"></i> Manage</button>
          <button class="btn-icon" onclick="openClassModal('${c.id}')" title="Edit"><i class="ri-edit-line"></i></button>
          <button class="btn-icon" onclick="deleteClass('${c.id}')" title="Delete" style="color:var(--danger);"><i class="ri-delete-bin-line"></i></button>
        </div>
      </td>
    </tr>`;}).join(''): '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:2rem;">No classes added yet.</td></tr>';
}

/* GENERATE */
function renderGenerateStats(){
  $('statClasses').textContent=state.classes.length;
  $('statTeachers').textContent=state.teachers.length;
  $('statSlots').textContent=state.classes.length*state.setup.periodsPerDay*state.setup.workingDays.length;
}
function validateBeforeGeneration(){
  const errors=[], warnings=[], teacherIssues=[];
  if(state.classes.length===0) errors.push('No classes defined');
  if(state.teachers.length===0) errors.push('No teachers defined');
  if(state.subjects.length===0) errors.push('No subjects defined');
  if(state.setup.workingDays.length===0) errors.push('No working days selected');
  const totalSlots=state.setup.periodsPerDay*state.setup.workingDays.length;
  const days=state.setup.workingDays.length;
  state.classes.forEach(c=>{
    const label=`${c.name}${c.section?'-'+c.section:''}${c.course?' ('+c.course+')':''}`;
    if(!c.subjects.length) errors.push(`${label}: No subjects mapped`);
    const total=c.subjects.reduce((a,s)=>a+s.periodsPerWeek,0);
    if(total<totalSlots) warnings.push(`${label}: ${total} periods/week vs ${totalSlots} slots — extra slots will use revision/repeat periods.`);
    if(total>totalSlots) errors.push(`${label}: ${total} periods/week exceeds ${totalSlots} available slots. Reduce subject load.`);
    c.subjects.forEach(s=>{
      const subj=state.subjects.find(x=>x.id===s.subjectId);
      const subjName=subj?subj.code:'Unknown';
      if(!s.teacherIds||!s.teacherIds.length) errors.push(`${label}: No teacher assigned for ${subjName}`);
      else {
        const eligible=state.teachers.filter(t=>t.subjects.includes(s.subjectId)&&(!t.eligibleClasses||!t.eligibleClasses.length||t.eligibleClasses.includes(c.id)));
        if(!eligible.length) teacherIssues.push(`${label}: No eligible teacher in system for ${subjName} (mapped IDs may be invalid)`);
        const weeklyCap=eligible.reduce((mx,t)=>mx+Math.min(t.maxPerWeek,s.periodsPerWeek),0);
        if(eligible.length && weeklyCap<s.periodsPerWeek) teacherIssues.push(`${label}: Possible teacher shortage for ${subjName} — need ${s.periodsPerWeek}p/wk, combined eligible capacity ~${weeklyCap}p/wk`);
      }
      // New column-lock engine handles > numDays periods by spilling to extra columns — no daily cap warning needed
    });
  });
  const seniorLevels=['Class 11','Class 12'];
  seniorLevels.forEach(lvl=>{
    const group=state.classes.filter(c=>c.name===lvl);
    if(group.length>1){
      const commonSubjIds=[...new Set(group.flatMap(c=>c.subjects.map(s=>s.subjectId)))].filter(sid=>{
        return group.filter(c=>c.subjects.some(s=>s.subjectId===sid)).length>=2;
      });
      if(commonSubjIds.length) warnings.push(`${lvl}: ${commonSubjIds.length} common subject(s) across streams will be synchronized in same periods (CBSE/KVS pattern).`);
    }
  });
  let html='';
  if(errors.length) html+=`<div class="alert alert-error mb-3"><i class="ri-close-circle-line alert-icon"></i><div class="alert-body"><div class="alert-title">Critical Errors</div><ul>${errors.map(e=>`<li>${e}</li>`).join('')}</ul></div></div>`;
  if(teacherIssues.length) html+=`<div class="alert alert-warn mb-3"><i class="ri-user-star-line alert-icon"></i><div class="alert-body"><div class="alert-title">Teacher Shortage Risks</div><ul>${teacherIssues.map(e=>`<li>${e}</li>`).join('')}</ul></div></div>`;
  if(warnings.length) html+=`<div class="alert alert-warn"><i class="ri-alert-line alert-icon"></i><div class="alert-body"><div class="alert-title">Warnings</div><ul>${warnings.map(w=>`<li>${w}</li>`).join('')}</ul></div></div>`;
  if(!errors.length && !warnings.length && !teacherIssues.length) html=`<div class="alert alert-success"><i class="ri-checkbox-circle-line alert-icon"></i><div class="alert-body"><div class="alert-title">All checks passed!</div>Ready to generate the timetable.</div></div>`;
  $('genErrors').innerHTML=html;
  $('genErrors').classList.remove('hidden');
}

function logMsg(msg,type='info'){
  const styles={
    info:    'color:var(--text-2);',
    success: 'color:var(--success);',
    warn:    'color:var(--warn);',
    error:   'color:var(--danger);',
    step:    'color:var(--primary-h);font-weight:700;'
  };
  const icons={
    info:'', success:'[OK] ', warn:'[WARN] ', error:'[ERR] ', step:'>> '
  };
  const div=document.createElement('div');
  div.style.cssText = styles[type]||styles.info;
  const clean = msg.replace(/📚|👨‍🏫|📋|✓|✅|❌|🚀/g,'').trim();
  div.textContent = (icons[type]||'') + clean;
  $('genLog').appendChild(div);
  $('genLog').scrollTop=$('genLog').scrollHeight;
}

function getSubjectDifficulty(subjectId){
  const s=state.subjects.find(x=>x.id===subjectId);
  if(!s) return 0;
  if(s.tough||isAutoToughSubject(s)) return 100;
  if(s.type==='practical') return 70;
  if(s.type==='theory') return 50;
  if(s.type==='language') return 40;
  if(s.type==='activity') return 10;
  return 30;
}

function getClassLabel(cls){
  return `${cls.name}${cls.section?'-'+cls.section:''}${cls.course?' ('+cls.course+')':''}`;
}

/* ── Teacher slot free — with strict double-booking guard ── */
function isTeacherGloballyFree(timetable, tid, d, p){
  if(!timetable.teachers[tid]) return false;
  return !timetable.teachers[tid][d][p];
}

function countConsecutiveBefore(timetable, tid, d, p){
  let n=0;
  for(let i=p-1;i>=0;i--){
    if(timetable.teachers[tid][d][i]) n++;
    else break;
  }
  return n;
}

function isTeacherSlotFree(timetable, tid, d, p, day, opts={}){
  const t=state.teachers.find(x=>x.id===tid);
  if(!t) return false;
  if(t.unavailableDays&&t.unavailableDays.includes(day)) return false;
  // Strict double-booking guard: teacher already has something at this cell
  if(!isTeacherGloballyFree(timetable, tid, d, p)) return false;
  if(!opts.ignoreDailyCap && timetable.teacherDailyCount[tid][day]>=t.maxPerDay) return false;
  if(timetable.teacherWeeklyCount[tid]>=t.maxPerWeek) return false;
  if(countConsecutiveBefore(timetable,tid,d,p)>=3) return false;
  return true;
}

function getAllTeachersForSubject(subjectId, classId, preferredIds=[], timetable=null){
  const preferred=new Set(preferredIds||[]);
  const pool=state.teachers.filter(t=>{
    if(!t.subjects.includes(subjectId)) return false;
    if(t.eligibleClasses&&t.eligibleClasses.length&&!t.eligibleClasses.includes(classId)) return false;
    return true;
  });
  const tt=timetable||state.timetable;
  return [...pool].sort((a,b)=>{
    const ap=preferred.has(a.id)?0:1, bp=preferred.has(b.id)?0:1;
    if(ap!==bp) return ap-bp;
    return (tt?.teacherWeeklyCount?.[a.id]||0)-(tt?.teacherWeeklyCount?.[b.id]||0);
  });
}

function pickTeacherForSlot(timetable, subjectId, classId, preferredIds, d, p, day){
  const candidates=getAllTeachersForSubject(subjectId, classId, preferredIds, timetable);
  for(const tObj of candidates){
    if(isTeacherSlotFree(timetable,tObj.id,d,p,day)) return tObj.id;
  }
  for(const tObj of candidates){
    if(isTeacherSlotFree(timetable,tObj.id,d,p,day,{ignoreDailyCap:true})) return tObj.id;
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 1 — COLUMN-LOCK SUBJECT ASSIGNMENT
   ═══════════════════════════════════════════════════════════════

   Core rule: every period-column (P1…P8) runs identically across
   ALL working days for a given class.  The timetable is filled
   column-by-column (not row-by-row).

   For each column P we build a "schedule" — an ordered sequence of
   [subjectId, daysCount] segments that fills the column top to bottom
   (Mon → Sat).  Example with 6 working days:

     ENG has 5 p/wk  →  ENG × 5 days, then next subject × 1 day
     PHY has 7 p/wk  →  PHY × 6 days (full column), overflow of 1
                         goes to NEXT column's start

   Rules enforced per column:
   • P1–P5  →  main-priority subjects only (academic block)
   • P6+    →  any priority (activity block)
   • No subject appears twice in the SAME column (one subject per column)
     UNLESS it has surplus periods after filling other columns
   • Subjects are sorted by priority first (main > semi-main > free),
     then by periodsPerWeek descending, so high-load subjects anchor
     the first columns

   After the column schedule is built, each cell [day][period] is set
   directly from the schedule.  Teacher locking in Phase 2 then follows
   the same column structure: same teacher for the same (subject, period)
   across all days that column runs.
═══════════════════════════════════════════════════════════════ */

/*
  COLUMN-LOCK PHASE 1 — cross-class teacher-aware
  ─────────────────────────────────────────────────
  Core guarantees:
    ✔ Same subject fills the same period column consecutively (Mon→Sat)
      until weekly quota done; next subject takes over remaining days
    ✔ P1–P5 (academic block): main-priority subjects only
    ✔ No same-day repeat of any subject inside P1–P5
    ✔ Cross-class teacher conflict prevention:
        before placing subject S at (cls, day, period), count how many
        classes already have S at (day, period) and compare against the
        number of teachers who can teach S and are available that day.
        If all teachers are already taken → skip S, try next subject.
        This prevents "1 teacher, 2 classes, same period" hard conflicts.
  ─────────────────────────────────────────────────
*/
function phase1AssignSubjects(days, periods){
  logMsg('📚 Phase 1: Column-lock subject assignment...','step');

  const D=days.length;
  const subjectPlan={};
  const errors=[], warnings=[];
  state.classes.forEach(c=>{
    subjectPlan[c.id]=Array.from({length:D},()=>Array(periods).fill(null));
  });

  /* ── Real per-teacher slot-occupancy tracking (shared across ALL
     classes) ───────────────────────────────────────────────────
     Mirrors the actual constraints Phase 2 enforces (unavailableDays,
     eligibleClasses, maxPerDay, maxPerWeek, and — critically — that a
     single physical teacher cannot be double-booked at the same (d,p)
     for two different classes). Phase 1 must never "believe" a slot is
     placeable when no teacher could really cover it, or the gap just
     shows up later as a Phase-2 shortage / silent unscheduled period.
  ───────────────────────────────────────────────────────────────── */
  const tBusy={};  // tBusy[tid][d][p] = true once committed to some class
  const tDay={};   // tDay[tid][d] = periods committed that day (any class)
  const tWeek={};  // tWeek[tid] = total periods committed this week
  state.teachers.forEach(t=>{
    tBusy[t.id]={};
    tDay[t.id]={};
    days.forEach((_,d)=>{ tBusy[t.id][d]={}; tDay[t.id][d]=0; });
    tWeek[t.id]=0;
  });

  function findFreeTeacher(sid, cls, d, p){
    const day=days[d];
    const mapping=cls.subjects.find(s=>s.subjectId===sid);
    const preferred=new Set(mapping?mapping.teacherIds:[]);
    const candidates=state.teachers.filter(t=>
      t.subjects.includes(sid) &&
      (!t.eligibleClasses||!t.eligibleClasses.length||t.eligibleClasses.includes(cls.id)) &&
      (!t.unavailableDays||!t.unavailableDays.includes(day)) &&
      !tBusy[t.id][d][p] &&
      tDay[t.id][d]<t.maxPerDay &&
      tWeek[t.id]<t.maxPerWeek
    ).sort((a,b)=>{
      const ap=preferred.has(a.id)?0:1, bp=preferred.has(b.id)?0:1;
      if(ap!==bp) return ap-bp;
      return tWeek[a.id]-tWeek[b.id]; // load-balance across equally-eligible teachers
    });
    return candidates[0]?.id||null;
  }

  function canPlaceHere(sid, cls, d, p){
    return findFreeTeacher(sid, cls, d, p)!==null;
  }

  function markPlaced(sid, cls, d, p){
    const tid=findFreeTeacher(sid, cls, d, p);
    if(tid){
      tBusy[tid][d][p]=true;
      tDay[tid][d]++;
      tWeek[tid]++;
    }
  }

  /* ── Per-class priority queue + remaining-quota state, built once
     up front so it can be threaded through the shared d/p grid below. ── */
  const classState={};
  state.classes.forEach((cls,clsIdx)=>{
    if(!cls.subjects.length) return;

    const sorted=[...cls.subjects].sort((a,b)=>{
      const sa=state.subjects.find(x=>x.id===a.subjectId);
      const sb=state.subjects.find(x=>x.id===b.subjectId);
      const pa=sa?(sa.priority||'semi-main'):'semi-main';
      const pb=sb?(sb.priority||'semi-main'):'semi-main';
      const rank={'main':0,'semi-main':1,'free':2};
      if(rank[pa]!==rank[pb]) return rank[pa]-rank[pb];
      const tA=(sa&&(sa.tough||isAutoToughSubject(sa)))?-1:0;
      const tB=(sb&&(sb.tough||isAutoToughSubject(sb)))?-1:0;
      if(tA!==tB) return tA-tB;
      return b.periodsPerWeek-a.periodsPerWeek;
    });

    /* Classes with identical curricula (same subjects, same quotas) sort
       into IDENTICAL tie order, so their greedy column-fill lands every
       tied subject in the exact same period-column at the exact same
       time — the very cells where a scarce single shared teacher (e.g.
       one PHE/SKT/STM/LIB teacher covering all sections) can only serve
       ONE class. With the grid at exact capacity (no slack columns to
       recover in), that collision permanently strands the loser's
       periods. Rotating each tie-group by the class's index staggers
       identical-quota classes onto different columns so they stop
       fighting over the same teacher at the same instant. */
    const tieKey=(s)=>{
      const ss=state.subjects.find(x=>x.id===s.subjectId);
      const pr=ss?(ss.priority||'semi-main'):'semi-main';
      const tough=(ss&&(ss.tough||isAutoToughSubject(ss)))?1:0;
      return `${pr}|${tough}|${s.periodsPerWeek}`;
    };
    for(let i=0;i<sorted.length;){
      let j=i+1;
      while(j<sorted.length && tieKey(sorted[j])===tieKey(sorted[i])) j++;
      const groupLen=j-i;
      if(groupLen>1){
        const shift=clsIdx%groupLen;
        const group=sorted.slice(i,j);
        const rotated=group.slice(shift).concat(group.slice(0,shift));
        for(let k=0;k<groupLen;k++) sorted[i+k]=rotated[k];
      }
      i=j;
    }

    const rem={};
    sorted.forEach(s=>{ rem[s.subjectId]=s.periodsPerWeek; });
    classState[cls.id]={ sorted, rem, qi:0 };
  });

  /* findNext: scan forward from cs.qi, skipping subjects that:
     1. have rem==0  (exhausted)
     2. are non-main in academic column while main subjects still remain
     3. would cause a same-day repeat inside P1–P5
     4. have no real teacher available at (d, p) right now
  */
  function findNext(cls, cs, isAcademic, d, p){
    const { sorted, rem } = cs;
    const seenTodayFor=(sid)=>{
      for(let pp=0;pp<p;pp++){
        if(subjectPlan[cls.id][d][pp]===sid) return true;
      }
      return false;
    };
    /* "Main left" must mean available for THIS cell, not merely nonzero
       for the week. With only a handful of main subjects sharing 5
       academic columns, every main can easily have already appeared
       earlier today (no-repeat rule) while still holding weekly
       quota — checking global rem>0 here deadlocks column P5 (every
       main blocked by same-day-repeat, but non-main also blocked
       because mains "aren't exhausted yet"), leaving it permanently
       FREE and pushing main overflow into the activity block instead
       of the semi-main/free subjects that belong there. */
    const anyMainAvailableToday=()=>sorted.some(s=>{
      const ss=state.subjects.find(x=>x.id===s.subjectId);
      if(!ss||ss.priority!=='main') return false;
      if((rem[s.subjectId]||0)<=0) return false;
      if(p<5 && seenTodayFor(s.subjectId)) return false;
      return true;
    });

    for(let i=cs.qi;i<sorted.length;i++){
      const sid=sorted[i].subjectId;
      if((rem[sid]||0)<=0) continue;

      if(isAcademic){
        const ss=state.subjects.find(x=>x.id===sid);
        const pr=ss?(ss.priority||'semi-main'):'semi-main';
        if(pr!=='main' && anyMainAvailableToday()) continue;
      }

      if(p<5 && seenTodayFor(sid)) continue;

      if(!canPlaceHere(sid, cls, d, p)) continue;

      return i;
    }
    return -1;
  }

  /*
    Fill the grid period-column-first, but interleave ALL classes within
    each (p, d) cell (period outer → day → class), instead of finishing
    one class's entire column before starting the next. This is what
    lets a subject with a single teacher shared across several classes
    (e.g. one PHE/SKT/STM/LIB teacher covering 3 sections) get spread
    fairly across different (d,p) cells for each class, rather than the
    first-processed class silently draining the teacher's whole day/week
    cap before the others get a turn.

    qi = pointer into sorted[] per class. Advances ONLY when sorted[qi]
    is exhausted (rem=0). When a teacher conflict forces an alternative
    (vi > qi), qi stays put so the primary subject is retried on the very
    next cell — no subjects get permanently skipped.

    Slots with no placeable subject are left null (FREE) — Phase 2 (or a
    later pass) may still fill true gaps, but nothing is over-filled.
    Each subject appears EXACTLY periodsPerWeek times.
  */
  for(let p=0;p<periods;p++){
    const isAcademic=p<5;
    for(let d=0;d<D;d++){
      state.classes.forEach(cls=>{
        const cs=classState[cls.id];
        if(!cs) return;

        while(cs.qi<cs.sorted.length&&(cs.rem[cs.sorted[cs.qi].subjectId]||0)<=0) cs.qi++;
        if(cs.qi>=cs.sorted.length) return; // all quotas met → slot stays FREE

        const vi=findNext(cls, cs, isAcademic, d, p);
        if(vi===-1) return; // every candidate blocked for this cell → slot stays FREE

        const sid=cs.sorted[vi].subjectId;
        subjectPlan[cls.id][d][p]=sid;
        markPlaced(sid, cls, d, p);
        cs.rem[sid]--;

        if(vi===cs.qi && cs.rem[sid]<=0) cs.qi++;
      });
    }
  }

  state.classes.forEach(cls=>{
    const cs=classState[cls.id];
    if(!cs) return;
    cs.sorted.forEach(s=>{
      if((cs.rem[s.subjectId]||0)>0){
        const subj=state.subjects.find(x=>x.id===s.subjectId);
        warnings.push(`${getClassLabel(cls)}: ${subj?.code||s.subjectId} — ${cs.rem[s.subjectId]} period(s) unscheduled (teacher unavailable at every remaining slot)`);
      }
    });
  });

  logMsg(`✓ Phase 1 complete — ${errors.length} errors, ${warnings.length} warnings`, errors.length?'error':'success');
  return { subjectPlan, errors, warnings };
}

function phase2AssignTeachers(subjectPlan, days, periods){
  logMsg('👨‍🏫 Phase 2: Assigning teachers to subject slots...','step');
  const timetable={
    classes:{}, teachers:{}, teacherDailyCount:{}, teacherWeeklyCount:{},
    teacherPlan:{}, assignmentErrors:[]
  };
  state.classes.forEach(c=>{
    timetable.classes[c.id]=Array(days.length).fill(null).map(()=>Array(periods).fill(null));
    timetable.teacherPlan[c.id]=Array(days.length).fill(null).map(()=>Array(periods).fill(null));
  });
  state.teachers.forEach(t=>{
    timetable.teachers[t.id]=Array(days.length).fill(null).map(()=>Array(periods).fill(null));
    timetable.teacherDailyCount[t.id]={};
    days.forEach(d=>timetable.teacherDailyCount[t.id][d]=0);
    timetable.teacherWeeklyCount[t.id]=0;
  });

  /* ── Helper: assign one slot, updating all counters ───────── */
  function commitAssignment(cls, d, p, day, subjectId, teacherId){
    timetable.classes[cls.id][d][p]={subjectId,teacherId};
    timetable.teacherPlan[cls.id][d][p]=teacherId;
    timetable.teachers[teacherId][d][p]={classId:cls.id,subjectId};
    timetable.teacherDailyCount[teacherId][day]++;
    timetable.teacherWeeklyCount[teacherId]++;
  }

  function tryAssignSlot(cls, d, p, day, subjectId){
    // Guard: slot already filled
    if(timetable.classes[cls.id][d][p]&&!timetable.classes[cls.id][d][p].unassigned&&
       timetable.classes[cls.id][d][p].teacherId) return true;

    const mapping=cls.subjects.find(s=>s.subjectId===subjectId);
    const preferredIds=mapping?mapping.teacherIds:[];
    const teacherId=pickTeacherForSlot(timetable,subjectId,cls.id,preferredIds,d,p,day);
    if(teacherId){
      commitAssignment(cls,d,p,day,subjectId,teacherId);
      return true;
    }
    const subj=state.subjects.find(s=>s.id===subjectId);
    const allPool=getAllTeachersForSubject(subjectId,cls.id,preferredIds,timetable);
    timetable.assignmentErrors.push(`Teacher shortage: ${getClassLabel(cls)} — ${subj?.code||'?'} on ${day} P${p+1} (checked ${allPool.length} teacher(s): ${allPool.map(t=>t.name).join(', ')||'none'})`);
    timetable.classes[cls.id][d][p]={subjectId,teacherId:null,unassigned:true};
    return false;
  }

  /* ══════════════════════════════════════════════════════════
     TEACHER COLUMN-LOCK
     Same subject in the same period-column → same teacher across
     all days that column has that subject.

     teacherColumnLock[clsId][periodIdx][subjectId] = teacherId
     Established on the first day the (period, subject) pair appears.
     All subsequent days with the same (period, subject) must reuse
     the same teacher (if still within their weekly/daily cap).
  ══════════════════════════════════════════════════════════ */
  const teacherColumnLock = {};
  state.classes.forEach(c=>{ teacherColumnLock[c.id]={}; });

  /* ── PASS 0 — Class Incharge gets Period 1 (p=0) every day ──
     P1 of every class, every day → incharge teacher.
     Continues until incharge hits weekly cap or unavailable.
  ──────────────────────────────────────────────────────────── */
  state.classes.forEach(cls=>{
    if(!cls.inchargeId) return;
    const inchargeTeacher=state.teachers.find(t=>t.id===cls.inchargeId);
    if(!inchargeTeacher) return;

    for(let d=0;d<days.length;d++){
      const day=days[d];
      const subjectId=subjectPlan.subjectPlan[cls.id][d][0]; // P1 = index 0
      if(!subjectId) continue;
      // Never swap the subject into the incharge's own — only take P1 if
      // they're actually a mapped teacher for whatever subject already
      // sits there. Otherwise leave it for Pass 1 to assign normally.
      const inchargeMapping=cls.subjects.find(s=>s.subjectId===subjectId);
      if(!inchargeMapping || !inchargeMapping.teacherIds.includes(inchargeTeacher.id)) continue;
      if(timetable.teacherWeeklyCount[inchargeTeacher.id]>=inchargeTeacher.maxPerWeek) continue;
      if(inchargeTeacher.unavailableDays&&inchargeTeacher.unavailableDays.includes(day)) continue;
      if(!isTeacherGloballyFree(timetable,inchargeTeacher.id,d,0)) continue;
      if(timetable.teacherDailyCount[inchargeTeacher.id][day]>=inchargeTeacher.maxPerDay) continue;
      commitAssignment(cls,d,0,day,subjectId,inchargeTeacher.id);
      // Record column lock for P1 of this class
      if(!teacherColumnLock[cls.id][0]) teacherColumnLock[cls.id][0]={};
      teacherColumnLock[cls.id][0][subjectId]=inchargeTeacher.id;
    }
  });

  /* ── PASS 1 — Column-locked teacher assignment ─────────────
     Process column by column (period first, then days).
     For each (class, period):
       • Day 0: pick the best available teacher, lock it.
       • Day 1+: reuse the locked teacher for the same subject;
                 if locked teacher unavailable/over-cap → pick next
                 best and update the lock for this subject.
       • When the subject CHANGES within a column (because the first
         subject exhausted its quota), a new lock is established for
         the new subject.
  ──────────────────────────────────────────────────────────── */
  for(let p=0;p<periods;p++){
    state.classes.forEach(cls=>{
      if(!teacherColumnLock[cls.id][p]) teacherColumnLock[cls.id][p]={};
    });

    // Day outer, class inner — mirrors Phase 1's interleaving so a teacher
    // shared across classes gets distributed fairly instead of one class
    // draining the whole day/week cap before the others get a turn.
    for(let d=0;d<days.length;d++){
      const day=days[d];

      for(const cls of state.classes){
        const subjectId=subjectPlan.subjectPlan[cls.id][d][p];
        if(!subjectId) continue;

        // Already assigned (e.g. by incharge pass)?
        const existing=timetable.classes[cls.id][d][p];
        if(existing&&!existing.unassigned&&existing.teacherId) continue;

        const mapping=cls.subjects.find(s=>s.subjectId===subjectId);
        const preferredIds=mapping?mapping.teacherIds:[];

        // Try the column-locked teacher for this subject first
        const lockedTid=teacherColumnLock[cls.id][p][subjectId];
        if(lockedTid){
          const lTeacher=state.teachers.find(t=>t.id===lockedTid);
          if(lTeacher && isTeacherSlotFree(timetable,lockedTid,d,p,day)){
            commitAssignment(cls,d,p,day,subjectId,lockedTid);
            continue;
          }
          // Locked teacher unavailable — try with ignoreDailyCap
          if(lTeacher && isTeacherSlotFree(timetable,lockedTid,d,p,day,{ignoreDailyCap:true})){
            commitAssignment(cls,d,p,day,subjectId,lockedTid);
            continue;
          }
        }

        // No lock yet or locked teacher unavailable — pick best available
        const teacherId=pickTeacherForSlot(timetable,subjectId,cls.id,preferredIds,d,p,day);
        if(teacherId){
          commitAssignment(cls,d,p,day,subjectId,teacherId);
          // Establish / update column lock for this subject
          teacherColumnLock[cls.id][p][subjectId]=teacherId;
        } else {
          // Teacher shortage
          if(existing&&existing.unassigned) timetable.classes[cls.id][d][p]=null;
          const subj=state.subjects.find(s=>s.id===subjectId);
          const allPool=getAllTeachersForSubject(subjectId,cls.id,preferredIds,timetable);
          timetable.assignmentErrors.push(`Teacher shortage: ${getClassLabel(cls)} — ${subj?.code||'?'} on ${day} P${p+1} (checked ${allPool.length} teacher(s): ${allPool.map(t=>t.name).join(', ')||'none'})`);
          timetable.classes[cls.id][d][p]={subjectId,teacherId:null,unassigned:true};
        }
      }
    }
  }

  /* ── PASS 2 — Retry any remaining unassigned slots ─────── */
  for(let d=0;d<days.length;d++){
    const day=days[d];
    for(let p=0;p<periods;p++){
      for(const cls of state.classes){
        const subjectId=subjectPlan.subjectPlan[cls.id][d][p];
        if(!subjectId) continue;
        const existing=timetable.classes[cls.id][d][p];
        if(!existing||(!existing.unassigned&&existing.teacherId)) continue;
        // Clear the bad marker
        timetable.classes[cls.id][d][p]=null;
        const errLabel=`Teacher shortage: ${getClassLabel(cls)}`;
        let idx=-1;
        for(let ei=timetable.assignmentErrors.length-1;ei>=0;ei--){
          if(timetable.assignmentErrors[ei].startsWith(errLabel)){idx=ei;break;}
        }
        if(idx>-1) timetable.assignmentErrors.splice(idx,1);

        const mapping=cls.subjects.find(s=>s.subjectId===subjectId);
        const preferredIds=mapping?mapping.teacherIds:[];
        const teacherId=pickTeacherForSlot(timetable,subjectId,cls.id,preferredIds,d,p,day);
        if(teacherId){
          commitAssignment(cls,d,p,day,subjectId,teacherId);
          if(!teacherColumnLock[cls.id][p]) teacherColumnLock[cls.id][p]={};
          teacherColumnLock[cls.id][p][subjectId]=teacherId;
        } else {
          const subj=state.subjects.find(s=>s.id===subjectId);
          const allPool=getAllTeachersForSubject(subjectId,cls.id,preferredIds,timetable);
          timetable.assignmentErrors.push(`Teacher shortage: ${getClassLabel(cls)} — ${subj?.code||'?'} on ${day} P${p+1} (no teacher available)`);
          timetable.classes[cls.id][d][p]={subjectId,teacherId:null,unassigned:true};
        }
      }
    }
  }

  /* ── Consecutive-period check (warn, not error) ────────── */
  state.teachers.forEach(t=>{
    for(let d=0;d<days.length;d++){
      let streak=0;
      for(let p=0;p<periods;p++){
        if(timetable.teachers[t.id][d][p]){ streak++; if(streak>3) timetable.assignmentErrors.push(`Constraint: ${t.name} has ${streak} consecutive periods on ${days[d]} (max 3)`); }
        else streak=0;
      }
    }
  });

  logMsg(`✓ Phase 2 complete — ${timetable.assignmentErrors.length} teacher issues`, timetable.assignmentErrors.length?'warn':'success');
  return timetable;
}

function phase3Finalize(timetable, subjectPlan){
  logMsg('📋 Phase 3: Building final timetable...','step');
  timetable.meta={
    generatedAt:new Date().toISOString(),
    phases:['subjects','teachers','final'],
    subjectShortages:subjectPlan.errors.filter(e=>e.includes('Subject shortage')),
    teacherShortages:timetable.assignmentErrors.filter(e=>e.includes('Teacher shortage'))
  };
  logMsg('✅ Final timetable ready','success');
  return timetable;
}

let pendingTimetable = null;
let pendingSubjectPlan = null;

function forceGenerateTimetable(){
  if(!pendingTimetable || !pendingSubjectPlan) return;
  $('genErrors').innerHTML='';
  $('genErrors').classList.add('hidden');
  renderGenSuccess(pendingTimetable, pendingSubjectPlan, true);
}

function renderGenSuccess(timetable, subjectPlan, isForced=false){
  const days=state.setup.workingDays, periods=state.setup.periodsPerDay;
  state.timetable=phase3Finalize(timetable,subjectPlan);
  if(!state.history) state.history = [];
  state.history.unshift({ timestamp: new Date().toISOString(), timetable: JSON.parse(JSON.stringify(state.timetable)) });
  if(state.history.length>10) state.history.pop();
  save();

  let totalFree=0, totalUnassigned=0;
  state.classes.forEach(c=>{
    for(let d=0;d<days.length;d++) for(let p=0;p<periods;p++){
      const slot=state.timetable.classes[c.id][d][p];
      if(!slot) totalFree++;
      else if(slot.unassigned||!slot.teacherId) totalUnassigned++;
    }
  });

  if(subjectPlan.warnings.length){
    let warnHtml=`<div class="alert alert-warn mb-3"><i class="ri-alert-line alert-icon"></i><div class="alert-body"><div class="alert-title">Generation Warnings</div><ul>${subjectPlan.warnings.map(e=>`<li>${e}</li>`).join('')}</ul></div></div>`;
    $('genErrors').innerHTML = warnHtml;
    $('genErrors').classList.remove('hidden');
  }

  const type = isForced ? 'warn' : 'success';
  const icon = isForced ? 'ri-alert-line' : 'ri-checkbox-circle-line';
  const title = isForced ? 'Timetable Forced Generated' : 'Timetable Generated Successfully';
  $('genSuccess').innerHTML=`<div class="alert alert-${type}">
    <i class="${icon} alert-icon"></i>
    <div class="alert-body">
      <div class="alert-title">${title}</div>
      <div style="margin-top:.35rem;font-size:.85rem;opacity:.85;">
        Flow: Subjects assigned → Teachers assigned → Final timetable built<br>
        Empty slots: ${totalFree} · Main subjects prioritized · Senior streams synchronized (CBSE/KVS)
      </div>
    </div>
  </div>`;
  $('genSuccess').classList.remove('hidden');
  toast(isForced ? 'Timetable forced!' : 'Timetable generated successfully!', isForced ? 'warn' : 'success');
}

function generateTimetable(){
  $('genLog').classList.remove('hidden');
  $('genLog').innerHTML='';
  $('genErrors').classList.add('hidden');
  $('genSuccess').classList.add('hidden');

  logMsg('🚀 Starting 3-phase timetable generation (Subjects → Teachers → Final)...','step');
  const days=state.setup.workingDays;
  const periods=state.setup.periodsPerDay;

  const errors=[];
  if(state.classes.length===0) errors.push('No classes defined');
  if(state.teachers.length===0) errors.push('No teachers defined');
  if(state.subjects.length===0) errors.push('No subjects defined');
  if(days.length===0) errors.push('No working days selected');
  if(errors.length){
    $('genErrors').innerHTML=`<div class="alert alert-error"><i class="ri-close-circle-line alert-icon"></i><div class="alert-body"><div class="alert-title">Cannot Generate</div><ul>${errors.map(e=>`<li>${e}</li>`).join('')}</ul></div></div>`;
    $('genErrors').classList.remove('hidden');
    return;
  }

  const subjectPlan=phase1AssignSubjects(days,periods);
  const timetable=phase2AssignTeachers(subjectPlan,days,periods);

  // Hard errors: subject allocation failures + actual teacher shortages
  // Soft warnings: consecutive-period constraint notices (don't block build)
  const hardErrors=[
    ...subjectPlan.errors,
    ...timetable.assignmentErrors.filter(e=>e.startsWith('Teacher shortage'))
  ];
  const softWarnings=timetable.assignmentErrors.filter(e=>!e.startsWith('Teacher shortage'));

  if(hardErrors.length > 0){
    logMsg('❌ Generation aborted — critical teacher/subject conflicts. Use "Force Build" or resolve conflicts.','error');
    state.timetable = null;
    pendingTimetable = timetable;
    pendingSubjectPlan = subjectPlan;
    save();

    let errHtml = `<div class="alert alert-error mb-3"><i class="ri-close-circle-line alert-icon"></i><div class="alert-body"><div class="alert-title">Timetable Generation Failed</div><p style="font-size:.8rem;opacity:.8;margin:.3rem 0;">Resolve the following conflicts or click Force Build:</p>`;
    if(subjectPlan.errors.length) errHtml+=`<div style="font-weight:700;margin-top:.6rem;margin-bottom:.3rem;">Subject Issues:</div><ul>${subjectPlan.errors.map(e=>`<li>${e}</li>`).join('')}</ul>`;
    const teacherHard=timetable.assignmentErrors.filter(e=>e.startsWith('Teacher shortage'));
    if(teacherHard.length) errHtml+=`<div style="font-weight:700;margin-top:.6rem;margin-bottom:.3rem;color:var(--warn);">Teacher Conflicts:</div><ul>${teacherHard.map(e=>`<li>${e}</li>`).join('')}</ul>`;
    if(softWarnings.length) errHtml+=`<div style="font-weight:700;margin-top:.6rem;margin-bottom:.3rem;color:var(--info);">Soft Warnings (won't block):</div><ul>${softWarnings.map(e=>`<li>${e}</li>`).join('')}</ul>`;
    errHtml += `</div></div><div style="margin-top:.75rem;"><button class="btn btn-warn" onclick="forceGenerateTimetable()"><i class="ri-alert-line"></i> Force Build Anyway</button></div>`;

    $('genErrors').innerHTML=errHtml;
    $('genErrors').classList.remove('hidden');
    toast('Conflicts found — check errors or force build.','warn');
    return;
  }

  // No hard errors — build succeeds even if there are soft warnings
  if(softWarnings.length){
    timetable.assignmentErrors=softWarnings; // keep for display but don't block
  }
  renderGenSuccess(timetable, subjectPlan);
}

/* VIEW & DOWNLOADS */
let currentViewMode='class', currentViewId=null;
function renderViewTab(){
  if(!state.timetable){ $('timetableRender').innerHTML=`<div style="text-align:center;padding:3rem;color:var(--muted);"><i class="ri-layout-grid-line" style="font-size:3rem;display:block;margin-bottom:.75rem;opacity:.4;"></i>No timetable generated yet.</div>`; return; }
  switchView(currentViewMode);
}
function switchView(mode){
  currentViewMode=mode;
  $('viewClassBtn').classList.toggle('active',mode==='class');
  $('viewTeacherBtn').classList.toggle('active',mode==='teacher');
  $('viewHistoryBtn').classList.toggle('active',mode==='history');
  
  const sel=$('viewSelect');
  const viewControls=$('viewControls');
  
  if(mode==='history'){
    if(viewControls) viewControls.style.display='none';
    renderHistory();
    return;
  }
  
  if(viewControls) viewControls.style.display='flex';
  if(mode==='class') sel.innerHTML=state.classes.map(c=>`<option value="${c.id}">${c.name} ${c.section?'-'+c.section:''} ${c.course?'('+c.course+')':''}</option>`).join('');
  else sel.innerHTML=state.teachers.map(t=>`<option value="${t.id}">${t.name} (${t.id})</option>`).join('');
  currentViewId=sel.value;
  renderTimetable();
}

function renderHistory(){
  if(!state.history || state.history.length===0){
    $('timetableRender').innerHTML=`<div style="text-align:center;padding:3rem;color:var(--muted);"><i class="ri-history-line" style="font-size:3rem;display:block;margin-bottom:.75rem;opacity:.4;"></i>No history available.</div>`;
    return;
  }
  let html = `<div class="card p-5">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:8px;">
      <div>
        <h3 class="section-title">Build History</h3>
        <p class="section-subtitle">Restore a previous timetable version</p>
      </div>
      <button class="btn btn-danger-outline btn-sm" onclick="clearAllHistory()"><i class="ri-delete-bin-line"></i> Clear All</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">`;
  state.history.forEach((h, i) => {
    const d = new Date(h.timestamp).toLocaleString();
    html += `<div class="history-entry">
      <div>
        <div style="font-weight:600;color:var(--text);">Build · ${d}</div>
        <div style="font-size:.78rem;color:var(--text-2);margin-top:2px;"><i class="ri-graduation-cap-line" style="font-size:12px;"></i> ${Object.keys(h.timetable.classes).length} classes</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn btn-primary btn-sm" onclick="restoreHistory(${i})"><i class="ri-history-line"></i> Restore</button>
        <button class="btn-icon" onclick="deleteHistory(${i})" title="Delete" style="color:var(--danger);"><i class="ri-delete-bin-line"></i></button>
      </div>
    </div>`;
  });
  html += `</div></div>`;
  $('timetableRender').innerHTML = html;
}

function restoreHistory(index){
  customConfirm('This will replace your current active timetable with the selected historical version.', () => {
    state.timetable = JSON.parse(JSON.stringify(state.history[index].timetable));
    save(); goToTab('view'); switchView('class'); toast('Timetable restored from history!','success');
  }, { type:'warn', title:'Restore Timetable', confirmText:'Restore' });
}

function deleteHistory(index){
  const h=state.history[index];
  const label=h?new Date(h.timestamp).toLocaleString():`entry #${index+1}`;
  customConfirm(`Delete history build "${label}" permanently?`, () => {
    state.history.splice(index, 1); save(); renderHistory(); toast('History deleted!','success');
  }, { type:'danger', title:'Delete Entry', confirmText:'Delete' });
}

function clearAllHistory(){
  customConfirm('Delete ALL history entries? This cannot be undone.', () => {
    state.history = []; save(); renderHistory(); toast('All history cleared!','success');
  }, { type:'danger', title:'Clear All History', confirmText:'Clear All' });
}

function showInfoModal(title, msg){
  $('infoModalTitle').textContent = title;
  $('infoModalBody').textContent = msg;
  $('infoModal').classList.remove('hidden');
}

function getTeacherLevelForClass(className) {
  const num = parseInt(className.replace(/\D/g, ''));
  if (isNaN(num)) return 'PRT';
  if (num >= 11) return 'PGT';
  if (num >= 6) return 'TGT';
  return 'PRT';
}

function isTeacherEligibleForClass(teacher, cls) {
  if (teacher.eligibleClasses && teacher.eligibleClasses.length > 0) {
    return teacher.eligibleClasses.includes(cls.id);
  }
  return teacher.level === getTeacherLevelForClass(cls.name);
}

let editModeActive = false;
function toggleEditMode(){
  editModeActive = !editModeActive;
  $('editModeBtn').innerHTML = `<i class="ri-edit-line"></i> Edit Mode: ${editModeActive ? 'ON' : 'OFF'}`;
  $('editModeBtn').classList.toggle('btn-warn', editModeActive);
  $('editModeBtn').classList.toggle('btn-ghost', !editModeActive);
  renderTimetable();
}

function openEditSlotModal(d, p){
  if(!editModeActive) return;
  $('editSlotD').value = d;
  $('editSlotP').value = p;
  
  const days = state.setup.workingDays;
  $('editSlotTitle').textContent = `Edit Slot: ${days[d]} - Period ${p+1}`;
  
  let htmlOpts = '';
  if(currentViewMode === 'class'){
    const cls = state.classes.find(c => c.id === currentViewId);
    const teacherMap = new Map();
    
    cls.subjects.forEach(cs => {
      cs.teacherIds.forEach(tid => {
        if(!teacherMap.has(tid)) teacherMap.set(tid, []);
        teacherMap.get(tid).push(cs.subjectId);
      });
    });
    
    state.teachers.forEach(t => {
      if(isTeacherEligibleForClass(t, cls)) {
        if(!teacherMap.has(t.id)) teacherMap.set(t.id, t.subjects);
      }
    });
    
    teacherMap.forEach((subjIds, tid) => {
      const t = state.teachers.find(x => x.id === tid);
      if(!t) return;
      const subjCodes = subjIds.map(sid => state.subjects.find(s=>s.id===sid)?.code).filter(Boolean).join(', ') || 'No Subjects';
      
      const existingT = state.timetable.teachers[tid]?.[d]?.[p];
      let badge = '<span class="slot-avail">Available</span>';

      if(existingT && existingT.classId && existingT.classId !== currentViewId) {
        const conflictingClass = state.classes.find(cc => cc.id === existingT.classId);
        const className = conflictingClass ? `${conflictingClass.name} ${conflictingClass.section||''}` : '';
        badge = `<span class="slot-busy" onclick="event.stopPropagation(); showInfoModal('Teacher Unavailable', 'Teacher ${t.name} is busy with class ${className} at this time.')">Busy</span>`;
      }

      htmlOpts += `<div class="slot-option" onclick="editSlotStep2('${tid}', null, '${subjIds.join(',')}')">
        <div><div class="slot-option-name">${t.name}</div><div class="slot-option-sub">Subjects: ${subjCodes}</div></div>
        <div>${badge}</div>
      </div>`;
    });
  } else {
    const t = state.teachers.find(x => x.id === currentViewId);
    const eligibleClasses = state.classes.filter(c => isTeacherEligibleForClass(t, c));
    
    eligibleClasses.forEach(c => {
      let subjIds = [];
      c.subjects.forEach(cs => {
        if(cs.teacherIds.includes(t.id)) subjIds.push(cs.subjectId);
      });
      if(subjIds.length === 0) subjIds = t.subjects;
      
      const subjCodes = subjIds.map(sid => state.subjects.find(s=>s.id===sid)?.code).filter(Boolean).join(', ') || 'No Subjects';
      
      const existingC = state.timetable.classes[c.id]?.[d]?.[p];
      let badge = '<span class="slot-avail">Available</span>';
      if(existingC && existingC.teacherId && existingC.teacherId !== currentViewId) {
        const conflictingTeacher = state.teachers.find(tt => tt.id === existingC.teacherId);
        const teacherName = conflictingTeacher ? conflictingTeacher.name : '';
        badge = `<span class="slot-busy" onclick="event.stopPropagation(); showInfoModal('Class Unavailable', 'Class ${c.name} ${c.section||''} is busy with teacher ${teacherName} at this time.')">Busy</span>`;
      }

      htmlOpts += `<div class="slot-option" onclick="editSlotStep2(null, '${c.id}', '${subjIds.join(',')}')">
        <div><div class="slot-option-name">${c.name} ${c.section||''}</div><div class="slot-option-sub">Subjects: ${subjCodes}</div></div>
        <div>${badge}</div>
      </div>`;
    });
  }
  
  $('editSlotOptions').innerHTML = htmlOpts || '<div style="color:var(--text-2);">No options available.</div>';
  $('editSlotModal').classList.remove('hidden');
}

function editSlotStep2(tId, cId, subjIdsStr) {
  const subjIds = subjIdsStr ? subjIdsStr.split(',') : [];
  let html = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:.75rem;">
    <button class="btn btn-ghost btn-sm" onclick="openEditSlotModal($('editSlotD').value, $('editSlotP').value)"><i class="ri-arrow-left-line"></i> Back</button>
    <div style="font-weight:700;font-size:.875rem;">Select Subject</div>
  </div>`;

  if(subjIds.length === 0) {
    html += `<div style="font-size:.85rem;color:var(--muted);">No subjects available to assign.</div>`;
  } else {
    subjIds.forEach(sid => {
      const subj = state.subjects.find(s => s.id === sid);
      if(!subj) return;
      html += `<div class="slot-option" onclick="applySlotEdit('${sid}', ${tId ? `'${tId}'` : 'null'}, ${cId ? `'${cId}'` : 'null'})">
        <div><div class="slot-option-name">${subj.name}</div><div class="slot-option-sub">${subj.code} · ${subj.type}</div></div>
        <i class="ri-arrow-right-s-line" style="color:var(--muted);font-size:18px;"></i>
      </div>`;
    });
  }
  $('editSlotOptions').innerHTML = html;
}

function clearSlot() {
  applySlotEdit(null, null, null);
}

function applySlotEdit(subjId, tId, cId = currentViewId) {
  const d = parseInt($('editSlotD').value);
  const p = parseInt($('editSlotP').value);
  
  let targetClassId = currentViewMode === 'class' ? currentViewId : cId;
  let targetTeacherId = currentViewMode === 'class' ? tId : currentViewId;
  
  if(currentViewMode === 'class'){
    const oldSlot = state.timetable.classes[targetClassId][d][p];
    if(oldSlot && oldSlot.teacherId) state.timetable.teachers[oldSlot.teacherId][d][p] = null;
  } else {
    const oldSlot = state.timetable.teachers[targetTeacherId][d][p];
    if(oldSlot && oldSlot.classId) state.timetable.classes[oldSlot.classId][d][p] = null;
  }
  
  if(subjId && targetTeacherId && targetClassId) {
    const conflictSlot = state.timetable.teachers[targetTeacherId][d][p];
    if(conflictSlot && conflictSlot.classId) state.timetable.classes[conflictSlot.classId][d][p] = null;
    
    const conflictClassSlot = state.timetable.classes[targetClassId][d][p];
    if(conflictClassSlot && conflictClassSlot.teacherId) state.timetable.teachers[conflictClassSlot.teacherId][d][p] = null;
    
    state.timetable.classes[targetClassId][d][p] = { subjectId: subjId, teacherId: targetTeacherId };
    state.timetable.teachers[targetTeacherId][d][p] = { classId: targetClassId, subjectId: subjId };
  } else {
    if(currentViewMode === 'class') state.timetable.classes[targetClassId][d][p] = null;
    else state.timetable.teachers[targetTeacherId][d][p] = null;
  }
  
  save();
  closeModal('editSlotModal');
  renderTimetable();
  toast('Timetable slot updated!');
}

function renderTimetable(){
  if(!state.timetable){ $('timetableRender').innerHTML=''; return; }
  currentViewId=$('viewSelect').value;
  const days=state.setup.workingDays, periods=state.setup.periodsPerDay;
  let title, subtitle, grid;
  if(currentViewMode==='class'){
    const cls=state.classes.find(c=>c.id===currentViewId);
    title=`${cls.name} ${cls.section?'-'+cls.section:''} ${cls.course?'('+cls.course+')':''}`;
    subtitle='Class Timetable';
    grid=state.timetable.classes[cls.id];
  } else {
    const t=state.teachers.find(x=>x.id===currentViewId);
    title=t.name;
    subtitle=`Teacher Timetable · Load: ${state.timetable.teacherWeeklyCount[t.id]||0} / ${t.maxPerWeek} periods/week · ${t.id}`;
    grid=state.timetable.teachers[t.id];
  }
  let html=`<div class="card p-5">
    <div style="margin-bottom:1.25rem;">
      <h3 class="section-title">${title}</h3>
      <p class="section-subtitle">${subtitle}</p>
      <p style="font-size:.75rem;color:var(--muted);margin-top:4px;">${state.setup.schoolName||'School'} · ${state.setup.academicYear||''}</p>
    </div>
    <div class="overflow-x-auto scrollbar">
      <table class="border-collapse" style="min-width:800px">
        <thead><tr>
          <th style="width:72px;">Day</th>
          ${Array.from({length:periods},(_,i)=>{
            let s = `<th style="text-align:center;">P${i+1}</th>`;
            if (i+1 === state.setup.breakAfter && i+1 < periods) s += `<th style="text-align:center;background:var(--bg-alt);color:var(--muted);font-size:.65rem;letter-spacing:.1em;">RECESS</th>`;
            return s;
          }).join('')}
        </tr></thead>
        <tbody>`;
  for(let d=0; d<days.length; d++){
    html+=`<tr><td><div class="day-cell">${days[d]}</div></td>`;
    for(let p=0; p<periods; p++){
      const slot=grid[d][p];
      let content='', cls='timetable-cell';
      if(!slot){ content='<div class="cell-empty">EMPTY</div>'; cls+=' bg-red-500/10'; }
      else if(slot.unassigned || (currentViewMode==='class' && !slot.teacherId) || (currentViewMode==='teacher' && !slot.classId)){
        const subj=state.subjects.find(s=>s.id===slot.subjectId);
        let txt = currentViewMode==='class' ? 'No Teacher' : 'No Class';
        content=`<div class="cell-warn">${subj?.code||''}</div><div class="cell-warn-sub">${txt}</div>`;
        cls+=' filled';
      }
      else if(slot.free){ content='<div class="cell-empty">FREE</div>'; cls+=' bg-red-500/10'; }
      else if(currentViewMode==='class'){
        const subj=state.subjects.find(s=>s.id===slot.subjectId);
        const t=state.teachers.find(x=>x.id===slot.teacherId);
        content=`<div class="cell-subject">${subj?.code||''}</div><div class="cell-teacher">${t?.name||''}</div>`;
        cls+=' filled';
      } else {
        const c=state.classes.find(x=>x.id===slot.classId);
        const subj=state.subjects.find(s=>s.id===slot.subjectId);
        content=`<div class="cell-class">${c?.name||''} ${c?.section||''}</div><div class="cell-teacher">${subj?.code||''}</div>`;
        cls+=' filled';
      }
      const clickAttr = editModeActive ? `onclick="openEditSlotModal(${d}, ${p})" style="cursor:pointer; border:1px dashed #64748b;"` : '';
      html+=`<td><div class="${cls}" ${clickAttr}>${content}</div></td>`;
      
      if(p+1 === state.setup.breakAfter && p+1 < periods) {
        if(d === 0) {
          html+=`<td rowspan="${days.length}" style="background:var(--bg-alt);color:var(--muted);font-weight:700;text-align:center;letter-spacing:4px;padding:0;width:40px;"><div style="writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);margin:auto;letter-spacing:4px;font-size:.7rem;">RECESS</div></td>`;
        }
      }
    }
    html+='</tr>';
  }
  html+='</tbody></table></div></div>';
  $('timetableRender').innerHTML=html;
}

function addPdfHeader(doc, title, subtitle, loadLine){
  const pageWidth=doc.internal.pageSize.getWidth();
  const logoSize=50;
  let textX=40;
  const headerY=28;
  if(state.setup.schoolLogo){
    try{ doc.addImage(state.setup.schoolLogo,'PNG',40,headerY,logoSize,logoSize); textX=40+logoSize+12; }
    catch(e){ try{ doc.addImage(state.setup.schoolLogo,'JPEG',40,headerY,logoSize,logoSize); textX=40+logoSize+12; }catch(err){} }
  }
  doc.setFont(undefined,'bold');
  doc.setFontSize(16);
  doc.text(state.setup.schoolName||'School Name',textX,headerY+18);
  doc.setFontSize(12);
  doc.setFont(undefined,'normal');
  doc.text(title,textX,headerY+36);
  const lineY=headerY+logoSize+8;
  doc.setDrawColor(0,100,250);
  doc.setLineWidth(1);
  doc.line(40,lineY,pageWidth-40,lineY);
  let curY=lineY+18;
  if(subtitle){
    doc.setFontSize(11);
    doc.setFont(undefined,'bold');
    doc.text(subtitle,40,curY);
    curY+=16;
  }
  if(loadLine){
    doc.setFontSize(10);
    doc.setFont(undefined,'normal');
    doc.text(loadLine,40,curY);
    curY+=14;
  }
  if(state.setup.academicYear){
    doc.setFontSize(9);
    doc.setTextColor(100,100,100);
    doc.text(`Academic Year: ${state.setup.academicYear}`,40,curY);
    doc.setTextColor(0,0,0);
    curY+=12;
  }
  return curY+8;
}

function getPdfFooterHook(doc) {
  return function(data) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont(undefined, 'normal');
    doc.text("Created by Time Craft", pageWidth - 40, pageHeight - 20, {align: 'right'});
  };
}

function addPdfSignature(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let sigY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 0) + 40;
  
  if(sigY + 50 > pageHeight - 30) {
    doc.addPage();
    sigY = 40;
  }
  
  const sigX = pageWidth - 160;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text("Principal's Signature", sigX + 25, sigY + 50);
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(sigX, sigY + 35, sigX + 130, sigY + 35);
  
  if (state.setup.principalSign) {
    try { doc.addImage(state.setup.principalSign, 'PNG', sigX + 15, sigY - 15, 100, 45); }
    catch(e) { try { doc.addImage(state.setup.principalSign, 'JPEG', sigX + 15, sigY - 15, 100, 45); } catch(err) {} }
  }
}

function downloadCurrentPDF(){
  if(!state.timetable) return;
  const { jsPDF } = window.jspdf;
  const doc=new jsPDF('landscape','pt','a4');
  const days=state.setup.workingDays, periods=state.setup.periodsPerDay;
  let title, subtitle, loadLine;
  if(currentViewMode==='class'){
    const cls=state.classes.find(c=>c.id===currentViewId);
    title=`${cls.name} ${cls.section?'-'+cls.section:''} ${cls.course?'('+cls.course+')':''}`;
    subtitle='Class Timetable';
    loadLine=null;
  } else {
    const t=state.teachers.find(x=>x.id===currentViewId);
    title='Teacher Timetable';
    subtitle=t.name;
    loadLine=`Load: ${state.timetable.teacherWeeklyCount[t.id]||0} / ${t.maxPerWeek} periods per week`;
  }
  const head=[['Day', ...Array.from({length:periods},(_,i)=>{
    let arr = [`P${i+1}`];
    if (i+1 === state.setup.breakAfter && i+1 < periods) arr.push('RECESS');
    return arr;
  }).flat()]];
  const body=days.map((day,d)=>{
    const row=[day];
    for(let p=0;p<periods;p++){
      const slot=currentViewMode==='class'?state.timetable.classes[currentViewId][d][p]:state.timetable.teachers[currentViewId][d][p];
      if(!slot) row.push('EMPTY');
      else if(currentViewMode==='class'){
        if(slot.free) row.push('FREE');
        else {
          const subj=state.subjects.find(s=>s.id===slot.subjectId);
          const t=slot.teacherId?state.teachers.find(x=>x.id===slot.teacherId):null;
          row.push(`${subj?.code||''}\n${t?t.name:'(No Teacher)'}`);
        }
      } else {
        if(!slot.classId) row.push('—');
        else {
          const c=state.classes.find(c=>c.id===slot.classId);
          const subj=state.subjects.find(s=>s.id===slot.subjectId);
          row.push(`${c?.name||''}${c?.section?'-'+c.section:''}${c?.course?' ('+c.course+')':''}\n${subj?.code||''}`);
        }
      }
      if(p+1 === state.setup.breakAfter && p+1 < periods) {
        if(d === Math.floor(days.length/2)) row.push('R E C E S S');
        else row.push('');
      }
    }
    return row;
  });
  const startY=addPdfHeader(doc, title, subtitle, loadLine);
  doc.autoTable({head, body, startY, theme:'grid', didDrawPage: getPdfFooterHook(doc), styles:{fontSize:8,cellPadding:6,lineWidth:0.5,lineColor:[100,100,100]}, headStyles:{fillColor:[0,100,250],textColor:255,fontSize:9}, columnStyles:{0:{fillColor:[230,240,255],textColor:[26,28,28],fontStyle:'bold',cellWidth:50}}});
  addPdfSignature(doc);
  doc.save(`${title.replace(/[^a-z0-9]/gi,'_')}.pdf`);
  toast('PDF downloaded!');
}

function downloadAllClassPDF(){
  if(!state.timetable) return;
  const { jsPDF }=window.jspdf;
  const doc=new jsPDF('landscape','pt','a4');
  state.classes.forEach((c,idx)=>{
    if(idx>0) doc.addPage();
    const title=`${c.name} ${c.section?'-'+c.section:''} ${c.course?'('+c.course+')':''}`;
    const startY=addPdfHeader(doc, title, 'Class Timetable', null);
    const days=state.setup.workingDays, periods=state.setup.periodsPerDay;
    const head=[['Day', ...Array.from({length:periods},(_,i)=>{
      let arr = [`P${i+1}`];
      if (i+1 === state.setup.breakAfter && i+1 < periods) arr.push('RECESS');
      return arr;
    }).flat()]];
    const body=days.map((day,d)=>{ 
      const row=[day]; 
      for(let p=0;p<periods;p++){ 
        const slot=state.timetable.classes[c.id][d][p]; 
        if(!slot) row.push('EMPTY'); 
        else if(slot.free) row.push('FREE'); 
        else { 
          const subj=state.subjects.find(s=>s.id===slot.subjectId); 
          const t=slot.teacherId?state.teachers.find(x=>x.id===slot.teacherId):null; 
          row.push(`${subj?.code||''}\n${t?t.name:'(No Teacher)'}`); 
        }
        if(p+1 === state.setup.breakAfter && p+1 < periods) {
          if(d === Math.floor(days.length/2)) row.push('R E C E S S');
          else row.push('');
        }
      } 
      return row; 
    });
    doc.autoTable({head, body, startY, theme:'grid', didDrawPage: getPdfFooterHook(doc), styles:{fontSize:7,cellPadding:4}, headStyles:{fillColor:[0,100,250],textColor:255}, columnStyles:{0:{cellWidth:40,fontStyle:'bold'}}});
    addPdfSignature(doc);
  });
  doc.save('All_Class_Timetables.pdf');
  toast('All Classes PDF downloaded!');
}

function downloadAllTeacherPDF(){
  if(!state.timetable) return;
  const { jsPDF }=window.jspdf;
  const doc=new jsPDF('landscape','pt','a4');
  state.teachers.forEach((t,idx)=>{
    if(idx>0) doc.addPage();
    const startY=addPdfHeader(doc, 'Teacher Timetable', t.name, `Load: ${state.timetable.teacherWeeklyCount[t.id]||0} / ${t.maxPerWeek} periods per week · ID: ${t.id}`);
    const days=state.setup.workingDays, periods=state.setup.periodsPerDay;
    const head=[['Day', ...Array.from({length:periods},(_,i)=>{
      let arr = [`P${i+1}`];
      if (i+1 === state.setup.breakAfter && i+1 < periods) arr.push('RECESS');
      return arr;
    }).flat()]];
    const body=days.map((day,d)=>{ 
      const row=[day]; 
      for(let p=0;p<periods;p++){ 
        const slot=state.timetable.teachers[t.id][d][p]; 
        if(!slot) row.push('—'); 
        else { 
          const c=state.classes.find(c=>c.id===slot.classId); 
          const subj=state.subjects.find(s=>s.id===slot.subjectId); 
          row.push(`${c?.name||''}${c?.section?'-'+c.section:''}${c?.course?' ('+c.course+')':''}\n${subj?.code||''}`); 
        }
        if(p+1 === state.setup.breakAfter && p+1 < periods) {
          if(d === Math.floor(days.length/2)) row.push('R E C E S S');
          else row.push('');
        }
      } 
      return row; 
    });
    doc.autoTable({head, body, startY, theme:'grid', didDrawPage: getPdfFooterHook(doc), styles:{fontSize:7,cellPadding:4}, headStyles:{fillColor:[79,84,92],textColor:255}, columnStyles:{0:{cellWidth:40,fontStyle:'bold'}}});
    addPdfSignature(doc);
  });
  doc.save('All_Teacher_Timetables.pdf');
  toast('All Teachers PDF downloaded!');
}

function downloadCurrentExcel(){
  if(!state.timetable) return;
  const wb=XLSX.utils.book_new();
  const days=state.setup.workingDays, periods=state.setup.periodsPerDay;
  let ws_data=[['Day', ...Array.from({length:periods},(_,i)=>{
    let arr = [`P${i+1}`];
    if (i+1 === state.setup.breakAfter && i+1 < periods) arr.push('RECESS');
    return arr;
  }).flat()]];
  days.forEach((day,d)=>{
    let row=[day];
    for(let p=0;p<periods;p++){
      const slot=currentViewMode==='class'?state.timetable.classes[currentViewId][d][p]:state.timetable.teachers[currentViewId][d][p];
      if(!slot||slot.free) row.push('FREE');
      else if(currentViewMode==='class'){
        const subj=state.subjects.find(s=>s.id===slot.subjectId);
        const t=state.teachers.find(x=>x.id===slot.teacherId);
        row.push(`${subj?.code||''} (${t?.name||''})`);
      } else {
        const c=state.classes.find(c=>c.id===slot.classId);
        const subj=state.subjects.find(s=>s.id===slot.subjectId);
        row.push(`${c?.name||''}-${c?.section||''} ${subj?.code||''}`);
      }
      if(p+1 === state.setup.breakAfter && p+1 < periods) {
        if(d === Math.floor(days.length/2)) row.push('R E C E S S');
        else row.push('');
      }
    }
    ws_data.push(row);
  });
  const ws=XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
  XLSX.writeFile(wb, `${currentViewMode}_${currentViewId}.xlsx`);
  toast('Excel downloaded!');
}

function downloadAllClassExcel(){
  if(!state.timetable) return;
  const wb=XLSX.utils.book_new();
  state.classes.forEach(c=>{
    let ws_data=[['Day', ...Array.from({length:state.setup.periodsPerDay},(_,i)=>{
      let arr = [`P${i+1}`];
      if (i+1 === state.setup.breakAfter && i+1 < state.setup.periodsPerDay) arr.push('RECESS');
      return arr;
    }).flat()]];
    state.setup.workingDays.forEach((day,d)=>{
      let row=[day];
      for(let p=0;p<state.setup.periodsPerDay;p++){
        const slot=state.timetable.classes[c.id][d][p];
        if(!slot||slot.free) row.push('FREE');
        else { const subj=state.subjects.find(s=>s.id===slot.subjectId); const t=state.teachers.find(x=>x.id===slot.teacherId); row.push(`${subj?.code||''} (${t?.name||''})`); }
        if(p+1 === state.setup.breakAfter && p+1 < state.setup.periodsPerDay) {
          if(d === Math.floor(state.setup.workingDays.length/2)) row.push('R E C E S S');
          else row.push('');
        }
      }
      ws_data.push(row);
    });
    const ws=XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, `${c.name}${c.section?'-'+c.section:''}`.substring(0,31));
  });
  XLSX.writeFile(wb, 'All_Class_Timetables.xlsx');
  toast('All Classes Excel downloaded!');
}

function downloadAllTeacherExcel(){
  if(!state.timetable) return;
  const wb=XLSX.utils.book_new();
  state.teachers.forEach(t=>{
    let ws_data=[['Day', ...Array.from({length:state.setup.periodsPerDay},(_,i)=>{
      let arr = [`P${i+1}`];
      if (i+1 === state.setup.breakAfter && i+1 < state.setup.periodsPerDay) arr.push('RECESS');
      return arr;
    }).flat()]];
    state.setup.workingDays.forEach((day,d)=>{
      let row=[day];
      for(let p=0;p<state.setup.periodsPerDay;p++){
        const slot=state.timetable.teachers[t.id][d][p];
        if(!slot||slot.free) row.push('—');
        else { const c=state.classes.find(c=>c.id===slot.classId); const subj=state.subjects.find(s=>s.id===slot.subjectId); row.push(`${c?.name||''}-${c?.section||''} ${subj?.code||''}`); }
        if(p+1 === state.setup.breakAfter && p+1 < state.setup.periodsPerDay) {
          if(d === Math.floor(state.setup.workingDays.length/2)) row.push('R E C E S S');
          else row.push('');
        }
      }
      ws_data.push(row);
    });
    const ws=XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, `${t.name}`.substring(0,31));
  });
  XLSX.writeFile(wb, 'All_Teacher_Timetables.xlsx');
  toast('All Teachers Excel downloaded!');
}

function downloadCurrentCSV(){
  if(!state.timetable) return;
  const days=state.setup.workingDays, periods=state.setup.periodsPerDay;
  let csv=`Day,${Array.from({length:periods},(_,i)=>`P${i+1}`).join(',')}\n`;
  for(let d=0; d<days.length; d++){
    let row=days[d];
    for(let p=0; p<periods; p++){
      const slot=currentViewMode==='class'?state.timetable.classes[currentViewId][d][p]:state.timetable.teachers[currentViewId][d][p];
      let cell='';
      if(!slot||slot.free) cell='FREE';
      else if(currentViewMode==='class'){
        const subj=state.subjects.find(s=>s.id===slot.subjectId);
        const t=state.teachers.find(x=>x.id===slot.teacherId);
        cell=`${subj?.code||''} (${t?.name||''})`;
      } else {
        const c=state.classes.find(c=>c.id===slot.classId);
        const subj=state.subjects.find(s=>s.id===slot.subjectId);
        cell=`${c?.name||''}-${c?.section||''} ${subj?.code||''}`;
      }
      row+=','+cell.replace(/,/g,';');
    }
    csv+=row+'\n';
  }
  downloadFile(csv, `${currentViewMode}_${currentViewId}.csv`);
}

function downloadMasterCSV(){
  if(!state.timetable) return;
  const days=state.setup.workingDays, periods=state.setup.periodsPerDay;
  let csv='Class,Section,Course,Day,Period,SubjectCode,TeacherID\n';
  state.classes.forEach(c=>{
    for(let d=0; d<days.length; d++){
      for(let p=0; p<periods; p++){
        const slot=state.timetable.classes[c.id][d][p];
        if(!slot||slot.free) csv+=`${c.name},${c.section||''},${c.course||''},${days[d]},P${p+1},FREE,,\n`;
        else { const subj=state.subjects.find(s=>s.id===slot.subjectId); csv+=`${c.name},${c.section||''},${c.course||''},${days[d]},P${p+1},${subj?.code||''},${slot.teacherId||''}\n`; }
      }
    }
  });
  downloadFile(csv,'Master_Timetable.csv');
}

function downloadFile(content, filename){
  const blob=new Blob([content],{type:'application/json;charset=utf-8;'});
  const link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download=filename;
  link.click();
}

function exportData(){
  downloadFile(JSON.stringify(state,null,2), `timetable_backup_${Date.now()}.json`);
}
function importData(event){
  const file=event.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{ try{ state={...state, ...JSON.parse(e.target.result)}; save(); location.reload(); }catch(err){ toast('Invalid file','error'); } };
  reader.readAsText(file);
}

function loadSampleData(){
  customConfirm('Load demo school data? This will replace all your current data.', _doLoadSampleData, { type:'warn', title:'Load Sample Data', confirmText:'Load Demo' });
}
function _doLoadSampleData(){
  state.teachers=[]; state.subjects=[]; state.classes=[]; state.timetable=null;
  state.setup={ schoolName:'Greenwood Public School', academicYear:'2024-25', periodsPerDay:8, periodDuration:45, breakAfter:4, breakDuration:20, workingDays:['Mon','Tue','Wed','Thu','Fri','Sat'], schoolLogo:null };
  
  const subjData=[
    ['ENG','English','language',[],false],['HIN','Hindi','language',[],false],['MAT','Mathematics','theory',[],true],
    ['SCI','Science','theory',[],true],['SST','Social Science','theory',[],false],['PHY','Physics','theory',[],true],
    ['CHM','Chemistry','theory',[],true],['BIO','Biology','theory',[],true],['ACC','Accountancy','theory',[],true],
    ['BST','Business Studies','theory',[],false],['ECO','Economics','theory',[],false],['HIS','History','theory',[],false],
    ['COM','Computer Science','practical',[]],['PE','Physical Education','activity',[]],['INF','Informatics Practices','practical',[]]
  ];
  subjData.forEach(([code,name,type,alts,tough])=>state.subjects.push({id:'sub_'+code,code,name,type,alternativeIds:alts,tough}));
  state.subjects.find(s=>s.id==='sub_COM').alternativeIds=['sub_PE','sub_INF'];
  state.subjects.find(s=>s.id==='sub_PE').alternativeIds=['sub_COM','sub_INF'];
  state.subjects.find(s=>s.id==='sub_INF').alternativeIds=['sub_COM','sub_PE'];
  
  const tData=[
    ['T001','Mr. Rajesh Kumar','PGT',['ENG'],['cls_11a','cls_11b','cls_12a'],6,30,[]],
    ['T002','Mrs. Sunita Sharma','TGT',['HIN'],['cls_6a','cls_8a','cls_10a'],6,30,[]],
    ['T003','Mr. Amit Verma','PGT',['MAT'],['cls_10a','cls_11b','cls_12a'],6,30,[]],
    ['T004','Mrs. Priya Singh','PGT',['PHY'],['cls_11a','cls_11b','cls_12a'],6,30,[]],
    ['T005','Mr. Sanjay Gupta','TGT',['SST'],['cls_6a','cls_8a','cls_10a'],6,30,[]],
    ['T006','Mrs. Neha Jain','PGT',['CHM'],['cls_11a','cls_11b','cls_12a'],6,30,[]],
    ['T007','Mr. Vikram Patel','PGT',['BIO'],['cls_11a','cls_12a'],6,30,[]],
    ['T008','Mr. Rakesh Mishra','PGT',['ACC','BST'],['cls_12a'],6,30,[]],
    ['T009','Mrs. Anjali Rao','PGT',['ECO'],['cls_12a'],6,30,[]],
    ['T010','Mr. Karan Mehta','PGT',['COM','INF'],['cls_11a','cls_11b','cls_12a'],6,30,[]],
    ['T011','Mr. Deepak Yadav','TGT',['PE'],['cls_6a','cls_8a','cls_10a','cls_11a','cls_11b','cls_12a'],6,30,[]],
    ['T012','Mrs. Kavita Nair','PRT',['SCI'],['cls_6a'],6,30,[]]
  ];
  tData.forEach(([id,name,lvl,subs,cls,md,mw,un])=>state.teachers.push({id,name,level:lvl,subjects:subs.map(c=>'sub_'+c),eligibleClasses:cls,maxPerDay:md,maxPerWeek:mw,unavailableDays:un}));
  
  state.classes=[
    {id:'cls_6a',name:'Class 6',section:'A',course:'',subjects:[
      {subjectId:'sub_ENG',periodsPerWeek:6,teacherIds:['T001']},{subjectId:'sub_HIN',periodsPerWeek:5,teacherIds:['T002']},
      {subjectId:'sub_MAT',periodsPerWeek:6,teacherIds:['T003']},{subjectId:'sub_SCI',periodsPerWeek:6,teacherIds:['T012']},
      {subjectId:'sub_SST',periodsPerWeek:5,teacherIds:['T005']},{subjectId:'sub_COM',periodsPerWeek:2,teacherIds:['T010']},
      {subjectId:'sub_PE',periodsPerWeek:2,teacherIds:['T011']}
    ]},
    {id:'cls_11a',name:'Class 11',section:'',course:'Medical',subjects:[
      {subjectId:'sub_ENG',periodsPerWeek:5,teacherIds:['T001']},{subjectId:'sub_PHY',periodsPerWeek:7,teacherIds:['T004']},
      {subjectId:'sub_CHM',periodsPerWeek:7,teacherIds:['T006']},{subjectId:'sub_BIO',periodsPerWeek:7,teacherIds:['T007']},
      {subjectId:'sub_COM',periodsPerWeek:4,teacherIds:['T010']}
    ]},
    {id:'cls_11b',name:'Class 11',section:'',course:'Non-Medical',subjects:[
      {subjectId:'sub_ENG',periodsPerWeek:5,teacherIds:['T001']},{subjectId:'sub_PHY',periodsPerWeek:7,teacherIds:['T004']},
      {subjectId:'sub_CHM',periodsPerWeek:7,teacherIds:['T006']},{subjectId:'sub_MAT',periodsPerWeek:7,teacherIds:['T003']},
      {subjectId:'sub_PE',periodsPerWeek:4,teacherIds:['T011']}
    ]},
    {id:'cls_12a',name:'Class 12',section:'',course:'Commerce',subjects:[
      {subjectId:'sub_ENG',periodsPerWeek:5,teacherIds:['T001']},{subjectId:'sub_ACC',periodsPerWeek:8,teacherIds:['T008']},
      {subjectId:'sub_BST',periodsPerWeek:7,teacherIds:['T008']},{subjectId:'sub_ECO',periodsPerWeek:7,teacherIds:['T009']},
      {subjectId:'sub_INF',periodsPerWeek:4,teacherIds:['T010']}
    ]},
    {id:'cls_12b',name:'Class 12',section:'',course:'Arts',subjects:[
      {subjectId:'sub_ENG',periodsPerWeek:5,teacherIds:['T001']},{subjectId:'sub_HIS',periodsPerWeek:8,teacherIds:['T005']},
      {subjectId:'sub_ECO',periodsPerWeek:6,teacherIds:['T009']},{subjectId:'sub_PE',periodsPerWeek:4,teacherIds:['T011']},
      {subjectId:'sub_HIN',periodsPerWeek:5,teacherIds:['T002']}
    ]}
  ];
  
  save(); loadSetupUI(); renderTeachers(); renderSubjects(); renderClasses(); renderGenerateStats();
  toast('Sample data loaded!');
}

renderTeachers(); renderSubjects(); renderClasses(); renderGenerateStats();

/* ── Init custom selects on page load ────────────────────── */
initCustomSelects();
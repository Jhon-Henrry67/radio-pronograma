// ============================================
// PRONOGRAMA DE RADIO
// ============================================

const API_URL = (location.protocol === 'capacitor:' || location.hostname === 'localhost' && location.port === '')
    ? 'https://radio-pronograma.onrender.com/api.php'
    : '/api.php';
const DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];
const DAY_LABELS = { Lunes: 'Lunes', Martes: 'Martes', Miercoles: 'Miércoles', Jueves: 'Jueves', Viernes: 'Viernes' };
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

let appState = { currentUser: null, schedule: [] };

function formatHour(h) {
    if (h === 0) return '12:00 AM';
    if (h === 12) return '12:00 PM';
    return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

function getColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function showToast(msg, type = 'success') {
    const old = document.querySelector('.toast-container');
    if (old) old.remove();
    const c = document.createElement('div');
    c.className = 'toast-container';
    c.innerHTML = `<div class="toast toast-${type}">${msg}</div>`;
    document.body.appendChild(c);
    setTimeout(() => { c.querySelector('.toast')?.classList.add('toast-hide'); setTimeout(() => c.remove(), 300); }, 3000);
}

function showLoading() {
    if (document.querySelector('.loading-overlay')) return;
    const o = document.createElement('div');
    o.className = 'loading-overlay';
    o.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Cargando...</p></div>';
    document.body.appendChild(o);
}

function hideLoading() { document.querySelector('.loading-overlay')?.remove(); }

async function api(action, method = 'GET', data = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(`${API_URL}?action=${action}`, opts);
    return await res.json();
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initHours();
    setupEvents();
    checkSession();
});

function initHours() {
    const s = document.getElementById('shift-start');
    const e = document.getElementById('shift-end');
    if (!s || !e) return;
    for (let i = 0; i <= 23; i++) {
        s.innerHTML += `<option value="${i}">${formatHour(i)}</option>`;
        e.innerHTML += `<option value="${i}">${formatHour(i)}</option>`;
    }
    s.value = 6;
    e.value = 12;
}

function setupEvents() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-form`).classList.add('active');
        });
    });
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    document.getElementById('add-shift-form')?.addEventListener('submit', handleAddShift);
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('logout-btn-personal')?.addEventListener('click', logout);
}

function checkSession() {
    const s = sessionStorage.getItem('user');
    if (s) { appState.currentUser = JSON.parse(s); showPanel(appState.currentUser.rol); }
}

// ============================================
// AUTH
// ============================================

async function handleLogin(e) {
    e.preventDefault();
    const err = document.getElementById('login-error');
    showLoading();
    try {
        const res = await api('login', 'POST', { usuario: document.getElementById('login-user').value, contraseña: document.getElementById('login-pass').value });
        hideLoading();
        if (res.success) {
            appState.currentUser = res.user;
            sessionStorage.setItem('user', JSON.stringify(res.user));
            err.textContent = '';
            showPanel(res.user.rol);
            showToast(`Bienvenido, ${res.user.nombre}`);
        } else { err.textContent = res.error || 'Credenciales incorrectas'; }
    } catch (e) { hideLoading(); err.textContent = 'Error de conexión'; }
}

async function handleRegister(e) {
    e.preventDefault();
    const err = document.getElementById('login-error');
    showLoading();
    try {
        const res = await api('register', 'POST', {
            nombre: document.getElementById('reg-name').value,
            usuario: document.getElementById('reg-user').value,
            contraseña: document.getElementById('reg-pass').value,
            rol: document.getElementById('reg-role').value
        });
        hideLoading();
        if (res.success) { showToast('Cuenta creada'); document.querySelector('[data-tab="login"]').click(); }
        else { err.textContent = res.error || 'Error'; }
    } catch (e) { hideLoading(); err.textContent = 'Error de conexión'; }
}

function logout() {
    appState.currentUser = null;
    sessionStorage.removeItem('user');
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('admin-panel').classList.remove('active');
    document.getElementById('personal-panel').classList.remove('active');
}

// ============================================
// PANELS
// ============================================

async function showPanel(role) {
    document.getElementById('login-screen').classList.remove('active');
    showLoading();
    if (role === 'admin') {
        document.getElementById('admin-panel').classList.add('active');
        document.getElementById('admin-name').textContent = appState.currentUser.nombre;
    } else {
        document.getElementById('personal-panel').classList.add('active');
        document.getElementById('personal-name').textContent = appState.currentUser.nombre;
    }
    await loadSchedule();
    hideLoading();
}

// ============================================
// SCHEDULE
// ============================================

async function loadSchedule() {
    try { appState.schedule = await api('getSchedule'); renderShifts(); } catch (e) { console.error(e); }
}

function hasConflict(name, day, startHour, endHour, excludeId = null) {
    return appState.schedule.find(s => {
        if (s.dia !== day) return false;
        if (s.id == excludeId) return false;
        const sStart = parseInt(s.hora_inicio);
        const sEnd = parseInt(s.hora_fin);
        return startHour < sEnd && endHour > sStart;
    });
}

async function handleAddShift(e) {
    e.preventDefault();
    
    const name = document.getElementById('shift-name').value.trim();
    const day = document.getElementById('shift-day').value;
    const start = parseInt(document.getElementById('shift-start').value);
    const end = parseInt(document.getElementById('shift-end').value);
    
    if (!name) { showToast('Escribe un nombre', 'warning'); return; }
    if (!day) { showToast('Selecciona un día', 'warning'); return; }
    if (start >= end) { showToast('Hora inicio debe ser menor a hora fin', 'warning'); return; }
    
    // Check for conflicts
    const conflict = hasConflict(name, day, start, end);
    if (conflict) {
        const conflictStart = formatHour(parseInt(conflict.hora_inicio));
        const conflictEnd = formatHour(parseInt(conflict.hora_fin));
        showToast(`Conflicto: ${conflict.personal_nombre} ya está en ese horario (${conflictStart} - ${conflictEnd})`, 'error');
        return;
    }
    
    showLoading();
    try {
        const res = await api('addShift', 'POST', {
            personal_nombre: name,
            dia: day,
            hora_inicio: start,
            hora_fin: end
        });
        
        if (res.success) {
            await loadSchedule();
            showToast(`${name} - ${DAY_LABELS[day]} ${formatHour(start)} a ${formatHour(end)}`);
            document.getElementById('add-shift-form').reset();
            document.getElementById('shift-start').value = 6;
            document.getElementById('shift-end').value = 12;
        } else {
            showToast(res.error || 'Error al guardar', 'error');
        }
    } catch (e) { showToast('Error al guardar', 'error'); }
    hideLoading();
}

// ============================================
// RENDER SHIFTS
// ============================================

function renderShifts() {
    if (appState.currentUser?.rol === 'admin') {
        renderAdminShifts();
    } else {
        renderPersonalShifts();
    }
}

function renderAdminShifts() {
    const container = document.getElementById('shifts-list');
    const empty = document.getElementById('empty-schedule');
    if (!container) return;
    
    if (appState.schedule.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    
    empty.style.display = 'none';
    
    // Get unique time slots
    const timeSlots = [];
    const seen = new Set();
    appState.schedule.forEach(s => {
        const key = `${s.hora_inicio}-${s.hora_fin}`;
        if (!seen.has(key)) {
            seen.add(key);
            timeSlots.push({ inicio: parseInt(s.hora_inicio), fin: parseInt(s.hora_fin) });
        }
    });
    timeSlots.sort((a, b) => a.inicio - b.inicio);
    
    let html = '<div class="schedule-grid-container"><table class="schedule-grid"><thead><tr>';
    DAYS.forEach(d => { html += `<th>${DAY_LABELS[d]}</th>`; });
    html += '</tr></thead><tbody>';
    
    timeSlots.forEach(slot => {
        html += '<tr>';
        DAYS.forEach(day => {
            const shift = appState.schedule.find(s => 
                s.dia === day && parseInt(s.hora_inicio) === slot.inicio && parseInt(s.hora_fin) === slot.fin
            );
            if (shift) {
                const color = getColor(shift.personal_nombre);
                html += `<td class="shift-cell" onclick="deleteShift(${shift.id})">
                    <div class="shift-chip" style="background:${color}20;">
                        <span class="shift-avatar" style="background:${color};">${getInitials(shift.personal_nombre)}</span>
                        <div class="shift-text">
                            <span class="shift-name">${shift.personal_nombre}</span>
                            <span class="shift-time">${formatHour(slot.inicio)} - ${formatHour(slot.fin)}</span>
                        </div>
                    </div>
                </td>`;
            } else {
                html += '<td class="empty-cell"></td>';
            }
        });
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function renderPersonalShifts() {
    const container = document.getElementById('my-shifts-list');
    const empty = document.getElementById('empty-my-schedule');
    if (!container) return;
    
    if (appState.schedule.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    
    empty.style.display = 'none';
    
    // Use ALL shifts for the grid (full schedule view)
    const timeSlots = [];
    const seen = new Set();
    appState.schedule.forEach(s => {
        const key = `${s.hora_inicio}-${s.hora_fin}`;
        if (!seen.has(key)) {
            seen.add(key);
            timeSlots.push({ inicio: parseInt(s.hora_inicio), fin: parseInt(s.hora_fin) });
        }
    });
    timeSlots.sort((a, b) => a.inicio - b.inicio);
    
    const myName = appState.currentUser.nombre;
    
    let html = '<div class="schedule-grid-container"><table class="schedule-grid"><thead><tr>';
    DAYS.forEach(d => { html += `<th>${DAY_LABELS[d]}</th>`; });
    html += '</tr></thead><tbody>';
    
    timeSlots.forEach(slot => {
        html += '<tr>';
        DAYS.forEach(day => {
            const shift = appState.schedule.find(s => 
                s.dia === day && parseInt(s.hora_inicio) === slot.inicio && parseInt(s.hora_fin) === slot.fin
            );
            if (shift) {
                const isMine = shift.personal_nombre === myName;
                const color = getColor(shift.personal_nombre);
                html += `<td class="${isMine ? 'my-cell' : 'shift-cell'}">
                    <div class="shift-chip" style="background:${color}20;${isMine ? 'border:2px solid ' + color + ';' : ''}">
                        <span class="shift-avatar" style="background:${color};">${getInitials(shift.personal_nombre)}</span>
                        <div class="shift-text">
                            <span class="shift-name">${isMine ? '✓ ' : ''}${shift.personal_nombre}</span>
                            <span class="shift-time">${formatHour(slot.inicio)} - ${formatHour(slot.fin)}</span>
                        </div>
                    </div>
                </td>`;
            } else {
                html += '<td class="empty-cell"></td>';
            }
        });
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

window.deleteShift = async function(id) {
    if (!confirm('¿Eliminar este turno?')) return;
    showLoading();
    try {
        await api('deleteShift', 'POST', { id });
        await loadSchedule();
        showToast('Turno eliminado', 'info');
    } catch (e) { showToast('Error', 'error'); }
    hideLoading();
};

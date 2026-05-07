// --- CONFIGURATION ---
const API_URL = "https://script.google.com/macros/s/AKfycbxqVCP_2O4tGxIkvr_w9RSlfIkv-Mt0YobXW1-RVpfg4lK5vW9XZ7Cz0UuzEiBfXicC/exec"; 
const SECRET_KEY = "FLT_INTERNAL_2026";

// --- AUTH LOGIC ---
let inactivityTimer;
const LOGOUT_TIME = 5 * 60 * 1000; // 5 นาที

function resetInactivityTimer() {
    // Check if current page is login page (index.html or root)
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || !window.location.pathname.includes('.html');
    if (isLoginPage) return;

    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert("Session Expired: You have been inactive for more than 5 minutes. The system will log you out automatically for security purposes.");
        logout();
    }, LOGOUT_TIME);
}

// ตรวจสอบการเคลื่อนไหวเพื่อ Reset Timer
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer, true);
});

async function handleLogin(btn) {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const loginBtn = btn || document.getElementById('login-btn');
    const btnText = document.getElementById('btn-text');

    if (!user || !pass) { 
        showErrorModal("Please enter both username and password.");
        return; 
    }
    
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');
    }
    if (btnText) btnText.innerText = "Authenticating...";

    try {
        const response = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'login', 
                secret_key: SECRET_KEY,
                data: { username: user, password: pass } 
            }) 
        });
        const result = await response.json();
        if (result.status === "success") { 
            localStorage.setItem('jarvis_user', JSON.stringify(result)); 
            window.location.href = "dashboard.html"; 
        }
        else { 
            showErrorModal(result.message || "Invalid username or password. Please verify your credentials.");
            const card = document.querySelector('.login-card');
            if (card) {
                card.style.animation = 'none';
                card.offsetHeight;
                card.style.animation = 'shake 0.4s ease-in-out';
            }
        }
    } catch (e) { 
        showErrorModal("Connection Error: Unable to reach the server. Please check your internet."); 
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
        }
        if (btnText) btnText.innerText = "Sign In";
    }
}

function showErrorModal(msg) {
    const modal = document.getElementById('error-modal');
    const msgLabel = document.getElementById('modal-error-msg');
    if (modal && msgLabel) {
        msgLabel.innerText = msg;
        modal.style.display = 'flex';
    }
}

function closeErrorModal(btn) {
    if (btn) {
        btn.classList.add('loading');
        setTimeout(() => btn.classList.remove('loading'), 300);
    }
    const modal = document.getElementById('error-modal');
    if (modal) modal.style.display = 'none';
    const passInput = document.getElementById('password');
    if (passInput) { passInput.value = ""; passInput.focus(); }
}

function logout(btn) { 
    if (btn) btn.classList.add('loading');
    clearTimeout(inactivityTimer);
    localStorage.removeItem('jarvis_user'); 
    setTimeout(() => { window.location.href = "index.html"; }, 300);
}

// --- PASSWORD MANAGEMENT ---
function openChangePasswordModal(btn) {
    if (btn) {
        btn.classList.add('loading');
        setTimeout(() => btn.classList.remove('loading'), 400);
    }
    document.getElementById('password-modal').style.display = 'flex';
}

function closeChangePasswordModal(btn) {
    if (btn) {
        btn.classList.add('loading');
        setTimeout(() => btn.classList.remove('loading'), 300);
    }
    document.getElementById('password-modal').style.display = 'none';
    document.getElementById('new-password').value = "";
    document.getElementById('confirm-password').value = "";
}

async function processChangePassword(btn) {
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;
    const userJson = localStorage.getItem('jarvis_user');
    if (!userJson) return;
    const user = JSON.parse(userJson);

    if (newPass.length < 4) { alert("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษรครับ"); return; }
    if (newPass !== confirmPass) { alert("รหัสผ่านไม่ตรงกันครับ กรุณาตรวจสอบอีกครั้ง"); return; }

    if (!confirm("ยืนยันการเปลี่ยนรหัสผ่านใหม่?")) return;
    
    if (btn) btn.classList.add('loading');

    try {
        const response = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'changePassword', 
                secret_key: SECRET_KEY,
                data: { username: user.username, new_password: newPass } 
            }) 
        });
        const result = await response.json();
        if (result.status === "success") {
            alert("✅ เปลี่ยนรหัสผ่านเรียบร้อยแล้วครับ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
            logout();
        } else {
            alert("❌ " + result.message);
        }
    } catch (e) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อ API");
    } finally {
        if (btn) btn.classList.remove('loading');
    }
}

// --- DASHBOARD LOGIC ---
let allBookings = [];
let selectedDates = [];

async function initDashboard() {
    const userJson = localStorage.getItem('jarvis_user');
    if (!userJson) { window.location.href = "index.html"; return; }
    const user = JSON.parse(userJson);
    
    let roleName = "Standard User";
    if (user.role === 'admin') roleName = "Administrator";
    else if (user.role.startsWith('driver')) roleName = "Logistics Driver";

    const welcomeEl = document.getElementById('welcome-text');
    if (welcomeEl) welcomeEl.innerText = `Welcome, ${user.username}`;
    
    const roleEl = document.getElementById('role-text');
    if (roleEl) roleEl.innerText = `Privilege: ${roleName}`;
    
    if (user.role === 'admin') {
        const exportBtn = document.getElementById('admin-export-btn');
        if (exportBtn) exportBtn.style.display = "flex";
        
        const carSelect = document.getElementById('car_type');
        if (carSelect) {
            carSelect.innerHTML += `
                <option value="หยุดงาน">🛑 Out of Office (Driver Leave)</option>
                <option value="เข้าศูนย์">🛠️ Maintenance (Garage)</option>
            `;
        }
    }

    if (user.role === 'user' || user.role === 'admin') {
        document.getElementById('user-section').style.display = "block";
    }

    const carSelect = document.getElementById('car_type');
    if (carSelect) { carSelect.addEventListener('change', updateBookingRows); }
    await fetchBookings();

    // --- REAL-TIME UPDATE (Every 30 seconds) ---
    setInterval(fetchBookings, 30000);
}

async function fetchBookings() {
    try {
        const response = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'getBookings',
                secret_key: SECRET_KEY
            }) 
        });
        const result = await response.json();
        if (result.status === "success") {
            allBookings = result.data;
            renderBookings();
            if (selectedDates.length > 0) updateBookingRows();
        }
    } catch (e) { console.error("Fetch Error:", e); }
}

function getISODate(dateVal) {
    if (!dateVal) return "";
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return dateVal.toString().substring(0, 10);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) { return dateVal.toString().substring(0, 10); }
}

// --- TIME UTILS ---
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function slotToRange(slot, customStart = "", customEnd = "") {
    if (slot === 'เช้า') return { start: 510, end: 720 }; // 08:30 - 12:00
    if (slot === 'บ่าย') return { start: 780, end: 1020 }; // 13:00 - 17:00
    if (slot === 'ทั้งวัน') return { start: 510, end: 1020 }; // 08:30 - 17:00
    if (slot === 'กำหนดเวลาเอง' && customStart && customEnd) {
        let start = timeToMinutes(customStart);
        let end = timeToMinutes(customEnd);
        if (end < start) end += 1440; 
        return { start, end };
    }
    return null;
}

function checkTimeOverlap(range1, range2) {
    if (!range1 || !range2) return false;
    return (range1.start < range2.end) && (range1.end > range2.start);
}

function getOccupiedTimes(date, carType) {
    if (!allBookings || allBookings.length === 0) return [];
    return allBookings.filter(b => {
        if (b.status === 'cancelled') return false;
        if (getISODate(b.date) !== date) return false;
        const isThisCarUsed = (b.car_type === carType) || (b.car_type === 'เข้าศูนย์' && b.dropoff === carType);
        return isThisCarUsed;
    }).map(b => b.time_slot);
}

// --- DYNAMIC UI HANDLERS ---
function updateBookingRows() {
    const container = document.getElementById('booking-days-container');
    const carType = document.getElementById('car_type').value;
    container.innerHTML = "";
    
    if (!carType) {
        container.innerHTML = "<div style='text-align:center; opacity:0.5; padding:30px; font-weight:600;'>Please select a vehicle type first.</div>";
        return;
    }

    selectedDates.forEach((dateStr, index) => {
        const dateISO = getISODate(dateStr);
        const [y, m, d] = dateISO.split('-');
        const displayDate = `${d}/${m}/${y}`;
        const occupied = getOccupiedTimes(dateISO, carType);
        
        let driverWarning = "";
        if (carType === 'VIOS' || carType === 'BYD') {
            const golfOccupied = allBookings.filter(b => {
                if (b.status === 'cancelled' || getISODate(b.date) !== dateISO) return false;
                const isGolfJob = (b.car_type === 'VIOS' || b.car_type === 'BYD') && (b.dropoff === 'ใช้คนขับ' || b.dropoff.includes('คนขับ'));
                const isGolfLeave = (b.car_type === 'หยุดงาน' && b.dropoff === 'คนขับรถเก๋ง (คุณกอล์ฟ)');
                return isGolfJob || isGolfLeave;
            }).map(b => b.time_slot);
            if (golfOccupied.length > 0) driverWarning = `<div class="occupied-badge" style="background:#FFF9E6; color:#B08800; border-color:#FFE58F;">⚠️ Driver Occupied: ${golfOccupied.join(', ')}</div>`;
        }

        const occupiedHtml = occupied.length > 0 ? `<div class="occupied-badge">🚫 Booked: ${occupied.join(', ')}</div>` : `<div class="occupied-badge" style="background:#EAF9EE; color:#1E7E34; border-color:#B7EB8F;">✅ Available</div>`;

        const row = document.createElement('div');
        row.className = "day-row animate-fade";
        row.style.animationDelay = `${index * 0.05}s`;
        row.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #EEF2F4; padding-bottom:10px;">
                <span style="font-weight:700; color:var(--primary);">📅 Date: ${displayDate}</span>
                <div style="display:flex; gap:8px;">${occupiedHtml}${driverWarning}</div>
            </div>
            <div class="filters" style="background:transparent; border:none; padding:0; gap:12px;">
                <div class="form-group" style="padding:0; flex:1;">
                    <label style="font-size:0.75rem; opacity:0.7;">Time Slot</label>
                    <select class="row-time-slot" onchange="toggleCustomTime(this, ${index})">
                        <option value="เช้า">Morning (08:30-12:00)</option>
                        <option value="บ่าย">Afternoon (13:00-17:00)</option>
                        <option value="ทั้งวัน">Full Day (08:30-17:00)</option>
                        <option value="กำหนดเวลาเอง">Custom Range</option>
                    </select>
                </div>
                <div class="form-group row-custom-time" style="display:none; flex:1.5; padding:0;">
                    <label style="font-size:0.75rem; opacity:0.7;">Specify Time (24H)</label>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <input type="text" class="row-start-time" placeholder="Start" style="padding:8px;">
                        <span style="font-size:0.8rem; opacity:0.5;">to</span>
                        <input type="text" class="row-end-time" placeholder="End" style="padding:8px;">
                    </div>
                </div>
                <div class="form-group" style="padding:0; flex:1;">
                    <label style="font-size:0.75rem; opacity:0.7;">Service Option</label>
                    <div class="row-dropoff-container">${getDropoffUI(carType)}</div>
                </div>
            </div>
        `;
        container.appendChild(row);

        flatpickr(row.querySelector('.row-start-time'), { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true, defaultDate: "08:30" });
        flatpickr(row.querySelector('.row-end-time'), { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true, defaultDate: "12:00" });
    });
}

function getDropoffUI(carType) {
    if (carType === 'หยุดงาน') return `<select class="row-dropoff"><option value="คนขับรถเก๋ง (คุณกอล์ฟ)">K. Golf (Driver)</option></select>`;
    if (carType === 'เข้าศูนย์') return `<select class="row-dropoff"><option value="BYD">BYD</option><option value="VIOS">VIOS</option></select>`;
    if (carType === 'BYD' || carType === 'VIOS') return `<select class="row-dropoff"><option value="ขับเอง">Self-Drive</option><option value="ใช้คนขับ">With Driver</option></select>`;
    return `<input type="text" class="row-dropoff" placeholder="Destination">`;
}

function toggleCustomTime(select, index) {
    const row = select.closest('.day-row');
    const customTimeDiv = row.querySelector('.row-custom-time');
    customTimeDiv.style.display = (select.value === 'กำหนดเวลาเอง') ? "block" : "none";
}

function renderBookings() {
    const filterDate = document.getElementById('filter-date').value;
    const filterCar = document.getElementById('filter-car').value;
    const list = document.getElementById('booking-list');
    const currentUser = JSON.parse(localStorage.getItem('jarvis_user'));
    list.innerHTML = "";

    const filtered = allBookings.filter(b => {
        if (b.status === 'cancelled') return false;
        let match = true;
        if (filterDate && getISODate(b.date) !== filterDate) match = false;
        if (filterCar && b.car_type !== filterCar) match = false;
        return match;
    }).reverse();

    if (filtered.length === 0) {
        list.innerHTML = "<tr><td colspan='6' style='text-align:center; opacity:0.3; padding: 60px; font-weight:600;'>No booking records found for the selected criteria.</td></tr>";
        return;
    }

    filtered.forEach(b => {
        const tr = document.createElement('tr');
        const [y, m, d] = getISODate(b.date).split('-');
        
        // --- EXPIRY CHECK ---
        let isExpired = false;
        const now = new Date();
        const todayStr = getISODate(now);
        const bookingDateStr = getISODate(b.date);
        
        if (bookingDateStr < todayStr) {
            isExpired = true;
        } else if (bookingDateStr === todayStr) {
            let startT = "", endT = "";
            let slotType = b.time_slot;
            if (b.time_slot.includes('-')) {
                slotType = 'กำหนดเวลาเอง';
                [startT, endT] = b.time_slot.split('-');
            }
            const range = slotToRange(slotType, startT, endT);
            const currentMin = now.getHours() * 60 + now.getMinutes();
            if (range && currentMin > range.end) isExpired = true;
        }

        let statusClass = b.status === 'completed' ? 'status-completed' : 'status-pending';
        let statusText = b.status === 'completed' ? 'COMPLETED' : 'PENDING';
        
        if (b.status === 'pending' && isExpired) {
            statusClass = 'status-expired';
            statusText = 'EXPIRED';
        }

        if (b.car_type === 'หยุดงาน') { statusText = "LEAVE"; statusClass = "status-leave"; }
        else if (b.car_type === 'เข้าศูนย์') { statusText = "MAINTENANCE"; statusClass = "status-maintenance"; }

        let actionContent = "";
        
        if (currentUser.role === 'admin') {
            let finishBtn = "";
            if (b.status === 'pending') {
                finishBtn = `<button class="btn-close-job" onclick="processCloseJob('${b.id}', this)">
                    <span>Finish Job</span>
                    <span class="btn-spinner"></span>
                </button>`;
            }

            actionContent = `
                <div class="action-row">
                    <button class="btn-evidence" style="background:var(--primary); color:white;" onclick="openEditModal('${b.id}', this)">
                        <span>Edit</span>
                        <span class="btn-spinner"></span>
                    </button>
                    <button class="btn-cancel" onclick="cancelBooking('${b.id}', this)">
                        <span>Cancel</span>
                        <span class="btn-spinner"></span>
                    </button>
                </div>
                ${finishBtn}
            `;
        } 
        else if (statusText !== 'EXPIRED') {
            let cancelBtn = "";
            if (b.status === 'pending' && b.booked_by === currentUser.username) {
                cancelBtn = `<button class="btn-cancel" onclick="cancelBooking('${b.id}', this)">
                    <span>Cancel</span>
                    <span class="btn-spinner"></span>
                </button>`;
            }

            let finishBtn = "";
            let canClose = false;
            if (b.status === 'pending') {
                if (currentUser.role === 'driver1' && (b.car_type === 'VIOS' || b.car_type === 'BYD') && b.dropoff.includes('คนขับ')) canClose = true;
                else if (b.booked_by === currentUser.username) canClose = true;
            }

            if (canClose) {
                finishBtn = `<button class="btn-close-job" onclick="processCloseJob('${b.id}', this)">
                    <span>Finish Job</span>
                    <span class="btn-spinner"></span>
                </button>`;
            }
            
            if (cancelBtn || finishBtn) {
                actionContent = `
                    ${cancelBtn ? `<div class="action-row">${cancelBtn}</div>` : ""}
                    ${finishBtn}
                `;
            }
        }

        if (b.image_url) {
            actionContent += `
                <button class="btn-proof" onclick="viewImage('${b.id}', this)">
                    <span>Proof</span>
                    <span class="btn-spinner"></span>
                </button>
            `;
        }

        const actionBtn = actionContent ? `<div class="action-container">${actionContent}</div>` : "-";

        // Clean note for display (remove username prefix if present)
        const noteDisplay = b.note.includes(': ') ? b.note.split(': ')[1] : b.note;

        tr.innerHTML = `
            <td><span style="font-weight:700; color:var(--primary);">${b.car_type}</span></td>
            <td><div style="font-weight:600;">${d}/${m}/${y}</div><div style="font-size:0.75rem; color:var(--text-sub);">${b.time_slot}</div></td>
            <td><div style="font-weight:500;">${b.pickup}</div><div style="font-size:0.75rem; color:var(--text-sub);">${b.dropoff}</div></td>
            <td><div style="font-weight:600; font-size:0.85rem;">${noteDisplay}</div><div style="font-size:0.7rem; color:var(--text-sub);">Booked by: ${b.booked_by}</div></td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td style="text-align:center;">${actionBtn || "-"}</td>
        `;
        list.appendChild(tr);
    });
}

// --- CLOSE JOB LOGIC ---
async function processCloseJob(id, btn) {
    if (!confirm("Confirm to finish this job?")) return;
    
    if (btn) btn.classList.add('loading');

    try {
        const response = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'closeJob', 
                secret_key: SECRET_KEY,
                data: { id: id, image_url: "" } 
            }) 
        });
        const result = await response.json();
        if (result.status === "success") {
            alert("✅ Job finished successfully!");
            await fetchBookings();
        }
    } catch (e) {
        alert("Error finishing job: " + e.message);
    } finally {
        if (btn) btn.classList.remove('loading');
    }
}

async function addBooking(btn) {
    const user = JSON.parse(localStorage.getItem('jarvis_user'));
    const carType = document.getElementById('car_type').value;
    const pickup = document.getElementById('pickup').value.trim();
    const note = document.getElementById('note').value.trim();
    const rows = document.querySelectorAll('.day-row');

    if (!carType || selectedDates.length === 0 || !pickup || !note || note === user.username + ":") { 
        alert("Required fields missing. Please complete the form."); 
        return; 
    }

    const bookingsToSubmit = [];
    let hasOverlap = false;
    let overlapDetails = "";

    for (let i = 0; i < rows.length; i++) {
        const dateISO = getISODate(selectedDates[i]);
        const slot = rows[i].querySelector('.row-time-slot').value;
        const startTime = rows[i].querySelector('.row-start-time').value;
        const endTime = rows[i].querySelector('.row-end-time').value;
        const dropoff = rows[i].querySelector('.row-dropoff').value.trim();
        
        if (!dropoff) { alert(`Destination missing for ${selectedDates[i]}`); return; }
        
        const timeDisplay = slot === 'กำหนดเวลาเอง' ? `${startTime}-${endTime}` : slot;
        const currentRange = slotToRange(slot, startTime, endTime);

        const existingForDate = allBookings.filter(b => 
            b.status !== 'cancelled' && 
            getISODate(b.date) === dateISO && 
            ((b.car_type === carType) || (b.car_type === 'เข้าศูนย์' && b.dropoff === carType) || (carType === 'เข้าศูนย์' && b.car_type === dropoff))
        );

        for (const existing of existingForDate) {
            let exStart = "", exEnd = "";
            if (existing.time_slot.includes('-')) {
                [exStart, exEnd] = existing.time_slot.split('-');
            }
            const existingRange = slotToRange(existing.time_slot, exStart, exEnd);
            
            if (checkTimeOverlap(currentRange, existingRange)) {
                hasOverlap = true;
                overlapDetails += `- ${dateISO} (${existing.time_slot}) โดยคุณ ${existing.booked_by}\n`;
            }
        }

        bookingsToSubmit.push({ 
            car_type: carType, 
            date: dateISO, 
            time_slot: timeDisplay, 
            pickup: pickup, 
            dropoff: dropoff, 
            note: note, 
            booked_by: user.username, 
            role: user.role
        });
    }

    if (hasOverlap) {
        if (user.role === 'admin') {
            if (!confirm(`⚠️ พบช่วงเวลาที่จองทับซ้อนกันดังนี้:\n${overlapDetails}\nAdmin ต้องการยืนยันการจองซ้ำ (Bypass) ใช่หรือไม่?`)) return;
        } else {
            alert(`❌ ขออภัยครับ ไม่สามารถจองได้เนื่องจากมีการจองทับซ้อนกัน:\n${overlapDetails}`);
            return;
        }
    }

    if (!confirm(`Process ${bookingsToSubmit.length} booking(s)?`)) return;
    
    if (btn) btn.classList.add('loading');
    
    try {
        for (const data of bookingsToSubmit) { 
            await fetch(API_URL, { 
                method: 'POST', 
                body: JSON.stringify({ 
                    action: 'addBooking', 
                    secret_key: SECRET_KEY,
                    data 
                }) 
            }); 
        }
        alert(`Successfully processed all requests.`);
        location.reload();
    } catch (e) { alert("Execution failed: " + e.message); }
    finally { if (btn) btn.classList.remove('loading'); }
}

async function cancelBooking(id, btn) {
    if (!confirm("Cancel this booking?")) return;
    if (btn) btn.classList.add('loading');
    try {
        const response = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'cancelBooking', 
                secret_key: SECRET_KEY,
                data: { id: id } 
            }) 
        });
        const result = await response.json();
        if (result.status === "success") { alert("Booking cancelled."); await fetchBookings(); }
    } catch (e) { alert("API Communication Error"); } 
    finally { if (btn) btn.classList.remove('loading'); }
}

function exportData(btn) {
    if (btn) {
        btn.classList.add('loading');
        setTimeout(() => btn.classList.remove('loading'), 1000);
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let uniqueDates = new Set();
    allBookings.forEach(b => {
        if (b.status === 'cancelled') return;
        const bDate = new Date(getISODate(b.date));
        if (bDate >= today) {
            uniqueDates.add(getISODate(b.date));
        }
    });
    
    let dates = Array.from(uniqueDates).sort();
    if (dates.length === 0) {
        alert("ขออภัยครับ ไม่พบข้อมูลการจองที่ใช้งานอยู่ (Active) ตั้งแต่วันนี้เป็นต้นไปเพื่อส่งออกครับ");
        return;
    }
    
    const formatTime = (d) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear().toString().substring(2)} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    let text = `📢 อัปเดตงานคนขับ VIOS / BYD (${formatTime(new Date())})\n\n`;
    const separator = "📍━━━━━━━━━ 🚙💨 ━━━━━━━━━📍\n";
    const cars = [
        { name: "🧑‍🔧 คุณกอล์ฟ (พนักงานขับรถเก๋ง VIOS / BYD)", icon: "🧑‍🔧", filter: b => (b.car_type === 'VIOS' || b.car_type === 'BYD') && (b.dropoff === 'ใช้คนขับ' || b.dropoff.includes('คนขับ')) || (b.car_type === 'หยุดงาน' && b.dropoff === 'คนขับรถเก๋ง (คุณกอล์ฟ)') },
        { name: "🚙💨 งาน BYD (4 ที่นั่ง)", icon: "🚙", filter: b => b.car_type === 'BYD' || (b.car_type === 'เข้าศูนย์' && b.dropoff === 'BYD') },
        { name: "🚗💨 งาน VIOS ( 4 ที่นั่ง คนขับรูดใบขับขี่)", icon: "🚗", filter: b => b.car_type === 'VIOS' || (b.car_type === 'เข้าศูนย์' && b.dropoff === 'VIOS') }
    ];
    cars.forEach(car => {
        text += separator + car.name + "\n";
        dates.forEach(d => {
            const dayBookings = allBookings.filter(b => b.status !== 'cancelled' && getISODate(b.date) === d && car.filter(b));
            if (dayBookings.length > 0) {
                const [y, m, day] = d.split('-');
                text += `📅 วันที่ ${day}/${m}\n`;
                dayBookings.forEach(b => {
                    const noteName = b.note.includes(': ') ? b.note.split(': ')[1] : b.note;
                    let icon = car.icon;
                    if (b.car_type === 'หยุดงาน') { text += `\t\t\t🛑 (${b.time_slot}) พนักงานหยุดงาน\n`; }
                    else if (car.icon === "🧑‍🔧") {
                        const carIcon = b.car_type === 'BYD' ? "🚙" : "🚗";
                        text += `\t\t\t${carIcon} (${b.time_slot}) ขับ${b.car_type} / คุณ${noteName}\n`;
                    } else {
                        let driverDesc = b.dropoff === 'ใช้คนขับ' ? "** คุณกอล์ฟขับ" : `** ${b.dropoff}`;
                        if (b.car_type === 'เข้าศูนย์') text += `\t\t\t🛠️ (${b.time_slot}) รถเข้าศูนย์ซ่อมบำรุง\n`;
                        else text += `\t\t\t${icon} (${b.time_slot}) ${b.pickup} ${driverDesc} / คุณ${noteName}\n`;
                    }
                });
            }
        });
        text += "\n";
    });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Car_Booking_Update_${getISODate(new Date())}.txt`;
    link.click();
}

function toggleBookingForm() {
    const content = document.getElementById('booking-form-content');
    const icon = document.getElementById('fold-icon');
    content.style.display = (content.style.display === "none") ? "block" : "none";
    icon.innerText = (content.style.display === "none") ? "▲" : "▼";
}

window.onload = () => {
    const isDashboard = window.location.pathname.includes('dashboard.html');
    if (isDashboard) {
        initDashboard();
        flatpickr("#date", { 
            mode: "multiple", 
            locale: "th", 
            dateFormat: "Y-m-d", 
            minDate: "today",
            altInput: true, 
            altFormat: "j F Y", 
            onChange: (dates) => { selectedDates = dates.map(d => getISODate(d)); updateBookingRows(); } 
        });
        flatpickr("#filter-date", { locale: "th", dateFormat: "Y-m-d", defaultDate: getISODate(new Date()), altInput: true, altFormat: "j F Y", onChange: () => renderBookings() });

        // Add listener for Admin Edit Modal car type change
        const editCarSelect = document.getElementById('edit-car-type');
        if (editCarSelect) {
            editCarSelect.addEventListener('change', updateEditModalLabels);
        }
    } else {
        const userJson = localStorage.getItem('jarvis_user');
        if (userJson) {
            window.location.href = "dashboard.html";
        } else {
            const userField = document.getElementById('username');
            if (userField) userField.focus();
        }
    }
};

function toggleEditCustomTime() {
    const slot = document.getElementById('edit-time-slot').value;
    const customRow = document.getElementById('edit-custom-time-row');
    customRow.style.display = (slot === 'กำหนดเวลาเอง') ? 'block' : 'none';
}

function updateEditModalLabels() {
    const carType = document.getElementById('edit-car-type').value;
    const dropoffSelect = document.getElementById('edit-dropoff');
    const pickupLabel = document.getElementById('edit-pickup-label');
    const dropoffLabel = document.getElementById('edit-dropoff-label');
    
    // Clear current options
    dropoffSelect.innerHTML = "";
    
    if (carType === 'หยุดงาน') {
        pickupLabel.textContent = "Reason / Detail";
        dropoffLabel.textContent = "Driver Group";
        dropoffSelect.innerHTML = `<option value="คนขับรถเก๋ง (คุณกอล์ฟ)">K. Golf (Driver)</option>`;
    } 
    else if (carType === 'เข้าศูนย์') {
        pickupLabel.textContent = "Garage / Service Center";
        dropoffLabel.textContent = "Vehicle Target";
        dropoffSelect.innerHTML = `<option value="BYD">BYD</option><option value="VIOS">VIOS</option>`;
    } 
    else if (carType === 'BYD' || carType === 'VIOS') {
        pickupLabel.textContent = "Destination / Location";
        dropoffLabel.textContent = "Service Option";
        dropoffSelect.innerHTML = `
            <option value="ขับเอง">Self-Drive (ขับเอง)</option>
            <option value="ใช้คนขับ">With Driver (ใช้คนขับ)</option>
        `;
    } else {
        pickupLabel.textContent = "Destination";
        dropoffLabel.textContent = "Note / Dropoff";
        // Convert to input if unknown car type? No, stick to select for now or allow free text if needed.
        // For admin, we keep it simple.
    }
}

function openEditModal(id, btn) {
    if (btn) {
        btn.classList.add('loading');
        setTimeout(() => btn.classList.remove('loading'), 400);
    }
    const b = allBookings.find(x => x.id === id);
    if (!b) return;

    document.getElementById('edit-id').value = b.id;
    document.getElementById('edit-date').value = getISODate(b.date);
    document.getElementById('edit-car-type').value = b.car_type;
    document.getElementById('edit-status').value = b.status;
    document.getElementById('edit-pickup').value = b.pickup;
    document.getElementById('edit-booked-by').value = b.booked_by;

    updateEditModalLabels();
    
    const dropoffSelect = document.getElementById('edit-dropoff');
    const options = Array.from(dropoffSelect.options).map(o => o.value);
    if (options.includes(b.dropoff)) {
        dropoffSelect.value = b.dropoff;
    } else {
        const newOpt = document.createElement('option');
        newOpt.value = b.dropoff;
        newOpt.textContent = b.dropoff;
        dropoffSelect.appendChild(newOpt);
        dropoffSelect.value = b.dropoff;
    }

    const slotSelect = document.getElementById('edit-time-slot');
    if (b.time_slot.includes('-')) {
        slotSelect.value = 'กำหนดเวลาเอง';
        const [start, end] = b.time_slot.split('-');
        document.getElementById('edit-start-time').value = start;
        document.getElementById('edit-end-time').value = end;
    } else {
        slotSelect.value = b.time_slot;
    }
    toggleEditCustomTime();

    flatpickr("#edit-start-time", { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true });
    flatpickr("#edit-end-time", { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true });

    document.getElementById('edit-image-action').value = "keep";
    const imgSection = document.getElementById('edit-image-section');
    if (b.image_url) {
        document.getElementById('edit-img-preview').src = b.image_url;
        imgSection.style.display = "block";
    } else {
        imgSection.style.display = "none";
    }

    document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal(btn) {
    if (btn) {
        btn.classList.add('loading');
        setTimeout(() => btn.classList.remove('loading'), 300);
    }
    document.getElementById('edit-modal').style.display = 'none';
}

function clearImageInModal(btn) {
    if (confirm("ต้องการลบรูปภาพหลักฐานนี้ออกใช่หรือไม่?")) {
        if (btn) btn.classList.add('loading');
        document.getElementById('edit-image-action').value = "delete";
        document.getElementById('edit-image-section').style.display = "none";
        if (btn) setTimeout(() => btn.classList.remove('loading'), 300);
    }
}

async function saveAdminEdit(btn) {
    const slot = document.getElementById('edit-time-slot').value;
    const startTime = document.getElementById('edit-start-time').value;
    const endTime = document.getElementById('edit-end-time').value;
    const timeDisplay = slot === 'กำหนดเวลาเอง' ? `${startTime}-${endTime}` : slot;

    const data = {
        id: document.getElementById('edit-id').value,
        date: document.getElementById('edit-date').value,
        car_type: document.getElementById('edit-car-type').value,
        time_slot: timeDisplay,
        status: document.getElementById('edit-status').value,
        pickup: document.getElementById('edit-pickup').value,
        dropoff: document.getElementById('edit-dropoff').value, 
        booked_by: document.getElementById('edit-booked-by').value,
        delete_image: document.getElementById('edit-image-action').value === 'delete'
    };

    if (!confirm("ยืนยันการบันทึกการเปลี่ยนแปลง?")) return;
    
    if (btn) btn.classList.add('loading');

    try {
        const response = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'adminEdit', 
                secret_key: SECRET_KEY,
                data 
            }) 
        });
        const result = await response.json();
        if (result.status === "success") {
            alert("✅ แก้ไขข้อมูลเรียบร้อยครับ");
            closeEditModal();
            await fetchBookings();
        } else {
            alert("❌ " + result.message);
        }
    } catch (e) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อ API");
    } finally {
        if (btn) btn.classList.remove('loading');
    }
}

function viewImage(id, btn) { 
    if (btn) {
        btn.classList.add('loading');
        setTimeout(() => btn.classList.remove('loading'), 400);
    }
    const b = allBookings.find(x => x.id === id); 
    if (b && b.image_url) window.open().document.write(`<img src="${b.image_url}" style="max-width:100%">`); 
}

// --- CONFIGURATION ---
const API_URL = "https://script.google.com/macros/s/AKfycbxqVCP_2O4tGxIkvr_w9RSlfIkv-Mt0YobXW1-RVpfg4lK5vW9XZ7Cz0UuzEiBfXicC/exec"; 
const SECRET_KEY = "FLT_INTERNAL_2026";

// --- AUTH LOGIC ---
let inactivityTimer;
const LOGOUT_TIME = 5 * 60 * 1000; // 5 นาที

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert("Session Expired: ท่านไม่ได้ใช้งานเกิน 5 นาที ระบบจะออกจากระบบอัตโนมัติเพื่อความปลอดภัยครับ");
        logout();
    }, LOGOUT_TIME);
}

// ตรวจสอบการเคลื่อนไหวเพื่อ Reset Timer
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer, true);
});

async function handleLogin() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');

    if (!user || !pass) { 
        showErrorModal("Please enter both username and password.");
        return; 
    }
    
    btn.disabled = true;
    btnText.innerText = "Authenticating...";
    btnSpinner.style.display = "block";
    btn.style.opacity = "0.8";

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
        btn.disabled = false;
        btnText.innerText = "Sign In";
        btnSpinner.style.display = "none";
        btn.style.opacity = "1";
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

function closeErrorModal() {
    const modal = document.getElementById('error-modal');
    if (modal) modal.style.display = 'none';
    const passInput = document.getElementById('password');
    if (passInput) { passInput.value = ""; passInput.focus(); }
}

function logout() { 
    clearTimeout(inactivityTimer);
    localStorage.removeItem('jarvis_user'); 
    window.location.href = "index.html"; 
}

// --- PASSWORD MANAGEMENT ---
function openChangePasswordModal() {
    document.getElementById('password-modal').style.display = 'flex';
}

function closeChangePasswordModal() {
    document.getElementById('password-modal').style.display = 'none';
    document.getElementById('new-password').value = "";
    document.getElementById('confirm-password').value = "";
}

async function processChangePassword() {
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;
    const userJson = localStorage.getItem('jarvis_user');
    if (!userJson) return;
    const user = JSON.parse(userJson);

    if (newPass.length < 4) { alert("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษรครับ"); return; }
    if (newPass !== confirmPass) { alert("รหัสผ่านไม่ตรงกันครับ กรุณาตรวจสอบอีกครั้ง"); return; }

    if (!confirm("ยืนยันการเปลี่ยนรหัสผ่านใหม่?")) return;

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
        if (user.role === 'user') {
            const noteInput = document.getElementById('note');
            const prefix = user.username + ": ";
            noteInput.value = prefix;
            noteInput.addEventListener('input', function() { if (!this.value.startsWith(prefix)) this.value = prefix; });
        }
    }

    const carSelect = document.getElementById('car_type');
    if (carSelect) { carSelect.addEventListener('change', updateBookingRows); }
    await fetchBookings();
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
        let statusClass = b.status === 'completed' ? 'status-completed' : 'status-pending';
        let statusText = b.status === 'completed' ? 'COMPLETED' : 'PENDING';
        if (b.car_type === 'หยุดงาน') { statusText = "LEAVE"; statusClass = "status-leave"; }
        else if (b.car_type === 'เข้าศูนย์') { statusText = "MAINTENANCE"; statusClass = "status-maintenance"; }

        const [y, m, d] = getISODate(b.date).split('-');
        let actionBtn = "";
        
        if (currentUser.role === 'admin') {
            actionBtn = `<div style="display:flex; gap:8px; justify-content:center;"><button class="btn-evidence" style="background:var(--primary); color:white;" onclick="openEditModal('${b.id}')">Edit</button><button class="btn-cancel" onclick="cancelBooking('${b.id}')">Cancel</button></div>`;
        } 
        else if (b.status === 'pending' && b.booked_by === currentUser.username) {
            actionBtn = `<button class="btn-cancel" onclick="cancelBooking('${b.id}')">Cancel</button>`;
        }

        let canClose = false;
        if (b.status === 'pending') {
            // 1. Admin ปิดได้ทุกงาน
            if (currentUser.role === 'admin') canClose = true;
            // 2. คนขับ (Driver1) ปิดงาน VIOS/BYD เฉพาะกรณีที่ระบุว่า "ใช้คนขับ"
            else if (currentUser.role === 'driver1' && (b.car_type === 'VIOS' || b.car_type === 'BYD') && b.dropoff.includes('คนขับ')) canClose = true;
            // 3. User ปิดงานตัวเองได้เฉพาะกรณี "ขับเอง"
            else if (currentUser.role === 'user' && b.booked_by === currentUser.username && b.dropoff.includes('ขับเอง')) canClose = true;
        }

        if (canClose) {
            actionBtn += `<button class="btn-close-job" style="margin-top:5px; background:var(--completed-text); color:white;" onclick="openCloseJobModal('${b.id}')">Finish Job</button>`;
        }

        if (b.image_url) actionBtn += `<button class="btn-evidence" style="margin-top:5px" onclick="viewImage('${b.id}')">Proof</button>`;

        tr.innerHTML = `
            <td><span style="font-weight:700; color:var(--primary);">${b.car_type}</span></td>
            <td><div style="font-weight:600;">${d}/${m}/${y}</div><div style="font-size:0.75rem; color:var(--text-sub);">${b.time_slot}</div></td>
            <td><div style="font-weight:500;">${b.pickup}</div><div style="font-size:0.75rem; color:var(--text-sub);">${b.dropoff}</div></td>
            <td><span style="font-size:0.85rem; font-weight:600;">${b.booked_by}</span></td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td style="text-align:center;">${actionBtn || "-"}</td>
        `;
        list.appendChild(tr);
    });
}

// --- CLOSE JOB LOGIC ---
function openCloseJobModal(id) {
    const b = allBookings.find(x => x.id === id);
    if (!b) return;
    
    let modal = document.getElementById('close-job-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'close-job-modal';
        modal.className = 'loading-overlay';
        modal.innerHTML = `
            <div class="card" style="max-width: 400px; padding: 30px; animation: zoomIn 0.25s;">
                <h3 style="border:none; padding:0; margin-bottom:20px;">🎉 Finish Job</h3>
                <p style="font-size:0.9rem; color:var(--text-sub); margin-bottom:20px;">โปรดอัปโหลดรูปภาพหลักฐานการใช้งาน (ถ้ามี) เพื่อจบงานนี้ครับ</p>
                <input type="file" id="job-image" accept="image/*" style="margin-bottom:20px; font-size:0.8rem;">
                <div style="display:flex; gap:10px;">
                    <button id="confirm-finish-btn" style="flex:2;">Confirm Finish</button>
                    <button onclick="document.getElementById('close-job-modal').style.display='none'" style="flex:1; background:#F1F2F4; color:var(--text-main);">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
    document.getElementById('confirm-finish-btn').onclick = () => processCloseJob(id);
}

async function processCloseJob(id) {
    const fileInput = document.getElementById('job-image');
    let imageUrl = "";

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        imageUrl = "Uploaded via Mobile/Web"; 
    }

    try {
        const response = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'closeJob', 
                secret_key: SECRET_KEY,
                data: { id: id, image_url: imageUrl } 
            }) 
        });
        const result = await response.json();
        if (result.status === "success") {
            alert("✅ จบงานเรียบร้อยครับ!");
            document.getElementById('close-job-modal').style.display = 'none';
            await fetchBookings();
        }
    } catch (e) {
        alert("เกิดข้อผิดพลาดในการจบงาน: " + e.message);
    }
}

async function addBooking() {
    const user = JSON.parse(localStorage.getItem('jarvis_user'));
    const carType = document.getElementById('car_type').value;
    const pickup = document.getElementById('pickup').value.trim();
    const note = document.getElementById('note').value.trim();
    const rows = document.querySelectorAll('.day-row');

    if (!carType || selectedDates.length === 0 || !pickup || !note || note === user.username + ":") { alert("Required fields missing. Please complete the form."); return; }

    const bookingsToSubmit = [];
    for (let i = 0; i < rows.length; i++) {
        const dateISO = getISODate(selectedDates[i]);
        const slot = rows[i].querySelector('.row-time-slot').value;
        const startTime = rows[i].querySelector('.row-start-time').value;
        const endTime = rows[i].querySelector('.row-end-time').value;
        const dropoff = rows[i].querySelector('.row-dropoff').value.trim();
        if (!dropoff) { alert(`Destination missing for ${selectedDates[i]}`); return; }
        const timeDisplay = slot === 'กำหนดเวลาเอง' ? `${startTime}-${endTime}` : slot;
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

    if (!confirm(`Process ${bookingsToSubmit.length} booking(s)?`)) return;
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
}

async function cancelBooking(id) {
    if (!confirm("Cancel this booking?")) return;
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
}

function exportData() {
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
        flatpickr("#date", { mode: "multiple", locale: "th", dateFormat: "Y-m-d", altInput: true, altFormat: "j F Y", onChange: (dates) => { selectedDates = dates.map(d => getISODate(d)); updateBookingRows(); } });
        flatpickr("#filter-date", { locale: "th", dateFormat: "Y-m-d", defaultDate: getISODate(new Date()), altInput: true, altFormat: "j F Y", onChange: () => renderBookings() });
    } else {
        const userJson = localStorage.getItem('jarvis_user');
        if (userJson) window.location.href = "dashboard.html";
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

function openEditModal(id) {
    const b = allBookings.find(x => x.id === id);
    if (!b) return;

    document.getElementById('edit-id').value = b.id;
    document.getElementById('edit-date').value = getISODate(b.date);
    document.getElementById('edit-car-type').value = b.car_type;
    document.getElementById('edit-status').value = b.status;
    document.getElementById('edit-pickup').value = b.pickup;
    document.getElementById('edit-booked-by').value = b.booked_by;

    // Update labels and options first
    updateEditModalLabels();
    
    // Set dropoff value (if matches option)
    const dropoffSelect = document.getElementById('edit-dropoff');
    const options = Array.from(dropoffSelect.options).map(o => o.value);
    if (options.includes(b.dropoff)) {
        dropoffSelect.value = b.dropoff;
    } else {
        // If not in select (like old data), add it as an option
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

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

function clearImageInModal() {
    if (confirm("ต้องการลบรูปภาพหลักฐานนี้ออกใช่หรือไม่?")) {
        document.getElementById('edit-image-action').value = "delete";
        document.getElementById('edit-image-section').style.display = "none";
    }
}

async function saveAdminEdit() {
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
    }
}

function viewImage(id) { const b = allBookings.find(x => x.id === id); if (b && b.image_url) window.open().document.write(`<img src="${b.image_url}" style="max-width:100%">`); }

// --- CONFIGURATION (DEBUG MODE) ---
// จาวิชตั้งค่าแบบเปิดเผยชั่วคราวเพื่อทดสอบการเชื่อมต่อครับ
const API_URL = "https://script.google.com/macros/s/AKfycbxQOabDXI6mbZ-v4NiD258L8qIAmHyr-FIFjDRT1zaKDrm7EA4KjaRJ02eHdFvjCu9v/exec"; 
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
        console.log("Connecting to API..."); // Debug
        const response = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'login', 
                secret_key: SECRET_KEY,
                data: { username: user, password: pass } 
            }) 
        });
        const result = await response.json();
        console.log("Result:", result); // Debug

        if (result.status === "success") { 
            localStorage.setItem('jarvis_user', JSON.stringify(result)); 
            window.location.href = "dashboard.html"; 
        }
        else { 
            showErrorModal(result.message || "Invalid credentials.");
        }
    } catch (e) { 
        console.error("Fetch Error:", e); // Debug
        showErrorModal("Connection Error: " + e.message); 
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
}

function logout() { 
    clearTimeout(inactivityTimer);
    localStorage.removeItem('jarvis_user'); 
    window.location.href = "index.html"; 
}

// ... (ฟังก์ชันอื่นๆ เหมือนเดิม) ...
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

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function slotToRange(slot, customStart = "", customEnd = "") {
    if (slot === 'เช้า') return { start: 510, end: 720 };
    if (slot === 'บ่าย') return { start: 780, end: 1020 };
    if (slot === 'ทั้งวัน') return { start: 510, end: 1020 };
    if (slot && slot.includes('-')) {
        const parts = slot.split('-').map(t => timeToMinutes(t.trim()));
        return { start: parts[0], end: parts[1] < parts[0] ? parts[1] + 1440 : parts[1] };
    }
    if (slot === 'กำหนดเวลาเอง' && customStart && customEnd) {
        let s = timeToMinutes(customStart);
        let e = timeToMinutes(customEnd);
        return { start: s, end: e < s ? e + 1440 : e };
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
        const existingCar = b.car_type === 'เข้าศูนย์' ? b.dropoff.trim() : b.car_type.trim();
        if (existingCar === carType) return true;
        if (carType === 'เข้าศูนย์') return true; 
        return false;
    }).map(b => b.time_slot);
}

function updateBookingRows() {
    const container = document.getElementById('booking-days-container');
    const carType = document.getElementById('car_type').value;
    container.innerHTML = "";
    if (!carType) { container.innerHTML = "<div style='text-align:center; opacity:0.5; padding:30px;'>Please select a vehicle type.</div>"; return; }
    selectedDates.forEach((dateStr, index) => {
        const dateISO = getISODate(dateStr);
        const [y, m, d] = dateISO.split('-');
        const displayDate = `${d}/${m}/${y}`;
        const occupied = getOccupiedTimes(dateISO, carType);
        const occupiedHtml = occupied.length > 0 ? `<div class="occupied-badge">🚫 Booked: ${occupied.join(', ')}</div>` : `<div class="occupied-badge" style="background:#EAF9EE; color:#1E7E34;">✅ Available</div>`;
        const row = document.createElement('div');
        row.className = "day-row";
        row.innerHTML = `<div style="display:flex; justify-content:space-between;"><span>📅 ${displayDate}</span>${occupiedHtml}</div>
            <div class="filters" style="background:transparent; border:none; padding:0; display:flex; gap:10px; margin-top:10px;">
                <select class="row-time-slot" onchange="toggleCustomTime(this)"><option value="เช้า">Morning</option><option value="บ่าย">Afternoon</option><option value="ทั้งวัน">Full Day</option><option value="กำหนดเวลาเอง">Custom</option></select>
                <div class="row-custom-time" style="display:none;"><input type="text" class="row-start-time" placeholder="Start"> <input type="text" class="row-end-time" placeholder="End"></div>
                <div class="row-dropoff-container" style="flex:1;">${getDropoffUI(carType)}</div>
            </div>`;
        container.appendChild(row);
        flatpickr(row.querySelector('.row-start-time'), { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true });
        flatpickr(row.querySelector('.row-end-time'), { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true });
    });
}

function getDropoffUI(carType) {
    if (carType === 'หยุดงาน') return `<select class="row-dropoff"><option value="คนขับรถเก๋ง (คุณกอล์ฟ)">K. Golf</option></select>`;
    if (carType === 'เข้าศูนย์') return `<select class="row-dropoff"><option value="BYD">BYD</option><option value="VIOS">VIOS</option></select>`;
    if (carType === 'BYD' || carType === 'VIOS') return `<select class="row-dropoff"><option value="ขับเอง">Self-Drive</option><option value="ใช้คนขับ">With Driver</option></select>`;
    return `<input type="text" class="row-dropoff" placeholder="Destination">`;
}

function toggleCustomTime(select) {
    const row = select.closest('.day-row');
    row.querySelector('.row-custom-time').style.display = (select.value === 'กำหนดเวลาเอง') ? "block" : "none";
}

function renderBookings() {
    const filterDate = document.getElementById('filter-date').value;
    const filterCar = document.getElementById('filter-car').value;
    const list = document.getElementById('booking-list');
    const currentUser = JSON.parse(localStorage.getItem('jarvis_user'));
    list.innerHTML = "";
    const filtered = allBookings.filter(b => {
        if (b.status === 'cancelled') return false;
        if (filterDate && getISODate(b.date) !== filterDate) return false;
        if (filterCar && b.car_type !== filterCar) return false;
        return true;
    }).reverse();
    filtered.forEach(b => {
        const tr = document.createElement('tr');
        const [y, m, d] = getISODate(b.date).split('-');
        let actionBtn = "";
        if (currentUser.role === 'admin') actionBtn = `<button onclick="cancelBooking('${b.id}')">Cancel</button>`;
        tr.innerHTML = `<td>${b.car_type}</td><td>${d}/${m}/${y}<br><small>${b.time_slot}</small></td><td>${b.pickup}<br><small>${b.dropoff}</small></td><td>${b.booked_by}</td><td>${b.status}</td><td>${actionBtn}</td>`;
        list.appendChild(tr);
    });
}

async function addBooking() {
    const user = JSON.parse(localStorage.getItem('jarvis_user'));
    const carType = document.getElementById('car_type').value;
    const pickup = document.getElementById('pickup').value.trim();
    const note = document.getElementById('note').value.trim();
    const rows = document.querySelectorAll('.day-row');
    if (!carType || selectedDates.length === 0 || !pickup) { alert("Missing fields"); return; }
    const bookings = [];
    for (let i = 0; i < rows.length; i++) {
        const slot = rows[i].querySelector('.row-time-slot').value;
        const dropoff = rows[i].querySelector('.row-dropoff').value;
        const startTime = rows[i].querySelector('.row-start-time').value;
        const endTime = rows[i].querySelector('.row-end-time').value;
        const timeDisplay = slot === 'กำหนดเวลาเอง' ? `${startTime}-${endTime}` : slot;
        
        // Check Conflict (Client)
        const newRange = slotToRange(slot, startTime, endTime);
        const actualCar = carType === 'เข้าศูนย์' ? dropoff : carType;
        const isConflict = allBookings.some(b => {
            if (b.status === 'cancelled' || getISODate(b.date) !== getISODate(selectedDates[i])) return false;
            const existingCar = b.car_type === 'เข้าศูนย์' ? b.dropoff.trim() : b.car_type.trim();
            if (existingCar !== actualCar) return false;
            return checkTimeOverlap(newRange, slotToRange(b.time_slot));
        });
        if (isConflict) { alert(`Conflict on ${selectedDates[i]}`); return; }

        bookings.push({ car_type: carType, date: getISODate(selectedDates[i]), time_slot: timeDisplay, pickup, dropoff, note, booked_by: user.username, role: user.role });
    }
    if (!confirm("Confirm?")) return;
    try {
        for (const data of bookings) {
            await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addBooking', secret_key: SECRET_KEY, data }) });
        }
        location.reload();
    } catch (e) { alert("Error: " + e.message); }
}

async function cancelBooking(id) {
    if (!confirm("Cancel?")) return;
    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'cancelBooking', secret_key: SECRET_KEY, data: { id } }) });
        await fetchBookings();
    } catch (e) { alert("Error"); }
}

window.onload = () => {
    if (window.location.pathname.includes('dashboard.html')) {
        initDashboard();
        flatpickr("#date", { mode: "multiple", locale: "th", dateFormat: "Y-m-d", onChange: (dates) => { selectedDates = dates; updateBookingRows(); } });
        flatpickr("#filter-date", { locale: "th", dateFormat: "Y-m-d", defaultDate: new Date(), onChange: () => renderBookings() });
    }
};

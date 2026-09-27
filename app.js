// Konfigurasi Database Lokal Browser
const DB_KEY = 'json_generator_db';
let appData = JSON.parse(localStorage.getItem(DB_KEY)) || {};
let currentActiveJson = null;

// Mengambil Elemen DOM
const views = document.querySelectorAll('.view');
const btnNew = document.getElementById('btn-new');
const btnExisting = document.getElementById('btn-existing');
const btnBacks = document.querySelectorAll('.btn-back');

// Fungsi Utilitas: Perpindahan Tampilan Antarmuka
function switchView(viewId) {
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

btnBacks.forEach(btn => btn.addEventListener('click', () => switchView('view-menu')));

// --- SKENARIO 2a: BUAT JSON BARU & DEFINISI STRUKTUR ---
btnNew.addEventListener('click', () => {
    document.getElementById('json-name').value = '';
    document.getElementById('fields-container').innerHTML = '';
    addFieldRow(); // Inisialisasi minimal 1 baris kolom
    switchView('view-define');
});

function addFieldRow() {
    const container = document.getElementById('fields-container');
    const row = document.createElement('div');
    row.className = 'field-row';
    row.innerHTML = `
        <input type="text" class="field-input" placeholder="Nama Data (cth: ID, Nama, Status)">
        <button class="btn-danger btn-small" onclick="this.parentElement.remove()">Hapus</button>
    `;
    container.appendChild(row);
}

document.getElementById('btn-add-field').addEventListener('click', addFieldRow);

document.getElementById('btn-next').addEventListener('click', () => {
    const name = document.getElementById('json-name').value.trim();
    if (!name) return alert('Nama file JSON tidak boleh kosong!');

    const fieldInputs = document.querySelectorAll('.field-input');
    const keys = [];
    fieldInputs.forEach(input => {
        if (input.value.trim()) keys.push(input.value.trim());
    });

    if (keys.length === 0) return alert('Minimal harus ada 1 nama data!');

    // Inisialisasi struktur object JSON di memori
    if (!appData[name]) {
        appData[name] = { keys: keys, data: [] };
    } else {
        // Pembaruan struktur key jika nama JSON sudah eksis
        appData[name].keys = keys; 
    }
    
    saveToDb();
    currentActiveJson = name;
    loadDataView();
});

// --- SKENARIO 2b & 3: INPUT DATA & UPDATE TABEL ---
function loadDataView() {
    const project = appData[currentActiveJson];
    document.getElementById('data-title').innerText = `Proyek: ${currentActiveJson}.json`;
    
    // Pembuatan Form Input Dinamis
    const formContainer = document.getElementById('data-form-container');
    formContainer.innerHTML = '';
    project.keys.forEach(key => {
        formContainer.innerHTML += `
            <div class="form-group">
                <label>${key}</label>
                <input type="text" id="input-${key}" required>
            </div>
        `;
    });
    formContainer.innerHTML += `<button class="btn-primary" onclick="submitData()">Simpan Data</button>`;

    renderTable();
    switchView('view-data');
}

function submitData() {
    const project = appData[currentActiveJson];
    const newEntry = {};
    
    // Pemetaan input berdasarkan array keys
    project.keys.forEach(key => {
        const val = document.getElementById(`input-${key}`).value;
        newEntry[key] = val;
    });

    // Penyisipan entri ke array data dan penyimpanan lokal
    project.data.push(newEntry);
    saveToDb();
    
    // Reset nilai form input
    project.keys.forEach(key => document.getElementById(`input-${key}`).value = '');
    
    renderTable();
}

function renderTable() {
    const project = appData[currentActiveJson];
    
    // Pembaruan indikator jumlah data secara real-time
    document.getElementById('data-count').innerText = `Total Data: ${project.data.length} baris`;
    
    // Rendering Header Tabel
    const thead = document.getElementById('data-thead');
    thead.innerHTML = '<tr>' + project.keys.map(k => `<th>${k}</th>`).join('') + '<th>Aksi</th></tr>';
    
    // Rendering Body Tabel
    const tbody = document.getElementById('data-tbody');
    tbody.innerHTML = '';
    project.data.forEach((row, index) => {
        let tr = document.createElement('tr');
        let tds = project.keys.map(k => `<td>${row[k]}</td>`).join('');
        tds += `<td><button class="btn-danger btn-small" onclick="deleteData(${index})">Hapus</button></td>`;
        tr.innerHTML = tds;
        tbody.appendChild(tr);
    });
}

function deleteData(index) {
    appData[currentActiveJson].data.splice(index, 1);
    saveToDb();
    renderTable();
}

// --- SKENARIO 3: BUKA JSON YANG ADA ---
btnExisting.addEventListener('click', () => {
    const list = document.getElementById('json-list');
    list.innerHTML = '';
    
    const projects = Object.keys(appData);
    if (projects.length === 0) {
        list.innerHTML = '<li>Belum ada data JSON yang dibuat.</li>';
    } else {
        projects.forEach(proj => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span><strong>${proj}</strong> (${appData[proj].data.length} baris data)</span>
                <div>
                    <button class="btn-primary btn-small" onclick="openExisting('${proj}')">Buka</button>
                    <button class="btn-danger btn-small" onclick="deleteProject('${proj}')">Hapus</button>
                </div>
            `;
            list.appendChild(li);
        });
    }
    switchView('view-list');
});

window.openExisting = function(name) {
    currentActiveJson = name;
    loadDataView();
}

window.deleteProject = function(name) {
    if(confirm(`Konfirmasi penghapusan permanen dari memori browser untuk file: ${name}?`)) {
        delete appData[name];
        saveToDb();
        btnExisting.click(); // Refresh list otomatis
    }
}

// --- UTILITAS: PENYIMPANAN & PENGUNDUHAN FILE ---
function saveToDb() {
    localStorage.setItem(DB_KEY, JSON.stringify(appData));
}

document.getElementById('btn-download').addEventListener('click', () => {
    const project = appData[currentActiveJson];
    // Konversi object ke JSON string dengan identasi 2 spasi
    const jsonString = JSON.stringify(project.data, null, 2); 
    
    // Pembuatan File Virtual menggunakan Blob
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // Injeksi anchor element untuk memicu unduhan
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentActiveJson}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

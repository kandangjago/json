// Konfigurasi Database Lokal Browser
const DB_KEY = 'json_generator_db';
let appData = JSON.parse(localStorage.getItem(DB_KEY)) || {};
let currentActiveJson = null;

// Mengambil Elemen DOM
const views = document.querySelectorAll('.view');
const btnNew = document.getElementById('btn-new');
const btnExisting = document.getElementById('btn-existing');
const btnUpload = document.getElementById('btn-upload');
const fileUpload = document.getElementById('file-upload');
const btnBacks = document.querySelectorAll('.btn-back');

// Fungsi Utilitas: Perpindahan Tampilan Antarmuka
function switchView(viewId) {
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

btnBacks.forEach(btn => btn.addEventListener('click', () => switchView('view-menu')));

// --- SKENARIO 1c: UPLOAD JSON DARI PERANGKAT LOKAL ---
btnUpload.addEventListener('click', () => {
    fileUpload.click(); // Memicu input file tersembunyi
});

fileUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = JSON.parse(e.target.result);
            
            // Validasi: Pastikan struktur utamanya adalah Array
            if (!Array.isArray(content)) {
                alert("Format JSON tidak valid untuk aplikasi ini. Harus berupa Array berisi objek data.");
                return;
            }

            // Ekstrak semua nama kolom (keys) secara dinamis
            let keysSet = new Set();
            content.forEach(row => {
                if (typeof row === 'object' && row !== null) {
                    Object.keys(row).forEach(k => keysSet.add(k));
                }
            });
            const keys = Array.from(keysSet);

            if (keys.length === 0) {
                alert("File JSON kosong atau tidak memiliki format kolom yang tepat.");
                return;
            }

            // Ambil nama file asli (tanpa ekstensi .json) untuk dijadikan nama proyek
            let rawName = file.name.replace(/\.json$/i, '');
            let projectName = rawName;
            
            // Jika nama sudah ada di memori, tambahkan angka berurut di belakangnya
            let counter = 1;
            while(appData[projectName]) {
                projectName = `${rawName}_${counter}`;
                counter++;
            }

            // Simpan file hasil upload ke dalam memori aplikasi
            appData[projectName] = { keys: keys, data: content };
            saveToDb();

            alert(`Berhasil membaca file! Data diimpor sebagai proyek: ${projectName}`);
            
            // Langsung buka halaman Edit Data
            currentActiveJson = projectName;
            loadDataView();

        } catch (err) {
            alert("Gagal membaca file JSON. Pastikan format file tidak rusak.");
            console.error(err);
        } finally {
            // Reset input file agar pengguna bisa mengunggah file yang sama lagi jika perlu
            event.target.value = '';
        }
    };
    reader.readAsText(file); // Mulai proses pembacaan file
});

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
        appData[name].keys = keys; 
    }
    
    saveToDb();
    currentActiveJson = name;
    loadDataView();
});

// --- SKENARIO 2b, 3, & UPLOAD: INPUT DATA & UPDATE TABEL ---
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
    formContainer.innerHTML += `<button class="btn-primary" onclick="submitData()">Simpan Data Tambahan</button>`;

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
        // Gunakan (row[k] || '') untuk menghindari error undefined jika ada kolom yang kosong di data lama
        let tds = project.keys.map(k => `<td>${row[k] || ''}</td>`).join('');
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
        list.innerHTML = '<li>Belum ada data JSON yang tersimpan di browser ini.</li>';
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
    if(confirm(`Konfirmasi penghapusan permanen dari memori browser untuk proyek: ${name}?`)) {
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

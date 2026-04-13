let db = JSON.parse(localStorage.getItem('agenda_usach_v12')) || { clases: [], recordatorios: [], notas: [] };
let editandoId = null;
let vistaActual = 'dia';

// --- FONDO DIBUJO ---
const canF = document.getElementById('pizarra-fondo');
const ctxF = canF.getContext('2d');
function res() { canF.width = window.innerWidth; canF.height = window.innerHeight; }
window.addEventListener('resize', res); res();

let dibF = false;
const getP = (e) => ({ x: e.clientX || e.touches?.[0].clientX, y: e.clientY || e.touches?.[0].clientY });
const startF = (e) => { if(e.target.id === 'pizarra-fondo') { dibF = true; ctxF.beginPath(); const p = getP(e); ctxF.moveTo(p.x, p.y); }};
const moveF = (e) => { if(!dibF) return; const p = getP(e); ctxF.lineWidth = document.getElementById('grosor-pincel').value; ctxF.strokeStyle = document.getElementById('color-pincel').value; ctxF.lineCap = 'round'; ctxF.lineTo(p.x, p.y); ctxF.stroke(); };

window.addEventListener('mousedown', startF); window.addEventListener('mousemove', moveF);
window.addEventListener('mouseup', () => dibF = false);
window.addEventListener('touchstart', startF, {passive:false});
window.addEventListener('touchmove', (e) => { if(dibF) { moveF(e); e.preventDefault(); }}, {passive:false});
document.getElementById('btn-limpiar-fondo').onclick = () => ctxF.clearRect(0,0,canF.width, canF.height);

// --- TOASTS ---
function showToast(txt, tipo = 'success') {
    const cont = document.getElementById('toast-container');
    const t = document.createElement('div'); t.className = `toast ${tipo}`; t.innerText = txt;
    cont.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2500);
}

// --- PIZARRA NOTAS ---
const canN = document.getElementById('pizarra-notas');
const ctxN = canN.getContext('2d');
canN.width = canN.offsetWidth; canN.height = 180;
let dibN = false;
canN.onmousedown = (e) => { dibN = true; ctxN.beginPath(); ctxN.moveTo(e.offsetX, e.offsetY); };
canN.onmousemove = (e) => { if(!dibN) return; ctxN.strokeStyle = document.getElementById('color-pincel').value; ctxN.lineWidth = 2; ctxN.lineTo(e.offsetX, e.offsetY); ctxN.stroke(); };
window.addEventListener('mouseup', () => dibN = false);

document.getElementById('btn-pizarra-texto').onclick = () => {
    const t = prompt("Escribe tu nota:"); if(t) { ctxN.font = "18px Quicksand"; ctxN.fillStyle = "#455a64"; ctxN.fillText(t, 10, 50); }
};
document.getElementById('btn-pizarra-borrar').onclick = () => ctxN.clearRect(0,0,canN.width, canN.height);
document.getElementById('btn-pizarra-guardar').onclick = () => {
    db.notas.push(canN.toDataURL()); save(); renderNotas(); showToast("Nota guardada 💾");
};

// --- AGENDA LOGICA ---
const tSel = document.getElementById('item-tipo-registro');
tSel.onchange = () => {
    const isC = tSel.value === 'clase';
    document.getElementById('campos-clase').style.display = isC ? 'grid' : 'none';
    document.getElementById('campos-recordatorio').style.display = isC ? 'none' : 'grid';
};

document.getElementById('btn-guardar').onclick = () => {
    const nom = document.getElementById('nombre-item').value;
    if(!nom) return showToast("Escribe un nombre", "alert");

    const item = {
        id: editandoId || Date.now(),
        nombre: nom, tipo: tSel.value,
        sala: document.getElementById('sala-item').value || 'Sin sala',
        dia: document.getElementById('dia-semana').value,
        hora: tSel.value === 'clase' ? document.getElementById('hora-item').value : document.getElementById('hora-item-rec').value,
        fecha: document.getElementById('fecha-item').value
    };

    if(editandoId) {
        db.clases = db.clases.filter(i => i.id !== editandoId);
        db.recordatorios = db.recordatorios.filter(i => i.id !== editandoId);
        showToast("¡Actualizado!");
    } else {
        showToast("¡Guardado! 🌸");
    }

    if(item.tipo === 'clase') db.clases.push(item); else db.recordatorios.push(item);
    save(); cancelarEdicion(); renderizar();
};

window.editar = (id, tipo) => {
    const item = (tipo === 'clase' ? db.clases : db.recordatorios).find(i => i.id == id);
    if(!item) return;
    editandoId = id;
    document.getElementById('nombre-item').value = item.nombre;
    document.getElementById('sala-item').value = item.sala;
    tSel.value = item.tipo; tSel.dispatchEvent(new Event('change'));
    if(item.tipo === 'clase') {
        document.getElementById('hora-item').value = item.hora;
        document.getElementById('dia-semana').value = item.dia;
    } else {
        document.getElementById('hora-item-rec').value = item.hora;
        document.getElementById('fecha-item').value = item.fecha;
    }
    document.getElementById('form-title').innerText = "✏️ Editando...";
    document.getElementById('btn-cancelar').style.display = 'block';
    window.scrollTo({top: 0, behavior: 'smooth'});
};

document.getElementById('btn-cancelar').onclick = () => { cancelarEdicion(); showToast("Cancelado", "alert"); };

function cancelarEdicion() {
    editandoId = null;
    document.getElementById('nombre-item').value = ""; document.getElementById('sala-item').value = "";
    document.getElementById('hora-item').value = ""; document.getElementById('hora-item-rec').value = "";
    document.getElementById('fecha-item').value = ""; document.getElementById('form-title').innerText = "🌸 Registrar Actividad";
    document.getElementById('btn-cancelar').style.display = 'none';
}

window.eliminar = (id, tipo) => {
    if(confirm("¿Borrar?")) {
        if(tipo === 'clase') db.clases = db.clases.filter(i => i.id != id);
        else db.recordatorios = db.recordatorios.filter(i => i.id != id);
        save(); renderizar(); showToast("Eliminado 🗑️");
    }
};

function save() { localStorage.setItem('agenda_usach_v12', JSON.stringify(db)); }
window.cambiarVista = (v) => { vistaActual = v; renderizar(); };

function renderizar() {
    const listC = document.getElementById('lista-clases');
    const hoy = new Date().getDay(); // 0=domingo, 1=lunes...
    const nDia = (n) => ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][n];

    let clases = vistaActual === 'dia' ? db.clases.filter(c => c.dia == hoy) : db.clases;
    listC.innerHTML = clases.sort((a,b)=>a.hora.localeCompare(b.hora)).map(c => `
        <div class="item-list">
            <div><strong>${c.hora}</strong> - ${c.nombre} <br><small>${vistaActual==='semana' ? nDia(c.dia)+' | ' : ''}📍 ${c.sala}</small></div>
            <div class="actions-btns"><button onclick="editar(${c.id},'clase')">✏️</button><button onclick="eliminar(${c.id},'clase')">🗑️</button></div>
        </div>
    `).join('') || "<p style='opacity:0.5'>Nada para hoy</p>";

    document.getElementById('lista-recordatorios').innerHTML = db.recordatorios.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(r => `
        <div class="item-list" style="border-left-color: #bbdefb">
            <div><strong>${r.fecha}</strong> (${r.hora})<br>${r.nombre}</div>
            <div class="actions-btns"><button onclick="editar(${r.id},'rec')">✏️</button><button onclick="eliminar(${r.id},'rec')">🗑️</button></div>
        </div>
    `).join('') || "<p style='opacity:0.5'>Sin eventos</p>";
}

function renderNotas() { document.getElementById('notas-guardadas-container').innerHTML = db.notas.map(n => `<img src="${n}" class="img-nota-guardada">`).join(''); }

document.getElementById('btn-permiso').onclick = () => Notification.requestPermission();
renderizar(); renderNotas();
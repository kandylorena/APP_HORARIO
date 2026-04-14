// --- BASE DE DATOS Y ESTADO ---
let db = JSON.parse(localStorage.getItem('agenda_usach_v_final_total')) || { 
    clases: [], 
    recordatorios: [], 
    notas: [], 
    dibujoFondo: null 
};
let editandoId = null;
let vistaActual = 'dia';
let ultimaAlarmaEjecutada = ""; 

// --- FUNCIONES DE APOYO (MENSAJES Y GUARDADO) ---
function save() { 
    localStorage.setItem('agenda_usach_v_final_total', JSON.stringify(db)); 
}

function showToast(txt, tipo = 'success') {
    const cont = document.getElementById('toast-container');
    const t = document.createElement('div'); 
    t.className = 'toast'; 
    if(tipo === 'error') t.style.borderLeftColor = '#ff8a80';
    t.innerText = txt;
    cont.appendChild(t);
    setTimeout(() => { 
        t.style.opacity = '0'; 
        setTimeout(() => t.remove(), 300); 
    }, 2500);
}

// --- PIZARRA DE FONDO (CON SOPORTE MÓVIL Y PERSISTENCIA) ---
const canF = document.getElementById('pizarra-fondo');
const ctxF = canF.getContext('2d');

function resF() {
    canF.width = window.innerWidth; 
    canF.height = window.innerHeight;
    if(db.dibujoFondo) {
        let img = new Image(); 
        img.onload = () => ctxF.drawImage(img, 0, 0); 
        img.src = db.dibujoFondo;
    }
}
resF(); 
window.addEventListener('resize', resF);

let dibF = false;
const getP = (e) => ({ 
    x: e.clientX || (e.touches && e.touches[0].clientX), 
    y: e.clientY || (e.touches && e.touches[0].clientY) 
});

const startF = (e) => { 
    if(e.target.id === 'pizarra-fondo') { 
        dibF = true; ctxF.beginPath(); 
        const p = getP(e); ctxF.moveTo(p.x, p.y); 
    }
};
const moveF = (e) => {
    if(!dibF) return;
    const p = getP(e);
    ctxF.lineWidth = document.getElementById('grosor-pincel').value;
    ctxF.strokeStyle = document.getElementById('color-pincel').value;
    ctxF.lineCap = 'round'; ctxF.lineTo(p.x, p.y); ctxF.stroke();
};
const endF = () => { 
    if(dibF) { 
        dibF = false; 
        db.dibujoFondo = canF.toDataURL(); 
        save(); 
    }
};

canF.addEventListener('mousedown', startF); 
window.addEventListener('mousemove', moveF); 
window.addEventListener('mouseup', endF);
canF.addEventListener('touchstart', startF); 
canF.addEventListener('touchmove', (e) => { if(dibF) { moveF(e); e.preventDefault(); } }); 
canF.addEventListener('touchend', endF);

document.getElementById('btn-limpiar-fondo').onclick = () => {
    if(confirm("¿Borrar todo el dibujo del fondo?")) {
        ctxF.clearRect(0,0,canF.width, canF.height);
        db.dibujoFondo = null; save(); showToast("Fondo limpio 🗑️");
    }
};

// --- PIZARRA DE NOTAS PEQUEÑA (MÓVIL FIX) ---
const canN = document.getElementById('pizarra-notas');
const ctxN = canN.getContext('2d');
canN.width = canN.offsetWidth; canN.height = 200;

let dibN = false;
const getPN = (e) => {
    let rect = canN.getBoundingClientRect();
    let x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    let y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    return { x, y };
};

const startN = (e) => { dibN = true; ctxN.beginPath(); const p = getPN(e); ctxN.moveTo(p.x, p.y); };
const moveN = (e) => { 
    if(!dibN) return; 
    const p = getPN(e); 
    ctxN.strokeStyle = document.getElementById('color-pincel').value; 
    ctxN.lineWidth = 3; ctxN.lineCap = 'round';
    ctxN.lineTo(p.x, p.y); ctxN.stroke(); 
};

canN.addEventListener('mousedown', startN); 
canN.addEventListener('mousemove', moveN); 
window.addEventListener('mouseup', () => dibN = false);
canN.addEventListener('touchstart', startN); 
canN.addEventListener('touchmove', (e) => { moveN(e); e.preventDefault(); });

document.getElementById('btn-pizarra-texto').onclick = () => {
    const t = prompt("Escribe:"); 
    if(t) { ctxN.font="bold 20px Quicksand"; ctxN.fillStyle="#455a64"; ctxN.fillText(t, 20, 50); }
};
document.getElementById('btn-pizarra-borrar').onclick = () => ctxN.clearRect(0,0,canN.width, canN.height);
document.getElementById('btn-pizarra-guardar').onclick = () => { 
    db.notas.push(canN.toDataURL()); save(); renderNotas(); showToast("Nota guardada 💾"); 
};

// --- AGENDA USACH ---
const tSel = document.getElementById('item-tipo-registro');
tSel.onchange = () => {
    const isC = tSel.value === 'clase';
    document.getElementById('campos-clase').style.display = isC ? 'grid' : 'none';
    document.getElementById('campos-recordatorio').style.display = isC ? 'none' : 'grid';
};

document.getElementById('btn-guardar').onclick = () => {
    const nom = document.getElementById('nombre-item').value;
    if(!nom) return showToast("Escribe un nombre 🌸", "error");

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
        showToast("Registro actualizado ✨");
    } else {
        showToast("¡Guardado con éxito! 🌸");
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

document.getElementById('btn-cancelar').onclick = () => { cancelarEdicion(); showToast("Edición cancelada", "error"); };

function cancelarEdicion() {
    editandoId = null;
    document.getElementById('nombre-item').value = "";
    document.getElementById('sala-item').value = "";
    document.getElementById('btn-cancelar').style.display = 'none';
    document.getElementById('form-title').innerText = "🌸 Nueva Actividad";
}

window.eliminar = (id, tipo) => {
    if(confirm("¿Eliminar registro?")) {
        if(tipo === 'clase') db.clases = db.clases.filter(i => i.id != id);
        else db.recordatorios = db.recordatorios.filter(i => i.id != id);
        save(); renderizar(); showToast("Eliminado 🗑️");
    }
};

window.cambiarVista = (v) => {
    vistaActual = v;
    document.getElementById('btn-dia').classList.toggle('active', v === 'dia');
    document.getElementById('btn-semana').classList.toggle('active', v === 'semana');
    renderizar();
};

function renderizar() {
    const listC = document.getElementById('lista-clases');
    const hoy = new Date().getDay(); 
    const nDia = (n) => ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][n];

    let clases = vistaActual === 'dia' ? db.clases.filter(c => c.dia == hoy) : db.clases;
    listC.innerHTML = clases.sort((a,b)=>a.hora.localeCompare(b.hora)).map(c => `
        <div class="item-list">
            <div><strong>${c.hora}</strong> - ${c.nombre} <br><small>📍 ${c.sala} ${vistaActual==='semana'?' | '+nDia(c.dia):''}</small></div>
            <div class="actions-btns">
                <button onclick="editar(${c.id},'clase')">✏️</button>
                <button onclick="eliminar(${c.id},'clase')">🗑️</button>
            </div>
        </div>
    `).join('') || "<p style='opacity:0.5'>Nada hoy</p>";

    document.getElementById('lista-recordatorios').innerHTML = db.recordatorios.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(r => `
        <div class="item-list" style="border-left-color: #bbdefb">
            <div><strong>${r.fecha}</strong> (${r.hora})<br>${r.nombre}</div>
            <div class="actions-btns">
                <button onclick="editar(${r.id},'rec')">✏️</button>
                <button onclick="eliminar(${r.id},'rec')">🗑️</button>
            </div>
        </div>
    `).join('') || "<p style='opacity:0.5'>Sin pendientes</p>";
}

function renderNotas() { 
    document.getElementById('notas-guardadas-container').innerHTML = db.notas.map(n => `<img src="${n}" class="img-nota-guardada">`).join(''); 
}

// --- ALARMAS REFORZADAS ---
setInterval(() => {
    const ahora = new Date();
    const hActual = ahora.getHours().toString().padStart(2, '0') + ":" + ahora.getMinutes().toString().padStart(2, '0');
    const fActual = ahora.toISOString().split('T')[0];

    if (ultimaAlarmaEjecutada === hActual) return;

    db.recordatorios.forEach(r => {
        if (r.fecha === fActual && r.hora === hActual) {
            ejecutarAlarma(r.nombre);
            ultimaAlarmaEjecutada = hActual;
        }
    });
}, 1000);

function ejecutarAlarma(titulo) {
    if (Notification.permission === "granted") {
        new Notification("📌 USACH: Pendiente", { body: titulo });
    }
    showToast("⏰ ¡ALARMA!: " + titulo, "error");
    alert("⏰ RECORDATORIO: " + titulo);
}

document.getElementById('btn-permiso').onclick = () => {
    Notification.requestPermission().then(perm => {
        if (perm === "granted") showToast("🔔 Notificaciones activadas");
        else showToast("⚠️ Permiso denegado", "error");
    });
};

renderizar(); renderNotas();
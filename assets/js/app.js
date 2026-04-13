// BASE DE DATOS Y ESTADO
let db = JSON.parse(localStorage.getItem('agenda_usach_v4')) || { clases: [], recordatorios: [] };
let editandoId = null;
let vistaActual = 'dia';
let ultimaAlarmaID = "";

// SONIDO
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function sonarAlerta() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.value = 440; osc.start(); osc.stop(audioCtx.currentTime + 1);
}

// UI SELECTORES
const tipoSel = document.getElementById('item-tipo-registro');
const blockClase = document.getElementById('campos-clase');
const blockRec = document.getElementById('campos-recordatorio');

tipoSel.addEventListener('change', () => {
    blockClase.style.display = tipoSel.value === 'clase' ? 'block' : 'none';
    blockRec.style.display = tipoSel.value === 'recordatorio' ? 'block' : 'none';
});

// GUARDAR / EDITAR
document.getElementById('btn-guardar').onclick = () => {
    const nombre = document.getElementById('nombre-item').value;
    const hora = document.getElementById('hora-item').value;
    if (!nombre || !hora) return alert("Falta Materia o Hora");

    const item = {
        id: editandoId || Date.now(),
        nombre, hora, tipo: tipoSel.value,
        sala: document.getElementById('sala-item').value || "S/S",
        dia: document.getElementById('dia-semana').value,
        fecha: document.getElementById('fecha-item').value
    };

    if (editandoId) {
        db.clases = db.clases.filter(i => i.id !== editandoId);
        db.recordatorios = db.recordatorios.filter(i => i.id !== editandoId);
    }

    if (item.tipo === 'clase') db.clases.push(item);
    else db.recordatorios.push(item);

    localStorage.setItem('agenda_usach_v4', JSON.stringify(db));
    window.cancelarEdicion();
    renderizar();
};

window.editar = (id, tipo) => {
    const lista = tipo === 'clase' ? db.clases : db.recordatorios;
    const item = lista.find(i => i.id == id);
    if(!item) return;

    editandoId = id;
    document.getElementById('nombre-item').value = item.nombre;
    document.getElementById('hora-item').value = item.hora;
    document.getElementById('sala-item').value = item.sala;
    document.getElementById('item-tipo-registro').value = item.tipo;
    document.getElementById('dia-semana').value = item.dia || "1";
    document.getElementById('fecha-item').value = item.fecha || "";
    
    tipoSel.dispatchEvent(new Event('change'));
    document.getElementById('form-title').innerText = "✏️ Editando...";
    document.getElementById('btn-cancelar').style.display = 'block';
    window.scrollTo(0,0);
};

window.cancelarEdicion = () => {
    editandoId = null;
    document.getElementById('nombre-item').value = "";
    document.getElementById('form-title').innerText = "➕ Nuevo Registro";
    document.getElementById('btn-cancelar').style.display = 'none';
};
document.getElementById('btn-cancelar').onclick = window.cancelarEdicion;

window.eliminar = (id, tipo) => {
    if(!confirm("¿Borrar?")) return;
    if (tipo === 'clase') db.clases = db.clases.filter(i => i.id != id);
    else db.recordatorios = db.recordatorios.filter(i => i.id != id);
    localStorage.setItem('agenda_usach_v4', JSON.stringify(db));
    renderizar();
};

// VISTAS Y RENDER
window.cambiarVista = (v) => {
    vistaActual = v;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-'+v).classList.add('active');
    renderizar();
};

function renderizar() {
    const cont = document.getElementById('lista-clases');
    const hoy = new Date().getDay() || 7;
    const nDia = (n) => ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][n];

    let html = "";
    if (vistaActual === 'dia') {
        const items = db.clases.filter(c => c.dia == hoy);
        html = `<div class="dia-header">Hoy</div>` + genRows(items);
    } else if (vistaActual === 'semana') {
        for(let i=1; i<=6; i++){
            const d = db.clases.filter(c => c.dia == i);
            if(d.length) html += `<div class="dia-header">${nDia(i)}</div>` + genRows(d);
        }
    } else {
        html = `<div class="dia-header">Semestre</div>` + genRows(db.clases.sort((a,b)=>a.dia-b.dia), true);
    }
    cont.innerHTML = html || "<p style='padding:10px'>Vacío</p>";

    document.getElementById('lista-recordatorios').innerHTML = db.recordatorios.map(r => `
        <div class="item-list alert-item">
            <div><strong>${r.fecha}</strong> - ${r.nombre}</div>
            <div class="actions">
                <button onclick="editar(${r.id}, 'recordatorio')">✏️</button>
                <button onclick="eliminar(${r.id}, 'recordatorio')">🗑️</button>
            </div>
        </div>`).join('');
}

function genRows(l, verD) {
    const nDia = (n) => ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][n];
    return l.map(c => `
        <div class="item-list">
            <div><strong>${c.hora}</strong>: ${c.nombre} ${verD ? `<br><small>${nDia(c.dia)}</small>` : ''}</div>
            <div class="actions">
                <button onclick="editar(${c.id}, 'clase')">✏️</button>
                <button onclick="eliminar(${c.id}, 'clase')">🗑️</button>
            </div>
        </div>`).join('');
}

// --- PIZARRA REINSTALADA ---
const canvas = document.getElementById('pizarra');
const ctx = canvas.getContext('2d');
let dibujando = false;

const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - r.left;
    const y = (e.clientY || e.touches[0].clientY) - r.top;
    return { x: x * (canvas.width/r.width), y: y * (canvas.height/r.height) };
};

const start = (e) => { dibujando = true; ctx.beginPath(); move(e); };
const move = (e) => {
    if(!dibujando) return;
    const p = pos(e);
    ctx.lineWidth = document.getElementById('brush-size').value;
    ctx.strokeStyle = document.getElementById('color-picker').value;
    ctx.lineCap = 'round'; ctx.lineTo(p.x, p.y); ctx.stroke();
};

canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move);
window.addEventListener('mouseup', () => dibujando = false);
canvas.addEventListener('touchstart', start); canvas.addEventListener('touchmove', (e) => { move(e); e.preventDefault(); });

document.getElementById('btn-limpiar').onclick = () => ctx.clearRect(0,0,500,300);
document.getElementById('btn-descargar').onclick = () => {
    const l = document.createElement('a'); l.download = 'nota_usach.png'; l.href = canvas.toDataURL(); l.click();
};

// ALERTAS
setInterval(() => {
    const ahora = new Date();
    const h = ahora.getHours().toString().padStart(2,'0') + ":" + ahora.getMinutes().toString().padStart(2,'0');
    const f = ahora.toISOString().split('T')[0];
    const id = f + h;
    if (ultimaAlarmaID === id) return;
    db.recordatorios.forEach(r => {
        if(r.fecha === f && r.hora === h) {
            ultimaAlarmaID = id;
            if (Notification.permission === "granted") new Notification("🔔 Alerta USACH: " + r.nombre);
            alert("⏰ HORA DE: " + r.nombre);
            try { sonarAlerta(); } catch(e){}
        }
    });
}, 30000);

document.getElementById('btn-permiso').onclick = () => {
    Notification.requestPermission();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    alert("Alertas y Audio activados.");
};

renderizar();
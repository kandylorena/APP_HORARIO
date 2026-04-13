// CONFIGURACIÓN DE BASE DE DATOS
let db = JSON.parse(localStorage.getItem('agenda_usach_v3')) || { clases: [], recordatorios: [] };
let editandoId = null;
let vistaActual = 'dia';
let ultimaAlarmaSuenada = "";

// AUDIO PARA ALARMAS
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function sonarAlerta() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 440;
    osc.start();
    osc.stop(audioCtx.currentTime + 1.5);
}

// SELECTORES
const tipoSel = document.getElementById('item-tipo-registro');
const blockClase = document.getElementById('campos-clase');
const blockRec = document.getElementById('campos-recordatorio');

// MOSTRAR/OCULTAR CAMPOS
tipoSel.addEventListener('change', () => {
    blockClase.style.display = tipoSel.value === 'clase' ? 'block' : 'none';
    blockRec.style.display = tipoSel.value === 'recordatorio' ? 'block' : 'none';
});

// FUNCIÓN GUARDAR / EDITAR
document.getElementById('btn-guardar').onclick = () => {
    const nombre = document.getElementById('nombre-item').value;
    const hora = document.getElementById('hora-item').value;

    if (!nombre || !hora) return alert("Completa Materia y Hora");

    const item = {
        id: editandoId || Date.now(),
        nombre, hora,
        tipo: tipoSel.value,
        sala: document.getElementById('sala-item').value || "S/S",
        dia: document.getElementById('dia-semana').value,
        fecha: document.getElementById('fecha-item').value
    };

    // Si es edición, quitamos el viejo antes de poner el nuevo
    if (editandoId) {
        db.clases = db.clases.filter(i => i.id !== editandoId);
        db.recordatorios = db.recordatorios.filter(i => i.id !== editandoId);
    }

    if (item.tipo === 'clase') db.clases.push(item);
    else db.recordatorios.push(item);

    localStorage.setItem('agenda_usach_v3', JSON.stringify(db));
    cancelarEdicion();
    renderizar();
};

// --- EL EDITAR AHORA ES GLOBAL PARA QUE FUNCIONE SIEMPRE ---
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
    if(!confirm("¿Borrar este registro?")) return;
    if (tipo === 'clase') db.clases = db.clases.filter(i => i.id != id);
    else db.recordatorios = db.recordatorios.filter(i => i.id != id);
    localStorage.setItem('agenda_usach_v3', JSON.stringify(db));
    renderizar();
};

// VISTAS
window.cambiarVista = (v) => {
    vistaActual = v;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-'+v).classList.add('active');
    renderizar();
};

// RENDERIZADO
function renderizar() {
    const contClases = document.getElementById('lista-clases');
    const hoyNum = new Date().getDay() || 7;
    const nDia = (n) => ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][n];

    let html = "";
    if (vistaActual === 'dia') {
        const items = db.clases.filter(c => c.dia == hoyNum);
        html = `<div class="dia-header">Hoy (${nDia(hoyNum)})</div>` + genRows(items);
    } else if (vistaActual === 'semana') {
        for(let i=1; i<=6; i++){
            const d = db.clases.filter(c => c.dia == i);
            if(d.length) html += `<div class="dia-header">${nDia(i)}</div>` + genRows(d);
        }
    } else {
        const todos = [...db.clases].sort((a,b) => a.dia - b.dia);
        html = `<div class="dia-header">Malla Completa</div>` + genRows(todos, true);
    }
    contClases.innerHTML = html || "<p style='padding:15px'>Sin clases registradas.</p>";

    // Render Recordatorios
    document.getElementById('lista-recordatorios').innerHTML = db.recordatorios
    .sort((a,b) => a.fecha.localeCompare(b.fecha))
    .map(r => `
        <div class="item-list alert-item">
            <div><strong>${r.fecha} [${r.hora}]</strong><br>${r.nombre}</div>
            <div class="actions">
                <button onclick="editar(${r.id}, 'recordatorio')">✏️</button>
                <button onclick="eliminar(${r.id}, 'recordatorio')">🗑️</button>
            </div>
        </div>`).join('') || "<p style='padding:15px'>Sin eventos próximos.</p>";
}

function genRows(lista, verDia) {
    const nDia = (n) => ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][n];
    return lista.map(c => `
        <div class="item-list">
            <div><strong>${c.hora}</strong> - ${c.nombre} ${verDia ? `<br><small>${nDia(c.dia)}</small>` : ''}</div>
            <div class="actions">
                <button onclick="editar(${c.id}, 'clase')">✏️</button>
                <button onclick="eliminar(${c.id}, 'clase')">🗑️</button>
            </div>
        </div>`).join('');
}

// --- LÓGICA DE ALERTAS ---
setInterval(() => {
    const ahora = new Date();
    const horaActual = ahora.getHours().toString().padStart(2, '0') + ":" + ahora.getMinutes().toString().padStart(2, '0');
    const fechaActual = ahora.toISOString().split('T')[0];
    const checkID = `${fechaActual}-${horaActual}`;

    if (ultimaAlarmaSuenada === checkID) return;

    db.recordatorios.forEach(r => {
        if (r.fecha === fechaActual && r.hora === horaActual) {
            ultimaAlarmaSuenada = checkID;
            if (Notification.permission === "granted") {
                new Notification("🔔 USACH ALERTA", { body: `Es hora de: ${r.nombre}` });
            }
            alert(`⏰ ¡ALERTA! Es hora de: ${r.nombre}`);
            try { sonarAlerta(); } catch(e) {}
        }
    });
}, 30000);

// Activar audio y permisos
document.getElementById('btn-permiso').onclick = () => {
    Notification.requestPermission();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    alert("✅ Sistema de alertas activado.");
};

renderizar();
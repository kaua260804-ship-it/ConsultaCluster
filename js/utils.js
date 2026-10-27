// js/utils.js

function normalize(str) { 
    if (!str) return ''; 
    return String(str).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); 
}

function normalizeCode(code) { 
    if (!code) return ''; 
    const s = String(code).trim(); 
    return s.replace(/^0+/, '') || '0'; 
}

function displayStr(val) { 
    if (val === null || val === undefined) return '—'; 
    const s = String(val).trim(); 
    return s === '' ? '—' : s; 
}

function escapeHtml(str) { 
    if (!str) return ''; 
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); 
}

function trimObjKeys(obj) { 
    const newObj = {}; 
    for (const key in obj) { 
        if (obj.hasOwnProperty(key)) newObj[key.trim()] = obj[key]; 
    } 
    return newObj; 
}

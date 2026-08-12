// URL de ton Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbzbrwB8E3FvsmmdG1CFojlxIVSOdI2E5DCfmBSRcaKCsBx4uzZNaIWEaBtuG0P3FmRd/exec";

// Devise affichée — change selon ton pays
const CURRENCY = "€";

let TOKEN = localStorage.getItem("token") || null;
let currentClasse = null;
let currentStudents = [];
let editingStudentId = null;

// ===== HELPERS =====
function fmt(n) {
  return Number(n || 0).toLocaleString("fr-FR") + " " + CURRENCY;
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2500);
}

async function api(action, data = {}) {
  const payload = Object.assign({ action, token: TOKEN }, data);
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (json.success === false && json.error && json.error.includes("Session invalide")) {
    logout();
  }
  return json;
}

// ===== LOGIN / LOGOUT =====
document.getElementById("loginBtn").addEventListener("click", doLogin);
document.getElementById("passwordInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin();
});

async function doLogin() {
  const password = document.getElementById("passwordInput").value;
  const errEl = document.getElementById("loginError");
  errEl.textContent = "";
  if (!password) return;
  const result = await api("login", { password });
  if (result.success) {
    TOKEN = result.token;
    localStorage.setItem("token", TOKEN);
    enterDashboard();
  } else {
    errEl.textContent = result.error || "Erreur de connexion.";
  }
}

function logout() {
  TOKEN = null;
  localStorage.removeItem("token");
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("passwordInput").value = "";
}
document.getElementById("logoutBtn").addEventListener("click", logout);

function enterDashboard() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  loadSummary();
  loadClasses();
}

window.addEventListener("DOMContentLoaded", () => {
  if (TOKEN) enterDashboard();
});

// ===== RESUME =====
async function loadSummary() {
  const res = await api("getSummary");
  if (!res.success) return;
  document.getElementById("sumArgentActuel").textContent = fmt(res.totalArgentActuel);
  document.getElementById("sumReste").textContent = fmt(res.totalReste);
  document.getElementById("sumEleves").textContent = res.nombreEleves;
}

// ===== CLASSES =====
async function loadClasses() {
  const res = await api("getClasses");
  const grid = document.getElementById("classesGrid");
  grid.innerHTML = "";
  if (!res.success || res.classes.length === 0) {
    grid.innerHTML = `<p class="empty-msg">Aucun élève inscrit pour le moment.</p>`;
    return;
  }
  const datalist = document.getElementById("classesList");
  datalist.innerHTML = res.classes.map(c => `<option value="${c.classe}">`).join("");

  res.classes.forEach(c => {
    const card = document.createElement("div");
    card.className = "class-card";
    card.innerHTML = `
      <h3>${c.classe}</h3>
      <div class="row"><span>Élèves</span><b>${c.nombreEleves}</b></div>
      <div class="row"><span>Payé</span><b>${fmt(c.totalPaye)}</b></div>
      <div class="row"><span>Reste</span><b>${fmt(c.totalReste)}</b></div>
    `;
    card.addEventListener("click", () => openClass(c.classe));
    grid.appendChild(card);
  });
}

document.getElementById("backToClassesBtn").addEventListener("click", () => {
  document.getElementById("studentsView").classList.add("hidden");
  document.getElementById("classesView").classList.remove("hidden");
});

// ===== ELEVES D'UNE CLASSE =====
async function openClass(classe) {
  currentClasse = classe;
  document.getElementById("studentsClassTitle").textContent = classe;
  document.getElementById("classesView").classList.add("hidden");
  document.getElementById("studentsView").classList.remove("hidden");
  await loadStudents();
}

async function loadStudents() {
  const res = await api("getStudentsByClass", { classe: currentClasse });
  currentStudents = res.success ? res.eleves : [];
  renderStudents();
}

function renderStudents() {
  const tbody = document.getElementById("studentsTableBody");
  tbody.innerHTML = "";
  let totalDu = 0, totalPaye = 0, totalReste = 0;

  currentStudents.forEach(s => {
    totalDu += Number(s.MontantTotal || 0);
    totalPaye += Number(s.MontantPaye || 0);
    totalReste += Number(s.Reste || 0);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.Nom}</td>
      <td>${s.Prenom}</td>
      <td>${fmt(s.MontantTotal)}</td>
      <td>${fmt(s.MontantPaye)}</td>
      <td>${fmt(s.Reste)}</td>
      <td>✏️</td>
    `;
    tr.addEventListener("click", () => openEditModal(s));
    tbody.appendChild(tr);
  });

  document.getElementById("classTotalDu").textContent = fmt(totalDu);
  document.getElementById("classTotalPaye").textContent = fmt(totalPaye);
  document.getElementById("classTotalReste").textContent = fmt(totalReste);
}

// ===== MODAL AJOUT / EDITION =====
const modal = document.getElementById("studentModal");

function openAddModal(prefillClasse) {
  editingStudentId = null;
  document.getElementById("modalTitle").textContent = "Inscrire un élève";
  document.getElementById("deleteStudentBtn").classList.add("hidden");
  document.getElementById("studentId").value = "";
  document.getElementById("fNom").value = "";
  document.getElementById("fPrenom").value = "";
  document.getElementById("fClasse").value = prefillClasse || "";
  document.getElementById("fMontantTotal").value = "";
  document.getElementById("fMontantPaye").value = "";
  document.getElementById("fTelephone").value = "";
  document.getElementById("modalError").textContent = "";
  modal.classList.remove("hidden");
}

function openEditModal(s) {
  editingStudentId = s.ID;
  document.getElementById("modalTitle").textContent = "Modifier l'élève";
  document.getElementById("deleteStudentBtn").classList.remove("hidden");
  document.getElementById("studentId").value = s.ID;
  document.getElementById("fNom").value = s.Nom;
  document.getElementById("fPrenom").value = s.Prenom;
  document.getElementById("fClasse").value = s.Classe;
  document.getElementById("fMontantTotal").value = s.MontantTotal;
  document.getElementById("fMontantPaye").value = s.MontantPaye;
  document.getElementById("fTelephone").value = s.Telephone || "";
  document.getElementById("modalError").textContent = "";
  modal.classList.remove("hidden");
}

document.getElementById("addStudentGlobalBtn").addEventListener("click", () => openAddModal(""));
document.getElementById("addStudentClassBtn").addEventListener("click", () => openAddModal(currentClasse));
document.getElementById("cancelModalBtn").addEventListener("click", () => modal.classList.add("hidden"));

document.getElementById("saveStudentBtn").addEventListener("click", async () => {
  const errEl = document.getElementById("modalError");
  const nom = document.getElementById("fNom").value.trim();
  const prenom = document.getElementById("fPrenom").value.trim();
  const classe = document.getElementById("fClasse").value.trim();
  const montantTotal = document.getElementById("fMontantTotal").value;
  const montantPaye = document.getElementById("fMontantPaye").value;
  const telephone = document.getElementById("fTelephone").value.trim();

  if (!nom || !prenom || !classe) {
    errEl.textContent = "Nom, prénom et classe sont obligatoires.";
    return;
  }

  const payload = { nom, prenom, classe, montantTotal, montantPaye, telephone };
  let res;
  if (editingStudentId) {
    res = await api("updateStudent", Object.assign({ id: editingStudentId }, payload));
  } else {
    res = await api("addStudent", payload);
  }

  if (res.success) {
    modal.classList.add("hidden");
    showToast(editingStudentId ? "Élève modifié." : "Élève inscrit.");
    await loadSummary();
    await loadClasses();
    if (currentClasse) await loadStudents();
  } else {
    errEl.textContent = res.error || "Erreur lors de l'enregistrement.";
  }
});

document.getElementById("deleteStudentBtn").addEventListener("click", async () => {
  if (!confirm("Supprimer définitivement cet élève ?")) return;
  const res = await api("deleteStudent", { id: editingStudentId });
  if (res.success) {
    modal.classList.add("hidden");
    showToast("Élève supprimé.");
    await loadSummary();
    await loadClasses();
    if (currentClasse) await loadStudents();
  }
});

// ===== IMPRESSION PDF =====
document.getElementById("printPdfBtn").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(`Liste des élèves - ${currentClasse}`, 14, 16);
  doc.setFontSize(10);
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 14, 22);

  const rows = currentStudents.map(s => [
    s.Nom, s.Prenom, fmt(s.MontantTotal), fmt(s.MontantPaye), fmt(s.Reste)
  ]);

  let totalDu = 0, totalPaye = 0, totalReste = 0;
  currentStudents.forEach(s => {
    totalDu += Number(s.MontantTotal || 0);
    totalPaye += Number(s.MontantPaye || 0);
    totalReste += Number(s.Reste || 0);
  });
  rows.push(["TOTAL", "", fmt(totalDu), fmt(totalPaye), fmt(totalReste)]);

  doc.autoTable({
    startY: 28,
    head: [["Nom", "Prénom", "Total dû", "Payé", "Reste"]],
    body: rows,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [79, 70, 229] }
  });

  doc.save(`liste_${currentClasse}.pdf`);
});

/**
 * Roots of Deen — Main Frontend Script
 * Handles: data loading, track/lesson rendering, progress (localStorage),
 *          accordion, tabs, stats, and admin link.
 */
(function () {
  "use strict";

  /* ---------- DOM refs ---------- */
  const tabsEl    = document.getElementById("tabs");
  const titleEl   = document.getElementById("trackTitle");
  const descEl    = document.getElementById("trackDesc");
  const fillEl    = document.getElementById("trackFill");
  const countEl   = document.getElementById("trackCount");
  const listEl    = document.getElementById("lessonList");
  const statEls   = document.querySelectorAll(".stat b");
  const yearEl    = document.getElementById("year");
  const resetBtn  = document.getElementById("resetBtn");

  /* ---------- State ---------- */
  let tracks      = [];
  let activeIdx   = 0;
  const PROGRESS_KEY = "roots_progress";   // { "lessonId": true }

  /* ---------- Helpers ---------- */
  const getProgress = () => {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
    catch { return {}; }
  };
  const saveProgress = (p) => localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));

  const trackProgress = (track) => {
    const prog = getProgress();
    const total = track.lessons.length;
    const done  = track.lessons.filter(l => prog[l.id]).length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  };

  /* ---------- Load data ---------- */
  const loadData = async () => {
    // First check localStorage for admin-edited data
    const adminData = localStorage.getItem("roots_tracks_data");
    if (adminData) {
      try {
        tracks = JSON.parse(adminData).tracks || [];
        if (tracks.length) return;
      } catch { /* fall through */ }
    }
    // Fallback to JSON file
    try {
      const res = await fetch("../data/tracks.json");
      const json = await res.json();
      tracks = json.tracks || [];
    } catch (err) {
      console.error("Failed to load tracks:", err);
      tracks = [];
    }
  };

  /* ---------- Render ---------- */
  const renderTabs = () => {
    if (!tabsEl) return;
    tabsEl.innerHTML = tracks.map((t, i) =>
      `<button class="tab${i === activeIdx ? ' active' : ''}" data-idx="${i}">${t.name}</button>`
    ).join("");
  };

  const renderTrack = () => {
    const track = tracks[activeIdx];
    if (!track) return;
    if (titleEl) titleEl.textContent = track.name;
    if (descEl)  descEl.textContent  = track.desc;

    const prog   = trackProgress(track);
    if (fillEl)  fillEl.style.width  = prog.pct + "%";
    if (countEl) countEl.textContent = `${prog.done} / ${prog.total} lessons complete (${prog.pct}%)`;

    const progress = getProgress();
    if (listEl) {
      listEl.innerHTML = track.lessons.map((l, i) => {
        const done = !!progress[l.id];
        return `
          <div class="lesson${done ? ' done' : ''}" data-id="${l.id}">
            <button class="lesson-head" data-action="toggle">
              <span class="num">${i + 1}</span>
              <span class="lesson-title">${l.title}<small>${l.sub}</small></span>
              <span class="done-check">&#10003;</span>
              <span class="chev">&#9660;</span>
            </button>
            <div class="lesson-body">
              ${l.body || ''}
              ${l.verify && l.verify.length ? `
                <div class="verify">
                  <span>&#128279; Recheck karein:</span>
                  ${l.verify.map(v => `<a href="${v.url}" target="_blank" rel="noopener">${v.label}</a>`).join('')}
                </div>` : ''}
              <div class="lesson-actions" style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
                <button class="btn btn-sm btn-ghost mark-btn" data-id="${l.id}">
                  ${done ? '&#10003; Completed' : 'Mark as Done'}
                </button>
              </div>
            </div>
          </div>`;
      }).join("");
    }
  };

  const renderStats = () => {
    // Total lessons & completed lessons across all tracks
    let totalLessons = 0, totalDone = 0;
    const progress = getProgress();
    tracks.forEach(t => {
      totalLessons += t.lessons.length;
      t.lessons.forEach(l => { if (progress[l.id]) totalDone++; });
    });
    if (statEls && statEls.length >= 3) {
      statEls[0].textContent = tracks.length;
      statEls[1].textContent = totalLessons;
      statEls[2].textContent = totalLessons ? Math.round((totalDone / totalLessons) * 100) + "%" : "0%";
    }
  };

  const renderAll = () => {
    renderTabs();
    renderTrack();
    renderStats();
  };

  /* ---------- Events ---------- */
  if (tabsEl) {
    tabsEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      activeIdx = parseInt(btn.dataset.idx, 10);
      renderAll();
    });
  }

  if (listEl) {
    listEl.addEventListener("click", (e) => {
      // Toggle accordion
      const head = e.target.closest(".lesson-head");
      if (head && head.dataset.action === "toggle") {
        const lesson = head.closest(".lesson");
        lesson.classList.toggle("open");
        return;
      }

      // Mark as done / undo
      const markBtn = e.target.closest(".mark-btn");
      if (markBtn) {
        const lessonId = markBtn.dataset.id;
        const progress = getProgress();
        if (progress[lessonId]) {
          delete progress[lessonId];
        } else {
          progress[lessonId] = true;
        }
        saveProgress(progress);
        renderAll();
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Kya aap apni poori progress reset karna chahte hain? Ye wapas nahi ho sakta.")) {
        localStorage.removeItem(PROGRESS_KEY);
        renderAll();
      }
    });
  }

  /* ---------- Init ---------- */
  const init = async () => {
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    await loadData();
    if (tracks.length === 0) {
      if (listEl) listEl.innerHTML = "<p style='color:var(--muted);text-align:center;'>Koi lessons nahi mile. Admin panel se data add karein.</p>";
      return;
    }
    renderAll();
  };

  document.addEventListener("DOMContentLoaded", init);
})();

/**
 * Tidtaker → Xledger Chrome Extension
 *
 * Drag-and-drop eksport-JSON fra tidtaker over Xledger timeregistreringssiden
 * for automatisk utfylling av timelistene.
 */

(function () {
  'use strict';

  // Drop-zone: synlig 20% av bunnen av siden
  let dropOverlay = null;

  function createDropOverlay() {
    if (dropOverlay) return;
    dropOverlay = document.createElement('div');
    dropOverlay.id = 'tidtaker-drop-overlay';
    dropOverlay.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 20vh;
      background: rgba(59, 130, 246, 0.15);
      border-top: 3px dashed #3b82f6;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      transition: background 0.2s;
    `;
    dropOverlay.innerHTML = `
      <div style="text-align:center; color:#1d4ed8; font-size:18px; font-weight:600; pointer-events:none;">
        📂 Slipp tidtaker-eksport her for å importere til Xledger
      </div>
    `;
    document.body.appendChild(dropOverlay);
  }

  function createResultPanel() {
    const panel = document.createElement('div');
    panel.id = 'tidtaker-result-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      max-width: 420px;
      max-height: 60vh;
      overflow-y: auto;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      z-index: 99999;
      padding: 16px;
      font-family: sans-serif;
      font-size: 14px;
    `;
    document.body.appendChild(panel);
    return panel;
  }

  function showResult(panel, html) {
    panel.innerHTML = html;
  }

  // Drag events on the document to show/hide the drop overlay
  document.addEventListener('dragenter', (e) => {
    if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
      createDropOverlay();
      dropOverlay.style.pointerEvents = 'auto';
      dropOverlay.style.background = 'rgba(59, 130, 246, 0.25)';
    }
  });

  document.addEventListener('dragleave', (e) => {
    if (dropOverlay && e.clientY <= 0) {
      dropOverlay.style.pointerEvents = 'none';
      dropOverlay.style.background = 'rgba(59, 130, 246, 0.15)';
    }
  });

  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (dropOverlay) {
      dropOverlay.style.pointerEvents = 'auto';
    }
  });

  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (dropOverlay) {
      dropOverlay.style.pointerEvents = 'none';
      dropOverlay.style.background = 'rgba(59, 130, 246, 0.15)';
    }

    const file = e.dataTransfer && e.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.json')) {
      return;
    }

    // Only process drops in lower 20% of viewport
    if (e.clientY < window.innerHeight * 0.8) {
      return;
    }

    const panel = createResultPanel();
    showResult(panel, '<p>Leser fil...</p>');

    let rows;
    try {
      const text = await file.text();
      rows = JSON.parse(text);
    } catch (err) {
      showResult(panel, `<p style="color:red">❌ Ugyldig JSON-fil: ${err.message}</p>`);
      return;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      showResult(panel, '<p style="color:orange">⚠️ Ingen rader i eksporten.</p>');
      return;
    }

    // Validate rows
    const missingFields = rows.filter(r => !r.date || !r.prosjekt || !r.aktivitet);
    const errors = [];

    showResult(panel, `<p>Importerer ${rows.length} rad(er)...</p>`);

    let imported = 0;
    let totalTimer = 0;

    for (const row of rows) {
      try {
        await importRow(row);
        imported++;
        totalTimer += row.timer || 0;
      } catch (err) {
        errors.push(`${row.date} ${row.tekst}: ${err.message}`);
      }
    }

    // Save changes
    const saveBtn = document.querySelector('button[title*="Lagre"], button:contains("Lagre endringer")') ||
      [...document.querySelectorAll('button')].find(b => b.textContent.includes('Lagre endringer'));
    if (saveBtn) {
      saveBtn.click();
    }

    let resultHtml = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <strong>Tidtaker → Xledger</strong>
        <button onclick="this.closest('#tidtaker-result-panel').remove()" style="cursor:pointer;border:none;background:none;font-size:18px;">✕</button>
      </div>
      <p style="color:green">✅ ${imported} rad(er) lagt inn, ${totalTimer.toFixed(1)} timer totalt</p>
    `;

    if (missingFields.length > 0) {
      resultHtml += `<p style="color:orange">⚠️ ${missingFields.length} rad(er) mangler prosjekt/aktivitet-mapping</p>`;
    }

    if (errors.length > 0) {
      resultHtml += `<p style="color:red">❌ Feil på ${errors.length} rad(er):</p><ul>`;
      for (const err of errors) {
        resultHtml += `<li style="color:red;font-size:12px">${err}</li>`;
      }
      resultHtml += '</ul>';
    }

    showResult(panel, resultHtml);
  });

  async function importRow(row) {
    // Navigate to correct week via Date Picker
    await navigateToWeek(row.date);

    // Click "+" button to add new row
    const addBtn = await waitForElement('button[title="+"], button.add-row') ||
      [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '+');
    if (!addBtn) throw new Error('Fant ikke "+ Legg til"-knapp');
    addBtn.click();
    await sleep(500);

    // Fill in project (autocomplete)
    if (row.prosjekt) {
      const projectInput = await waitForElement('input[id^="rv_project"]');
      if (projectInput) {
        await fillAutocomplete(projectInput, row.prosjekt);
      }
    }

    // Fill in activity (autocomplete)
    if (row.aktivitet) {
      const activityInput = await waitForElement('input[id^="rv_activity"]');
      if (activityInput) {
        await fillAutocomplete(activityInput, row.aktivitet);
      }
    }

    // Fill in description
    const textInput = await waitForElement('input[id^="s_text"]:not([value])') ||
      [...document.querySelectorAll('input[id^="s_text"]')].find(i => !i.value);
    if (textInput && row.tekst) {
      textInput.focus();
      setNativeValue(textInput, row.tekst);
      textInput.dispatchEvent(new Event('input', { bubbles: true }));
      textInput.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(200);
    }

    // Fill in hours for the correct date
    const dateKey = row.date.replace(/-/g, '').substring(0, 8); // e.g. 20260601 → used as suffix
    const hoursInputId = `f_working_hours-:f_working_hours${row.date}`;
    const hoursInput = document.getElementById(hoursInputId) ||
      document.querySelector(`input[id$="${row.date}"]`);

    if (hoursInput) {
      hoursInput.focus();
      setNativeValue(hoursInput, String(row.timer));
      hoursInput.dispatchEvent(new Event('input', { bubbles: true }));
      hoursInput.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(200);
    } else {
      throw new Error(`Fant ikke timefelt for dato ${row.date}`);
    }
  }

  async function navigateToWeek(dateStr) {
    const targetDate = new Date(dateStr);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth(); // 0-indexed

    // Click Date Picker button
    const datePickerBtn = document.querySelector('button[title="Date Picker"]') ||
      [...document.querySelectorAll('button')].find(b => b.getAttribute('title') === 'Date Picker');

    if (!datePickerBtn) return; // fallback: assume we're already on the right week

    datePickerBtn.click();
    await sleep(400);

    // Navigate to correct month
    for (let i = 0; i < 24; i++) {
      const monthLabel = document.querySelector('.calendar-month, [class*="month-label"], [class*="calendarMonth"]');
      if (!monthLabel) break;

      const labelText = monthLabel.textContent || '';
      const currentDate = parseMonthLabel(labelText);
      if (!currentDate) break;

      if (currentDate.year === targetYear && currentDate.month === targetMonth) break;

      const isAfter = currentDate.year > targetYear ||
        (currentDate.year === targetYear && currentDate.month > targetMonth);

      const navBtn = isAfter
        ? document.querySelector('button[aria-label="previous month"]')
        : document.querySelector('button[aria-label="next month"]');

      if (!navBtn) break;
      navBtn.click();
      await sleep(300);
    }

    // Click on the correct day
    const dayNum = targetDate.getDate();
    const dayBtns = document.querySelectorAll('button[aria-label], td button, .calendar-day button');
    for (const btn of dayBtns) {
      if (btn.textContent.trim() === String(dayNum)) {
        btn.click();
        await sleep(500);
        break;
      }
    }
  }

  function parseMonthLabel(text) {
    const norwegianMonths = [
      'januar', 'februar', 'mars', 'april', 'mai', 'juni',
      'juli', 'august', 'september', 'oktober', 'november', 'desember'
    ];
    const lower = text.toLowerCase().trim();
    for (let i = 0; i < norwegianMonths.length; i++) {
      if (lower.includes(norwegianMonths[i])) {
        const yearMatch = lower.match(/\d{4}/);
        const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
        return { year, month: i };
      }
    }
    return null;
  }

  async function fillAutocomplete(input, value) {
    input.focus();
    setNativeValue(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await sleep(600);

    // Try to find dropdown listbox
    const listbox = document.querySelector('[role="listbox"]');
    if (listbox) {
      const firstOption = listbox.querySelector('[role="option"]');
      if (firstOption) {
        firstOption.click();
        await sleep(300);
        return;
      }
    }

    // Fallback: press Enter
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await sleep(200);
  }

  // Set value in a way that React/framework picks it up
  function setNativeValue(element, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    nativeInputValueSetter.call(element, value);
  }

  function waitForElement(selector, timeout = 3000) {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) { resolve(el); return; }

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    });
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();

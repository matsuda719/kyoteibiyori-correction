// ==UserScript==
// @name         Kyotei Tenji Miyoshi Correction
// @namespace    https://kyoteibiyori.com/
// @version      1.5.1
// @description  展示情報（展示・周回・周り足・直線）を艇番号別に補正し、補正後の順位で色分け表示。SUM理論（展示+周回）も表示。1位回数による展示補正対応。
// @author       matsuda719
// @match        *://kyoteibiyori.com/race_shusso.php*
// @grant        GM_getValue
// @grant        GM_setValue
// @license      MIT
// @downloadURL https://raw.githubusercontent.com/matsuda719/kyoteibiyori-correction/main/scripts/kyotei-tenji-miyoshi-correction.user.js
// @updateURL https://raw.githubusercontent.com/matsuda719/kyoteibiyori-correction/main/scripts/kyotei-tenji-miyoshi-correction.user.js
// ==/UserScript==

(function() {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get("slider") !== "4") return;

  // --- 設定の読み込み ---
  const DEFAULT_FIRST_PLACE_FACTOR = 0.1;
  let firstPlaceFactor = GM_getValue("firstPlaceFactor", DEFAULT_FIRST_PLACE_FACTOR);

  const correctionTable = {
    1: { 展示: 0.02, 周回: 0.40, 周り足: 0.20, 直線: 0.00 },
    2: { 展示: 0.01, 周回: 0.30, 周り足: 0.10, 直線: 0.00 },
    3: { 展示: 0.00, 周回: 0.20, 周り足: 0.00, 直線: 0.00 },
    4: { 展示: -0.01, 周回: 0.10, 周り足: -0.05, 直線: -0.01 },
    5: { 展示: -0.01, 周回: 0.05, 周り足: -0.10, 直線: -0.02 },
    6: { 展示: -0.02, 周回: 0.00, 周り足: -0.15, 直線: -0.02 }
  };

  // --- 設定パネルUI ---
  function createSettingsPanel() {
    const panel = document.createElement("div");
    panel.id = "tenji-settings-panel";
    panel.style.cssText = `
      position: fixed; top: 10px; right: 10px; z-index: 99999;
      background: #fff; border: 2px solid #4a6fa5; border-radius: 8px;
      padding: 12px 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      font-size: 13px; min-width: 280px;
    `;

    const title = document.createElement("div");
    title.textContent = "⚙ 展示補正 設定";
    title.style.cssText = "font-weight:bold; margin-bottom:10px; color:#4a6fa5; font-size:14px;";
    panel.appendChild(title);

    // 1位回数係数スライダー
    const label = document.createElement("div");
    label.style.marginBottom = "4px";
    label.textContent = "1位回数 補正係数:";
    panel.appendChild(label);

    const sliderRow = document.createElement("div");
    sliderRow.style.cssText = "display:flex; align-items:center; gap:8px; margin-bottom:8px;";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "0.5";
    slider.step = "0.01";
    slider.value = firstPlaceFactor;
    slider.style.flex = "1";

    const valueDisplay = document.createElement("span");
    valueDisplay.textContent = firstPlaceFactor.toFixed(2);
    valueDisplay.style.cssText = "min-width:36px; text-align:right; font-weight:bold;";

    slider.addEventListener("input", () => {
      valueDisplay.textContent = parseFloat(slider.value).toFixed(2);
    });

    sliderRow.appendChild(slider);
    sliderRow.appendChild(valueDisplay);
    panel.appendChild(sliderRow);

    // 適用ボタン
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex; gap:8px;";

    const applyBtn = document.createElement("button");
    applyBtn.textContent = "適用して再計算";
    applyBtn.style.cssText = `
      background:#4a6fa5; color:#fff; border:none; border-radius:4px;
      padding:6px 12px; cursor:pointer; font-size:12px;
    `;
    applyBtn.addEventListener("click", () => {
      firstPlaceFactor = parseFloat(slider.value);
      GM_setValue("firstPlaceFactor", firstPlaceFactor);
      location.reload();
    });

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "リセット";
    resetBtn.style.cssText = `
      background:#999; color:#fff; border:none; border-radius:4px;
      padding:6px 12px; cursor:pointer; font-size:12px;
    `;
    resetBtn.addEventListener("click", () => {
      slider.value = DEFAULT_FIRST_PLACE_FACTOR;
      valueDisplay.textContent = DEFAULT_FIRST_PLACE_FACTOR.toFixed(2);
      firstPlaceFactor = DEFAULT_FIRST_PLACE_FACTOR;
      GM_setValue("firstPlaceFactor", DEFAULT_FIRST_PLACE_FACTOR);
      location.reload();
    });

    btnRow.appendChild(applyBtn);
    btnRow.appendChild(resetBtn);
    panel.appendChild(btnRow);

    // 折りたたみトグル
    const toggleBtn = document.createElement("div");
    toggleBtn.textContent = "⚙";
    toggleBtn.style.cssText = `
      position: fixed; top: 10px; right: 10px; z-index: 100000;
      background: #4a6fa5; color: #fff; border-radius: 50%;
      width: 32px; height: 32px; text-align: center; line-height: 32px;
      cursor: pointer; font-size: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    `;
    let panelVisible = false;
    panel.style.display = "none";
    toggleBtn.addEventListener("click", () => {
      panelVisible = !panelVisible;
      panel.style.display = panelVisible ? "block" : "none";
      toggleBtn.style.right = panelVisible ? "310px" : "10px";
    });

    document.body.appendChild(toggleBtn);
    document.body.appendChild(panel);
  }

  // --- 1位回数の取得 ---
  function getFirstPlaceCounts() {
    const counts = [];
    const rows = document.querySelectorAll("tr");
    for (const row of rows) {
      const firstCell = row.querySelector("td");
      if (!firstCell || firstCell.textContent.trim() !== "1位回数") continue;
      const cells = row.querySelectorAll("td");
      cells.forEach((cell, index) => {
        if (index === 0) return;
        const val = parseInt(cell.textContent.trim(), 10);
        counts.push(isNaN(val) ? 0 : val);
      });
      break;
    }
    return counts.slice(0, 6);
  }

  // --- 1位回数比率による展示追加補正を計算 ---
  function calcFirstPlaceCorrections(counts) {
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) return counts.map(() => 0);
    const avg = 1 / 6;
    return counts.map(c => {
      const ratio = c / total;
      return parseFloat(((ratio - avg) * firstPlaceFactor).toFixed(4));
    });
  }

  function getBoatNumbers() {
    const boatNumbers = [];
    document.querySelectorAll("td").forEach(cell => {
      const match = cell.textContent.trim().match(/^(\d)号艇$/);
      if (match) boatNumbers.push(parseInt(match[1], 10));
    });
    return boatNumbers.slice(0, 6);
  }

  function applyRankingColor(row, values, refRow) {
    const sorted = [...values]
      .map((v, i) => ({ value: v, index: i }))
      .sort((a, b) => a.value - b.value);
    const cells = row.querySelectorAll("td");

    // 1位・2位の色を元の行から取得（赤=1位、黄=2位を判別）
    if (refRow) {
      const refCells = refRow.querySelectorAll("td");
      let firstStyle = null;
      let secondStyle = null;

      refCells.forEach((cell, idx) => {
        if (idx === 0) return;
        const bg = window.getComputedStyle(cell).backgroundColor;
        if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") return;

        // 赤系（r > 200, g < 100）= 1位、それ以外 = 2位
        const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          const r = parseInt(match[1]), g = parseInt(match[2]);
          const color = window.getComputedStyle(cell).color;
          if (r > 200 && g < 100) {
            firstStyle = { bg, color };
          } else {
            secondStyle = { bg, color };
          }
        }
      });

      if (firstStyle && secondStyle) {
        cells[sorted[0].index + 1].style.backgroundColor = firstStyle.bg;
        cells[sorted[0].index + 1].style.color = firstStyle.color;
        cells[sorted[1].index + 1].style.backgroundColor = secondStyle.bg;
        cells[sorted[1].index + 1].style.color = secondStyle.color;
        return;
      }
    }

    // フォールバック
    cells[sorted[0].index + 1].style.backgroundColor = "#e74c3c";
    cells[sorted[0].index + 1].style.color = "#fff";
    cells[sorted[1].index + 1].style.backgroundColor = "#f1c40f";
  }

  function createDataRow(label, values, isSumRow, refRow) {
    const tr = document.createElement("tr");
    const refCells = refRow.querySelectorAll("td");

    const th = document.createElement("td");
    th.textContent = label;
    if (refCells[0]) {
      const refStyle = window.getComputedStyle(refCells[0]);
      th.style.textAlign = refStyle.textAlign;
      th.style.backgroundColor = refStyle.backgroundColor;
      th.style.color = refStyle.color;
      th.style.fontSize = refStyle.fontSize;
      th.style.fontWeight = refStyle.fontWeight;
      th.style.padding = refStyle.padding;
      th.style.whiteSpace = "nowrap";
    }
    if (isSumRow) th.style.fontWeight = "bold";
    tr.appendChild(th);

    const refDataCell = refCells[1];
    const refDataStyle = refDataCell ? window.getComputedStyle(refDataCell) : null;

    values.forEach(v => {
      const td = document.createElement("td");
      td.textContent = v != null ? v.toFixed(2) : "-";
      if (refDataStyle) {
        td.style.textAlign = refDataStyle.textAlign;
        td.style.fontWeight = refDataStyle.fontWeight;
        td.style.fontSize = refDataStyle.fontSize;
        td.style.padding = refDataStyle.padding;
        td.style.fontFamily = refDataStyle.fontFamily;
      }
      if (isSumRow) td.style.backgroundColor = "#f0f0f0";
      tr.appendChild(td);
    });

    return tr;
  }

  function correctTenjiRows() {
    const boatNumbers = getBoatNumbers();
    if (boatNumbers.length !== 6) return;

    // 1位回数補正
    const firstPlaceCounts = getFirstPlaceCounts();
    const fpCorrections = calcFirstPlaceCorrections(firstPlaceCounts);

    const originalData = {};
    const correctedData = {};
    const targetRows = {};

    const rows = document.querySelectorAll("tr");
    rows.forEach(row => {
      const firstCell = row.querySelector("td");
      if (!firstCell) return;

      const label = firstCell.textContent.trim();
      const targets = ["展示", "周回", "周り足", "直線"];
      if (!targets.includes(label)) return;

      targetRows[label] = row;
      originalData[label] = [];
      correctedData[label] = [];

      const cells = row.querySelectorAll("td");
      cells.forEach((cell, index) => {
        if (index === 0) return;
        const text = cell.textContent.trim();

        if (!/^\d+\.\d+$/.test(text)) {
          originalData[label].push(null);
          correctedData[label].push(null);
          return;
        }

        const boatNo = boatNumbers[index - 1];
        const correction = correctionTable[boatNo][label];
        const original = parseFloat(text);
        let corrected = original + correction;

        // 展示には1位回数補正を追加
        if (label === "展示") {
          corrected += fpCorrections[index - 1];
        }

        corrected = parseFloat(corrected.toFixed(2));
        originalData[label].push(original);
        correctedData[label].push(corrected);
      });
    });

    const chokusenRow = targetRows["直線"];
    if (!chokusenRow || !originalData["展示"] || !originalData["周回"]) return;

    const sumOriginal = [];
    const sumCorrected = [];
    for (let i = 0; i < 6; i++) {
      const oT = originalData["展示"][i], oS = originalData["周回"][i];
      const cT = correctedData["展示"][i], cS = correctedData["周回"][i];
      sumOriginal.push(oT != null && oS != null ? parseFloat((oT + oS).toFixed(2)) : null);
      sumCorrected.push(cT != null && cS != null ? parseFloat((cT + cS).toFixed(2)) : null);
    }

    let insertAfter = chokusenRow;

    const refRow = targetRows["展示"];
    const sumOrigRow = createDataRow("SUM(元)", sumOriginal, true, refRow);
    insertAfter.parentNode.insertBefore(sumOrigRow, insertAfter.nextSibling);
    applyRankingColor(sumOrigRow, sumOriginal.map(v => v != null ? v : Infinity), refRow);
    insertAfter = sumOrigRow;

    const labels = ["展示", "周回", "周り足", "直線"];
    labels.forEach(label => {
      const corrRow = createDataRow(label + "（補正）", correctedData[label], false, targetRows[label]);
      insertAfter.parentNode.insertBefore(corrRow, insertAfter.nextSibling);
      applyRankingColor(corrRow, correctedData[label].map(v => v != null ? v : Infinity), targetRows[label]);
      insertAfter = corrRow;
    });

    const sumCorrRow = createDataRow("SUM(補正)", sumCorrected, true, refRow);
    insertAfter.parentNode.insertBefore(sumCorrRow, insertAfter.nextSibling);
    applyRankingColor(sumCorrRow, sumCorrected.map(v => v != null ? v : Infinity), refRow);
  }

  // --- 起動 ---
  createSettingsPanel();
  setTimeout(correctTenjiRows, 2000);
})();

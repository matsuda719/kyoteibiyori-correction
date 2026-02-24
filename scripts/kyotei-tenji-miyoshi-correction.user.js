// ==UserScript==
// @name         Kyotei Tenji Miyoshi Correction
// @namespace    https://kyoteibiyori.com/
// @version      1.2.1
// @description  展示情報（展示・周回・周り足・直線）を艇番号別に補正し、補正後の順位で色分け表示。SUM理論（展示+周回）も表示。
// @author       matsuda719
// @match        *://kyoteibiyori.com/race_shusso.php*
// @grant        none
// @license      MIT
// @downloadURL https://raw.githubusercontent.com/matsuda719/kyoteibiyori-correction/main/scripts/kyotei-tenji-miyoshi-correction.user.js
// @updateURL https://raw.githubusercontent.com/matsuda719/kyoteibiyori-correction/main/scripts/kyotei-tenji-miyoshi-correction.user.js
// ==/UserScript==

(function() {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get("slider") !== "4") return;

  const correctionTable = {
    1: { 展示: 0.02, 周回: 0.40, 周り足: 0.20, 直線: 0.00 },
    2: { 展示: 0.01, 周回: 0.30, 周り足: 0.10, 直線: 0.00 },
    3: { 展示: 0.00, 周回: 0.20, 周り足: 0.00, 直線: 0.00 },
    4: { 展示: -0.01, 周回: 0.10, 周り足: -0.05, 直線: -0.01 },
    5: { 展示: -0.01, 周回: 0.05, 周り足: -0.10, 直線: -0.02 },
    6: { 展示: -0.02, 周回: 0.00, 周り足: -0.15, 直線: -0.02 }
  };

  function getBoatNumbers() {
    const boatNumbers = [];
    document.querySelectorAll("td").forEach(cell => {
      const match = cell.textContent.trim().match(/^(\d)号艇$/);
      if (match) boatNumbers.push(parseInt(match[1], 10));
    });
    return boatNumbers.slice(0, 6);
  }

  function applyRankingColor(row, values) {
    const sorted = [...values]
      .map((v, i) => ({ value: v, index: i }))
      .sort((a, b) => a.value - b.value);
    const cells = row.querySelectorAll("td");
    cells.forEach(cell => {
      cell.style.backgroundColor = "";
      cell.style.color = "";
    });
    cells[sorted[0].index + 1].style.backgroundColor = "#e74c3c";
    cells[sorted[1].index + 1].style.backgroundColor = "#f1c40f";
  }

  function createDataRow(label, values, isSumRow) {
    const tr = document.createElement("tr");
    const th = document.createElement("td");
    th.textContent = label;
    if (isSumRow) {
      th.style.fontWeight = "bold";
      th.style.backgroundColor = "#f0f0f0";
    }
    tr.appendChild(th);

    values.forEach(v => {
      const td = document.createElement("td");
      td.textContent = v != null ? v.toFixed(2) : "-";
      td.style.textAlign = "center";
      if (isSumRow) td.style.backgroundColor = "#f0f0f0";
      tr.appendChild(td);
    });

    return tr;
  }

  function correctTenjiRows() {
    const boatNumbers = getBoatNumbers();
    if (boatNumbers.length !== 6) return;

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
        const corrected = parseFloat((original + correction).toFixed(2));

        originalData[label].push(original);
        correctedData[label].push(corrected);
      });

      // 元の行はオリジナルのまま（色分けしない）
    });

    // 直線行の後にSUM(元)を挿入
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

    // SUM(元)
    const sumOrigRow = createDataRow("SUM(元)", sumOriginal, true);
    insertAfter.parentNode.insertBefore(sumOrigRow, insertAfter.nextSibling);
    applyRankingColor(sumOrigRow, sumOriginal.map(v => v != null ? v : Infinity));
    insertAfter = sumOrigRow;

    // 補正行（展示〜直線）
    const labels = ["展示", "周回", "周り足", "直線"];
    labels.forEach(label => {
      const corrRow = createDataRow(label + "（補正）", correctedData[label], false);
      insertAfter.parentNode.insertBefore(corrRow, insertAfter.nextSibling);
      applyRankingColor(corrRow, correctedData[label].map(v => v != null ? v : Infinity));
      insertAfter = corrRow;
    });

    // SUM(補正)
    const sumCorrRow = createDataRow("SUM(補正)", sumCorrected, true);
    insertAfter.parentNode.insertBefore(sumCorrRow, insertAfter.nextSibling);
    applyRankingColor(sumCorrRow, sumCorrected.map(v => v != null ? v : Infinity));
  }

  setTimeout(correctTenjiRows, 2000);
})();

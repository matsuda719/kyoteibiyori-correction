// ==UserScript==
// @name         Kyotei Tenji Miyoshi Correction
// @namespace    https://kyoteibiyori.com/
// @version      1.1.0
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

  // slider=4 のときだけ動作
  const params = new URLSearchParams(window.location.search);
  if (params.get("slider") !== "4") return;

  // 艇番号別補正値
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
    const cells = document.querySelectorAll("td");
    cells.forEach(cell => {
      const text = cell.textContent.trim();
      const match = text.match(/^(\d)号艇$/);
      if (match) {
        boatNumbers.push(parseInt(match[1], 10));
      }
    });
    return boatNumbers.slice(0, 6);
  }

  function applyRankingColor(row, correctedValues) {
    const sorted = [...correctedValues]
      .map((v, i) => ({ value: v, index: i }))
      .sort((a, b) => a.value - b.value);

    const cells = row.querySelectorAll("td");

    // 背景色のみリセット（文字色は触らない）
    cells.forEach(cell => {
      cell.style.backgroundColor = "";
      cell.style.color = "";
    });

    // 1位（最小値）
    const first = sorted[0];
    cells[first.index + 1].style.backgroundColor = "#e74c3c";

    // 2位
    const second = sorted[1];
    cells[second.index + 1].style.backgroundColor = "#f1c40f";
  }

  function createSumRow(label, values) {
    const tr = document.createElement("tr");
    const th = document.createElement("td");
    th.textContent = label;
    th.style.fontWeight = "bold";
    tr.appendChild(th);

    values.forEach(v => {
      const td = document.createElement("td");
      td.textContent = v != null ? v.toFixed(2) : "-";
      td.style.textAlign = "center";
      tr.appendChild(td);
    });

    return tr;
  }

  function correctTenjiRows() {
      const boatNumbers = getBoatNumbers();
      if (boatNumbers.length !== 6) return;

      // 元の値と補正値を保持（SUM計算用）
      const originalData = {};
      const correctedData = {};
      let lastTargetRow = null;

      const rows = document.querySelectorAll("tr");
      rows.forEach(row => {
        const firstCell = row.querySelector("td");
        if (!firstCell) return;

        const label = firstCell.textContent.trim();
        const targets = ["展示", "周回", "周り足", "直線"];
        if (!targets.includes(label)) return;

        lastTargetRow = row;
        originalData[label] = [];
        correctedData[label] = [];

        const cells = row.querySelectorAll("td");
        const correctedValues = [];

        cells.forEach((cell, index) => {
          if (index === 0) return;
          const text = cell.textContent.trim();

          if (!/^\d+\.\d+$/.test(text)) {
            originalData[label].push(null);
            correctedData[label].push(null);
            correctedValues.push(Infinity);
            return;
          }

          const boatNo = boatNumbers[index - 1];
          const correction = correctionTable[boatNo][label];
          const original = parseFloat(text);
          const corrected = parseFloat((original + correction).toFixed(2));

          originalData[label].push(original);
          correctedData[label].push(corrected);

          cell.textContent = `${text}（${corrected.toFixed(2)}）`;
          correctedValues.push(corrected);
        });

        applyRankingColor(row, correctedValues);
      });

      // SUM行を追加（展示+周回）
      if (originalData["展示"] && originalData["周回"] && lastTargetRow) {
        const sumOriginal = [];
        const sumCorrected = [];

        for (let i = 0; i < 6; i++) {
          const oTenji = originalData["展示"][i];
          const oShukai = originalData["周回"][i];
          const cTenji = correctedData["展示"][i];
          const cShukai = correctedData["周回"][i];

          sumOriginal.push(oTenji != null && oShukai != null ? parseFloat((oTenji + oShukai).toFixed(2)) : null);
          sumCorrected.push(cTenji != null && cShukai != null ? parseFloat((cTenji + cShukai).toFixed(2)) : null);
        }

        // 元SUM行
        const sumOrigRow = createSumRow("SUM(元)", sumOriginal);
        lastTargetRow.parentNode.insertBefore(sumOrigRow, lastTargetRow.nextSibling);
        applyRankingColor(sumOrigRow, sumOriginal.map(v => v != null ? v : Infinity));

        // 補正SUM行
        const sumCorrRow = createSumRow("SUM(補正)", sumCorrected);
        sumOrigRow.parentNode.insertBefore(sumCorrRow, sumOrigRow.nextSibling);
        applyRankingColor(sumCorrRow, sumCorrected.map(v => v != null ? v : Infinity));
      }
    }



  // 描画待ち
  setTimeout(correctTenjiRows, 2000);
})();

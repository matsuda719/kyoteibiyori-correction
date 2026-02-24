// ==UserScript==
// @name         Kyotei Tenji Miyoshi Correction
// @namespace    https://kyoteibiyori.com/
// @version      1.4.1
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

  function applyRankingColor(row, values, refRow) {
    const sorted = [...values]
      .map((v, i) => ({ value: v, index: i }))
      .sort((a, b) => a.value - b.value);
    const cells = row.querySelectorAll("td");

    if (refRow) {
      // 元の行から1位・2位のスタイルを取得
      const refCells = refRow.querySelectorAll("td");
      const refSorted = [];
      refCells.forEach((cell, idx) => {
        if (idx === 0) return;
        const bg = window.getComputedStyle(cell).backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
          refSorted.push({ bg, color: window.getComputedStyle(cell).color });
        }
      });

      if (refSorted.length >= 2) {
        // 1位
        cells[sorted[0].index + 1].style.backgroundColor = refSorted[0].bg;
        cells[sorted[0].index + 1].style.color = refSorted[0].color;
        // 2位
        cells[sorted[1].index + 1].style.backgroundColor = refSorted[1].bg;
        cells[sorted[1].index + 1].style.color = refSorted[1].color;
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

    // ラベルセル（元の行の最初のセルからスタイルをコピー）
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

    // 数値セル（元の行のデータセルからスタイルをコピー）
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
    const refRow = targetRows["展示"];
    const sumOrigRow = createDataRow("SUM(元)", sumOriginal, true, refRow);
    insertAfter.parentNode.insertBefore(sumOrigRow, insertAfter.nextSibling);
    applyRankingColor(sumOrigRow, sumOriginal.map(v => v != null ? v : Infinity), refRow);
    insertAfter = sumOrigRow;

    // 補正行（展示〜直線）
    const labels = ["展示", "周回", "周り足", "直線"];
    labels.forEach(label => {
      const corrRow = createDataRow(label + "（補正）", correctedData[label], false, targetRows[label]);
      insertAfter.parentNode.insertBefore(corrRow, insertAfter.nextSibling);
      applyRankingColor(corrRow, correctedData[label].map(v => v != null ? v : Infinity), targetRows[label]);
      insertAfter = corrRow;
    });

    // SUM(補正)
    const sumCorrRow = createDataRow("SUM(補正)", sumCorrected, true, refRow);
    insertAfter.parentNode.insertBefore(sumCorrRow, insertAfter.nextSibling);
    applyRankingColor(sumCorrRow, sumCorrected.map(v => v != null ? v : Infinity), refRow);
  }

  setTimeout(correctTenjiRows, 2000);
})();

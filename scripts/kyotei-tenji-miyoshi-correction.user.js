// ==UserScript==
// @name         Kyotei Tenji Miyoshi Correction
// @namespace    https://kyoteibiyori.com/
// @version      1.0.1
// @description  展示情報（展示・周回・周り足・直線）を艇番号別に補正し、補正後の順位で色分け表示します。
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

  function correctTenjiRows() {
    const boatNumbers = getBoatNumbers();
    if (boatNumbers.length !== 6) return;

    const rows = document.querySelectorAll("tr");
    rows.forEach(row => {
      const firstCell = row.querySelector("td");
      if (!firstCell) return;

      const label = firstCell.textContent.trim();
      const targets = ["展示", "周回", "周り足", "直線"];
      if (!targets.includes(label)) return;

      const cells = row.querySelectorAll("td");
      const correctedValues = [];

      cells.forEach((cell, index) => {
        if (index === 0) return;
        const text = cell.textContent.trim();

        // 数値でない場合（- など）
        if (!/^\d+\.\d+$/.test(text)) {
          correctedValues.push(Infinity);
          return;
        }

        const boatNo = boatNumbers[index - 1];
        const correction = correctionTable[boatNo][label];
        const original = parseFloat(text);
        const corrected = parseFloat((original + correction).toFixed(2));

        cell.textContent = `${text}（${corrected.toFixed(2)}）`;
        correctedValues.push(corrected);
      });

      applyRankingColor(row, correctedValues);
    });
  }

  // 描画待ち
  setTimeout(correctTenjiRows, 2000);
})();

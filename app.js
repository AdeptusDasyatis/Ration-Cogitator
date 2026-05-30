// Ration Cogitator - Application Logic

(function () {
  // State variables
  let targetCalories = 1600;
  let dailyData = {}; // Format: { "YYYY-MM-DD": Calories (integer) }

  // Constant for SVG progress ring circumference
  // Circumference = 2 * Math.PI * r = 2 * Math.PI * 90 = 565.4867
  const RING_CIRCUMFERENCE = 565.4867;

  // DOM Elements
  const consumedDisplay = document.getElementById('consumed-calories-display');
  const targetDisplay = document.getElementById('target-calories-display');
  const remainingDisplay = document.getElementById('remaining-calories-display');
  const statusDisplay = document.getElementById('calorie-status-display');
  const progressFill = document.getElementById('progress-ring-fill');

  const calorieAmountInput = document.getElementById('calories-amount-input');
  const adjAddBtn = document.getElementById('adj-add-btn');
  const adjSubBtn = document.getElementById('adj-sub-btn');

  const historyList = document.getElementById('history-list');
  const emptyHistoryMsg = document.getElementById('empty-history-message');
  const logCountBadge = document.getElementById('log-count');

  const weeklyChart = document.getElementById('weekly-chart');

  const settingsToggleBtn = document.getElementById('settings-toggle-btn');
  const settingsModal = document.getElementById('settings-modal');
  const settingsCloseBtn = document.getElementById('settings-close-btn');
  const settingsGoalInput = document.getElementById('settings-goal-input');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const clearDataBtn = document.getElementById('clear-data-btn');

  const exportCsvBtn = document.getElementById('export-csv-btn');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const importFileInput = document.getElementById('import-file-input');
  const fileInputLabel = document.getElementById('file-input-label');

  // Helper: Get local YYYY-MM-DD date string
  function getLocalDateString(date = new Date()) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  }

  // Helper: Format date for human display
  function formatHumanDate(dateStr) {
    const todayStr = getLocalDateString();
    
    // Calculate yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';

    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString(undefined, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  // Load state from local storage with fallback to legacy keys
  function loadState() {
    const savedGoal = localStorage.getItem('ration_target_calories') || localStorage.getItem('fuel_target_calories');
    if (savedGoal) {
      targetCalories = parseInt(savedGoal, 10);
      settingsGoalInput.value = targetCalories;
    }

    const savedData = localStorage.getItem('ration_daily_data') || localStorage.getItem('fuel_daily_data');
    if (savedData) {
      try {
        dailyData = JSON.parse(savedData);
      } catch (e) {
        console.error('Error parsing daily data', e);
        dailyData = {};
      }
    }
  }

  // Save state to local storage
  function saveState() {
    localStorage.setItem('ration_target_calories', targetCalories);
    localStorage.setItem('ration_daily_data', JSON.stringify(dailyData));
  }

  // Modify today's calories by a delta
  function adjustTodayCalories(delta) {
    const todayStr = getLocalDateString();
    let current = dailyData[todayStr] || 0;
    current = Math.max(0, current + delta);
    
    if (current === 0) {
      delete dailyData[todayStr];
    } else {
      dailyData[todayStr] = current;
    }
    
    saveState();
    updateUI();
  }

  // Update UI Elements
  function updateUI() {
    const todayStr = getLocalDateString();
    const todayTotal = dailyData[todayStr] || 0;

    // 1. Text Displays
    consumedDisplay.textContent = todayTotal;
    targetDisplay.textContent = targetCalories;

    const remaining = targetCalories - todayTotal;
    remainingDisplay.textContent = Math.abs(remaining);
    
    if (remaining < 0) {
      remainingDisplay.className = 'stat-value text-purple'; // over target color
      remainingDisplay.parentElement.querySelector('.stat-title').textContent = 'EXCESS FUEL';
      statusDisplay.textContent = 'DEVIANCY';
      statusDisplay.className = 'stat-value text-purple';
    } else {
      remainingDisplay.className = 'stat-value text-green';
      remainingDisplay.parentElement.querySelector('.stat-title').textContent = 'REMAINING QUOTA';
      
      if (todayTotal === 0) {
        statusDisplay.textContent = 'OPERATIONAL';
        statusDisplay.className = 'stat-value text-gold';
      } else if (todayTotal < targetCalories * 0.9) {
        statusDisplay.textContent = 'WITHIN QUOTA';
        statusDisplay.className = 'stat-value text-green';
      } else {
        statusDisplay.textContent = 'QUOTA FULFILLED';
        statusDisplay.className = 'stat-value text-green';
      }
    }

    // 2. Circular Progress Ring
    progressFill.style.strokeDasharray = RING_CIRCUMFERENCE;
    const progressPercent = Math.min(todayTotal / targetCalories, 1.0);
    const offset = RING_CIRCUMFERENCE - (progressPercent * RING_CIRCUMFERENCE);
    progressFill.style.strokeDashoffset = offset;

    // Adjust stroke color gradient dynamically depending on status
    if (todayTotal > targetCalories) {
      progressFill.style.stroke = 'url(#progress-gradient)'; // purple gradient
    } else {
      progressFill.style.stroke = 'url(#progress-gradient)';
    }

    // 3. History List (Past Days, reverse chronological)
    historyList.innerHTML = '';
    const sortedDates = Object.keys(dailyData).sort().reverse();
    
    if (sortedDates.length === 0) {
      emptyHistoryMsg.classList.remove('hidden');
      logCountBadge.textContent = '0 days';
    } else {
      emptyHistoryMsg.classList.add('hidden');
      logCountBadge.textContent = `${sortedDates.length} day${sortedDates.length > 1 ? 's' : ''}`;

      sortedDates.forEach(dateStr => {
        const total = dailyData[dateStr];
        const formattedDate = formatHumanDate(dateStr);
        
        const li = document.createElement('li');
        li.className = 'history-item';
        
        const goalPercent = Math.round((total / targetCalories) * 100);
        
        li.innerHTML = `
          <div class="item-left">
            <span class="item-name">${formattedDate.toUpperCase()}</span>
            <span class="item-time">${goalPercent}% OF QUOTA (${targetCalories} KCAL)</span>
          </div>
          <div class="item-right">
            <span class="item-calories">${total} KCAL</span>
            <button class="delete-btn" data-date="${dateStr}" aria-label="Purge log entry">✕</button>
          </div>
        `;
        
        historyList.appendChild(li);
      });
    }

    // 4. Render Chart
    renderChart();
  }

  // Render the weekly SVG chart
  function renderChart() {
    // Generate dates for the past 7 days (ending today)
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(getLocalDateString(d));
    }

    // Get max calories to scale y-axis (min scale base: targetCalories)
    let maxVal = targetCalories;
    dates.forEach(d => {
      const val = dailyData[d] || 0;
      if (val > maxVal) maxVal = val;
    });

    // Clear previous bars/labels from chart
    // Keep only the grid lines (lines 0, 1, 2)
    const lines = weeklyChart.querySelectorAll('line');
    weeklyChart.innerHTML = '';
    lines.forEach(l => weeklyChart.appendChild(l));

    // Draw bars
    const barWidth = 24;
    const startX = 45;
    const spacing = 40; // Spacing between bar centers
    const chartHeight = 100; // max height in pixels (from y=20 to y=120)
    const baselineY = 120;

    dates.forEach((dateStr, index) => {
      const val = dailyData[dateStr] || 0;
      const height = (val / maxVal) * chartHeight;
      const x = startX + index * spacing - (barWidth / 2);
      const y = baselineY - height;

      // Create bar rect
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', barWidth);
      rect.setAttribute('height', Math.max(height, 2)); // min 2px height so it's visible
      rect.setAttribute('class', 'chart-bar');

      // Highlight today's bar
      const todayStr = getLocalDateString();
      if (dateStr === todayStr) {
        rect.setAttribute('fill', 'url(#progress-gradient)');
        rect.style.filter = 'drop-shadow(0 0 4px var(--color-purple))';
      } else if (val >= targetCalories) {
        rect.setAttribute('fill', 'var(--color-green)');
      } else if (val > 0) {
        rect.setAttribute('fill', 'rgba(168, 85, 247, 0.4)');
      } else {
        rect.setAttribute('fill', 'rgba(255, 255, 255, 0.05)');
      }

      // Tooltip/title for hovering
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${formatHumanDate(dateStr)}: ${val} kcal`;
      rect.appendChild(title);

      weeklyChart.appendChild(rect);

      // Draw calorie count text above bar (if > 0)
      if (val > 0) {
        const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valText.setAttribute('x', startX + index * spacing);
        valText.setAttribute('y', y - 4);
        valText.setAttribute('text-anchor', 'middle');
        valText.setAttribute('class', 'chart-value-text');
        valText.textContent = val;
        weeklyChart.appendChild(valText);
      }

      // Draw day label text below bar
      const dayDate = new Date(dateStr + 'T00:00:00');
      const dayLabel = dayDate.toLocaleDateString(undefined, { weekday: 'narrow' }); // M, T, W...
      
      const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelText.setAttribute('x', startX + index * spacing);
      labelText.setAttribute('y', baselineY + 18);
      labelText.setAttribute('text-anchor', 'middle');
      labelText.setAttribute('class', 'chart-text');
      if (dateStr === todayStr) {
        labelText.setAttribute('fill', '#ffffff');
        labelText.style.fontWeight = 'bold';
      }
      labelText.textContent = dayLabel;
      weeklyChart.appendChild(labelText);
    });
  }

  // Export to CSV format (Excel compatible)
  function exportCSV() {
    const sortedDates = Object.keys(dailyData).sort();
    let csvContent = 'Date,Calories (kcal)\r\n';
    
    sortedDates.forEach(dateStr => {
      csvContent += `${dateStr},${dailyData[dateStr]}\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `ration_cogitator_${getLocalDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export JSON Backup
  function exportJSON() {
    const backupObj = {
      app: 'Ration Cogitator',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      targetCalories: targetCalories,
      dailyData: dailyData
    };

    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `ration_backup_${getLocalDateString()}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Parse CSV import
  function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    const importedData = {};
    let validCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length >= 2) {
        const dateStr = parts[0].trim();
        const calVal = parseInt(parts[1].trim(), 10);
        
        // Simple validation of date format YYYY-MM-DD
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(dateStr) && !isNaN(calVal)) {
          importedData[dateStr] = calVal;
          validCount++;
        }
      }
    }
    return { data: importedData, count: validCount };
  }

  // Import Handler
  function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const text = e.target.result;
      
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (parsed && parsed.dailyData) {
            // Merge state
            dailyData = { ...dailyData, ...parsed.dailyData };
            if (parsed.targetCalories) {
              targetCalories = parseInt(parsed.targetCalories, 10);
              settingsGoalInput.value = targetCalories;
            }
            saveState();
            updateUI();
            alert(`DATA CODEX SYNCED: Adeptus Mechanicus log restored. Merged ${Object.keys(parsed.dailyData).length} daily entries.`);
          } else {
            alert('COGNITIVE FAULT: Invalid JSON log structure detected.');
          }
        } else if (file.name.endsWith('.csv')) {
          const { data, count } = parseCSV(text);
          if (count > 0) {
            dailyData = { ...dailyData, ...data };
            saveState();
            updateUI();
            alert(`DATA CODEX SYNCED: Merged ${count} daily records from CSV ration archives.`);
          } else {
            alert('COGNITIVE FAULT: Invalid CSV codex formatting. Expected columns: Date, Calories.');
          }
        }
      } catch (err) {
        console.error(err);
        alert('COGNITIVE FAULT: File sync aborted: ' + err.message);
      }
      
      // Reset input
      importFileInput.value = '';
    };

    reader.readAsText(file);
  }

  // Bind Event Listeners
  function bindEvents() {
    // Quick Add Buttons (+1, +10, +100)
    document.getElementById('quick-add-1').addEventListener('click', () => adjustTodayCalories(1));
    document.getElementById('quick-add-10').addEventListener('click', () => adjustTodayCalories(10));
    document.getElementById('quick-add-100').addEventListener('click', () => adjustTodayCalories(100));

    // Quick Subtract Buttons (-1, -10, -100)
    document.getElementById('quick-sub-1').addEventListener('click', () => adjustTodayCalories(-1));
    document.getElementById('quick-sub-10').addEventListener('click', () => adjustTodayCalories(-10));
    document.getElementById('quick-sub-100').addEventListener('click', () => adjustTodayCalories(-100));

    // Custom Form Adjustments
    adjAddBtn.addEventListener('click', () => {
      const val = parseInt(calorieAmountInput.value, 10);
      if (val && val > 0) {
        adjustTodayCalories(val);
        calorieAmountInput.value = '';
      }
    });

    adjSubBtn.addEventListener('click', () => {
      const val = parseInt(calorieAmountInput.value, 10);
      if (val && val > 0) {
        adjustTodayCalories(-val);
        calorieAmountInput.value = '';
      }
    });

    // Handle delete actions inside history list
    historyList.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-btn')) {
        const dateStr = e.target.getAttribute('data-date');
        if (confirm(`PURGE RECORD FOR ${formatHumanDate(dateStr).toUpperCase()} FROM THE CHRONICLE?`)) {
          delete dailyData[dateStr];
          saveState();
          updateUI();
        }
      }
    });

    // Settings Modal
    settingsToggleBtn.addEventListener('click', () => {
      settingsModal.classList.remove('hidden');
    });

    settingsCloseBtn.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });

    // Close modal when clicking outside content area
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
      }
    });

    saveSettingsBtn.addEventListener('click', () => {
      const newGoal = parseInt(settingsGoalInput.value, 10);
      if (newGoal && newGoal >= 500 && newGoal <= 10000) {
        targetCalories = newGoal;
        saveState();
        updateUI();
        settingsModal.classList.add('hidden');
      } else {
        alert('CALIBRATION FAULT: Ration target must be between 500 and 10000 kcal.');
      }
    });

    clearDataBtn.addEventListener('click', () => {
      if (confirm('CAUTION: THIS INITIATES A COMPLETE SANCTUARY PURGE. ALL ARCHIVED CONSUMPTION DATA WILL BE PERMANENTLY ERASED. PROCEED?')) {
        dailyData = {};
        targetCalories = 1600;
        settingsGoalInput.value = 1600;
        saveState();
        updateUI();
        settingsModal.classList.add('hidden');
        alert('Adeptus Purge complete. All local archives erased.');
      }
    });

    // Export/Import
    exportCsvBtn.addEventListener('click', exportCSV);
    exportJsonBtn.addEventListener('click', exportJSON);
    importFileInput.addEventListener('change', handleImportFile);
  }

  // Initialize App
  function init() {
    loadState();
    bindEvents();
    updateUI();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then(reg => console.log('Service Worker registered successfully:', reg.scope))
          .catch(err => console.error('Service Worker registration failed:', err));
      });
    }
  }

  // Start the application
  window.addEventListener('DOMContentLoaded', init);
})();

// ==UserScript==
// @name         PRAW - Predicted Rate Average Wizard
// @version      1.71
// @description  Helper for getting predicted rates based on Week -1, -2 or -3 performance from PPR (Requires FC to be onboarded on PP to PPR process mapping)
// @author       falessio + dmmarino + Cedric <3
// @match        https://autoflow-cascade-eu.amazon.com/*/shiftplan/new
// @grant        GM_xmlhttpRequest
// @connect      fclm-portal.amazon.com
// @connect      autoflow-cascade-eu.amazon.com
// @connect      drive.corp.amazon.com
// @connect      document-versions-production.s3.us-west-2.amazonaws.com
// @connect      s3.us-west-2.amazonaws.com
// @updateURL    https://drive.corp.amazon.com/view/falessio@/UserScripts/PRAW.user.js?download=true
// @downloadURL  https://drive.corp.amazon.com/view/falessio@/UserScripts/PRAW.user.js?download=true
// ==/UserScript==

(function() {
    'use strict';
let globalShiftData = null;
    // Date handling service
const DateService = {
    getLastWeekTime(timestamp, weekOffset = 1) {
        const ts = parseInt(timestamp);
        return ts; // Return the timestamp without modification
    },

    formatDisplayTime(timestamp) {
        const date = new Date(parseInt(timestamp));
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    formatUrlDate(timestamp) {
        const date = new Date(parseInt(timestamp));
        return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    },

    getTimeComponents(timestamp) {
        const date = new Date(parseInt(timestamp));
        return {
            hours: date.getHours(),
            minutes: date.getMinutes()
        };
    }
};

    // Styles
    const styles = `
.time-selection-container {
        margin: 15px 0;
    }

    .custom-checkbox {
        display: flex;
        align-items: center;
        margin-bottom: 15px;
        cursor: pointer;
        user-select: none;
    }

    .custom-checkbox input[type="checkbox"] {
        margin: 0;
        margin-right: 8px;
        width: 16px;
        height: 16px;
        cursor: pointer;
    }

    .checkbox-label {
        font-size: 14px;
        color: #232F3E;
    }

    #shiftSelectContainer {
        margin-top: 10px;
    }

    #shiftSelect {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        color: #232F3E;
    }

    .time-inputs {
        display: flex;
        gap: 15px;
        margin-top: 15px;
    }

    .time-input-group {
        flex: 1;
    }

    .time-input-group label {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        color: #232F3E;
    }

    .time-input-group input {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
    }

        .performance-helper-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 15px 20px;
            background: #232F3E;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            z-index: 999;
            font-family: "Amazon Ember", Arial, sans-serif;
        }

        .performance-panel {
    position: fixed;
    bottom: 80px;
    right: 20px;
    min-width: 740px;  /* Minimum width */
    width: auto;       /* Allow automatic width */
    max-width: 90vw;   /* Maximum width as 90% of viewport width */
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    padding: 20px;
    z-index: 999;
    font-family: "Amazon Ember", Arial, sans-serif;
    overflow-x: auto;  /* Add horizontal scroll if needed */
    max-height: 80vh;  /* Maximum height as 80% of viewport height */
    overflow-y: auto;  /* Add vertical scroll if needed */
}
#resultsTable {
    width: 100%;
    overflow-x: auto;
}

.performance-table {
    width: 100%;
    min-width: 700px;  /* Minimum width to prevent squishing */
    border-collapse: collapse;
    margin-top: 15px;
}


        .performance-panel select {
            width: 100%;
            padding: 8px;
            margin: 5px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

        .performance-panel button {
            width: 100%;
            padding: 10px;
            margin: 5px 0;
            background: #232F3E;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .performance-table th, .performance-table td {
            padding: 8px;
            border: 1px solid #ddd;
            text-align: left;
        }

        .performance-table th {
            background: #f5f5f5;
        }

            .performance-table td:empty {
        background-color: #f9f9f9;
        position: relative;
    }

    .performance-table td:empty::after {
        content: "â€”";
        color: #ccc;
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
    }

        .performance-table a {
        display: inline-block;
        padding: 4px 8px;
        background: #f0f0f0;
        border-radius: 4px;
        transition: background-color 0.2s;
    }

    .performance-table a:hover {
        background: #e0e0e0;
    }

        .close-button {
        position: absolute;
        top: -30px;
        right: 15px;
        cursor: pointer;
        font-size: 5rem;
        background: none;
        border: none;
        padding: 0;
        z-index: 9999;
        width: auto !important;  /* Override panel button styles */
        background: none !important;  /* Override panel button styles */
        color: #ff0000;
    }

        .close-button:hover {
        color: #ff0000;
    }

        .fetch-buttons {
        display: flex;
        gap: 10px;
        margin: 10px 0;
    }

    .fetch-buttons button {
        flex: 1;
    }

        .progress-container {
        width: 100%;
        background-color: #f0f0f0;
        border-radius: 4px;
        margin: 10px 0;
    }

    .progress-bar {
        width: 0%;
        height: 20px;
        background-color: #4CAF50;
        border-radius: 10px;
        transition: width 0.3s ease-in-out;
    }

    .progress-text {
        text-align: center;
        margin-top: 5px;
    }

        .retry-notification {
        background-color: #fff3cd;
        color: #856404;
        padding: 5px 10px;
        margin: 5px 0;
        border-radius: 4px;
        font-size: 0.9em;
    }

    .rate-cell a {
    display: block;
    width: 100%;
    height: 100%;
    padding: 8px;
    text-decoration: none;
    color: inherit;
}

.rate-cell a:hover {
    background-color: #f5f5f5;
}
    `;

    // Add styles to document
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Helper function to get FC ID from URL
    function getFcId() {
        const match = window.location.pathname.match(/\/([A-Z0-9]+)\//);
        return match ? match[1] : null;
    }

    // Function to fetch shift data
async function fetchShiftData() {
    const fcId = getFcId();
    const url = `https://autoflow-cascade-eu.amazon.com/${fcId}/shiftplan/new/model`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        globalShiftData = data.shiftInputDetails; // Store the data globally
        return data.shiftInputDetails;
    } catch (error) {
        console.error('Error fetching shift data:', error);
        return [];
    }
}

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Function to create and show the panel
   async function showPanel() {
    const mainButton = document.querySelector('.performance-helper-btn');
    if (mainButton) {
        mainButton.style.display = 'none';
    }

    const panel = document.createElement('div');
    panel.className = 'performance-panel';

    const shifts = await fetchShiftData();

    panel.innerHTML = `
        <button class="close-button">&times;</button>
    <h3>Select Shift</h3>
    <div class="time-selection-container">
        <label class="custom-checkbox">
            <input type="checkbox" id="useCustomTime">
            <span class="checkbox-label">Use Custom Time Range</span>
        </label>

        <div id="shiftSelectContainer">
            <select id="shiftSelect">
                ${shifts.map(shift => {
        const [start, end] = shift.shiftInterval.split('-');
        return `
                        <option value="${shift.shiftInterval}">
                            ${shift.shiftName} (${DateService.formatDisplayTime(start)} - ${DateService.formatDisplayTime(end)})
                        </option>
                    `;
    }).join('')}
            </select>
        </div>

        <div id="customTimeContainer" style="display: none;">
            <div class="time-inputs">
                <div class="time-input-group">
                    <label>Start Time:</label>
                    <input type="datetime-local" id="customStartTime" />
                </div>
                <div class="time-input-group">
                    <label>End Time:</label>
                    <input type="datetime-local" id="customEndTime" />
                </div>
            </div>
        </div>
    </div>
    <div class="fetch-buttons">
        <button id="fetch1W">Week -1</button>
        <button id="fetch2W">Week -2</button>
        <button id="fetch3W">Week -3</button>
        <button id="fetch4W">Week -4</button>
        <button id="fetchAll">All Weeks</button>
    </div>
    <div id="resultsTable"></div>
    NOTE: AAs with < 0.15 hours total will be not accounted in the calculation
`;


//addDebugButton(panel);
document.body.appendChild(panel);
setupTimeSelectionToggle();
attachEventListeners(panel);


}

    function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

    function closePanel() {
    const panel = document.querySelector('.performance-panel');
    if (panel) {
        panel.remove();
        // Show the main button again
        const mainButton = document.querySelector('.performance-helper-btn');
        if (mainButton) {
            mainButton.style.display = 'block';
        }
    }
}

    function getShiftTimes(shiftInterval) {
    const [start, end] = shiftInterval.split('-');
    return adjustTimeRange(start, end);
}

    function adjustTimeRange(startTime, endTime) {
    const THIRTY_MINUTES = 30 * 60 * 1000; // 30 minutes in milliseconds
    return {
        startTime: parseInt(startTime) + THIRTY_MINUTES,
        endTime: parseInt(endTime) - THIRTY_MINUTES
    };
}


    const getShiftTimesFromSelect = () => {
    const useCustomTime = document.getElementById('useCustomTime').checked;

    if (useCustomTime) {
        const startTime = new Date(document.getElementById('customStartTime').value).getTime();
        const endTime = new Date(document.getElementById('customEndTime').value).getTime();
        return { startTime, endTime, isCustomTime: true };
    } else {
        const shiftInterval = document.getElementById('shiftSelect').value;
        return { ...getShiftTimes(shiftInterval), isCustomTime: false };
    }
};




    // Helper function to get process ID from process path
    function getProcessId(processPath) {
        for (const [processName, config] of Object.entries(window.processConfig)) {
            for (const [pprFunc, configPath] of Object.entries(config.functions)) {
                if (Array.isArray(configPath) && configPath.includes(processPath) ||
                    configPath === processPath) {
                    return config.id;
                }
            }
        }
        return null;
    }

    function setupTimeSelectionToggle() {
    const useCustomTime = document.getElementById('useCustomTime');
    const shiftSelectContainer = document.getElementById('shiftSelectContainer');
    const customTimeContainer = document.getElementById('customTimeContainer');

    useCustomTime.addEventListener('change', (e) => {
        shiftSelectContainer.style.display = e.target.checked ? 'none' : 'block';
        customTimeContainer.style.display = e.target.checked ? 'block' : 'none';
    });

    // Set default datetime-local values to current date/time
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setHours(defaultStart.getHours() - 4); // 4 hours ago by default

    document.getElementById('customStartTime').value = defaultStart.toISOString().slice(0, 16);
    document.getElementById('customEndTime').value = now.toISOString().slice(0, 16);
}

    // Function to generate PPR URL
    function generatePPRUrl(processId, startTime, endTime) {
        const fcId = getFcId();

        const timeComponents = DateService.getTimeComponents(startTime);
        const endTimeComponents = DateService.getTimeComponents(endTime);

        return `https://fclm-portal.amazon.com/reports/functionRollup?` +
            `warehouseId=${fcId}&` +
            `spanType=Intraday&` +
            `startDateIntraday=${DateService.formatUrlDate(startTime)}&` +
            `startHourIntraday=${timeComponents.hours}&` +
            `startMinuteIntraday=${timeComponents.minutes}&` +
            `endDateIntraday=${DateService.formatUrlDate(endTime)}&` +
            `endHourIntraday=${endTimeComponents.hours}&` +
            `endMinuteIntraday=${endTimeComponents.minutes}&` +
            `reportFormat=HTML&` +
            `processId=${processId}`;
    }

    function generateButtonPPRUrl(processId, startTime, endTime) {
    const fcId = getFcId();

    const offsetStartTime = parseInt(startTime);
    const offsetEndTime = parseInt(endTime);

    const timeComponents = DateService.getTimeComponents(offsetStartTime);
    const endTimeComponents = DateService.getTimeComponents(offsetEndTime);

    return `https://fclm-portal.amazon.com/reports/functionRollup?` +
        `warehouseId=${fcId}&` +
        `spanType=Intraday&` +
        `startDateIntraday=${DateService.formatUrlDate(offsetStartTime)}&` +
        `startHourIntraday=${timeComponents.hours}&` +
        `startMinuteIntraday=${timeComponents.minutes}&` +
        `endDateIntraday=${DateService.formatUrlDate(offsetEndTime)}&` +
        `endHourIntraday=${endTimeComponents.hours}&` +
        `endMinuteIntraday=${endTimeComponents.minutes}&` +
        `reportFormat=HTML&` +
        `processId=${processId}`;
}

    // Function to parse CSV data
    function parseCSV(csv) {
    // Quick check for empty CSV
    if (!csv || !csv.trim()) {
        console.log('Empty CSV received, skipping processing');
        return [];
    }

    // Split into lines and remove any empty lines
    const lines = csv.split('\n').filter(line => line.trim());

    // If no valid lines, return early
    if (lines.length <= 1) { // 1 because even empty CSVs might have headers
        console.log('No data rows in CSV, skipping processing');
        return [];
    }

    const results = [];
    const headers = parseCSVLine(lines[0]);

    // Parse each data line
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            results.push(row);
        }
    }

    return results;
}

    function parseCSVLine(line) {
    const results = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Handle escaped quotes
                field += '"';
                i++;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            results.push(field.trim());
            field = '';
        } else {
            field += char;
        }
    }

    // Add the last field
    results.push(field.trim());
    return results;
}

    function switchFcConfig(fcId) {
    if (!window.fullConfigDatabase || !window.fullConfigDatabase[fcId]) {
        throw new Error(`No configuration found for FC: ${fcId}`);
    }
    window.processConfig = window.fullConfigDatabase[fcId].processConfig;
    return window.processConfig;
}

    async function fetchProcessConfig() {
        const dbUrl = 'https://drive.corp.amazon.com/view/falessio@/UserScripts/Data/PPR_Naming_DB.json?download=true';

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: dbUrl,
                responseType: 'json',
                onload: function(response) {
                    if (response.status === 200) {
                        try {
                            const allConfigs = JSON.parse(response.responseText);
                            const currentFc = getFcId();

                            if (!allConfigs[currentFc]) {
                                reject(new Error(`No configuration found for FC: ${currentFc}`));
                                return;
                            }

                            // Store the full config database
                            window.fullConfigDatabase = allConfigs;
                            // Set the current FC's config as the active config
                            window.processConfig = allConfigs[currentFc].processConfig;

                            resolve(window.processConfig);
                        } catch (error) {
                            reject(new Error('Failed to parse configuration JSON'));
                        }
                    } else {
                        reject(new Error(`HTTP ${response.status}: ${response.statusText}`));
                    }
                },
                onerror: function(error) {
                    reject(error);
                }
            });
        });
    }

    async function fetchPPRData(intervals, processId, retryCount = 3) {
    const results = {
        q1: null,
        q2: null
    };

    try {
        // Fetch Q1
        results.q1 = await fetchSingleInterval(
            intervals.q1.startTime,
            intervals.q1.endTime,
            processId,
            retryCount
        );

        // Fetch Q2
        results.q2 = await fetchSingleInterval(
            intervals.q2.startTime,
            intervals.q2.endTime,
            processId,
            retryCount
        );

        return results;
    } catch (error) {
        console.error('Error fetching PPR data:', error);
        throw error;
    }
}

    async function fetchSingleInterval(startTime, endTime, processId, retryCount = 3) {
    const url = generatePPRUrl(processId, startTime, endTime);
    console.log(`Fetching PPR data for interval: ${new Date(startTime).toLocaleString()} - ${new Date(endTime).toLocaleString()}`);

    for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    responseType: 'text',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    },
                    timeout: 25000,
                    onload: resolve,
                    onerror: reject,
                    ontimeout: () => reject(new Error('Request timed out'))
                });
            });

            if (response.status === 200) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(response.responseText, 'text/html');
                const summaryTable = doc.querySelector('table#summary');

                if (summaryTable) {
                    return summaryTable;
                }
            }
            throw new Error(`Failed to fetch data: ${response.status}`);
        } catch (error) {
            console.warn(`Attempt ${attempt} failed:`, error);
            if (attempt === retryCount) throw error;
            await sleep(Math.min(1000 * Math.pow(2, attempt), 8000));
        }
    }
}


  function parseHTMLData(html, currentProcessId) {
    console.log(`Starting HTML parsing for process ID: ${currentProcessId}`);

    try {
        let summaryTable;

        if (html instanceof Element) {
            summaryTable = html;
        } else {
            const temp = document.createElement('div');
            temp.innerHTML = html;
            summaryTable = temp.querySelector('table#summary');
        }

        if (!summaryTable) {
            console.error('No summary table found');
            return [];
        }

        console.log('Summary table HTML:', summaryTable.innerHTML);

        const results = [];
        const functionPathMap = new Map();


        // Create function map
        Object.entries(processConfig).forEach(([processName, config]) => {
            if (config.id === currentProcessId) {
                Object.entries(config.functions).forEach(([funcName, paths]) => {
                    functionPathMap.set(funcName, {
                        paths: Array.isArray(paths) ? paths : [paths],
                        processName: processName,
                        processId: config.id
                    });
                });
            }
        });

        console.log('Function map:', Array.from(functionPathMap.entries()));

        // Find and process all function groups
         const functionRows = Array.from(summaryTable.querySelectorAll('tr.empl-all'));
        console.log(`Found ${functionRows.length} function rows`);

        functionRows.forEach((row, index) => {
            const firstCell = row.querySelector('th[rowspan]');
            if (!firstCell || !firstCell.querySelector('a')) return;

            const functionName = firstCell.querySelector('a').textContent.trim();
            const functionInfo = functionPathMap.get(functionName);

            console.log(`Processing row ${index}:`, {
                functionName,
                hasMapping: !!functionInfo,
                rawHTML: row.innerHTML
            });

            if (!functionInfo) return;

            let totalRow = row;
            for (let i = 0; i < 4 && totalRow.nextElementSibling; i++) {
                totalRow = totalRow.nextElementSibling;
            }

            if (totalRow && totalRow.querySelector('.size-total')) {
                const cells = Array.from(totalRow.querySelectorAll('td.numeric'));
                console.log(`Found total row cells:`, cells.map(c => c.textContent));

                let metrics = {
                    'Function Name': functionName,
                    'Process ID': currentProcessId,
                    'Process Paths': functionInfo.paths,
                    'Total Paid Hours': parseFloat(cells[0]?.textContent || '0'),
                    'Jobs': 0,
                    'JPH': 0
                };

                // Modified section to compare ItemShipped and ItemPacked
                let maxJPH = 0;
                let correspondingJobs = 0;

                // Process numeric cells in pairs
                for (let i = 1; i < cells.length - 1; i += 2) {
                    const jobs = parseInt(cells[i]?.textContent || '0');
                    const jph = parseFloat(cells[i + 1]?.textContent || '0');

                    console.log(`Cell pair ${i}:`, { jobs, jph });

                    // Update if this JPH is higher than previous maximum
                    if (jph > maxJPH) {
                        maxJPH = jph;
                        correspondingJobs = jobs;
                    }
                }

                // Use the highest JPH and its corresponding jobs
                if (maxJPH > 0) {
                    metrics.Jobs = correspondingJobs;
                    metrics.JPH = maxJPH;
                }

                if (metrics['Total Paid Hours'] > 0.15) {
                    console.log('Found valid metrics:', metrics);
                    results.push(metrics);
                } else {
                    console.log('Skipping metrics due to zero paid hours:', metrics);
                }
            }
        });

        console.log(`Parsing complete. Found ${results.length} valid metrics:`, results);
        return results;

    } catch (error) {
        console.error('Error parsing HTML:', error);
        console.error('Stack:', error.stack);
        return [];
    }
}

function validateHTMLStructure(summaryTable, processId) {
    console.log(`Validating HTML structure for process ID: ${processId}`);

    const functionRows = summaryTable.querySelectorAll('tr.empl-all');
    const totalRows = summaryTable.querySelectorAll('.size-total');

    console.log('Structure validation:', {
        functionRows: functionRows.length,
        totalRows: totalRows.length,
        tableRows: summaryTable.querySelectorAll('tr').length
    });

    // Check specific function names
    functionRows.forEach(row => {
        const functionName = row.querySelector('th a')?.textContent.trim();
        console.log('Found function:', functionName);
    });
}


function calculateMetrics(summaryTable, processId, intervalStartTime, intervalEndTime) {  // Add interval parameters
    if (!summaryTable) {
        console.log(`No summary table provided for process ID ${processId}`);
        return {};
    }

    const parsedData = parseHTMLData(summaryTable, processId);
    const metrics = {};
    const processPathMapping = createProcessPathMapping();

    // Initialize metrics object with proper keys
    Object.entries(processConfig).forEach(([processName, config]) => {
        if (config.id === processId) {
            Object.entries(config.functions).forEach(([funcName, _]) => {
                const metricKey = `${processName}:${funcName}`;
                metrics[metricKey] = {
                    jph: 0,
                    totalHours: 0,
                    totalUnits: 0,
                    processId: processId,
                    processPaths: [],
                    processName: processName,
                    functionName: funcName,
                    intervalStart: intervalStartTime,  // Store interval information
                    intervalEnd: intervalEndTime
                };
            });
        }
    });


    parsedData.forEach(row => {
        if (row['Function Name'] && row['JPH'] && row['Process ID'] === processId) {
            // Find the process name for this function
            let processName = '';
            Object.entries(processConfig).forEach(([pName, config]) => {
                if (config.id === processId) {
                    Object.entries(config.functions).forEach(([funcName, _]) => {
                        if (funcName === row['Function Name']) {
                            processName = pName;
                        }
                    });
                }
            });

            const metricKey = `${processName}:${row['Function Name']}`;
            metrics[metricKey] = {
                jph: Math.round(row['JPH']),
                totalHours: row['Total Paid Hours'],
                totalUnits: row['Jobs'],
                processId: row['Process ID'],
                processPaths: row['Process Paths'],
                processName: processName,
                functionName: row['Function Name'],
                intervalStart: intervalStartTime,
                intervalEnd: intervalEndTime
            };
        }
    });

    return metrics;
}

    function getWorkingIntervals(selectedShift) {
    if (!selectedShift || !selectedShift.workingIntervals) {
        return null;
    }

    return selectedShift.workingIntervals.map(interval => {
        const [start, end] = interval.split('-');
        return {
            startTime: parseInt(start),
            endTime: parseInt(end)
        };
    });
}

    function verifyMetricsStructure(metricsArray) {
        console.log('=== Verifying Metrics Structure ===');
        metricsArray.forEach((weekMetrics, weekIndex) => {
            console.log(`Week ${weekIndex + 1} Metrics:`);
            Object.entries(weekMetrics).forEach(([funcName, data]) => {
                console.log(`- ${funcName} (${data.proceocessId}):`, {
                    jph: data.jph,
                    paths: data.processPaths
                });
            });
        });
    }

    function generatePerformanceTable(metricsArray, startTime, endTime) {
    const table = document.createElement('table');
    table.className = 'performance-table';

    const mapping = createFunctionToPathMapping();
    const sections = ['pick', 'induct', 'pack'];
    const isCustomTime = document.getElementById('useCustomTime')?.checked || false;

    // Get number of quarters from shift data
    const selectedShiftInterval = document.getElementById('shiftSelect').value;
    const selectedShift = globalShiftData.find(shift => shift.shiftInterval === selectedShiftInterval);
    const quarterCount = isCustomTime ? 1 : selectedShift.workingIntervals.length;

    let tableHtml = `
    <thead>
        <tr>
            <th>Process Path</th>
            ${metricsArray.map((_, index) => `
                <th colspan="${quarterCount}">Week -${index + 1}</th>
            `).join('')}
            ${metricsArray.length > 1 ? '<th style="background-color: #f0f7ff;">Average</th>' : ''}
        </tr>`;

    if (!isCustomTime) {
        tableHtml += `
        <tr>
            <th></th>
            ${metricsArray.map(() =>
                Array(quarterCount).fill()
                    .map((_, i) => `<th>Q${i + 1}</th>`)
                    .join('')
            ).join('')}
            ${metricsArray.length > 1 ? '<th></th>' : ''}
        </tr>`;
    }

    tableHtml += `</thead><tbody>`;

    sections.forEach(section => {
        tableHtml += `
        <tr class="section-header" data-section="${section}">
            <td colspan="${isCustomTime ? (metricsArray.length + 2) : (metricsArray.length * quarterCount + 2)}"
                style="background-color: #f0f0f0; font-weight: bold;">
                ${mapping[section].title}
            </td>
        </tr>`;

        mapping[section].paths.forEach(pathInfo => {
            tableHtml += `
                <tr class="data-row"
        data-section="${section}"
        data-function="${pathInfo.functionName}"
        data-process="${pathInfo.ppId}"
        data-path="${pathInfo.ppName}"
        data-process-id="${pathInfo.processId}">
        <td>
            ${pathInfo.ppName}
            <br>
            <span style="font-size: 0.8em; font-style: italic; color: #666;">
                ${pathInfo.functionName}
            </span>
        </td>
                ${Array(metricsArray.length).fill()
                    .map(() =>
                        isCustomTime ?
                        `<td class="rate-cell"></td>` :
                        Array(quarterCount).fill()
                            .map(() => `<td class="rate-cell"></td>`)
                            .join('')
                    ).join('')}
                ${metricsArray.length > 1 ? '<td class="average-cell" style="background-color: #f0f7ff;"></td>' : ''}
            </tr>`;
        });
    });

    tableHtml += '</tbody>';
    table.innerHTML = tableHtml;
    return table;
}




async function fetchMultipleWeeks(weeks, baseStartTime, baseEndTime) {
    const resultsDiv = document.getElementById('resultsTable');

    // Create progress elements
    resultsDiv.innerHTML = `
        <div class="progress-container">
            <div class="progress-bar" id="progressBar"></div>
        </div>
        <div class="progress-text" id="progressText">Loading data... 0%</div>
    `;

    // Create empty table structure first
    const emptyMetrics = Array(weeks).fill({});
    const emptyTable = generatePerformanceTable(emptyMetrics, baseStartTime, baseEndTime);
    resultsDiv.appendChild(emptyTable);

    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    try {
        const { startTime, endTime, isCustomTime } = getShiftTimesFromSelect();
        const selectedShiftInterval = document.getElementById('shiftSelect').value;
        const selectedShift = globalShiftData.find(shift => shift.shiftInterval === selectedShiftInterval);

        if (!isCustomTime && (!selectedShift || !selectedShift.workingIntervals)) {
            throw new Error('No working intervals found for selected shift');
        }

        // Initialize with dynamic quarters
        const allWeeksMetrics = Array(weeks).fill().map(() => {
            const quarters = {};
            if (isCustomTime) {
                quarters.q1 = {};
            } else {
                selectedShift.workingIntervals.forEach((_, index) => {
                    quarters[`q${index + 1}`] = {};
                });
            }
            return JSON.parse(JSON.stringify(quarters)); // Deep copy to avoid reference issues
        });

        const totalProcesses = Object.keys(processConfig).length * weeks;
        let completedProcesses = 0;

        for (let week = 1; week <= weeks; week++) {
            const weekOffset = week * 7 * 24 * 60 * 60 * 1000;
            const weekIndex = week - 1;

            let intervals;
            if (isCustomTime) {
                const adjustedTime = adjustTimeRange(startTime, endTime);
                intervals = {
                    q1: {
                        startTime: adjustedTime.startTime - weekOffset,
                        endTime: adjustedTime.endTime - weekOffset
                    }
                };
            } else {
                // Create intervals for each working interval
                intervals = {};
                selectedShift.workingIntervals.forEach((interval, index) => {
                    const [start, end] = interval.split('-');
                    const adjustedTime = adjustTimeRange(start, end);
                    intervals[`q${index + 1}`] = {
                        startTime: adjustedTime.startTime - weekOffset,
                        endTime: adjustedTime.endTime - weekOffset
                    };
                });
            }

            for (const [processName, config] of Object.entries(processConfig)) {
                try {
                    const quarterMetrics = {};

                    // Fetch and calculate metrics for each quarter
                    for (const [quarterKey, interval] of Object.entries(intervals)) {
                        const quarterData = await fetchSingleInterval(
                            interval.startTime,
                            interval.endTime,
                            config.id
                        );

                        const metrics = calculateMetrics(
                            quarterData,
                            config.id,
                            interval.startTime,
                            interval.endTime
                        );

                        quarterMetrics[quarterKey] = metrics;
                    }

                    // Store metrics
                    for (const [quarterKey, metrics] of Object.entries(quarterMetrics)) {
                        allWeeksMetrics[weekIndex][quarterKey] = {
                            ...allWeeksMetrics[weekIndex][quarterKey],
                            ...metrics
                        };
                    }

                    // Update progress
                    completedProcesses++;
                    const progress = Math.round((completedProcesses / totalProcesses) * 100);
                    progressBar.style.width = `${progress}%`;
                    progressText.textContent = `${progress}%`;

                    // Update table
                    updateTableData(allWeeksMetrics, baseStartTime, baseEndTime);

                } catch (error) {
                    console.error(`Error processing ${processName} for week ${week}:`, error);
                    completedProcesses++;
                }

                await sleep(1000);
            }
        }
    } catch (error) {
        console.error('Error in fetchMultipleWeeks:', error);
        resultsDiv.innerHTML += `<p style="color: red;">Error: ${error.message}</p>`;
    }
}


    function addDebugButton(panel) {
    const debugButton = document.createElement('button');
    debugButton.textContent = 'Debug Current State';
    debugButton.style.backgroundColor = '#ff9900';
    debugButton.addEventListener('click', () => {
        console.log('=== Current Process Config ===');
        console.log(JSON.stringify(processConfig, null, 2));

        console.log('=== Current Table State ===');
        debugTableStructure();

        const table = document.querySelector('.performance-table');
        if (table) {
            console.log('=== Current Table Data ===');
            Array.from(table.querySelectorAll('.data-row')).forEach(row => {
                console.log(`${row.dataset.path}:`, {
                    function: row.dataset.function,
                    processId: row.dataset.processId,
                    values: Array.from(row.cells).map(cell => cell.textContent)
                });
            });
        }
    });

    panel.querySelector('.fetch-buttons').appendChild(debugButton);
}

    function createProcessPathMapping() {
    const fcId = getFcId();
    const mapping = new Map();

    // Get the FC's process config
    const fcConfig = window.processConfig;

    // First pass: Create mapping of process paths to their process names and functions
    Object.entries(fcConfig).forEach(([processName, config]) => {
        Object.entries(config.functions).forEach(([functionName, paths]) => {
            const pathArray = Array.isArray(paths) ? paths : [paths];
            pathArray.forEach(path => {
                mapping.set(path, {
                    processName,
                    functionName,
                    processId: config.id,
                    originalPath: path
                });
            });
        });
    });

    console.log('Process path mapping:', mapping);
    return mapping;
}

    function getMetricKey(pathInfo, processPathMapping) {
    // Find the original process and function information for this path
    const mappingInfo = processPathMapping.get(pathInfo.ppName);

    if (!mappingInfo) {
        console.warn(`No mapping found for path: ${pathInfo.ppName}`);
        return null;
    }

    // Create a unique key combining process name and function name
    const metricKey = `${mappingInfo.processName}:${mappingInfo.functionName}`;

    console.log('Generated metric key:', {
        pathInfo,
        mappingInfo,
        metricKey
    });

    return metricKey;
}

    function updateCell(cell, metrics, processId) {
    if (cell && metrics) {
        const link = document.createElement('a');
        link.href = generateButtonPPRUrl(
            processId,
            metrics.intervalStart,
            metrics.intervalEnd
        );
        link.target = '_blank';
        link.textContent = Math.round(metrics.jph || 0);
        link.style.cssText = 'text-decoration: none; color: inherit;';
        cell.innerHTML = '';
        cell.appendChild(link);
    }
}

   function updateTableData(metricsArray, startTime, endTime) {
    const table = document.querySelector('.performance-table');
    if (!table) return;

    const isCustomTime = document.getElementById('useCustomTime')?.checked || false;
    const selectedShiftInterval = document.getElementById('shiftSelect').value;
    const selectedShift = globalShiftData.find(shift => shift.shiftInterval === selectedShiftInterval);
    const quarterCount = isCustomTime ? 1 : selectedShift.workingIntervals.length;

    const processPathMapping = createProcessPathMapping();
    const mapping = createFunctionToPathMapping();
    const sections = ['pick', 'induct', 'pack'];

    // Function to update averages for all rows
    function updateAllAverages() {
        if (metricsArray.length <= 1) return;

        sections.forEach(section => {
            mapping[section].paths.forEach(pathInfo => {
                const row = table.querySelector(`.data-row[data-section="${section}"][data-path="${pathInfo.ppName}"]`);
                if (!row) return;

                const metricKey = getMetricKey(pathInfo, processPathMapping);
                if (!metricKey) return;

                const allMetrics = [];
                metricsArray.forEach(weekData => {
                    if (isCustomTime) {
                        const jph = weekData.q1?.[metricKey]?.jph;
                        if (jph && jph > 0) {
                            allMetrics.push(jph);
                        }
                    } else {
                        for (let q = 1; q <= quarterCount; q++) {
                            const quarterKey = `q${q}`;
                            const jph = weekData[quarterKey]?.[metricKey]?.jph;
                            if (jph && jph > 0) {
                                allMetrics.push(jph);
                            }
                        }
                    }
                });

                const average = allMetrics.length > 0
                    ? Math.round(allMetrics.reduce((a, b) => a + b, 0) / allMetrics.length)
                    : 0;

                const averageCell = row.cells[row.cells.length - 1];
                if (averageCell) {
                    averageCell.textContent = average || '';
                    averageCell.style.backgroundColor = average ? '#f0f7ff' : '#f9f9f9';
                }
            });
        });
    }

    sections.forEach(section => {
        mapping[section].paths.forEach(pathInfo => {
            const uniqueSelector = `.data-row[data-section="${section}"]` +
                                 `[data-function="${pathInfo.functionName}"]` +
                                 `[data-process="${pathInfo.ppId}"]` +
                                 `[data-path="${pathInfo.ppName}"]` +
                                 `[data-process-id="${pathInfo.processId}"]`;

            const row = table.querySelector(uniqueSelector);

            if (!row) {
                console.warn(`Row not found for:`, pathInfo);
                return;
            }

            try {
                const metricKey = getMetricKey(pathInfo, processPathMapping);

                if (!metricKey) {
                    console.warn(`Could not generate metric key for:`, pathInfo);
                    return;
                }

                // Process each week
                metricsArray.forEach((weekData, weekIndex) => {
                    if (isCustomTime) {
                        // For custom timeframe, use single column
                        const cell = row.cells[weekIndex + 1];
                        const metrics = weekData.q1[metricKey];

                        if (cell && metrics) {
                            const link = document.createElement('a');
                            link.href = generateButtonPPRUrl(
                                pathInfo.processId,
                                metrics.intervalStart,
                                metrics.intervalEnd
                            );
                            link.target = '_blank';
                            link.textContent = Math.round(metrics.jph || 0);
                            link.style.cssText = 'text-decoration: none; color: inherit;';
                            cell.innerHTML = '';
                            cell.appendChild(link);
                        }
                    } else {
                        // Handle multiple quarters
                        for (let q = 1; q <= quarterCount; q++) {
                            const cellIndex = (weekIndex * quarterCount) + q;
                            const cell = row.cells[cellIndex];
                            const quarterKey = `q${q}`;
                            const metrics = weekData[quarterKey]?.[metricKey];

                            if (cell && metrics) {
                                const link = document.createElement('a');
                                link.href = generateButtonPPRUrl(
                                    pathInfo.processId,
                                    metrics.intervalStart,
                                    metrics.intervalEnd
                                );
                                link.target = '_blank';
                                link.textContent = Math.round(metrics.jph || 0);
                                link.style.cssText = 'text-decoration: none; color: inherit;';
                                cell.innerHTML = '';
                                cell.appendChild(link);
                            }
                        }
                    }
                });
            } catch (error) {
                console.error(`Error updating row for ${pathInfo.ppName}:`, error);
                console.error('Error details:', error);
            }
        });
    });

    // Update all averages after processing all data
    updateAllAverages();
}


    function debugMetrics(metricsArray) {
    console.log('=== Metrics Debug ===');
    metricsArray.forEach((metrics, weekIndex) => {
        console.log(`Week -${weekIndex + 1}:`);
        Object.entries(metrics).forEach(([funcName, data]) => {
            console.log(`  ${funcName}:`, {
                processId: data.processId,
                paths: data.processPaths,
                jph: data.jph
            });
        });
    });
    console.log('===================');
}



    function debugTableStructure() {
    const table = document.querySelector('.performance-table');
    if (!table) {
           console.error('Table not found during debug');
        return;
    }

    const rows = table.querySelectorAll('.data-row');
    console.log('Table structure debug:');
    console.log(`Total data rows: ${rows.length}`);

    rows.forEach((row, index) => {
        console.log(`Row ${index}:`, {
            section: row.dataset.section,
            function: row.dataset.function,
            process: row.dataset.process,
            path: row.dataset.path,
            cells: row.cells.length
        });
    });
}



  function createFunctionToPathMapping() {
    const mapping = {
        pick: {
            title: 'PICK',
            paths: []
        },
        induct: {
            title: 'INDUCT',
            paths: []
        },
        pack: {
            title: 'PACK',
            paths: []
        }
    };

    // Process each configuration
    Object.entries(processConfig).forEach(([processName, config]) => {
        Object.entries(config.functions).forEach(([funcName, processPath]) => {
            // Convert single path to array for uniform processing
            const paths = Array.isArray(processPath) ? processPath : [processPath];

            paths.forEach(path => {
                let section;

                // Determine section based on process ID and function name
                if (config.id === '1003001') {
                    section = 'pick';
                } else if (funcName.includes('Induct')) {
                    section = 'induct';
                } else if (config.id === '1002969' || config.id === '1002991' || config.id === '1002993') {
                    section = 'pack';
                } else {
                    console.warn(`Unhandled process ID: ${config.id}, defaulting to pack section`);
                    section = 'pack'; // Default to pack if no other match
                }

                // Special handling for ORY4 PPPickToRebin that is equal to PPRname for PPSingleMedium
                let uniqueFunctionName = funcName;
                if (path === 'PPPickToRebin') {
                    if (config.id === '1002991') {
                        uniqueFunctionName = 'Pack Multis - PPPickToRebin';
                    } else if (config.id === '1003001') {
                        uniqueFunctionName = 'Pick To Rebin - PPPickToRebin';
                    }
                }

                // Verify section is valid
                if (!mapping[section]) {
                    console.error(`Invalid section "${section}" for process ${processName}, path ${path}`);
                    return;
                }

                // Add path info to mapping
                const pathInfo = {
                    ppName: path,
                    ppId: processName,
                    functionName: uniqueFunctionName,
                    processId: config.id,
                    originalProcess: processName,
                    section: section // Add section for debugging
                };

                console.log(`Mapping path:`, pathInfo);
                mapping[section].paths.push(pathInfo);
            });
        });
    });

    // Validate the mapping
    Object.entries(mapping).forEach(([section, data]) => {
        console.log(`Section ${section} has ${data.paths.length} paths:`);
        data.paths.forEach(path => {
            console.log(`- ${path.ppName} (${path.processId}): ${path.functionName}`);
        });
    });

    return mapping;
}



    function attachEventListeners(panel) {
    const getShiftTimesFromSelect = () => {
        const shiftInterval = document.getElementById('shiftSelect').value;
        return getShiftTimes(shiftInterval);
    };

    panel.querySelector('#fetch1W').addEventListener('click', () => {
        const { startTime, endTime } = getShiftTimesFromSelect();
        fetchMultipleWeeks(1, startTime, endTime);
    });

    panel.querySelector('#fetch2W').addEventListener('click', () => {
        const { startTime, endTime } = getShiftTimesFromSelect();
        fetchMultipleWeeks(2, startTime, endTime, 2);
    });

    panel.querySelector('#fetch3W').addEventListener('click', () => {
        const { startTime, endTime } = getShiftTimesFromSelect();
        fetchMultipleWeeks(3, startTime, endTime, 3);
    });

    panel.querySelector('#fetch4W').addEventListener('click', () => {
        const { startTime, endTime } = getShiftTimesFromSelect();
        fetchMultipleWeeks(4, startTime, endTime, 4);
    });

    panel.querySelector('#fetchAll').addEventListener('click', () => {
        const { startTime, endTime } = getShiftTimesFromSelect();
        fetchMultipleWeeks(4, startTime, endTime);
    });

    panel.querySelector('.close-button').addEventListener('click', closePanel);
}


    // Initialize the script
   async function initialize() {
    try {
        const currentFc = getFcId();
        console.log(`Initializing for FC: ${currentFc}`);

        // Load configurations
        await fetchProcessConfig();

        // Create UI elements
        const button = document.createElement('button');
        button.className = 'performance-helper-btn';
        button.textContent = 'Predicted Rate Suggestion';
        button.addEventListener('click', showPanel);
        document.body.appendChild(button);

    } catch (error) {
        console.error('Failed to initialize Performance Analysis Helper:', error);
        const errorButton = document.createElement('button');
        errorButton.className = 'performance-helper-btn';
        errorButton.style.backgroundColor = '#d13212';
        errorButton.textContent = `Configuration Error: ${error.message}`;
        document.body.appendChild(errorButton);
    }
}


    // Start the script
    (async function() {
    'use strict';
    await initialize();
})();

})();

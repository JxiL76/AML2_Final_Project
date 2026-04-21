// Set Default Chart.js Config for Dark Theme
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
Chart.defaults.font.family = "'Inter', sans-serif";

let rawData = [];
let appreciationData = [];
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    // Navigation Logic
    const links = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.dashboard-section');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            links.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.replace('active-section', 'hidden'));
            
            link.classList.add('active');
            const target = document.querySelector(link.getAttribute('href'));
            target.classList.replace('hidden', 'active-section');
        });
    });

    // Load Main Datasets
    Papa.parse('./integrated_panel_with_corrected_regimes.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            rawData = results.data;
            
            // Load Segment Appreciation Data
            Papa.parse('./segment_regime_merged.csv', {
                download: true,
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: function(res2) {
                    appreciationData = res2.data;
                    document.getElementById('data-status').textContent = "Pipelines Active";
                    document.querySelector('.status-dot').classList.add('loaded');
                    initDashboard();
                },
                error: function(err) {
                    console.error("Error loading segment CSV:", err);
                }
            });
        },
        error: function(err) {
            console.error("Error loading CSV:", err);
            document.getElementById('data-status').textContent = "Error Loading Data";
            document.querySelector('.status-dot').style.backgroundColor = 'red';
        }
    });

    // Neighborhood select listener
    document.getElementById('neighborhoodSelect').addEventListener('change', (e) => {
        updateHousingChart(e.target.value);
    });
});

function initDashboard() {
    calculateSummaryMetrics();
    buildAppreciationChart();
    buildRegimeCharts();
    setupHousingControls();
    updateHousingChart('All');
    buildCausalityChart();
    buildModelsCharts();
}

function calculateSummaryMetrics() {
    const totalTransactions = rawData.reduce((acc, row) => acc + (row.Transaction_Count || 0), 0);
    const uniqueRegimes = new Set(rawData.map(row => row.Regime)).size;

    document.getElementById('val-transactions').textContent = totalTransactions.toLocaleString();
    document.getElementById('val-regimes').textContent = uniqueRegimes;
}

// Helper: Extract Unique Monthly Macro Data
function getUniqueMonthlyMacroData() {
    const seen = new Set();
    const unique = [];
    rawData.forEach(row => {
        const m = row.Month;
        if (!seen.has(m) && m) {
            seen.add(m);
            unique.push(row);
        }
    });
    unique.sort((a,b) => new Date(a.Month) - new Date(b.Month));
    return unique;
}

function buildAppreciationChart() {
    const segments = ['Studio', '1BR', '2BR', '3BR', '4BR+'];
    const regimes = [...new Set(appreciationData.map(d => d.regime_name).filter(Boolean))].sort();
    
    // Assign specific colors to Regimes matching your illustration theme
    const colors = ['#3b82f6', '#f43f5e', '#10b981', '#a855f7', '#f59e0b'];

    const datasets = regimes.map((r, i) => {
        // Collect data per segment for this regime
        const rData = segments.map(seg => {
            const vals = appreciationData
                .filter(d => d.regime_name === r && d.segment === seg)
                .map(d => d.appreciation_w)
                .filter(v => v !== null && !isNaN(v));
            return vals;
        });

        return {
            label: r,
            backgroundColor: `${colors[i % colors.length]}80`, // transparent fill
            borderColor: colors[i % colors.length],
            borderWidth: 1,
            outlierBackgroundColor: colors[i % colors.length],
            itemRadius: 2,
            data: rData
        };
    });

    const ctx = document.getElementById('appreciationBoxPlot').getContext('2d');
    charts.appreciation = new Chart(ctx, {
        type: 'boxplot',
        data: {
            labels: segments,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            return `${ctx.dataset.label}: Median ${ctx.raw.median.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Apartment Segment' }
                },
                y: {
                    title: { display: true, text: 'MoM Appreciation (%)' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            }
        }
    });
}

function buildRegimeCharts() {
    const macroData = getUniqueMonthlyMacroData();
    const datasets = [];
    const regimes = [...new Set(macroData.map(d => d.Regime))].sort();
    const colors = ['#3b82f6', '#f43f5e', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16'];

    // 1. Scatter Chart
    regimes.forEach((r, i) => {
        const rData = macroData.filter(d => d.Regime === r).map(d => ({
            x: new Date(d.Month).getTime(),
            y: d.FEDFUNDS
        }));
        datasets.push({
            label: r,
            data: rData,
            backgroundColor: colors[i % colors.length],
            borderColor: colors[i % colors.length],
            pointRadius: 6,
            pointHoverRadius: 8
        });
    });

    const scatterCtx = document.getElementById('regimeScatterChart').getContext('2d');
    charts.scatter = new Chart(scatterCtx, {
        type: 'scatter',
        data: { datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { type: 'linear', position: 'bottom', ticks: { callback: function(v) { return new Date(v).getFullYear(); } } },
                y: { title: {display:true, text:'Federal Funds Rate (%)'} }
            },
            plugins: { tooltip: { callbacks: { label: ctx => `${ctx.dataset.label} - FedFunds: ${ctx.raw.y}%` } } }
        }
    });

    // 2. Radar Chart
    const features = ['FEDFUNDS', 'UNRATE', 'PCE_YOY', 'MORTGAGE_SPREAD', 'Net_Hawkishness', 'FinBERT_Hawkish'];
    const stats = {};
    features.forEach(f => {
        const vals = macroData.map(d => d[f] || 0);
        const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
        const std = Math.sqrt(vals.map(v=>Math.pow(v-mean,2)).reduce((a,b)=>a+b,0)/vals.length);
        stats[f] = {mean, std};
    });

    const radarDatasets = regimes.map((r, i) => {
        const rData = macroData.filter(d => d.Regime === r);
        const standardizedMeans = features.map(f => {
            const valsum = rData.reduce((a,b)=>a+(b[f]||0),0);
            const meanVal = valsum/rData.length;
            return stats[f].std > 0 ? (meanVal - stats[f].mean) / stats[f].std : 0;
        });

        return {
            label: r,
            data: standardizedMeans,
            backgroundColor: colors[i % colors.length] + '40',
            borderColor: colors[i % colors.length],
            pointBackgroundColor: colors[i % colors.length]
        };
    });

    const radarCtx = document.getElementById('regimeRadarChart').getContext('2d');
    charts.radar = new Chart(radarCtx, {
        type: 'radar',
        data: { labels: features, datasets: radarDatasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255,255,255,0.1)' },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: { color: '#94a3b8', font: {size: 11} },
                    ticks: { display: false }
                }
            }
        }
    });
}

function setupHousingControls() {
    const nbhoodCounts = {};
    rawData.forEach(row => {
        if(row['Sub-Nbhood']) nbhoodCounts[row['Sub-Nbhood']] = (nbhoodCounts[row['Sub-Nbhood']] || 0) + 1;
    });
    const sortedNbhoods = Object.keys(nbhoodCounts).sort((a,b) => nbhoodCounts[b] - nbhoodCounts[a]).slice(0, 5);
    
    const select = document.getElementById('neighborhoodSelect');
    sortedNbhoods.forEach(nb => {
        const opt = document.createElement('option');
        opt.value = nb; opt.textContent = nb;
        select.appendChild(opt);
    });
    window.topNeighborhoods = sortedNbhoods;
}

function updateHousingChart(filterArg) {
    let filteredData = rawData;
    if(filterArg !== 'All') {
        filteredData = rawData.filter(d => d['Sub-Nbhood'] === filterArg);
    } else {
        filteredData = rawData.filter(d => window.topNeighborhoods.includes(d['Sub-Nbhood']));
    }

    filteredData = filteredData.map(d => {
        let b = d.Beds;
        if(b >= 3) b = "3+";
        return {...d, BedGroup: `${b} Bed`};
    });

    const beds = [...new Set(filteredData.map(d => d.BedGroup))].sort();
    const regimes = [...new Set(filteredData.map(d => d.Regime))].sort();
    const colors = ['#3b82f6', '#f43f5e', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16'];

    const datasets = regimes.map((r, i) => {
        const rData = filteredData.filter(d => d.Regime === r);
        const dataVals = beds.map(b => {
            const rbData = rData.filter(d => d.BedGroup === b).map(d=>d.Median_Sale_Price).filter(v=>v>0);
            if(rbData.length === 0) return 0;
            rbData.sort((x,y)=>x-y);
            const mid = Math.floor(rbData.length/2);
            return rbData.length % 2 !== 0 ? rbData[mid] : (rbData[mid-1] + rbData[mid]) / 2;
        });

        const logDataVals = dataVals.map(v => v > 0 ? Math.log10(v) : null);
        return { label: r, data: logDataVals, backgroundColor: colors[i % colors.length], borderRadius: 4 };
    });

    if(charts.housing) charts.housing.destroy();
    const housingCtx = document.getElementById('housingBoxplotChart').getContext('2d');
    charts.housing = new Chart(housingCtx, {
        type: 'bar',
        data: { labels: beds, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { title: { display: true, text: 'Log10(Median Sale Price)' }, min: 5, max: 7 } },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            if(ctx.raw) {
                                const actualPrice = Math.pow(10, ctx.raw);
                                return `${ctx.dataset.label}: $${Math.round(actualPrice).toLocaleString()}`;
                            }
                            return 'No data';
                        }
                    }
                }
            }
        }
    });
}

function buildCausalityChart() {
    const causeLabels = [
        'FinBERT Hawkish → Fed Funds', 
        'Fed Funds → Housing Prices', 
        'FinBERT Hawkish → Trans. Vol',
        'FinBERT Dovish → Unemp. Rate'
    ];
    const pVals = [0.003, 0.012, 0.045, 0.150]; 
    const sigVals = pVals.map(p => -Math.log10(p));
    
    // Threshold line at 1.301 (-log10(0.05))
    const causalityCtx = document.getElementById('causalityHeatmap').getContext('2d');
    charts.causality = new Chart(causalityCtx, {
        type: 'bar',
        data: {
            labels: causeLabels,
            datasets: [{
                label: 'Granger Link Strength (-log10 p-value)',
                data: sigVals,
                backgroundColor: sigVals.map(v => v > 1.301 ? '#10b981' : '#64748b'),
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: {
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line', xMin: 1.301, xMax: 1.301,
                            borderColor: '#f59e0b', borderWidth: 2, borderDash: [5, 5],
                            label: { display: true, content: 'Significance Threshold (p=0.05)', backgroundColor: 'transparent', color: '#f59e0b'}
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => `p-value: ${Math.pow(10, -ctx.raw).toFixed(4)}`
                    }
                }
            },
            scales: { x: { title: {display: true, text: 'Link Strength'}, min: 0, max: 4 } }
        }
    });
}

function buildModelsCharts() {
    const rmseLabels = ['Baseline Macro', 'FinBERT Sentiment', 'Regime + FinBERT Capstone'];
    const rmseData = [0.4581, 0.4578, 0.3850];

    const rmseCtx = document.getElementById('rmseChart').getContext('2d');
    new Chart(rmseCtx, {
        type: 'bar',
        data: {
            labels: rmseLabels,
            datasets: [{
                label: 'Test RMSE',
                data: rmseData,
                backgroundColor: ['#93c5fd', '#60a5fa', '#2563eb'],
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0.35, max: 0.50 } } }
    });

    const featLabels = ['Beds_2', 'Regime_Expansion', 'Net_Hawkishness', 'FEDFUNDS', 'PCE_YOY'];
    const featImp = [0.28, 0.15, 0.12, 0.08, 0.05];

    const featCtx = document.getElementById('featureChart').getContext('2d');
    new Chart(featCtx, {
        type: 'bar',
        data: {
            labels: featLabels,
            datasets: [{
                label: 'Importance Score',
                data: featImp,
                backgroundColor: '#8b5cf6',
                borderRadius: 4
            }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
    });
}

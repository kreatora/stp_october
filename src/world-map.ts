import * as d3 from 'd3';
import * as XLSX from 'xlsx';
import { geoMercator, geoPath } from 'd3-geo';
import polylabel from 'polylabel';

// Modal functionality for full-screen charts
function openModal() {
    const modal = document.getElementById('chart-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        initializeDragFunctionality();
    }
}

function closeModal() {
    const modal = document.getElementById('chart-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        // Clear modal content
        const modalContent = document.getElementById('modal-content');
        if (modalContent) {
            modalContent.innerHTML = '';
        }
        // Reset modal position
        const modalWindow = document.getElementById('modal-window');
        if (modalWindow) {
            modalWindow.style.transform = '';
        }
    }
}

// Drag functionality for modal
function initializeDragFunctionality() {
    const modalHeader = document.getElementById('modal-header');
    const modalWindow = document.getElementById('modal-window');
    
    if (!modalHeader || !modalWindow) return;
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;
    
    modalHeader.addEventListener('mousedown', (e: MouseEvent) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        // Get current transform values
        const transform = modalWindow.style.transform;
        const matrix = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (matrix) {
            initialX = parseFloat(matrix[1]) || 0;
            initialY = parseFloat(matrix[2]) || 0;
        } else {
            initialX = 0;
            initialY = 0;
        }
        
        modalHeader.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newX = initialX + deltaX;
        const newY = initialY + deltaY;
        
        modalWindow.style.transform = `translate(${newX}px, ${newY}px)`;
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            modalHeader.style.cursor = 'move';
        }
    });
}

// Add close button event listener
document.addEventListener('DOMContentLoaded', () => {
    const closeButton = document.getElementById('close-modal');
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside the content
    const modal = document.getElementById('chart-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
});

// Function to create full-screen pie chart
function createFullScreenPieChart(pieData: any[], countryName: string, globalColorScale: any) {
    const modalContent = document.getElementById('modal-content');
    const modalTitle = document.getElementById('modal-title');
    if (!modalContent) return;

    // Set modal title
    if (modalTitle) {
        modalTitle.textContent = `Policy Distribution - ${countryName}`;
    }

    modalContent.innerHTML = `
        <div id="fullscreen-pie-chart" class="w-full h-full"></div>
    `;

    // Add a small delay to ensure the modal is fully rendered
    setTimeout(() => {
        const container = document.getElementById('fullscreen-pie-chart');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        // Fully responsive sizing based on container dimensions
        const isSmallScreen = containerRect.width < 768;
        
        // Calculate available space using percentages
        const availableWidth = containerRect.width;
        const availableHeight = containerRect.height;
        
        // Reserve space for legend using percentages of container
        const legendHeightPercent = isSmallScreen ? 0.25 : 0; // 25% of height for horizontal legend
        const legendWidthPercent = isSmallScreen ? 0 : 0.28; // 28% of width for vertical legend
        
        const legendHeight = availableHeight * legendHeightPercent;
        const legendWidth = availableWidth * legendWidthPercent;
        
        const chartAreaWidth = availableWidth - legendWidth;
        const chartAreaHeight = availableHeight - legendHeight;
        
        // Calculate chart size as percentage of available area
        const chartSizePercent = isSmallScreen ? 0.85 : 0.75; // Use 85% on small screens, 75% on larger
        const chartSize = Math.min(chartAreaWidth * chartSizePercent, chartAreaHeight * chartSizePercent);
        const radius = chartSize / 2 - (chartSize * 0.1); // 10% padding relative to chart size

        // Create main container with proper constraints
        const mainContainer = d3.select(container).append('div')
            .style('display', 'flex')
            .style('flex-direction', isSmallScreen ? 'column' : 'row')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('width', '100%')
            .style('height', '100%')
            .style('gap', isSmallScreen ? '20px' : '30px')
            .style('padding', '20px')
            .style('box-sizing', 'border-box')
            .style('overflow', 'hidden');

        // Chart container with fixed size
        const chartContainer = mainContainer.append('div')
            .style('display', 'flex')
            .style('justify-content', 'center')
            .style('align-items', 'center')
            .style('flex-shrink', '0')
            .style('width', `${chartSize}px`)
            .style('height', `${chartSize}px`);

        const svg = chartContainer
            .append('svg')
            .attr('width', chartSize)
            .attr('height', chartSize);

        const g = svg.append('g')
            .attr('transform', `translate(${chartSize / 2}, ${chartSize / 2})`);

        const pie = d3.pie<any>()
            .value(d => d.count)
            .sort(null);

        const arc = d3.arc<any>()
            .innerRadius(0)
            .outerRadius(radius);

        const totalCount = d3.sum(pieData, d => d.count);

        // Create pie slices
        const slices = g.selectAll('.slice')
            .data(pie(pieData))
            .enter()
            .append('g')
            .attr('class', 'slice');

        slices.append('path')
            .attr('d', arc)
            .attr('fill', d => globalColorScale(d.data.type) as string)
            .attr('stroke', 'white')
            .attr('stroke-width', 3);

        // Add labels
        const labelFontSize = isSmallScreen ? '12px' : '16px';
        slices.append('text')
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .attr('font-size', labelFontSize)
            .attr('fill', 'white')
            .attr('font-weight', 'bold')
            .text(d => {
                const percentage = Math.round((d.data.count / totalCount) * 100);
                return `${percentage}%`;
            });

        // Create fully responsive legend container
        const legendContainer = mainContainer.append('div')
            .style('display', 'flex')
            .style('flex-direction', isSmallScreen ? 'row' : 'column')
            .style('flex-wrap', isSmallScreen ? 'wrap' : 'nowrap')
            .style('gap', isSmallScreen ? '1vw' : '1.5vh') // Responsive gap based on viewport
            .style('align-items', isSmallScreen ? 'center' : 'flex-start')
            .style('justify-content', isSmallScreen ? 'center' : 'flex-start')
            .style('flex-shrink', '0')
            .style('width', isSmallScreen ? '100%' : `${legendWidthPercent * 100}%`) // Use calculated percentage
            .style('height', isSmallScreen ? `${legendHeightPercent * 100}%` : 'auto') // Use calculated percentage
            .style('max-width', '100%')
            .style('max-height', '100%')
            .style('overflow', 'auto')
            .style('padding', isSmallScreen ? '1vh' : '1vw') // Responsive padding
            .style('box-sizing', 'border-box');

        pieData.forEach((d) => {
            const legendItemGap = isSmallScreen ? '0.5vw' : '0.8vh'; // Responsive gap
            const legendItem = legendContainer.append('div')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('gap', legendItemGap);

            const legendBoxSize = isSmallScreen ? '1.8vw' : '2vh'; // Responsive box size
            legendItem.append('div')
                .style('width', legendBoxSize)
                .style('height', legendBoxSize)
                .style('min-width', '12px') // Minimum size for very small screens
                .style('min-height', '12px')
                .style('max-width', '24px') // Maximum size for very large screens
                .style('max-height', '24px')
                .style('background-color', globalColorScale(d.type) as string)
                .style('border-radius', '3px')
                .style('flex-shrink', '0');

            const legendTextSize = isSmallScreen ? 'clamp(10px, 1.4vw, 16px)' : 'clamp(12px, 1.6vh, 18px)'; // Responsive text with limits
            legendItem.append('span')
                .style('font-size', legendTextSize)
                .style('font-weight', 'bold')
                .style('white-space', 'nowrap')
                .style('overflow', 'hidden')
                .style('text-overflow', 'ellipsis')
                .text(`${d.type}: ${d.count}`);
        });
    }, 100); // 100ms delay to ensure modal is rendered
}

// Function to create full-screen time series chart (stacked bar chart)
function createFullScreenTimeSeriesChart(timeSeriesChartData: any[], countryName: string, globalColorScale: any) {
    const modalContent = document.getElementById('modal-content');
    const modalTitle = document.getElementById('modal-title');
    if (!modalContent) return;

    // Set modal title
    if (modalTitle) {
        modalTitle.textContent = `Policy Evolution Over Time - ${countryName}`;
    }

    modalContent.innerHTML = `
        <div id="fullscreen-timeseries-chart" class="w-full h-full"></div>
    `;

    // Add a small delay to ensure the modal is fully rendered
    setTimeout(() => {
        const container = document.getElementById('fullscreen-timeseries-chart');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        // Responsive margins for smaller screens
        const isSmallScreen = containerRect.width < 768;
        const margin = isSmallScreen 
            ? { top: 30, right: 60, bottom: 60, left: 120 }
            : { top: 40, right: 80, bottom: 80, left: 140 };
        const width = containerRect.width - margin.left - margin.right;
        const extraSpace = isSmallScreen ? 60 : 100;
        const height = containerRect.height - margin.top - margin.bottom - extraSpace;

        // Collect measures and years; build presence matrix
        const measures = new Set<string>();
        const years = new Set<number>();
        timeSeriesChartData.forEach(measureData => {
            measures.add(measureData.measure);
            measureData.values.forEach((v: any) => years.add(Number(v.year)));
        });

        const sortedYears = Array.from(years).sort((a, b) => a - b);
        const allPolicyTypes = Array.from(measures);
        const yearlyData: { [year: number]: { [measure: string]: number } } = {};
        sortedYears.forEach(year => { yearlyData[year] = {}; });
        sortedYears.forEach(year => {
            timeSeriesChartData.forEach(measureData => {
                const yearData = measureData.values.find((v: any) => Number(v.year) === year);
                if (yearData && Number(yearData.count) > 0) {
                    yearlyData[year][measureData.measure] = 1;
                }
            });
        });

        // Compute frequency per policy type and sort ascending (least at top, most at bottom)
        const frequencyByMeasure: { [m: string]: number } = {};
        allPolicyTypes.forEach(m => {
            frequencyByMeasure[m] = sortedYears.reduce((acc, y) => acc + (yearlyData[y][m] ? 1 : 0), 0);
        });
        const sortedPolicyTypes = allPolicyTypes.slice().sort((a, b) => frequencyByMeasure[a] - frequencyByMeasure[b]);

        const svgHeightOffset = isSmallScreen ? 30 : 50;
        const svg = d3.select(container)
            .append('svg')
            .attr('width', containerRect.width)
            .attr('height', containerRect.height - svgHeightOffset);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        // Scales: x years, y policy types as rows
        const xScale = d3.scaleBand()
            .domain(sortedYears.map(String))
            .range([0, width])
            .padding(0.05);

        const yBand = d3.scaleBand()
            .domain(sortedPolicyTypes)
            .range([0, height])
            .padding(0.1);

        // Add axes with adaptive tick density for readability
        const axisFontSize = isSmallScreen ? '11px' : '14px';
        const xDomainFS = xScale.domain();
        const stepFS = xDomainFS.length > 24 ? 3 : (xDomainFS.length > 14 ? 2 : 1);
        const xTicksFS = xDomainFS.filter((_, i) => i % stepFS === 0);
        const xAxisFS = g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickValues(xTicksFS))
            .style('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif');
        xAxisFS.selectAll('text')
            .style('font-size', axisFontSize)
            .style('text-anchor', 'middle')
            .attr('dx', '0')
            .attr('dy', '0');
        const yAxisFS = g.append('g').call(d3.axisLeft(yBand));
        yAxisFS.selectAll('text').style('font-size', axisFontSize);
        xAxisFS.select('.domain').style('stroke', '#e2e8f0').style('stroke-width', 1);
        yAxisFS.select('.domain').style('stroke', '#e2e8f0').style('stroke-width', 1);

        // Build cell data: one rect per active policy in that year
        const cells: { year: number; measure: string }[] = [];
        sortedYears.forEach(year => {
            sortedPolicyTypes.forEach(measure => {
                if (yearlyData[year][measure]) {
                    cells.push({ year, measure });
                }
            });
        });

        // Draw rows of cells (non-stacked)
        g.selectAll('.policy-cell')
            .data(cells)
            .enter()
            .append('rect')
            .attr('class', 'policy-cell')
            .attr('x', d => xScale(String(d.year)) || 0)
            .attr('y', d => yBand(d.measure) || 0)
            .attr('width', xScale.bandwidth())
            .attr('height', yBand.bandwidth())
            .attr('rx', 4)
            .attr('ry', 4)
            .attr('fill', d => globalColorScale(d.measure) as string)
            .style('opacity', 0.95)
            .style('cursor', 'pointer')
            .style('stroke', 'rgba(255,255,255,0.6)')
            .style('stroke-width', 1)
            .on('mouseover', function() {
                d3.select(this)
                    .style('opacity', 1)
                    .style('stroke', 'rgba(17, 24, 39, 0.5)')
                    .style('stroke-width', 1.5)
                    .style('filter', 'saturate(1.6) contrast(1.15)');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('opacity', 0.95)
                    .style('stroke', 'rgba(255,255,255,0.6)')
                    .style('stroke-width', 1)
                    .style('filter', 'none');
            });

        // Grid lines: horizontal by policy row, vertical by year
        const grid = g.append('g').attr('class','grid');
        grid.selectAll('.hline')
            .data(sortedPolicyTypes)
            .enter().append('line')
            .attr('class','hline')
            .attr('x1', 0)
            .attr('x2', width)
            .attr('y1', d => (yBand(d) || 0) + yBand.bandwidth())
            .attr('y2', d => (yBand(d) || 0) + yBand.bandwidth())
            .style('stroke', '#e2e8f0')
            .style('stroke-dasharray', '2,2')
            .style('opacity', 0.2);
        grid.selectAll('.vline')
            .data(sortedYears)
            .enter().append('line')
            .attr('class','vline')
            .attr('y1', 0)
            .attr('y2', height)
            .attr('x1', d => (xScale(String(d)) || 0) + xScale.bandwidth())
            .attr('x2', d => (xScale(String(d)) || 0) + xScale.bandwidth())
            .style('stroke', '#e2e8f0')
            .style('stroke-dasharray', '2,2')
            .style('opacity', 0.08);

        // No legend needed; y-axis labels identify policy rows

        // Add axis labels
        const axisLabelFontSize = isSmallScreen ? '12px' : '16px';
        const axisLabelBottomOffset = isSmallScreen ? 15 : 20;
        
        // Removed vertical y-axis label to declutter the chart

        g.append('text')
            .attr('transform', `translate(${width / 2}, ${height + margin.bottom - axisLabelBottomOffset})`)
            .style('text-anchor', 'middle')
            .style('font-size', axisLabelFontSize)
            .style('font-weight', 'bold')
            .text('Year');
    }, 100); // 100ms delay to ensure modal is rendered
}

const countryCodeMapping: { [key: string]: string } = {
    "AFG": "AF", "AGO": "AO", "ALB": "AL", "ARE": "AE", "ARG": "AR",
    "ARM": "AM", "ATA": "AQ", "ATF": "TF", "AUS": "AU", "AUT": "AT",
    "AZE": "AZ", "BDI": "BI", "BEL": "BE", "BEN": "BJ", "BFA": "BF",
    "BGD": "BD", "BGR": "BG", "BHS": "BS", "BIH": "BA", "BLR": "BY",
    "BLZ": "BZ", "BOL": "BO", "BRA": "BR", "BRN": "BN", "BTN": "BT",
    "BWA": "BW", "CAF": "CF", "CAN": "CA", "CHE": "CH", "CHL": "CL",
    "CHN": "CN", "CIV": "CI", "CMR": "CM", "COD": "CD", "COG": "CG",
    "COL": "CO", "CRI": "CR", "CUB": "CU", /* N. Cyprus */ "-99": "CY",
    "CYP": "CY", "CZE": "CZ", "DEU": "DE", "DJI": "DJ", "DNK": "DK",
    "DOM": "DO", "DZA": "DZ", "ECU": "EC", "EGY": "EG", "ERI": "ER",
    "ESP": "ES", "EST": "EE", "ETH": "ET", "FIN": "FI", "FJI": "FJ",
    "FLK": "FK", "FRA": "FR", "GAB": "GA", "GBR": "GB", "GEO": "GE",
    "GHA": "GH", "GIN": "GN", "GMB": "GM", "GNB": "GW", "GNQ": "GQ",
    "GRC": "GR", "GTM": "GT", "GUY": "GY", "HND": "HN", "HRV": "HR",
    "HTI": "HT", "HUN": "HU", "IDN": "ID", "IND": "IN", "IRL": "IE",
    "IRN": "IR", "IRQ": "IQ", "ISL": "IS", "ISR": "IL", "ITA": "IT",
    "JAM": "JM", "JOR": "JO", "JPN": "JP", "KAZ": "KZ", "KEN": "KE",
    "KGZ": "KG", "KHM": "KH", "KOR": "KR", "KWT": "KW", "LAO": "LA",
    "LBN": "LB", "LBR": "LR", "LBY": "LY", "LKA": "LK", "LSO": "LS",
    "LTU": "LT", "LUX": "LU", "LVA": "LV", "MAR": "MA", "MDA": "MD",
    "MDG": "MG", "MEX": "MX", "MKD": "MK", "MLI": "ML", "MMR": "MM",
    "MNE": "ME", "MNG": "MN", "MOZ": "MZ", "MRT": "MR", "MWI": "MW",
    "MYS": "MY", "NAM": "NA", "NCL": "NC", "NER": "NE", "NGA": "NG",
    "NIC": "NI", "NLD": "NL", "NOR": "NO", "NPL": "NP", "NZL": "NZ",
    "OMN": "OM", "PAK": "PK", "PAN": "PA", "PER": "PE", "PHL": "PH",
    "PNG": "PG", "POL": "PL", "PRI": "PR", "PRK": "KP", "PRT": "PT",
    "PRY": "PY", "QAT": "QA", "ROU": "RO", "RUS": "RU", "RWA": "RW",
    "ESH": "EH", "SAU": "SA", "SDN": "SD", "SSD": "SS", "SEN": "SN",
    "SLB": "SB", "SLE": "SL", "SLV": "SV", "SOM": "SO", "SRB": "RS",
    "SUR": "SR", "SVK": "SK", "SVN": "SI", "SWE": "SE", "SWZ": "SZ",
    "SYR": "SY", "TCD": "TD", "TGO": "TG", "THA": "TH", "TJK": "TJ",
    "TKM": "TM", "TLS": "TL", "TTO": "TT", "TUN": "TN", "TUR": "TR",
    "TWN": "TW", "TZA": "TZ", "UGA": "UG", "UKR": "UA", "URY": "UY",
    "USA": "US", "UZB": "UZ", "VEN": "VE", "VNM": "VN", "VUT": "VU",
    "YEM": "YE", "ZAF": "ZA", "ZMB": "ZM", "ZWE": "ZW"
};

// Set dimensions for the map
const width = 1200;
const height = 700;

const svg = d3.select("#world-map")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

const g = svg.append("g");

const projection = geoMercator()
    .scale(150)
    .translate([width / 2, height / 1.6]);

const path = geoPath().projection(projection);

const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")
    .style("background", "rgba(255,255,255,0.8)")
    .style("border", "1px solid #ccc")
    .style("padding", "10px")
    .style("border-radius", "5px")
    .style("font-family", "sans-serif")
    .style("font-size", "14px");

const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .translateExtent([[-500, -500], [width + 500, height + 500]])
    .on('zoom', (event) => {
        g.attr('transform', event.transform);
    });

svg.call(zoom as any);

const countryCode2to3 = Object.fromEntries(Object.entries(countryCodeMapping).map(([k, v]) => [v, k]));

const policyDataUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRMpij3w_R0ZWyvWT8zBSi25VKx1X928VAfxc8FKBp6hanTbEkbgEs_V5XuR1koFRwtY3qvjh4ew_kk/pub?gid=1648232698&single=true&output=csv';
const targetsDataUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRZKEDLZNIvWdVYvdT-Re-GKVf_cRG2TfdVOxViBloLyHa5bbLukwBy19n1aNw3O3S_SPACFLWpTMn-/pub?gid=4146846&single=true&output=csv';
const climateTargetsDataUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRZKEDLZNIvWdVYvdT-Re-GKVf_cRG2TfdVOxViBloLyHa5bbLukwBy19n1aNw3O3S_SPACFLWpTMn-/pub?gid=351569358&single=true&output=csv';

const baseUrl = (import.meta as any).env.BASE_URL || '/';

// Global variables to store all data
let currentMapType: 'policies' | 'ev' | 'targets' | 'climateTargets' = 'policies';
 let currentTargetType = 'Electricity'; // Default target type
 // Year-group filter for targets view (default to 'latest')
 let currentTargetYearGroup: '2020' | '2030' | '2050' | 'latest' = 'latest';
 // Filter mode: always use year-group filtering (no UI toggle)
 let currentTargetFilterMode: 'all' | 'group' = 'group';
 // Year-group filter for climate targets view (default to 'latest')
 let currentClimateTargetYearGroup: '2020' | '2030' | '2050' | 'latest' = 'latest';
 
 // Helper to map a target year to a year group
 function getYearGroup(year: number): '2020' | '2030' | '2050' | null {
     if (!Number.isFinite(year)) return null;
     // Groups as described: 
     // 2020: targets until 2020 plus 5 years => <= 2025
     // 2030: 2025 to 2035 (inclusive overlap at boundaries)
     // 2050: 2035 to 2050
     if (year <= 2025) return '2020';
     if (year >= 2025 && year <= 2035) return '2030';
     if (year >= 2035 && year <= 2050) return '2050';
     return null;
 }
let allData: any = {};

// Flag to track if submenu has been initialized
let submenuInitialized = false;

// Global reference to updateMap function
let updateMapFunction: (() => void) | null = null;

// Function to map target type names to user-friendly display names
function getTargetTypeDisplayName(targetType: string): string {
    // Normalize the target type for comparison
    const normalizedType = targetType.trim();
    
    const displayNameMap: { [key: string]: string } = {
        'Electricity': 'Share of Renewables on Electricity Production',
        'electricity': 'Share of Renewables on Electricity Production',
        'Final energy': 'Share of Renewables on Final Energy Consumption',
        'Primary energy': 'Share of Renewables on Primary Energy Consumption',
        'Heating and cooling': 'Share of Renewables on Heating and Cooling',
        'Transport': 'Share of Electric Vehicles on Transportation',
        'Transportation': 'Share of Electric Vehicles on Transportation',
        'transport': 'Share of Electric Vehicles on Transportation',
        'transportation': 'Share of Electric Vehicles on Transportation',
        'EV': 'Share of Electric Vehicles on Transportation'
    };
    
    return displayNameMap[normalizedType] || targetType;
}

// Function to initialize targets submenu
function initializeTargetsSubmenu() {
    const submenuOptions = document.getElementById('submenuOptions');
    const submenu = document.getElementById('targetsSubmenu');
    const submenuClose = document.getElementById('submenuClose');
    const yearGroupOptions = document.getElementById('yearGroupOptions');
    const yearGroupWrapper = document.getElementById('yearGroupWrapper');
    const filterModeOptions = document.getElementById('filterModeOptions');
    
    if (!submenuOptions || !submenu || !submenuClose) return;
    
    // Get available target types
    const targetTypes = allData.targets.allTargetTypes || [];
    console.log('Initializing submenu with target types:', targetTypes);
    
    // Only initialize if not already done or if target types have changed
    if (!submenuInitialized || submenuOptions.children.length !== targetTypes.length) {
        // Clear existing options
        submenuOptions.innerHTML = '';
        
        // Filter mode UI removed; always show year-group controls
        if (yearGroupWrapper) yearGroupWrapper.classList.remove('hidden');
        
        // Initialize year-group options once
        if (yearGroupOptions && yearGroupOptions.children.length === 0) {
            const groups: Array<'2020' | '2030' | '2050' | 'latest'> = ['latest', '2020', '2030', '2050'];
            groups.forEach(group => {
                const btn = document.createElement('button');
                btn.className = 'year-option';
                btn.textContent = group === 'latest' ? 'Latest Target' : group;
                if (group === currentTargetYearGroup) btn.classList.add('active');
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    currentTargetYearGroup = group;
                    // Update active state
                    yearGroupOptions.querySelectorAll('.year-option').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    // Refresh map
                    if (updateMapFunction) updateMapFunction();
                });
                yearGroupOptions.appendChild(btn);
            });
        }
        
        // Create submenu options for each target type
        targetTypes.forEach((targetType: string) => {
            const option = document.createElement('button');
            option.className = 'submenu-option';
            const displayName = getTargetTypeDisplayName(targetType);
            console.log(`Target type "${targetType}" → Display name "${displayName}"`);
            option.textContent = displayName;
            option.dataset.targetType = targetType;
            
            // Set active state for current target type
            if (targetType === currentTargetType) {
                option.classList.add('active');
            }
            
            // Add click event listener
             option.addEventListener('click', (e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 console.log('Target type clicked:', targetType);
                 
                 // Update current target type and map type
                 currentTargetType = targetType;
                 currentMapType = 'targets';
                 
                 console.log('Updated currentTargetType to:', currentTargetType);
                 
                 // Update active state
                 submenuOptions.querySelectorAll('.submenu-option').forEach(opt => {
                     opt.classList.remove('active');
                 });
                 option.classList.add('active');
                 
                 // Update map with new target type
                  console.log('Calling updateMap for target type:', targetType);
                  if (updateMapFunction) {
                      updateMapFunction();
                  } else {
                      console.error('updateMap function not available yet');
                  }
                 
                 // Don't hide submenu immediately - let user see the change and potentially select other types
                 // hideTargetsSubmenu();
             });
            
            submenuOptions.appendChild(option);
        });
        
        // Add close button event listener (only once)
        if (!submenuInitialized) {
            submenuClose.addEventListener('click', hideTargetsSubmenu);
        }
        
        submenuInitialized = true;
    } else {
        // Just update active states if submenu already exists
        submenuOptions.querySelectorAll('.submenu-option').forEach(opt => {
            opt.classList.remove('active');
            const optElement = opt as HTMLElement;
            if (optElement.dataset.targetType === currentTargetType) {
                opt.classList.add('active');
            }
        });
    }
}

// Function to show targets submenu
function showTargetsSubmenu() {
    // Initialize submenu first to populate target types
    initializeTargetsSubmenu();
    
    const submenu = document.getElementById('targetsSubmenu');
    if (submenu) {
        submenu.classList.add('visible');
    }
}

// Function to hide targets submenu
function hideTargetsSubmenu() {
    const submenu = document.getElementById('targetsSubmenu');
    if (submenu) {
        submenu.classList.remove('visible');
    }
}

// Function to initialize climate targets submenu
let climateSubmenuInitialized = false;

function initializeClimateTargetsSubmenu() {
    const climateYearGroupOptions = document.getElementById('climateYearGroupOptions');
    const climateSubmenu = document.getElementById('climateTargetsSubmenu');
    const climateSubmenuClose = document.getElementById('climateSubmenuClose');
    const climateYearGroupWrapper = document.getElementById('climateYearGroupWrapper');
    
    if (!climateYearGroupOptions || !climateSubmenu || !climateSubmenuClose) return;
    
    console.log('Initializing climate targets submenu');
    
    // Only initialize if not already done
    if (!climateSubmenuInitialized) {
        // Always show year-group controls
        if (climateYearGroupWrapper) climateYearGroupWrapper.classList.remove('hidden');
        
        // Initialize year-group options
        if (climateYearGroupOptions && climateYearGroupOptions.children.length === 0) {
            const groups: Array<'2020' | '2030' | '2050' | 'latest'> = ['latest', '2020', '2030', '2050'];
            groups.forEach(group => {
                const btn = document.createElement('button');
                btn.className = 'year-option';
                btn.textContent = group === 'latest' ? 'Latest Target' : group;
                if (group === currentClimateTargetYearGroup) btn.classList.add('active');
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    currentClimateTargetYearGroup = group;
                    // Update active state
                    climateYearGroupOptions.querySelectorAll('.year-option').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    // Refresh map
                    if (updateMapFunction) updateMapFunction();
                });
                climateYearGroupOptions.appendChild(btn);
            });
        }
        
        // Add close button event listener (only once)
        if (!climateSubmenuInitialized) {
            climateSubmenuClose.addEventListener('click', hideClimateTargetsSubmenu);
        }
        
        climateSubmenuInitialized = true;
    }
}

// Function to show climate targets submenu
function showClimateTargetsSubmenu() {
    // Initialize submenu first
    initializeClimateTargetsSubmenu();
    
    const submenu = document.getElementById('climateTargetsSubmenu');
    if (submenu) {
        submenu.classList.add('visible');
    }
}

// Function to hide climate targets submenu
function hideClimateTargetsSubmenu() {
    const submenu = document.getElementById('climateTargetsSubmenu');
    if (submenu) {
        submenu.classList.remove('visible');
    }
}

// Loading indicator functions
function showLoadingIndicator() {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.classList.add('visible');
    }
}

function hideLoadingIndicator() {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.classList.remove('visible');
    }
}

// Show loading indicator when starting to load data
showLoadingIndicator();

Promise.all([
    d3.json(`${baseUrl}world.geojson`),
    d3.csv(policyDataUrl),
    d3.csv(targetsDataUrl),
    d3.csv(climateTargetsDataUrl)
]).then(([geoData, policyCsv, targetsCsv, climateTargetsCsv]: [any, any, any, any]) => {
    console.log('Data loaded successfully:');
    console.log('Policy CSV rows:', policyCsv.length);
    console.log('Targets CSV rows:', targetsCsv.length);
    console.log('Climate Targets CSV rows:', climateTargetsCsv.length);
    console.log('First few targets rows:', targetsCsv.slice(0, 3));
    console.log('First few climate targets rows:', climateTargetsCsv.slice(0, 3));
    
    // If targets CSV is empty or malformed, use sample data
    if (!targetsCsv || targetsCsv.length === 0 || !targetsCsv[0] || Object.keys(targetsCsv[0]).length < 5) {
        console.log('Targets CSV appears to be empty or malformed, using sample data');
        targetsCsv = [
            { 'Country': 'DEU', 'A': 'DEU', 'F': '2021-06-01', 'H': '2030', 'K': '65' },
            { 'Country': 'FRA', 'A': 'FRA', 'F': '2020-04-15', 'H': '2030', 'K': '40' },
            { 'Country': 'ESP', 'A': 'ESP', 'F': '2021-03-20', 'H': '2030', 'K': '42' },
            { 'Country': 'ITA', 'A': 'ITA', 'F': '2020-12-10', 'H': '2030', 'K': '30' },
            { 'Country': 'GBR', 'A': 'GBR', 'F': '2021-04-22', 'H': '2030', 'K': '40' },
            { 'Country': 'NLD', 'A': 'NLD', 'F': '2019-06-28', 'H': '2030', 'K': '70' },
            { 'Country': 'DNK', 'A': 'DNK', 'F': '2020-06-25', 'H': '2030', 'K': '50' },
            { 'Country': 'SWE', 'A': 'SWE', 'F': '2017-06-15', 'H': '2030', 'K': '100' },
            { 'Country': 'NOR', 'A': 'NOR', 'F': '2016-06-11', 'H': '2030', 'K': '67.5' },
            { 'Country': 'USA', 'A': 'USA', 'F': '2021-04-22', 'H': '2030', 'K': '50' },
            { 'Country': 'CAN', 'A': 'CAN', 'F': '2020-12-11', 'H': '2030', 'K': '90' },
            { 'Country': 'JPN', 'A': 'JPN', 'F': '2020-10-26', 'H': '2030', 'K': '36-38' },
            { 'Country': 'AUS', 'A': 'AUS', 'F': '2021-10-26', 'H': '2030', 'K': '43' },
            { 'Country': 'BRA', 'A': 'BRA', 'F': '2021-04-22', 'H': '2030', 'K': '45' },
            { 'Country': 'IND', 'A': 'IND', 'F': '2021-11-01', 'H': '2030', 'K': '50' },
            { 'Country': 'CHN', 'A': 'CHN', 'F': '2020-09-22', 'H': '2030', 'K': '25' }
        ];
    } else {
        console.log('Successfully loaded targets CSV with', targetsCsv.length, 'rows');
        console.log('First row keys:', Object.keys(targetsCsv[0]));
        console.log('First few rows:', targetsCsv.slice(0, 3));
    }

    console.log("D3 detected columns:", policyCsv.columns);

    // Determine the policy_changed_detail column (case-insensitive). Fallback to 'policy_changed'.
    const policyChangedDetailColumnName = (() => {
        const cols = policyCsv.columns || [];
        const byDetail = cols.find((n: string) => n && n.trim().toLowerCase() === 'policy_changed_detail');
        if (byDetail) return byDetail;
        const byChanged = cols.find((n: string) => n && n.trim().toLowerCase() === 'policy_changed');
        return byChanged || null;
    })();

    function isIntroduced(row: any): boolean {
        if (!policyChangedDetailColumnName) {
            // If we cannot locate the policy_changed_detail column, skip counting
            return false;
        }
        const raw = row[policyChangedDetailColumnName];
        if (raw == null) return false;
        const v = String(raw).trim().toLowerCase();
        return v === 'introduced';
    }

    const countryNameMap = geoData.features.reduce((acc: { [key: string]: string }, feature: any) => {
        acc[feature.properties.name] = feature.id;
        return acc;
    }, {});

    // Collect all unique policy types (measures) and technology types for consistent color mapping
    const policyTypesSet = new Set<string>();
    const technologyTypesSet = new Set<string>();
    policyCsv.forEach((row: any) => {
        const measure = row.measure ? String(row.measure) : 'Unknown';
        policyTypesSet.add(measure);
        const tech = row.Technology_type ? String(row.Technology_type) : 'Unknown';
        technologyTypesSet.add(tech);
    });
    const allPolicyTypes = Array.from(policyTypesSet).sort();
    const allTechnologyTypes = Array.from(technologyTypesSet).sort();
    
    // Create global color mapping for policy types
    // Muted, desaturated palette (no pure black). Designed for a calm, standardized look.
    const mutedPalette = [
            '#8fb9e0', // soft blue
            '#f4b37d', // muted orange
            '#9fd18b', // soft green
            '#e79aa0', // muted coral
            '#b7a6d9', // soft purple
            '#c7a58a', // muted tan
            '#e6a9c8', // soft pink
            '#9bb8bf', // slate teal
            '#c9c97a', // muted olive
            '#86cdd3', // soft cyan
            '#b9d7ef', // light blue
            '#f7cfa2', // light orange
            '#cfe8b9', // light green
            '#e8b9bd', // light red
            '#d6c3e9', // light purple
            '#b8c6da'  // blue-gray
        ];
    const globalColorScale = d3.scaleOrdinal()
        .domain(allPolicyTypes)
        .range(mutedPalette);
    const globalTechColorScale = d3.scaleOrdinal()
        .domain(allTechnologyTypes)
        .range(mutedPalette);

    // Helper: consistent color for measures (policy types), with override for tender/auction
    function getMeasureColor(measure: string): string {
        const m = String(measure || 'Unknown');
        const ml = m.toLowerCase();
        // Compute a dark blue that keeps the palette's saturation
        const ref = d3.hsl('#8fb9e0');
        const tenderBlue = d3.hsl(220, ref.s, Math.max(0, ref.l - 0.25)).toString();
        if (ml.includes('tender') || ml.includes('auction')) return tenderBlue;
        return (globalColorScale(m) as string) || '#8fb9e0';
    }
    
    // Process policy data to count total policies per country
    const policyData = policyCsv.reduce((acc: { [key: string]: number }, row: any) => {
        // Only count policies with Status === 'introduced'
        if (!isIntroduced(row)) return acc;
        const countryName = row.country;
        if (countryName) {
            const countryCode3 = countryNameMap[countryName];
            if (countryCode3) {
                if (!acc[countryCode3]) {
                    acc[countryCode3] = 0;
                }
                acc[countryCode3]++;
            } else {
                // console.warn(`No country code found for: ${countryName}`);
            }
        }
        return acc;
    }, {});

    // Process policy types (Technology_type column) per country for pie charts
    const policyTypeData = policyCsv.reduce((acc: { [key: string]: { [key: string]: number } }, row: any) => {
        // Only include policies with Status === 'introduced'
        if (!isIntroduced(row)) return acc;
        const countryName = row.country;
        const technologyType = row.Technology_type || 'Unknown';
        
        if (countryName) {
            const countryCode3 = countryNameMap[countryName];
            if (countryCode3) {
                if (!acc[countryCode3]) {
                    acc[countryCode3] = {};
                }
                if (!acc[countryCode3][technologyType]) {
                    acc[countryCode3][technologyType] = 0;
                }
                acc[countryCode3][technologyType]++;
            }
        }
        return acc;
    }, {});

    // Process time series data: model yearly active policy types using events
    // Build events per country+measure, then expand to yearly active states
    const activationKeywords = ['introduc', 'reintr', 'resume', 'reactiv', 'adopt', 'pass', 'enact', 'implement', 'launch', 'start'];
    const deactivationKeywords = ['suspend', 'terminat', 'repeal', 'remove', 'expire', 'cancel', 'end', 'discontinu', 'phase', 'sunset', 'halt'];
    const classifyEvent = (detail: string): 'activate' | 'deactivate' | 'other' => {
        const v = detail.toLowerCase();
        if (activationKeywords.some(k => v.includes(k))) return 'activate';
        if (deactivationKeywords.some(k => v.includes(k))) return 'deactivate';
        return 'other';
    };

    // Collect events grouped by country and measure
    const eventsByCountryMeasure: { [country: string]: { [measure: string]: Array<{ year: number, type: 'activate' | 'deactivate' }> } } = {};
    let globalMinYear: number | null = null;
    let globalMaxYear: number | null = null;

    policyCsv.forEach((row: any) => {
        const countryName = row.country;
        const measure = row.measure || 'Unknown';
        const rawYear = row.year;
        const rawDetail = policyChangedDetailColumnName ? row[policyChangedDetailColumnName] : null;
        const yearNum = rawYear != null ? Number(rawYear) : NaN;
        const detailStr = rawDetail != null ? String(rawDetail) : '';
        if (!countryName || !Number.isFinite(yearNum)) return;
        const eventType = classifyEvent(detailStr);
        if (eventType === 'other') return; // skip non-state-changing events
        const countryCode3 = countryNameMap[countryName];
        if (!countryCode3) return;

        if (!eventsByCountryMeasure[countryCode3]) eventsByCountryMeasure[countryCode3] = {};
        if (!eventsByCountryMeasure[countryCode3][measure]) eventsByCountryMeasure[countryCode3][measure] = [];
        eventsByCountryMeasure[countryCode3][measure].push({ year: yearNum, type: eventType });

        if (globalMinYear === null || yearNum < globalMinYear) globalMinYear = yearNum;
        if (globalMaxYear === null || yearNum > globalMaxYear) globalMaxYear = yearNum;
    });

    // Ensure we have a sensible year range; extend to 2025 for visibility
    const minYearForSeries = globalMinYear != null ? globalMinYear : 1990;
    const maxYearForSeries = Math.max(globalMaxYear != null ? globalMaxYear : minYearForSeries, 2025);

    // Expand events into yearly active flags per country and measure
    const timeSeriesData: { [country: string]: { [year: number]: { [measure: string]: number } } } = {};
    Object.entries(eventsByCountryMeasure).forEach(([countryCode3, measuresMap]) => {
        if (!timeSeriesData[countryCode3]) timeSeriesData[countryCode3] = {};

        // For each measure, compute active state over years
        Object.entries(measuresMap).forEach(([measure, events]) => {
            // Sort events by year ascending
            events.sort((a, b) => a.year - b.year);
            let active = false;
            const eventsByYear: { [y: number]: Array<'activate' | 'deactivate'> } = {};
            events.forEach(e => {
                if (!eventsByYear[e.year]) eventsByYear[e.year] = [];
                eventsByYear[e.year].push(e.type);
            });

            for (let y = minYearForSeries; y <= maxYearForSeries; y++) {
                // Apply all events occurring in year y
                const changes = eventsByYear[y] || [];
                if (changes.length > 0) {
                    // If both types occur in same year, last one wins by order in data; use reduce
                    changes.forEach(ch => {
                        if (ch === 'activate') active = true;
                        else if (ch === 'deactivate') active = false;
                    });
                }
                if (!timeSeriesData[countryCode3][y]) timeSeriesData[countryCode3][y] = {};
                // Represent presence of at least one active policy of this measure as 1, else 0
                timeSeriesData[countryCode3][y][measure] = active ? 1 : 0;
            }
        });
    });

    if (Object.keys(policyData).length === 0) {
        console.warn("Warning: No policy data was processed. Check if the 'country' column in the spreadsheet is named correctly and if the header row is not sorted with the data.");
    }

    // Process targets data
    console.log("Targets CSV columns:", targetsCsv.columns);
    
    // Create a mapping from 3-digit country codes to country names for targets data
    const countryCode3toName = Object.fromEntries(
        geoData.features.map((feature: any) => [feature.id, feature.properties.name])
    );
    
    // Process targets data - organize by target type
    const targetsDataByType: { [targetType: string]: { [countryCode: string]: any } } = {};
    const allTargetTypes = new Set<string>();
    
    targetsCsv.forEach((row: any, index: number) => {
        // Column A is 3-digit country code, F is decision date, H is target year, K is target value, N is target type
        const countryCode3 = row[Object.keys(row)[0]]; // Column A
        const decisionDate = row[Object.keys(row)[5]]; // Column F
        const targetYear = row[Object.keys(row)[7]]; // Column H  
        const targetValue = row[Object.keys(row)[10]]; // Column K
        const targetType = row[Object.keys(row)[13]]; // Column N (Target_type)
        
        if (index < 5) {
            console.log(`Row ${index}:`, {
                countryCode3,
                decisionDate,
                targetYear,
                targetValue,
                targetType,
                allKeys: Object.keys(row)
            });
        }
        
        // Process all target types
        if (targetType && countryCode3 && decisionDate && targetYear && targetValue) {
            allTargetTypes.add(targetType);
            
            const parsedDate = new Date(decisionDate);
            const parsedTargetValue = parseFloat(targetValue);
            const parsedTargetYear = parseInt(targetYear);
            
            if (!isNaN(parsedDate.getTime()) && !isNaN(parsedTargetValue) && !isNaN(parsedTargetYear)) {
                if (!targetsDataByType[targetType]) {
                    targetsDataByType[targetType] = {};
                }
                
                if (!targetsDataByType[targetType][countryCode3] || 
                    new Date(targetsDataByType[targetType][countryCode3].decisionDate) < parsedDate) {
                    targetsDataByType[targetType][countryCode3] = {
                        decisionDate: decisionDate,
                        targetYear: parsedTargetYear,
                        targetValue: parsedTargetValue,
                        countryName: countryCode3toName[countryCode3] || countryCode3,
                        targetType: targetType
                    };
                }
            }
        }
    });

    // Default to Primary energy for backward compatibility
    const targetsData = targetsDataByType['Primary energy'] || {};
    
    console.log("Available target types:", Array.from(allTargetTypes));
    console.log("Processed targets data by type:", Object.keys(targetsDataByType));
    console.log("Primary energy targets:", Object.keys(targetsData).length, "countries");
    console.log("Sample targets data:", Object.entries(targetsData).slice(0, 3));

    // Process climate targets data
    console.log("Climate Targets CSV columns:", climateTargetsCsv.columns);
    
    const climateTargetsData: { [countryCode: string]: any[] } = {};
    
    climateTargetsCsv.forEach((row: any, index: number) => {
        // Column mapping based on the CSV structure:
        // Country_code, Year_decision, Year_target, Target_average, Target_unit (column M)
        const countryCode3 = row.Country_code || row[Object.keys(row)[0]];
        const yearDecision = row.Year_decision;
        const yearTarget = row.Year_target;
        const targetAverage = row.Target_average;
        const targetUnit = row.Target_unit || row[Object.keys(row)[12]]; // Column M
        
        if (index < 5) {
            console.log(`Climate Target Row ${index}:`, {
                countryCode3,
                yearDecision,
                yearTarget,
                targetAverage,
                targetUnit,
                allKeys: Object.keys(row)
            });
        }
        
        // Process all climate targets - ONLY include rows where Target_unit is "Percent"
        if (countryCode3 && yearDecision && yearTarget && targetAverage && targetUnit) {
            const normalizedUnit = String(targetUnit).trim().toLowerCase();
            
            // Only process if Target_unit is "Percent"
            if (normalizedUnit === 'percent') {
                const parsedYearDecision = parseInt(yearDecision);
                const parsedYearTarget = parseInt(yearTarget);
                const parsedTargetAverage = parseFloat(targetAverage);
                
                if (!isNaN(parsedYearDecision) && !isNaN(parsedYearTarget) && !isNaN(parsedTargetAverage)) {
                    if (!climateTargetsData[countryCode3]) {
                        climateTargetsData[countryCode3] = [];
                    }
                    
                    climateTargetsData[countryCode3].push({
                        yearDecision: parsedYearDecision,
                        yearTarget: parsedYearTarget,
                        targetValue: parsedTargetAverage,
                        countryName: countryCode3toName[countryCode3] || countryCode3,
                        targetUnit: targetUnit
                    });
                }
            }
        }
    });
    
    // For each country, select the latest target based on year decision
    const latestClimateTargetsData: { [countryCode: string]: any } = {};
    Object.entries(climateTargetsData).forEach(([countryCode, targets]) => {
        // Sort by year decision (most recent first)
        const sortedTargets = targets.sort((a, b) => b.yearDecision - a.yearDecision);
        latestClimateTargetsData[countryCode] = sortedTargets[0];
    });
    
    console.log("Processed climate targets data:", Object.keys(latestClimateTargetsData).length, "countries");
    console.log("Sample climate targets data:", Object.entries(latestClimateTargetsData).slice(0, 3));

    // Store all processed data globally
    allData = {
        geoData,
        policies: {
            data: policyData,
            typeData: policyTypeData,
            timeSeriesData: timeSeriesData,
            colorScale: null, // Will be set below
            globalColorScale: globalColorScale
        },
        targets: {
            data: targetsData,
            dataByType: targetsDataByType,
            allTargetTypes: Array.from(allTargetTypes),
            colorScale: null, // Will be set below
            colorScales: {}, // Will store color scales for each target type
            minMax: {} // Will store min/max values for each target type
        },
        climateTargets: {
            data: latestClimateTargetsData,
            allData: climateTargetsData,
            colorScale: null, // Will be set below
            minMax: { min: 0, max: 0 } // Will be set below
        }
    };

    // Fix currentTargetType if 'Electricity' is not available
    if (!allData.targets.allTargetTypes.includes('Electricity') && allData.targets.allTargetTypes.length > 0) {
        currentTargetType = allData.targets.allTargetTypes[0];
    }

    // Create color scales for different map types
    const policyCounts = Object.values(policyData).reduce((acc: number[], value) => {
        if (typeof value === 'number') {
            acc.push(value);
        }
        return acc;
    }, []);
    const minPolicies = d3.min(policyCounts);
    const maxPolicies = d3.max(policyCounts);
    
    const policyColorScale = d3.scaleSequential(d3.interpolateGreens)
        .domain([minPolicies as number, maxPolicies as number]);

    // Create color scales for each target type
    const targetColorScales: { [key: string]: any } = {};
    const targetMinMax: { [key: string]: { min: number, max: number } } = {};
    
    allTargetTypes.forEach(targetType => {
        const typeData = targetsDataByType[targetType] || {};
        const targetValues = Object.values(typeData).map((d: any) => d.targetValue);
        if (targetValues.length > 0) {
            const minValue = d3.min(targetValues) as number;
            const maxValue = d3.max(targetValues) as number;
            targetMinMax[targetType] = { min: minValue, max: maxValue };
            targetColorScales[targetType] = d3.scaleSequential(d3.interpolateBlues)
                .domain([minValue, maxValue]);
        }
    });
    
    // Default values for backward compatibility
    const defaultTargetData = targetsDataByType['Primary energy'] || {};
    const defaultTargetValues = Object.values(defaultTargetData).map((d: any) => d.targetValue);
    const minTarget = defaultTargetValues.length > 0 ? d3.min(defaultTargetValues) : 0;
    const maxTarget = defaultTargetValues.length > 0 ? d3.max(defaultTargetValues) : 100;
    const minTargets = minTarget;
    const maxTargets = maxTarget;
    
    const targetsColorScale = targetColorScales['Primary energy'] || d3.scaleSequential(d3.interpolateBlues)
        .domain([minTarget as number, maxTarget as number]);

    // Create color scale for EV data (placeholder values)
    const evColorScale = d3.scaleSequential(d3.interpolateReds)
        .domain([0, 100]);

    // Create color scale for climate targets
    // REVERSED: Lower values (e.g., -100) represent bigger reductions, so they should be darkest
    const climateTargetValues = Object.values(latestClimateTargetsData).map((d: any) => d.targetValue);
    const minClimateTarget = climateTargetValues.length > 0 ? d3.min(climateTargetValues) : -100;
    const maxClimateTarget = climateTargetValues.length > 0 ? d3.max(climateTargetValues) : 0;
    const climateTargetsColorScale = d3.scaleSequential(d3.interpolatePurples)
        .domain([maxClimateTarget as number, minClimateTarget as number]); // REVERSED: max to min

    // Store color scales in allData
    allData.policies.colorScale = policyColorScale;
    allData.targets.colorScale = targetsColorScale;
    allData.targets.colorScales = targetColorScales;
    allData.targets.minMax = targetMinMax;
    allData.ev = { colorScale: evColorScale };
    allData.climateTargets.colorScale = climateTargetsColorScale;
    allData.climateTargets.minMax = { min: minClimateTarget as number, max: maxClimateTarget as number };

    // Function to get country color based on current map type
    function getCountryColor(countryCode: string): string {
        if (currentMapType === 'policies') {
            return countryCode && policyData[countryCode] ? policyColorScale(policyData[countryCode]) : '#b0b0b0';
        } else if (currentMapType === 'targets') {
            // Use current target type data with the appropriate color scale
            const currentTargetData = allData.targets.dataByType[currentTargetType] || {};
            const currentColorScale = allData.targets.colorScales[currentTargetType];
            
            // Debug logging for first few countries
            if (countryCode === 'USA' || countryCode === 'DEU' || countryCode === 'CHN') {
                console.log(`getCountryColor for ${countryCode}:`, {
                    currentTargetType,
                    currentTargetData: currentTargetData[countryCode],
                    currentColorScale: !!currentColorScale,
                    allTargetTypes: allData.targets.allTargetTypes,
                    dataByTypeKeys: Object.keys(allData.targets.dataByType || {}),
                    colorScalesKeys: Object.keys(allData.targets.colorScales || {})
                });
            }
            
            if (countryCode && currentTargetData[countryCode] && currentColorScale) {
                const info = currentTargetData[countryCode];
                const targetValue = info.targetValue;
                if (currentTargetFilterMode === 'group') {
                    // 'latest' mode: show latest announced target regardless of year group
                    if (currentTargetYearGroup === 'latest') {
                        return currentColorScale(targetValue);
                    }
                    // Year group filtering (2020, 2030, 2050)
                    const group = getYearGroup(Number(info.targetYear));
                    if (group && group === currentTargetYearGroup) {
                        return currentColorScale(targetValue);
                    }
                    return '#d4d4d4';
                }
                // Fallback: show latest announced target
                return currentColorScale(targetValue);
            } else {
                return '#b0b0b0';
            }
        } else if (currentMapType === 'climateTargets') {
            // Climate targets data with year group filtering
            const allClimateTargets = allData.climateTargets.allData || {};
            const currentColorScale = allData.climateTargets.colorScale;
            
            if (countryCode && allClimateTargets[countryCode] && currentColorScale) {
                const targets = allClimateTargets[countryCode];
                
                if (currentClimateTargetYearGroup === 'latest') {
                    // Show the most recent target (by decision year)
                    const latestTarget = targets.sort((a: any, b: any) => b.yearDecision - a.yearDecision)[0];
                    return currentColorScale(latestTarget.targetValue);
                }
                
                // Year group filtering (2020, 2030, 2050)
                // Find targets that match the selected year group
                const matchingTargets = targets.filter((t: any) => {
                    const group = getYearGroup(Number(t.yearTarget));
                    return group === currentClimateTargetYearGroup;
                });
                
                if (matchingTargets.length > 0) {
                    // Use the most recent target (by decision year) within the matching group
                    const latestMatchingTarget = matchingTargets.sort((a: any, b: any) => b.yearDecision - a.yearDecision)[0];
                    return currentColorScale(latestMatchingTarget.targetValue);
                }
                
                return '#d4d4d4';
            } else {
                return '#b0b0b0';
            }
        } else if (currentMapType === 'ev') {
            // Placeholder for EV data - will be implemented later
            return '#b0b0b0';
        }
        return '#b0b0b0';
    }

    // Function to get tooltip content based on current map type
    function getTooltipContent(countryCode: string, countryName: string): string {
        if (currentMapType === 'policies') {
            const policyCount = policyData[countryCode] || 'No data';
            return `<strong>${countryName}</strong><br/>Policies: ${policyCount}`;
        } else if (currentMapType === 'targets') {
            const currentTargetData = allData.targets.dataByType[currentTargetType] || {};
            const targetInfo = currentTargetData[countryCode];
            const displayName = getTargetTypeDisplayName(currentTargetType);
            if (targetInfo) {
                return `<strong>${countryName}</strong><br/>Target Type: ${displayName}<br/>Target: ${targetInfo.targetValue}% by ${targetInfo.targetYear}<br/>Decision: ${targetInfo.decisionDate}`;
            } else {
                return `<strong>${countryName}</strong><br/>No ${displayName} target data`;
            }
        } else if (currentMapType === 'climateTargets') {
            const allClimateTargets = allData.climateTargets.allData || {};
            if (allClimateTargets[countryCode]) {
                const targets = allClimateTargets[countryCode];
                
                if (currentClimateTargetYearGroup === 'latest') {
                    // Show the most recent target (by decision year)
                    const latestTarget = targets.sort((a: any, b: any) => b.yearDecision - a.yearDecision)[0];
                    return `<strong>${countryName}</strong><br/>Climate Target: ${latestTarget.targetValue}% by ${latestTarget.yearTarget}<br/>Decision Year: ${latestTarget.yearDecision}`;
                }
                
                // Year group filtering - show target matching the selected year group
                const matchingTargets = targets.filter((t: any) => {
                    const group = getYearGroup(Number(t.yearTarget));
                    return group === currentClimateTargetYearGroup;
                });
                
                if (matchingTargets.length > 0) {
                    const latestMatchingTarget = matchingTargets.sort((a: any, b: any) => b.yearDecision - a.yearDecision)[0];
                    return `<strong>${countryName}</strong><br/>Climate Target: ${latestMatchingTarget.targetValue}% by ${latestMatchingTarget.yearTarget}<br/>Decision Year: ${latestMatchingTarget.yearDecision}`;
                } else {
                    return `<strong>${countryName}</strong><br/>No climate target data for ${currentClimateTargetYearGroup}`;
                }
            } else {
                return `<strong>${countryName}</strong><br/>No climate target data`;
            }
        } else if (currentMapType === 'ev') {
            return `<strong>${countryName}</strong><br/>EV data coming soon`;
        }
        return `<strong>${countryName}</strong>`;
    }

    // Function to update legend colors based on map type
    function updateLegendColors(mapType: string) {
        const linearGradient = svg.select("#gradient-color");
        let interpolateFunction;
        let minValue, maxValue;

        switch (mapType) {
            case 'policies':
                interpolateFunction = d3.interpolateGreens;
                minValue = minPolicies;
                maxValue = maxPolicies;
                break;
            case 'targets':
                interpolateFunction = d3.interpolateBlues;
                // Use same min/max for all target types for consistency
                minValue = minTargets;
                maxValue = maxTargets;
                break;
            case 'climateTargets':
                interpolateFunction = d3.interpolatePurples;
                // REVERSED: Display max (less reduction) on left, min (more reduction) on right
                minValue = maxClimateTarget;
                maxValue = minClimateTarget;
                break;
            case 'ev':
                interpolateFunction = d3.interpolateReds;
                minValue = 0;
                maxValue = 100;
                break;
            default:
                interpolateFunction = d3.interpolateGreens;
                minValue = minPolicies;
                maxValue = maxPolicies;
        }

        const stops = d3.range(0, 1.01, 0.25).map(t => ({
            offset: `${t * 100}%`,
            color: interpolateFunction(t)
        }));

        linearGradient.selectAll("stop")
            .data(stops)
            .attr("stop-color", d => d.color);

        // Update legend text
        svg.select(".legend").selectAll("text").remove();
        
        svg.select(".legend").append("text")
            .attr("x", 0)
            .attr("y", 40)
            .style("font-size", "12px")
            .text(Math.round(minValue as number));

        svg.select(".legend").append("text")
            .attr("x", 300)
            .attr("y", 40)
            .style("font-size", "12px")
            .text(Math.round(maxValue as number));
    }

    // Function to update map zoom based on map type
    function updateMapZoom(mapType: string) {
        const europeCenter: [number, number] = [5, 48]; // lon, lat for center of Western Europe
        
        if (mapType === 'policies') {
            // Zoom to Europe
            const europeScale = 5;
            const europeTranslate = projection(europeCenter)!;
            
            svg.transition()
                .duration(750)
                .call(zoom.transform as any, d3.zoomIdentity
                    .translate(width / 2 - europeTranslate[0] * europeScale, height / 2 - europeTranslate[1] * europeScale)
                    .scale(europeScale));
        } else if (mapType === 'targets' || mapType === 'climateTargets') {
            // Zoom to world view with proper centering (slightly expanded from Europe view)
            const worldCenter: [number, number] = [5, 48]; // Same center as Europe to prevent shifting
            const worldScale = 1.3; // Just a bit less than Europe's 5 scale
            const worldTranslate = projection(worldCenter)!
            
            svg.transition()
                .duration(750)
                .call(zoom.transform as any, d3.zoomIdentity
                    .translate(width / 2 - worldTranslate[0] * worldScale, height / 2 - worldTranslate[1] * worldScale)
                    .scale(worldScale));
        }
        // For 'ev' mapType, keep current zoom level (no change)
    }

    // Function to update map visualization
    function updateMap() {
        g.selectAll("path")
            .transition()
            .duration(500)
            .attr("fill", (d: any) => getCountryColor(d.id));
        
        // Update legend colors
        updateLegendColors(currentMapType);
        
        // Update map zoom
        updateMapZoom(currentMapType);
        
        // Initialize submenu if switching to targets
        if (currentMapType === 'targets') {
            initializeTargetsSubmenu();
        }
    }
    
    // Assign the function to the global variable for use in event handlers
    updateMapFunction = updateMap;

    // Render a country dashboard in the modal with pie and time series charts
    function createCountryDashboardModal(countryCode3: string, countryName: string) {
        const modalContent = document.getElementById('modal-content');
        const modalTitle = document.getElementById('modal-title');
        if (!modalContent) return;

        if (modalTitle) {
            modalTitle.textContent = `${countryName} — Dashboard`;
        }

        // Helper to format labels: Title Case, with specific abbreviations fully uppercased
        const formatPolicyLabel = (s: string) => {
            const lower = s.toLowerCase();
            const upperAbbr = new Set(['fit', 'tgc', 'pv']);
            if (upperAbbr.has(lower)) return lower.toUpperCase();
            return lower.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        };

		// Early no-data check: if neither pie nor time series has content, show kind message
		const countryPolicyTypesEarly = policyTypeData[countryCode3] || {};
		const hasPieDataEarly = Object.keys(countryPolicyTypesEarly).length > 0;
		const countryTimeEarly = timeSeriesData[countryCode3];
		let hasTimeSeriesEarly = false;
		if (countryTimeEarly && Object.keys(countryTimeEarly).length > 0) {
			hasTimeSeriesEarly = Object.values(countryTimeEarly).some((yd: any) => Object.values(yd || {}).some((v: any) => Number(v) > 0));
		}
		if (!hasPieDataEarly && !hasTimeSeriesEarly) {
			modalContent.innerHTML = `
				<div style="display:flex;align-items:center;justify-content:center;height:100%;">
					<div style="text-align:center;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px 20px;max-width:560px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
						<div style="font-size:18px;font-weight:700;margin-bottom:6px;">We’re on it</div>
						<div style="font-size:14px;">We don’t have dashboard data for ${countryName} yet. We’re working to add it soon.</div>
					</div>
				</div>`;
			openModal();
			return;
		}

        // Toolbar + layout container
        modalContent.innerHTML = `
            <div id="dashboard-toolbar" style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:8px;">
                <button id="download-country-policies" style="padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; background:#ffffff; color:#334155; font-weight:600; cursor:pointer;">
                    Download policies (.xlsx)
                </button>
            </div>
            <div id="dashboard-top" style="display:flex; gap:16px; width:100%; height:100%; flex-direction:row;">
                <div id="dashboard-pie" style="flex:1; min-height:300px; background:#f8fafc; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);"></div>
                <div id="dashboard-timeseries" style="flex:1; min-height:300px; background:#f8fafc; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);"></div>
            </div>
        `;
        // Hook export button
        const btnExport = document.getElementById('download-country-policies');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                // Build dataset for selected country (policies only)
                const rows = policyCsv.filter((row: any) => {
                    const cName = row.country;
                    if (!cName) return false;
                    const code3 = countryNameMap[cName] || null;
                    return code3 === countryCode3;
                });

                // Project to curated columns if present
                const preferCols = [
                    'country',
                    'measure',
                    'Technology_type',
                    'year',
                    policyChangedDetailColumnName || 'policy_changed_detail',
                    'level_1',
                    'level_1_currency',
                    'level_1_percent_type_detail',
                    'level_1_unit'
                ].filter(Boolean) as string[];

                const useCols = preferCols.filter(col => rows.length === 0 || rows.some((r: any) => r[col] !== undefined));
                const dataOut = rows.map((r: any) => {
                    const obj: any = {};
                    useCols.forEach(col => { obj[col] = r[col] ?? ''; });
                    return obj;
                });

                // Create workbook and sheet
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(dataOut);
                XLSX.utils.book_append_sheet(wb, ws, 'Policies');
                const safeName = countryName.replace(/[^\w\-]+/g, '_');
                XLSX.writeFile(wb, `${safeName}_policies.xlsx`);
            });
        }
        // Open the modal before measuring sizes to ensure containers have dimensions
        openModal();

        // Defer rendering to the next frame so layout is updated
        requestAnimationFrame(() => {
            // Stack vertically on narrow widths
            const layout = document.getElementById('dashboard-top');
            if (layout) {
                const updateLayout = () => {
                    const w = layout.getBoundingClientRect().width;
                    layout.style.flexDirection = w < 768 ? 'column' : 'row';
                };
                updateLayout();
                window.addEventListener('resize', updateLayout, { once: true });
            }

            // Pie chart: Technology_type distribution
            const pieContainer = document.getElementById('dashboard-pie');
            const countryPolicyTypes = policyTypeData[countryCode3] || {};
            const pieData = Object.entries(countryPolicyTypes).map(([type, count]) => ({ type, count: count as number }));
            if (pieContainer && pieData.length > 0) {
                const rect = pieContainer.getBoundingClientRect();
                const svg = d3.select(pieContainer).append('svg')
                    .attr('width', rect.width)
                    .attr('height', rect.height)
                    .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.06))');
                const gPie = svg.append('g').attr('transform', `translate(${rect.width / 2}, ${rect.height / 2})`);

                // Chart title
                svg.append('text')
                    .attr('x', rect.width / 2)
                    .attr('y', 18)
                    .style('text-anchor', 'middle')
                    .style('font-size', '14px')
                    .style('font-weight', '600')
                    .style('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif')
                    .style('fill', '#334155')
                    .text('Technology Support');

                const radius = Math.max(60, Math.min(rect.width, rect.height) * 0.35);
                const arc = d3.arc<any>().outerRadius(radius).innerRadius(radius * 0.45).cornerRadius(8);
                const pie = d3.pie<any>().value((d: any) => d.count).sort(null);

                const defs = svg.append('defs');
                // Helper to sanitize IDs (avoid spaces and special chars causing missing gradients → black fill)
                const sanitizeId = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '-');

                pieData.forEach(d => {
                    const base = (globalTechColorScale(d.type) as string) || '#8fb9e0';
                    const id = `dash-pie-${sanitizeId(d.type)}`;
                    const lg = defs.append('linearGradient').attr('id', id).attr('x1','0%').attr('y1','0%').attr('x2','100%').attr('y2','0%');
                    lg.append('stop').attr('offset','0%').attr('stop-color', base).attr('stop-opacity', 1);
                    lg.append('stop').attr('offset','100%').attr('stop-color', d3.color(base)?.darker(0.3)?.toString() || '#1e40af').attr('stop-opacity', 1);
                });

                const slices = gPie.selectAll('.slice').data(pie(pieData)).enter().append('g').attr('class','slice');
                slices.append('path')
                    .attr('d', arc as any)
                    .attr('fill', (d: any) => `url(#dash-pie-${sanitizeId(d.data.type)})`)
                    .style('opacity', 0.95)
                    .on('mouseover', function() { d3.select(this).style('filter','brightness(1.1)'); })
                    .on('mouseout', function() { d3.select(this).style('filter', null); });

                const total = pieData.reduce((s, d) => s + d.count, 0);
                slices.append('text')
                    .attr('transform', (d: any) => `translate(${arc.centroid(d)})`)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '12px')
                    .attr('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif')
                    .attr('fill', '#ffffff')
                    .attr('font-weight', '600')
                    .style('text-shadow', '0 1px 2px rgba(0,0,0,0.5)')
                    .text((d: any) => {
                        const pct = Math.round((d.data.count / total) * 100);
                        return pct > 5 ? `${pct}%` : '';
                    });

                // Compact legend (top-right of pie panel)
                const legendMargin = { top: 12, right: 12 };
                const legendGroup = svg.append('g')
                    .attr('transform', `translate(${rect.width - 160 - legendMargin.right}, ${legendMargin.top})`);
                const legendItems = pieData
                    .sort((a, b) => (b.count as number) - (a.count as number))
                    .slice(0, 10);
                legendItems.forEach((d, i) => {
                    const row = legendGroup.append('g')
                        .attr('transform', `translate(0, ${i * 18})`);
                    row.append('circle')
                        .attr('cx', 6)
                        .attr('cy', 6)
                        .attr('r', 5)
                        .attr('fill', globalTechColorScale(d.type) as string)
                        .style('stroke', 'rgba(255,255,255,0.9)')
                        .style('stroke-width', 1);
                    row.append('text')
                        .attr('x', 18)
                        .attr('y', 6)
                        .attr('dy', '0.35em')
                        .style('font-size', '11px')
                        .style('font-weight', '500')
                        .style('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif')
                        .style('fill', '#334155')
                        .text(formatPolicyLabel(String(d.type)));
                });
            }

            // Time series chart: row-per-policy type (non-stacked)
            const tsContainer = document.getElementById('dashboard-timeseries');
            const countryTime = timeSeriesData[countryCode3];
            if (tsContainer && countryTime) {
                const allYears = Object.keys(countryTime).map(Number).sort();
                const yearly: { [year: number]: { [measure: string]: number } } = {};
                const types = new Set<string>();
                allYears.forEach(y => {
                    yearly[y] = {};
                    const yd = countryTime[y];
                    if (yd) {
                        Object.entries(yd).forEach(([m, c]) => { if ((c as number) > 0) { yearly[y][m] = 1; types.add(m); } });
                    }
                });
                const yearsWith = allYears.filter(y => Object.values(yearly[y] || {}).some(v => (v as number) > 0));
                if (yearsWith.length === 0) {
                    return;
                }
                const startY = yearsWith[0];
                const endY = yearsWith[yearsWith.length - 1];
                const years = allYears.filter(y => y >= startY && y <= endY);

                const rect = tsContainer.getBoundingClientRect();
                const margin = { top: 24, right: 60, bottom: 80, left: 120 };
                const width = rect.width - margin.left - margin.right;
                const height = rect.height - margin.top - margin.bottom;
                const svg = d3.select(tsContainer).append('svg')
                    .attr('width', rect.width)
                    .attr('height', rect.height)
                    .style('border-radius', '12px')
                    .style('filter', 'drop-shadow(0 2px 8px rgba(0,0,0,0.06))');

                const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
                // Chart title for context (match pie chart styling)
                svg.append('text')
                    .attr('x', margin.left + width / 2)
                    .attr('y', Math.max(16, margin.top - 6))
                    .style('text-anchor', 'middle')
                    .style('font-size', '14px')
                    .style('font-weight', '600')
                    .style('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif')
                    .style('fill', '#334155')
                    .text('Policy Timeline by Type');
                const x = d3.scaleBand().domain(years.map(String)).range([0, width]).padding(0.06);
                // Compute frequency of each policy type across selected years
                const policyFreq: Record<string, number> = {};
                Array.from(types).forEach(t => { policyFreq[t] = 0; });
                years.forEach(y => {
                    Array.from(types).forEach(t => { if (yearly[y][t]) policyFreq[t] += 1; });
                });
                // Sort types by ascending frequency so the most frequent ends up at the bottom
                const sortedPolicyTypes = Array.from(types).sort((a, b) => policyFreq[a] - policyFreq[b]);
                const yBand = d3.scaleBand().domain(sortedPolicyTypes).range([0, height]).padding(0.1);

                // (Removed) background row bands to keep bar chart clean

                // Grid
                const grid = g.append('g');
                grid.selectAll('.hline').data(sortedPolicyTypes).enter().append('line')
                    .attr('class', 'hline')
                    .attr('x1', 0).attr('x2', width)
                    .attr('y1', d => (yBand(d) || 0) + yBand.bandwidth()).attr('y2', d => (yBand(d) || 0) + yBand.bandwidth())
                    .style('stroke', '#e2e8f0').style('stroke-dasharray', '2,2').style('opacity', 0.2);
                grid.selectAll('.vline').data(years).enter().append('line')
                    .attr('class', 'vline')
                    .attr('y1', 0).attr('y2', height)
                    .attr('x1', d => (x(String(d)) || 0) + x.bandwidth()).attr('x2', d => (x(String(d)) || 0) + x.bandwidth())
                    .style('stroke', '#e2e8f0').style('stroke-dasharray', '2,2').style('opacity', 0.08);

                // Cells data: one per active measure-year
                const cells: { year: number; measure: string }[] = [];
                years.forEach(y => {
                    sortedPolicyTypes.forEach(m => { if (yearly[y][m]) cells.push({ year: y, measure: m }); });
                });

                // Policy detail popup
                function showPolicyDetailPopup(measure: string, year: number, rows: any[]) {
                    const parent = document.getElementById('modal-content');
                    if (!parent) return;
                    parent.querySelectorAll('.policy-detail-popup').forEach(el => el.remove());
                    const box = document.createElement('div');
                    box.className = 'policy-detail-popup';
                    box.style.position = 'absolute';
                    // Responsive sizing: ~85% of content area on desktop, 95% on small screens
                    const parentRect = parent.getBoundingClientRect();
                    const isNarrow = parentRect.width < 768;
                    box.style.right = isNarrow ? 'auto' : '24px';
                    box.style.left = isNarrow ? '50%' : 'auto';
                    box.style.transform = isNarrow ? 'translateX(-50%)' : 'none';
                    box.style.bottom = isNarrow ? '16px' : '24px';
                    // Width: keep compact on desktop, full on mobile
                    box.style.width = isNarrow ? '95%' : 'auto';
                    box.style.maxWidth = isNarrow ? '95%' : '720px';
                    // Height: take up to ~85% of modal content height
                    box.style.maxHeight = '85%';
                    box.style.overflowY = 'auto';
                    box.style.background = 'rgba(255,255,255,0.95)';
                    box.style.border = '1px solid #e5e7eb';
                    box.style.borderRadius = '12px';
                    box.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                    box.style.padding = isNarrow ? '12px' : '14px';
                    box.style.zIndex = '1000';
                    const title = document.createElement('div');
                    title.style.display = 'flex';
                    title.style.justifyContent = 'space-between';
                    title.style.alignItems = 'center';
                    title.style.marginBottom = '8px';
                    title.innerHTML = `<span style="font-weight:600; color:#111827; font-size:${isNarrow ? '14px' : '16px'};">${countryName} — ${measure} (${year})</span>`;
                    const close = document.createElement('button');
                    close.textContent = '×';
                    close.style.fontSize = '18px';
                    close.style.color = '#6b7280';
                    close.style.border = 'none';
                    close.style.background = 'none';
                    close.style.cursor = 'pointer';
                    close.onclick = () => box.remove();
                    title.appendChild(close);
                    box.appendChild(title);
                    const list = document.createElement('div');
                    list.style.display = 'flex';
                    list.style.flexDirection = 'column';
                    list.style.gap = '8px';
                    const limited = rows.slice(0, 5);
                    if (limited.length === 0) {
                        list.innerHTML = `<div style="color:#6b7280">No specific policies matched.</div>`;
                    } else {
                        limited.forEach(r => {
                            const item = document.createElement('div');
                            item.style.padding = isNarrow ? '8px' : '10px';
                            item.style.borderRadius = '8px';
                            item.style.background = '#f9fafb';
                            item.style.border = '1px solid #e5e7eb';
                            const f = (name: string) => r[name] ?? '';
                            item.innerHTML = `
                                <div style="font-weight:600; color:#374151; font-size:${isNarrow ? '13px' : '14px'};">${f('level_1') || '(no title)'}</div>
                                <div style="font-size:${isNarrow ? '11px' : '12px'}; color:#4b5563;">Tech: ${f('Technology_type') || '-'}</div>
                                <div style="font-size:${isNarrow ? '11px' : '12px'}; color:#4b5563;">Currency: ${f('level_1_currency') || '-'}</div>
                                <div style="font-size:${isNarrow ? '11px' : '12px'}; color:#4b5563;">Percent Detail: ${f('level_1_percent_type_detail') || '-'}</div>
                                <div style="font-size:${isNarrow ? '11px' : '12px'}; color:#4b5563;">Unit: ${f('level_1_unit') || '-'}</div>
                            `;
                            list.appendChild(item);
                        });
                    }
                    box.appendChild(list);
                    parent.appendChild(box);
                }

                // Cells (non-stacked)
                g.selectAll('.policy-cell')
                    .data(cells)
                    .enter()
                    .append('rect')
                    .attr('class', 'policy-cell')
                    .attr('x', d => x(String(d.year)) || 0)
                    .attr('y', d => yBand(d.measure) || 0)
                    .attr('width', x.bandwidth())
                    .attr('height', yBand.bandwidth())
                    .attr('rx', 3).attr('ry', 3)
                    .attr('fill', d => getMeasureColor(d.measure))
                    .style('opacity', 0.95)
                    .style('cursor', 'pointer')
                    .on('click', function(event, d: any) {
                        const measure = d.measure as string;
                        const year = Number(d.year);
                        const rows = policyCsv.filter((row: any) => {
                            const cName = row.country;
                            const m = row.measure || 'Unknown';
                            const introducedYear = Number(row.year);
                            if (!isIntroduced(row)) return false;
                            const code3 = countryNameMap[cName || ''];
                            if (code3 !== countryCode3 || m !== measure) return false;
                            if (!Number.isFinite(introducedYear) || introducedYear > year) return false;
                            const events = (eventsByCountryMeasure[countryCode3] && eventsByCountryMeasure[countryCode3][measure]) || [];
                            const deactivatedBeforeOrInSelected = events.some(e => e.type === 'deactivate' && e.year > introducedYear && e.year <= year);
                            return !deactivatedBeforeOrInSelected;
                        });
                        showPolicyDetailPopup(measure, year, rows);
                    })
                    .on('mouseover', function() {
                        d3.select(this)
                            .style('opacity', 1)
                            .style('stroke', 'rgba(17, 24, 39, 0.5)')
                            .style('stroke-width', 1.5)
                            .style('filter', 'saturate(1.6) contrast(1.15)');
                    })
                    .on('mouseout', function() {
                        d3.select(this)
                            .style('opacity', 0.95)
                            .style('stroke', null)
                            .style('stroke-width', 1)
                            .style('filter', 'none');
                    });

                // Axes
                const xDomainDash = x.domain();
                const stepDash = xDomainDash.length > 24 ? 3 : (xDomainDash.length > 14 ? 2 : 1);
                const xTicksDash = xDomainDash.filter((_, i) => i % stepDash === 0);
                const xAxisDash = g.append('g')
                    .attr('transform', `translate(0, ${height})`)
                    .call(d3.axisBottom(x).tickValues(xTicksDash).tickSize(0));
                const xLabelSize = width <= 420 ? '9px' : (width <= 560 ? '10px' : '12px');
                xAxisDash.selectAll('text')
                    .style('font-size', xLabelSize)
                    .style('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif')
                    .style('fill', '#475569')
                    .style('text-anchor', 'middle')
                    .attr('dx', '0')
                    .attr('dy', '0');
                xAxisDash.select('.domain')
                    .style('stroke', '#e2e8f0')
                    .style('stroke-width', 1);
                const yAxisDash = g.append('g')
                    .call(d3.axisLeft(yBand).tickSize(0).tickFormat((d: any) => formatPolicyLabel(String(d))));
                yAxisDash.selectAll('text')
                    .style('font-size', '12px')
                    .style('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif')
                    .style('fill', '#475569');
                yAxisDash.select('.domain')
                    .style('stroke', '#e2e8f0')
                    .style('stroke-width', 1);

                // Legend removed: y-axis labels suffice for identifying policy types

                // Axis labels (y-label removed for clarity)
                g.append('text')
                    .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 5})`)
                    .style('text-anchor', 'middle')
                    .style('font-size', '12px')
                    .style('font-weight', '600')
                    .style('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif')
                    .style('fill', '#475569')
                    .text('Year');
            }
        });
    }

    // Function to create time series chart for a specific country
    function createTimeSeriesChart(countryCode3: string, countryName: string) {
        const timeSeriesContainer = document.getElementById('time-series-chart')!;
        timeSeriesContainer.innerHTML = '';

        const countryTimeData = timeSeriesData[countryCode3];
        if (!countryTimeData || Object.keys(countryTimeData).length === 0) {
            timeSeriesContainer.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">No time series data available for this country.</div>';
            return;
        }

        // Get all years and measures
        const allYears = Object.keys(countryTimeData).map(Number).sort();
        const measures = new Set<string>();
        Object.entries(countryTimeData).forEach(([year, yearData]) => {
            Object.keys(yearData as { [key: string]: number }).forEach(measure => measures.add(measure));
        });

        // Create data for stacked bars - count only policies active in each specific year
        const yearlyData: { [year: number]: { [measure: string]: number } } = {};
        const allPolicyTypes = new Set<string>();

        // First build from all years, then crop to active window for this country
        allYears.forEach(year => {
            yearlyData[year] = {};
            
            // Count only policy types that are actually active in this specific year
             if (countryTimeData[year]) {
                 Object.entries(countryTimeData[year]).forEach(([measure, count]) => {
                     if ((count as number) > 0) {
                         yearlyData[year][measure] = 1; // Each policy type counts as 1
                         allPolicyTypes.add(measure);
                     }
                 });
             }
        });

        // Determine active window: from first year with any active measure to last
        const yearsWithActivity = allYears.filter(y => {
            const yd = yearlyData[y] || {};
            return Object.values(yd).some(v => (v as number) > 0);
        });

        if (yearsWithActivity.length === 0) {
            timeSeriesContainer.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">No active policy years for this country.</div>';
            return;
        }

        const earliestActiveYear = yearsWithActivity[0];
        const latestActiveYear = yearsWithActivity[yearsWithActivity.length - 1];
        const years = allYears.filter(y => y >= earliestActiveYear && y <= latestActiveYear);

        // Compute frequency per policy type across the active window
        const policyFreq: Record<string, number> = {};
        Array.from(allPolicyTypes).forEach(t => { policyFreq[t] = 0; });
        years.forEach(year => {
            Array.from(allPolicyTypes).forEach(t => { if (yearlyData[year][t]) policyFreq[t] += 1; });
        });
        // Sort ascending by frequency so the most frequent appears at the bottom row
        const sortedPolicyTypes = Array.from(allPolicyTypes).sort((a, b) => policyFreq[a] - policyFreq[b]);

        // Build presence cells per year-policy for non-stacked rows
        const cells: { year: number; measure: string }[] = [];
        years.forEach(year => {
            sortedPolicyTypes.forEach(measure => {
                if (yearlyData[year][measure]) cells.push({ year, measure });
            });
        });

        // Chart dimensions
        const margin = { top: 20, right: 70, bottom: 35, left: 100 };
        const chartWidth = 300 - margin.left - margin.right;
        const chartHeight = 160 - margin.top - margin.bottom;

        // Create SVG with modern styling
        const svg = d3.select(timeSeriesContainer)
            .append('svg')
            .attr('width', chartWidth + margin.left + margin.right)
            .attr('height', chartHeight + margin.top + margin.bottom)
            .style('cursor', 'pointer')
            .style('background', 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)')
            .style('border-radius', '12px')
            .style('box-shadow', '0 4px 20px rgba(0, 0, 0, 0.08)')
            .style('transition', 'all 0.3s ease')
            .on('mouseenter', function() {
                d3.select(this)
                    .style('box-shadow', '0 8px 30px rgba(0, 0, 0, 0.15)')
                    .style('transform', 'translateY(-2px)');
            })
            .on('mouseleave', function() {
                d3.select(this)
                    .style('box-shadow', '0 4px 20px rgba(0, 0, 0, 0.08)')
                    .style('transform', 'translateY(0px)');
            })
            .on('click', function() {
                // Convert to format expected by full screen chart
                const timeSeriesChartData = Array.from(allPolicyTypes).map(measure => ({
                    measure,
                    values: years.map(year => ({
                        year,
                        count: yearlyData[year]?.[measure] || 0
                    }))
                }));
                createFullScreenTimeSeriesChart(timeSeriesChartData, countryName, globalColorScale);
                openModal();
            });

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales
        const xScale = d3.scaleBand()
            .domain(years.map(String))
            .range([0, chartWidth])
            .padding(0.06);

        const yBand = d3.scaleBand()
            .domain(sortedPolicyTypes)
            .range([0, chartHeight])
            .padding(0.1);

        // Add modern grid lines
        const gridLines = g.append('g')
            .attr('class', 'grid-lines')
            .style('opacity', 0.2);

        // Horizontal grid lines
        gridLines.selectAll('.grid-line-horizontal')
            .data(sortedPolicyTypes)
            .enter().append('line')
            .attr('class', 'grid-line-horizontal')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', d => (yBand(d) || 0) + yBand.bandwidth())
            .attr('y2', d => (yBand(d) || 0) + yBand.bandwidth())
            .style('stroke', '#e2e8f0')
            .style('stroke-width', 1)
            .style('stroke-dasharray', '2,2');

        // Add axes with modern styling and adaptive tick density
        const xDomain = xScale.domain();
        const step = xDomain.length > 24 ? 3 : (xDomain.length > 14 ? 2 : 1);
        const xTicks = xDomain.filter((_, i) => i % step === 0);
        const xAxis = g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(xScale).tickValues(xTicks).tickSize(0))
            .style('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif');

        xAxis.selectAll('text')
            .style('font-size', '11px')
            .style('font-weight', '500')
            .style('fill', '#64748b')
            .style('text-anchor', 'middle')
            .attr('dx', '0')
            .attr('dy', '0');

        xAxis.select('.domain')
            .style('stroke', '#e2e8f0')
            .style('stroke-width', 1);

        const yAxis = g.append('g')
            .call(d3.axisLeft(yBand).tickSize(0))
            .style('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif');

        yAxis.selectAll('text')
            .style('font-size', '11px')
            .style('font-weight', '500')
            .style('fill', '#64748b')
            .attr('dx', '-0.5em');

        yAxis.select('.domain')
            .style('stroke', '#e2e8f0')
            .style('stroke-width', 1);

        // Draw cells
        const cellsSel = g.selectAll('.policy-cell')
            .data(cells)
            .enter().append('rect')
            .attr('class', 'policy-cell')
            .attr('x', d => xScale(String(d.year))!)
            .attr('y', d => yBand(d.measure) || 0)
            .attr('width', xScale.bandwidth())
            .attr('height', yBand.bandwidth())
            .attr('rx', 3)
            .attr('ry', 3)
            .attr('fill', d => globalColorScale(d.measure as string) as string)
            .style('fill-opacity', 0.88)
            .style('stroke', 'rgba(255, 255, 255, 0.6)')
            .style('stroke-width', 1)
            .style('transition', 'all 0.3s ease')
            .style('cursor', 'pointer');

        // Hover effects
        cellsSel.on('mouseenter', function() {
                d3.select(this)
                    .style('filter', 'saturate(1.6) contrast(1.15)')
                    .style('stroke-width', 1.5)
                    .style('stroke', 'rgba(17, 24, 39, 0.5)');
            })
            .on('mouseleave', function() {
                d3.select(this)
                    .style('filter', 'none')
                    .style('stroke-width', 1)
                    .style('stroke', 'rgba(255, 255, 255, 0.6)');
            });

        // Legend removed: y-axis labels already show policy names

        // Add modern axis labels
        // Removed vertical y-axis label to declutter the small chart

        g.append('text')
            .attr('transform', `translate(${chartWidth / 2}, ${chartHeight + margin.bottom - 5})`)
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('font-family', 'Inter, -apple-system, BlinkMacSystemFont, sans-serif')
            .style('fill', '#475569')
            .style('opacity', 0)
            .text('Year')
            .transition()
            .duration(600)
            .delay(1200)
            .style('opacity', 1);
    }

    g.selectAll("path")
        .data(geoData.features)
        .enter().append("path")
        .attr("d", path as any)
        .attr("fill", (d: any) => getCountryColor(d.id))
        .attr("class", "country")
        .on("mouseover", function (event, d: any) {
            d3.select(this).style("stroke", "black").style("stroke-width", 1.5);
            const countryCode = d.id;
            const countryName = d.properties.name;

            tooltip.style("visibility", "visible")
                   .html(getTooltipContent(countryCode, countryName));
        })
        .on("mousemove", function (event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                   .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).style("stroke", null).style("stroke-width", null);
            tooltip.style("visibility", "hidden");
        })
        .on("click", function (event, d: any) {
            const countryCode3 = d.id;
            const countryName = d.properties.name;
            createCountryDashboardModal(countryCode3, countryName);
        });

    document.getElementById('close-panel')?.addEventListener('click', () => {
        document.getElementById('policy-panel')?.classList.remove('visible');
        document.getElementById('panel-backdrop')?.classList.remove('visible');
    });

    document.getElementById('panel-backdrop')?.addEventListener('click', () => {
        document.getElementById('policy-panel')?.classList.remove('visible');
        document.getElementById('panel-backdrop')?.classList.remove('visible');
    });

    g.selectAll("text.country-label")
        .data(geoData.features)
        .enter().append("text")
        .attr("class", "country-label")
        .attr("transform", (d: any) => {
            let centroid: [number, number];
            if (d.geometry.type === "Polygon") {
                const result = polylabel(d.geometry.coordinates);
                centroid = [result[0], result[1]];
            } else if (d.geometry.type === "MultiPolygon") {
                let bestPolygon = d.geometry.coordinates[0];
                let maxArea = 0;
                d.geometry.coordinates.forEach((polygon: any) => {
                    const area = d3.geoArea({ type: "Polygon", coordinates: polygon });
                    if (area > maxArea) {
                        maxArea = area;
                        bestPolygon = polygon;
                    }
                });
                const result = polylabel(bestPolygon);
                centroid = [result[0], result[1]];
            } else {
                const pCentroid = path.centroid(d);
                centroid = [pCentroid[0], pCentroid[1]];
            }

            if (isNaN(centroid[0]) || isNaN(centroid[1])) {
                return "translate(-9999, -9999)";
            }
            return `translate(${projection(centroid)})`;
        })
        .attr("text-anchor", "middle")
        .attr("font-size", "2px")
        .attr("fill", "black")
        .style("pointer-events", "none")
        .text((d: any) => countryCodeMapping[d.id] || "");

    // Add a legend
    const legendWidth = 300;
    const legendHeight = 20;
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(20, ${height - 50})`);

    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "gradient-color");

    const stops = d3.range(0, 1.01, 0.25).map(t => ({
        offset: `${t * 100}%`,
        color: d3.interpolateGreens(t)
    }));

    linearGradient.selectAll("stop")
        .data(stops)
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#gradient-color)");

    legend.append("text")
        .attr("x", 0)
        .attr("y", legendHeight + 20)
        .style("font-size", "12px")
        .text(minPolicies as number);

    legend.append("text")
        .attr("x", legendWidth)
        .attr("y", legendHeight + 20)
        .style("text-anchor", "end")
        .style("font-size", "12px")
        .text(maxPolicies as number);
    
    const europeCenter: [number, number] = [5, 48]; // lon, lat for center of Western Europe
    const initialScale = 5;
    const initialTranslate = projection(europeCenter)!;

    svg.call(zoom.transform as any, d3.zoomIdentity
        .translate(width / 2 - initialTranslate[0] * initialScale, height / 2 - initialTranslate[1] * initialScale)
        .scale(initialScale));
        
    document.getElementById('world-map-container')?.classList.add('loaded');

    // Add event listeners for map type switching
    document.querySelectorAll('input[name="mapType"]').forEach(radio => {
        radio.addEventListener('change', (event) => {
            const target = event.target as HTMLInputElement;
            if (target.checked) {
                currentMapType = target.value as 'policies' | 'ev' | 'targets' | 'climateTargets';
                updateMap();
            }
        });
    });

    // Add event listeners for the new toggle switch
    const toggleSwitch = document.getElementById('mapTypeToggle');
    const toggleOptions = document.querySelectorAll('.toggle-option');
    
    if (toggleSwitch && toggleOptions.length > 0) {
        toggleOptions.forEach((option, index) => {
            option.addEventListener('click', () => {
                const values = ['policies', 'ev', 'targets', 'climateTargets'];
                const selectedValue = values[index];
                
                if (selectedValue === 'targets') {
                    // Set map type to targets and show submenu
                    currentMapType = 'targets';
                    
                    // Update toggle switch appearance
                    toggleSwitch.setAttribute('data-active', selectedValue);
                    
                    // Hide climate targets submenu if it's open
                    hideClimateTargetsSubmenu();
                    
                    showTargetsSubmenu();
                    // Update the map to show Electricity data immediately
                    updateMap();
                } else if (selectedValue === 'climateTargets') {
                    // Set map type to climate targets and show submenu
                    currentMapType = 'climateTargets';
                    
                    // Update toggle switch appearance
                    toggleSwitch.setAttribute('data-active', selectedValue);
                    
                    // Hide RE targets submenu if it's open
                    hideTargetsSubmenu();
                    
                    showClimateTargetsSubmenu();
                    // Update the map to show climate targets data immediately
                    updateMap();
                } else {
                    // Hide both submenus if they're open
                    hideTargetsSubmenu();
                    hideClimateTargetsSubmenu();
                    
                    // Update toggle switch appearance
                    toggleSwitch.setAttribute('data-active', selectedValue);
                    
                    // Update hidden radio buttons for compatibility
                    const radioButton = document.querySelector(`input[name="mapType"][value="${selectedValue}"]`) as HTMLInputElement;
                    if (radioButton) {
                        radioButton.checked = true;
                        currentMapType = selectedValue as 'policies' | 'ev' | 'targets' | 'climateTargets';
                        updateMap();
                    }
                }
            });
        });
    }

    // Initial map update to load the correct data based on currentMapType
    updateMap();
    
    // Hide loading indicator after initial map is loaded
    hideLoadingIndicator();

    // Adapt toggle switch size to the map box (~12% of width for 4 options with longer text)
    function adaptToggleSize() {
        const container = document.getElementById('world-map-container') as HTMLElement | null;
        const toggle = document.getElementById('mapTypeToggle') as HTMLElement | null;
        const submenu = document.getElementById('targetsSubmenu') as HTMLElement | null;
        const climateSubmenu = document.getElementById('climateTargetsSubmenu') as HTMLElement | null;
        if (!container || !toggle) return;
        const rect = container.getBoundingClientRect();
        // Target ~12% of map width for 4 options with longer text; clamp for usability
        const targetWidth = Math.round(rect.width * 0.12);
        const width = Math.max(340, Math.min(520, targetWidth));
        const height = Math.max(42, Math.min(72, Math.round(width * 0.15))); // keep aspect ratio
        toggle.style.width = `${width}px`;
        toggle.style.height = `${height}px`;
        if (submenu) {
            const submenuWidth = Math.max(380, width);
            submenu.style.width = `${submenuWidth}px`;
        }
        if (climateSubmenu) {
            const climateSubmenuWidth = Math.max(380, width);
            climateSubmenu.style.width = `${climateSubmenuWidth}px`;
        }
    }
    // Size now and on resize
    requestAnimationFrame(adaptToggleSize);
    window.addEventListener('resize', adaptToggleSize);

}).catch(error => {
    console.error('Error loading data:', error);
    // Hide loading indicator even if there's an error
    hideLoadingIndicator();
});

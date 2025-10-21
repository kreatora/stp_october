import * as d3 from 'd3';
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

// Function to create full-screen time series chart
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
            ? { top: 30, right: 120, bottom: 60, left: 60 }
            : { top: 40, right: 200, bottom: 80, left: 80 };
        const width = containerRect.width - margin.left - margin.right;
        const extraSpace = isSmallScreen ? 60 : 100;
        const height = containerRect.height - margin.top - margin.bottom - extraSpace;

        const svgHeightOffset = isSmallScreen ? 30 : 50;
        const svg = d3.select(container)
            .append('svg')
            .attr('width', containerRect.width)
            .attr('height', containerRect.height - svgHeightOffset);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        // Scales
        const allYears = timeSeriesChartData.flatMap(d => d.values.map((v: any) => v.year)).filter((year): year is number => typeof year === 'number');
        const yearExtent = d3.extent(allYears) as [number, number];
        const xScale = d3.scaleLinear()
            .domain(yearExtent)
            .range([0, width]);

        const maxCount = Math.max(...timeSeriesChartData.map(d => Math.max(...d.values.map((v: any) => Number(v.count) || 0))));
        const yScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range([height, 0]);

        // Line generator
        const line = d3.line<any>()
            .x((d: any) => xScale(Number(d.year)))
            .y((d: any) => yScale(Number(d.count)))
            .curve(d3.curveMonotoneX);

        // Add axes
        const axisFontSize = isSmallScreen ? '11px' : '14px';
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format('d')))
            .selectAll('text')
            .style('font-size', axisFontSize);

        g.append('g')
            .call(d3.axisLeft(yScale).tickFormat(d3.format('d')).ticks(Math.min(maxCount, 10)))
            .selectAll('text')
            .style('font-size', axisFontSize);

        // Add lines and dots for each measure
        const lineWidth = isSmallScreen ? 2 : 3;
        const dotRadius = isSmallScreen ? 3 : 5;
        timeSeriesChartData.forEach((measureData: any) => {
            g.append('path')
                .datum(measureData.values)
                .attr('fill', 'none')
                .attr('stroke', globalColorScale(measureData.measure) as string)
                .attr('stroke-width', lineWidth)
                .attr('d', line);

            // Add dots
            g.selectAll(`.dot-${measureData.measure.replace(/\s+/g, '-')}`)
                .data(measureData.values)
                .enter().append('circle')
                .attr('class', `dot-${measureData.measure.replace(/\s+/g, '-')}`)
                .attr('cx', (d: any) => xScale(Number(d.year)))
                .attr('cy', (d: any) => yScale(Number(d.count)))
                .attr('r', dotRadius)
                .attr('fill', globalColorScale(measureData.measure) as string);
        });

        // Add legend
        const legendOffset = isSmallScreen ? 15 : 20;
        const legend = svg.append('g')
            .attr('transform', `translate(${width + margin.left + legendOffset}, ${margin.top})`);

        const legendSpacing = isSmallScreen ? 20 : 25;
        const legendBoxSize = isSmallScreen ? 14 : 18;
        const legendFontSize = isSmallScreen ? '11px' : '14px';
        const legendTextOffset = isSmallScreen ? 18 : 24;
        const legendTextY = isSmallScreen ? 11 : 14;

        timeSeriesChartData.forEach((measureData, i) => {
            const legendItem = legend.append('g')
                .attr('transform', `translate(0, ${i * legendSpacing})`);

            legendItem.append('rect')
                .attr('width', legendBoxSize)
                .attr('height', legendBoxSize)
                .attr('fill', globalColorScale(measureData.measure) as string);

            legendItem.append('text')
                .attr('x', legendTextOffset)
                .attr('y', legendTextY)
                .attr('font-size', legendFontSize)
                .text(measureData.measure);
        });

        // Add axis labels
        const axisLabelFontSize = isSmallScreen ? '12px' : '16px';
        const axisLabelBottomOffset = isSmallScreen ? 15 : 20;
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left)
            .attr('x', 0 - (height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .style('font-size', axisLabelFontSize)
            .style('font-weight', 'bold')
            .text('Policy Count');

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

const policyDataUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS6CB5iec7U6REadNIkrQ-xmvK_mTJyx03SRSxdVu8FtxOuJ66Ez5NoanJbc-j_rwi6L4Apy8rEpmCj/pub?gid=616394498&single=true&output=csv';
const targetsDataUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTrnNiKOv8WUyhF14AzhoblMqyLsqEXgSbKHMO0d8O7X6_eIzkJwS-lzjtXGL277A/pub?gid=2106460736&single=true&output=csv';

const baseUrl = (import.meta as any).env.BASE_URL || '/';

// Global variables to store all data
let currentMapType = 'policies';
let currentTargetType = 'Electricity'; // Default target type
let allData: any = {};

// Flag to track if submenu has been initialized
let submenuInitialized = false;

// Global reference to updateMap function
let updateMapFunction: (() => void) | null = null;

// Function to initialize targets submenu
function initializeTargetsSubmenu() {
    const submenuOptions = document.getElementById('submenuOptions');
    const submenu = document.getElementById('targetsSubmenu');
    const submenuClose = document.getElementById('submenuClose');
    
    if (!submenuOptions || !submenu || !submenuClose) return;
    
    // Get available target types
    const targetTypes = allData.targets.allTargetTypes || [];
    console.log('Initializing submenu with target types:', targetTypes);
    
    // Only initialize if not already done or if target types have changed
    if (!submenuInitialized || submenuOptions.children.length !== targetTypes.length) {
        // Clear existing options
        submenuOptions.innerHTML = '';
        
        // Create submenu options for each target type
        targetTypes.forEach((targetType: string) => {
            const option = document.createElement('button');
            option.className = 'submenu-option';
            option.textContent = targetType;
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
            if (opt.textContent === currentTargetType) {
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
    d3.csv(targetsDataUrl)
]).then(([geoData, policyCsv, targetsCsv]: [any, any, any]) => {
    console.log('Data loaded successfully:');
    console.log('Policy CSV rows:', policyCsv.length);
    console.log('Targets CSV rows:', targetsCsv.length);
    console.log('First few targets rows:', targetsCsv.slice(0, 3));
    
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

    const countryNameMap = geoData.features.reduce((acc: { [key: string]: string }, feature: any) => {
        acc[feature.properties.name] = feature.id;
        return acc;
    }, {});

    // Collect all unique policy types for consistent color mapping
    const policyTypesSet = new Set<string>();
    policyCsv.forEach((row: any) => {
        const measure = row.measure ? String(row.measure) : 'Unknown';
        policyTypesSet.add(measure);
    });
    const allPolicyTypes = Array.from(policyTypesSet).sort();
    
    // Create global color mapping for policy types
    const globalColorScale = d3.scaleOrdinal()
        .domain(allPolicyTypes)
        .range([
            '#1f77b4', // blue
            '#ff7f0e', // orange  
            '#2ca02c', // green
            '#d62728', // red
            '#9467bd', // purple
            '#8c564b', // brown
            '#e377c2', // pink
            '#7f7f7f', // gray
            '#bcbd22', // olive
            '#17becf', // cyan
            '#aec7e8', // light blue
            '#ffbb78', // light orange
            '#98df8a', // light green
            '#ff9896', // light red
            '#c5b0d5'  // light purple
        ]);
    
    // Process policy data to count total policies per country
    const policyData = policyCsv.reduce((acc: { [key: string]: number }, row: any) => {
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

    // Process policy types (measure column) per country for pie charts
    const policyTypeData = policyCsv.reduce((acc: { [key: string]: { [key: string]: number } }, row: any) => {
        const countryName = row.country;
        const measure = row.measure || 'Unknown';
        
        if (countryName) {
            const countryCode3 = countryNameMap[countryName];
            if (countryCode3) {
                if (!acc[countryCode3]) {
                    acc[countryCode3] = {};
                }
                if (!acc[countryCode3][measure]) {
                    acc[countryCode3][measure] = 0;
                }
                acc[countryCode3][measure]++;
            }
        }
        return acc;
    }, {});

    // Process time series data for country-specific policy evolution
    const timeSeriesData = policyCsv.reduce((acc: { [key: string]: { [key: string]: { [key: string]: number } } }, row: any) => {
        const countryName = row.country;
        const measure = row.measure || 'Unknown';
        const year = row.year;
        
        if (countryName && year) {
            const countryCode3 = countryNameMap[countryName];
            if (countryCode3) {
                if (!acc[countryCode3]) {
                    acc[countryCode3] = {};
                }
                if (!acc[countryCode3][year]) {
                    acc[countryCode3][year] = {};
                }
                if (!acc[countryCode3][year][measure]) {
                    acc[countryCode3][year][measure] = 0;
                }
                acc[countryCode3][year][measure]++;
            }
        }
        return acc;
    }, {});

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

    // Store color scales in allData
    allData.policies.colorScale = policyColorScale;
    allData.targets.colorScale = targetsColorScale;
    allData.targets.colorScales = targetColorScales;
    allData.targets.minMax = targetMinMax;
    allData.ev = { colorScale: evColorScale };

    // Function to get country color based on current map type
    function getCountryColor(countryCode: string): string {
        if (currentMapType === 'policies') {
            return countryCode && policyData[countryCode] ? policyColorScale(policyData[countryCode]) : '#ccc';
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
                const targetValue = currentTargetData[countryCode].targetValue;
                return currentColorScale(targetValue);
            } else {
                return '#ccc';
            }
        } else if (currentMapType === 'ev') {
            // Placeholder for EV data - will be implemented later
            return '#ccc';
        }
        return '#ccc';
    }

    // Function to get tooltip content based on current map type
    function getTooltipContent(countryCode: string, countryName: string): string {
        if (currentMapType === 'policies') {
            const policyCount = policyData[countryCode] || 'No data';
            return `<strong>${countryName}</strong><br/>Policies: ${policyCount}`;
        } else if (currentMapType === 'targets') {
            const currentTargetData = allData.targets.dataByType[currentTargetType] || {};
            const targetInfo = currentTargetData[countryCode];
            if (targetInfo) {
                return `<strong>${countryName}</strong><br/>Target Type: ${currentTargetType}<br/>Target: ${targetInfo.targetValue}% by ${targetInfo.targetYear}<br/>Decision: ${targetInfo.decisionDate}`;
            } else {
                return `<strong>${countryName}</strong><br/>No ${currentTargetType} target data`;
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
        } else if (mapType === 'targets') {
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
        // Show loading indicator when updating map
        showLoadingIndicator();
        
        g.selectAll("path")
            .transition()
            .duration(500)
            .attr("fill", (d: any) => getCountryColor(d.id))
            .on("end", function() {
                // Hide loading indicator after transition completes
                // Only hide on the last element to complete
                if (this === g.selectAll("path").nodes().slice(-1)[0]) {
                    hideLoadingIndicator();
                }
            });
        
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

    // Function to create time series chart for a specific country
    function createTimeSeriesChart(countryCode3: string, countryName: string) {
        const timeSeriesContainer = document.getElementById('time-series-chart')!;
        timeSeriesContainer.innerHTML = '';

        const countryTimeData = timeSeriesData[countryCode3];
        if (!countryTimeData || Object.keys(countryTimeData).length === 0) {
            timeSeriesContainer.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">No time series data available for this country.</div>';
            return;
        }

        // Prepare data for time series
         const years = Object.keys(countryTimeData).map(Number).sort();
         const measures = new Set<string>();
         Object.entries(countryTimeData).forEach(([year, yearData]) => {
             Object.keys(yearData as { [key: string]: number }).forEach(measure => measures.add(measure));
         });

        const timeSeriesChartData = Array.from(measures).map(measure => ({
            measure,
            values: years.map(year => ({
                year,
                count: countryTimeData[year]?.[measure] || 0
            }))
        }));

        // Chart dimensions
        const margin = { top: 15, right: 60, bottom: 30, left: 40 };
        const chartWidth = 280 - margin.left - margin.right;
        const chartHeight = 150 - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(timeSeriesContainer)
            .append('svg')
            .attr('width', chartWidth + margin.left + margin.right)
            .attr('height', chartHeight + margin.top + margin.bottom)
            .style('cursor', 'pointer')
            .on('click', function() {
                createFullScreenTimeSeriesChart(timeSeriesChartData, countryName, globalColorScale);
                openModal();
            });

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales
        const xScale = d3.scaleLinear()
            .domain(d3.extent(years) as [number, number])
            .range([0, chartWidth]);

        const maxCount = d3.max(timeSeriesChartData, d => d3.max(d.values, v => v.count)) || 0;
        const yScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range([chartHeight, 0]);

        // Line generator
        const line = d3.line<any>()
            .x(d => xScale(d.year))
            .y(d => yScale(d.count))
            .curve(d3.curveMonotoneX);

        // Add axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format('d')))
            .selectAll('text')
            .style('font-size', '10px');

        g.append('g')
            .call(d3.axisLeft(yScale).tickFormat(d3.format('d')).ticks(Math.min(maxCount, 10)))
            .selectAll('text')
            .style('font-size', '10px');

        // Add lines for each measure
        timeSeriesChartData.forEach((measureData) => {
            g.append('path')
                .datum(measureData.values)
                .attr('fill', 'none')
                .attr('stroke', globalColorScale(measureData.measure) as string)
                .attr('stroke-width', 1.5)
                .attr('d', line);

            // Add dots
            g.selectAll(`.dot-${measureData.measure.replace(/\s+/g, '-')}`)
                .data(measureData.values)
                .enter().append('circle')
                .attr('class', `dot-${measureData.measure.replace(/\s+/g, '-')}`)
                .attr('cx', d => xScale(d.year))
                .attr('cy', d => yScale(d.count))
                .attr('r', 2)
                .attr('fill', globalColorScale(measureData.measure) as string);
        });

        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(${chartWidth + margin.left + 10}, ${margin.top})`);

        timeSeriesChartData.forEach((measureData, i) => {
            const legendItem = legend.append('g')
                .attr('transform', `translate(0, ${i * 16})`);

            legendItem.append('rect')
                .attr('width', 10)
                .attr('height', 10)
                .attr('fill', globalColorScale(measureData.measure) as string);

            legendItem.append('text')
                .attr('x', 14)
                .attr('y', 8)
                .attr('font-size', '9px')
                .text(measureData.measure);
        });

        // Add axis labels
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left)
            .attr('x', 0 - (chartHeight / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Policy Count');

        g.append('text')
            .attr('transform', `translate(${chartWidth / 2}, ${chartHeight + margin.bottom - 5})`)
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Year');
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
            const countryPolicyTypes = policyTypeData[countryCode3];

            const panel = document.getElementById('policy-panel')!;
            const backdrop = document.getElementById('panel-backdrop')!;
            const countryTitle = document.getElementById('policy-country')!;
            const policyList = document.getElementById('policy-list')!;

            countryTitle.textContent = `Policy Types in ${countryName}`;
            policyList.innerHTML = '';

            if (countryPolicyTypes && Object.keys(countryPolicyTypes).length > 0) {
                // Create pie chart container
                const chartContainer = document.createElement('div');
                chartContainer.id = 'pie-chart-container';
                chartContainer.style.width = '100%';
                chartContainer.style.height = '400px';
                chartContainer.style.display = 'flex';
                chartContainer.style.flexDirection = 'column';
                chartContainer.style.alignItems = 'center';
                policyList.appendChild(chartContainer);

                // Create SVG for pie chart
                const pieWidth = 200;
                const pieHeight = 200;
                const radius = Math.min(pieWidth, pieHeight) / 2 - 10;

                const pieSvg = d3.select(chartContainer)
                    .append('svg')
                    .attr('width', pieWidth)
                    .attr('height', pieHeight);

                const pieG = pieSvg.append('g')
                    .attr('transform', `translate(${pieWidth / 2}, ${pieHeight / 2})`);

                // Prepare data for pie chart
                const pieData = Object.entries(countryPolicyTypes).map(([type, count]) => ({
                    type,
                    count: count as number
                }));

                // Calculate total for percentages
                const totalCount = pieData.reduce((sum, d) => sum + d.count, 0);

                // Create pie layout
                const pie = d3.pie<any>()
                    .value(d => d.count)
                    .sort(null);

                const arc = d3.arc<any>()
                    .innerRadius(0)
                    .outerRadius(radius);

                // Create pie slices
                const slices = pieG.selectAll('.slice')
                    .data(pie(pieData))
                    .enter()
                    .append('g')
                    .attr('class', 'slice');

                slices.append('path')
                    .attr('d', arc)
                    .attr('fill', d => globalColorScale(d.data.type) as string)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2)
                    .style('cursor', 'pointer')
                    .on('click', function() {
                        createFullScreenPieChart(pieData, countryName, globalColorScale);
                        openModal();
                    });

                // Add labels (show percentages)
                slices.append('text')
                    .attr('transform', d => `translate(${arc.centroid(d)})`)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '10px')
                    .attr('fill', 'white')
                    .attr('font-weight', 'bold')
                    .text(d => {
                        const percentage = Math.round((d.data.count / totalCount) * 100);
                        return `${percentage}%`;
                    });

                // Create legend
                const legend = d3.select(chartContainer)
                    .append('div')
                    .style('margin-top', '20px')
                    .style('display', 'flex')
                    .style('flex-wrap', 'wrap')
                    .style('justify-content', 'center')
                    .style('gap', '10px');

                pieData.forEach((d) => {
                    const legendItem = legend.append('div')
                        .style('display', 'flex')
                        .style('align-items', 'center')
                        .style('margin', '5px');

                    legendItem.append('div')
                        .style('width', '12px')
                        .style('height', '12px')
                        .style('background-color', globalColorScale(d.type) as string)
                        .style('margin-right', '4px')
                        .style('border-radius', '2px');

                    legendItem.append('span')
                        .style('font-size', '10px')
                        .text(`${d.type} (${d.count})`);
                });

            } else {
                policyList.innerHTML = '<p>No policy type data available for this country.</p>';
            }

            // Create time series chart
            createTimeSeriesChart(countryCode3, countryName);

            panel.classList.add('visible');
            backdrop.classList.add('visible');
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
                currentMapType = target.value;
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
                const values = ['policies', 'ev', 'targets'];
                const selectedValue = values[index];
                
                if (selectedValue === 'targets') {
                    // Set map type to targets and show submenu
                    currentMapType = 'targets';
                    
                    // Update toggle switch appearance
                    toggleSwitch.setAttribute('data-active', selectedValue);
                    
                    showTargetsSubmenu();
                    // Update the map to show Electricity data immediately
                    updateMap();
                } else {
                    // Hide targets submenu if it's open
                    hideTargetsSubmenu();
                    
                    // Update toggle switch appearance
                    toggleSwitch.setAttribute('data-active', selectedValue);
                    
                    // Update hidden radio buttons for compatibility
                    const radioButton = document.querySelector(`input[name="mapType"][value="${selectedValue}"]`) as HTMLInputElement;
                    if (radioButton) {
                        radioButton.checked = true;
                        currentMapType = selectedValue;
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

}).catch(error => {
    console.error('Error loading data:', error);
    // Hide loading indicator even if there's an error
    hideLoadingIndicator();
});

document.addEventListener('DOMContentLoaded', () => {
    const functionList = document.getElementById('function-list');
    const currentFunctionName = document.getElementById('current-function-name');
    const formulaTContainer = document.getElementById('formula-t');
    const formulaSContainer = document.getElementById('formula-s');
    const controlsSection = document.getElementById('controls-section');
    const controlsContainer = document.getElementById('controls-container');
    const plotIds = ['plot-time', 'plot-freq', 'plot-phase', 'plot-3d'];

    let currentFunction = mathFunctions[0]; // Default to first function
    let plotInitialized = false;
    let plotUpdatePending = false;

    // Reusable axes for the 3D plot to avoid re-creating arrays on every slider move
    const SIGMA_RANGE = [];
    const OMEGA_RANGE = [];
    const COMPLEX_STEP = 0.2;
    const COMPLEX_RANGE = 5;

    for (let s = -COMPLEX_RANGE; s <= COMPLEX_RANGE; s += COMPLEX_STEP) {
        SIGMA_RANGE.push(s);
    }
    for (let w = -COMPLEX_RANGE; w <= COMPLEX_RANGE; w += COMPLEX_STEP) {
        OMEGA_RANGE.push(w);
    }

    // Initialize UI
    initFunctionList();
    initZoomButtons();
    updateDisplay();

    function initFunctionList() {
        mathFunctions.forEach(func => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.textContent = func.name;
            btn.onclick = () => {
                // Update active state in UI
                document.querySelectorAll('#function-list button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Set current function and update view
                currentFunction = func;
                updateDisplay();
            };
            
            if (func.id === currentFunction.id) {
                btn.classList.add('active');
            }
            
            li.appendChild(btn);
            functionList.appendChild(li);
        });
    }

    function initZoomButtons() {
        document.querySelectorAll('[data-zoom-target]').forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-zoom-target');
                const plotElement = document.getElementById(targetId);
                if (!plotElement) return;

                const fullscreenTarget = plotElement.closest('.graph-card') || plotElement;
                toggleFullscreen(fullscreenTarget, plotElement);
            });
        });
    }

    function updateDisplay() {
        // Update Header
        currentFunctionName.textContent = currentFunction.name;

        // Update Formulas
        // We need to use MathJax to re-render the formulas
        formulaTContainer.innerHTML = `$$ ${currentFunction.formula_t} $$`;
        formulaSContainer.innerHTML = `$$ ${currentFunction.formula_s} $$`;
        
        if (window.MathJax) {
            MathJax.typesetPromise([formulaTContainer, formulaSContainer]).catch((err) => console.error(err));
        }

        // Update Controls
        updateControls();

        // Update Graphs
        plotGraphs();
    }

    function updateControls() {
        controlsContainer.innerHTML = '';
        const params = currentFunction.params;
        const paramKeys = Object.keys(params);

        if (paramKeys.length > 0) {
            controlsSection.style.display = 'block';
            
            paramKeys.forEach(key => {
                // Setup labels and ranges based on parameter name
                let labelText = key;
                let min = 0.1, max = 10, step = 0.1;

                if (key === 'w0') {
                    labelText = 'Частота (ω₀)';
                    min = 0.5; max = 10; step = 0.1;
                } else if (key === 'a') {
                    labelText = 'Затухання (a)';
                    min = 0.1; max = 5; step = 0.1;
                }

                const group = document.createElement('div');
                group.className = 'control-group';

                const label = document.createElement('label');
                label.innerHTML = `${labelText}: <span class="control-value" id="val-${key}">${params[key]}</span>`;
                
                const input = document.createElement('input');
                input.type = 'range';
                input.min = min;
                input.max = max;
                input.step = step;
                input.value = params[key];

                input.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    currentFunction.params[key] = val;
                    document.getElementById(`val-${key}`).textContent = val;
                    schedulePlot();
                });

                group.appendChild(label);
                group.appendChild(input);
                controlsContainer.appendChild(group);
            });
        } else {
            controlsSection.style.display = 'none';
        }
    }

    function schedulePlot() {
        if (plotUpdatePending) return;
        plotUpdatePending = true;
        requestAnimationFrame(() => {
            plotUpdatePending = false;
            plotGraphs();
        });
    }

    function plotGraphs() {
        // --- Time Domain Plot ---
        const tValues = [];
        const ftValues = [];
        
        // Generate t from -1 to 10 with step 0.05
        for (let t = -1; t <= 10; t += 0.05) {
            tValues.push(t);
            ftValues.push(currentFunction.calculate_t(t, currentFunction.params));
        }

        const traceTime = {
            x: tValues,
            y: ftValues,
            mode: 'lines',
            name: 'f(t)',
            line: { color: '#2563eb', width: 3 }
        };

        const layoutTime = {
            margin: { t: 20, r: 20, b: 40, l: 40 },
            xaxis: { title: 'Час (t)' },
            yaxis: { title: 'f(t)' },
            showlegend: false
        };

        if (plotInitialized) {
            Plotly.react('plot-time', [traceTime], layoutTime, { responsive: true, displayModeBar: false });
        } else {
            Plotly.newPlot('plot-time', [traceTime], layoutTime, { responsive: true, displayModeBar: false });
        }

        // --- Frequency Domain Plot (Magnitude) ---
        const wValues = [];
        const FwValues = [];
        const phaseValues = [];

        // Generate w from -10 to 10 with step 0.1
        for (let w = -10; w <= 10; w += 0.05) {
            wValues.push(w);
            const val = currentFunction.calculate_s_mag(w, currentFunction.params);
            // Handle nulls (infinity/singularity) for plotting
            FwValues.push(val === null ? null : val);

            const phase = currentFunction.calculate_s_phase
                ? currentFunction.calculate_s_phase(w, currentFunction.params)
                : null;
            phaseValues.push(phase === null ? null : phase);
        }

        const traceFreq = {
            x: wValues,
            y: FwValues,
            mode: 'lines',
            name: '|F(jw)|',
            line: { color: '#dc2626', width: 3 }
        };

        const layoutFreq = {
            margin: { t: 20, r: 20, b: 40, l: 40 },
            xaxis: { title: 'Частота (ω)' },
            yaxis: { title: '|F(jω)|' },
            showlegend: false
        };

        const plotMethod = plotInitialized ? Plotly.react : Plotly.newPlot;
        plotMethod('plot-freq', [traceFreq], layoutFreq, { responsive: true, displayModeBar: false });

        // --- Frequency Domain Plot (Phase) ---
        const tracePhase = {
            x: wValues,
            y: phaseValues,
            mode: 'lines',
            name: 'φ(ω)',
            line: { color: '#0f766e', width: 3 }
        };

        const layoutPhase = {
            margin: { t: 20, r: 20, b: 40, l: 40 },
            xaxis: { title: 'Частота (ω)' },
            yaxis: { title: 'Фаза φ(ω), рад' },
            showlegend: false
        };

        plotMethod('plot-phase', [tracePhase], layoutPhase, { responsive: true, displayModeBar: false });

        // --- 3D Plot of |F(s)| over complex plane ---
        
        // We'll create a grid of sigma (real part) and omega (imaginary part)
        // Be careful with resolution to avoid performance issues
        const zData = [];

        // Calculate Z values (Magnitude)
        // Plotly Surface expects z as an array of arrays (rows are y, cols are x)
        // Here: x is Sigma, y is Omega
        for (let i = 0; i < OMEGA_RANGE.length; i++) { // iterate rows (y - omega)
            const w = OMEGA_RANGE[i];
            const row = [];
            for (let j = 0; j < SIGMA_RANGE.length; j++) { // iterate cols (x - sigma)
                const s = SIGMA_RANGE[j];
                
                let val = 0;
                if (currentFunction.calculate_s_complex) {
                     val = currentFunction.calculate_s_complex(s, w, currentFunction.params);
                }
                
                // Cap the magnitude to avoid spikes ruining the plot scale
                if (val === null || val > 10) val = 10;
                
                row.push(val);
            }
            zData.push(row);
        }

        const trace3d = {
            z: zData,
            x: SIGMA_RANGE,
            y: OMEGA_RANGE,
            type: 'surface',
            colorscale: 'Viridis',
            showscale: false,
            contours: {
                z: {
                    show: true,
                    usecolormap: true,
                    highlightcolor: "#42f462",
                    project: { z: true }
                }
            }
        };

        const layout3d = {
            title: 'Магнітуда |F(σ + jω)|',
            scene: {
                xaxis: { title: 'Real (σ)' },
                yaxis: { title: 'Imag (jω)' },
                zaxis: { title: '|F(s)|' },
                camera: {
                    eye: { x: 1.5, y: 1.5, z: 1.5 }
                }
            },
            margin: { t: 40, r: 20, b: 20, l: 20 },
            autosize: true
        };

        if (plotInitialized) {
            Plotly.react('plot-3d', [trace3d], layout3d, { responsive: true });
        } else {
            Plotly.newPlot('plot-3d', [trace3d], layout3d, { responsive: true });
        }

        plotInitialized = true;
    }

    // Handle window resize for Plotly
    window.addEventListener('resize', () => {
        Plotly.Plots.resize('plot-time');
        Plotly.Plots.resize('plot-freq');
        Plotly.Plots.resize('plot-phase');
        Plotly.Plots.resize('plot-3d');
    });

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    function toggleFullscreen(fullscreenTarget, plotElement) {
        if (!fullscreenTarget || !fullscreenTarget.requestFullscreen) return;

        if (document.fullscreenElement === fullscreenTarget) {
            document.exitFullscreen();
            return;
        }

        const requestFullscreen = () => fullscreenTarget.requestFullscreen()
            .then(() => {
                Plotly.Plots.resize(plotElement);
            })
            .catch(() => {});

        if (document.fullscreenElement && document.fullscreenElement !== fullscreenTarget) {
            document.exitFullscreen().then(requestFullscreen);
        } else {
            requestFullscreen();
        }
    }

    function handleFullscreenChange() {
        const fullscreenElement = document.fullscreenElement;
        if (fullscreenElement) {
            const plot = fullscreenElement.querySelector('.js-plotly-plot')
                || (fullscreenElement.classList.contains('js-plotly-plot') ? fullscreenElement : null);
            if (plot) {
                Plotly.Plots.resize(plot);
            }
        } else {
            plotIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    Plotly.Plots.resize(el);
                }
            });
        }
    }
});

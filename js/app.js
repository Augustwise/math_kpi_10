document.addEventListener('DOMContentLoaded', () => {
    const functionList = document.getElementById('function-list');
    const currentFunctionName = document.getElementById('current-function-name');
    const formulaTContainer = document.getElementById('formula-t');
    const formulaSContainer = document.getElementById('formula-s');
    const controlsSection = document.getElementById('controls-section');
    const controlsContainer = document.getElementById('controls-container');
    
    let currentFunction = mathFunctions[0]; // Default to first function

    // Initialize UI
    initFunctionList();
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
                    plotGraphs();
                });

                group.appendChild(label);
                group.appendChild(input);
                controlsContainer.appendChild(group);
            });
        } else {
            controlsSection.style.display = 'none';
        }
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

        Plotly.newPlot('plot-time', [traceTime], layoutTime, { responsive: true, displayModeBar: false });

        // --- Frequency Domain Plot (Magnitude) ---
        const wValues = [];
        const FwValues = [];

        // Generate w from -10 to 10 with step 0.1
        for (let w = -10; w <= 10; w += 0.05) {
            wValues.push(w);
            const val = currentFunction.calculate_s_mag(w, currentFunction.params);
            // Handle nulls (infinity/singularity) for plotting
            FwValues.push(val === null ? null : val);
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

        Plotly.newPlot('plot-freq', [traceFreq], layoutFreq, { responsive: true, displayModeBar: false });

        // --- 3D Plot of |F(s)| over complex plane ---
        
        // We'll create a grid of sigma (real part) and omega (imaginary part)
        // Be careful with resolution to avoid performance issues
        const sigmaRange = [];
        const omegaRange = [];
        const zData = [];
        
        const step = 0.2; 
        const range = 5;

        // Prepare axis values
        for (let s = -range; s <= range; s += step) {
            sigmaRange.push(s);
        }
        for (let w = -range; w <= range; w += step) {
            omegaRange.push(w);
        }

        // Calculate Z values (Magnitude)
        // Plotly Surface expects z as an array of arrays (rows are y, cols are x)
        // Here: x is Sigma, y is Omega
        for (let i = 0; i < omegaRange.length; i++) { // iterate rows (y - omega)
            const w = omegaRange[i];
            const row = [];
            for (let j = 0; j < sigmaRange.length; j++) { // iterate cols (x - sigma)
                const s = sigmaRange[j];
                
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
            x: sigmaRange,
            y: omegaRange,
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

        Plotly.newPlot('plot-3d', [trace3d], layout3d, { responsive: true });
    }
    
    // Handle window resize for Plotly
    window.addEventListener('resize', () => {
        Plotly.Plots.resize('plot-time');
        Plotly.Plots.resize('plot-freq');
        Plotly.Plots.resize('plot-3d');
    });
});

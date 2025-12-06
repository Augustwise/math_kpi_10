const mathFunctions = [
    {
        id: 'unit_step',
        name: 'Одиничний стрибок (Unit Step)',
        formula_t: 'f(t) = u(t) = \\begin{cases} 1, & t \\ge 0 \\\\ 0, & t < 0 \\end{cases}',
        formula_s: 'F(s) = \\frac{1}{s}',
        calculate_t: (t) => t >= 0 ? 1 : 0,
        calculate_s_mag: (w) => {
            // |1/(jw)| = 1/w
            if (w === 0) return null; // Singularity
            return 1 / Math.abs(w);
        },
        calculate_s_phase: (w) => {
            if (w === 0) return null;
            // F(jw) = -j / w => purely imaginary
            return Math.atan2(-1 / w, 0);
        },
        calculate_s_complex: (sigma, omega, params) => {
            // F(s) = 1/s = 1/(sigma + j*omega)
            // |F(s)| = 1 / sqrt(sigma^2 + omega^2)
            const mag = Math.sqrt(sigma * sigma + omega * omega);
            return mag === 0 ? null : 1 / mag;
        },
        params: {}
    },
    {
        id: 'exponential',
        name: 'Експонента',
        formula_t: 'f(t) = e^{-at}, \\quad a > 0',
        formula_s: 'F(s) = \\frac{1}{s+a}',
        calculate_t: (t, params) => {
            const a = params.a || 1;
            return t >= 0 ? Math.exp(-a * t) : 0;
        },
        calculate_s_mag: (w, params) => {
            const a = params.a || 1;
            // |1 / (a + jw)| = 1 / sqrt(a^2 + w^2)
            return 1 / Math.sqrt(a * a + w * w);
        },
        calculate_s_phase: (w, params) => {
            const a = params.a || 1;
            // Phase of 1 / (a + jw) is -atan2(w, a)
            return Math.atan2(-w, a);
        },
        calculate_s_complex: (sigma, omega, params) => {
            const a = params.a || 1;
            // F(s) = 1 / (s + a) = 1 / (sigma + j*omega + a)
            // |F(s)| = 1 / sqrt((sigma + a)^2 + omega^2)
            const real = sigma + a;
            const imag = omega;
            const mag = Math.sqrt(real * real + imag * imag);
            return mag === 0 ? null : 1 / mag;
        },
        params: { a: 1 }
    },
    {
        id: 'sine',
        name: 'Синус',
        formula_t: 'f(t) = \\sin(\\omega_0 t)',
        formula_s: 'F(s) = \\frac{\\omega_0}{s^2 + \\omega_0^2}',
        calculate_t: (t, params) => {
            const w0 = params.w0 || 1;
            return t >= 0 ? Math.sin(w0 * t) : 0;
        },
        calculate_s_mag: (w, params) => {
            const w0 = params.w0 || 1;
            // |w0 / ((jw)^2 + w0^2)| = |w0 / (w0^2 - w^2)|
            const den = Math.abs(w0 * w0 - w * w);
            if (den === 0) return null; // Resonance
            return Math.abs(w0) / den;
        },
        calculate_s_phase: (w, params) => {
            const w0 = params.w0 || 1;
            const real = w0 * w0 - w * w;
            if (real === 0) return null;
            return Math.atan2(0, real);
        },
        calculate_s_complex: (sigma, omega, params) => {
            const w0 = params.w0 || 1;
            // F(s) = w0 / (s^2 + w0^2)
            // s = sigma + j*omega
            // s^2 = (sigma^2 - omega^2) + j(2*sigma*omega)
            // Denom = (sigma^2 - omega^2 + w0^2) + j(2*sigma*omega)
            // |Denom| = sqrt((sigma^2 - omega^2 + w0^2)^2 + (2*sigma*omega)^2)
            const sigma2 = sigma * sigma;
            const omega2 = omega * omega;
            const w02 = w0 * w0;
            
            const realDenom = sigma2 - omega2 + w02;
            const imagDenom = 2 * sigma * omega;
            const magDenom = Math.sqrt(realDenom * realDenom + imagDenom * imagDenom);
            
            return magDenom === 0 ? null : Math.abs(w0) / magDenom;
        },
        params: { w0: 1 }
    },
    {
        id: 'cosine',
        name: 'Косинус',
        formula_t: 'f(t) = \\cos(\\omega_0 t)',
        formula_s: 'F(s) = \\frac{s}{s^2 + \\omega_0^2}',
        calculate_t: (t, params) => {
            const w0 = params.w0 || 1;
            return t >= 0 ? Math.cos(w0 * t) : 0;
        },
        calculate_s_mag: (w, params) => {
            const w0 = params.w0 || 1;
            // |jw / (w0^2 - w^2)| = |w| / |w0^2 - w^2|
            const den = Math.abs(w0 * w0 - w * w);
            if (den === 0) return null;
            return Math.abs(w) / den;
        },
        calculate_s_phase: (w, params) => {
            const w0 = params.w0 || 1;
            const real = w0 * w0 - w * w;
            if (real === 0) return null;
            const imagVal = w / real;
            return Math.atan2(imagVal, 0);
        },
        calculate_s_complex: (sigma, omega, params) => {
            const w0 = params.w0 || 1;
            // F(s) = s / (s^2 + w0^2)
            // |F(s)| = |s| / |s^2 + w0^2|
            // |s| = sqrt(sigma^2 + omega^2)
            // Denom magnitude same as sine
            
            const sMag = Math.sqrt(sigma * sigma + omega * omega);
            
            const sigma2 = sigma * sigma;
            const omega2 = omega * omega;
            const w02 = w0 * w0;
            
            const realDenom = sigma2 - omega2 + w02;
            const imagDenom = 2 * sigma * omega;
            const magDenom = Math.sqrt(realDenom * realDenom + imagDenom * imagDenom);
            
            return magDenom === 0 ? null : sMag / magDenom;
        },
        params: { w0: 1 }
    },
    {
        id: 'damped_sine',
        name: 'Затухаючий синус',
        formula_t: 'f(t) = e^{-at} \\sin(\\omega_0 t)',
        formula_s: 'F(s) = \\frac{\\omega_0}{(s+a)^2 + \\omega_0^2}',
        calculate_t: (t, params) => {
            const a = params.a || 0.5;
            const w0 = params.w0 || 3;
            return t >= 0 ? Math.exp(-a * t) * Math.sin(w0 * t) : 0;
        },
        calculate_s_mag: (w, params) => {
            const a = params.a || 0.5;
            const w0 = params.w0 || 3;
            // s = jw
            // Denominator: (a + jw)^2 + w0^2 = (a^2 - w^2 + j2aw) + w0^2 = (a^2 + w0^2 - w^2) + j(2aw)
            // Magnitude: sqrt( (a^2 + w0^2 - w^2)^2 + (2aw)^2 )
            const realPart = a * a + w0 * w0 - w * w;
            const imagPart = 2 * a * w;
            const denMag = Math.sqrt(realPart * realPart + imagPart * imagPart);
            return w0 / denMag;
        },
        calculate_s_phase: (w, params) => {
            const a = params.a || 0.5;
            const w0 = params.w0 || 3;
            const realDen = a * a + w0 * w0 - w * w;
            const imagDen = 2 * a * w;
            const denMagSq = realDen * realDen + imagDen * imagDen;
            if (denMagSq === 0) return null;
            const real = (w0 * realDen) / denMagSq;
            const imag = (-w0 * imagDen) / denMagSq;
            return Math.atan2(imag, real);
        },
        calculate_s_complex: (sigma, omega, params) => {
            const a = params.a || 0.5;
            const w0 = params.w0 || 3;
            // F(s) = w0 / ((s+a)^2 + w0^2)
            // Let s + a = sigma_shifted + j*omega
            // (s+a)^2 = (sigma+a)^2 - omega^2 + j*2*(sigma+a)*omega
            
            const realTerm = (sigma + a) * (sigma + a) - omega * omega + w0 * w0;
            const imagTerm = 2 * (sigma + a) * omega;
            const magDenom = Math.sqrt(realTerm * realTerm + imagTerm * imagTerm);
            
            return magDenom === 0 ? null : Math.abs(w0) / magDenom;
        },
        params: { a: 0.5, w0: 3 }
    }
];


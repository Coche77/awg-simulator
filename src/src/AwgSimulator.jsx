<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Osoley AWG Technical Simulator</title>
    <style>
        :root {
            --metal-light: #e2e8f0;
            --metal-dark: #94a3b8;
            --glass: rgba(255, 255, 255, 0.15);
            --water: #00d4ff;
            --uv: #bf40f0;
        }

        body {
            background-color: #cbd5e1;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            font-family: 'Inter', sans-serif;
        }

        /* --- CHASIS PRINCIPAL --- */
        .awg-case {
            width: 1050px;
            height: 650px;
            background: linear-gradient(145deg, #f1f5f9, #cbd5e1);
            border-radius: 40px;
            padding: 30px;
            display: flex;
            gap: 30px;
            box-shadow: 30px 30px 60px #a3b1c6, -20px -20px 60px #ffffff;
            border: 1px solid rgba(255,255,255,0.6);
        }

        /* --- VISUALIZADOR INTERNO (Cámara de vacío) --- */
        .viewport {
            flex: 1;
            background: #e2e8f0;
            border-radius: 30px;
            position: relative;
            box-shadow: inset 8px 8px 16px #94a3b8, inset -8px -8px 16px #ffffff;
            overflow: hidden;
            border: 2px solid #cbd5e1;
        }

        /* Etiquetas de Texto */
        .info-label {
            position: absolute;
            top: 25px;
            left: 30px;
            font-size: 11px;
            color: #64748b;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* VENTILADOR (Estilo Industrial) */
        .fan-module {
            position: absolute;
            top: 80px;
            left: 40px;
            width: 200px;
            height: 200px;
            background: radial-gradient(circle, #cbd5e1, #94a3b8);
            border: 10px solid #f1f5f9;
            border-radius: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            box-shadow: 10px 10px 20px rgba(0,0,0,0.1);
        }
        .fan-blades {
            font-size: 120px;
            animation: spin var(--speed, 2s) linear infinite;
            filter: drop-shadow(0 0 5px rgba(0,0,0,0.2));
        }

        /* BOBINAS DE CONDENSACIÓN (Curvadas) */
        .coil-system {
            position: absolute;
            top: 60px;
            right: 50px;
            width: 300px;
            height: 220px;
            display: flex;
            justify-content: center;
            align-items: center;
            background: rgba(255,255,255,0.1);
            border-radius: 20px;
        }
        .coil-pipe {
            width: 18px;
            height: 180px;
            margin: 0 6px;
            background: linear-gradient(to right, #2563eb, #60a5fa, #2563eb);
            border-radius: 20px;
            box-shadow: 2px 5px 10px rgba(0,0,0,0.2);
        }

        /* FILTRACIÓN HORIZONTAL */
        .filtration-unit {
            position: absolute;
            top: 340px;
            left: 50%;
            transform: translateX(-50%);
            width: 85%;
            height: 70px;
            background: linear-gradient(180deg, #334155, #1e293b);
            border-radius: 35px;
            display: flex;
            align-items: center;
            padding: 0 40px;
            box-shadow: 0 15px 30px rgba(0,0,0,0.3);
        }
        .uv-active {
            width: 140px;
            height: 25px;
            background: var(--uv);
            margin: 0 auto;
            border-radius: 15px;
            box-shadow: 0 0 25px var(--uv);
            animation: pulse 2s infinite;
        }

        /* TANQUES DE AGUA (Efecto Cristal) */
        .storage-area {
            position: absolute;
            bottom: 40px;
            width: 100%;
            display: flex;
            justify-content: space-around;
        }
        .glass-tank {
            width: 220px;
            height: 160px;
            background: rgba(255,255,255,0.3);
            border: 2px solid rgba(255,255,255,0.6);
            border-top: none;
            border-radius: 0 0 25px 25px;
            position: relative;
            backdrop-filter: blur(10px);
            overflow: hidden;
        }
        .water-fill {
            position: absolute;
            bottom: 0;
            width: 100%;
            background: linear-gradient(180deg, rgba(0,212,255,0.4), var(--water));
            transition: height 0.4s ease;
        }

        /* --- PANEL LATERAL --- */
        .side-panel {
            width: 320px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .display-screen {
            background: #0f172a;
            color: #38bdf8;
            padding: 30px;
            border-radius: 25px;
            box-shadow: 10px 10px 20px rgba(0,0,0,0.1);
        }
        .control-box {
            background: white;
            padding: 20px;
            border-radius: 20px;
            box-shadow: 5px 5px 15px rgba(0,0,0,0.05);
        }
        label { font-size: 12px; font-weight: 700; color: #64748b; }
        input[type="range"] { width: 100%; margin-top: 10px; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.5; filter: blur(10px); } 50% { opacity: 1; filter: blur(15px); } }
    </style>
</head>
<body>

<div class="awg-case">
    <div class="viewport">
        <div class="info-label">Generador AWG Interactivo | Osoley System</div>
        
        <div class="fan-module">
            <div class="fan-blades" id="fan-ui">⚙️</div>
        </div>

        <div class="coil-system">
            <div class="coil-pipe"></div><div class="coil-pipe"></div><div class="coil-pipe"></div>
            <div class="coil-pipe"></div><div class="coil-pipe"></div><div class="coil-pipe"></div>
        </div>

        <div class="filtration-unit">
            <span style="color: #64748b; font-size: 10px;">SEDIMENT</span>
            <div class="uv-active"></div>
            <span style="color: #64748b; font-size: 10px;">CARBON</span>
        </div>

        <div class="storage-area">
            <div class="glass-tank"><div id="tank-1" class="water-fill"></div></div>
            <div class="glass-tank"><div id="tank-2" class="water-fill"></div></div>
        </div>
    </div>

    <div class="side-panel">
        <div class="display-screen">
            <h3 style="margin: 0; font-size: 14px; color: #94a3b8;">PRODUCCIÓN ACTUAL</h3>
            <div style="font-size: 40px; font-weight: 900; margin: 10px 0;"><span id="rate-num">0.00</span> <small style="font-size: 15px;">L/h</small></div>
            <div id="status-tag" style="font-size: 12px; background: #1e293b; padding: 5px 10px; border-radius: 5px; display: inline-block;">MODO: STANDBY</div>
        </div>

        <div class="control-box">
            <label>FLUJO DE AIRE</label>
            <input type="range" id="flow-ctrl" min="0" max="100" value="50">
        </div>

        <div class="control-box">
            <label>TEMPERATURA BOBINA (°C)</label>
            <input type="range" id="temp-ctrl" min="1" max="25" value="12">
        </div>

        <button onclick="reset()" style="width: 100%; padding: 20px; border-radius: 15px; border: none; background: #ef4444; color: white; font-weight: 900; cursor: pointer; box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3);">REINICIAR SISTEMA</button>
    </div>
</div>

<script>
    const flowInput = document.getElementById('flow-ctrl');
    const tempInput = document.getElementById('temp-ctrl');
    const t1 = document.getElementById('tank-1');
    const t2 = document.getElementById('tank-2');
    const rateTxt = document.getElementById('rate-num');
    const fanUi = document.getElementById('fan-ui');

    let lvl1 = 0, lvl2 = 0;

    function coreLogic() {
        const flow = flowInput.value;
        const temp = tempInput.value;

        // Visual: Velocidad del ventilador
        fanUi.style.setProperty('--speed', (105 - flow) / 35 + 's');

        // Matemática: Producción basada en flujo vs temperatura
        const efficiency = (flow / 100) * (26 - temp);
        const rate = Math.max(0, efficiency / 5);
        rateTxt.innerText = rate.toFixed(2);

        // Llenado de tanques con retraso de filtrado
        if (rate > 0) {
            lvl1 = Math.min(100, lvl1 + (rate / 15));
            if (lvl1 > 20) lvl2 = Math.min(100, lvl2 + (rate / 20));
        }

        t1.style.height = lvl1 + '%';
        t2.style.height = lvl2 + '%';

        document.getElementById('status-tag').innerText = rate > 1 ? "MODO: PRODUCIENDO" : "MODO: BAJA EFICIENCIA";
        document.getElementById('status-tag').style.color = rate > 1 ? "#4ade80" : "#facc15";
    }

    function reset() { lvl1 = 0; lvl2 = 0; coreLogic(); }
    
    flowInput.oninput = coreLogic;
    tempInput.oninput = coreLogic;
    setInterval(coreLogic, 200);
</script>

</body>
</html>

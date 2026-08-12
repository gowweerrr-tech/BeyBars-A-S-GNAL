console.log("Trade Result Module Loaded");

window.tradeResultState = {
    ready: false,
    isProcessingPrice: false
};

function testScreenAccess() {
    const video = document.getElementById("screenVideo");

    if (!video) {
        console.warn("Trade Result: #screenVideo не найден.");
        return;
    }

    const checkVideo = setInterval(() => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            clearInterval(checkVideo);
            window.tradeResultState.ready = true;
            console.log("Trade Result: Видеопоток ГОТОВ!");
        }
    }, 200);
}

// Захват только вертикальной оси с ценой
function getExactPriceCanvas(debugMode = false) {
    const video = document.getElementById("screenVideo");
    if (!video || !window.tradeResultState.ready) return null;

    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    // Границы оси цен
    const cropX = Math.floor(vWidth * (0.60 + 0.35 * 0.60)); 
    const cropY = 0; 
    const cropW = Math.floor(vWidth * 0.09); 
    const cropH = vHeight;

    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = cropW;
    fullCanvas.height = cropH;

    const ctx = fullCanvas.getContext("2d");
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const imgData = ctx.getImageData(0, 0, cropW, cropH);
    const data = imgData.data;

    let maxBlueCount = 0;
    let bestY = -1;

    // Ищем строго синюю плашку (игнорируем серые метки)
    for (let y = 0; y < cropH; y++) {
        let bluePixelsInRow = 0;
        for (let x = 0; x < cropW; x++) {
            const idx = (y * cropW + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Фильтр строго для синей плашки (B существенно выше R и G)
            const isBlueBadge = (b > 90 && b > r + 30 && b > g + 10);
            
            if (isBlueBadge) {
                bluePixelsInRow++;
            }
        }

        if (bluePixelsInRow > maxBlueCount) {
            maxBlueCount = bluePixelsInRow;
            bestY = y;
        }
    }

    // Если синяя плашка не найдена (меньше 8 синих пикселей в строке)
    if (bestY === -1 || maxBlueCount < 8) {
        if (debugMode) console.log("Trade Result Debug: Живая синяя плашка не распознана на экране.");
        return null;
    }

    // Вырезаем прямоугольник вокруг найденного синего центра
    const badgeH = 32;
    const startY = Math.max(0, bestY - Math.floor(badgeH / 2));

    const badgeCanvas = document.createElement("canvas");
    badgeCanvas.width = cropW;
    badgeCanvas.height = badgeH;
    const badgeCtx = badgeCanvas.getContext("2d");

    badgeCtx.drawImage(fullCanvas, 0, startY, cropW, badgeH, 0, 0, cropW, badgeH);

    if (debugMode) {
        console.log(`Найдена СИНЯЯ плашка на Y=${bestY} (пикселей синего: ${maxBlueCount}). Ссылка:`);
        console.log(badgeCanvas.toDataURL("image/png"));
    }

    return badgeCanvas;
}

window.debugBadge = function() {
    return getExactPriceCanvas(true);
};

window.getCurrentPrice = async function() {
    if (window.tradeResultState.isProcessingPrice) {
        return null;
    }

    const canvas = getExactPriceCanvas(false);
    if (!canvas) {
        console.log("Trade Result ERROR: Не удалось найти синюю плашку живой цены");
        return null;
    }

    if (typeof Tesseract === "undefined") {
        console.error("Trade Result ERROR: Tesseract.js не подключен!");
        return null;
    }

    window.tradeResultState.isProcessingPrice = true;

    try {
        const worker = await Tesseract.createWorker("eng");
        await worker.setParameters({
            tessedit_char_whitelist: "0123456789.",
        });

        const { data: { text } } = await worker.recognize(canvas);
        await worker.terminate();

        window.tradeResultState.isProcessingPrice = false;

        const cleanText = text.replace(/[^0-9.]/g, "").trim();
        const price = parseFloat(cleanText);

        if (!isNaN(price)) {
            console.log("%c Trade Result SUCCESS: Живая цена = " + price, "color: #00ff00; font-weight: bold;");
            return price;
        } else {
            console.warn("Trade Result WARNING: Сырой текст с плашки:", text);
            return null;
        }
    } catch (err) {
        window.tradeResultState.isProcessingPrice = false;
        console.error("Trade Result OCR Error:", err);
        return null;
    }
};

if (document.readyState === "complete" || document.readyState === "interactive") {
    testScreenAccess();
} else {
    document.addEventListener("DOMContentLoaded", testScreenAccess);
}

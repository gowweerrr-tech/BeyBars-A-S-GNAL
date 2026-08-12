console.log("Trade Result Module Loaded");

window.tradeResultState = {
    ready: false,
    isProcessingPrice: false
};

function testScreenAccess() {
    const video = document.getElementById("screenVideo");

    if (!video) {
        console.log("Trade Result: screenVideo NOT FOUND");
        return;
    }

    console.log("Trade Result: screenVideo FOUND");

    const checkVideo = setInterval(() => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            clearInterval(checkVideo);
            window.tradeResultState.ready = true;

            console.log(
                "Trade Result: Video READY",
                video.videoWidth + " x " + video.videoHeight
            );
            console.log("-----------------------------------------");
            console.log("Запустите debugBadge() для визуальной проверки оси цен.");
            console.log("Запустите getCurrentPrice() для распознавания цены.");
        }
    }, 200);
}

// Поиск и захват плашки цены
function getExactPriceCanvas(debugMode = false) {
    const video = document.getElementById("screenVideo");
    if (!video || !window.tradeResultState.ready) return null;

    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    // Сдвигаем X левее (от 68% до 78% ширины), чтобы гарантированно обойти кнопку "КУПИТЬ"
    const cropX = Math.floor(vWidth * 0.68); 
    const cropY = Math.floor(vHeight * 0.10);
    const cropW = Math.floor(vWidth * 0.10); 
    const cropH = Math.floor(vHeight * 0.80);

    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = cropW;
    fullCanvas.height = cropH;

    const ctx = fullCanvas.getContext("2d");
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Если включена отладка, выводим ВСЮ полосу оси цен, чтобы увидеть, где плашка
    if (debugMode) {
        console.log(`Trade Result Debug: Сканирование области X=${cropX}, Y=${cropY}, W=${cropW}, H=${cropH}`);
        console.log("Ссылка на всю ось цен (проверьте, видна ли плашка):");
        console.log(fullCanvas.toDataURL("image/png"));
    }

    const imgData = ctx.getImageData(0, 0, cropW, cropH);
    const data = imgData.data;

    let maxColorCount = 0;
    let bestY = -1;

    // Поиск динамической плашки цены по Y
    for (let y = 0; y < cropH; y++) {
        let colorInRow = 0;
        for (let x = 0; x < cropW; x++) {
            const idx = (y * cropW + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Ищем синий/голубой оттенок живой плашки
            const isBadgeColor = (b > 100 && b > r + 15);
            if (isBadgeColor) {
                colorInRow++;
            }
        }
        if (colorInRow > maxColorCount) {
            maxColorCount = colorInRow;
            bestY = y;
        }
    }

    if (bestY === -1 || maxColorCount < 8) {
        if (debugMode) console.log("Trade Result Debug: Синяя плашка не найдена на полосе.");
        return null;
    }

    const badgeH = 36;
    const startY = Math.max(0, bestY - Math.floor(badgeH / 2));

    const badgeCanvas = document.createElement("canvas");
    badgeCanvas.width = cropW;
    badgeCanvas.height = badgeH;
    const badgeCtx = badgeCanvas.getContext("2d");

    badgeCtx.drawImage(fullCanvas, 0, startY, cropW, badgeH, 0, 0, cropW, badgeH);

    return badgeCanvas;
}

window.debugBadge = function() {
    getExactPriceCanvas(true);
};

window.getCurrentPrice = async function() {
    if (window.tradeResultState.isProcessingPrice) {
        console.log("Trade Result: Уже идёт процесс распознавания...");
        return null;
    }

    const canvas = getExactPriceCanvas(false);
    if (!canvas) {
        console.log("Trade Result ERROR: Плашка цены не найдена");
        return null;
    }

    if (typeof Tesseract === "undefined") {
        console.log("Trade Result ERROR: Tesseract.js не загружен");
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
            console.log("Trade Result SUCCESS: Живая цена =", price);
            return price;
        } else {
            console.log("Trade Result WARNING: Сырой текст с плашки:", text);
            return null;
        }
    } catch (err) {
        window.tradeResultState.isProcessingPrice = false;
        console.error("Trade Result OCR Error:", err);
        return null;
    }
};

testScreenAccess();

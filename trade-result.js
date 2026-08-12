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

            console.log("Trade Result: Video READY", video.videoWidth + " x " + video.videoHeight);
            console.log("-----------------------------------------");
            console.log("Запустите debugBadge() для визуальной проверки вырезанной плашки.");
            console.log("Запустите getCurrentPrice() для распознавания живой цены.");
        }
    }, 200);
}

// Захват только вертикальной полосы шкалы цен
function getExactPriceCanvas(debugMode = false) {
    const video = document.getElementById("screenVideo");
    if (!video || !window.tradeResultState.ready) return null;

    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    // Точные координаты оси цен на основе широкого скриншота
    const cropX = Math.floor(vWidth * (0.60 + 0.35 * 0.62)); // Начинаем от левого края шкалы
    const cropY = 0; 
    const cropW = Math.floor(vWidth * 0.08); // Ширина зоны шкалы цен
    const cropH = vHeight;

    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = cropW;
    fullCanvas.height = cropH;

    const ctx = fullCanvas.getContext("2d");
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const imgData = ctx.getImageData(0, 0, cropW, cropH);
    const data = imgData.data;

    let maxColorCount = 0;
    let bestY = -1;

    // Поиск яркого синего цвета плашки по всей высоте Y
    for (let y = 0; y < cropH; y++) {
        let colorInRow = 0;
        for (let x = 0; x < cropW; x++) {
            const idx = (y * cropW + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Синий фон живой плашки (B преобладает над R и G)
            if (b > 80 && b > r + 15 && g > 50) {
                colorInRow++;
            }
        }
        if (colorInRow > maxColorCount) {
            maxColorCount = colorInRow;
            bestY = y;
        }
    }

    if (bestY === -1 || maxColorCount < 6) {
        if (debugMode) console.log("Trade Result Debug: Синяя плашка не найдена на вертикальной оси.");
        return null;
    }

    // Вырезаем прямоугольник вокруг найденной Y-координаты
    const badgeH = 32;
    const startY = Math.max(0, bestY - Math.floor(badgeH / 2));

    const badgeCanvas = document.createElement("canvas");
    badgeCanvas.width = cropW;
    badgeCanvas.height = badgeH;
    const badgeCtx = badgeCanvas.getContext("2d");

    badgeCtx.drawImage(fullCanvas, 0, startY, cropW, badgeH, 0, 0, cropW, badgeH);

    if (debugMode) {
        console.log(`Найдена плашка на Y=${bestY}. Картинка для OCR:`);
        console.log(badgeCanvas.toDataURL("image/png"));
    }

    return badgeCanvas;
}

window.debugBadge = function() {
    getExactPriceCanvas(true);
};

window.getCurrentPrice = async function() {
    if (window.tradeResultState.isProcessingPrice) {
        console.log("Trade Result: Процесс уже идет...");
        return null;
    }

    const canvas = getExactPriceCanvas(false);
    if (!canvas) {
        console.log("Trade Result ERROR: Не удалось вырезать плашку с ценой");
        return null;
    }

    if (typeof Tesseract === "undefined") {
        console.log("Trade Result ERROR: Tesseract.js не подключен");
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
            console.log("Trade Result SUCCESS: Текущая цена =", price);
            return price;
        } else {
            console.log("Trade Result WARNING: Не удалось распознать число из текста:", text);
            return null;
        }
    } catch (err) {
        window.tradeResultState.isProcessingPrice = false;
        console.error("Trade Result OCR Error:", err);
        return null;
    }
};

testScreenAccess();

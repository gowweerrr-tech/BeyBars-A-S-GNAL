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
            console.log("Запустите getCurrentPrice() в консоли для распознавания цены.");
        }
    }, 200);
}

// Находим точное положение синей плашки и вырезаем ТОЛЬКО её
function getExactBluePriceCanvas() {
    const video = document.getElementById("screenVideo");
    if (!video || !window.tradeResultState.ready) return null;

    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    // Зона шкалы цен (70%-85% по ширине, 15%-85% по высоте)
    const cropX = Math.floor(vWidth * 0.70);
    const cropY = Math.floor(vHeight * 0.15);
    const cropW = Math.floor(vWidth * 0.15);
    const cropH = Math.floor(vHeight * 0.70);

    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = cropW;
    fullCanvas.height = cropH;

    const ctx = fullCanvas.getContext("2d");
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const imgData = ctx.getImageData(0, 0, cropW, cropH);
    const data = imgData.data;

    // 1. Ищем строку Y, где больше всего синих пикселей (центр синей плашки)
    let maxBlueCount = 0;
    let bestY = -1;

    for (let y = 0; y < cropH; y++) {
        let blueInRow = 0;
        for (let x = 0; x < cropW; x++) {
            const idx = (y * cropW + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Проверка на синий цвет плашки Pocket Option
            if (b > 110 && b > r + 30) {
                blueInRow++;
            }
        }
        if (blueInRow > maxBlueCount) {
            maxBlueCount = blueInRow;
            bestY = y;
        }
    }

    if (bestY === -1 || maxBlueCount < 10) {
        console.log("Trade Result: Синяя плашка не найдена на экране");
        return null;
    }

    // 2. Вырезаем узкий прямоугольник вокруг найденной синей плашки (+- 18px по вертикали)
    const badgeH = 36;
    const startY = Math.max(0, bestY - Math.floor(badgeH / 2));

    const badgeCanvas = document.createElement("canvas");
    badgeCanvas.width = cropW;
    badgeCanvas.height = badgeH;
    const badgeCtx = badgeCanvas.getContext("2d");

    // Берем только найденный фрагмент плашки
    badgeCtx.drawImage(fullCanvas, 0, startY, cropW, badgeH, 0, 0, cropW, badgeH);

    // 3. Бинаризация: белый текст на черном фоне
    const badgeData = badgeCtx.getImageData(0, 0, cropW, badgeH);
    const bPixels = badgeData.data;

    for (let i = 0; i < bPixels.length; i += 4) {
        const r = bPixels[i];
        const g = bPixels[i + 1];
        const b = bPixels[i + 2];

        // Белый текст на плашке имеет высокий яркостный порог всех каналов
        const isWhiteText = (r > 190 && g > 190 && b > 190);

        if (isWhiteText) {
            bPixels[i] = 0;
            bPixels[i + 1] = 0;
            bPixels[i + 2] = 0; // Черный текст
        } else {
            bPixels[i] = 255;
            bPixels[i + 1] = 255;
            bPixels[i + 2] = 255; // Белый фон
        }
    }

    badgeCtx.putImageData(badgeData, 0, 0);
    return badgeCanvas;
}

// Функция распознавания цены через Tesseract OCR
window.getCurrentPrice = async function() {
    if (window.tradeResultState.isProcessingPrice) {
        console.log("Trade Result: Уже идёт процесс распознавания...");
        return null;
    }

    const canvas = getExactBluePriceCanvas();
    if (!canvas) {
        console.log("Trade Result ERROR: Не удалось локализовать плашку цены");
        return null;
    }

    if (typeof Tesseract === "undefined") {
        console.log("Trade Result ERROR: Библиотека Tesseract.js не загружена");
        return null;
    }

    window.tradeResultState.isProcessingPrice = true;
    console.log("Trade Result: Сканируем синюю плашку...");

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

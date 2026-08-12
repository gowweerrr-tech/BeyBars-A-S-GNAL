console.log("Trade Result Module Loaded v6");

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
            console.log("Запустите getCurrentPrice() в консоли.");
        }
    }, 200);
}

// Захват с масштабированием x3 для идеальной четкости OCR
function getScaledTestCanvas() {
    const video = document.getElementById("screenVideo");
    if (!video || !window.tradeResultState.ready) return null;

    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    // Узкая область оси цен
    const cropX = Math.floor(vWidth * 0.73);
    const cropY = Math.floor(vHeight * 0.15);
    const cropW = Math.floor(vWidth * 0.08);
    const cropH = Math.floor(vHeight * 0.70);

    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = cropW;
    fullCanvas.height = cropH;

    const ctx = fullCanvas.getContext("2d");
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const imgData = ctx.getImageData(0, 0, cropW, cropH);
    const data = imgData.data;

    let maxBlueCount = 0;
    let bestY = -1;

    for (let y = 0; y < cropH; y++) {
        let blueInRow = 0;
        for (let x = 0; x < cropW; x++) {
            const idx = (y * cropW + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            if (b > 80 && b > r + 20) {
                blueInRow++;
            }
        }
        if (blueInRow > maxBlueCount) {
            maxBlueCount = blueInRow;
            bestY = y;
        }
    }

    if (bestY === -1 || maxBlueCount < 3) return null;

    const badgeH = 28;
    const startY = Math.max(0, bestY - Math.floor(badgeH / 2));

    // Масштабируем в 3 раза для улучшения OCR
    const scale = 3;
    const scaledCanvas = document.createElement("canvas");
    scaledCanvas.width = cropW * scale;
    scaledCanvas.height = badgeH * scale;

    const sCtx = scaledCanvas.getContext("2d");
    sCtx.imageSmoothingEnabled = false; // Сохраняем пиксельную четкость
    sCtx.drawImage(fullCanvas, 0, startY, cropW, badgeH, 0, 0, cropW * scale, badgeH * scale);

    const sImg = sCtx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height);
    const sPix = sImg.data;

    for (let i = 0; i < sPix.length; i += 4) {
        const r = sPix[i];
        const g = sPix[i + 1];
        const b = sPix[i + 2];

        // Порог контрастности
        if (r > 150 && g > 150 && b > 150) {
            sPix[i] = 0;
            sPix[i + 1] = 0;
            sPix[i + 2] = 0; // Черные цифры
        } else {
            sPix[i] = 255;
            sPix[i + 1] = 255;
            sPix[i + 2] = 255; // Белый фон
        }
    }

    sCtx.putImageData(sImg, 0, 0);
    return scaledCanvas;
}

window.getCurrentPrice = async function() {
    if (window.tradeResultState.isProcessingPrice) {
        console.log("Trade Result: Обработка...");
        return null;
    }

    const canvas = getScaledTestCanvas();
    if (!canvas) {
        console.log("Trade Result ERROR: Плашка не найдена на экране. Попробуйте навести курсор мимо шкалы цен.");
        return null;
    }

    window.tradeResultState.isProcessingPrice = true;
    console.log("Trade Result: Распознаём живую цену (скан v6)...");

    try {
        const worker = await Tesseract.createWorker("eng");
        await worker.setParameters({
            tessedit_char_whitelist: "0123456789.",
            psm: "6" // Режим распознавания единой строки текста
        });

        const { data: { text } } = await worker.recognize(canvas);
        await worker.terminate();

        window.tradeResultState.isProcessingPrice = false;

        const cleanText = text.replace(/[^0-9.]/g, "").trim();
        const price = parseFloat(cleanText);

        if (!isNaN(price) && price > 0) {
            console.log("Trade Result SUCCESS: Распознана живая цена =", price);
            return price;
        } else {
            console.log("Trade Result WARNING: Сырой текст с плашки:", text);
            console.log("Снимок плашки для проверки:", canvas.toDataURL("image/png"));
            return null;
        }
    } catch (err) {
        window.tradeResultState.isProcessingPrice = false;
        console.error("Trade Result OCR Error:", err);
        return null;
    }
};

testScreenAccess();

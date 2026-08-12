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
            console.log("Выполните debugBadge() в консоли для проверки вырезанной плашки.");
        }
    }, 200);
}

// Отладочная функция: вырезает синюю плашку и выводит ссылки на изображения в консоль
window.debugBadge = function() {
    const video = document.getElementById("screenVideo");
    if (!video || !window.tradeResultState.ready) {
        console.log("Trade Result ERROR: Видеопоток не готов");
        return;
    }

    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    const cropX = Math.floor(vWidth * 0.65);
    const cropY = Math.floor(vHeight * 0.15);
    const cropW = Math.floor(vWidth * 0.20);
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

    // Поиск синей полосы по критерию преобладания синего канала
    for (let y = 0; y < cropH; y++) {
        let blueInRow = 0;
        for (let x = 0; x < cropW; x++) {
            const idx = (y * cropW + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            if (b > 70 && b > r + 15) {
                blueInRow++;
            }
        }
        if (blueInRow > maxBlueCount) {
            maxBlueCount = blueInRow;
            bestY = y;
        }
    }

    console.log(`Результат поиска синей плашки: Y=${bestY}, Найдено синих пикселей в строке=${maxBlueCount}`);

    if (bestY === -1 || maxBlueCount < 5) {
        console.log("СИНЯЯ ПЛАШКА НЕ НАЙДЕНА. Проверьте, активна ли страница Pocket Option.");
        return;
    }

    // Вырезаем плашку
    const badgeH = 40;
    const startY = Math.max(0, bestY - Math.floor(badgeH / 2));

    const rawCanvas = document.createElement("canvas");
    rawCanvas.width = cropW;
    rawCanvas.height = badgeH;
    const rawCtx = rawCanvas.getContext("2d");
    rawCtx.drawImage(fullCanvas, 0, startY, cropW, badgeH, 0, 0, cropW, badgeH);

    console.log("1. Оригинальный снимок вырезанной плашки (кликните ссылку ниже):");
    console.log(rawCanvas.toDataURL("image/png"));

    // Применяем инверсию и контраст для OCR
    const processedCanvas = document.createElement("canvas");
    processedCanvas.width = cropW;
    processedCanvas.height = badgeH;
    const procCtx = processedCanvas.getContext("2d");
    procCtx.drawImage(rawCanvas, 0, 0);

    const bImg = procCtx.getImageData(0, 0, cropW, badgeH);
    const bPix = bImg.data;

    for (let i = 0; i < bPix.length; i += 4) {
        const r = bPix[i];
        const g = bPix[i + 1];
        const b = bPix[i + 2];

        // Делаем светлые цифры черными, а сине-темный фон белым
        if (r > 160 && g > 160 && b > 160) {
            bPix[i] = 0;
            bPix[i + 1] = 0;
            bPix[i + 2] = 0;
        } else {
            bPix[i] = 255;
            bPix[i + 1] = 255;
            bPix[i + 2] = 255;
        }
    }
    procCtx.putImageData(bImg, 0, 0);

    console.log("2. Обработанный снимок для OCR (кликните ссылку ниже):");
    console.log(processedCanvas.toDataURL("image/png"));
};

// Функция распознавания цены
window.getCurrentPrice = async function() {
    window.debugBadge();
};

testScreenAccess();

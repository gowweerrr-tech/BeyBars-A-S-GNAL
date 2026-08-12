console.log("Trade Result Module Loaded v5");

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

// Захват точной области синей плашки цены
function getPriceBadgeCanvas() {
    const video = document.getElementById("screenVideo");
    if (!video || !window.tradeResultState.ready) return null;

    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    // Вырезаем узкую вертикальную полосу возле правой оси (72% - 82% по ширине)
    const cropX = Math.floor(vWidth * 0.72);
    const cropY = Math.floor(vHeight * 0.15);
    const cropW = Math.floor(vWidth * 0.10);
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

    // Ищем строку с максимальной концентрацией синего цвета
    for (let y = 0; y < cropH; y++) {
        let blueInRow = 0;
        for (let x = 0; x < cropW; x++) {
            const idx = (y * cropW + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Формула для синей плашки Pocket Option (B заметно преобладает над R)
            if (b > 90 && b > r + 25) {
                blueInRow++;
            }
        }
        if (blueInRow > maxBlueCount) {
            maxBlueCount = blueInRow;
            bestY = y;
        }
    }

    if (bestY === -1 || maxBlueCount < 5) {
        return null;
    }

    // Вырезаем точный прямоугольник плашки по высоте (32px)
    const badgeH = 32;
    const startY = Math.max(0, bestY - Math.floor(badgeH / 2));

    const badgeCanvas = document.createElement("canvas");
    badgeCanvas.width = cropW;
    badgeCanvas.height = badgeH;
    const badgeCtx = badgeCanvas.getContext("2d");

    badgeCtx.drawImage(fullCanvas, 0, startY, cropW, badgeH, 0, 0, cropW, badgeH);

    // Увеличиваем контрастность: инвертируем синий фон в белый, а текст делаем чётким чёрным
    const bImg = badgeCtx.getImageData(0, 0, cropW, badgeH);
    const bPix = bImg.data;

    for (let i = 0; i < bPix.length; i += 4) {
        const r = bPix[i];
        const g = bPix[i + 1];
        const b = bPix[i + 2];

        // Белые пиксели текста
        const isText = (r > 180 && g > 180 && b > 180);

        if (isText) {
            bPix[i] = 0;
            bPix[i + 1] = 0;
            bPix[i + 2] = 0; // Черный шрифт
        } else {
            bPix[i] = 255;
            bPix[i + 1] = 255;
            bPix[i + 2] = 255; // Белый фон
        }
    }

    badgeCtx.putImageData(bImg, 0, 0);
    return badgeCanvas;
}

// Функция получения текущей цены
window.getCurrentPrice = async function() {
    if (window.tradeResultState.isProcessingPrice) {
        console.log("Trade Result: Идёт обработка...");
        return null;
    }

    const canvas = getPriceBadgeCanvas();
    if (!canvas) {
        console.log("Trade Result ERROR: Синяя плашка цены не найдена на экране");
        return null;
    }

    if (typeof Tesseract === "undefined") {
        console.log("Trade Result ERROR: Библиотека Tesseract.js не подключена");
        return null;
    }

    window.tradeResultState.isProcessingPrice = true;
    console.log("Trade Result: Распознаём живую цену...");

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

        if (!isNaN(price) && price > 0) {
            console.log("Trade Result SUCCESS: Распознана живая цена =", price);
            return price;
        } else {
            console.log("Trade Result WARNING: Не удалось распознать цифры. Текст:", text);
            return null;
        }
    } catch (err) {
        window.tradeResultState.isProcessingPrice = false;
        console.error("Trade Result OCR Error:", err);
        return null;
    }
};

testScreenAccess();

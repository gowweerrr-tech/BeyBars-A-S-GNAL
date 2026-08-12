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

// Захват и бинаризация синей плашки текущей цены
function getBluePriceCanvas() {
    const video = document.getElementById("screenVideo");
    if (!video || !window.tradeResultState.ready) return null;

    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    // Зона шкалы цен
    const cropX = Math.floor(vWidth * 0.70);
    const cropY = Math.floor(vHeight * 0.20);
    const cropW = Math.floor(vWidth * 0.15);
    const cropH = Math.floor(vHeight * 0.70);

    const canvas = document.createElement("canvas");
    canvas.width = cropW;
    canvas.height = cropH;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Фильтр по цвету: выделяем синюю плашку (высокий Blue и Red < Blue, Green < Blue)
    const imgData = ctx.getImageData(0, 0, cropW, cropH);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Синяя плашка Pocket Option имеет синий оттенок (B преобладает над R)
        const isBlue = (b > 80 && b > r + 20 && b > g - 20);

        if (isBlue) {
            // Делаем текст/плашку контрастной черной для OCR
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
        } else {
            // Все остальное делаем белым фоном
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
        }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
}

// Функция распознавания цены через Tesseract OCR
window.getCurrentPrice = async function() {
    if (window.tradeResultState.isProcessingPrice) {
        console.log("Trade Result: Уже идёт процесс распознавания...");
        return null;
    }

    const canvas = getBluePriceCanvas();
    if (!canvas) {
        console.log("Trade Result ERROR: Кадр недоступен");
        return null;
    }

    if (typeof Tesseract === "undefined") {
        console.log("Trade Result ERROR: Библиотека Tesseract.js не загружена");
        return null;
    }

    window.tradeResultState.isProcessingPrice = true;
    console.log("Trade Result: Ищем синюю плашку цены...");

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
            console.log("Trade Result SUCCESS: Живая цена (синяя плашка) =", price);
            return price;
        } else {
            console.log("Trade Result WARNING: Не удалось распознать число с синей плашки. Текст:", text);
            return null;
        }
    } catch (err) {
        window.tradeResultState.isProcessingPrice = false;
        console.error("Trade Result OCR Error:", err);
        return null;
    }
};

testScreenAccess();

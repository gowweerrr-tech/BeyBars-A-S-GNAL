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

// Захват только зоны шкалы цен (где плашка 1.16263)
function getPriceCropCanvas() {
    const video = document.getElementById("screenVideo");
    if (!video || !window.tradeResultState.ready) return null;

    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    // Область шкалы цен (чуть левее кнопок КУПИТЬ/ПРОДАТЬ)
    const cropX = Math.floor(vWidth * 0.70);
    const cropY = Math.floor(vHeight * 0.20);
    const cropW = Math.floor(vWidth * 0.15);
    const cropH = Math.floor(vHeight * 0.70);

    const canvas = document.createElement("canvas");
    canvas.width = cropW;
    canvas.height = cropH;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    return canvas;
}

// Функция распознавания цены через Tesseract OCR
window.getCurrentPrice = async function() {
    if (window.tradeResultState.isProcessingPrice) {
        console.log("Trade Result: Уже идёт процесс распознавания...");
        return null;
    }

    const canvas = getPriceCropCanvas();
    if (!canvas) {
        console.log("Trade Result ERROR: Кадр недоступен");
        return null;
    }

    if (typeof Tesseract === "undefined") {
        console.log("Trade Result ERROR: Библиотека Tesseract.js не загружена");
        return null;
    }

    window.tradeResultState.isProcessingPrice = true;
    console.log("Trade Result: Распознаём цену...");

    try {
        const worker = await Tesseract.createWorker("eng");
        
        // Настраиваем только цифровой режим
        await worker.setParameters({
            tessedit_char_whitelist: "0123456789.",
        });

        const { data: { text } } = await worker.recognize(canvas);
        await worker.terminate();

        window.tradeResultState.isProcessingPrice = false;

        // Очищаем результат от лишних символов
        const cleanText = text.replace(/[^0-9.]/g, "").trim();
        const price = parseFloat(cleanText);

        if (!isNaN(price)) {
            console.log("Trade Result SUCCESS: Распознанная цена =", price);
            return price;
        } else {
            console.log("Trade Result WARNING: Не удалось распознать число. Сырой текст:", text);
            return null;
        }
    } catch (err) {
        window.tradeResultState.isProcessingPrice = false;
        console.error("Trade Result OCR Error:", err);
        return null;
    }
};

testScreenAccess();

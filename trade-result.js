console.log("Trade Result Module Loaded");

window.tradeResultState = {
    ready: false
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
            console.log("Запустите inspectPriceArea() в консоли, чтобы вырезать область цены.");
        }
    }, 200);
}

// Функция вырезания области (по умолчанию берём правую часть кадра, где ось цен)
window.inspectPriceArea = function(xPercent = 0.70, yPercent = 0.20, wPercent = 0.30, hPercent = 0.60) {
    const video = document.getElementById("screenVideo");
    if (!video || !window.tradeResultState.ready) {
        console.log("Trade Result ERROR: Видеопоток еще не готов");
        return;
    }

    const canvas = document.createElement("canvas");
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    // Вычисляем координаты кропа в пикселях
    const cropX = Math.floor(vWidth * xPercent);
    const cropY = Math.floor(vHeight * yPercent);
    const cropW = Math.floor(vWidth * wPercent);
    const cropH = Math.floor(vHeight * hPercent);

    canvas.width = cropW;
    canvas.height = cropH;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const dataURL = canvas.toDataURL("image/png");

    console.log(`Захват области: X=${cropX}, Y=${cropY}, W=${cropW}, H=${cropH}`);
    console.log("Кликните по ссылке ниже, чтобы открыть захваченную область в новой вкладке:");
    console.log(dataURL);
};

testScreenAccess();

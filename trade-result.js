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
            console.log("Запустите debugBadge() для поиска шкалы цен на широком кадре.");
        }
    }, 200);
}

// Захватывает всю правую часть экрана для точной локализации
window.debugBadge = function() {
    const video = document.getElementById("screenVideo");
    if (!video || !window.tradeResultState.ready) {
        console.log("Trade Result ERROR: Видеопоток не готов");
        return;
    }

    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    // Широкий захват: от 60% до 95% ширины экрана
    const cropX = Math.floor(vWidth * 0.60);
    const cropY = Math.floor(vHeight * 0.10);
    const cropW = Math.floor(vWidth * 0.35);
    const cropH = Math.floor(vHeight * 0.80);

    const canvas = document.createElement("canvas");
    canvas.width = cropW;
    canvas.height = cropH;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    console.log("Широкий захват правой части экрана (от 60% до 95%):");
    console.log("Разрешение кадра:", vWidth, "x", vHeight);
    console.log("Ссылка на изображение:");
    console.log(canvas.toDataURL("image/png"));
};

testScreenAccess();

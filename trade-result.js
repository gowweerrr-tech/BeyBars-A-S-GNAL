console.log("Trade Result Module Loaded");

window.tradeResultState = {
    ready: false,
    lastFrameData: null
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
            
            console.log("Trade Result: Выполните captureTestFrame() в консоли для проверки кадра.");
        }
    }, 200);
}

// Функция для тестового захвата кадра
window.captureTestFrame = function() {
    const video = document.getElementById("screenVideo");
    if (!video || !window.tradeResultState.ready) {
        console.log("Trade Result ERROR: Видеопоток еще не готов");
        return null;
    }

    // Создаем тестовый canvas
    const testCanvas = document.createElement("canvas");
    testCanvas.width = video.videoWidth;
    testCanvas.height = video.videoHeight;
    const ctx = testCanvas.getContext("2d");

    // Рендерим текущий кадр с видео
    ctx.drawImage(video, 0, 0, testCanvas.width, testCanvas.height);
    
    // Преобразуем кадр в DataURL для быстрой проверки
    const dataURL = testCanvas.toDataURL("image/png");
    window.tradeResultState.lastFrameData = dataURL;

    console.log("Trade Result: Кадр успешно захвачен!");
    console.log("Размер кадра:", testCanvas.width, "x", testCanvas.height);
    console.log("Чтобы посмотреть снимок, выполните: console.log(window.tradeResultState.lastFrameData)");
    
    return dataURL;
};

testScreenAccess();

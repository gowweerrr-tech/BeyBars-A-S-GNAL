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
            console.log("Запусти debugBlueBadge() в Console");
        }
    }, 200);
}


// Ищем синюю плашку текущей цены
window.debugBlueBadge = function () {

    const video = document.getElementById("screenVideo");

    if (!video || !window.tradeResultState.ready) {
        console.log("ERROR: Video еще не готов");
        return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    // Берём правую часть экрана, где находится ценовая шкала
    const cropX = Math.floor(width * 0.65);
    const cropY = Math.floor(height * 0.05);
    const cropW = Math.floor(width * 0.35);
    const cropH = Math.floor(height * 0.90);

    const canvas = document.createElement("canvas");

    canvas.width = cropW;
    canvas.height = cropH;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(
        video,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH
    );

    const imageData = ctx.getImageData(
        0,
        0,
        cropW,
        cropH
    );

    const data = imageData.data;

    let minX = cropW;
    let maxX = 0;
    let minY = cropH;
    let maxY = 0;

    let bluePixels = 0;

    // Ищем синие пиксели
    for (let y = 0; y < cropH; y++) {

        for (let x = 0; x < cropW; x++) {

            const i = (y * cropW + x) * 4;

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Более строгий поиск синего цвета
            const isBlue =
                b > 100 &&
                b > r * 1.25 &&
                b > g * 1.05;

            if (isBlue) {

                bluePixels++;

                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    console.log("========== BLUE BADGE DEBUG ==========");
    console.log("Blue pixels:", bluePixels);

    if (bluePixels < 30) {

        console.log("❌ BLUE BADGE NOT FOUND");

        console.log(
            "Открой всю диагностическую область:"
        );

        console.log(canvas.toDataURL("image/png"));

        return;
    }

    // Переводим координаты обратно в полный экран
    const absoluteX = cropX + minX;
    const absoluteY = cropY + minY;

    const badgeWidth = maxX - minX + 1;
    const badgeHeight = maxY - minY + 1;

    console.log("✅ BLUE BADGE FOUND");

    console.log("X:", absoluteX);
    console.log("Y:", absoluteY);
    console.log("W:", badgeWidth);
    console.log("H:", badgeHeight);

    // Немного расширяем область вокруг плашки
    const paddingX = 10;
    const paddingY = 8;

    const finalX = Math.max(
        0,
        minX - paddingX
    );

    const finalY = Math.max(
        0,
        minY - paddingY
    );

    const finalW = Math.min(
        cropW - finalX,
        badgeWidth + paddingX * 2
    );

    const finalH = Math.min(
        cropH - finalY,
        badgeHeight + paddingY * 2
    );

    const badgeCanvas = document.createElement("canvas");

    badgeCanvas.width = finalW;
    badgeCanvas.height = finalH;

    const badgeCtx = badgeCanvas.getContext("2d");

    badgeCtx.drawImage(
        canvas,
        finalX,
        finalY,
        finalW,
        finalH,
        0,
        0,
        finalW,
        finalH
    );

    const badgeImage =
        badgeCanvas.toDataURL("image/png");

    console.log(
        "DEBUG BADGE IMAGE:"
    );

    console.log(badgeImage);

    console.log("======================================");

    return badgeImage;
};


testScreenAccess();

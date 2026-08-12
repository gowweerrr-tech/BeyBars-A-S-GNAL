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

            console.log("Запусти findLivePriceBadge()");
        }
    }, 200);
}


// Ищем отдельные компактные синие области
window.findLivePriceBadge = function () {

    const video = document.getElementById("screenVideo");

    if (!video || !window.tradeResultState.ready) {
        console.log("ERROR: Video еще не готов");
        return;
    }

    const W = video.videoWidth;
    const H = video.videoHeight;

    // Область графика.
    // Y НЕ фиксируем — сканируем всю высоту.
    const x0 = Math.floor(W * 0.35);
    const x1 = Math.floor(W * 0.78);

    const canvas = document.createElement("canvas");
    canvas.width = x1 - x0;
    canvas.height = H;

    const ctx = canvas.getContext("2d", {
        willReadFrequently: true
    });

    ctx.drawImage(
        video,
        x0,
        0,
        x1 - x0,
        H,
        0,
        0,
        x1 - x0,
        H
    );

    const image = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const data = image.data;
    const cw = canvas.width;
    const ch = canvas.height;

    // Маска синих пикселей
    const mask = new Uint8Array(cw * ch);

    for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {

            const i = (y * cw + x) * 4;

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const isBlue =
                b > 90 &&
                b > r * 1.20 &&
                b > g * 1.05;

            if (isBlue) {
                mask[y * cw + x] = 1;
            }
        }
    }

    // Поиск отдельных связных компонентов
    const visited = new Uint8Array(cw * ch);
    const components = [];

    function floodFill(startX, startY) {

        const queue = [[startX, startY]];
        visited[startY * cw + startX] = 1;

        let minX = startX;
        let maxX = startX;
        let minY = startY;
        let maxY = startY;
        let count = 0;

        while (queue.length) {

            const [x, y] = queue.pop();

            count++;

            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);

            const neighbours = [
                [x + 1, y],
                [x - 1, y],
                [x, y + 1],
                [x, y - 1]
            ];

            for (const [nx, ny] of neighbours) {

                if (
                    nx < 0 ||
                    ny < 0 ||
                    nx >= cw ||
                    ny >= ch
                ) {
                    continue;
                }

                const index = ny * cw + nx;

                if (
                    mask[index] &&
                    !visited[index]
                ) {
                    visited[index] = 1;
                    queue.push([nx, ny]);
                }
            }
        }

        return {
            minX,
            maxX,
            minY,
            maxY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            pixels: count
        };
    }

    for (let y = 0; y < ch; y++) {

        for (let x = 0; x < cw; x++) {

            const index = y * cw + x;

            if (
                mask[index] &&
                !visited[index]
            ) {

                const component =
                    floodFill(x, y);

                // Отбрасываем совсем мелкие объекты
                if (
                    component.pixels >= 30 &&
                    component.width >= 10 &&
                    component.height >= 5
                ) {
                    components.push(component);
                }
            }
        }
    }

    console.log("========== COMPONENTS ==========");
    console.log(
        "Найдено синих объектов:",
        components.length
    );

    // Сортируем по площади
    components.sort(
        (a, b) =>
            (b.width * b.height) -
            (a.width * a.height)
    );

    components.slice(0, 20).forEach((c, index) => {

        console.log(
            "#" + index,
            "X:",
            x0 + c.minX,
            "Y:",
            c.minY,
            "W:",
            c.width,
            "H:",
            c.height,
            "pixels:",
            c.pixels
        );
    });

    console.log("==============================");

    // Кандидаты на маленькую горизонтальную плашку
    const candidates = components.filter(c => {

        const ratio = c.width / c.height;

        return (
            c.width >= 25 &&
            c.width <= 250 &&
            c.height >= 8 &&
            c.height <= 80 &&
            ratio >= 2
        );
    });

    console.log(
        "Кандидатов на price badge:",
        candidates.length
    );

    if (!candidates.length) {

        console.log(
            "❌ Подходящая синяя плашка пока не найдена."
        );

        return components;
    }

    // Берём самый крупный подходящий компактный объект
    const badge = candidates.sort(
        (a, b) =>
            (b.width * b.height) -
            (a.width * a.height)
    )[0];

    console.log("✅ PRICE BADGE CANDIDATE");

    console.log(
        "X:",
        x0 + badge.minX
    );

    console.log(
        "Y:",
        badge.minY
    );

    console.log(
        "W:",
        badge.width
    );

    console.log(
        "H:",
        badge.height
    );

    // Вырезаем найденный объект
    const padding = 10;

    const bx = Math.max(
        0,
        badge.minX - padding
    );

    const by = Math.max(
        0,
        badge.minY - padding
    );

    const bw = Math.min(
        cw - bx,
        badge.width + padding * 2
    );

    const bh = Math.min(
        ch - by,
        badge.height + padding * 2
    );

    const badgeCanvas =
        document.createElement("canvas");

    badgeCanvas.width = bw;
    badgeCanvas.height = bh;

    const badgeCtx =
        badgeCanvas.getContext("2d");

    badgeCtx.drawImage(
        canvas,
        bx,
        by,
        bw,
        bh,
        0,
        0,
        bw,
        bh
    );

    const result =
        badgeCanvas.toDataURL("image/png");

    console.log("DEBUG BADGE IMAGE:");
    console.log(result);

    return result;
};

testScreenAccess();

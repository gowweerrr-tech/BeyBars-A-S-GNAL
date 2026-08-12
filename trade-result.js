console.log("Trade Result Module Loaded");

function testScreenAccess() {
    const video = document.getElementById("screenVideo");

    if (!video) {
        console.log("Trade Result: screenVideo NOT FOUND");
        return;
    }

    console.log("Trade Result: screenVideo FOUND");
    console.log("Video size:", video.videoWidth, "x", video.videoHeight);
}

testScreenAccess();

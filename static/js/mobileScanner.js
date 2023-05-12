function base64ToUint8Array(uri) {
    var binary_string =  window.atob(uri.split(",")[1]);
    var len = binary_string.length;
    var bytes = new Uint8Array( len );
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}

var zxing = null;
ZXing().then(function(value) {
    zxing = value;
});

function scanBarcode(canvasElement, format) {
    var imgWidth = canvasElement.width;
    var imgHeight = canvasElement.height;
    var imageData = canvasElement.getContext('2d').getImageData(0, 0, imgWidth, imgHeight);
    var sourceBuffer = imageData.data;

    if (zxing != null) {
        var buffer = zxing._malloc(sourceBuffer.byteLength);
        zxing.HEAPU8.set(sourceBuffer, buffer);
        var result = zxing.readBarcodeFromPixmap(buffer, imgWidth, imgHeight, true, format);
        zxing._free(buffer);
        return result;
    } else {
        return { error: "ZXing not yet initialized" };
    }
}

function loadVideo() {
    var divMain = document.createElement("divMain");
    var video = document.createElement("video");
    var canvasElement = document.getElementById("canvas");
    var canvas = canvasElement.getContext("2d");

    var currentStream = null;

    function stopCurentCamera() {
        if (currentStream != null) {
        currentStream.getTracks().forEach(track => {
            track.stop();
        });
        }
    }

    var cameraStarted = false;
    function startCameraWithDevice(cameraFacing) {
        stopCurentCamera();
        var facingMode = cameraFacing ? { exact: cameraFacing } : "environment";
        navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } }).then(function(stream) {
            currentStream = stream;
            video.srcObject = stream;
            video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
            video.play();
            if (!cameraStarted) {
                cameraStarted = true;
                requestAnimationFrame(tick);
            }
        });
    }

    startCameraWithDevice("");

    function resolveScan(tag) {
        fetch("/", {
            method: "POST",
            headers: {
            "Content-Type": "application/json"
            },
            body: JSON.stringify({ info: tag, date: "", autoLog: "false"})
        })
        .then(response => response.text())
        .then(text => {
            if (text === 'redir') {
                window.location.href = '/item/' + tag;
            }
            var dat = text.split("^");
            showAlert(dat[0], dat[1], dat[2]);
        });
    }
    let lastTag = "";
    let tickCount = 76;
    function tick() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvasElement.hidden = false;

            canvasElement.height = video.videoHeight;
            canvasElement.width = video.videoWidth;
            canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

            var code = scanBarcode(canvasElement, "");
            if (code.error) {
                console.log(code.error);
            } else if(code.format) {
                tickCount+=1;
                if (tickCount > 50) {
                    showAlert("success",500,`Scanned tag ${code.text}`)
                    lastTag = code.text;
                    tickCount = 0;
                    resolveScan(code.text);
                }
            } 
        }
        requestAnimationFrame(tick);
    }
}
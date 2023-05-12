var $j = jQuery.noConflict();
var toggled = false;
var divMain = document.getElementById("divMain");
var divText = document.getElementById("divText");
var divEntry = document.getElementById("divEntry");
var hBigText = document.getElementById("hBigText");
var hSmallText = document.getElementById("hSmallText");
var toggleHist = document.getElementById("collapsible");
var toggleOpti = document.getElementById("optionsCollapsible");
var toggleLogs = document.getElementById("collapsibleLogs");
var cbDinst = document.getElementById("cbInstallDate");
var cbSafeMode = document.getElementById("cbSafeMode");
var cbRedirOnly = document.getElementById("cbRedirOnly");
var cbModel = document.getElementById("cbModel");
var txtModel = document.getElementById("txtModel");
var calendar = document.getElementById("calInstallDate");
var taLog = document.getElementById("taLog");
var tag = "";

var checkboxes = document.querySelectorAll('input[type="checkbox"]');

for (var i = 0; i < checkboxes.length; i++) {
    checkboxes[i].addEventListener('keydown', function(event) {
        if (event.keyCode === 32) {
            event.preventDefault();
        }
    });
}

cbSafeMode.onclick = function() { 
    safeMode = !safeMode;
}

function deleteHistoryItem(button) {
    const parentDiv = button.parentNode;
    const hElm = parentDiv.querySelector('h');
    const tagText = hElm.textContent;
    determineSafe(`Would you like to delete \"${tagText}\"?`,function(safe) {
        if(!safe){
            fetch("/del", {
                method: "POST",
                headers: {
                "Content-Type": "application/json"
                },
                body: JSON.stringify({ ItemTag: tagText })
            })
            .then(response => response.text())
            .then(text => {
                let dat = text.split("^");
                showAlert(dat[0],dat[1],dat[2]);
                if (dat[0] == 'success') {
                    parentDiv.remove();
                }
            });
        }
    });
}

function updateHistory(){
    try{
        let historyCookie = getCookie("history").split("^");
        let tagBox = document.getElementById("divTagBox");
        tagBox.innerHTML = "";
        for (let i = 0; i < historyCookie.length; i++){
            if (historyCookie[i].length === 7){
                tagBox.innerHTML = `<div class="tag"><h class="tag-text">${historyCookie[i]}</h><button class="delete-button" onclick=deleteHistoryItem(this)>Delete</button></div>` + tagBox.innerHTML;
            }
        }
    } catch (error) {
        //console.error(error);
    }
}
function updateLog(){
    try{
        let log = getCookie("log");
        let count = log.split("@").length - 1;
        for (let i = 0; i < count; i++) {
            log = log.replace("@", "\n").replace("\"", "").replace("\|", "");
        }
        taLog.value = log;
    } catch (error) {
        //console.error(error);
    }
}
document.addEventListener('keydown', function(event) {
    if (event.keyCode === 32 && document.activeElement.tagName.toLowerCase() != 'input') {
        document.exitPointerLock();
        divTextClickHandler();
    }
    if (toggled) {
        if (event.keyCode >= 65 && event.keyCode <= 90) {
            tag+=event.key;
        }
        if (event.keyCode === 13 ) {
            document.exitPointerLock();
            determineSafe(`Would you like to submit \"${tag}\"?`,function(safe) {
                if(!safe){
                    let date="";
                    if (cbDinst.checked){
                        date = calendar.value;
                    }
                    let model="";
                    if (cbModel.checked){
                        model = txtModel.value;
                    }
                    fetch("/", {
                        method: "POST",
                        headers: {
                        "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ info: tag, date: date, model: model})
                    })
                    .then(response => response.text())
                    .then(text => {
                        if (text === 'redir') {
                            window.location.href = '/item/' + tag;
                        }
                        if (!cbRedirOnly.checked){
                            var dat = text.split("^");
                            showAlert(dat[0], dat[1], dat[2]);
                            updateLog();
                            if(dat[0] === "success") {
                                updateHistory();
                            }
                        }
                        else{
                            showAlert("info",1000,"Scan only mode is on, turn off to add assets.")
                        }
                        tag = "";
                        divEntry.requestPointerLock(); 
                    });
                }
                else{tag="";divEntry.requestPointerLock(); }
            });
            
        }
    }
});

function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(name + '=')) {
        return cookie.substring(name.length + 1);
        }
    }
    return null;
}

function divTextClickHandler() {
    if (!toggled) {
        divEntry.requestPointerLock(); 
        hBigText.textContent = "ON";
        hSmallText.textContent = "space to exit";
        toggleHist.checked = false;
        toggleLogs.checked = false;
        toggleOpti.checked = false;
        enableAnimation();
    } else { 
        hBigText.textContent = "OFF";
        hSmallText.textContent = "space to toggle";
        disableAnimation();
    }
    toggled=!toggled
}

function enableAnimation() {
    divText.classList.add("anim");
}

function disableAnimation() {
    divText.classList.remove("anim");
}
updateHistory();
updateLog();
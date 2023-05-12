const inputText = document.getElementById("input-text");
const title = document.getElementById("title");
const email = document.getElementById("email");

const submitButton = document.getElementById("submit-button");

// Initiate socket for fun feedback :)

// Attach an onclick event listener to the submit button
submitButton.onclick = function() {
    //const sTitle = DOMPurify.sanitize(inputText.value);
    var sMsg = DOMPurify.sanitize(inputText.value);
    var sTtl = DOMPurify.sanitize(title.value);
    var sEm = DOMPurify.sanitize(email.value);
    fetch(window.location.pathname, {
        method: "POST",
        headers: {
        "Content-Type": "application/json"
        },
        body: JSON.stringify({ ttl:sTtl, email: sEm, msg: sMsg})
    })
    .then(response => response.text())
    .then(text => {
        var dat = text.split("^");
        showAlert(dat[0], dat[1], dat[2]);
        if (dat[0] === "success"){
            inputText.value = "";
            title.value = "";
            email.value = "";
        }
    });
};

setAlertTop();
safeMode = true;
function escapeString(str) {
  return str.replace(/[\\'"`\r-\u00ff]/g, function(char) {
    return '\\' + char;
  });  
}

const taCom = document.getElementById('taCom');
const txtDinst = document.getElementById('txtDinst');
const lblModel = document.getElementById('lblModel');
taCom.value = comments;
let timeoutId;
let textChanged = false;

fetch('/genBar',{
    method: "POST",
    headers: {
    "Content-Type": "application/json"
    },
    body: JSON.stringify({ bar: tag })
})
.then(response => response.blob())
.then(blob => {
    const imageUrl = URL.createObjectURL(blob);
    const imageElement = document.getElementById("barcode")
    imageElement.src = imageUrl;
})
.catch(error => {
    console.error(error);
});

taCom.addEventListener('focus', function() {
  timeoutId = setTimeout(() => {
    if (textChanged){
      checkValue("comments",taCom.value);
      textChanged = false;
    }
  }, 1000);
});

// add an input event listener to reset the timeout
taCom.addEventListener('input', function() {
  textChanged = true;
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    if (textChanged){
      checkValue("comments",taCom.value);
      textChanged = false;
    }
  }, 1000);
});

// add a blur event listener to check the value and stop the timeout
taCom.addEventListener('blur', function() {
  if (textChanged){
    checkValue("comments",taCom.value);
    textChanged = false;
  }
  clearTimeout(timeoutId);
});

txtDinst.addEventListener('focus', function() {
  timeoutId = setTimeout(() => {
    if (txtDinst.value.length === 10) {
      if (textChanged){
        checkValue("dinst",txtDinst.value);
        textChanged = false;
      }
    }
    else {
      showAlert("danger",1500,"Date formating incorrect!")
    }
  }, 1000);
});

lblModel.addEventListener('click', function() {
  determineSafeText(`What would you like to set the model to?`,function(notSafe, model) {
    if (!notSafe){
      editDat(`${tag}^model^${DOMPurify.sanitize(model)}`);
      lblModel.innerHTML = DOMPurify.sanitize(model);
    }
  });
});

// add an input event listener to reset the timeout
txtDinst.addEventListener('input', function() {
  textChanged = true;
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    if (txtDinst.value.length === 10) {
      if (textChanged){
        checkValue("dinst",txtDinst.value);
        textChanged = false;
      }
    }
    else {
      showAlert("danger",1500,"Date formating incorrect!")
    }
  }, 1000);
});

// add a blur event listener to check the value and stop the timeout
txtDinst.addEventListener('blur', function() {
  if (txtDinst.value.length === 10) {
    if (textChanged){
      checkValue("dinst",txtDinst.value);
      textChanged = false;
    }
  }
  else {
    if (textChanged){
      showAlert("danger",1500,"Date formating incorrect!")
    } 
  }
  textChanged = false;
  clearTimeout(timeoutId);
});

function editDat(dat) {
    fetch("/edit", {
        method: "POST",
        headers: {
        "Content-Type": "application/json"
        },
        body: JSON.stringify({ ItemTag: dat })
    })
    .then(response => response.text())
    .then(text => {
        let alert = text.split("^");
        showAlert(alert[0],alert[1],alert[2]);
    });
}

function checkValue(item,value) {
    value = value.trim();
    if (!textChanged) {
        console.log('No text entered');
    } else {
        editDat(`${tag}^${item}^${DOMPurify.sanitize(value)}`);
    }
    timeoutId = null;
    
}
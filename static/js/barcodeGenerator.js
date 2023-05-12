
const addRowButton = document.getElementsByClassName('add-row-button');
const scrollableDiv = document.getElementsByClassName('.scrollable-div');
const inputTable = document.querySelector('.input-table');
const autoLogCheckBox = document.getElementById('cbAutoLog')
const metadata = [];
const schoolElm = document.getElementById('school');
const pdfViewer = document.getElementById('pdfViewer');
const imgLoad = document.getElementById('imgLoad');
var itemDdValues = ``;
function autoLogCheckBoxHelper() {
    let calElements = document.getElementsByClassName("cal");
    let modelElements = document.getElementsByClassName("model");
    let scrllDivElements = document.getElementsByClassName("scrollable-div");
    if (autoLogCheckBox.checked) {
      // Checkbox is checked, show cal elements
      for (var i = 0; i < calElements.length; i++) {
        calElements[i].style = "";
        modelElements[i].style = "";
      }
      for (var i = 0; i < scrllDivElements.length; i++) {
        scrllDivElements[i].style.height = "220px";
      }
    } else {
      // Checkbox is not checked, hide cal elements
      for (var i = 0; i < calElements.length; i++) {
        calElements[i].style.display = "none";
        modelElements[i].style.display = "none";
      }
      for (var i = 0; i < scrllDivElements.length; i++) {
        scrllDivElements[i].style.height = "110px";
      }
    }
};

autoLogCheckBox.onclick = function() {
    autoLogCheckBoxHelper();
}

function initPage() {
    for(let b = 0; b < metadataStrs.length; b++) {
        let list = metadataStrs[b].split("^");
        metadata.push(list);
    }
    
    for(let b = 0; b < metadata[0].length; b++){
        let item = metadata[0][b].split(":");
        var option = document.createElement("option");
        option.text = `${item[1]}`;
        option.value = `${item[0]}`;
        schoolElm.appendChild(option);
    }
    
    for(let b = 0; b < metadata[1].length; b++){
        if (ip.split(".")[1] === metadata[1][b].split(":")[1]){
            schoolElm.value = metadata[1][b].split(":")[0];
            //showAlert("info",5000,`Your ip is ${ip}. It matches ${metadata[1][b].split(":")[1]} for the second octet. Therefore, school has been set to ${metadata[0][b].split(":")[1]}.`)
            break;
        }
    }
    
    for(let b = 0; b < metadata[3].length; b++){
        let item = metadata[3][b].split(":");
        var option = `<option value="${item[0]}">${item[1]}</option>\n`;
        itemDdValues+=option;
    }

    for(let b = 0; b < metadata[3].length; b++){
        break;
    }
}

function delRowHandler(button,deleteRow) {
    if (deleteRow){
        button.parentElement.parentElement.remove();
    }
    else{
        button.parentElement.remove();
    }
}

function addRowHandler(button) {
    const newRow = document.createElement('tr');
    newRow.innerHTML = getRow();
    button.nextElementSibling.nextElementSibling.querySelector('table').appendChild(newRow);
    autoLogCheckBoxHelper();
}

function getRow(){
    let row = `
        <td>
            <select class="item-dropdown">
                ${itemDdValues}
            </select>
            <input type="text" class="model" placeholder="model">
        </td>
        <td>
            <input type="date" class="cal">
            <input type="number" class="quantity-input" min="1" value="1">
        </td>
        <td>
            <button class="delete-row-button" type="button" onclick="delRowHandler(this,true)"> X </button>
        </td>`
    return row;
}

function addParamHandler() {
    const newParam = document.createElement('form');
    newParam.classList.add('param');
    newParam.innerHTML = `
        <input type="text" class="location" name="location" placeholder="location">
        <button class="add-row-button" type="button" onclick="addRowHandler(this)">Add Row</button>
        <button class="delete-row-button delete-param-button" type="button" onclick="delRowHandler(this,false)"> X </button>
        <div class="scrollable-div">
            <table class="input-table">
            <tr>
                ${getRow()}
            </tr>
            </table>
        </div>
    `;
    params.appendChild(newParam);
    autoLogCheckBoxHelper();
}

function autoLog(tags) {
    fetch("/barcodeGenerator", {
        method: "POST",
        headers: {
        "Content-Type": "application/json"
        },
        body: JSON.stringify({ tags: tags, autoLog: "true" })
    })
    .then(response => response.text())
    .then(text => {
        let aT = text.split("^");
        showAlert(aT[0],aT[1],aT[2])
    });
}

function generate() {
    if (imgLoad.style.display != "block") {
        const forms = params.querySelectorAll('form');
        var tags = [];
        let err = false;
        for(let b = 0; b < forms.length; b++) {
            let form = forms[b];
            const location = form.querySelector('.location');
            const rows = form.querySelectorAll('.input-table tr');

            let locationVal = location.value;
            for (let u = 0; u < metadata[2].length; u++){
                if (metadata[2][u].split(":")[1].toLowerCase() == locationVal.toLowerCase()){
                    locationVal = metadata[2][u].split(":")[0];
                    break;
                }
            }
            let subTag = `${tH(parseInt(school.value))}${tH(parseInt(locationVal))}`;
            
            for(let z = 0; z < rows.length; z++) {
                let row = rows[z]
                for (let i = 0; i < parseInt(row.cells[1].querySelector(".quantity-input").value); i++) {
                    //  TODO: CHECK LOGIC TO MAKE SURE IT DOESNT GIVE A <7 CHAR LENGTH TAG, INSTEAD OF JUST CHECKING IF LENGTH ISN'T 7
                    let newTag = `${tH(Math.floor(Math.random() * (18200 - 2730 + 1)) + 2730)}${subTag}${tH(parseInt(row.cells[0].querySelector(".item-dropdown").value))}`;
                    if (newTag.length != 7) {
                        err = true;
                        showAlert("warning",2500,"Generation error. Please double check your format and generate again.");
                        break;
                    }
                    else {
                        tags.push(`${newTag}$${row.cells[1].querySelector(".cal").value}$${row.cells[0].querySelector(".model").value}`);
                    }
                }
                if(err){break;}
            }
            if(err){break;}
        }
        if(!err && tags.length != 0){
            if (autoLogCheckBox.checked){
                autoLog(tags);
            }
            let cleanTags = [];
            for ( let i = 0; i < tags.length; i++) {
                cleanTags.push(tags[i].split("$")[0]);
            }
            getSetSheet(cleanTags.join("^"));
        }
    }
    else {
        showAlert("warning",1000,"Already generating!");
    }
}
function toggleVisibility(element) {
    if (element.style.display === "none") {
        element.style.display = "block";
    } else {
        element.style.display = "none";
    }
  }
function getSetSheet(tagText){
    let autoLog = "";
    if (autoLogCheckBox.checked){
        autoLog = "True";
    }
    toggleVisibility(imgLoad);
    toggleVisibility(pdfViewer);
    fetch("/barcodeGenerator", {
        method: "POST",
        headers: {
        "Content-Type": "application/json"
        },
        body: JSON.stringify({ tags: tagText, autoLog: autoLog })
    })
    .then(response => response.blob())
    .then(data => {
        toggleVisibility(imgLoad);
        toggleVisibility(pdfViewer);
        const pdfUrl = URL.createObjectURL(data);
        pdfViewer.src = pdfUrl;
    });
}

function tH(decimal) {
    let hexavigesimal = '';
    let remainder;
    while (decimal > 0) {
        remainder = (decimal - 1) % 26;
        hexavigesimal = String.fromCharCode(remainder + 97) + hexavigesimal;
        decimal = Math.floor((decimal - remainder) / 26);
    }
    return hexavigesimal;
}

function fH(hexavigesimal) {
    let decimal = 0;
    let multiplier = 1;
    for (let i = hexavigesimal.length - 1; i >= 0; i--) {
        decimal += (hexavigesimal.charCodeAt(i) - 96) * multiplier;
        multiplier *= 26;
    }
    return decimal;
}

initPage();
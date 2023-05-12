var unElm = document.getElementById("username-input");
var pwElm = document.getElementById("password-input");
var table = document.getElementById("dataBT");
var tb = document.getElementById("tblBody");

function addUsr() {
    fetch(window.location.pathname, {
        method: "POST",
        headers: {
        "Content-Type": "application/json"
        },
        body: JSON.stringify({ mth: "addUsr", un: unElm.value, pw: pwElm.value})
    })
    .then(response => response.text())
    .then(text => {
        var dat = text.split("^");
        showAlert(dat[0], dat[1], dat[2]);
        if (dat[0] === "success"){
            addRow(unElm.value);
            unElm.value = "";
            pwElm.value = "";
        }
    });
}

function addRow(usr){
    const newTr = document.createElement('tr');
    newTr.onclick = function() {
        selectRow(this);
      };
      
    newTr.innerHTML = `<td class="cl"><input class="txt" type="text" style="width: 100%; box-sizing: border-box; border: none;" id="${usr}" value="${usr}" disabled></td>`
    tb.appendChild(newTr);

}
function selectRow(row) {
    for (var i = 0; i < table.rows.length; i++) {
        table.rows[i].classList.remove("selected");
    }
    row.classList.add("selected");
}

function delUsr() {
    var selList = table.getElementsByClassName("selected");
    for (let i = 0; i < selList.length; i++) {
        let selRow = selList[i];
        var cell = selRow.cells[0];
        var txtUsr = cell.querySelector('input[type="text"]');
        fetch(window.location.pathname, {
            method: "POST",
            headers: {
            "Content-Type": "application/json"
            },
            body: JSON.stringify({ mth: "delUsr", un: txtUsr.value})
        })
        .then(response => response.text())
        .then(text => {
            var dat = text.split("^");
            showAlert(dat[0], dat[1], dat[2]);
            if (dat[0] === "success"){
                table.deleteRow(selRow.rowIndex);
            }
        });
    }
}
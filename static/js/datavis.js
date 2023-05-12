setAlertTop();
var editStatus = false;
var table = document.getElementById("dataBT");
var colnames = ['tag','school','location','room','item'];
var inputs = document.getElementsByClassName('txt');

btnLE.addEventListener("click", function() {
    if (btnLE.style.backgroundColor === "lightcoral") {
        btnLE.style.backgroundColor = "lightgreen";
        btnLE.textContent = "Live Edit: ON"
    } else {
        btnLE.style.backgroundColor = "lightcoral";
        btnLE.textContent = "Live Edit: OFF"
    }
    editStatus=!editStatus;
    toggleInput()
});

const rows = table.rows;
for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].cells;
    cells[0].addEventListener('dblclick', function() {
        const input = this.querySelector('input[type="text"]');
        const itemValue = input.value;
        window.location.href = `/item/${itemValue}`;
    });
}

function setPage(page) {
    window.location.href = `/datavis/${page}`;
}

function toggleInput(){
    for (var i = 0; i < inputs.length; i++) {
    inputs[i].disabled = !inputs[i].disabled;
    }
}

for (var i = 0; i < inputs.length; i++) {
    inputs[i].addEventListener("blur", function() {
        this.value = this.id;
    });
}



function selectRow() {
    for (var i = 0; i < table.rows.length; i++) {
        table.rows[i].classList.remove("selected");
    }
    this.classList.add("selected");
}

function deleteRow() {
    if(editStatus){
        var selectedRow = table.getElementsByClassName("selected")[0];
        if (selectedRow && selectedRow.rowIndex != 0) {
            var firstCell = selectedRow.cells[0];
            var inputBox = firstCell.querySelector('input[type="text"]');
            var inputBoxId = inputBox.id;
            dbDel(inputBoxId);
            table.deleteRow(selectedRow.rowIndex);
        }
    }
}

function dbDel(tag){
    fetch("/del", {
        method: "POST",
        headers: {
        "Content-Type": "application/json"
        },
        body: JSON.stringify({ ItemTag: tag })
    })
    .then(response => response.text())
    .then(text => {});

}
function dbEdit(inp,tag){
    fetch("/edit", {
        method: "POST",
        headers: {
        "Content-Type": "application/json"
        },
        body: JSON.stringify({ ItemTag: tag })
    })
    .then(response => response.text())
    .then(text => {
        let resp = text.split("^");
        showAlert(resp[0],resp[1],resp[2]);
        if (resp[0]==="success" || resp[0]==="info") {
            inp.id = tag.split("^")[2];
            inp.blur();
        }
    });

}

document.addEventListener("keydown", function(event) {
    if (event.key === "Delete") {
        deleteRow();
    }
});

for (var i = 1; i < table.rows.length; i++) {
    table.rows[i].addEventListener("click", selectRow);
}

for (var i = 0; i < table.rows.length; i++) {
    var row = table.rows[i];
    for (var j = 0; j < row.cells.length; j++) {
        var cell = row.cells[j];
        var input = cell.getElementsByClassName("txt")[0];
        if (input) {
            input.style.backgroundColor = getComputedStyle(cell).backgroundColor;
            input.addEventListener("keypress", function(event) {
                if (event.keyCode === 13) {
                    var row = this.closest("tr");
                    var cell = this.closest('td');
                    var inputBox = row.cells[0].querySelector('input[type="text"]');
                    var tag = [inputBox.id,colnames[cell.cellIndex],this.value];
                    dbEdit(this,tag.join('^'));
                }
            });
        }
    }
}

const tbody = table.querySelector('tbody');

// Store the original index of each row in a map
const originalIndexMap = new Map();
let rowIndex = 0;

for (const row of tbody.rows) {
    originalIndexMap.set(row, rowIndex);
    rowIndex++;
}

// Add event listener to the table headers for sorting
const headers = document.getElementById("header-row").querySelectorAll('th');
let sortedColumnIndex = -1;
let isAscending = true;
let clickCount = 0;
let lastClickedHeader = null;

for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    header.addEventListener('click', () => {
        const newSortedColumnIndex = i;
        clickCount++;
        if (newSortedColumnIndex === sortedColumnIndex) {
            isAscending = !isAscending;
        } else {
            isAscending = true;
            sortedColumnIndex = newSortedColumnIndex;
            if (lastClickedHeader !== null && lastClickedHeader !== header) {
                resetTableToOriginalSorting();
                lastClickedHeader.classList.remove('desc', 'asc');
                clickCount = 1;
            }
        }
        if (clickCount === 3) {
            resetTableToOriginalSorting();
            clickCount = 0;
            sortedColumnIndex = -1;
            isAscending = true;
            header.classList.remove('desc', 'asc');
        } else {
            sortTable(sortedColumnIndex, isAscending);
            header.classList.toggle('asc', isAscending);
            header.classList.toggle('desc', !isAscending);
        }
        lastClickedHeader = header;
    });
}



function sortTable(columnIndex, isAscending) {
    const rows = Array.from(tbody.rows);
    rows.sort((a, b) => {
        let aValue = a.cells[columnIndex].querySelector('input').value;
        let bValue = b.cells[columnIndex].querySelector('input').value;
        if (!isNaN(aValue) && !isNaN(bValue)) {
            aValue = Number(aValue);
            bValue = Number(bValue);
        }
        if (aValue === bValue) {
            return originalIndexMap.get(a) - originalIndexMap.get(b);
        } else if (isAscending) {
            return aValue < bValue ? -1 : 1;
        } else {
            return aValue > bValue ? -1 : 1;
        }
    });
    tbody.append(...rows);
}

function resetTableToOriginalSorting() {
    const rows = Array.from(tbody.rows);
    rows.sort((a, b) => originalIndexMap.get(a) - originalIndexMap.get(b));
    for (const row of rows) {
        tbody.appendChild(row);
    }
}
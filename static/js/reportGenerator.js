const listItems = document.querySelectorAll('ul > li');
const metadata = [];
var filterDdHtml = ``;

function initPage() {
    for(let b = 0; b < metadataStrs.length; b++) {
        let list = metadataStrs[b].split("^");
        metadata.push(list);
    }
    for(let b = 0; b < metadataNames.length; b++){
        let option = `<option value="${metadataNames[b]}">${metadataNames[b]}</option>\n`;
        filterDdHtml+=option;
    }
}

function liClickHlpr(){
    document.querySelectorAll('.tree li').forEach(function(li) {
        if (li.querySelector('ul')) {
          li.classList.add('parent');
          li.addEventListener('click', function(e) {
            if (e.target !== li) return;
            li.classList.toggle("open");
            //arrowHlpr();
          });
        }
    });
}

function getOptions(list){
    let iHTML = "";
    for (let i = 0; i < list.length; i++){
        iHTML += `<option value="${list[i].split(":")[1]}">${list[i].split(":")[1]}</option>`;
    }
    return iHTML;
}
function ddChangeHlpr(dd){
    var ddop = dd.parentElement.querySelector(".item-dropdown.op");
    var txt = dd.parentElement.querySelector(".item-text");
    if (["location", "room", "model", "comments"].includes(dd.value)){
        ddop.style.display = "none";
        txt.style.display = "inline-block";
    }
    else if (["school", "item"].includes(dd.value)){
        ddop.style.display = "inline-block";
        txt.style.display = "none";
        txt.value = "";
        if (dd.value === "school") {
            ddop.innerHTML = getOptions(metadataStrs[0].split("^"));
        }
        else{
            ddop.innerHTML = getOptions(metadataStrs[1].split("^"));
        }
    }
    else{
        txt.style.display = "none";
        ddop.style.display = "none";
    }
}
function addFilter(button) {
    const newItem = document.createElement('li');
    newItem.classList.add("liFil");
    newItem.innerHTML = `<button class="btnDelFilter"onclick="delFilter(this)"><span class="btnDelText">x</span></button> Filter by: <select class="item-dropdown n" onchange="ddChangeHlpr(this)">${filterDdHtml}</select><select class="item-dropdown op">${getOptions(metadataStrs[0].split("^"))}</select><input class="item-text" type="text"></input><ul><li> <button class="btnAddFilter"onclick="addFilter(this)"><span class="btnText">+</span></button></li></ul>`;
    newItem.addEventListener('click', function(e) {
        if (e.target !== newItem) return;
        newItem.classList.toggle("open");
    });
    button.parentNode.parentNode.insertBefore(newItem, button.parentNode);
    //liClickHlpr();
}

function delFilter(button) {
    button.parentElement.remove();
}


function arrowHlpr() {
    listItems.forEach(item => {
        if (item.classList.contains('open')) {
            // Add "v" after the list item text node
            const textNode = item.childNodes[0];
            textNode.nodeValue = textNode.nodeValue.replace(' >', '');
            if (!textNode.nodeValue.includes(' v')){
                textNode.nodeValue += ' v';
            }
        } else {
            // Check if the list item has any sub list items
            const subList = item.querySelector('ul');
            if (subList) {
                // Remove "v" if it was added previously
                const textNode = item.childNodes[0];
                textNode.nodeValue = textNode.nodeValue.replace(' v', '');
                // Add ">" after the list item text node
                if (!textNode.nodeValue.includes(' >')){
                    textNode.nodeValue += ' >';
                }
            }
        }
    });
}

function infLoop(li, temp, filt){

    var tempC = [...temp];
    var ddop = li.querySelector(".item-dropdown.op");
    var dd = li.querySelector(".item-dropdown.n");
    var txt = li.querySelector(".item-text");

    if (["Oldest", "Newest"].includes(dd.value)){
        tempC.push(dd.value)
    }
    else if (txt.style.display != "inline-block"){
        tempC.push(`${dd.value}:${ddop.value}`);
    }
    else {
        tempC.push(`${dd.value}:${txt.value}`);
    }
    var subUl = li.querySelector('ul');
    if (subUl && subUl.querySelectorAll('.liFil').length != 0) {
        subUl.querySelectorAll('.liFil').forEach(subLi => {
            if (subLi.parentElement === subUl){
                return infLoop(subLi,tempC,filt);
            }
        });
    }
    else{
        filt.push(tempC.join("^"));
        return tempC;
    }
    
    
}

function genReport(){
    var temp = [];
    var treeList = document.getElementById("treeList");
    var filt = [];
    treeList.querySelectorAll('.liFil').forEach(li => {
        if (li.parentElement === treeList){
            infLoop(li,[],filt)
        }
    });
    getSetReport(filt.join('|'));
    filt=[];
}
function toggleVisibility(element) {
    if (element.style.display === "none") {
        element.style.display = "block";
    } else {
        element.style.display = "none";
    }
}
function getSetReport(filt){
    toggleVisibility(imgLoad);
    toggleVisibility(pdfViewer);
    fetch("/reportGenerator", {
        method: "POST",
        headers: {
        "Content-Type": "application/json"
        },
        body: JSON.stringify({ filt: filt })
    })
    .then(response => response.blob())
    .then(data => {
        toggleVisibility(imgLoad);
        toggleVisibility(pdfViewer);
        const pdfUrl = URL.createObjectURL(data);
        pdfViewer.src = pdfUrl;
    });
}
//liClickHlpr();
initPage();
//arrowHlpr();
// Get all list items in the unordered list


// Loop through each list item and check for the "open" class

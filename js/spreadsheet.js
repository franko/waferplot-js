var dataTableCurrentId = 0;

var newTableId = function() {
    var id = dataTableCurrentId;
    dataTableCurrentId ++;
    return id;
};

var parseTabular = function(text) {
    text = text.replace("\r", "");
    var lines = text.split("\n");
    var data = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line !== "") {
            data.push(line.split("\t"));
        }
    }
    return data;
};

var encodeCellId = function(id, i, j) {
    return "cell" + String(id) + "-" + String(i) + "-" + String(j);
};

var decodeCellId = function(name) {
    var re = /^cell(\d+)-(\d+)-(\d+)/;
    var match = re.exec(name);
    if (match) {
        return [Number(match[2]), Number(match[3])];
    }
};

var getCellIndexes = function(td) {
    var id = td.getAttribute("id");
    return decodeCellId(id);
};

function createDataTable(initialRows, initialCols) {
    var tableElement, tableRows = 0, tableCols = 0;
    var selecting = false, selStartIndexes, selEndIndexes;
    var tableId = newTableId();

    var getSelection = function() {
        if (!selStartIndexes) return "";
        var i1 = selStartIndexes[0], j1 = selStartIndexes[1];
        var i2 = selEndIndexes[0], j2 = selEndIndexes[1];
        if (i2 < i1) {
            var itemp = i1;
            i1 = i2;
            i2 = itemp;
        }
        if (j2 < j1) {
            var itemp = j1;
            j1 = j2;
            j2 = itemp;
        }
        var lines = [];
        for (var i = i1; i <= i2; i++) {
            var row = [];
            for (var j = j1; j <= j2; j++) {
                var td = document.getElementById(encodeCellId(tableId, i, j));
                row.push(td.textContent);
            }
            lines.push(row.join("\t"));
        }
        return lines.join("\n");
    }

    var tableOnKeyDown = copyToClipboardOnKeyPress(getSelection);

    var createTableTh = function(j) {
        var th = document.createElement("th");
        th.innerHTML = String.fromCharCode(65 + j);
        return th;
    };

    var createTableTd = function(i, j) {
        var td = document.createElement("td");
        td.setAttribute("id", encodeCellId(tableId, i, j));
        td.setAttribute("contenteditable", true);
        td.onmousedown = onTdMouseDown;
        td.onmousemove = onTdMouseMove;
        td.onmouseup = onTdMouseUp;
        td.onpaste = cellOnPaste;
        td.onkeypress = onTdKeyPress;
        td.onkeydown = tableOnKeyDown;
        var text = document.createTextNode("");
        td.appendChild(text);
        return td;
    };

    var createTableTr = function(i, cols) {
        var tr = document.createElement("tr");
        for (var j = 0; j < cols; j++) {
            var td = createTableTd(i, j);
            tr.appendChild(td);
        }
        return tr;
    }

    var spreadSheetMarkSelected = function(sel1, sel2) {
        var i1 = -1, j1 = -1, i2 = -1, j2 = -1;
        if (sel1) {
            i1 = sel1[0], j1 = sel1[1];
            i2 = sel2[0], j2 = sel2[1];
            if (i2 < i1) {
                var itemp = i1;
                i1 = i2;
                i2 = itemp;
            }
            if (j2 < j1) {
                var itemp = j1;
                j1 = j2;
                j2 = itemp;
            }
        }
        for (var i = 0; i < tableRows; i++) {
            for (var j = 0; j < tableCols; j++) {
                var td = document.getElementById(encodeCellId(tableId, i, j));
                if (i >= i1 && i <= i2 && j >= j1 && j <= j2) {
                    td.className = "selected";
                } else {
                    td.className = "";
                }
            }
        }
    };

    var onTdMouseDown = function(e) {
        selStartIndexes = getCellIndexes(e.target);
        selEndIndexes = selStartIndexes;
        selecting = true;
        spreadSheetMarkSelected(selStartIndexes, selEndIndexes);
    };

    var onTdMouseUp = function(e) {
        selecting = false;
    };

    var onTdMouseMove = function(e) {
        if (selecting) {
            selEndIndexes = getCellIndexes(e.target);
            spreadSheetMarkSelected(selStartIndexes, selEndIndexes);
        }
    };

    var onTdKeyPress = function(e) {
        if (e.keyCode === 13) {
            e.target.blur();
            return false;
        }
    };

    var setTableElements = function(data, indexes) {
        var i0 = indexes[0], j0 = indexes[1];
        for (var i = 0; i < data.length; i++) {
            var row = data[i];
            if (!row) continue;
            for (var j = 0; j < row.length; j++) {
                var td = document.getElementById(encodeCellId(tableId, i0+i, j0+j));
                if (td.firstChild.nodeName === "INPUT") {
                    td.firstChild.value = row[j];
                } else {
                    td.firstChild.nodeValue = row[j];
                }
            }
        }
    };

    var cellOnPaste = function(e) {
        var indexes = getCellIndexes(e.target);
        var pastedText = e.clipboardData.getData('text/plain');
        var pastedData = parseTabular(pastedText);
        // When calling ensureTableSize we ask for one more row and column of what needed.
        ensureTableSize(indexes[0] + pastedData.length + 1, indexes[1] + pastedData[0].length + 1);
        setTableElements(pastedData, indexes);
        return false;
    };

    var ensureTableSize = function(rowsRequest, colsRequest) {
        var rows = tableRows, cols = tableCols;
        if (rowsRequest < rows) rowsRequest = rows;
        if (colsRequest < cols) colsRequest = cols;
        var tableNodes = tableElement.childNodes;
        var thead = tableNodes[0];
        var i, j;
        for (j = cols; j < colsRequest; j++) {
            var th = createTableTh(j);
            thead.appendChild(th);
        }
        for (i = 0; i < rows; i++) {
            var tr = tableNodes[i+1];
            for (j = cols; j < colsRequest; j++) {
                var td = createTableTd(i, j);
                tr.appendChild(td);
            }
        }
        for (i = rows; i < rowsRequest; i++) {
            var tr = createTableTr(i, colsRequest);
            tableElement.appendChild(tr);
        }
        tableRows = rowsRequest;
        tableCols = colsRequest;
    };

    // Create an empty table with thead child.
    tableElement = document.createElement("table");
    var thead = document.createElement("thead");
    tableElement.appendChild(thead);

    ensureTableSize(initialRows, initialCols);

    return {element: tableElement};
}

var div = document.getElementById("data-table");
var dataTable = createDataTable(4, 4);
div.appendChild(dataTable.element);

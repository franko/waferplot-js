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

var inputElementOnMouseDown = function(evt) {
    evt.target.className = "";
};

var createTable = function(initialRows, initialCols, textInputElement) {
    var tableElement, tableRows = 0, tableCols = 0;
    var selecting = false, selStartIndexes, selEndIndexes;
    var tableId = newTableId();
    var cellEditing = null;

    var inputElementIsIndirect = function() {
        return (textInputElement.className === "indirect");
    };

    var getSelectionRange = function() {
        if (!selStartIndexes) return [0, 0, -1, -1];
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
        return [i1, j1, i2, j2];
    };

    var getSelection = function() {
        var sel = getSelectionRange();
        var i1 = sel[0], j1 = sel[1], i2 = sel[2], j2 = sel[3];
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

    var clearSelection = function() {
        var sel = getSelectionRange();
        var i1 = sel[0], j1 = sel[1], i2 = sel[2], j2 = sel[3];
        for (var i = i1; i <= i2; i++) {
            for (var j = j1; j <= j2; j++) {
                var td = document.getElementById(encodeCellId(tableId, i, j));
                td.textContent = "";
            }
        }
    };

    var getStartSelectionCell = function() {
        if (selStartIndexes) {
            var i = selStartIndexes[0], j = selStartIndexes[1];
            return document.getElementById(encodeCellId(tableId, i, j));
        }
        return null;
    };

    var copySelectionFn = copyToClipboardOnKeyPress(getSelection);

    var inputElementOnKeyDown = function(evt) {
        if (!inputElementIsIndirect()) return;
        var c = evt.keyCode;
        if (c == 46) { /* Delete keyword. */
            clearSelection();
            if (inputElementIsIndirect()) {
                textInputElement.value = "";
            }
        } else if (evt.key !== "" && !evt.ctrlKey && !evt.altKey) {
            textInputElement.value = "";
            var td = getStartSelectionCell();
            if (td) {
                td.textContent = "";
                td.focus();
                cellEditing = td;
            }
        } else {
            copySelectionFn(evt);
        }
    };

    var inputElementOnInput = function(evt) {
        var td = getStartSelectionCell();
        if (td) {
            td.textContent = textInputElement.value;
        }
    };

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
        td.ondblclick = onDoubleClick;
        td.onkeypress = onTdKeyPress;
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
        if (cellEditing) {
            if (cellEditing === e.target) return;
            cellEditing = null;
        }
        e.preventDefault();
        selStartIndexes = getCellIndexes(e.target);
        selEndIndexes = selStartIndexes;
        selecting = true;
        spreadSheetMarkSelected(selStartIndexes, selEndIndexes);
        textInputElement.className = "indirect";
        textInputElement.value = e.target.textContent;
        textInputElement.focus();
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
            cellEditing = null;
            textInputElement.value = e.target.textContent;
            return false;
        }
    };

    var onDoubleClick = function(e) {
        cellEditing = e.target;
        e.target.focus();
    };

    var setTableElements = function(data, indexes) {
        var i0 = indexes[0], j0 = indexes[1];
        for (var i = 0; i < data.length; i++) {
            var row = data[i];
            if (!row) continue;
            for (var j = 0; j < row.length; j++) {
                var td = document.getElementById(encodeCellId(tableId, i0+i, j0+j));
                td.textContent = row[j];
            }
        }
    };

    var inputElementOnPaste = function(e) {
        if (!inputElementIsIndirect()) return;
        e.preventDefault();
        var indexes = selStartIndexes;
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

    var getText = function() {
        var lines = [];
        for (var i = 0; i < tableElement.rows.length; i++) {
            var row = tableElement.rows[i];
            var line = [];
            for (var j = 0; j < row.cells.length; j++) {
                var s = row.cells[j].firstChild.nodeValue;
                if (!s.match(/^\s*$/)) {
                    line.push(s);
                }
            }
            if (line.length > 0) {
                lines.push(line.join());
            }
        }
        return lines.join("\n");
    };

    // Create an empty table with thead child.
    tableElement = document.createElement("table");
    tableElement.className = "spreadsheet";
    var thead = document.createElement("thead");
    tableElement.appendChild(thead);

    ensureTableSize(initialRows, initialCols);

    textInputElement.className = "";
    textInputElement.onpaste = inputElementOnPaste;
    textInputElement.onmousedown = inputElementOnMouseDown;
    textInputElement.onkeydown = inputElementOnKeyDown;
    textInputElement.oninput = inputElementOnInput;

    return {element: tableElement, getText: getText};
}

spreadsheet = { createTable: createTable };

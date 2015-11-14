/// <reference path="/usr/local/lib/node_modules/typescript/bin/lib.es6.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Sheets;
(function (Sheets) {
    "use strict";
    Sheets.name = "Sheets";
    Sheets.version = "0.0.1";
    Sheets.storageKey = "text/sheets";
    Sheets.currencySymbol = "€"; // unused, currency support required formatting which .tsv lacks
    Sheets.placeholderSymbol = "..."; // to display during the loading process of formulae
    Sheets.errorPrefix = "Error: ";
    (function (SheetErrorType) {
        SheetErrorType[SheetErrorType["InvalidReference"] = 1] = "InvalidReference";
        SheetErrorType[SheetErrorType["InvalidFormula"] = 2] = "InvalidFormula";
        SheetErrorType[SheetErrorType["InvalidArguments"] = 3] = "InvalidArguments";
        SheetErrorType[SheetErrorType["DivideByZero"] = 4] = "DivideByZero";
        SheetErrorType[SheetErrorType["CircularReference"] = 5] = "CircularReference";
        SheetErrorType[SheetErrorType["MissingArguments"] = 6] = "MissingArguments";
    })(Sheets.SheetErrorType || (Sheets.SheetErrorType = {}));
    var SheetErrorType = Sheets.SheetErrorType;
    var SheetError = (function (_super) {
        __extends(SheetError, _super);
        function SheetError(type) {
            _super.call(this, SheetErrorType[type]);
            this.type = type;
        }
        return SheetError;
    })(Error);
    Sheets.SheetError = SheetError;
    function error(type) {
        throw new SheetError(type);
    }
    Sheets.error = error;
    function downloadTextFile(name, content) {
        function encodeAsDataURL(text) {
            var content = encodeURIComponent(text);
            return "data:text;charset=utf-8," + content;
        }
        var a = document.createElement('a');
        a.href = encodeAsDataURL(content);
        a.download = name;
        a.click();
    }
    Sheets.downloadTextFile = downloadTextFile;
    function rangeFromTo(start, stop) {
        var builder = [];
        for (var i = start; i < stop; i += 1) {
            builder.push(i);
        }
        return builder;
    }
    Sheets.rangeFromTo = rangeFromTo;
    function rangeTo(stop) {
        return rangeFromTo(0, stop);
    }
    Sheets.rangeTo = rangeTo;
    function deleteFrom(item, array) {
        var index = array.indexOf(item);
        if (index !== -1) {
            array.splice(index, 1);
        }
    }
    Sheets.deleteFrom = deleteFrom;
    function containsSubstring(string, substring) {
        return string.indexOf(substring) !== -1;
    }
    Sheets.containsSubstring = containsSubstring;
    function lastOf(array) {
        return array[array.length - 1];
    }
    Sheets.lastOf = lastOf;
})(Sheets || (Sheets = {}));
/// <reference path="./common"/>
var Sheets;
(function (Sheets) {
    "use strict";
    /**0-indexed */
    var AbsolutePosition = (function () {
        function AbsolutePosition(row, column) {
            this.row = row;
            this.column = column;
        }
        AbsolutePosition.fromString = function (template) {
            return parsePosition(template).resolveWith(AbsolutePosition.origin);
        };
        AbsolutePosition.prototype.toString = function () {
            var _a = this, row = _a.row, column = _a.column;
            return "R" + row + "C" + column;
        };
        AbsolutePosition.origin = new AbsolutePosition(0, 0);
        return AbsolutePosition;
    })();
    Sheets.AbsolutePosition = AbsolutePosition;
    var RelativePosition = (function () {
        function RelativePosition(row, column, rowIsOffset, columnIsOffset) {
            if (rowIsOffset === void 0) { rowIsOffset = false; }
            if (columnIsOffset === void 0) { columnIsOffset = false; }
            this.row = row;
            this.column = column;
            this.rowIsOffset = rowIsOffset;
            this.columnIsOffset = columnIsOffset;
        }
        RelativePosition.prototype.resolveWith = function (pos) {
            var row = this.rowIsOffset ? pos.row + this.row : this.row;
            var column = this.columnIsOffset ? pos.column + this.column : this.column;
            return new AbsolutePosition(row, column);
        };
        return RelativePosition;
    })();
    Sheets.RelativePosition = RelativePosition;
    function parsePosition(reference) {
        var _a = reference.slice(1).split("C"), row_part = _a[0], column_part = _a[1];
        var row_part_length = row_part.length;
        var column_part_length = column_part.length;
        var row_is_offset = Sheets.containsSubstring(row_part, "[") || row_part_length === 0;
        var column_is_offset = Sheets.containsSubstring(column_part, "[") || column_part_length === 0;
        var row_value = row_is_offset ? row_part.slice(1, row_part_length - 1) : row_part;
        var column_value = column_is_offset ? column_part.slice(1, column_part_length - 1) : column_part;
        var row = (row_is_offset ? parseFloat(row_value) : parseFloat(row_value) - 1) || 0;
        var column = (column_is_offset ? parseFloat(column_value) : parseFloat(column_value) - 1) || 0;
        if (Number.isInteger(row) && Number.isInteger(column)) {
            return new RelativePosition(row, column, row_is_offset, column_is_offset);
        }
        else {
            Sheets.error(Sheets.SheetErrorType.InvalidReference);
        }
    }
    Sheets.parsePosition = parsePosition;
    var Cell = (function () {
        function Cell(position, content) {
            this.position = position;
            this.content = content;
            this.value = this.isFormula ? Sheets.placeholderSymbol : this.content;
        }
        Object.defineProperty(Cell.prototype, "isEmpty", {
            get: function () {
                return !this.content;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Cell.prototype, "isFormula", {
            get: function () {
                var content = this.content;
                return !this.isEmpty && !content.startsWith("'") && content.trim().startsWith("=");
            },
            enumerable: true,
            configurable: true
        });
        Cell.prototype.absolutePositionOf = function (rel_pos) {
            return rel_pos.resolveWith(this.position);
        };
        Cell.prototype.toString = function () {
            return this.content;
        };
        return Cell;
    })();
    Sheets.Cell = Cell;
    function calculateValueFor_In(cell, table) {
        if (cell.isFormula) {
            var formula = cell.content.trim().slice(1).trim();
            var static_formula = formula.replace(/R(\[?-?\d+\]?)?C(\[?-?\d+\]?)?/gi, function (reference) {
                var relative_position = parsePosition(reference);
                var absolute_position = cell.absolutePositionOf(relative_position);
                var referenced_cell = table.getCellAt(absolute_position);
                var value = calculateValueFor_In(referenced_cell, table);
                return isNaN(parseFloat(value)) ? ('"' + value + '"') : value;
            });
            return eval(static_formula);
        }
        else {
            return cell.content;
        }
    }
    Sheets.calculateValueFor_In = calculateValueFor_In;
    var Table = (function () {
        // Row-major, R1C1 is [0][0], R2C3 is [1][2] 
        function Table(size, matrix) {
            this.size = size;
            this.matrix = matrix;
        }
        Table.createEmpty = function (rows, columns) {
            var matrix_builder = [];
            Sheets.rangeTo(rows).forEach(function (row) {
                var row_builder = [];
                Sheets.rangeTo(columns).forEach(function (column) {
                    var position = new AbsolutePosition(row, column);
                    var cell = new Cell(position, "");
                    row_builder.push(cell);
                });
                matrix_builder.push(row_builder);
            });
            return new Table({ rows: rows, columns: columns }, matrix_builder);
        };
        Table.restoreFromTSV = function (tsv) {
            var matrix = tsv.split("\n").map(function (row) { return row.split("\t"); });
            var rows = matrix.length;
            var columns = Math.max.apply(null, matrix.map(function (row) { return row.length; }));
            var table = Table.createEmpty(rows, columns);
            Sheets.rangeTo(rows).forEach(function (row) {
                Sheets.rangeTo(columns).forEach(function (column) {
                    var position = new AbsolutePosition(row, column);
                    var content = matrix[row][column] || "";
                    table.setCellContent_At(content, position);
                });
            });
            return table;
        };
        Table.prototype.getCellAt = function (pos) {
            return this.matrix[pos.row][pos.column];
        };
        Table.prototype.setCellContent_At = function (new_content, pos) {
            var cell = this.getCellAt(pos);
            cell.content = new_content;
            cell.value = calculateValueFor_In(cell, this);
        };
        Table.prototype.expandToFitPosition = function (position) {
            var _a = this.size, rows = _a.rows, columns = _a.columns;
            if (position.row < rows && position.column < columns) {
                return;
            }
            else {
                var new_rows = Math.max(position.row + 1, rows);
                var new_columns = Math.max(position.column + 1, columns);
                var new_table = Table.createEmpty(new_rows, new_columns);
                this.matrix.forEach(function (row) {
                    row.forEach(function (cell) {
                        new_table.setCellContent_At(cell.content, cell.position);
                    });
                });
                this.size = new_table.size;
                this.matrix = new_table.matrix;
            }
        };
        Table.prototype.copyFrom = function (table) {
            var _this = this;
            var _a = this.size, rows = _a.rows, columns = _a.columns;
            Sheets.rangeTo(rows).forEach(function (row) {
                Sheets.rangeTo(columns).forEach(function (column) {
                    var position = new AbsolutePosition(row, column);
                    var cell = table.getCellAt(position);
                    _this.setCellContent_At(cell.content, position);
                });
            });
        };
        Table.prototype.updateValues = function () {
            var _this = this;
            this.matrix.forEach(function (row) {
                row.forEach(function (cell) {
                    cell.value = calculateValueFor_In(cell, _this);
                });
            });
        };
        /**Marks cell with 0-indexed id format "cell_rXcY" for styling */
        Table.prototype.storeToTable = function () {
            return this.matrix.map(function (row) { return ("<tr>" + row.map(function (cell) {
                var _a = cell.position, row = _a.row, column = _a.column;
                return "<td id=\"cell_r" + row + "c" + column + "\">" + cell.value + "</td>";
            }).join("") + "</tr>"); }).join("");
        };
        Table.prototype.storeToTSV = function () {
            return this.matrix.map(function (row) {
                return row.map(function (cell) { return cell.content; }).join("\t");
            }).join("\n");
        };
        return Table;
    })();
    Sheets.Table = Table;
})(Sheets || (Sheets = {}));
/// <reference path="./common"/>
/// <reference path="./data"/>
var Sheets;
(function (Sheets) {
    "use strict";
    (function (KeyCode) {
        KeyCode[KeyCode["Enter"] = 13] = "Enter";
        KeyCode[KeyCode["Left"] = 37] = "Left";
        KeyCode[KeyCode["Up"] = 38] = "Up";
        KeyCode[KeyCode["Right"] = 39] = "Right";
        KeyCode[KeyCode["Down"] = 40] = "Down";
    })(Sheets.KeyCode || (Sheets.KeyCode = {}));
    var KeyCode = Sheets.KeyCode;
    (function (ControllerMode) {
        ControllerMode[ControllerMode["Select"] = 0] = "Select";
        ControllerMode[ControllerMode["Edit"] = 1] = "Edit";
    })(Sheets.ControllerMode || (Sheets.ControllerMode = {}));
    var ControllerMode = Sheets.ControllerMode;
    var Controller = (function () {
        function Controller(outlets) {
            this.outlets = outlets;
            this.table = Sheets.Table.createEmpty(10, 10);
            this.mode = ControllerMode.Select;
            this.cursor = new Sheets.AbsolutePosition(0, 0);
            this.loadFields();
            this.registerListeners();
            this.updateTable();
            this.selectCursor();
            this.selectedPosition = this.cursor.toString();
        }
        Controller.prototype.registerListeners = function () {
            var _this = this;
            var _a = this.outlets, fileNameInput = _a.fileNameInput, exportButton = _a.exportButton, fileInput = _a.fileInput, importButton = _a.importButton, cursorButton = _a.cursorButton, formulaInput = _a.formulaInput, tableElement = _a.tableElement;
            importButton.addEventListener("click", function (event) { return _this.importFile(); }, false);
            exportButton.addEventListener("click", function (event) { return _this.exportFile(); }, false);
            cursorButton.addEventListener("click", function (event) { return _this.copyToFormula(); }, false);
            tableElement.addEventListener("click", function (event) { return _this.selectTableCell(event); }, false);
            formulaInput.addEventListener("keydown", function (event) { return _this.keyboardInput(event); }, false);
            tableElement.addEventListener("keydown", function (event) { return _this.keyboardInput(event); }, false);
            window.addEventListener("beforeunload", function (event) { return _this.saveFields(); }, false);
        };
        Controller.prototype.saveFields = function () {
            var pod = JSON.stringify({
                name: this.outlets.fileNameInput.value,
                tsv: this.table.storeToTSV()
            });
            window.localStorage.setItem(Sheets.storageKey, pod);
        };
        Controller.prototype.loadFields = function () {
            var stored = window.localStorage.getItem(Sheets.storageKey);
            if (stored) {
                var pod = JSON.parse(stored);
                this.outlets.fileNameInput.value = pod.name || "";
                this.loadTableFrom(pod.tsv);
            }
        };
        Controller.prototype.loadTableFrom = function (text) {
            try {
                this.table = Sheets.Table.restoreFromTSV(text);
            }
            catch (e) {
                this.table = Sheets.Table.createEmpty(10, 10);
            }
            this.updateTable();
        };
        Controller.prototype.importFile = function () {
            var _this = this;
            var fileInput = this.outlets.fileInput;
            var file = fileInput.files[0];
            var reader = new FileReader();
            reader.addEventListener('loadend', function (event) {
                var contents = reader.result;
                _this.loadTableFrom(contents);
            }, false);
            reader.readAsText(file);
        };
        Controller.prototype.exportFile = function () {
            var file_name = this.outlets.fileNameInput.value;
            var tsv = this.table.storeToTSV();
            Sheets.downloadTextFile(file_name + ".tsv", tsv);
        };
        Object.defineProperty(Controller.prototype, "formulaValue", {
            get: function () {
                return this.outlets.formulaInput.value;
            },
            set: function (new_value) {
                this.outlets.formulaInput.value = new_value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Controller.prototype, "selectedPosition", {
            set: function (new_value) {
                this.outlets.cursorButton.innerText = new_value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Controller.prototype, "elementAtCursor", {
            get: function () {
                var _a = this.cursor, row = _a.row, column = _a.column;
                return document.getElementById("cell_r" + row + "c" + column);
            },
            enumerable: true,
            configurable: true
        });
        Controller.prototype.updateTable = function () {
            var tableElement = this.outlets.tableElement;
            this.table.updateValues();
            tableElement.innerHTML = this.table.storeToTable();
        };
        Controller.prototype.editField = function () {
            var formulaInput = this.outlets.formulaInput;
            formulaInput.focus();
            formulaInput.select();
        };
        Controller.prototype.selectTableCell = function (event) {
            var target = event.target;
            if ("id" in target) {
                var tag = target["id"];
                var position = tag.split("_")[1];
                this.selectedPosition = position.toUpperCase();
            }
        };
        Controller.prototype.commitChanges = function () {
            var new_value = this.formulaValue;
            this.table.setCellContent_At(new_value, this.cursor);
            this.updateTable();
            this.outlets.tableElement.focus();
            this.selectCursor();
        };
        Controller.prototype.deselectCursor = function () {
            this.elementAtCursor.classList.remove('selected');
        };
        Controller.prototype.selectCursor = function () {
            this.outlets.tableElement.focus();
            this.elementAtCursor.classList.add('selected');
        };
        Controller.prototype.moveCursorTo = function (position) {
            var new_row = position.row < 0 ? 0 : position.row;
            var new_column = position.column < 0 ? 0 : position.column;
            var new_position = new Sheets.AbsolutePosition(new_row, new_column);
            this.table.expandToFitPosition(new_position);
            this.updateTable();
            this.deselectCursor();
            this.cursor = new_position;
            this.selectCursor();
            var selected_cell = this.table.getCellAt(this.cursor);
            this.formulaValue = selected_cell.content;
            this.selectedPosition = new_position.toString();
        };
        Controller.prototype.keyboardInput = function (event) {
            var kc = event.keyCode;
            if (event.target === this.outlets.formulaInput) {
                if (kc === KeyCode.Enter) {
                    this.commitChanges();
                }
            }
            else {
                if (kc === KeyCode.Enter) {
                    this.editField();
                }
                else {
                    var abs_pos = function (row, column) { return new Sheets.AbsolutePosition(row, column); };
                    var _a = this.cursor, row = _a.row, column = _a.column;
                    var new_position = null;
                    if (kc === KeyCode.Left) {
                        new_position = abs_pos(row, column - 1);
                    }
                    else if (kc === KeyCode.Up) {
                        new_position = abs_pos(row - 1, column);
                    }
                    else if (kc === KeyCode.Right) {
                        new_position = abs_pos(row, column + 1);
                    }
                    else if (kc === KeyCode.Down) {
                        new_position = abs_pos(row + 1, column);
                    }
                    if (new_position) {
                        this.moveCursorTo(new_position);
                    }
                }
            }
        };
        Controller.prototype.copyToFormula = function () {
            var cursor = this.outlets.cursorButton.innerText;
            this.outlets.formulaInput.value += cursor;
            this.outlets.formulaInput.focus();
        };
        return Controller;
    })();
    Sheets.Controller = Controller;
})(Sheets || (Sheets = {}));
/// <reference path="./lib/controller" />
var controller = new Sheets.Controller({
    fileInput: document.getElementById("File_Input"),
    fileNameInput: document.getElementById("File_Name"),
    importButton: document.getElementById("Import"),
    exportButton: document.getElementById("Export"),
    cursorButton: document.getElementById("Cursor"),
    formulaInput: document.getElementById("Formula"),
    tableElement: document.getElementById("Table"),
});
//# sourceMappingURL=packed.js.map
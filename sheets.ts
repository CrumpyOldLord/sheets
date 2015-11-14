/// <reference path="./lib/controller" />

const controller = new Sheets.Controller({
    fileInput:     <HTMLInputElement>document.getElementById("File_Input"),
    fileNameInput: <HTMLInputElement>document.getElementById("File_Name"),
    importButton:  <HTMLButtonElement>document.getElementById("Import"),
    exportButton:  <HTMLButtonElement>document.getElementById("Export"),
    cursorButton:  <HTMLButtonElement>document.getElementById("Cursor"),
    formulaInput:  <HTMLInputElement>document.getElementById("Formula"),
    tableElement:  <HTMLTableElement>document.getElementById("Table"),
})


/// <reference path="./common"/>
/// <reference path="./data"/>

module Sheets {
    "use strict"
    
    export interface ControllerOutlets {
        fileNameInput: HTMLInputElement
        exportButton:  HTMLButtonElement
        fileInput:     HTMLInputElement
        importButton:  HTMLButtonElement
        cursorButton:  HTMLButtonElement
        formulaInput:  HTMLInputElement
        tableElement:  HTMLTableElement
    }
    
    
    export enum KeyCode {
        "Enter" = 13, "Left" = 37, "Up" = 38, "Right" = 39, "Down" = 40,
    }
    
    export enum ControllerMode {
        Select, Edit
    }    

    
    export class Controller {
        table: Table
        mode: ControllerMode
        cursor: AbsolutePosition
        
        
        constructor(public outlets: ControllerOutlets) {
            this.table  = Table.createEmpty(10, 10)
            this.mode   = ControllerMode.Select
            this.cursor = new AbsolutePosition(0, 0)
            
            this.loadFields()
            this.registerListeners()
            
            this.updateTable()
            this.selectCursor()
            this.selectedPosition = this.cursor.toString()
        }
        
        registerListeners() {
            let {
                fileNameInput, 
                exportButton,
                fileInput, 
                importButton, 
                cursorButton, 
                formulaInput, 
                tableElement
            } = this.outlets
            
            importButton.addEventListener("click", event => this.importFile(), false)
            exportButton.addEventListener("click", event => this.exportFile(), false)
            cursorButton.addEventListener("click", event => this.copyToFormula(), false)
            tableElement.addEventListener("click", event => this.selectTableCell(event), false)
            
            formulaInput.addEventListener("keydown", event => this.keyboardInput(event), false)
            tableElement.addEventListener("keydown", event => this.keyboardInput(event), false)
            window.addEventListener("beforeunload", event => this.saveFields(), false)
        }
        
        
        
        
        
        saveFields() {
            let pod = JSON.stringify({
                name: this.outlets.fileNameInput.value,
                tsv:  this.table.storeToTSV()
            })
            
            window.localStorage.setItem(storageKey, pod)
        }
        
        loadFields() {
            let stored = window.localStorage.getItem(storageKey)
            
            if (stored) {
                let pod = JSON.parse(stored)
                
                this.outlets.fileNameInput.value = pod.name || ""
                this.loadTableFrom(pod.tsv)
            }
        }
        
        loadTableFrom(text: string) {
            try {
                this.table = Table.restoreFromTSV(text)
            } catch (e) {
                this.table = Table.createEmpty(10, 10)
            }
            this.updateTable()
        }
        
        importFile() {
            let {fileInput} = this.outlets
            
            let file         = fileInput.files[0]
            let reader       = new FileReader()
            
            reader.addEventListener('loadend', event => {
                let contents = <string>reader.result
                this.loadTableFrom(contents)
            }, false)
            
            reader.readAsText(file)
        }
        
        exportFile() {
            let file_name = this.outlets.fileNameInput.value
            let tsv       = this.table.storeToTSV()
            
            downloadTextFile(file_name + ".tsv", tsv)
        }
        
        
        get formulaValue(): string {
            return this.outlets.formulaInput.value
        }
        
        set formulaValue(new_value: string) {
            this.outlets.formulaInput.value = new_value
        }
        
        set selectedPosition(new_value: string) {
            this.outlets.cursorButton.innerText = new_value
        }
        
        get elementAtCursor(): HTMLTableDataCellElement {
            let {row, column} = this.cursor
            return <HTMLTableDataCellElement>document.getElementById(`cell_r${row}c${column}`)
        }
        
        
        updateTable() {
            let {tableElement} = this.outlets
            this.table.updateValues()
            
            tableElement.innerHTML = this.table.storeToTable()
        }
        
        editField() {
            let {formulaInput} = this.outlets
            formulaInput.focus()
            formulaInput.select()
        }
        
        
        selectTableCell(event: MouseEvent) {
            let {target} = event
            
            if ("id" in target) {
                let tag      = target["id"]
                let position = tag.split("_")[1]
                
                this.selectedPosition = position.toUpperCase()
            }
        }
        
        commitChanges() {
            let new_value = this.formulaValue
            this.table.setCellContent_At(new_value, this.cursor)
            
            this.updateTable()
            this.outlets.tableElement.focus()
            
            this.selectCursor()
        }
        
        
        deselectCursor() {
            this.elementAtCursor.classList.remove('selected')
        }
        
        selectCursor() {
            this.outlets.tableElement.focus()
            this.elementAtCursor.classList.add('selected')
        }
        
        moveCursorTo(position: AbsolutePosition) {
            let new_row      = position.row    < 0 ? 0 : position.row
            let new_column   = position.column < 0 ? 0 : position.column
            let new_position = new AbsolutePosition(new_row, new_column)
            
            this.table.expandToFitPosition(new_position)
            this.updateTable()
            
            this.deselectCursor()
            this.cursor = new_position
            this.selectCursor()
            
            let selected_cell     = this.table.getCellAt(this.cursor)
            this.formulaValue     = selected_cell.content
            this.selectedPosition = new_position.toString()
        }
        
        
        
        keyboardInput(event: KeyboardEvent) {
            let kc = event.keyCode
            
            if (event.target === this.outlets.formulaInput) {
                if (kc === KeyCode.Enter) {
                    this.commitChanges()
                }
            } else {
                if (kc === KeyCode.Enter) {
                    this.editField()
                } else {
                    let abs_pos = (row: number, column: number) => new AbsolutePosition(row, column)
                    
                    let {row, column} = this.cursor
                    let new_position  = null
                    
                    if (kc === KeyCode.Left) {
                        new_position = abs_pos(row, column - 1)
                    } else if (kc === KeyCode.Up) {
                        new_position = abs_pos(row - 1, column)
                    } else if (kc === KeyCode.Right) {
                        new_position = abs_pos(row, column + 1)
                    } else if (kc === KeyCode.Down) {
                        new_position = abs_pos(row + 1, column)
                    }
                    
                    if (new_position) {
                        this.moveCursorTo(new_position)
                    }
                }
            }
        }
        
        
        
        copyToFormula() {
            let cursor = this.outlets.cursorButton.innerText
            this.outlets.formulaInput.value += cursor
            this.outlets.formulaInput.focus()
        }
    }
}
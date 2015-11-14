/// <reference path="./common"/>


module Sheets {
    "use strict"
    
    /**0-indexed */
    export class AbsolutePosition {
        constructor(public row: number, public column: number) {}
        
        static origin = new AbsolutePosition(0, 0)
        
        static fromString(template: string): AbsolutePosition {
            return parsePosition(template).resolveWith(AbsolutePosition.origin)
        }
        
        toString(): string {
            let {row, column} = this
            return `R${row}C${column}`
        }
    }
    
    
    export class RelativePosition {
        constructor(public row: number, public column: number, 
            public rowIsOffset = false, public columnIsOffset = false) {
            
        }
        
        resolveWith(pos: AbsolutePosition): AbsolutePosition {
            let row    = this.rowIsOffset    ? pos.row    + this.row    : this.row
            let column = this.columnIsOffset ? pos.column + this.column : this.column
            
            return new AbsolutePosition(row, column)
        }
    }
    
    
    export function parsePosition(reference: string): RelativePosition {
        let [row_part, column_part] = reference.slice(1).split("C")
        
        let row_part_length    = row_part.length
        let column_part_length = column_part.length
        
        let row_is_offset    = containsSubstring(row_part   , "[") || row_part_length    === 0
        let column_is_offset = containsSubstring(column_part, "[") || column_part_length === 0
        
        let row_value    = row_is_offset    ? row_part   .slice(1, row_part_length    - 1) : row_part
        let column_value = column_is_offset ? column_part.slice(1, column_part_length - 1) : column_part
        
        let row    = (row_is_offset    ? parseFloat(row_value)    : parseFloat(row_value)    - 1) || 0 
        let column = (column_is_offset ? parseFloat(column_value) : parseFloat(column_value) - 1) || 0
        
        if (Number.isInteger(row) && Number.isInteger(column)) {
            return new RelativePosition(row, column, row_is_offset, column_is_offset)
        } else {
            error(SheetErrorType.InvalidReference)
        }
    }
    
    
    export class Cell {
        value: string
        constructor(public position: AbsolutePosition, public content: string) {
            this.value = this.isFormula ? placeholderSymbol : this.content
        }
        
        get isEmpty(): boolean {
            return !this.content
        }
        
        get isFormula(): boolean {
            let {content} = this
            return !this.isEmpty && !content.startsWith("'") && content.trim().startsWith("=")
        }
        
        absolutePositionOf(rel_pos: RelativePosition): AbsolutePosition {
            return rel_pos.resolveWith(this.position)
        }
        
        toString(): string {
            return this.content
        }
    }
    
    
    export function calculateValueFor_In(cell: Cell, table: Table): string {
        if (cell.isFormula) {
            let formula = cell.content.trim().slice(1).trim()
            
            let static_formula = formula.replace(/R(\[?-?\d+\]?)?C(\[?-?\d+\]?)?/gi, reference => {
                let relative_position = parsePosition(reference)
                let absolute_position = cell.absolutePositionOf(relative_position)
                let referenced_cell   = table.getCellAt(absolute_position)
                
                let value = calculateValueFor_In(referenced_cell, table)
                
                return isNaN(parseFloat(value)) ? ('"' + value + '"') :  value
            })
            
            return eval(static_formula)
        } else {
            return cell.content
        }
    }
    
    
    export interface Size {
        rows: number
        columns: number
    }
    
    
    export class Table {
        // Row-major, R1C1 is [0][0], R2C3 is [1][2] 
        constructor(public size: Size, public matrix: Cell[][]) {}
        
        static createEmpty(rows: number, columns: number): Table {
            let matrix_builder = <Cell[][]>[]
            
            rangeTo(rows).forEach(row => {
                let row_builder = <Cell[]>[]
                
                rangeTo(columns).forEach(column => {
                    let position = new AbsolutePosition(row, column)
                    let cell     = new Cell(position, "")
                    
                    row_builder.push(cell)
                })
                
                matrix_builder.push(row_builder)
            })
            
            return new Table({rows, columns}, matrix_builder)
        }
        
        static restoreFromTSV(tsv: string): Table {
            let matrix = tsv.split("\n").map(row => row.split("\t"))
            
            let rows    = matrix.length
            let columns = Math.max.apply(null, matrix.map(row => row.length))
            
            let table = Table.createEmpty(rows, columns)
            
            rangeTo(rows).forEach(row => {
                rangeTo(columns).forEach(column => {
                    let position = new AbsolutePosition(row, column)
                    let content = matrix[row][column] || ""
                    
                    table.setCellContent_At(content, position)
                })
            })
            
            return table
        }
        
        
        getCellAt(pos: AbsolutePosition) {
            return this.matrix[pos.row][pos.column]
        }
        
        setCellContent_At(new_content: string, pos: AbsolutePosition) {
            let cell = this.getCellAt(pos)
            
            cell.content = new_content
            cell.value   = calculateValueFor_In(cell, this)
        }
        
        expandToFitPosition(position: AbsolutePosition) {
            let {rows, columns} = this.size
            
            if (position.row < rows && position.column < columns) {
                return
            } else {
                let new_rows    = Math.max(position.row + 1, rows)
                let new_columns = Math.max(position.column + 1, columns)
                let new_table   = Table.createEmpty(new_rows, new_columns)
                
                this.matrix.forEach(row => {
                    row.forEach(cell => {
                        new_table.setCellContent_At(cell.content, cell.position)
                    })
                })
                
                this.size   = new_table.size
                this.matrix = new_table.matrix
            }
        }
        
        copyFrom(table: Table) {
            let {rows, columns} = this.size
            rangeTo(rows).forEach(row => {
                rangeTo(columns).forEach(column => {
                    let position = new AbsolutePosition(row, column)
                    let cell     = table.getCellAt(position)
                    this.setCellContent_At(cell.content, position)
                })
            })
        }
        
        updateValues() {
            this.matrix.forEach(row => {
                row.forEach(cell => {
                    cell.value = calculateValueFor_In(cell, this)
                })
            })
        }
        
        /**Marks cell with 0-indexed id format "cell_rXcY" for styling */
        storeToTable(): string {
            return this.matrix.map(row => `<tr>${row.map(cell => {
                let {row, column} = cell.position
                return `<td id="cell_r${row}c${column}">${cell.value}</td>`
            }).join("")}</tr>`).join("")
        }
        
        storeToTSV(): string {
            return this.matrix.map(row => {
                return row.map(cell => cell.content).join("\t")
            }).join("\n")
        }
    }
}

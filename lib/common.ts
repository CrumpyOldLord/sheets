/// <reference path="/usr/local/lib/node_modules/typescript/bin/lib.es6.d.ts" />


interface HTMLAnchorElement {
    download: string
}


module Sheets {
    "use strict"
    
    
    export const name = "Sheets"
    export const version = "0.0.2"
    export const storageKey = "text/sheets"
    
    export const currencySymbol = "€"  // unused, currency support required formatting which .tsv lacks
    export const placeholderSymbol = "..."  // to display during the loading process of formulae
    export const errorPrefix = "Error: "
    
    
    export enum SheetErrorType {
        InvalidReference = 1, 
        InvalidFormula,
        InvalidArguments, 
        DivideByZero, 
        CircularReference, 
        MissingArguments,
    }
    
    export class SheetError extends Error {
        constructor(public type: SheetErrorType) {
            super(SheetErrorType[type])
        }
    }
    
    
    export function error(type: SheetErrorType) {
        throw new SheetError(type)
    }
    
    
    export function downloadTextFile(name: string, content: string) {
        function encodeAsDataURL(text: string) {
            let content = encodeURIComponent(text)
            return `data:text;charset=utf-8,${content}`
        }
        
        let a = document.createElement('a')
        
        a.href     = encodeAsDataURL(content)
        a.download = name
        
        a.click()
    }
    
    
    export function rangeFromTo(start: number, stop: number): number[] {
        let builder = <number[]>[]
        
        for (let i = start; i < stop; i += 1) {
            builder.push(i)
        }
        
        return builder
    }
    
    
    export function rangeTo(stop: number): number[] {
        return rangeFromTo(0, stop)
    }
    
    
    export function deleteFrom<T>(item: T, array: T[]): void {
        let index = array.indexOf(item)
        if (index !== -1) {
            array.splice(index, 1)
        }
    }
    
    
    export function containsSubstring(string: string, substring: string): boolean {
        return string.indexOf(substring) !== -1
    }
    
    
    export function lastOf<T>(array: T[]): T {
        return array[array.length - 1]
    }
}
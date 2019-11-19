// File: text-file.ts                                                              //
// Project: lieene.CodeFactory                                                     //
// Author: Lieene Guo                                                              //
// MIT License, Copyright (c) 2019 Lieene@ShadeRealm                               //
// Created Date: Fri Nov 8 2019                                                    //
// Last Modified: Tue Nov 19 2019                                                  //
// Modified By: Lieene Guo                                                         //

import * as L from "@lieene/ts-utility";

export class Text implements Text.Readonly
{
    constructor(source: string, as?: 'Source');
    constructor(path: any, as: 'Path');
    constructor(source: any, sourceType?: 'Path' | 'Source')
    {
        let pEOL = /(?<=\n|\r\n)/g;
        if (sourceType === 'Path')
        {
            try
            {
                let fs = require("fs");
                source = fs.readFileSync(source).toString() as string;
            }
            catch (e)
            { throw new Error("Failed to load file: " + e.toString()); }
        }
        else { source = source as string; }
        this.source = source;

        let anchors = this.lineAnchors = [0];
        let m;
        while ((m = pEOL.exec(source)) !== null)
        {
            anchors.push(m.index);
            pEOL.lastIndex++;
        }
        let sourceLen = source.length;
        if (anchors.last! !== sourceLen) { anchors.push(sourceLen); }
    }
    get AsReadonly(): Text.Readonly { return this; }

    source: string;
    /**
     * [Anchor0] Line1 [Anchor1] Line2 [Anchor2] line3 ... LineN [AnchorN]
     */
    lineAnchors: Array<number>;
    get lineCount() { return this.lineAnchors.length - 1; }

    /**
     * [!!!] line number should be decreased by 1 to be used as array index
     * index is zero based
     * line number is one based
     */
    get rawLines(): Array<string> { return this.source.split(/\n|\r\n/); }

    *eachline()
    {
        for (let i = 1, count = this.lineCount; i <= count; i++)
        { yield this.LineAt(i)!; }
    }

    get eof(): Text.Pos
    {
        let lineCount = this.lineCount;
        let range = this.lineRange(lineCount)!;
        return { line: lineCount, col: range.end };
    }

    lineRange(line: number): L.Range | undefined 
    {
        let anchors = this.lineAnchors;
        let lineCount = this.lineCount;
        if (line < 1 || line > lineCount) { return undefined; }
        let start = anchors[line - 1];
        let end = anchors[line];
        let src = this.source;
        if (end > start)// avoid line feeds
        { end = src[end - 1] === '\n' ? src[end - 2] === '\r' ? end - 2 : end - 1 : end; }
        //else end===start empty line, end<start will nerver happen
        return L.StartEnd(start, end);
    }

    lineString(line: number): string | undefined 
    {
        let range = this.lineRange(line);
        return range === undefined ? undefined : this.source.slice(range.start, range.end);
    }

    LineAt(line: number): Text.Line | undefined
    {
        let range = this.lineRange(line);
        if (range === undefined) { return undefined; }
        return { index: line, range, text: this.source.slice(range.start, range.end) };
    }

    slice(span: Text.Span): string;
    slice(startLine: number, lineCount: number): string;
    slice(arg0: number | Text.Span, arg1?: number): string
    {
        if (L.IsNumber(arg0))
        {
            arg0 = Math.min(arg0, 1) >>> 0;
            arg1 = Math.min(arg1 as number, 0) >>> 0;
            if (arg1 = 0) { return ''; }
            let endLine = Math.min(this.lineCount, arg0 + arg1);
            let lineAnchors = this.lineAnchors;
            return this.source.slice(lineAnchors[arg0 - 1], lineAnchors[endLine]);
        }
        else
        {
            let start = this.convertPos(arg0.start);
            let end = this.convertPos(arg0.end);
            if (start > end) { [start, end] = [end, start]; }
            return this.source.slice(start, end);
        }
    }

    convertPos(offset: number): Text.Pos;
    convertPos(pos: Text.Pos): number;
    convertPos(pos: Text.Pos | number): number | Text.Pos
    {
        // |line1|line2|line3|line4| ... |lineN|  #lines  :N
        //a0,   a1,   a2,   a3,   a4,  ...,   aN  #anchors:N+1
        if (L.IsNumber(pos))
        {
            if (pos <= 0) { return { line: 1, col: 1 }; }
            let anchors = this.lineAnchors;
            let anchorIdx = anchors.binarySearch(pos);
            if (anchorIdx >= 0) { return { line: anchorIdx + 1, col: 1 }; }
            anchorIdx = ~anchorIdx;
            //if (anchorIdx === 0) { return { line: 1, col: 1 }; }
            //while never be here as pos needs to be smaller then zero
            //which is filtered in the begining
            if (anchorIdx >= anchors.length) { return this.eof; }
            let range = this.lineRange(anchorIdx)!;
            return { line: anchorIdx, col: Math.min(pos - range.start, range.length) };
        }
        else
        {
            if (pos.line < 1) { return 0; }
            if (pos.line >= this.lineAnchors.length) { return this.source.length; }
            let range = this.lineRange(pos.line)!;
            return Math.min(range.end, range.start + pos.col);
        }
    }
}

export namespace Text
{
    export interface Readonly
    {
        readonly source: string;
        readonly lineCount: number;
        readonly rawLines: ReadonlyArray<string>;
        eachline(): IterableIterator<Line>;
        readonly eof: Pos;
        lineRange(line: number): L.Range | undefined;
        lineString(line: number): string | undefined;
        LineAt(line: number): Line | undefined;
        slice(start: Span, end: Span): string;
        slice(startLine: number, lineCount: number): string;
        convertPos(offset: number): Text.Pos;
        convertPos(pos: Text.Pos): number;
    }
    /**
     * line: [1,2,3...] col: [1,2,3...] index start form 1,there's no line/col[0]
     */
    export interface Pos
    {
        line: number;
        col: number;
    }

    export function Compare(a: Pos, b: Pos): number
    { return a.line === b.line ? a.col - b.col : a.line - b.line; }

    export interface Span
    {
        start: Pos;
        end: Pos;
    }

    export interface Line
    {
        readonly index: number;
        readonly range: L.Range;
        readonly text: string;
    }
}
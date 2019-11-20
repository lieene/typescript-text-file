// File: text-file.ts                                                              //
// Project: lieene.CodeFactory                                                     //
// Author: Lieene Guo                                                              //
// MIT License, Copyright (c) 2019 Lieene@ShadeRealm                               //
// Created Date: Fri Nov 8 2019                                                    //
// Last Modified: Wed Nov 20 2019                                                  //
// Modified By: Lieene Guo                                                         //

import * as L from '@lieene/ts-utility';
import { promisify } from 'util';

export class Text implements Text.ReadonlyText
{
  constructor(source: string, as?: 'Source');
  constructor(path: any, as: 'Path');
  constructor(source: any, sourceType?: 'Path' | 'Source')
  {
    let pEOL = /(?<=\n|\r\n)/g;
    if (sourceType === 'Path')
    {
      let fs;
      try { fs = require('fs'); }
      catch (e) { throw new Error('@types/node package not found'); }
      try { source = fs.readFileSync(source).toString() as string; }
      catch (e) { throw new Error('Failed to load file: ' + e.toString()); }
    }
    else { source = source as string; }
    this.source = source;

    let anchors = (this.lineAnchors = [0]);
    let m;
    while ((m = pEOL.exec(source)) !== null)
    {
      anchors.push(m.index);
      pEOL.lastIndex++;
    }
    let sourceLen = source.length;
    if (anchors.last! !== sourceLen)
    {
      anchors.push(sourceLen);
    }

    let lineCount = this.lineCount;
    let range = this.lineRange(lineCount)!;
    this.eof = new Text.Pos(lineCount, range.length + 1);
    this.fullRange = new L.Range(0, this.source.length);
    this.fullSpan = this.convert(this.fullRange);
  }
  get AsReadonly(): Text.ReadonlyText { return this; }

  /**
   * [Anchor0] Line1 [Anchor1] Line2 [Anchor2] line3 ... LineN [AnchorN]
   */
  lineAnchors: Array<number>;
  source: string;

  get lineCount() { return this.lineAnchors.length - 1; }

  /**
   * [!!!] line number should be decreased by 1 to be used as array index
   * index is zero based
   * line number is one based
   */
  get rawLines(): Array<string> { return this.source.split(/\n|\r\n/); }

  *eachline() { for (let i = 1, count = this.lineCount; i <= count; i++) { yield this.lineAt(i)!; } }

  readonly eof: Text.Pos;
  readonly fullRange: L.Range;
  readonly fullSpan: Text.Span;

  lineRange(line: number): L.Range | undefined
  {
    let anchors = this.lineAnchors;
    let lineCount = this.lineCount;
    if (line < 1 || line > lineCount)
    {
      return undefined;
    }
    let start = anchors[line - 1];
    let end = anchors[line];
    let src = this.source;
    if (end > start)
    {
      // avoid line feeds
      end = src[end - 1] === '\n' ? (src[end - 2] === '\r' ? end - 2 : end - 1) : end;
    }
    //else end===start empty line, end<start will nerver happen
    return new L.Range([start, end]);
  }

  lineEndColum(line: number): number | undefined
  {
    let anchors = this.lineAnchors;
    let lineCount = this.lineCount;
    if (line < 1 || line > lineCount)
    {
      return undefined;
    }
    let start = anchors[line - 1];
    let end = anchors[line];
    let src = this.source;
    if (end > start)
    {
      // avoid line feeds
      end = src[end - 1] === '\n' ? (src[end - 2] === '\r' ? end - 1 : end) : end + 1;
    }
  }

  lineString(line: number): string | undefined
  {
    let range = this.lineRange(line);
    return range === undefined ? undefined : this.source.slice(range.start, range.end);
  }

  lineAt(line: number): Text.Line | undefined
  {
    let range = this.lineRange(line);
    if (range === undefined)
    {
      return undefined;
    }
    return { line, endColum: range.length + 1, range, text: this.source.slice(range.start, range.end) };
  }

  slice(range: L.Range): string;
  slice(span: Text.Span): string;
  slice(startLine: number, lineCount: number): string;
  slice(arg0: number | Text.Span | L.Range, arg1?: number): string
  {
    if (L.IsNumber(arg0))
    {
      arg0 = Math.max(arg0, 1) >>> 0;
      arg1 = Math.max(arg1 as number, 0) >>> 0;
      if (arg1 === 0)
      {
        return '';
      }
      let startLine = Math.min(this.lineCount, arg0 - 1);
      let endLine = Math.min(this.lineCount, startLine + arg1);
      let lineAnchors = this.lineAnchors;
      return this.source.slice(lineAnchors[startLine], lineAnchors[endLine]);
    }
    else if (Text.IsSpan(arg0))
    {
      let start = this.convert(arg0.start);
      let end = this.convert(arg0.end);
      if (start > end) { [start, end] = [end, start]; }
      return this.source.slice(start, end);
    }
    else { return this.source.slice(arg0.start, arg0.end); }
  }

  convert(offset: number): Text.Pos;
  convert(pos: Text.Pos): number;
  convert(pos: L.Range): Text.Span;
  convert(pos: Text.Span): L.Range;
  convert(pos: Text.Pos | number | L.Range | Text.Span): Text.Pos | number | L.Range | Text.Span
  {
    // |line1|line2|line3|line4| ... |lineN|  #lines  :N
    //a0,   a1,   a2,   a3,   a4,  ...,   aN  #anchors:N+1
    if (L.IsNumber(pos))
    {
      pos = pos >>> 0;
      if (pos <= 0) { return new Text.Pos(1, 1); }
      let anchors = this.lineAnchors;
      let anchorIdx = anchors.binarySearch(pos);
      if (anchorIdx >= 0) { return new Text.Pos(anchorIdx + 1, 1); }
      anchorIdx = ~anchorIdx;
      //if (anchorIdx === 0) { return { line: 1, col: 1 }; }
      //while never be here as pos needs to be smaller then zero
      //which is filtered in the begining
      if (anchorIdx >= anchors.length) { return this.eof; }
      let range = this.lineRange(anchorIdx)!;
      return new Text.Pos(anchorIdx, Math.min(pos - range.start + 1, range.length + 1));
    }
    else if (Text.IsPos(pos))
    {
      if (pos.line < 1) { return 0; }
      if (pos.line >= this.lineAnchors.length) { return this.source.length; }
      let range = this.lineRange(pos.line)!;
      return Math.min(range.end, range.start + pos.colum);
    }
    else if (Text.IsSpan(pos))
    {
      let start = this.convert(pos.start);
      let end = this.convert(pos.end);
      if (start > end) { [start, end] = [end, start]; }
      return new L.Range(start, end);
    }
    else
    {
      let start = this.convert(pos.start);
      let end = this.convert(pos.end);
      return new Text.Span(start, end);
    }
  }

  async BeginEdit(editCallback: (editor: Text.TextEdit) => void): Promise<Text>
  { return await promisify(this.applyEditSync)(this, editCallback); }

  protected applyEditSync(text: Text, editCallback: (editor: Text.TextEdit) => void, callback: (e: Error, r: Text) => void): void
  {
    let editor = new Text.TextEdit(text);
    editCallback(editor);
    try
    {
      let edits: Array<Text.Edit> = (editor as any).edits;
      let oldText = text.source;
      let newText = "";
      let preEnd = oldText.length;
      for (let i = 0, len = edits.length; i < len; i++)
      {
        let e = edits[i];
        let endOfEdit = e.range.end;
        if (endOfEdit < preEnd) { newText = oldText.substr(endOfEdit, preEnd) + newText; }
        if (e.replace.length > 0) { newText = e.replace + newText; }
        preEnd = e.range.start;
      }
      if (preEnd > 0) { newText = oldText.substr(0, preEnd) + newText; }
      callback(null as any, new Text(newText));
    }
    catch (e) { callback(e, null as any); }
  }

}
export namespace Text
{
  /**
   * line: [1,2,3...] col: [1,2,3...] index start form 1,there's no line/col[0]
   */
  export class Pos
  {
    constructor(public line: number, public colum: number)
    {
      this.line = Math.max(this.line, 1);
      this.colum = Math.max(this.colum, 1);
    }
  }
  export function IsPos<T>(p: Pos | T): p is Pos { return Object.getPrototypeOf(p) === Pos.prototype; }

  export class Span
  {
    constructor(start: Pos, end: Pos)
    constructor(range: [number, number], text: Text)
    constructor(arg1: Pos | [number, number], arg2: Pos | Text)
    {
      if (IsPos(arg1))
      {
        this.start = arg1;
        this.end = arg2 as Pos;
      }
      else
      {
        let t = arg2 as Text;
        this.start = t.convert(arg1[0]);
        this.end = t.convert(arg1[1]);
      }
    }
    start: Pos;
    end: Pos;
  }
  export function IsSpan<T>(s: Span | T): s is Span { return Object.getPrototypeOf(s) === Span.prototype; }

  export interface Line
  {
    readonly line: number;
    readonly endColum: number;
    readonly text: string;
    readonly range: L.Range;
  }

  export interface Edit
  {
    range: L.Range;
    replace: string;
  }
  export function compareEdit(a: Edit, b: Edit): number
  { return b.range.start - a.range.start; }

  export class TextEdit
  {
    constructor(readonly text: ReadonlyText) { }
    protected edits: Array<Edit> = [];

    insert(pos: number | Pos, text: string): void;
    insert(...inserts: [number | Pos, string][]): void;
    insert(...args: (number | Pos | string | [number | Pos, string])[]): void 
    {
      let [pos, text, ...rest] = args;
      if (L.IsString(text))
      {
        if (Text.IsPos(pos)) { pos = this.text.convert(pos); }
        else
        {
          pos = pos as number >>> 0;
          if (pos < 0) { pos = 0; }
          else { pos = Math.min(this.text.source.length, pos); }
        }
        this.edits.pushOrdered({ range: new L.Range(pos, 0), replace: text }, compareEdit);
      }
      else
      {
        (args as [number | Pos, string][]).forEach(ins =>
        {
          [pos, text] = ins;
          if (Text.IsPos(pos)) { pos = this.text.convert(pos); }
          else
          {
            pos = pos as number >>> 0;
            if (pos < 0) { pos = 0; }
            else { pos = Math.min(this.text.source.length, pos); }
          }
          this.edits.pushOrdered({ range: new L.Range(pos, 0), replace: text }, compareEdit);
        });
      }
    }

    remove(...spans: (L.Range | Span)[]): void 
    {
      spans.forEach(range =>
      {
        if (Text.IsSpan(range)) { range = this.text.convert(range); }
        else
        {
          let intersec = this.text.fullRange.intersection(range);
          range = (intersec === L.Range.Relation.Before) ? new L.Range(this.text.fullRange.end, 0) :
            (intersec === L.Range.Relation.After) ? new L.Range(this.text.fullRange.start, 0) : intersec;
        }
        this.edits.pushOrdered({ range, replace: "" }, compareEdit);
      });
    }

    replace(span: L.Range | Span, text: string): void;
    replace(...replace: [L.Range | Span, string][]): void;
    replace(...args: (L.Range | Span | string | [L.Range | Span, string])[]): void 
    {
      let [range, text, ...rest] = args;
      if (L.IsString(text))
      {
        if (Text.IsSpan(range)) { range = this.text.convert(range); }
        else
        {
          range = range as L.Range;
          let intersec = this.text.fullRange.intersection(range);
          range = (intersec === L.Range.Relation.Before) ? new L.Range(this.text.fullRange.end, 0) :
            (intersec === L.Range.Relation.After) ? new L.Range(this.text.fullRange.start, 0) : intersec;
        }
        this.edits.pushOrdered({ range, replace: text }, compareEdit);
      }
      else
      {
        (args as [L.Range | Span, string][]).forEach(ins =>
        {
          [range, text] = ins;
          if (Text.IsSpan(range)) { range = this.text.convert(range); }
          else
          {
            range = range as L.Range;
            let intersec = this.text.fullRange.intersection(range);
            range = (intersec === L.Range.Relation.Before) ? new L.Range(this.text.fullRange.end, 0) :
              (intersec === L.Range.Relation.After) ? new L.Range(this.text.fullRange.start, 0) : intersec;
          }
          this.edits.pushOrdered({ range, replace: text }, compareEdit);
        });
      }
    }
  }
  export interface ReadonlyText
  {
    readonly source: string;
    readonly lineCount: number;
    readonly rawLines: ReadonlyArray<string>;
    eachline(): IterableIterator<Line>;
    readonly eof: Pos;
    readonly fullRange: L.Range;
    readonly fullSpan: Text.Span;
    lineRange(line: number): L.Range | undefined;
    lineString(line: number): string | undefined;
    lineEndColum(line: number): number | undefined;
    lineAt(line: number): Line | undefined;

    slice(range: L.Range): string;
    slice(span: Span): string;
    slice(startLine: number, lineCount: number): string;

    convert(offset: number): Text.Pos;
    convert(pos: Text.Pos): number;
    convert(pos: L.Range): Text.Span;
    convert(pos: Text.Span): L.Range;

    BeginEdit(edit: (editor: Text.TextEdit) => void): Promise<Text>;
  }
}

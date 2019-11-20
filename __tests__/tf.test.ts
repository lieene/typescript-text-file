// File: tf.test.ts                                                                //
// Project: lieene.text-editing                                                    //
// Author: Lieene Guo                                                              //
// MIT License, Copyright (c) 2019 Lieene@ShadeRealm                               //
// Created Date: Wed Nov 20 2019                                                   //
// Last Modified: Thu Nov 21 2019                                                  //
// Modified By: Lieene Guo                                                         //
import { Text } from "../src/index";
import * as L from "@lieene/ts-utility";
import * as path from "path";
import Span = Text.Span;
import Pos = Text.Pos;
import Range = L.Range;
test("text file test", () =>
{
    let t = new Text(__filename, "Path").AsReadonly;
    console.log(t.slice(1, 7));
    t.BeginEdit(e =>
    {
        e.insert(new Pos(1, 86), "Sneak");
        e.insert(172, "Snack");
        e.insertLine([0, "Here comes the edit"], [8, "------code coming------"]);
        e.replace(new Range(3, 18), "the file is edited");
        e.replace(new Span([2, 4], [2, 10]), "ooooooo");
        e.remove(e.text.lineRange(7, "include line end")!);
        e.removeLine(10);
    }).then(t => console.log(t.source));
    console.log(t.slice(new Range(3, 16)));
});

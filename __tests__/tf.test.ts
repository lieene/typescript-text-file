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
test("text file test", () =>
{
    let t = new Text(__filename, "Path").AsReadonly;
    console.log(t.slice(1, 7));
    t.BeginEdit(e =>
    {
        e.insert(new Text.Pos(1,86), "Sneak");
        e.insert(0, "Here comes the edit\n");
        e.replace(new L.Range(3, 18), "the file is edited");
        e.replace(new Text.Span([2, 4], [2, 10]), "ooooooo");
        e.remove(e.text.lineRange(7, "include line end")!);
        e.removeLine(10);
    }).then(t => console.log(t.source));
    console.log(t.slice(new L.Range(3, 16)));
});
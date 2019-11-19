import { Text } from "../src/index";
import * as path from "path";
test("text file test", () =>
{
    let t: Text.Readonly = new Text(__filename, "Path");
    //console.log(t.source);
    console.log(t);
    console.log(t.slice(1,2));
});
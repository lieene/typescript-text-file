import { Text } from "../src/index";
import * as path from "path";
test("text file test", async () =>
{
    let t = new Text(__filename, "Path").AsReadonly;
    let newText = await t.BeginEdit(e =>
    {
        e.insert(0, "Here comes the edit\n");
    });
    console.log(newText);
});
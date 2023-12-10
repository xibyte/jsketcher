import { saveAs } from "file-saver";

export default function (data: string, fileName: string) {
  saveAs(new File([data], fileName, { type: "text/plain;charset=utf-8" }));
}

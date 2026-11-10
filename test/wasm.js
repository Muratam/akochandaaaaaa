// テスト用: emscripten の public/main.js を Node で読み込み、process_request を返す。
// ブラウザ向けのビルドなので、main.data の XHR と wasm の読み込みだけを差し替える。
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

class FileXHR {
  open(_method, url) {
    this.url = url;
  }
  send() {
    const buf = fs.readFileSync(path.join(pub, path.basename(this.url)));
    this.status = 200;
    this.response = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    setImmediate(() => this.onload && this.onload({}));
  }
}

let loading = null;
export function loadProcessRequest() {
  loading ??= new Promise((resolve, reject) => {
    globalThis.location = { pathname: "/akochandaaaaa/" };
    globalThis.XMLHttpRequest = FileXHR;
    globalThis.require = createRequire(path.join(pub, "main.js"));
    globalThis.__dirname = pub;
    globalThis.__filename = path.join(pub, "main.js");
    globalThis.Module = {
      locateFile: (p) => path.join(pub, p),
      instantiateWasm(imports, ok) {
        WebAssembly.instantiate(fs.readFileSync(path.join(pub, "main.wasm")), imports)
          .then((r) => ok(r.instance, r.module))
          .catch(reject);
        return {};
      },
      onRuntimeInitialized() {
        resolve((json) => globalThis.Module.process_request(json));
      },
      print() {},
      printErr() {},
    };
    vm.runInThisContext(fs.readFileSync(path.join(pub, "main.js"), "utf8"), {
      filename: path.join(pub, "main.js"),
    });
  });
  return loading;
}

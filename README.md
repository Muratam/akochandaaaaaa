# 麻雀何切るシミュレーター

## About (概要)

https://github.com/nekobean/mahjong-calculator を emscripten対応し、静的ページにしたものです。

emscripen化対応コードは https://github.com/Muratam/mahjong-cpp/ にあります。

## emscripten化のメリット

- 静的コンテンツ以外を配信する必要がなくなる。
- C++サーバーが減る分脆弱性に強くなる。
- 実行がブラウザで行われる分、サーバーの計算資源を節約できる。

## emscripten化のデメリット

- 計算時間が少し増える可能性がある。ただし、wasmで実行されるので劇的には増えない。

## Project setup

```
npm install
```

### Compiles and hot-reloads for development

```
npm run serve
```

### Compiles and minifies for production

```
npm run build
```

### Lints and fixes files

```
npm run lint
```

### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).

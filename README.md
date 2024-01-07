<p align="center">
  <a href="https://thatopen.com/">TOC</a>
  |
  <a href="https://docs.thatopen.com/intro">documentation</a>
  |
  <a href="https://platform.thatopen.com/app">demo</a>
  |
  <a href="https://people.thatopen.com/">community</a>
  |
  <a href="https://www.npmjs.com/package/openbim-app-templates">npm package</a>
</p>

![cover](cover.png)

<h1>Open BIM app templates <img src="https://ifcjs.github.io/components/resources/favicon.ico" width="32"></h1>

[![NPM Package][npm]][npm-url]
[![NPM Package][npm-downloads]][npm-url]
[![Tests](https://github.com/IFCjs/components/actions/workflows/tests.yml/badge.svg)](https://github.com/IFCjs/components/actions/workflows/tests.yaml)

This repository is a CLI command that allow to quickly start your next BIM application using [OpenBIM Components](https://github.com/IFCjs/components) and [Vite](https://vitejs.dev/).

### Usage

Starting is really easy, just follow these steps:

* Install it globally with `npm i -g openbim-app-templates`.
* Create a folder anywhere you want and open it within your IDE.
* In the terminal of the opened folder, run `create-openbim-app` and follow the prompts.
* Run `npm i` and then `npm run dev`
* Go to the localhost provided by Vite and enjoy.

## Templates
Currently, there are two templates available:

* Vanilla
* React

Templates are using TypeScript as OpenBIM Components is written with it, so you can get typing help when developing your app. Keep in mind the templates are not full apps as they lack many of the functionalities from the library, but you can take them as a nice starting point to not going from the scratch.

[npm]: https://img.shields.io/npm/v/openbim-app-templates
[npm-url]: https://www.npmjs.com/package/openbim-app-templates
[npm-downloads]: https://img.shields.io/npm/dw/openbim-app-templates

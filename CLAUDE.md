# Code Style

## No underscore prefix on private members

Do not use underscore prefix for private fields or methods:

```ts
// bad
private _mouseDown = false;
private _handleClick(e: MouseEvent): void { ... }

// good
private mouseDown = false;
private handleClick(e: MouseEvent): void { ... }
```

Only use underscore when a public getter collides with the backing field name:

```ts
// ok — getter forces the underscore
private _selected: boolean = false;
get selected(): boolean { return this._selected; }
```

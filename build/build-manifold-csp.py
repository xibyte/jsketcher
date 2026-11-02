#!/usr/bin/env python3
"""Build the experimental Manifold WASM from pinned source; no binaries committed.

Source Emscripten 5.0.2's emsdk_env.sh before running. The output is local-only
until source, dependency notices and runtime behavior are reviewed for release.
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import signal
import subprocess
import time
from pathlib import Path

MANIFOLD_COMMIT = '31afd71d17c7a94cfaeada83f657d7b42628ead6'
CLIPPER_COMMIT = '46f639177fe418f9689e8ddb74f08a870c71f5b4'
MIN_FREE = 15 * 1024 ** 3
ROOT = Path(__file__).resolve().parent.parent


def run(*args):
    subprocess.run(args, check=True)


def pin(path, expected):
    path = path.resolve(strict=True)
    actual = subprocess.check_output(['git', '-C', str(path), 'rev-parse', 'HEAD'], text=True).strip()
    dirty = subprocess.check_output(['git', '-C', str(path), 'status', '--porcelain'], text=True)
    if actual != expected or dirty:
        raise RuntimeError(f'Source must be clean and pinned to {expected}: {path}')
    return path


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def guarded_build(args, where):
    if shutil.disk_usage(where).free < MIN_FREE:
        raise RuntimeError('Less than 15 GiB available; stopping build.')
    child = subprocess.Popen(args, start_new_session=True)
    try:
        while child.poll() is None:
            if shutil.disk_usage(where).free < MIN_FREE:
                os.killpg(child.pid, signal.SIGTERM)
                child.wait()
                raise RuntimeError('Less than 15 GiB available; stopped build.')
            time.sleep(2)
    except BaseException:
        if child.poll() is None:
            os.killpg(child.pid, signal.SIGTERM)
            child.wait()
        raise
    if child.returncode:
        raise subprocess.CalledProcessError(child.returncode, args)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True, help='clean Manifold checkout')
    parser.add_argument('--clipper', type=Path, required=True, help='clean Clipper2 checkout')
    parser.add_argument('--build-dir', type=Path, required=True, help='dedicated build directory')
    parser.add_argument('--jobs', type=int, default=4, choices=range(1, 5))
    opts = parser.parse_args()
    source, clipper = pin(opts.source, MANIFOLD_COMMIT), pin(opts.clipper, CLIPPER_COMMIT)
    build = opts.build_dir.resolve()
    if build == source or source in build.parents or build == clipper or clipper in build.parents:
        raise RuntimeError('Use a dedicated build directory outside the source checkouts.')
    build.mkdir(parents=True, exist_ok=True)
    if any(build.iterdir()):
        raise RuntimeError('Build directory must be empty to avoid stale CMake artifacts.')
    if shutil.disk_usage(build).free < MIN_FREE or shutil.disk_usage(ROOT).free < MIN_FREE:
        raise RuntimeError('Less than 15 GiB available; stopping before configuration.')
    version = subprocess.check_output(['emcc', '--version'], text=True).splitlines()[0]
    if not re.search(r'\b5\.0\.2\b', version):
        raise RuntimeError('Emscripten 5.0.2 is required; found ' + version)
    run('emcmake', 'cmake', '-S', str(source), '-B', str(build),
        '-DCMAKE_BUILD_TYPE=MinSizeRel', '-DMANIFOLD_PAR=OFF', '-DMANIFOLD_TEST=OFF',
        '-DMANIFOLD_CBIND=OFF', '-DMANIFOLD_JSBIND=ON', '-DMANIFOLD_USE_BUILTIN_CLIPPER2=ON',
        '-DMANIFOLD_DOWNLOADS=ON', '-DFETCHCONTENT_FULLY_DISCONNECTED=ON',
        '-DFETCHCONTENT_SOURCE_DIR_CLIPPER2=' + str(clipper),
        '-DCMAKE_EXE_LINKER_FLAGS=-sDYNAMIC_EXECUTION=0 -sEMBIND_AOT=1')
    guarded_build(['cmake', '--build', str(build), '--target', 'manifoldjs', '--parallel', str(opts.jobs)], build)
    js = build / 'bindings/wasm/manifold.js'
    wasm = build / 'bindings/wasm/manifold.wasm'
    pin(source, MANIFOLD_COMMIT)
    pin(clipper, CLIPPER_COMMIT)
    if not wasm.read_bytes().startswith(b'\x00asm'):
        raise RuntimeError('Generated output is not a WebAssembly module.')
    text = js.read_text()
    if 'new Function(' in text or re.search(r'\beval\s*\(', text):
        raise RuntimeError('Dynamic evaluation found in generated Manifold JS.')
    out = ROOT / 'node_modules/.cache/codi-manifold'
    out.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(js, out / 'manifold.js')
    shutil.copyfile(wasm, out / 'manifold.wasm')
    receipt = {'manifoldCommit': MANIFOLD_COMMIT, 'clipperCommit': CLIPPER_COMMIT,
               'emscripten': version, 'flags': ['-sDYNAMIC_EXECUTION=0', '-sEMBIND_AOT=1'],
               'jsSha256': digest(js), 'wasmSha256': digest(wasm),
               'note': 'Experimental local build; no release or complete provenance claim.'}
    (out / 'build-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()

#!/bin/bash

printf "This Script will setup the tauri dev environment\n"
# Install  CLang and macOS Development Dependencies
printf "Installing CLang and macOS Development Dependencies\n"
xcode-select --install
# Install Rust
printf "Installing Rust\n"
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh

# All done!
printf "All done!\n"
printf "You can now run 'tauri dev' to start the development environment\n"
printf "You can now run 'tauri build' to build the application\n"

# Path: scripts\setup_tauri_dev_windows.sh